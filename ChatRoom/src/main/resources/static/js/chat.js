// WebSocket客户端连接和消息处理
let stompClient = null;
let username = null;
let selectedRoom = 1; // 默认房间ID
let userListUpdateInterval = null; // 用于存储定时器ID
let currentUser = null; // 存储当前登录用户信息

// 页面加载完成后初始化事件监听
document.addEventListener('DOMContentLoaded', function() {
    // 从sessionStorage获取用户信息
    const userJson = sessionStorage.getItem('currentUser');
    if (!userJson) {
        // 如果没有用户信息，重定向到登录页
        window.location.href = 'login.html';
        return;
    }
    
    // 解析用户信息
    currentUser = JSON.parse(userJson);
    username = currentUser.username;
    
    // 显示用户名
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = username;
    }
    
    // 消息发送表单提交事件
    document.getElementById('message-form').addEventListener('submit', sendMessage);
    
    // 退出登录按钮点击事件
    document.getElementById('logout-button').addEventListener('click', function() {
        if (stompClient) {
            // 通知服务器用户已离开
            stompClient.send("/app/chat.sendMessage",
                {},
                JSON.stringify({
                    content: username + ' 离开了聊天室',
                    sender: {username: username},
                    room: {id: selectedRoom},
                    type: 'LEAVE'
                })
            );
        }
        
        // 调用断开连接函数
        disconnect();
    });

    // 初始化emoji选择器
    initEmojiPicker();
    
    // 初始化标签点击事件
    initTabEvents();
    
    // 连接WebSocket
    connectWebSocket();
});

// 初始化emoji选择器
function initEmojiPicker() {
    const emojiButton = document.getElementById('emoji-button');
    const emojiPicker = document.getElementById('emoji-picker');
    
    // 显示/隐藏emoji选择器
    emojiButton.addEventListener('click', function() {
        emojiPicker.classList.toggle('hidden');
    });
    
    // 点击emoji时将其添加到输入框
    const emojis = document.querySelectorAll('.emoji');
    emojis.forEach(emoji => {
        emoji.addEventListener('click', function() {
            const messageInput = document.getElementById('message-input');
            messageInput.value += this.textContent;
            messageInput.focus();
            emojiPicker.classList.add('hidden'); // 选择后隐藏选择器
        });
    });
    
    // 点击其他地方时隐藏emoji选择器
    document.addEventListener('click', function(e) {
        if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.classList.add('hidden');
        }
    });
}

// 初始化标签点击事件
function initTabEvents() {
    const tabs = document.querySelectorAll('.chat-tabs .tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有标签的active类
            tabs.forEach(t => t.classList.remove('active'));
            
            // 给当前点击的标签添加active类
            this.classList.add('active');
            
            // 根据标签类型过滤用户列表
            const tabType = this.dataset.tab;
            filterUserList(tabType);
        });
    });
}

// 根据标签类型过滤用户列表
function filterUserList(tabType) {
    const userList = document.getElementById('user-list');
    
    if (tabType === 'all') {
        // 显示所有聊天（公共聊天室 + 私聊用户）
        userList.innerHTML = ''; // 清空列表
        
        // 添加公共聊天室
        const publicChatItem = document.createElement('li');
        publicChatItem.dataset.type = 'PUBLIC';
        publicChatItem.innerHTML = `
            <div class="chat-avatar">
                <i class="fa fa-users"></i>
            </div>
            <div class="chat-info">
                <div class="chat-name">公共聊天室</div>
                <div class="chat-preview">所有人都可以看到的消息</div>
            </div>
            <div class="chat-time">现在</div>
        `;
        userList.appendChild(publicChatItem);
        
        // 添加私聊用户
        showPrivateChatsOnly(false); // false表示不清空列表
        
        // 重新绑定点击事件
        bindUserListEvents();
    } else if (tabType === 'groups') {
        // 只显示群聊（公共聊天室）
        userList.innerHTML = `
            <li data-type="PUBLIC" class="active">
                <div class="chat-avatar">
                    <i class="fa fa-users"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-name">公共聊天室</div>
                    <div class="chat-preview">所有人都可以看到的消息</div>
                </div>
                <div class="chat-time">现在</div>
            </li>
        `;
        
        // 重新绑定点击事件
        bindUserListEvents();
        
        // 设置为公共聊天
        currentChatType = 'PUBLIC';
        selectedUserId = null;
        document.querySelector('.chat-header h2').textContent = '公共聊天室';
        document.querySelector('.chat-status').textContent = `${onlineCount || 0}人在线`;
        displayPublicMessages();
    } else if (tabType === 'private') {
        // 只显示私聊用户
        showPrivateChatsOnly(true); // true表示清空列表
    }
}

