// 认证相关功能：登录、注册和页面交互
let currentUser = null;

// 页面加载完成后初始化事件监听
document.addEventListener('DOMContentLoaded', function() {
    // 登录表单提交事件
    document.getElementById('login-form').addEventListener('submit', login);
    
    // 注册表单提交事件
    if (document.getElementById('register-form')) {
        document.getElementById('register-form').addEventListener('submit', register);
    }
    
    // 切换到注册页面
    document.getElementById('show-register').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('register-screen').classList.remove('hidden');
    });
    
    // 切换到登录页面
    document.getElementById('show-login').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('register-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    });
    
    // 初始化页面交互效果
    initAuthPageInteractions();
});

// 初始化登录/注册页面交互功能
function initAuthPageInteractions() {
    // 密码显示/隐藏切换
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });
    
    // 输入框焦点效果
    document.querySelectorAll('.input-group input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
    
    // 表单提交动画
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            const button = this.querySelector('button[type="submit"]');
            if (button) {
                button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 处理中...';
                button.disabled = true;
            }
        });
    });
}

// 用户登录
function login(event) {
    event.preventDefault();
    
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!identifier || !password) {
        alert('请填写所有必填字段');
        resetLoginButton();
        return;
    }
    
    // 发送登录请求到后端
    fetch('/api/users/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            identifier: identifier,
            password: password
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        // 登录成功
        currentUser = data;
        
        // 存储用户信息到sessionStorage，以便在聊天页面使用
        sessionStorage.setItem('currentUser', JSON.stringify(data));
        
        // 跳转到聊天页面
        window.location.href = 'chat.html';
    })
    .catch(error => {
        alert('登录失败: ' + error.message);
        resetLoginButton();
    });
}

// 重置登录按钮状态
function resetLoginButton() {
    const button = document.querySelector('#login-form button[type="submit"]');
    if (button) {
        button.innerHTML = '登录';
        button.disabled = false;
    }
}

// 用户注册
function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const confirmPassword = document.getElementById('register-confirm-password')?.value.trim();
    
    // 验证表单
    if (!username) {
        alert('请填写用户名');
        resetRegisterButton();
        return;
    }
    if (!email) {
        alert('请填写邮箱');
        resetRegisterButton();
        return;
    }
    
    if (!phone) {
        alert('请填写手机号码');
        resetRegisterButton();
        return;
    }
    
    // 验证手机号格式（简单验证，可根据需要调整）
    const phoneRegex = /^1[3-9]\d{9}$/; // 中国大陆手机号格式
    if (!phoneRegex.test(phone)) {
        alert('请输入有效的手机号码');
        resetRegisterButton();
        return;
    }
    
    if (!password) {
        alert('请填写密码');
        resetRegisterButton();
        return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
        alert('两次输入的密码不一致');
        resetRegisterButton();
        return;
    }
    
    // 发送注册请求到后端
    fetch('/api/users/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            email: email,
            phoneNumber: phone,
            password: password,
            confirmPassword: confirmPassword
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        // 注册成功
        alert('注册成功，请登录');
        
        // 切换到登录页面
        document.getElementById('register-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        
        // 自动填充登录表单
        document.getElementById('login-identifier').value = email;
    })
    .catch(error => {
        alert('注册失败: ' + error.message);
        resetRegisterButton();
    });
}

// 重置注册按钮状态
function resetRegisterButton() {
    const button = document.querySelector('#register-form button[type="submit"]');
    if (button) {
        button.innerHTML = '立即注册';
        button.disabled = false;
    }
}