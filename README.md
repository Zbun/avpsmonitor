# VPS Monitor / VPS 监控面板

A frontend VPS monitoring dashboard for tracking server performance and network quality, deployable on Vercel.

一个前端VPS监控面板，用于监控服务器性能和网络质量，可部署到Vercel。

## Features / 功能

- **Node Information / 节点信息**: Node name, location (country flag), uptime, protocol type
- **System Resources / 系统资源**: CPU usage, memory, disk with progress bars
- **Network Metrics / 网络指标**: Monthly traffic, real-time upload/download speed, total traffic
- **ISP Connection Quality / 运营商连接质量**: China Unicom, China Mobile, China Telecom latency testing

## Screenshots / 截图

The dashboard displays:
- Node status with country flag emoji
- CPU, Memory, Disk usage with color-coded progress bars
- Real-time network speed indicators
- ISP connection quality with latency measurements

## Getting Started / 开始使用

### Development / 开发

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build / 构建

```bash
npm run build
```

### Deploy on Vercel / 部署到Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Zbun/avpsmonitor)

## Backend Integration / 后端集成

Currently the dashboard uses mock data for demonstration. To integrate with a real backend:

1. Create an API endpoint that returns `VPSStatus` data format (see `src/app/types/index.ts`)
2. Replace the `getMockData()` function in `src/app/page.tsx` with an API call

### Data Format / 数据格式

```typescript
interface VPSStatus {
  node: {
    id: string;
    name: string;
    location: string;
    countryCode: string; // ISO 3166-1 alpha-2 (e.g., 'JP', 'US', 'CN')
    uptime: number; // seconds
    protocol: string;
    online: boolean;
  };
  resources: {
    cpu: { usage: number; cores: number; model: string };
    memory: { used: number; total: number; percentage: number };
    disk: { used: number; total: number; percentage: number };
    load: number[]; // [1min, 5min, 15min]
  };
  network: {
    monthlyTraffic: { used: number; total: number };
    totalTraffic: { upload: number; download: number };
    currentSpeed: { upload: number; download: number };
  };
  ispLatency: Array<{
    name: string;
    code: string;
    latency: number | null;
    status: 'good' | 'warning' | 'poor' | 'offline';
  }>;
  timestamp: number;
}
```

## Tech Stack / 技术栈

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## License / 许可证

MIT
