# VPS Monitor - 轻量级服务器监控探针

一个轻量级的 VPS 监控探针系统，**一键部署到 Cloudflare Workers**，完全免费。

![Screenshot](./screenshot.png)

## 🎯 特性

- ⚡ **免费部署** - Cloudflare Workers + D1 免费额度完全够用
- 🌍 **IP 自动定位** - 自动识别 VPS 地区和运营商
- 🔐 **Token 认证** - 安全的数据上报
- 📱 **响应式设计** - 适配桌面和移动端
- 🌓 **暗色模式** - 支持主题切换
- 🔄 **实时监控** - 1 秒自动刷新

---

## 🚀 部署步骤

### 第 1 步：Fork 仓库

点击右上角 **Fork** 按钮，Fork 到你的 GitHub 账号。

### 第 2 步：创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单 **存储和数据库** → **D1 SQL 数据库** → **创建**
3. 名称随意（如 `vps-monitor`）

### 第 3 步：部署到 Cloudflare

1. **Workers & Pages** → **Create** → **Connect to Git**
2. 选择你 Fork 的仓库
3. 配置构建：
   - 构建命令：`npm run build`
   - 部署命令：`npx wrangler deploy`
4. 点击 **Deploy**

### 第 4 步：绑定 D1 和配置变量

部署完成后，进入项目配置：

**A. 绑定 D1 数据库**

1. 进入项目 → **Bindings** 选项卡
2. **Add** → **D1 Database**
   - Variable name: `VPS_DB`
   - D1 Database: 选择第 2 步创建的数据库
3. 点击 **Save**

**B. 添加环境变量**

进入 **Settings** → **Variables** → **Add variable**：

| 变量名 | 值 |
|--------|---|
| `API_TOKEN` | `your-password` |

**C. 重新部署**

返回 **Deployments**，点击 **Retry deployment**。

**完成！** 访问你的域名即可看到监控面板。

> ⚠️ **重要**：每次从上游拉取更新后 **D1 绑定会丢失**，需要重新在 Bindings 选项卡绑定。环境变量不受影响。

---

## ✅ 验证部署

访问：`https://你的项目.workers.dev/api/nodes`

正确响应：
```json
{"nodes":[],"d1Available":true,"timestamp":...}
```

---

## 📡 安装 Agent

在你的 VPS 上运行：

```bash
curl -fsSL https://raw.githubusercontent.com/你的用户名/avpsmonitor/main/agent/install.sh | bash -s -- \
  https://你的项目.workers.dev \
  your-api-token \
  vps-01
```

| 参数 | 说明 |
|-----|------|
| 第 1 个 | Worker 地址 |
| 第 2 个 | `API_TOKEN` 的值 |
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
| `API_TOKEN` | ✅ | Agent 认证密码 |
| `VPS_SERVERS` | ❌ | 预配置服务器列表 |
| `REFRESH_INTERVAL` | ❌ | 前端刷新间隔（毫秒），默认 1000 |
| `REPORT_INTERVAL` | ❌ | 写入间隔（秒），默认 10，控制 D1 写入频率 |

### VPS_SERVERS 格式

```
节点ID:名称:国家代码:位置:到期日期:流量重置日:月流量
```

示例：
```
VPS_SERVERS=hk-01:香港:HK:Hong Kong:2025-12-31:1:1t,jp-01:东京:JP:Tokyo::15:3TB
```

---

## 📊 D1 免费额度说明

Cloudflare D1 免费账户每日限制：

| 指标 | 限额 |
|------|------|
| 已读取行 | 5,000,000 |
| **已写入行** | **100,000** |
| 存储 | 5 GB |

> ⚠️ **写入行数是瓶颈**。Agent 默认每 5 秒上报，但 Worker 端通过 `REPORT_INTERVAL` 控制实际写入频率。

### 不同配置下的预估写入量

| REPORT_INTERVAL | 节点数 | 日写入量 | 可支持运行 |
|-----------------|--------|----------|-----------|
| 10秒（默认） | 3 台 | ~26k | ✅ 充裕 |
| 10秒（默认） | 5 台 | ~43k | ✅ 安全 |
| 15秒 | 10 台 | ~58k | ✅ 可用 |
| 30秒 | 10 台 | ~29k | ✅ 充裕 |

根据节点数量调整 `REPORT_INTERVAL`（单位：秒）即可。Agent 脚本无需修改。

---

## 📁 项目结构

```
avpsmonitor/
├── worker/
│   └── index.js        # Cloudflare Worker 入口
├── src/                # React 前端
├── agent/              # VPS Agent
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

**Q: 报错 "D1 not configured"？**
A: 检查 Bindings 选项卡是否已绑定 D1，变量名必须是 `VPS_DB`。

**Q: Agent 报错 401？**
A: 确保 Dashboard 环境变量 `API_TOKEN` 的值与 Agent 使用的密码一致。

**Q: 更新代码后 D1 绑定丢失？**
A: 这是正常现象。每次更新代码后需要重新在 Bindings 选项卡绑定 D1 数据库。

---

## 📝 License

MIT

---

Made with ❤️ | Powered by Cloudflare Workers + D1