// 只显示私聊用户
function showPrivateChatsOnly(clearList = true) {
    const userList = document.getElementById('user-list');
    
    // 根据参数决定是否清空列表
    if (clearList) {
        userList.innerHTML = ''; // 清空列表
    }
    
    // 获取在线用户并显示（排除自己）
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            // 创建一个已存在用户ID的集合，用于避免重复添加
            const existingUserIds = new Set();
            document.querySelectorAll('#user-list li[data-user-id]').forEach(item => {
                existingUserIds.add(item.dataset.userId);
            });
            
            users.forEach(user => {
                if (user.id !== currentUser.id && !existingUserIds.has(user.id.toString())) {
                    const li = document.createElement('li');
                    li.dataset.type = 'PRIVATE';
                    li.dataset.userId = user.id;
                    
                    // 获取与该用户的最后一条消息
                    const userMessages = privateChats.get(parseInt(user.id)) || [];
                    const lastMessage = userMessages[userMessages.length - 1];
                    const preview = lastMessage ? 
                        (lastMessage.content.length > 20 ? lastMessage.content.substring(0, 20) + '...' : lastMessage.content) : 
                        '点击开始聊天';
                    
                    li.innerHTML = `
                        <div class="chat-avatar">
                            <i class="fa fa-user"></i>
                        </div>
                        <div class="chat-info">
                            <div class="chat-name">${user.username}</div>
                            <div class="chat-preview">${preview}</div>
                        </div>
                        <div class="chat-time">${lastMessage ? formatTime(new Date(lastMessage.sentAt)) : ''}</div>
                    `;
                    
                    userList.appendChild(li);
                }
            });
            
            // 重新绑定点击事件
            document.querySelectorAll('#user-list li[data-user-id]').forEach(item => {
                item.addEventListener('click', function() {
                    const userId = this.getAttribute('data-user-id');
                    const username = this.querySelector('.chat-name').textContent;
                    
                    // 移除所有active类
                    document.querySelectorAll('#user-list li').forEach(li => li.classList.remove('active'));
                    
                    // 添加active类到当前项
                    this.classList.add('active');
                    
                    // 设置当前聊天类型和目标
                    currentChatType = 'PRIVATE';
                    selectedUserId = parseInt(userId);
                    
                    // 更新聊天窗口标题
                    document.querySelector('.chat-header h2').textContent = `与 ${username} 的私聊`;
                    
                    // 清除未读消息计数
                    const badge = this.querySelector('.unread-badge');
                    if (badge) badge.remove();
                    
                    // 显示与该用户的聊天记录
                    if (typeof displayPrivateMessages === 'function') {
                        displayPrivateMessages(userId);
                    }
                });
            });
        })
        .catch(error => {
            console.error('获取用户列表失败:', error);
        });
}

