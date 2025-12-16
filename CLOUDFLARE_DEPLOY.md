# Cloudflare Pages 部署指南

本文档详细说明如何将 VPS Monitor 部署到 Cloudflare Pages（使用 Workers KV 存储）。

## 前置准备

1. **GitHub 账号** - 用于托管代码
2. **Cloudflare 账号** - 用于部署 Pages 和 KV 存储

> 💡 **优势**：使用 Cloudflare Workers KV，无需外部依赖，配置更简单！

## 第一步：创建 Workers KV 命名空间

### 方式一：通过 Wrangler CLI（推荐）

```bash
# 安装 Wrangler（如果还没有）
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建生产环境 KV 命名空间
wrangler kv:namespace create "VPS_KV"

# 创建预览环境 KV 命名空间
wrangler kv:namespace create "VPS_KV" --preview
```

命令会返回类似以下信息，**请记录下来**：

```
✨ Success! Created KV namespace VPS_KV
Add the following to your wrangler.toml:
id = "abc123def456..."

✨ Success! Created KV namespace VPS_KV (preview)
Add the following to your wrangler.toml:
preview_id = "xyz789abc123..."
```

### 方式二：通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **KV**
3. 点击 **Create a namespace**
4. 输入命名空间名称：`VPS_KV`
5. 记录创建后的 **Namespace ID**

## 第二步：部署到 Cloudflare Pages

### 方式一：通过 Cloudflare Dashboard（推荐）

1. **Fork 本仓库到你的 GitHub**

2. **登录 Cloudflare Dashboard**
   - 访问 https://dash.cloudflare.com/
   - 进入 **Workers & Pages**

3. **创建 Pages 项目**
   - 点击 **Create application**
   - 选择 **Pages** → **Connect to Git**
   - 选择你 Fork 的仓库
   - 点击 **Begin setup**

4. **配置构建设置**
   - **Project name**: `avpsmonitor`（任意名称）
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

5. **配置环境变量**
   - 点击 **Environment variables (advanced)**
   - 添加以下变量：
     ```
     API_TOKEN = your-secret-token-here
     ```
   - 可选变量：
     ```
     REFRESH_INTERVAL = 2000
     VPS_SERVERS = hk-01:香港VPS:HK:Hong Kong:2025-12-31:1:1t
     ```

6. **绑定 KV 命名空间**
   - 点击 **Save and Deploy** 完成首次部署
   - 部署完成后，进入项目 **Settings** → **Functions**
   - 找到 **KV namespace bindings** 部分
   - 点击 **Add binding**
     - **Variable name**: `VPS_KV`
     - **KV namespace**: 选择你在第一步创建的 `VPS_KV`
   - 点击 **Save**

7. **重新部署**
   - 返回 **Deployments** 标签
   - 点击最新部署右侧的 **⋯** → **Retry deployment**
   - 或者直接 push 一个新 commit 触发重新部署
   - 等待构建完成（约 2-3 分钟）
   - 部署成功后会显示你的站点 URL，如 `https://avpsmonitor.pages.dev`

### 方式二：通过 Wrangler CLI

1. **安装 Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **创建 KV 命名空间（如果还没有）**
   ```bash
   wrangler kv:namespace create "VPS_KV"
   ```

4. **更新 wrangler.toml**
   - 将第一步返回的 KV Namespace ID 填入 `wrangler.toml`：
   ```toml
   [[kv_namespaces]]
   binding = "VPS_KV"
   id = "你的KV命名空间ID"  # 替换这里
   ```

5. **构建项目**
   ```bash
   npm install
   npm run build
   ```

6. **部署到 Pages**
   ```bash
   npx wrangler pages deploy dist --project-name=avpsmonitor
   ```

7. **配置环境变量**
   ```bash
   # 通过 Dashboard 配置环境变量（推荐）
   # 或使用 wrangler CLI
   wrangler pages secret put API_TOKEN
   ```

## 第三步：安装 Agent

在你的 VPS 上运行以下命令：

```bash
curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/install.sh | bash -s -- \
  https://your-project.pages.dev \
  your-api-token \
  my-vps-01
```

**参数说明**：
- 第一个参数：你的 Cloudflare Pages 站点地址
- 第二个参数：API_TOKEN（与环境变量中配置的一致）
- 第三个参数：节点 ID（唯一标识）

## 验证部署

1. **访问你的站点** - `https://your-project.pages.dev`
2. **检查 API 端点**：
   - `https://your-project.pages.dev/api/nodes` - 应返回 JSON 数据
3. **查看 Agent 日志**：
   ```bash
   journalctl -u vps-agent -f
   ```
