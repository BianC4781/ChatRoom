package com.example.demo.service;

import com.example.demo.entity.Message;
import com.example.demo.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessageServiceImpl implements MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Override
    public List<Message> getAllMessages() {
        return messageRepository.findAll();// 确保MessageRepository是正确的
    }

    @Autowired
    private UserService userService;

    @Override
    public Message saveMessage(Message message) {
        message.setSentAt(LocalDateTime.now()); // 设置时间戳
        
        // 确保sender是持久化对象
        if (message.getSender() != null && message.getSender().getUsername() != null && 
            (message.getSender().getId() == null || message.getSender().getId() <= 0)) {
            // 如果sender不是持久化对象，则从数据库获取
            userService.findUserByUsername(message.getSender().getUsername())
                .ifPresent(message::setSender);
        }
        
        return messageRepository.save(message);
    }
    
    @Override
    public List<Message> getMessagesByRoomId(Long roomId) {
        return messageRepository.findByRoomId(roomId);
    }
}