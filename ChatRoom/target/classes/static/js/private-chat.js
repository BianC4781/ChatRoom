// 私聊功能处理
let privateChats = new Map(); // 存储私聊消息
let selectedUserId = null; // 当前选中的用户ID（用于私聊）
let currentChatType = 'PUBLIC'; // 当前聊天类型：PUBLIC 或 PRIVATE

// 页面加载完成后初始化私聊功能
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，准备初始化私聊功能');
    
    // 在WebSocket连接成功后初始化私聊
    const originalOnConnected = window.onConnected;
    window.onConnected = function() {
        console.log('WebSocket连接成功，初始化私聊功能');
        if (originalOnConnected) originalOnConnected();
        setTimeout(initPrivateChat, 500); // 延迟初始化，确保DOM和WebSocket都已准备好
    };
    
    // 不再覆盖原始的sendMessage函数，而是确保原始函数能处理私聊消息
    // 我们只需要确保私聊消息的处理逻辑正确即可
    
    // 确保表情选择器正常工作
    document.getElementById('emoji-button').addEventListener('click', function() {
        document.getElementById('emoji-picker').classList.toggle('hidden');
    });
    
    // 点击表情添加到输入框
    document.querySelectorAll('.emoji').forEach(emoji => {
        emoji.addEventListener('click', function(event) {
            event.preventDefault(); // 防止表单提交
            event.stopPropagation(); // 阻止事件冒泡
            const messageInput = document.getElementById('message-input');
            messageInput.value += this.textContent;
            document.getElementById('emoji-picker').classList.add('hidden');
            messageInput.focus();
        });
    });
});


// 初始化私聊功能
function initPrivateChat() {
    console.log('初始化私聊功能');
    // 不再重复订阅私人消息频道，因为已经在chat.js的onConnected函数中订阅了
    if (!stompClient || !currentUser) {
        console.warn('无法初始化私聊功能：stompClient或currentUser未定义');
        return;
    }
    
    // 添加用户列表点击事件监听器
    document.querySelectorAll('#user-list li[data-user-id]').forEach(item => {
        item.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const username = this.querySelector('.chat-name').textContent;
            selectUser(userId, username);
        });
    });
    
    console.log('私聊功能初始化完成');
}

// 选择用户进行私聊
function selectUser(userId, targetUsername) {
    // 确保userId是数字类型
    selectedUserId = parseInt(userId);
    if (isNaN(selectedUserId)) {
        console.error('选择用户失败：无效的用户ID', userId);
        return;
    }
    
    console.log('选择用户进行私聊:', targetUsername, '用户ID:', selectedUserId);
    currentChatType = 'PRIVATE';
    
    // 切换到私聊标签并触发点击事件
    const privateChatTab = document.querySelector('.chat-tabs .tab[data-tab="private"]');
    if (privateChatTab) {
        // 移除所有标签的active类
        document.querySelectorAll('.chat-tabs .tab').forEach(t => t.classList.remove('active'));
        // 给私聊标签添加active类
        privateChatTab.classList.add('active');
        // 手动触发点击事件，确保调用filterUserList函数
        privateChatTab.click();
    }
    
    // 更新UI，标记选中的用户
    const userItems = document.querySelectorAll('#user-list li');
    userItems.forEach(item => item.classList.remove('active'));
    
    const selectedItem = document.querySelector(`#user-list li[data-user-id="${userId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
        // 清除未读消息计数
        clearUnreadMessageCount(userId);
        // 更新聊天窗口标题
        document.querySelector('.chat-header h2').textContent = `与 ${targetUsername} 的私聊`;
        // 显示与该用户的聊天记录
        displayPrivateMessages(selectedUserId);
    } else {
        console.warn('找不到选中的用户元素:', userId);
        // 如果找不到用户元素，需要先显示私聊用户列表
        showPrivateChatsOnly();
        
        // 延迟一下再次尝试选择用户
        setTimeout(() => {
            const newSelectedItem = document.querySelector(`#user-list li[data-user-id="${userId}"]`);
            if (newSelectedItem) {
                newSelectedItem.classList.add('active');
                clearUnreadMessageCount(userId);
                // 更新聊天窗口标题
                document.querySelector('.chat-header h2').textContent = `与 ${targetUsername} 的私聊`;
                // 显示与该用户的聊天记录
                displayPrivateMessages(selectedUserId);
            }
        }, 500); // 增加延迟时间，确保DOM更新完成
    }
}

