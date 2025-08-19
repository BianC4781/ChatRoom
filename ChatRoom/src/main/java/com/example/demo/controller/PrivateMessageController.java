package com.example.demo.controller;

import com.example.demo.entity.PrivateMessage;
import com.example.demo.service.PrivateMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/private-messages")
public class PrivateMessageController {

    private final PrivateMessageService privateMessageService;

    @Autowired
    public PrivateMessageController(PrivateMessageService privateMessageService) {
        this.privateMessageService = privateMessageService;
    }

    // 获取所有私聊消息
    @GetMapping
    public ResponseEntity<List<PrivateMessage>> getAllPrivateMessages() {
        List<PrivateMessage> messages = privateMessageService.getAllPrivateMessages();
        return ResponseEntity.ok(messages);
    }

    // 获取两个用户之间的所有消息
    @GetMapping("/between/{senderId}/{receiverId}")
    public ResponseEntity<List<PrivateMessage>> getMessagesBetweenUsers(
            @PathVariable Long senderId,
            @PathVariable Long receiverId) {
        List<PrivateMessage> messages = privateMessageService.getMessagesBetweenUsers(senderId, receiverId);
        return ResponseEntity.ok(messages);
    }

    // 获取发送者发送的所有消息
    @GetMapping("/sender/{senderId}")
    public ResponseEntity<List<PrivateMessage>> getMessagesBySenderId(@PathVariable Long senderId) {
        List<PrivateMessage> messages = privateMessageService.getMessagesBySenderId(senderId);
        return ResponseEntity.ok(messages);
    }

    // 获取接收者接收的所有消息
    @GetMapping("/receiver/{receiverId}")
    public ResponseEntity<List<PrivateMessage>> getMessagesByReceiverId(@PathVariable Long receiverId) {
        List<PrivateMessage> messages = privateMessageService.getMessagesByReceiverId(receiverId);
        return ResponseEntity.ok(messages);
    }

    // 保存私聊消息
    @PostMapping
    public ResponseEntity<PrivateMessage> savePrivateMessage(@RequestBody PrivateMessage privateMessage) {
        PrivateMessage savedMessage = privateMessageService.savePrivateMessage(privateMessage);
        return ResponseEntity.ok(savedMessage);
    }
}