# 一闪 Moment HTTPS 部署文档

部署日期：2026-11-05  
服务器：腾讯云 Ubuntu 24.04  
公网 IP：`49.233.87.253`  
域名：`www.allentechshare.cn`  
项目目录：`/var/www/yishan-moment`  
Node.js 服务端口：`3000`

---

## 一、最终部署架构

```text
浏览器
   ↓
https://www.allentechshare.cn
   ↓
腾讯云安全组：TCP 443
   ↓
Nginx：443 / SSL
   ↓
Nginx 反向代理：127.0.0.1:3000
   ↓
PM2 / Node.js：一闪 Moment
```

HTTP 会自动跳转到 HTTPS：

```text
http://www.allentechshare.cn
→ 301 Moved Permanently
→ https://www.allentechshare.cn
```

---

## 二、HTTPS 部署前置条件

### 1. DNS 解析

域名 `www.allentechshare.cn` 已解析到：

```text
49.233.87.253
```

验证：

```powershell
nslookup www.allentechshare.cn
```

正常结果包含：

```text
Address: 49.233.87.253
```

### 2. 服务运行状态

服务器上确认：

```bash
pm2 status
curl -I http://127.0.0.1:3000
sudo nginx -t
sudo systemctl status nginx --no-pager
```

正常状态：

- PM2 中 `yishan-moment` 为 `online`
- `http://127.0.0.1:3000` 返回 `200`
- Nginx 配置检查成功
- Nginx 服务为 `active (running)`

### 3. 腾讯云安全组

必须放行：

| 协议 | 端口 | 来源 | 用途 |
| --- | --- | --- | --- |
| TCP | 22 | 管理员 IP 或 `0.0.0.0/0` | SSH |
| TCP | 80 | `0.0.0.0/0` | HTTP / 证书验证 |
| TCP | 443 | `0.0.0.0/0` | HTTPS |

HTTPS 最关键的是：

```text
TCP 443
```

---

## 三、完整 HTTPS 部署流程

### 1. SSH 登录服务器

本地 PowerShell 正确命令：

```powershell
ssh root@49.233.87.253
```

注意不要输入：

```text
ssh root@http://49.233.87.253/
```

这是错误写法，`ssh` 后面只能跟用户名和主机名/IP，不能带 `http://`。

### 2. 确认 Nginx 已运行

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
```

正常输出应包含：

```text
syntax is ok
test is successful
Active: active (running)
```

### 3. 安装 Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 4. 申请 Let's Encrypt 证书

如果根域名和 `www` 都已解析到服务器：

```bash
sudo certbot --nginx -d www.allentechshare.cn -d allentechshare.cn
```

如果只需要 `www` 域名：

```bash
sudo certbot --nginx -d www.allentechshare.cn
```

Certbot 会要求：

1. 输入邮箱，例如 `3422125518@qq.com`
2. 同意服务条款
3. 选择是否将 HTTP 重定向到 HTTPS
4. 建议选择 `Redirect`

正常结果：

```text
Successfully received certificate.
Successfully deployed certificate for www.allentechshare.cn
Congratulations! You have successfully enabled HTTPS
```

证书文件通常位于：

```text
/etc/letsencrypt/live/www.allentechshare.cn/fullchain.pem
/etc/letsencrypt/live/www.allentechshare.cn/privkey.pem
```

### 5. 重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

### 6. 验证 HTTPS

服务器本地：

```bash
curl -I http://www.allentechshare.cn
curl -4 -k -I --max-time 10 https://127.0.0.1 -H "Host: www.allentechshare.cn"
curl -4 -k -I --max-time 10 https://www.allentechshare.cn
```

Windows 本地：

```powershell
curl.exe -4 -I --max-time 10 http://www.allentechshare.cn
curl.exe -4 -k -I --max-time 10 https://www.allentechshare.cn
Test-NetConnection www.allentechshare.cn -Port 443
```

正常结果：

```text
HTTP/1.1 301 Moved Permanently
Location: https://www.allentechshare.cn/
```

以及 HTTPS 返回 `200`、`301` 或 `302`。

浏览器访问：

```text
https://www.allentechshare.cn
```

管理员页面：

```text
https://www.allentechshare.cn/admin/login
```

---

## 四、刚才遇到的问题与解决流程

### 问题 1：SSH 命令格式错误

#### 现象

```text
ssh root@http://49.233.87.253/
ssh: Could not resolve hostname http://49.233.87.253/
```

#### 原因

`ssh` 命令不能带 `http://` 或末尾 `/`。