// 选择公共聊天
function selectPublicChat() {
    selectedUserId = null;
    currentChatType = 'PUBLIC';
    
    // 更新UI
    const userItems = document.querySelectorAll('#user-list li');
    userItems.forEach(item => item.classList.remove('active'));
    
    const publicChatItem = document.querySelector('#user-list li[data-type="PUBLIC"]');
    if (publicChatItem) {
        publicChatItem.classList.add('active');
    }
    
    // 更新聊天窗口标题
    document.querySelector('.chat-header h2').textContent = '公共聊天室';
    
    // 显示公共聊天记录
    displayPublicMessages();
}

// 显示与特定用户的私聊消息
function displayPrivateMessages(userId) {
    console.log('显示与用户的私聊消息:', userId);
    
    // 确保userId是数字类型
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
        console.error('显示私聊消息失败：无效的用户ID', userId);
        return;
    }
    
    const messageList = document.getElementById('message-list');
    messageList.innerHTML = '<div class="messages-container"></div>';
    const container = messageList.querySelector('.messages-container');
    
    // 显示加载中提示
    container.innerHTML = '<div class="message system-message">加载消息历史中...</div>';
    
    // 从服务器获取历史消息
    fetch(`/api/private-messages/between/${currentUser.id}/${userIdNum}`)
        .then(response => response.json())
        .then(historyMessages => {
            console.log('获取到历史消息:', historyMessages.length);
            
            // 清空容器
            container.innerHTML = '';
            
            // 如果没有历史消息，显示提示
            if (historyMessages.length === 0) {
                container.innerHTML = '<div class="message system-message">暂无消息，开始私聊吧！</div>';
                return;
            }
            
            // 更新本地存储的消息
            privateChats.set(userIdNum, historyMessages);
            
            // 显示消息
            historyMessages.forEach(message => {
                appendMessage(message, container);
            });
            
            // 滚动到底部
            messageList.scrollTop = messageList.scrollHeight;
        })
        .catch(error => {
            console.error('获取历史消息失败:', error);
            container.innerHTML = '<div class="message system-message">获取消息历史失败，请重试</div>';
        });
}

// 显示公共聊天消息
function displayPublicMessages() {
    // 调用chat.js中的loadMessages函数来显示公共聊天消息
    loadMessages();
}

// 接收私聊消息
// 删除onPrivateMessageReceived函数，使用chat.js中的实现
// function onPrivateMessageReceived(payload) {
//     const message = JSON.parse(payload.body);
//     console.log('收到私聊消息:', message);
//
//     // 确定消息来源（发送者ID）
//     const chatUserId = parseInt(message.sender.id);
//
//     // 存储消息
//     if (!privateChats.has(chatUserId)) {
//         privateChats.set(chatUserId, []);
//     }
//     privateChats.get(chatUserId).push(message);
//
//     // 如果当前正在与该用户聊天，则显示消息
//     if (currentChatType === 'PRIVATE' && selectedUserId === chatUserId) {
//         const messageList = document.getElementById('message-list');
//         const container = messageList.querySelector('.messages-container');
//
//         // 如果是第一条消息，清空"暂无消息"的提示
//         if (privateChats.get(chatUserId).length === 1) {
//             container.innerHTML = '';
//         }
//
//         appendMessage(message, container);
//         messageList.scrollTop = messageList.scrollHeight;
//     } else {
//         // 否则，显示通知或更新未读消息计数
//         updateUnreadMessageCount(chatUserId);
//     }
//
//     // 更新用户列表中的消息预览
//     updateMessagePreview(chatUserId, message);
//
//     // 如果用户不在聊天列表中，添加到列表
//     addUserToChatList(message.sender);
// }