// 绑定用户列表点击事件
function bindUserListEvents() {
    document.querySelectorAll('#user-list li').forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有active类
            document.querySelectorAll('#user-list li').forEach(li => li.classList.remove('active'));
            
            // 添加active类到当前项
            this.classList.add('active');
            
            // 设置当前聊天类型和目标
            currentChatType = this.dataset.type;
            
            if (currentChatType === 'PRIVATE') {
                selectedUserId = this.dataset.userId;
                // 更新聊天标题
                const selectedUser = users.find(u => u.id == selectedUserId);
                if (selectedUser) {
                    document.querySelector('.chat-header h2').textContent = selectedUser.username;
                    document.querySelector('.chat-status').textContent = '私聊';
                }
                // 显示私聊消息
                displayPrivateMessages(selectedUserId);
            } else {
                selectedUserId = null;
                document.querySelector('.chat-header h2').textContent = '公共聊天室';
                document.querySelector('.chat-status').textContent = `${onlineCount || 0}人在线`;
                // 显示公共消息
                displayPublicMessages();
            }
        });
    });
}


    


// 连接WebSocket服务器
function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, onConnected, onError);
}

// WebSocket连接成功回调
function onConnected() {
    // 订阅公共频道
    stompClient.subscribe('/topic/public', onMessageReceived);

    // 订阅私聊频道
    stompClient.subscribe(`/user/${currentUser.id}/queue/messages`, onPrivateMessageReceived);

    // 通知服务器用户已加入
    stompClient.send("/app/chat.sendMessage",
        {},
        JSON.stringify({
            content: username + ' 加入了聊天室',
            sender: {username: username, id: currentUser.id},
            room: {id: selectedRoom},
            type: 'JOIN'
        })
    );

    // 显示聊天界面
    document.getElementById('chat-screen').style.display = 'flex';

    // 设置用户名显示
    document.getElementById('username-display').textContent = username;

    // 立即获取在线用户并更新状态显示
    fetchOnlineUsers();
    userListUpdateInterval = setInterval(fetchOnlineUsers, 30000); // 每30秒更新一次

    // 加载历史消息
    loadMessages();
}

// 连接错误回调
function onError(error) {
    console.error('WebSocket连接失败:', error);
    alert('无法连接到聊天服务器，请稍后再试');
}

// 断开连接
function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    
    // 清除定时器
    if (userListUpdateInterval) {
        clearInterval(userListUpdateInterval);
    }
    
    // 清除会话存储的用户信息
    sessionStorage.removeItem('currentUser');
    
    // 重置状态
    currentUser = null;
    username = null;
    privateChats.clear();
    selectedUserId = null;
    currentChatType = 'PUBLIC';
    
    // 重定向到登录页
    window.location.href = 'login.html';
    
    console.log('已断开连接');
}

// 获取在线用户列表
function fetchOnlineUsers() {
    fetch('/api/users')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(users => {
            console.log('获取到用户列表:', users);
            updateUserList(users);
            // 立即更新在线人数显示
            onlineCount = users.length;
            if (currentChatType === 'PUBLIC' || !currentChatType) {
                document.querySelector('.chat-status').textContent = `${onlineCount}人在线`;
            }
        })
        .catch(error => {
            console.error('获取用户列表失败:', error);
            // 如果获取失败，至少显示默认状态
            if (currentChatType === 'PUBLIC' || !currentChatType) {
                document.querySelector('.chat-status').textContent = '在线';
            } else {
                const chatStatus = document.querySelector('.chat-status');
                if (chatStatus) {
                    chatStatus.textContent = '获取在线人数失败';
                }
            }
        });
}

