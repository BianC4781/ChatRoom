package com.example.demo.service;

import com.example.demo.entity.PrivateMessage;
import com.example.demo.repository.PrivateMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PrivateMessageServiceImpl implements PrivateMessageService {

    @Autowired
    private PrivateMessageRepository privateMessageRepository;
    
    @Autowired
    private UserService userService;

    @Override
    public List<PrivateMessage> getAllPrivateMessages() {
        return privateMessageRepository.findAll();
    }

    @Override
    public PrivateMessage savePrivateMessage(PrivateMessage privateMessage) {
        privateMessage.setSentAt(LocalDateTime.now()); // 设置时间戳
        
        // 确保sender是持久化对象
        if (privateMessage.getSender() != null && privateMessage.getSender().getUsername() != null) {
            if (privateMessage.getSender().getId() == null || privateMessage.getSender().getId() <= 0) {
                // 如果sender不是持久化对象，则从数据库获取
                userService.findUserByUsername(privateMessage.getSender().getUsername())
                    .ifPresent(privateMessage::setSender);
            } else {
                // 即使有ID，也再次验证用户是否存在
                userService.findById(privateMessage.getSender().getId())
                    .orElseThrow(() -> new IllegalArgumentException("发送者ID无效: " + privateMessage.getSender().getId()));
            }
        } else {
            throw new IllegalArgumentException("发送者不能为空");
        }
        
        // 确保receiver是持久化对象
        if (privateMessage.getReceiver() != null) {
            if (privateMessage.getReceiver().getUsername() != null && 
                (privateMessage.getReceiver().getId() == null || privateMessage.getReceiver().getId() <= 0)) {
                // 如果receiver不是持久化对象，则从数据库获取
                userService.findUserByUsername(privateMessage.getReceiver().getUsername())
                    .ifPresent(privateMessage::setReceiver);
            }
            
            // 无论如何，都要确保receiver有有效的ID
            if (privateMessage.getReceiver().getId() == null || privateMessage.getReceiver().getId() <= 0) {
                throw new IllegalArgumentException("接收者ID无效");
            } else {
                // 再次验证接收者ID是否存在于数据库中
                userService.findById(privateMessage.getReceiver().getId())
                    .orElseThrow(() -> new IllegalArgumentException("接收者ID无效: " + privateMessage.getReceiver().getId()));
            }
        } else {
            throw new IllegalArgumentException("接收者不能为空");
        }
        
        return privateMessageRepository.save(privateMessage);
    }
    
    @Override// 新增方法
    public List<PrivateMessage> getMessagesBySenderId(Long senderId) {
        return privateMessageRepository.findBySenderId(senderId);
    }
    
    @Override
    public List<PrivateMessage> getMessagesByReceiverId(Long receiverId) {
        return privateMessageRepository.findByReceiverId(receiverId);
    }
    
    @Override
    public List<PrivateMessage> getMessagesBetweenUsers(Long senderId, Long receiverId) {
        return privateMessageRepository.findBySenderIdAndReceiverId(senderId, receiverId);
    }
}