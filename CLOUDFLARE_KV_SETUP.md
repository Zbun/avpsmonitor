# Cloudflare Workers KV 快速配置指南

本指南帮助你快速完成 Workers KV 的配置和绑定。

## 🎯 快速开始（3 步完成）

### 1️⃣ 创建 KV 命名空间

```bash
# 确保已安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 KV 命名空间
wrangler kv:namespace create "VPS_KV"
```

**命令会输出类似内容**（记录下来）：

```
✨ Success! Created KV namespace VPS_KV
Add the following to your wrangler.toml:
id = "abc123def456789..."
```

### 2️⃣ 更新 wrangler.toml（如果使用 CLI 部署）

打开 `wrangler.toml`，找到：

```toml
[[kv_namespaces]]
binding = "VPS_KV"
id = "YOUR_KV_NAMESPACE_ID"        # 替换这里
preview_id = "YOUR_PREVIEW_KV_ID"   # 可选，开发环境用
```

将 `id` 替换为第 1 步返回的 ID。

### 3️⃣ 在 Cloudflare Pages 绑定 KV

如果通过 Dashboard 部署：

1. 进入 Cloudflare Dashboard → 你的 Pages 项目
2. **Settings** → **Functions**
3. 找到 **KV namespace bindings** 部分
4. 点击 **Add binding**：
   - **Variable name**: `VPS_KV`
   - **KV namespace**: 选择你创建的命名空间
5. 点击 **Save**
6. 返回 **Deployments**，重新部署

## ✅ 验证配置

部署完成后，访问：

```
https://your-project.pages.dev/api/nodes
```

**正常响应**（KV 为空时）：
```json
{
  "nodes": [],
  "timestamp": 1234567890,
  "count": 0,
  "kvAvailable": true,
  "refreshInterval": 2000
}
```

**配置错误响应**：
```json
{
  "nodes": [],
  "kvAvailable": false,
  "message": "Workers KV not configured..."
}
```

## 📊 查看 KV 数据

### 方式一：通过 Dashboard

1. 进入 **Workers & Pages** → **KV**
2. 选择 `VPS_KV` 命名空间
3. 可以查看所有 key-value 对

### 方式二：通过 Wrangler CLI

```bash
# 列出所有 keys
wrangler kv:key list --namespace-id=你的命名空间ID

# 查看特定 key 的值
wrangler kv:key get "vps:node:your-node-id" --namespace-id=你的命名空间ID

# 查看节点列表
wrangler kv:key get "vps:nodes:list" --namespace-id=你的命名空间ID
```

## 🔧 常用 KV 管理命令

```bash
# 手动添加测试数据
wrangler kv:key put "test-key" "test-value" --namespace-id=你的命名空间ID

# 删除某个 key
wrangler kv:key delete "test-key" --namespace-id=你的命名空间ID

# 清空命名空间（谨慎使用）
wrangler kv:key list --namespace-id=你的命名空间ID | \
  jq -r '.[].name' | \
  xargs -I {} wrangler kv:key delete "{}" --namespace-id=你的命名空间ID
```

## 🎨 KV 数据结构

本项目在 KV 中存储的数据：

| Key 格式 | 说明 | 过期时间 | 示例 |
|---------|------|---------|------|
| `vps:node:{nodeId}` | 节点实时数据 | 20 秒 | `vps:node:hk-01` |
| `vps:nodes:list` | 所有节点 ID 列表 | 1 年 | JSON 数组 |
| `vps:traffic:{nodeId}` | 流量基准数据 | 45 天 | `vps:traffic:hk-01` |
| `vps:geo:{ip}` | IP 地理位置缓存 | 24 小时 | `vps:geo:1.2.3.4` |

### 示例数据

**节点数据** (`vps:node:hk-01`):
```json
{
  "id": "hk-01",
  "name": "Hong Kong VPS",
  "location": "Hong Kong",
  "countryCode": "HK",
  "status": "online",
  "cpu": {"usage": 15.5, "cores": 2},
  "memory": {"usage": 45.2, "total": 2147483648},
  "network": {
    "monthlyUsed": 5368709120,
    "monthlyTotal": 1099511627776
  },
  "lastUpdate": 1704067200000
}
```

**节点列表** (`vps:nodes:list`):
```json
["hk-01", "jp-01", "us-01"]
```

## ⚠️ 注意事项

### 1. KV 写入限制

Workers KV 免费额度：
- **读取**: 100,000 次/天 ✅ 足够
- **写入**: 1,000 次/天 ⚠️ 需注意

**计算写入次数**（假设 N 台 VPS）：

```
每台每天写入次数 = 86400 秒 / 上报间隔秒数
总写入次数 = N × 每台每天写入次数

示例：
- 10 台 VPS，4 秒间隔 = 10 × 21,600 = 216,000 次/天（超额）
- 10 台 VPS，10 秒间隔 = 10 × 8,640 = 86,400 次/天（超额）
- 5 台 VPS，10 秒间隔 = 5 × 8,640 = 43,200 次/天（超额）
- 3 台 VPS，10 秒间隔 = 3 × 8,640 = 25,920 次/天（超额）
- 1 台 VPS，10 秒间隔 = 1 × 8,640 = 8,640 次/天 ✅
```

**解决方案**：

**方案 A：调整上报间隔**（推荐小规模）
```bash
# 在 Agent 安装时设置 INTERVAL 环境变量
SERVER_URL=https://xxx.pages.dev \
API_TOKEN=xxx \
NODE_ID=node-1 \
INTERVAL=30000 \  # 30 秒上报一次
/opt/vps-agent/agent.sh
```

**方案 B：升级付费计划**
- Workers Paid ($5/月)：1,000,000 次写入/天
- 超额费用：$0.50 / 百万次

**方案 C：改用 Upstash Redis**
- 免费额度：10,000 次命令/天（更适合多台 VPS）
- 参考原文档中的 Upstash 配置

### 2. KV 最终一致性

Workers KV 是最终一致性存储（eventual consistency）：
- 写入后可能需要 **最多 60 秒** 才能全球同步
- 对于本项目影响：节点状态更新可能有延迟
- **不影响使用**：Agent 每 4-10 秒持续上报，延迟可接受

### 3. KV 操作限制

- **Value 大小限制**: 25 MB（单个节点数据远小于此）
- **Key 长度限制**: 512 字节
- **列出操作**: 每次最多 1000 个 key

## 🆘 故障排查

### 问题 1: "Workers KV not configured"

**原因**：KV 绑定未生效

**解决**：
1. 检查 Dashboard → Settings → Functions → KV namespace bindings
2. 确认绑定名称是 `VPS_KV`（大小写敏感）
3. 重新部署项目

### 问题 2: Agent 上报成功但前端无数据

**可能原因**：
1. KV 写入未同步（等待 60 秒）
2. 节点数据已过期（20 秒无上报自动清除）

**检查方法**：
```bash
# 查看节点列表
wrangler kv:key get "vps:nodes:list" --namespace-id=你的ID

# 查看节点数据
wrangler kv:key get "vps:node:你的节点ID" --namespace-id=你的ID
```

### 问题 3: 超出写入限额

**症状**：Agent 报错 "Report failed: 429"

**解决**：
1. 调大 Agent 上报间隔（`INTERVAL=30000`）
2. 或升级 Workers 付费计划

## 📚 相关文档

- [Workers KV 官方文档](https://developers.cloudflare.com/kv/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)

---

配置完成后，返回 [主部署文档](./CLOUDFLARE_DEPLOY.md) 继续后续步骤。


