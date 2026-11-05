# 一闪 Moment

“一闪 Moment”是一个液态玻璃风格的互动提交页面。操作人员负责上传并设置展示图片、背景、文本栏和选项栏；参与者只查看完整展示图片、选择选项并填写文字。提交后，操作人员可以在 `/admin` 查看和导出记录。

## 功能

- 操作人员上传并设置展示图片
- 参与者页面完整展示图片，桌面和手机均不裁剪、不变形
- 操作人员设置动态液态玻璃背景
- 粉色梅花飘落背景
- 蓝紫流光、暖金夕阳、深海气泡三种备用背景
- 可配置文本栏
- 单选和多选选项栏
- 提交校验与成功反馈
- 提交记录查看、关键词筛选、详情展开
- 提交记录 CSV 导出
- 自动生成参与者页面二维码
- 保存高清二维码 PNG
- 可视化页面配置
- 桌面端和移动端响应式布局

## 管理员登录\n\n点击页面顶部的“操作台”后，会先进入管理员登录页：`/admin/login`。\n\n- 本地账号：`admin`\n- 本地密码：已配置在本地运行环境中，不提交到 GitHub。\n- Railway 部署时请设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 环境变量。\n- 登录状态使用 HttpOnly 会话 Cookie，操作台、配置、上传、提交记录和二维码接口均需要管理员验证。\n\n## 本地运行

要求：Node.js 20 或更高版本。

```bash
npm install
npm start
```

打开：

- 参与者页面：`http://localhost:3000`\n- 管理员登录：`http://localhost:3000/admin/login`
- 提交记录：`http://localhost:3000/admin`
- 页面配置：`http://localhost:3000/admin/edit`

## 测试

```bash
npm test
```

测试覆盖数据存储、提交校验、上传 API、二维码 PNG API、提交 API、CSV 导出和页面结构。

## 操作人员使用方法

访问 `http://localhost:3000/admin/edit`：

1. 修改页面标题、说明和默认背景。
2. 上传展示图片，或添加图片链接。
3. 在图片编辑器中点击 **设为展示图**。
4. 添加、删除或排序文本栏和选项栏。
5. 选择参与者页面使用的背景。`n6. 点击 **保存配置**。
7. 点击 **生成二维码**。
8. 点击 **保存二维码**，下载 `yishan-moment-qr.png`。

参与者页面不提供图片上传、图片选择或背景选择。参与者只能看到操作人员设置好的图片和背景，并填写文本和选项。

## 图片展示规则

- 展示图片使用 `object-fit: contain`。
- 图片完整显示，不使用裁剪模式。
- 图片按原始比例等比缩放。`n- 图片下方不显示额外说明栏，只展示图片。
- 图片区域在桌面端和移动端自适应，不产生横向溢出。
- 操作人员可在配置页更换展示图片。

## 二维码

二维码自动使用当前访问地址并指向参与者首页：

- 本地运行：`http://localhost:3000/`
- Railway 部署：`https://你的域名/`

二维码由项目本地的 `qrcode` 依赖生成，不调用第三方二维码 API。

新增接口：

```text
GET /api/qr.png?text=<encoded-url>
```

服务端只接受 `http` 和 `https` 地址，并返回高清 PNG。

## 提交数据

演示版使用本地 JSON 文件：

- `data/config.json`：页面配置
- `data/submissions.json`：提交记录
- `uploads/`：操作人员上传的图片

演示版适合本地体验和小规模测试。Railway 的临时文件系统可能在重新部署或实例重启后重置上传文件和运行数据；正式生产环境建议后续迁移至 PostgreSQL 和云对象存储。

## 部署到 Railway

### 1. 推送到 GitHub

在项目目录执行：

```bash
git init
git add .
git commit -m "feat: add yishan moment"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

如果你使用本项目已有 Git 历史，可直接推送当前分支。

### 2. 创建 Railway 项目

1. 打开 [Railway](https://railway.app/)。
2. 点击 **New Project**。
3. 选择 **Deploy from GitHub repo**。
4. 授权并选择本仓库。
5. Railway 会自动识别 Node.js 项目。

### 3. 启动配置

项目已包含：

- `package.json` 中的 `npm start`
- `Procfile` 中的 `web: npm start`
- `railway.json` 中的启动命令和健康检查

Railway 默认提供 `PORT` 环境变量，服务会自动监听：

```js
const port = Number(process.env.PORT) || 3000;
```

### 4. 可选环境变量

| 变量 | 作用 | 默认值 |
| --- | --- | --- |
| `PORT` | 服务端口 | `3000` |
| `YISHAN_DATA_DIR` | JSON 数据目录 | 项目内 `data/` |
| `YISHAN_UPLOADS_DIR` | 上传图片目录 | 项目内 `uploads/` |

部署完成后：

- 参与者页面：Railway 提供的根域名
- 管理页面：`https://你的域名/admin`
- 配置页面：`https://你的域名/admin/edit`
- 二维码自动编码：`https://你的域名/`

## 目录结构

```text
.
├── data/
├── public/
│   ├── admin-edit.html
│   ├── admin-edit.js
│   ├── admin.css
│   ├── admin.html
│   ├── admin.js
│   ├── app.js
│   ├── backgrounds.js
│   ├── index.html
│   └── styles.css
├── lib/
├── tests/
├── uploads/
├── server.js
├── package.json
├── Procfile
└── railway.json
```

## 后续升级建议

- 接入 Railway PostgreSQL，持久化配置和提交记录。
- 接入 S3/R2/Cloudinary，持久化上传图片。
- 增加管理员认证，保护 `/admin` 与 `/admin/edit`。
- 增加二维码颜色、Logo、扫描次数统计和短链接。
- 增加提交通知、批量删除、标签统计和高级筛选。



