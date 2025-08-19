package com.example.demo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
//类映射表
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) //自增
    private Long id;

    @NotNull(message = "用户名不能为空") //非空
    @NotBlank(message = "用户名不能为空白")
    @Column(nullable = false, unique = true)
    private String username;

    @NotNull(message = "密码不能为空")
    @NotBlank(message = "密码不能为空白")
    @Column(nullable = false)
    private String passwordHash;

    @NotNull(message = "邮箱不能为空")
    @NotBlank(message = "邮箱不能为空白")
    @Column(nullable = false, unique = true)
    private String email;
    
    @NotNull(message = "手机号码不能为空")
    @NotBlank(message = "手机号码不能为空白")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "请输入有效的手机号码")
    @Column(nullable = false, unique = true)
    private String phoneNumber;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}