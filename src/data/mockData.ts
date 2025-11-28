import { VPSNode, LatencyTest } from '../types';

/**
 * Demo 数据生成器
 * 用于在没有真实后端时展示 UI 效果
 * 模拟不同地区的 VPS 节点数据
 */

// Demo 节点配置（简化版，用于演示）
const demoNodesConfig = [
  { id: 'demo-hk', name: '香港 BGP', location: 'Hong Kong', countryCode: 'HK', protocol: 'KVM' },
  { id: 'demo-jp', name: '东京 Lite', location: 'Tokyo', countryCode: 'JP', protocol: 'KVM' },
  { id: 'demo-us', name: '洛杉矶 CN2', location: 'Los Angeles', countryCode: 'US', protocol: 'OpenVZ' },
  { id: 'demo-sg', name: '新加坡', location: 'Singapore', countryCode: 'SG', protocol: 'KVM' },
];

// 生成随机数
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));

// 生成单个 Demo 节点数据
function generateDemoNode(config: typeof demoNodesConfig[0], index: number): VPSNode {
  const isOffline = index === 3 && Math.random() > 0.8; // 随机让一个节点离线
  const cpuCores = [1, 2, 2, 4][index];
  const memTotal = [1, 2, 4, 2][index] * 1024 * 1024 * 1024; // GB
  const diskTotal = [20, 40, 60, 40][index] * 1024 * 1024 * 1024; // GB
  const monthlyTotal = [500, 1000, 2000, 1000][index] * 1024 * 1024 * 1024; // GB

  const cpuUsage = isOffline ? 0 : rand(5, 80);
  const memUsage = isOffline ? 0 : rand(30, 85);
  const diskUsage = rand(20, 70);
  const monthlyUsedPercent = rand(10, 90);

  return {
    id: config.id,
    name: config.name,
    location: config.location,
    countryCode: config.countryCode,
    ipAddress: `${randInt(1, 255)}.${randInt(1, 255)}.xxx.${randInt(1, 255)}`,
    protocol: config.protocol,
    status: isOffline ? 'offline' : cpuUsage > 70 || memUsage > 80 ? 'warning' : 'online',
    os: ['Ubuntu 22.04', 'Debian 12', 'CentOS 7', 'Rocky Linux 9'][index],
    uptime: isOffline ? 0 : randInt(86400, 86400 * 60), // 1-60 天
    load: isOffline ? [0, 0, 0] : [rand(0.1, 2), rand(0.1, 2), rand(0.1, 2)] as [number, number, number],
    expireDate: `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    cpu: {
      cores: cpuCores,
      usage: cpuUsage,
      model: ['Intel Xeon', 'AMD EPYC', 'Intel Core', 'AMD Ryzen'][index],
    },
    memory: {
      total: memTotal,
      used: memTotal * memUsage / 100,
      usage: memUsage,
    },
    disk: {
      total: diskTotal,
      used: diskTotal * diskUsage / 100,
      usage: diskUsage,
    },
    network: {
      monthlyTotal: monthlyTotal,
      monthlyUsed: monthlyTotal * monthlyUsedPercent / 100,
      totalUpload: randInt(10, 500) * 1024 * 1024 * 1024,
      totalDownload: randInt(50, 800) * 1024 * 1024 * 1024,
      currentUpload: isOffline ? 0 : rand(0, 5) * 1024 * 1024, // 0-5 MB/s
      currentDownload: isOffline ? 0 : rand(0, 20) * 1024 * 1024, // 0-20 MB/s
      resetDay: [1, 15, 8, 20][index],
    },
    lastUpdate: Date.now(),
  };
}

// 生成 Demo 节点列表
export function generateDemoNodes(): VPSNode[] {
  return demoNodesConfig.map((config, index) => generateDemoNode(config, index));
}

// 导出初始 Demo 数据
export const mockVPSNodes: VPSNode[] = generateDemoNodes();

// 生成延迟测试数据
export function generateLatencyTests(nodes: VPSNode[]): LatencyTest[] {
  return nodes.map(node => ({
    nodeId: node.id,
    isps: [
      {
        name: '电信',
        code: 'CT' as const,
        latency: node.status === 'offline' ? null : randInt(20, 150),
        status: node.status === 'offline' ? 'offline' as const :
          Math.random() > 0.6 ? 'good' as const : Math.random() > 0.3 ? 'medium' as const : 'poor' as const,
        packetLoss: node.status === 'offline' ? 100 : rand(0, 5),
      },
      {
        name: '联通',
        code: 'CU' as const,
        latency: node.status === 'offline' ? null : randInt(30, 180),
        status: node.status === 'offline' ? 'offline' as const :
          Math.random() > 0.5 ? 'good' as const : Math.random() > 0.3 ? 'medium' as const : 'poor' as const,
        packetLoss: node.status === 'offline' ? 100 : rand(0, 8),
      },
      {
        name: '移动',
        code: 'CM' as const,
        latency: node.status === 'offline' ? null : randInt(40, 200),
        status: node.status === 'offline' ? 'offline' as const :
          Math.random() > 0.4 ? 'good' as const : Math.random() > 0.3 ? 'medium' as const : 'poor' as const,
        packetLoss: node.status === 'offline' ? 100 : rand(0, 10),
      },
    ],
    lastTest: Date.now(),
  }));
}

export const mockLatencyTests: LatencyTest[] = generateLatencyTests(mockVPSNodes);

// 模拟数据实时更新（小幅波动）
export function updateMockData(nodes: VPSNode[]): VPSNode[] {
  return nodes.map(node => {
    if (node.status === 'offline') return { ...node, lastUpdate: Date.now() };

    return {
      ...node,
      uptime: node.uptime + 5,
      load: [
        Math.max(0, node.load[0] + rand(-0.1, 0.1)),
        Math.max(0, node.load[1] + rand(-0.05, 0.05)),
        Math.max(0, node.load[2] + rand(-0.02, 0.02)),
      ] as [number, number, number],
      cpu: {
        ...node.cpu,
        usage: Math.max(0, Math.min(100, node.cpu.usage + rand(-5, 5))),
      },
      memory: {
        ...node.memory,
        usage: Math.max(0, Math.min(100, node.memory.usage + rand(-3, 3))),
        used: node.memory.total * Math.max(0, Math.min(100, node.memory.usage + rand(-3, 3))) / 100,
      },
      network: {
        ...node.network,
        currentUpload: Math.max(0, node.network.currentUpload + rand(-500000, 500000)),
        currentDownload: Math.max(0, node.network.currentDownload + rand(-1000000, 1000000)),
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
      const newLatency = Math.max(10, (isp.latency || 50) + randInt(-10, 10));
      return {
        ...isp,
        latency: newLatency,
        status: newLatency < 50 ? 'good' as const : newLatency < 150 ? 'medium' as const : 'poor' as const,
        packetLoss: Math.max(0, Math.min(100, isp.packetLoss + rand(-1, 1))),
      };
    }),
    lastTest: Date.now(),
  }));
}