// 更新用户列表显示
function updateUserList(users) {
    const userList = document.getElementById('user-list');
    
    // 确保users是数组
    if (!Array.isArray(users)) {
        console.error('用户数据格式错误:', users);
        const chatStatus = document.querySelector('.chat-status');
        if (chatStatus) {
            chatStatus.textContent = '数据格式错误';
        }
        return;
    }
    
    // 更新在线人数显示
    const onlineCount = users.length;
    const chatStatus = document.querySelector('.chat-status');
    if (chatStatus) {
        chatStatus.textContent = `${onlineCount}人在线`;
    }
    
    console.log('更新在线人数:', onlineCount);
    
    // 保留公共聊天室选项
    userList.innerHTML = `
        <li data-type="PUBLIC" class="${currentChatType === 'PUBLIC' ? 'active' : ''}">
            <div class="chat-avatar">
                <i class="fa fa-users"></i>
            </div>
            <div class="chat-info">
                <div class="chat-name">公共聊天室</div>
                <div class="chat-preview">所有人都可以看到的消息</div>
            </div>
            <div class="chat-time">现在</div>
        </li>
    `;
    
    // 添加用户列表（排除当前用户）
    users.forEach(user => {
        if (currentUser && user.id !== currentUser.id) {
            const lastMessage = privateChats.get(user.id) ? 
                privateChats.get(user.id)[privateChats.get(user.id).length - 1] : null;
            
            const preview = lastMessage ? 
                (lastMessage.content.length > 20 ? lastMessage.content.substring(0, 20) + '...' : lastMessage.content) : 
                '点击开始私聊';
                
            const li = document.createElement('li');
            li.dataset.type = 'PRIVATE';
            li.dataset.userId = user.id;
            if (currentChatType === 'PRIVATE' && selectedUserId === user.id) {
                li.classList.add('active');
            }
            
            li.innerHTML = `
                <div class="chat-avatar">
                    <i class="fa fa-user"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-name">${user.username}</div>
                    <div class="chat-preview">${preview}</div>
                </div>
                <div class="chat-time">${lastMessage ? formatTime(new Date(lastMessage.sentAt)) : ''}</div>
            `;
            
            userList.appendChild(li);
        }
    });
    
    // 为每个聊天项添加点击事件
    bindUserListEvents();
}

// 加载公共聊天消息
function loadMessages() {
    fetch(`/api/messages/room/${selectedRoom}`)
        .then(response => response.json())
        .then(messages => {
            displayMessages(messages);
        })
        .catch(error => console.error('获取消息失败:', error));
}

// 显示消息列表
function displayMessages(messages) {
    const messageList = document.getElementById('message-list');
    messageList.innerHTML = '<div class="messages-container"></div>';
    const container = messageList.querySelector('.messages-container');
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="message system-message">暂无消息，开始聊天吧！</div>';
        return;
    }
    
    messages.forEach(message => {
        appendMessage(message, container);
    });
    
    // 滚动到底部
    messageList.scrollTop = messageList.scrollHeight;
}

// 显示私聊消息
function displayPrivateMessages(userId) {
    const messages = privateChats.get(parseInt(userId)) || [];
    const messageList = document.getElementById('message-list');
    messageList.innerHTML = '<div class="messages-container"></div>';
    const container = messageList.querySelector('.messages-container');
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="message system-message">暂无消息，开始私聊吧！</div>';
        return;
    }
    
    messages.forEach(message => {
        appendMessage(message, container);
    });
    
    // 滚动到底部
    messageList.scrollTop = messageList.scrollHeight;
}

// 添加消息到界面
function appendMessage(message, container) {
    const isMyMessage = message.sender.username === username;
    const messageElement = document.createElement('div');
    
    if (message.type === 'JOIN' || message.type === 'LEAVE') {
        // 系统消息
        messageElement.classList.add('message', 'system-message');
        messageElement.textContent = message.content;
    } else {
        // 普通消息
        messageElement.classList.add('message', isMyMessage ? 'my-message' : 'other-message');
        
        // 创建头像元素
        const avatarElement = document.createElement('div');
        avatarElement.classList.add('message-avatar');
        avatarElement.innerHTML = `<i class="fa fa-user"></i>`;
        
        // 创建消息内容元素
        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        
        // 添加发送者名称（如果不是自己的消息）
        if (!isMyMessage) {
            const senderElement = document.createElement('div');
            senderElement.classList.add('message-sender');
            senderElement.textContent = message.sender.username;
            contentElement.appendChild(senderElement);
        }
        
        // 添加消息文本
        const textElement = document.createElement('div');
        textElement.innerHTML = formatMessageContent(message.content);
        contentElement.appendChild(textElement);
        
        // 添加时间戳
        if (message.sentAt) {
            const timeElement = document.createElement('span');
            timeElement.classList.add('timestamp');
            timeElement.textContent = formatTime(new Date(message.sentAt));
            contentElement.appendChild(timeElement);
        }
        
        // 组装消息元素
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);
    }
    
    container.appendChild(messageElement);
}

