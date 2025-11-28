import { VPSNode, LatencyTest } from '../types';

// 模拟 VPS 节点数据 - 实际使用时应从后端 API 获取
export const mockVPSNodes: VPSNode[] = [
  {
    id: 'node-1',
    name: '香港 CN2 GIA',
    location: '香港',
    countryCode: 'HK',
    ipAddress: '103.xxx.xxx.1',
    protocol: 'HTTPS',
    status: 'online',
    os: 'Ubuntu 22.04 LTS',
    uptime: 2592000, // 30天
    load: [0.15, 0.22, 0.18],
    expireDate: '2025-06-15',
    cpu: {
      cores: 2,
      usage: 15.5,
      model: 'Intel Xeon E5-2680 v4',
    },
    memory: {
      total: 2147483648, // 2GB
      used: 1073741824,  // 1GB
      usage: 50,
    },
    disk: {
      total: 42949672960, // 40GB
      used: 17179869184,  // 16GB
      usage: 40,
    },
    network: {
      monthlyTotal: 1099511627776, // 1TB
      monthlyUsed: 549755813888,   // 512GB
      totalUpload: 214748364800,   // 200GB
      totalDownload: 335007449088, // 312GB
      currentUpload: 1048576,      // 1MB/s
      currentDownload: 5242880,    // 5MB/s
      resetDay: 1,                 // 每月1号重置
    },
    lastUpdate: Date.now(),
  },
  {
    id: 'node-2',
    name: '日本 东京',
    location: '东京',
    countryCode: 'JP',
    ipAddress: '45.xxx.xxx.2',
    protocol: 'HTTPS',
    status: 'online',
    os: 'Debian 12',
    uptime: 864000, // 10天
    load: [0.45, 0.52, 0.48],
    expireDate: '2025-03-20',
    cpu: {
      cores: 4,
      usage: 42.3,
      model: 'AMD EPYC 7542',
    },
    memory: {
      total: 4294967296, // 4GB
      used: 2576980378,  // 2.4GB
      usage: 60,
    },
    disk: {
      total: 85899345920, // 80GB
      used: 42949672960,  // 40GB
      usage: 50,
    },
    network: {
      monthlyTotal: 2199023255552, // 2TB
      monthlyUsed: 879609302221,   // 0.8TB
      totalUpload: 322122547200,   // 300GB
      totalDownload: 557486755021, // 519GB
      currentUpload: 524288,       // 512KB/s
      currentDownload: 2097152,    // 2MB/s
      resetDay: 15,                // 每月15号重置
    },
    lastUpdate: Date.now(),
  },
  {
    id: 'node-3',
    name: '美国 洛杉矶',
    location: '洛杉矶',
    countryCode: 'US',
    ipAddress: '23.xxx.xxx.3',
    protocol: 'WebSocket',
    status: 'online',
    os: 'CentOS 7',
    uptime: 5184000, // 60天
    load: [0.08, 0.12, 0.10],
    expireDate: '2026-01-01',
    cpu: {
      cores: 1,
      usage: 8.2,
      model: 'Intel Xeon E3-1230',
    },
    memory: {
      total: 1073741824, // 1GB
      used: 644245094,   // 614MB
      usage: 60,
    },
    disk: {
      total: 21474836480, // 20GB
      used: 8589934592,   // 8GB
      usage: 40,
    },
    network: {
      monthlyTotal: 549755813888,  // 512GB
      monthlyUsed: 219902325555,   // 205GB
      totalUpload: 85899345920,    // 80GB
      totalDownload: 134002979635, // 125GB
      currentUpload: 262144,       // 256KB/s
      currentDownload: 1048576,    // 1MB/s
      resetDay: 8,                 // 每月8号重置
    },
    lastUpdate: Date.now(),
  },
  {
    id: 'node-4',
    name: '新加坡',
    location: '新加坡',
    countryCode: 'SG',
    ipAddress: '103.xxx.xxx.4',
    protocol: 'HTTPS',
    status: 'warning',
    os: 'Ubuntu 20.04 LTS',
    uptime: 172800, // 2天
    load: [1.85, 1.92, 1.78],
    expireDate: '2024-12-15',
    cpu: {
      cores: 2,
      usage: 85.7,
      model: 'Intel Xeon Gold 6248R',
    },
    memory: {
      total: 2147483648, // 2GB
      used: 1932735283,  // 1.8GB
      usage: 90,
    },
    disk: {
      total: 42949672960, // 40GB
      used: 38654705664,  // 36GB
      usage: 90,
    },
    network: {
      monthlyTotal: 1099511627776, // 1TB
      monthlyUsed: 989560464998,   // 0.9TB
      totalUpload: 429496729600,   // 400GB
      totalDownload: 560063735398, // 521GB
      currentUpload: 3145728,      // 3MB/s
      currentDownload: 8388608,    // 8MB/s
      resetDay: 20,                // 每月20号重置
    },
    lastUpdate: Date.now(),
  },
  {
    id: 'node-5',
    name: '德国 法兰克福',
    location: '法兰克福',
    countryCode: 'DE',
    ipAddress: '185.xxx.xxx.5',
    protocol: 'SSH',
    status: 'offline',
    os: 'Debian 11',
    uptime: 0,
    load: [0, 0, 0],
    expireDate: '2025-08-30',
    cpu: {
      cores: 2,
      usage: 0,
      model: 'Intel Xeon E5-2660',
    },
    memory: {
      total: 4294967296, // 4GB
      used: 0,
      usage: 0,
    },
    disk: {
      total: 64424509440, // 60GB
      used: 21474836480,  // 20GB
      usage: 33.3,
    },
    network: {
      monthlyTotal: 2199023255552, // 2TB
      monthlyUsed: 659706976666,   // 0.6TB
      totalUpload: 214748364800,   // 200GB
      totalDownload: 444958611866, // 414GB
      currentUpload: 0,
      currentDownload: 0,
      resetDay: 1,                 // 每月1号重置
    },
    lastUpdate: Date.now() - 3600000, // 1小时前
  },
  {
    id: 'node-6',
    name: '韩国 首尔',
    location: '首尔',
    countryCode: 'KR',
    ipAddress: '121.xxx.xxx.6',
    protocol: 'TCP',
    status: 'online',
    os: 'Rocky Linux 9',
    uptime: 1296000, // 15天
    load: [0.32, 0.28, 0.35],
    cpu: {
      cores: 4,
      usage: 28.5,
      model: 'AMD Ryzen 9 5950X',
    },
    memory: {
      total: 8589934592, // 8GB
      used: 4294967296,  // 4GB
      usage: 50,
    },
    disk: {
      total: 107374182400, // 100GB
      used: 53687091200,   // 50GB
      usage: 50,
    },
    network: {
      monthlyTotal: 5497558138880, // 5TB
      monthlyUsed: 1649267441664,  // 1.5TB
      totalUpload: 644245094400,   // 600GB
      totalDownload: 1005022347264,// 936GB
      currentUpload: 2097152,      // 2MB/s
      currentDownload: 10485760,   // 10MB/s
      resetDay: 25,                // 每月25号重置
    },
    lastUpdate: Date.now(),
  },
];

