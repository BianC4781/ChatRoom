# 使用官方Java镜像作为基础镜像
FROM eclipse-temurin:21-jdk

# 设置工作目录
WORKDIR /app

# 安装Maven
RUN apt-get update && \
    apt-get install -y maven

# 复制Maven配置文件
COPY pom.xml .

# 复制源代码
COPY src ./src

# 复制Maven包装器
COPY mvnw .
COPY .mvn ./.mvn

# 设置Maven包装器为可执行
RUN chmod +x mvnw

# 使用Maven构建应用
RUN ./mvnw package -DskipTests

# 暴露应用端口
EXPOSE 8080

# 设置MySQL环境变量（可在运行容器时覆盖）
ENV SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/ChatRoom?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai
ENV SPRING_DATASOURCE_USERNAME=root
ENV SPRING_DATASOURCE_PASSWORD=478109926

# 运行应用
CMD ["java", "-jar", "/app/target/demo-0.0.1-SNAPSHOT.jar"]