// 格式化消息内容（支持emoji）
function formatMessageContent(content) {
    // 这里可以添加更复杂的格式化逻辑，如链接识别等
    return content;
}

// 格式化时间
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 发送消息
function sendMessage(event) {
    event.preventDefault();
    
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) {
        return;
    }
    
    if (currentChatType === 'PUBLIC') {
        // 发送公共消息
        stompClient.send("/app/chat.sendMessage",
            {},
            JSON.stringify({
                content: content,
                sender: {username: username, id: currentUser.id},
                room: {id: selectedRoom},
                type: 'CHAT'
            })
        );
    } else if (currentChatType === 'PRIVATE' && selectedUserId) {
        // 获取接收者用户名
        const receiverElement = document.querySelector(`#user-list li[data-user-id="${selectedUserId}"] .chat-name`);
        let receiverUsername = '';
        if (receiverElement) {
            receiverUsername = receiverElement.textContent;
        }
        
        // 发送私聊消息
        const message = {
            content: content,
            sender: {username: username, id: currentUser.id},
            receiver: {id: parseInt(selectedUserId), username: receiverUsername},
            sentAt: new Date(),
            type: 'PRIVATE'
        };
        
        console.log('发送私聊消息:', message);
        
        // 发送到服务器
        stompClient.send("/app/chat.privateMessage",
            {},
            JSON.stringify(message)
        );
        
        // 在本地保存消息
        savePrivateMessage(message);
        
        // 更新界面
        if (!privateChats.has(parseInt(selectedUserId))) {
            privateChats.set(parseInt(selectedUserId), []);
        }
        privateChats.get(parseInt(selectedUserId)).push(message);
        
        // 更新消息预览和用户列表
        updateMessagePreview(parseInt(selectedUserId), message);
        
        // 直接将消息添加到当前聊天窗口，而不是重新加载所有消息
        const messageList = document.getElementById('message-list');
        const container = messageList.querySelector('.messages-container');
        
        // 如果是第一条消息，清空"暂无消息"的提示
        if (privateChats.get(parseInt(selectedUserId)).length === 1) {
            container.innerHTML = '';
        }
        
        // 添加消息到界面
        appendMessage(message, container);
        
        // 滚动到底部
        messageList.scrollTop = messageList.scrollHeight;
    }
    
    // 清空输入框
    messageInput.value = '';
}

// 接收公共消息
function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    
    // 如果当前是在公共聊天，则显示消息
    if (currentChatType === 'PUBLIC') {
        const messageList = document.getElementById('message-list');
        const container = messageList.querySelector('.messages-container');
        appendMessage(message, container);
        messageList.scrollTop = messageList.scrollHeight;
    }
    
    // 更新用户列表（如果是加入/离开消息）
    if (message.type === 'JOIN' || message.type === 'LEAVE') {
        fetchOnlineUsers();
    }
}

// 接收私聊消息
function onPrivateMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    console.log('收到私聊消息:', message);
    
    // 确保发送者ID是数字类型
    const senderId = parseInt(message.sender.id);
    if (isNaN(senderId)) {
        console.error('接收私聊消息失败：无效的发送者ID', message.sender.id);
        return;
    }
    
    // 保存私聊消息
    savePrivateMessage(message);
    
    // 如果当前正在与发送者聊天，则显示消息
    if (currentChatType === 'PRIVATE' && selectedUserId === senderId) {
        const messageList = document.getElementById('message-list');
        const container = messageList.querySelector('.messages-container');
        
        // 如果是第一条消息，清空"暂无消息"的提示
        if (privateChats.get(senderId).length === 1) {
            container.innerHTML = '';
        }
        
        // 添加消息到界面
        appendMessage(message, container);
        messageList.scrollTop = messageList.scrollHeight;
    } else {
        // 更新未读消息计数
        updateUnreadMessageCount(senderId);
    }
    
    // 更新用户列表中的消息预览
    updateMessagePreview(senderId, message);
    
    // 如果发送者不在用户列表中，添加到列表
    addUserToChatList(message.sender);
}

