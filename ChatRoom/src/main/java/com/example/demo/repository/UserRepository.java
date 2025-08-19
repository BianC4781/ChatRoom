package com.example.demo.repository;

import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface UserRepository extends JpaRepository<User, Long> { // 确保User是实体类的名称，Long是主键类型
    // 根据用户名、邮箱或手机号码查找用户
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
    // 获取所有用户
    List<User> findAll();
}