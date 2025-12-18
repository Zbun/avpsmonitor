# Cloudflare Pages 浏览器部署指南（无需 CLI）

本指南适用于**完全通过浏览器部署**，无需安装任何命令行工具。

## 🎯 部署步骤（5 分钟完成）

### 第 1 步：Fork 仓库

1. 访问本项目 GitHub 仓库
2. 点击右上角 **Fork** 按钮
3. Fork 到你的 GitHub 账号

### 第 2 步：创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单选择 **Workers & Pages**
3. 切换到 **KV** 标签
4. 点击 **Create a namespace**
5. 输入命名空间名称：`VPS_KV`（名称可以自定义，后面会用到）
6. 点击 **Add**
7. **记录下创建的命名空间 ID**（类似 `abc123def456...`，后面不需要手动输入，但记录下来便于查看）

### 第 3 步：创建 Pages 项目

1. 在 **Workers & Pages** 页面
2. 点击 **Create application** 按钮
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**
5. 授权访问 GitHub（首次需要）
6. 选择你 Fork 的 `avpsmonitor` 仓库
7. 点击 **Begin setup**

### 第 4 步：配置构建

在项目设置页面：

**1. Project name（项目名称）**
```
avpsmonitor
```
（或任意你喜欢的名称）

**2. Production branch（生产分支）**
```
main
```

**3. Build settings（构建设置）**
- **Framework preset**: None
- **Build command**: `npm run build`
- **Build output directory**: `dist`

**4. Environment variables（环境变量）**

点击 **Add variable** 添加：

| 变量名 | 值 | 说明 |
|--------|---|------|
| `API_TOKEN` | `your-secret-token-here` | 自定义一个复杂密码 |

可选变量（按需添加）：

| 变量名 | 值 | 说明 |
|--------|---|------|
| `REFRESH_INTERVAL` | `2000` | 前端刷新间隔（毫秒） |
| `VPS_SERVERS` | `hk-01:香港VPS:HK:Hong Kong:2025-12-31:1:1t` | 预配置服务器列表 |

> ⚠️ **重要**：暂时**不要**点击 "Save and Deploy"，继续下一步！

### 第 5 步：绑定 KV 命名空间

> 🔴 **关键步骤**：必须先完成 KV 绑定，再部署！

还在刚才的页面：

1. 向下滚动，找到 **KV namespace bindings** 部分
2. 点击 **Add binding** 按钮
3. 填写绑定信息：
   - **Variable name（变量名）**: `VPS_KV` ← **必须是这个名字**
   - **KV namespace（命名空间）**: 从下拉菜单选择第 2 步创建的 `VPS_KV`
4. 点击右侧的 **Add** 按钮（添加绑定）

### 第 6 步：开始部署

1. 确认已添加 KV 绑定（上面应该显示 `VPS_KV` 绑定）
2. 点击 **Save and Deploy** 按钮
3. 等待构建和部署（约 2-3 分钟）
4. 部署成功后，会显示你的站点 URL：
   ```
   https://avpsmonitor-xxx.pages.dev
   ```

### 第 7 步：验证部署

访问以下 URL 验证：

```
https://你的项目.pages.dev/api/nodes
```

**✅ 正常响应**（初始状态，无节点）：
```json
{
  "nodes": [],
  "timestamp": 1704067200000,
  "count": 0,
  "kvAvailable": true,
  "refreshInterval": 2000
}
```

**❌ 错误响应**（KV 未绑定）：
```json
{
  "nodes": [],
  "kvAvailable": false,
  "message": "Workers KV not configured. Please bind a KV namespace named VPS_KV."
}
```

如果看到错误响应，说明 KV 绑定未生效，继续看下面的"KV 绑定补救"。

## 🔧 KV 绑定补救（如果第 5 步遗漏了）

如果部署时忘记绑定 KV，按以下步骤补救：

1. 进入你的 Pages 项目页面
2. 点击 **Settings** 标签
3. 左侧选择 **Functions**
4. 向下滚动到 **KV namespace bindings** 部分
5. 点击 **Add binding**
6. 填写：
   - **Variable name**: `VPS_KV`
   - **KV namespace**: 选择你创建的命名空间
7. 点击 **Save**
8. 返回 **Deployments** 标签
9. 找到最新的部署，点击右侧 **⋯**
10. 选择 **Retry deployment**（重新部署）

## 📡 安装 Agent

在你的 VPS 上运行：

```bash
curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/install.sh | bash -s -- \
  https://你的项目.pages.dev \
  你的API_TOKEN \
  my-vps-01
```

**参数说明**：
- 第 1 个参数：你的 Cloudflare Pages 站点地址（上面第 6 步获得的）
- 第 2 个参数：第 4 步设置的 `API_TOKEN`
- 第 3 个参数：节点 ID（自定义，每台 VPS 不同）