4. **等待数据上报** - Agent 每 4 秒上报一次，约 10 秒后可在前端看到数据

## 更新部署

### 自动部署（推荐）
- Cloudflare Pages 会自动监听 Git 仓库
- 每次 push 到 `main` 分支都会自动重新部署

### 手动部署
```bash
npm run build
npx wrangler pages deploy dist --project-name=avpsmonitor
```

## 自定义域名

1. 在 Cloudflare Pages 项目设置中
2. 进入 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入你的域名（需要在 Cloudflare 管理 DNS）
5. 按照提示添加 CNAME 记录
6. 等待 SSL 证书自动签发（约 5 分钟）

## 常见问题

### Q: 为什么前端显示 "Workers KV not configured"？
**A**: 
1. 检查是否已创建 KV 命名空间
2. 检查 KV 绑定的变量名是否为 `VPS_KV`
3. 确保部署后重新部署以应用 KV 绑定

### Q: Agent 报错 "Report failed: 401"？
**A**: `API_TOKEN` 不匹配，检查 Agent 和 Cloudflare Pages 环境变量中的 Token 是否一致。

### Q: 如何查看 KV 存储的数据？
**A**: 
1. 进入 Cloudflare Dashboard → **Workers & Pages** → **KV**
2. 选择你的 KV 命名空间
3. 可以查看所有 key-value 对

### Q: Workers KV 和 Upstash Redis 有什么区别？
**A**: 
- **Workers KV**: Cloudflare 原生，无需外部依赖，配置简单
- **Upstash Redis**: 功能更强大，支持复杂数据结构，但需要外部服务
- 本项目使用 KV 完全够用，推荐使用 KV 方案！

### Q: 能否与 Vercel 部署共用数据？
**A**: 不能直接共用。Vercel 使用 Redis，Cloudflare Pages 使用 KV，两者是独立的存储系统。但 Agent 可以同时上报到两个站点。

### Q: 如何查看函数日志？
**A**: 
1. 进入 Cloudflare Dashboard
2. 选择你的 Pages 项目
3. 进入 **Functions** → **Real-time Logs**

### Q: 构建失败怎么办？
**A**: 
1. 检查 `package.json` 中的依赖是否完整
2. 查看构建日志中的具体错误
3. 确保 Node.js 版本兼容（推荐 18+）

## 性能优化

### 1. 启用 HTTP/3
Cloudflare Pages 默认支持 HTTP/3，无需额外配置。

### 2. 配置缓存规则
在 Cloudflare Dashboard → **Caching** → **Configuration** 中：
- 静态资源缓存时间设为 1 个月
- API 端点不缓存（已在代码中设置）

### 3. 开启 Brotli 压缩
Cloudflare 默认启用 Brotli 和 Gzip 压缩。

### 4. 配置 Page Rules
- 为静态资源开启 "Cache Everything"
- 为 `/api/*` 设置 "Bypass Cache"

## 费用说明

### Cloudflare Pages 免费额度
- **请求数**: 100,000 次/天
- **构建次数**: 500 次/月
- **带宽**: 无限制
- **函数调用**: 100,000 次/天

### Workers KV 免费额度
- **读取**: 100,000 次/天
- **写入**: 1,000 次/天
- **存储**: 1 GB
- **列出请求**: 1,000 次/天

对于个人监控项目（假设 10 台 VPS）：
- **写入**: 每台 4 秒上报一次 = 每天 ~216,000 次（**超出免费额度**）
- **读取**: 前端每 2 秒刷新 = 每天 ~43,200 次（免费额度内）

> ⚠️ **重要**：如果 VPS 数量较多，建议：
> 1. 将 Agent 上报间隔调整为 10 秒（`INTERVAL=10000`）
> 2. 或使用 Upstash Redis 方案（原 `functions/api` 支持，见文档）
> 3. Workers KV 写入超额费用：$0.50 / 百万次

### 成本对比

| 方案 | 适用场景 | 月费用估算（10台VPS） |
|------|---------|---------------------|
| **Workers KV** | 小规模（<5台）或调整上报间隔 | **免费** 或 $0.5/月 |
| **Upstash Redis** | 中大规模（>5台） | 免费（10k命令/天内） |

**推荐**：个人项目优先使用 Workers KV（免费 + 简单），企业项目使用 Upstash（更稳定）。

## 技术支持

如有问题，请：
1. 查看 [主 README](./README.md)
2. 提交 [GitHub Issue](https://github.com/Zbun/avpsmonitor/issues)
3. 查看 Cloudflare Pages [官方文档](https://developers.cloudflare.com/pages/)

---

Happy Monitoring! 🚀

