package com.example.demo.controller;

import com.example.demo.entity.Message;
import com.example.demo.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

    @RestController
    @RequestMapping("/api/messages") // 定义基础路径
    public class MessageController {

        private final MessageService messageService;

        @Autowired
        public MessageController(MessageService messageService) {
            this.messageService = messageService;
        }

        // 获取所有消息
        @GetMapping
        public ResponseEntity<List<Message>> getAllMessages() {
            List<Message> messages = messageService.getAllMessages();
            return ResponseEntity.ok(messages);
        }

        // 获取特定房间的消息
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<Message>> getMessagesByRoomId(@PathVariable Long roomId) {
        List<Message> messages = messageService.getMessagesByRoomId(roomId);
        return ResponseEntity.ok(messages);
    }

    // 发送新消息
    @PostMapping("/send")
    public ResponseEntity<Message> sendMessage(@RequestBody Message message) {
        Message savedMessage = messageService.saveMessage(message);
        return ResponseEntity.ok(savedMessage);
    }
}