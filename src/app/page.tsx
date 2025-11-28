'use client';

import { useState, useEffect, useCallback } from 'react';
import { VPSStatus } from './types';
import NodeInfo from './components/NodeInfo';
import ResourceUsage from './components/ResourceUsage';
import NetworkStats from './components/NetworkStats';
import ISPConnection from './components/ISPConnection';

// Mock data for demonstration
const getMockData = (): VPSStatus => ({
  node: {
    id: 'node-1',
    name: 'Tokyo-JP-01',
    location: '东京, 日本',
    countryCode: 'JP',
    uptime: Math.floor(Date.now() / 1000) - 1703980800 + Math.random() * 100, // Random uptime
    protocol: 'WireGuard',
    online: true,
  },
  resources: {
    cpu: {
      usage: 15 + Math.random() * 30,
      cores: 4,
      model: 'Intel Xeon E5-2680 v4',
    },
    memory: {
      used: 1.5 * 1024 * 1024 * 1024 + Math.random() * 500 * 1024 * 1024,
      total: 4 * 1024 * 1024 * 1024,
      percentage: 37.5 + Math.random() * 10,
    },
    disk: {
      used: 25 * 1024 * 1024 * 1024,
      total: 80 * 1024 * 1024 * 1024,
      percentage: 31.25,
    },
    load: [0.35 + Math.random() * 0.5, 0.28 + Math.random() * 0.3, 0.22 + Math.random() * 0.2],
  },
  network: {
    monthlyTraffic: {
      used: 350 * 1024 * 1024 * 1024,
      total: 1000 * 1024 * 1024 * 1024,
    },
    totalTraffic: {
      upload: 1.2 * 1024 * 1024 * 1024 * 1024,
      download: 3.5 * 1024 * 1024 * 1024 * 1024,
    },
    currentSpeed: {
      upload: Math.random() * 10 * 1024 * 1024,
      download: Math.random() * 50 * 1024 * 1024,
    },
  },
  ispLatency: [
    {
      name: '中国联通',
      code: 'cu',
      latency: 35 + Math.floor(Math.random() * 20),
      status: 'good',
    },
    {
      name: '中国移动',
      code: 'cm',
      latency: 65 + Math.floor(Math.random() * 30),
      status: 'warning',
    },
    {
      name: '中国电信',
      code: 'ct',
      latency: 45 + Math.floor(Math.random() * 25),
      status: 'good',
    },
  ],
  timestamp: Date.now(),
});

export default function Home() {
  const [data, setData] = useState<VPSStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const refreshData = useCallback(() => {
    setData(getMockData());
    setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
  }, []);

  useEffect(() => {
    // Initial load using setTimeout to avoid lint warning
    const initialTimeout = setTimeout(refreshData, 0);
    // Refresh data every 3 seconds
    const interval = setInterval(refreshData, 3000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [refreshData]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">VPS 监控面板</h1>
          <div className="text-sm text-gray-400">
            最后更新: {lastUpdate}
          </div>
        </div>
        
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <NodeInfo node={data.node} />
          <ResourceUsage resources={data.resources} />
          <NetworkStats network={data.network} />
          <ISPConnection ispLatency={data.ispLatency} />
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>实时监控数据每 3 秒自动刷新</p>
        </div>
      </div>
    </div>
  );
}
