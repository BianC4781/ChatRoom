package com.example.demo.service;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 根据用户名查找用户
    public Optional<User> findUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    // 根据邮箱查找用户
    public Optional<User> findUserByEmail(String email) {

        return userRepository.findByEmail(email);
    }
    
    // 根据电话号码查找用户
    public Optional<User> findUserByPhoneNumber(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber);
    }

    // 保存用户
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    // 删除用户
    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }

    // 获取所有用户
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    // 根据ID查找用户
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public interface password {
        User register(User user);
        User login(String username, String password);
    }
}