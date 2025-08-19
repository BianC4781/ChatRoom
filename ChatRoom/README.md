# 在线聊天室应用

这是一个基于Spring Boot和WebSocket的在线聊天室应用，支持实时消息传递、用户注册登录和多房间聊天功能。

## 功能特点

- 用户注册和登录
- 实时消息传递
- 多房间聊天
- 用户在线状态显示
- 消息历史记录

## 技术栈

- 后端：Spring Boot, Spring WebSocket, Spring Data JPA
- 前端：HTML, CSS, JavaScript, SockJS, STOMP
- 数据库：MySQL

## 项目结构

```
src/main/java/com/example/demo/
├── config/             # 配置类
│   └── WebSocketConfig.java
├── controller/         # 控制器
│   ├── ChatController.java
│   ├── MessageController.java
│   └── UserController.java
├── entity/             # 实体类
│   ├── Message.java
│   ├── PrivateMessage.java
│   ├── Room.java
│   └── User.java
├── repository/         # 数据访问层
│   ├── MessageRepository.java
│   ├── RoomRepository.java
│   └── UserRepository.java
├── service/            # 服务层
│   ├── MessageService.java
│   ├── MessageServiceImpl.java
│   └── UserService.java
└── DemoApplication.java
```

## 快速开始

### 前提条件

- JDK 17+
- Maven 3.6+
- MySQL 8.0+

### 数据库设置

1. 创建名为`chatroom`的MySQL数据库
2. 运行`chatroom.sql`脚本初始化数据库结构和测试数据

### 配置应用

1. 在`application.properties`中配置数据库连接信息

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/chatroom?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### 运行应用

```bash
# 克隆项目
git clone https://github.com/yourusername/chatroom.git
cd chatroom

# 使用Maven构建和运行
./mvnw spring-boot:run
```

应用将在 http://localhost:8080 启动

## 使用指南

1. 访问 http://localhost:8080
2. 注册新账户或使用测试账户登录
   - 测试账户1：username: alice, password: password
   - 测试账户2：username: bob, password: password
3. 登录后即可开始聊天

## WebSocket API

### 端点

- `/ws` - WebSocket连接端点

### 发布/订阅目标

- `/app/chat.sendMessage` - 发送公共消息
- `/app/chat.addUser` - 用户加入聊天
- `/app/chat.privateMessage` - 发送私人消息
- `/topic/public` - 接收公共消息
- `/topic/private` - 接收私人消息

## REST API

### 用户API

- `GET /api/users/username/{username}` - 根据用户名查找用户
- `GET /api/users/email/{email}` - 根据邮箱查找用户
- `POST /api/users/create` - 创建新用户

### 消息API

- `GET /api/messages` - 获取所有消息
- `GET /api/messages/room/{roomId}` - 获取特定房间的消息
- `POST /api/messages/send` - 发送新消息

## 许可证

[MIT](LICENSE)