**示例**：
```bash
curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/install.sh | bash -s -- \
  https://avpsmonitor-abc.pages.dev \
  my-super-secret-token-2024 \
  hk-vps-01
```

## ⚙️ 调整 Agent 上报间隔（避免超出 KV 写入限额）

Workers KV 免费额度：**1,000 次写入/天**

默认 Agent 每 4 秒上报一次，对于多台 VPS 会超出限额。建议：

### 方式 A：安装时指定间隔（推荐）

```bash
# 30 秒上报一次（3 台 VPS 以内免费）
curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/install.sh | \
  INTERVAL=30000 bash -s -- \
  https://你的项目.pages.dev \
  你的API_TOKEN \
  节点ID
```

### 方式 B：修改已安装的 Agent

```bash
# 编辑 systemd 服务
sudo systemctl edit --full vps-agent

# 在 [Service] 部分添加或修改
Environment="INTERVAL=30000"

# 保存退出后重启
sudo systemctl restart vps-agent
```

### 写入次数计算

```
每天写入次数 = VPS数量 × (86400 ÷ 上报间隔秒数)

示例：
✅ 1 台 × 30秒间隔 = 2,880 次/天（免费）
✅ 3 台 × 30秒间隔 = 8,640 次/天（免费）
⚠️ 10 台 × 30秒间隔 = 28,800 次/天（超额 $0.014/天）
```

## 🎨 查看 KV 存储数据

### 方法 1：通过浏览器（推荐）

1. 进入 Cloudflare Dashboard
2. **Workers & Pages** → **KV**
3. 点击 `VPS_KV` 命名空间
4. 可以看到所有存储的 key-value 对
5. 点击任意 key 查看详细数据

### 方法 2：查看关键数据

**节点列表**：
- Key: `vps:nodes:list`
- 点击后可以看到所有节点 ID 的 JSON 数组

**单个节点数据**：
- Key: `vps:node:你的节点ID`（如 `vps:node:hk-vps-01`）
- 包含 CPU、内存、网络等实时数据

## 🔄 更新部署

### 自动部署（推荐）

1. 在你的 Fork 仓库中修改代码
2. Commit 并 Push 到 `main` 分支
3. Cloudflare Pages 会自动检测并重新部署
4. 部署历史可在 **Deployments** 标签查看

### 手动触发部署

1. 进入 Pages 项目
2. **Deployments** 标签
3. 点击右侧 **Create deployment**
4. 选择分支，点击 **Save and Deploy**

## 🌐 自定义域名

1. 在 Pages 项目中，点击 **Custom domains** 标签
2. 点击 **Set up a custom domain**
3. 输入你的域名（如 `vps.example.com`）
4. 如果域名在 Cloudflare 管理：
   - 自动添加 CNAME 记录
   - 自动签发 SSL 证书
5. 如果域名不在 Cloudflare：
   - 按提示添加 CNAME 记录：`vps.example.com` → `avpsmonitor-xxx.pages.dev`
   - 等待 DNS 生效和 SSL 签发（约 5-10 分钟）

## ❓ 常见问题

### Q1: 为什么要叫 `VPS_KV` 这个名字？

**A**: 代码中硬编码了这个变量名：

```typescript
const kv = env.VPS_KV;  // 必须是 VPS_KV
```

如果你想用其他名字，需要修改 `functions/api/report.ts` 和 `functions/api/nodes.ts` 中的代码。

### Q2: 可以创建多个 KV 命名空间吗？

**A**: 可以，但没必要。一个命名空间可以存储所有 VPS 数据。如果要隔离环境（如测试/生产），可以：
- 创建两个命名空间：`VPS_KV_TEST` 和 `VPS_KV_PROD`
- 在不同的 Pages 项目中绑定不同的命名空间

### Q3: KV 绑定后多久生效？

**A**: 
- 新部署：立即生效
- 修改绑定：需要重新部署后生效

### Q4: 如何删除 KV 中的旧数据？

**A**: 
1. 进入 **Workers & Pages** → **KV** → `VPS_KV`
2. 找到要删除的 key
3. 点击右侧 **Delete** 按钮

或者删除整个命名空间重新创建（会清空所有数据）。

### Q5: 前端显示数据但一会儿就消失了？

**A**: 节点数据 TTL 为 20 秒，如果 Agent 停止上报，数据会自动过期。检查：
```bash
# 查看 Agent 状态
systemctl status vps-agent

# 查看 Agent 日志
journalctl -u vps-agent -n 50
```

## 🆘 需要帮助？

1. 查看 [主 README](./README.md)
2. 查看 [KV 详细配置](./CLOUDFLARE_KV_SETUP.md)
3. 提交 [GitHub Issue](https://github.com/Zbun/avpsmonitor/issues)

---

**恭喜！🎉** 你已经完成了 Cloudflare Pages 部署，无需任何命令行工具！