// 保存私聊消息
function savePrivateMessage(message) {
    // 确定聊天对象ID（如果是自己发送的消息，则是接收者ID；否则是发送者ID）
    let chatUserId = message.sender.id === currentUser.id ? 
        message.receiver.id : message.sender.id;
    
    // 确保ID是数字类型
    chatUserId = parseInt(chatUserId);
    if (isNaN(chatUserId)) {
        console.error('保存私聊消息失败：无效的用户ID', chatUserId);
        return;
    }
    
    console.log('保存私聊消息到用户:', chatUserId);
    
    if (!privateChats.has(chatUserId)) {
        privateChats.set(chatUserId, []);
    }
    
    privateChats.get(chatUserId).push(message);
}

// 更新用户列表中的消息预览
function updateMessagePreview(userId, message) {
    console.log('更新用户消息预览:', userId, message);
    userId = parseInt(userId);
    if (isNaN(userId)) {
        console.error('更新消息预览失败：无效的用户ID', userId);
        return;
    }
    
    // 查找用户列表中的对应项
    const userItem = document.querySelector(`#user-list li[data-user-id="${userId}"]`);
    if (!userItem) {
        console.log('用户不在列表中，需要添加:', userId);
        return; // 用户不在列表中，将由addUserToChatList处理
    }
    
    // 更新消息预览
    const previewElement = userItem.querySelector('.chat-preview');
    if (previewElement) {
        const preview = message.content.length > 20 ? 
            message.content.substring(0, 20) + '...' : message.content;
        previewElement.textContent = preview;
    }
    
    // 更新时间
    const timeElement = userItem.querySelector('.chat-time');
    if (timeElement) {
        timeElement.textContent = formatTime(new Date(message.sentAt));
    }
    
    // 将该用户移到列表顶部（表示最新消息）
    const userList = document.getElementById('user-list');
    if (userList.firstChild !== userItem) {
        userList.insertBefore(userItem, userList.firstChild);
    }
}

// 添加用户到聊天列表
function addUserToChatList(user) {
    console.log('添加用户到聊天列表:', user);
    if (!user || !user.id) {
        console.error('添加用户失败：无效的用户信息', user);
        return;
    }
    
    const userId = parseInt(user.id);
    if (isNaN(userId)) {
        console.error('添加用户失败：无效的用户ID', user.id);
        return;
    }
    
    // 如果是当前用户自己，不添加
    if (userId === currentUser.id) {
        return;
    }
    
    // 检查用户是否已在列表中
    const existingItem = document.querySelector(`#user-list li[data-user-id="${userId}"]`);
    if (existingItem) {
        console.log('用户已在列表中:', userId);
        return;
    }
    
    // 获取最新消息预览
    const messages = privateChats.get(userId) || [];
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const preview = lastMessage ? 
        (lastMessage.content.length > 20 ? lastMessage.content.substring(0, 20) + '...' : lastMessage.content) : 
        '点击开始私聊';
    
    // 创建用户列表项
    const userList = document.getElementById('user-list');
    const li = document.createElement('li');
    li.dataset.type = 'PRIVATE';
    li.dataset.userId = userId;
    
    li.innerHTML = `
        <div class="chat-avatar">
            <i class="fa fa-user"></i>
        </div>
        <div class="chat-info">
            <div class="chat-name">${user.username}</div>
            <div class="chat-preview">${preview}</div>
        </div>
        <div class="chat-time">${lastMessage ? formatTime(new Date(lastMessage.sentAt)) : ''}</div>
    `;
    
    // 添加到列表顶部
    if (userList.firstChild) {
        userList.insertBefore(li, userList.firstChild);
    } else {
        userList.appendChild(li);
    }
    
    // 绑定点击事件
    bindUserListEvents();
}