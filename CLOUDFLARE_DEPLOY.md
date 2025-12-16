# Cloudflare Pages 部署指南

本文档详细说明如何将 VPS Monitor 部署到 Cloudflare Pages。

## 前置准备

1. **GitHub 账号** - 用于托管代码
2. **Cloudflare 账号** - 用于部署 Pages
3. **Upstash 账号** - 用于 Redis 数据存储

## 第一步：创建 Upstash Redis 数据库

1. 访问 [Upstash Console](https://console.upstash.com/)
2. 点击 **Create Database**
3. 配置数据库：
   - **Name**: `vpsmonitor`（任意名称）
   - **Region**: 选择离你的 VPS 最近的区域
   - **Type**: Free（免费版足够使用）
4. 创建后，进入数据库详情页
5. 切换到 **REST API** 标签
6. 复制以下信息：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

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
     UPSTASH_REDIS_REST_URL = https://xxx.upstash.io
     UPSTASH_REDIS_REST_TOKEN = your-upstash-token
     ```
   - 可选变量：
     ```
     REFRESH_INTERVAL = 2000
     VPS_SERVERS = hk-01:香港VPS:HK:Hong Kong:2025-12-31:1:1t
     ```

6. **开始部署**
   - 点击 **Save and Deploy**
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

3. **构建项目**
   ```bash
   npm install
   npm run build
   ```

4. **部署到 Pages**
   ```bash
   npx wrangler pages deploy dist --project-name=avpsmonitor
   ```

5. **配置环境变量**
   ```bash
   # 进入项目设置页面手动添加，或使用 wrangler CLI
   wrangler pages secret put API_TOKEN
   wrangler pages secret put UPSTASH_REDIS_REST_URL
   wrangler pages secret put UPSTASH_REDIS_REST_TOKEN
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

### Q: 为什么前端显示 "Redis not configured"？
**A**: 检查环境变量是否正确配置，特别是 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。

### Q: Agent 报错 "Report failed: 401"？
**A**: `API_TOKEN` 不匹配，检查 Agent 和 Cloudflare Pages 环境变量中的 Token 是否一致。

### Q: 能否与 Vercel 部署共用数据？
**A**: 可以！使用同一个 Upstash Redis 数据库和相同的 `API_TOKEN`，两个站点会实时共享数据。

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

### Upstash Redis 免费额度
- **命令数**: 10,000 次/天
- **存储**: 256 MB
- **带宽**: 200 MB/天

对于个人监控项目，免费额度完全够用。

## 技术支持

如有问题，请：
1. 查看 [主 README](./README.md)
2. 提交 [GitHub Issue](https://github.com/Zbun/avpsmonitor/issues)
3. 查看 Cloudflare Pages [官方文档](https://developers.cloudflare.com/pages/)

---

Happy Monitoring! 🚀

