package com.example.demo.controller;

import com.example.demo.entity.PrivateMessage;
import com.example.demo.service.PrivateMessageService;

import com.example.demo.entity.Message;
import com.example.demo.entity.User;
import com.example.demo.event.WebSocketEventListener;
import com.example.demo.service.MessageService;
import com.example.demo.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping; // 导入 GetMapping
import org.springframework.web.bind.annotation.ResponseBody; // 导入 ResponseBody

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set; // 导入 Set

@Controller
public class ChatController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private UserService userService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public Message sendMessage(@Payload Message message) {
        message.setSentAt(LocalDateTime.now());
        // 查找发送者User对象，确保它是持久化的
        if (message.getSender() != null && message.getSender().getUsername() != null) {
            Optional<User> senderUser = userService.findUserByUsername(message.getSender().getUsername());
            if (senderUser.isPresent()) {
                message.setSender(senderUser.get()); // 使用持久化的User对象
            } else {
                // 如果找不到用户，可以记录错误或抛出异常
                throw new IllegalArgumentException("找不到用户: " + message.getSender().getUsername());
            }
        }
        return messageService.saveMessage(message);
    }

    @MessageMapping("/newUser")
    @SendTo("/topic/public")
    public Message newUser(@Payload Message message, SimpMessageHeaderAccessor headerAccessor) {
        // 将用户名添加到WebSocket会话
        String username = message.getSender().getUsername();
        headerAccessor.getSessionAttributes().put("username", username);
        WebSocketEventListener.addUser(username); // 添加用户到在线列表
        
        // 确保使用持久化的User对象
        Optional<User> senderUser = userService.findUserByUsername(username);
        if (senderUser.isPresent()) {
            message.setSender(senderUser.get()); // 使用持久化的User对象
        } else {
            // 如果找不到用户，可以记录错误或抛出异常
            throw new IllegalArgumentException("找不到用户: " + username);
        }
        
        message.setContent(username + " 加入了聊天室");
        message.setType("JOIN");
        return message;
    }

    @Autowired
    private PrivateMessageService privateMessageService;
    
    @MessageMapping("/chat.privateMessage")
    public PrivateMessage privateMessage(@Payload PrivateMessage privateMessage) {
        privateMessage.setSentAt(LocalDateTime.now());
        privateMessage.setType("PRIVATE");
        
        // 查找发送者，确保它是持久化的
        if (privateMessage.getSender() != null && privateMessage.getSender().getUsername() != null) {
            Optional<User> senderUser = userService.findUserByUsername(privateMessage.getSender().getUsername());
            if (senderUser.isPresent()) {
                privateMessage.setSender(senderUser.get());
            } else {
                throw new IllegalArgumentException("找不到发送者: " + privateMessage.getSender().getUsername());
            }
        }
        
        // 查找接收者，确保它是持久化的
        User validReceiver = null;
        if (privateMessage.getReceiver() != null) {
            // 优先使用用户名查找
            if (privateMessage.getReceiver().getUsername() != null) {
                Optional<User> receiverUser = userService.findUserByUsername(privateMessage.getReceiver().getUsername());
                if (receiverUser.isPresent()) {
                    validReceiver = receiverUser.get();
                    privateMessage.setReceiver(validReceiver);
                } else {
                    throw new IllegalArgumentException("找不到接收者: " + privateMessage.getReceiver().getUsername());
                }
            } 
            // 如果没有用户名但有ID，则通过ID查找
            else if (privateMessage.getReceiver().getId() != null) {
                Optional<User> receiverUser = userService.findById(privateMessage.getReceiver().getId());
                if (receiverUser.isPresent()) {
                    validReceiver = receiverUser.get();
                    privateMessage.setReceiver(validReceiver);
                } else {
                    throw new IllegalArgumentException("找不到ID为" + privateMessage.getReceiver().getId() + "的接收者");
                }
            } else {
                throw new IllegalArgumentException("接收者信息不完整");
            }
        } else {
            throw new IllegalArgumentException("接收者不能为空");
        }
        
        // 再次确认接收者是否有效
        if (validReceiver == null || validReceiver.getId() == null) {
            throw new IllegalArgumentException("接收者无效或ID为空");
        }
        
        // 获取接收者ID
        Long receiverId = validReceiver.getId();
        
        // 先保存私聊消息到数据库，确保消息有效
        PrivateMessage savedMessage = privateMessageService.savePrivateMessage(privateMessage);
        
        // 发送消息到接收者的私人队列
        messagingTemplate.convertAndSendToUser(
            receiverId.toString(),
            "/queue/messages",
            savedMessage
        );
        
        return savedMessage;
    }

}