package com.example.demo.repository;

import com.example.demo.entity.PrivateMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrivateMessageRepository extends JpaRepository<PrivateMessage, Long> {// 确保PrivateMessage是实体类的名称，Long是主键类型
    List<PrivateMessage> findBySenderId(Long senderId);// 查找发送者的所有消息
    List<PrivateMessage> findByReceiverId(Long receiverId);// 查找接收者的所有消息
    List<PrivateMessage> findBySenderIdAndReceiverId(Long senderId, Long receiverId);// 查找特定发送者和接收者之间的所有消息
}