// 发送私聊消息
function sendPrivateMessage(content) {
    if (!stompClient || !selectedUserId || currentChatType !== 'PRIVATE') {
        console.error('无法发送私聊消息：', !stompClient ? 'stompClient未定义' : !selectedUserId ? '未选择用户' : '聊天类型不是私聊');
        return false;
    }
    
    // 获取接收者用户名
    const receiverElement = document.querySelector(`#user-list li[data-user-id="${selectedUserId}"] .chat-name`);
    if (!receiverElement) {
        console.error('无法找到接收者元素');
        return false;
    }
    const receiverUsername = receiverElement.textContent;
    
    // 确保selectedUserId是数字类型
    const receiverId = parseInt(selectedUserId);
    if (isNaN(receiverId)) {
        console.error('接收者ID无效:', selectedUserId);
        return false;
    }
    
    const privateMessage = {
        content: content,
        sender: {id: currentUser.id, username: currentUser.username},
        receiver: {id: receiverId, username: receiverUsername},
        type: 'PRIVATE',
        sentAt: new Date()
    };
    
    console.log('发送私聊消息:', privateMessage);
    
    // 发送消息到服务器
    stompClient.send("/app/chat.privateMessage", {}, JSON.stringify(privateMessage));
    
    // 在本地保存消息
    if (!privateChats.has(receiverId)) {
        privateChats.set(receiverId, []);
    }
    privateChats.get(receiverId).push(privateMessage);
    
    // 不需要重新显示所有消息，因为会导致消息重复
    // 直接将新消息添加到当前聊天窗口
    const messageList = document.getElementById('message-list');
    const container = messageList.querySelector('.messages-container');
    appendMessage(privateMessage, container);
    messageList.scrollTop = messageList.scrollHeight;
    
    return true;
}

// 更新未读消息计数
function updateUnreadMessageCount(userId) {
    // 确保userId是数字类型
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
        console.error('更新未读消息计数失败：无效的用户ID', userId);
        return;
    }
    
    console.log('更新用户未读消息计数:', userIdNum);
    const userItem = document.querySelector(`#user-list li[data-user-id="${userIdNum}"]`);
    if (userItem) {
        let badge = userItem.querySelector('.unread-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'unread-badge';
            badge.textContent = '1';
            userItem.appendChild(badge);
        } else {
            const count = parseInt(badge.textContent) + 1;
            badge.textContent = count.toString();
        }
    } else {
        console.warn('找不到用户列表项:', userIdNum);
    }
}

// 清除未读消息计数
function clearUnreadMessageCount(userId) {
    const userItem = document.querySelector(`#user-list li[data-user-id="${userId}"]`);
    if (userItem) {
        const badge = userItem.querySelector('.unread-badge');
        if (badge) {
            badge.remove();
        }
    }
}

// 添加用户到聊天列表
function addUserToChatList(user) {
    // 检查用户是否已在列表中
    if (document.querySelector(`#user-list li[data-user-id="${user.id}"]`)) {
        return;
    }
    
    const userList = document.getElementById('user-list');
    const li = document.createElement('li');
    li.setAttribute('data-user-id', user.id);
    li.setAttribute('data-type', 'PRIVATE');
    
    li.innerHTML = `
        <div class="chat-avatar">
            <i class="fa fa-user"></i>
        </div>
        <div class="chat-info">
            <div class="chat-name">${user.username}</div>
            <div class="chat-preview">点击开始私聊</div>
        </div>
        <div class="chat-time">刚刚</div>
    `;
    
    // 将新用户添加到公共聊天室之后
    const publicChatItem = document.querySelector('#user-list li[data-type="PUBLIC"]');
    if (publicChatItem && publicChatItem.nextSibling) {
        userList.insertBefore(li, publicChatItem.nextSibling);
    } else {
        userList.appendChild(li);
    }
}

// 注意：不再需要单独的scrollToBottom函数
// 所有滚动操作都直接使用 messageList.scrollTop = messageList.scrollHeight