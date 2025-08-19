package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;


@RestController //接口返回接口，转成json格式
@RequestMapping("/api/users") // 定义基础路径
public class UserController {
    
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 根据用户名查找用户
    @GetMapping("/username/{username}")
    public ResponseEntity<?> getUserByUsername(@PathVariable String username) {
        Optional<User> user = userService.findUserByUsername(username);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 根据邮箱查找用户
    @GetMapping("/email/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email) {
        Optional<User> user = userService.findUserByEmail(email);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 创建新用户 映射
    @PostMapping("/create")
    public ResponseEntity<?> createUser(@Valid @RequestBody User user, BindingResult bindingResult) {
        // 验证用户输入
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            for (FieldError error : bindingResult.getFieldErrors()) {
                errors.put(error.getField(), error.getDefaultMessage());
            }
            return ResponseEntity.badRequest().body(errors);
        }
        
        User savedUser = userService.saveUser(user);
        return ResponseEntity.ok(savedUser);
    }
    
    // 用户注册
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> registrationData) {
        // 验证数据
        if (!registrationData.get("password").equals(registrationData.get("confirmPassword"))) {
            return ResponseEntity.badRequest().body("两次输入的密码不一致");
        }
        
        // 验证必填字段
        if (registrationData.get("username") == null || registrationData.get("username").trim().isEmpty()) {
            return ResponseEntity.badRequest().body("用户名不能为空");
        }
        
        if (registrationData.get("email") == null || registrationData.get("email").trim().isEmpty()) {
            return ResponseEntity.badRequest().body("邮箱不能为空");
        }
        
        if (registrationData.get("phoneNumber") == null || registrationData.get("phoneNumber").trim().isEmpty()) {
            return ResponseEntity.badRequest().body("手机号码不能为空");
        }
        
        // 验证手机号格式
        if (!registrationData.get("phoneNumber").matches("^1[3-9]\\d{9}$")) {
            return ResponseEntity.badRequest().body("请输入有效的手机号码");
        }
        
        // 检查用户名是否已存在
        if (userService.findUserByUsername(registrationData.get("username")).isPresent()) {
            return ResponseEntity.badRequest().body("用户名已存在");
        }
        
        // 检查邮箱是否已存在
        if (userService.findUserByEmail(registrationData.get("email")).isPresent()) {
            return ResponseEntity.badRequest().body("邮箱已被注册");
        }
        
        // 检查手机号是否已存在
        if (userService.findUserByPhoneNumber(registrationData.get("phoneNumber")).isPresent()) {
            return ResponseEntity.badRequest().body("手机号已被注册");
        }
        
        // 创建新用户
        User user = new User();
        user.setUsername(registrationData.get("username"));
        user.setEmail(registrationData.get("email"));
        // 确保手机号码不为null
        String phoneNumber = registrationData.get("phoneNumber");
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            user.setPhoneNumber(phoneNumber.trim());
        } else {
            return ResponseEntity.badRequest().body("手机号码不能为空");
        }
        user.setPasswordHash(registrationData.get("password")); // 实际应用中应该对密码进行加密
        
        try {
            User savedUser = userService.saveUser(user);
            
            // 返回成功信息，不包含密码
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedUser.getId());
            response.put("username", savedUser.getUsername());
            response.put("email", savedUser.getEmail());
            response.put("phoneNumber", savedUser.getPhoneNumber());
            response.put("message", "注册成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("注册失败: " + e.getMessage());
        }
    }

    // 删除用户
    @DeleteMapping("/delete/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        userService.deleteUser(userId);
        return ResponseEntity.ok("User deleted successfully");
    }

    // 获取所有用户
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    // 用户登录
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> loginData) {
        String identifier = loginData.get("identifier"); // 邮箱或手机号
        String password = loginData.get("password");
        
        // 验证数据
        if (identifier == null || password == null) {
            return ResponseEntity.badRequest().body("请提供登录信息");
        }
        
        // 记录登录尝试
        logger.info("尝试登录，标识符: " + identifier);
        
        // 尝试通过邮箱登录
        Optional<User> userByEmail = userService.findUserByEmail(identifier);
        if (userByEmail.isPresent()) {
            User user = userByEmail.get();
            // 验证密码（实际应用中应该使用加密比较）
            if (password.equals(user.getPasswordHash())) {
                // 登录成功，返回用户信息（不包含密码）
                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("username", user.getUsername());
                response.put("email", user.getEmail());
                response.put("phoneNumber", user.getPhoneNumber());
                response.put("message", "登录成功");
                logger.info("用户通过邮箱登录成功: " + user.getUsername());
                return ResponseEntity.ok(response);
            }
        }
        
        // 尝试通过手机号登录
        Optional<User> userByPhone = userService.findUserByPhoneNumber(identifier);
        if (userByPhone.isPresent()) {
            User user = userByPhone.get();
            // 验证密码
            if (password.equals(user.getPasswordHash())) {
                // 登录成功，返回用户信息
                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("username", user.getUsername());
                response.put("email", user.getEmail());
                response.put("phoneNumber", user.getPhoneNumber());
                response.put("message", "登录成功");
                logger.info("用户通过手机号登录成功: " + user.getUsername());
                return ResponseEntity.ok(response);
            }
        }
        
        // 登录失败
        logger.warn("登录失败，标识符: " + identifier);
        return ResponseEntity.badRequest().body("邮箱/手机号或密码错误");
    }
}

