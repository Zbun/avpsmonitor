# VPS Monitor - 服务器监控探针

一个基于纯前端技术实现的 VPS 监控探针系统，可以轻松部署到 Vercel、Netlify、GitHub Pages 等静态托管平台。

![VPS Monitor](https://img.shields.io/badge/VPS-Monitor-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)

## ✨ 功能特性

### 服务器监控
- 🖥️ **节点名称** - 自定义服务器名称
- 🌍 **位置显示** - 国旗 emoji 直观展示服务器所在地
- ⏱️ **开机时间** - 显示服务器运行时长
- 🔌 **协议类型** - 支持 TCP/UDP/HTTP/HTTPS/WebSocket/SSH 等
- 📊 **系统负载** - 1/5/15 分钟负载监控

### 资源监控
- 💻 **CPU 使用率** - 实时处理器占用情况
- 🧠 **内存使用** - 内存使用量及百分比
- 💾 **硬盘使用** - 磁盘空间使用情况

### 网络流量
- 📈 **实时速度** - 当前上传/下载速度
- 📅 **月流量** - 月度流量使用统计
- 📊 **总流量** - 累计上传/下载流量

### 网络质量
- 📶 **三网延迟** - 电信/联通/移动延迟测试
- 📉 **丢包率** - 网络丢包情况监控
- 🎯 **连接质量** - 优秀/良好/较差状态指示

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000 查看效果。

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录中。

## 📦 部署

### Vercel 部署

1. Fork 或 clone 本仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. 自动检测为 Vite 项目并部署
4. 完成！

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/avpsmonitor)

### Netlify 部署

1. Fork 或 clone 本仓库
2. 在 [Netlify](https://netlify.com) 导入项目
3. 构建命令: `npm run build`
4. 发布目录: `dist`
5. 完成！

### GitHub Pages 部署

1. 修改 `vite.config.ts` 添加 base 配置：
   ```ts
   export default defineConfig({
     base: '/your-repo-name/',
     // ...
   })
   ```
2. 运行 `npm run build`
3. 将 `dist` 目录内容推送到 `gh-pages` 分支

## ⚙️ 配置说明

### 节点配置

编辑 `src/data/mockData.ts` 文件配置你的 VPS 节点信息：

```typescript
export const mockVPSNodes: VPSNode[] = [
  {
    id: 'node-1',
    name: '香港 CN2 GIA',
    location: '香港',
    countryCode: 'HK',  // ISO 3166-1 alpha-2 国家代码
    ipAddress: '103.xxx.xxx.1',
    protocol: 'HTTPS',
    status: 'online',
    // ... 更多配置
  },
];
```

### 支持的国家代码

| 代码 | 国家/地区 | 国旗 |
|------|-----------|------|
| CN | 中国 | 🇨🇳 |
| US | 美国 | 🇺🇸 |
| JP | 日本 | 🇯🇵 |
| KR | 韩国 | 🇰🇷 |
| SG | 新加坡 | 🇸🇬 |
| HK | 香港 | 🇭🇰 |
| TW | 台湾 | 🇹🇼 |
| DE | 德国 | 🇩🇪 |
| GB | 英国 | 🇬🇧 |
| ... | ... | ... |

## 🔧 接入真实数据

本项目支持一键部署到 Vercel，无需独立后端服务。VPS 上运行 Agent 直接上报数据到 Vercel。

### 架构说明

```
┌─────────┐      ┌─────────────────────────┐
│   VPS   │ ───► │   Vercel                │
│  Agent  │      │  ┌──────────┐ ┌───────┐ │
└─────────┘      │  │ API 函数 │ │ React │ │
                 │  │ (KV存储) │ │ 前端  │ │
                 │  └──────────┘ └───────┘ │
                 └─────────────────────────┘
```

### 1. 部署到 Vercel

1. Fork 或 clone 本仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. **配置 Vercel KV 存储**：
   - 在 Vercel Dashboard → Storage → Create Database → KV
   - 连接到你的项目
4. **配置环境变量**：
   - `API_TOKEN`: 设置一个安全的 Token（Agent 上报时需要）
   - `VITE_USE_REAL_API`: 设置为 `true`
5. 部署完成！

### 2. 在 VPS 上安装 Agent

一键安装（替换为你的实际地址和 Token）：

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/avpsmonitor/main/agent/install.sh | bash -s -- \
  https://your-app.vercel.app \
  your-api-token \
  node-1 \
  "香港CN2" \
  HK \
  "Hong Kong"
```

参数说明：
- `SERVER_URL` - 你的 Vercel 部署地址
- `API_TOKEN` - 与 Vercel 环境变量中配置的一致
- `NODE_ID` - 节点唯一 ID
- `NODE_NAME` - 显示名称
- `COUNTRY_CODE` - 国家代码（显示国旗）
- `LOCATION` - 位置描述

详细说明见 [agent/README.md](./agent/README.md)

### 目录结构

```
avpsmonitor/
├── api/                 # Vercel Serverless 函数
│   ├── nodes.ts         # 获取节点数据
│   └── report.ts        # 接收 Agent 上报
├── agent/               # VPS Agent
│   ├── agent.js         # Agent 脚本（零依赖）
│   └── install.sh       # 一键安装脚本
└── src/                 # 前端代码
```

## 🛠️ 技术栈

- **React 18** - UI 框架
- **TypeScript 5** - 类型安全
- **Vite 5** - 构建工具
- **Tailwind CSS 3** - 样式框架
- **Lucide React** - 图标库
- **Vercel KV** - 数据存储
- **Vercel Serverless** - API 函数

## 📁 项目结构

```
avpsmonitor/
├── public/              # 静态资源
├── api/                 # Vercel Serverless 函数
│   ├── nodes.ts         # 获取节点数据 API
│   └── report.ts        # Agent 上报 API
├── agent/               # VPS Agent
│   ├── agent.js         # 监控脚本
│   └── install.sh       # 一键安装
├── src/
│   ├── components/      # React 组件
│   ├── data/           # Mock 数据
│   ├── hooks/          # 自定义 Hooks
│   ├── types/          # TypeScript 类型
│   ├── App.tsx         # 主应用
│   └── main.tsx        # 入口
├── vercel.json          # Vercel 配置
└── package.json
```

## 📝 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️
