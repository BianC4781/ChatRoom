package com.example.demo.event;

import com.example.demo.entity.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    // 使用 ConcurrentHashMap 来存储在线用户，确保线程安全
    private static final Set<String> connectedUsers = ConcurrentHashMap.newKeySet();

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        // 在连接时，我们还不知道用户名，用户名将在用户发送 JOIN 消息时添加
        logger.info("收到一个新的WebSocket连接: SessionId = {}", headerAccessor.getSessionId());
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if(username != null) {
            logger.info("用户离开: " + username);
            connectedUsers.remove(username); // 用户离开时从集合中移除

            Message message = new Message();
            message.setType("LEAVE");
            message.setContent(username + " 离开了聊天室!");

            // 创建一个临时的User对象，因为Message需要sender
            com.example.demo.entity.User user = new com.example.demo.entity.User();
            user.setUsername(username);
            message.setSender(user);

            // 创建一个临时的Room对象，因为Message需要room
            com.example.demo.entity.Room room = new com.example.demo.entity.Room();
            room.setId(1L); // 默认房间ID
            message.setRoom(room);

            messagingTemplate.convertAndSend("/topic/public", message);
        }
    }

    // 添加用户到在线列表（可以在ChatController的newUser方法中调用）
    public static void addUser(String username) {
        connectedUsers.add(username);
        logger.info("用户加入: {}, 当前在线人数: {}", username, connectedUsers.size());
    }

    // 获取当前在线用户列表
    public static Set<String> getConnectedUsers() {
        return new HashSet<>(connectedUsers); // 返回副本以防外部修改
    }
}