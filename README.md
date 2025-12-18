# VPS Monitor - 轻量级服务器监控探针

一个轻量级的 VPS 监控探针系统，**一键部署到 Cloudflare Workers**，完全免费。

![Screenshot](./screenshot.png)

## 🎯 特性

- ⚡ **免费部署** - Cloudflare Workers 免费额度完全够用
- 🌍 **IP 自动定位** - 自动识别 VPS 地区和运营商
- 🔐 **Token 认证** - 安全的数据上报
- 📱 **响应式设计** - 适配桌面和移动端
- 🌓 **暗色模式** - 支持主题切换
- 🔄 **实时监控** - 2 秒自动刷新

---

## 🚀 部署步骤（3 步完成）

### 第 1 步：创建 KV 存储

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **KV**
3. 点击 **Create a namespace**
4. 输入名称：`VPS_KV`
5. **记录 KV 的 ID**（类似 `abc123def456...`）

### 第 2 步：部署 Worker

1. 进入 **Workers & Pages** → **Create**
2. 选择 **Import a repository**（导入仓库）
3. 连接你 Fork 的仓库
4. 配置：

| 设置 | 值 |
|-----|---|
| 项目名称 | `avpsmonitor` |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy` |

5. 点击 **部署**

### 第 3 步：配置变量和 KV

部署完成后，进入项目 **设置**：

**1. 添加环境变量：**

| 变量名 | 值 |
|--------|---|
| `VPS_AUTH_TOKEN` | `your-secret-password` |

**2. 绑定 KV：**

找到 **KV 命名空间绑定**：

| 变量名 | KV 命名空间 |
|--------|------------|
| `VPS_KV` | 选择第 1 步创建的 KV |

**3. 重新部署**

返回部署页面，点击 **重试部署**。

---

## ✅ 验证部署

访问：`https://avpsmonitor.你的子域.workers.dev/api/nodes`

正确响应：
```json
{"nodes":[],"kvAvailable":true,"timestamp":...}
```

---

## 📡 安装 Agent

在你的 VPS 上运行：

```bash
curl -fsSL https://raw.githubusercontent.com/你的用户名/avpsmonitor/main/agent/install.sh | bash -s -- \
  https://avpsmonitor.你的子域.workers.dev \
  your-secret-password \
  vps-01
```

**参数说明：**

| 参数 | 说明 |
|-----|------|
| 第 1 个 | Worker 地址 |
| 第 2 个 | `VPS_AUTH_TOKEN` 的值 |
| 第 3 个 | 节点 ID（每台 VPS 不同） |

### Agent 管理

```bash
systemctl status vps-agent    # 查看状态
journalctl -u vps-agent -f    # 查看日志
systemctl restart vps-agent   # 重启
```

---

## ⚙️ 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `VPS_AUTH_TOKEN` | ✅ | Agent 认证密码 |
| `VPS_SERVERS` | ❌ | 预配置服务器列表 |
| `REFRESH_INTERVAL` | ❌ | 刷新间隔（毫秒），默认 2000 |

### VPS_SERVERS 格式

```
节点ID:名称:国家代码:位置:到期日期:流量重置日:月流量
```

示例：
```
VPS_SERVERS=hk-01:香港:HK:Hong Kong:2025-12-31:1:1t,jp-01:东京:JP:Tokyo::15:3TB
```

---

## 📁 项目结构

```
avpsmonitor/
├── worker/
│   └── index.js        # Cloudflare Worker 入口
├── src/                # React 前端
├── dist/               # 构建输出（静态资源）
├── agent/              # VPS Agent
│   ├── install.sh      # 安装脚本
│   └── agent.sh        # Agent 脚本
├── wrangler.toml       # Cloudflare 配置
└── package.json
```

---

## 🛠️ 本地开发

```bash
npm install
npm run dev     # 前端开发
npm run build   # 构建
```

---

## ❓ FAQ

**Q: 报错 "KV not configured"？**
A: 检查 KV 绑定，变量名必须是 `VPS_KV`，绑定后需重新部署。

**Q: Agent 报错 401？**
A: Token 不匹配，确保环境变量是 `VPS_AUTH_TOKEN`。

**Q: 想部署到 Vercel？**
A: 可以，使用 `/api` 目录下的 Vercel 函数，需要 Upstash Redis。

---

## 📝 License

MIT

---

Made with ❤️ | Powered by Cloudflare Workers