// 模拟延迟测试数据
export const mockLatencyTests: LatencyTest[] = mockVPSNodes.map(node => ({
  nodeId: node.id,
  isps: [
    {
      name: '电信',
      code: 'CT',
      latency: node.status === 'offline' ? null : Math.floor(Math.random() * 100) + 20,
      status: node.status === 'offline' ? 'offline' :
        Math.random() > 0.7 ? 'good' : Math.random() > 0.4 ? 'medium' : 'poor',
      packetLoss: node.status === 'offline' ? 100 : Math.random() * 5,
    },
    {
      name: '联通',
      code: 'CU',
      latency: node.status === 'offline' ? null : Math.floor(Math.random() * 120) + 30,
      status: node.status === 'offline' ? 'offline' :
        Math.random() > 0.6 ? 'good' : Math.random() > 0.3 ? 'medium' : 'poor',
      packetLoss: node.status === 'offline' ? 100 : Math.random() * 8,
    },
    {
      name: '移动',
      code: 'CM',
      latency: node.status === 'offline' ? null : Math.floor(Math.random() * 150) + 40,
      status: node.status === 'offline' ? 'offline' :
        Math.random() > 0.5 ? 'good' : Math.random() > 0.3 ? 'medium' : 'poor',
      packetLoss: node.status === 'offline' ? 100 : Math.random() * 10,
    },
  ],
  lastTest: Date.now(),
}));

// 模拟数据更新函数 - 模拟实时数据变化
export function updateMockData(nodes: VPSNode[]): VPSNode[] {
  return nodes.map(node => {
    if (node.status === 'offline') return node;

    // 随机波动各项数据
    const cpuChange = (Math.random() - 0.5) * 10;
    const memChange = (Math.random() - 0.5) * 5;
    const uploadChange = (Math.random() - 0.5) * 1048576;
    const downloadChange = (Math.random() - 0.5) * 2097152;

    return {
      ...node,
      uptime: node.uptime + 5, // 增加5秒
      load: [
        Math.max(0, node.load[0] + (Math.random() - 0.5) * 0.1),
        Math.max(0, node.load[1] + (Math.random() - 0.5) * 0.05),
        Math.max(0, node.load[2] + (Math.random() - 0.5) * 0.02),
      ] as [number, number, number],
      cpu: {
        ...node.cpu,
        usage: Math.max(0, Math.min(100, node.cpu.usage + cpuChange)),
      },
      memory: {
        ...node.memory,
        usage: Math.max(0, Math.min(100, node.memory.usage + memChange)),
        used: Math.max(0, Math.min(node.memory.total,
          node.memory.total * (Math.max(0, Math.min(100, node.memory.usage + memChange)) / 100))),
      },
      network: {
        ...node.network,
        currentUpload: Math.max(0, node.network.currentUpload + uploadChange),
        currentDownload: Math.max(0, node.network.currentDownload + downloadChange),
        monthlyUsed: node.network.monthlyUsed + Math.abs(uploadChange) + Math.abs(downloadChange),
        totalUpload: node.network.totalUpload + Math.abs(uploadChange),
        totalDownload: node.network.totalDownload + Math.abs(downloadChange),
      },
      lastUpdate: Date.now(),
    };
  });
}

// 更新延迟测试数据
export function updateLatencyTests(tests: LatencyTest[]): LatencyTest[] {
  return tests.map(test => ({
    ...test,
    isps: test.isps.map(isp => {
      if (isp.status === 'offline') return isp;

      const latencyChange = (Math.random() - 0.5) * 20;
      const newLatency = Math.max(10, (isp.latency || 50) + latencyChange);

      return {
        ...isp,
        latency: Math.round(newLatency),
        status: newLatency < 50 ? 'good' : newLatency < 150 ? 'medium' : 'poor',
        packetLoss: Math.max(0, Math.min(100, isp.packetLoss + (Math.random() - 0.5) * 2)),
      };
    }),
    lastTest: Date.now(),
  }));
}