#### 解决

使用：

```powershell
ssh root@49.233.87.253
```

---

### 问题 2：Nginx 未启动

#### 现象

```text
nginx.service is not active, cannot reload.
```

#### 原因

Nginx 配置文件已经检查成功，但 Nginx 服务尚未启动。

#### 解决

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx --no-pager
```

---

### 问题 3：80 端口被旧 Nginx 占用

#### 现象

```text
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
```

#### 排查

```bash
sudo ss -ltnp | grep ':80 '
ps -o pid,ppid,user,cmd -p 165025,198574,198575,198576,198577
```

结果显示旧 Nginx：

```text
nginx: master process /www/server/nginx/sbin/nginx
```

这是另一个 Nginx 实例，不是 systemd 管理的 Nginx。

#### 解决

确认旧 Nginx 主进程 PID 后：

```bash
sudo kill -QUIT 165025
sleep 2
sudo ss -ltnp | grep ':80 '
sudo systemctl start nginx
```

如果普通停止失败：

```bash
sudo kill -TERM 165025
```

不要单独杀 worker 子进程。

---

### 问题 4：`nginx -s quit` 无法停止旧 Nginx

#### 现象

```text
open() "/run/nginx.pid" failed (2: No such file or directory)
```

#### 原因

旧 Nginx 使用 `/www/server/nginx`，它的 PID 文件不在 `/run/nginx.pid`，所以系统 `nginx -s quit` 无法控制它。

#### 解决

直接停止旧 Nginx 主进程：

```bash
sudo kill -QUIT 165025
```

然后启动系统 Nginx：

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### 问题 5：HTTP 能访问，但 HTTPS 超时

#### 现象

Windows 本地：

```text
curl.exe -4 -I http://www.allentechshare.cn
HTTP/1.1 301 Moved Permanently
Location: https://www.allentechshare.cn/

curl.exe -4 -k -I https://www.allentechshare.cn
curl: (28) Connection timed out
```

服务器内部：

- Node 服务 `127.0.0.1:3000` 返回 `200`
- Nginx 正常运行
- `80` 和 `443` 都已经监听

#### 原因

域名解析和 Nginx 配置都正常，但公网无法连接服务器的 TCP `443` 端口。

HTTP 能通是因为 TCP `80` 已放行；HTTPS 超时是因为 TCP `443` 未放行。

#### 解决

在腾讯云安全组添加：

```text
协议：TCP
端口：443
来源：0.0.0.0/0
策略：允许
```

如果服务器还启用了宝塔防火墙、云防火墙或其他系统防火墙，也必须放行 TCP `443`。

修改后验证：

```powershell
Test-NetConnection www.allentechshare.cn -Port 443
curl.exe -4 -k -I --max-time 10 https://www.allentechshare.cn
```

正常结果：

```text
TcpTestSucceeded : True
```

以及 HTTPS 请求不再超时。

---

## 五、证书自动续期

Certbot 已配置自动续期任务。测试续期配置：

```bash
sudo certbot renew --dry-run
```

如果没有报错，证书到期前会自动续期。

查看证书：

```bash
sudo certbot certificates
```

---

## 六、部署完成后的访问地址

### 参与者页面

```text
https://www.allentechshare.cn
```

### 管理员登录

```text
https://www.allentechshare.cn/admin/login
```

### 管理员账号

```text
账号：admin
密码：20210224yjq
```

---

## 七、日常维护命令

### 查看 PM2 状态

```bash
pm2 status
```

### 重启项目

```bash
cd /var/www/yishan-moment
pm2 restart yishan-moment
```

### 查看项目日志

```bash
pm2 logs yishan-moment --lines 100
```

### 重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 更新项目

```bash
cd /var/www/yishan-moment
git pull
npm ci
pm2 restart yishan-moment
```

### 备份上传和提交数据

```bash
sudo tar -czf /root/yishan-moment-backup-$(date +%F).tar.gz \
  /var/www/yishan-moment/data \
  /var/www/yishan-moment/uploads
```

---

## 八、最终结论

HTTPS 部署成功需要同时满足：

1. DNS 正确解析到 `49.233.87.253`
2. PM2 正常运行 Node.js 项目
3. Nginx 正常运行并监听 `80/443`
4. Certbot 成功签发证书
5. 腾讯云安全组放行 TCP `443`
6. 服务器本地防火墙也放行 TCP `443`

本次问题最终定位为：**HTTPS 的 TCP 443 端口未在服务器防火墙/安全组中放行**。放行后即可正常访问 HTTPS 页面。
