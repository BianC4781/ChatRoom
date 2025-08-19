package com.example.demo.service;

import com.example.demo.entity.PrivateMessage;

import java.util.List;

public interface PrivateMessageService {
    List<PrivateMessage> getAllPrivateMessages();
    PrivateMessage savePrivateMessage(PrivateMessage privateMessage);
    List<PrivateMessage> getMessagesBySenderId(Long senderId);
    List<PrivateMessage> getMessagesByReceiverId(Long receiverId);
    List<PrivateMessage> getMessagesBetweenUsers(Long senderId, Long receiverId);
}