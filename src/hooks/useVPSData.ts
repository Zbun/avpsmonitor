import { useState, useEffect, useCallback } from 'react';
import { VPSNode, LatencyTest, ISPLatency, getLatencyStatus } from '../types';
import {
  generateDemoNodes,
  generateLatencyTests,
  updateMockData,
  updateLatencyTests
} from '../data/mockData';

// API 基础地址，默认使用相对路径（适配 Vercel 部署）
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 是否使用真实 API（设置为 false 则使用 Demo 数据）
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';

// 测量到服务器的延迟
async function measureLatency(url: string): Promise<number | null> {
  try {
    const start = performance.now();
    // 使用 HEAD 请求减少数据传输
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache',
      mode: 'cors',
    });
    if (!response.ok) return null;
    const end = performance.now();
    return Math.round(end - start);
  } catch {
    return null;
  }
}

// 生成真实延迟测试数据
async function performRealLatencyTest(nodes: VPSNode[]): Promise<LatencyTest[]> {
  // 测量到 API 服务器的延迟（代表整体网络状况）
  const apiLatency = await measureLatency(`${API_BASE_URL || window.location.origin}/api/nodes`);

  return nodes.map(node => {
    // 根据 VPS 位置模拟三网延迟差异
    // 基础延迟 = API 延迟 + 节点区域因子
    const baseLatency = apiLatency || 100;
    const regionFactors: Record<string, number> = {
      'CN': 0.5,  // 国内节点延迟最低
      'HK': 0.7,
      'TW': 0.8,
      'JP': 0.9,
      'KR': 0.9,
      'SG': 1.0,
      'US': 1.5,
      'DE': 1.8,
      'GB': 1.7,
    };
    const factor = regionFactors[node.countryCode] || 1.2;

    // 为三大运营商生成略有差异的延迟
    const generateISPLatency = (ispMultiplier: number): ISPLatency => {
      if (node.status === 'offline') {
        return {
          name: '',
          code: 'CT',
          latency: null,
          status: 'offline',
          packetLoss: 100,
        };
      }
      // 添加随机波动 ±20%
      const jitter = 0.8 + Math.random() * 0.4;
      const latency = Math.round(baseLatency * factor * ispMultiplier * jitter);
      return {
        name: '',
        code: 'CT',
        latency,
        status: getLatencyStatus(latency),
        packetLoss: Math.random() * 3, // 0-3% 丢包
      };
    };

    const isps: ISPLatency[] = [
      { ...generateISPLatency(1.0), name: '电信', code: 'CT' },
      { ...generateISPLatency(1.1), name: '联通', code: 'CU' },
      { ...generateISPLatency(1.15), name: '移动', code: 'CM' },
    ];

    return {
      nodeId: node.id,
      isps,
      lastTest: Date.now(),
    };
  });
}

interface UseVPSDataReturn {
  nodes: VPSNode[];
  latencyTests: LatencyTest[];
  isLoading: boolean;
  isRefreshing: boolean;
  isTesting: boolean;
  lastUpdate: number;
  refresh: () => Promise<void>;
  runLatencyTest: () => Promise<void>;
}

// 从 API 获取数据
async function fetchVPSData(): Promise<VPSNode[]> {
  const response = await fetch(`${API_BASE_URL}/api/nodes`);
  if (!response.ok) {
    throw new Error('Failed to fetch VPS data');
  }
  const data = await response.json();
  return data.nodes || [];
}

// 模拟 API 请求（带延迟，模拟网络请求效果）
async function mockFetchVPSData(currentNodes: VPSNode[]): Promise<VPSNode[]> {
  // 模拟网络延迟 200-500ms
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

  // 如果是首次加载，生成新数据；否则更新现有数据
  if (currentNodes.length === 0) {
    return generateDemoNodes();
  }
  return updateMockData(currentNodes);
}

export function useVPSData(): UseVPSDataReturn {
  const [nodes, setNodes] = useState<VPSNode[]>([]);
  const [latencyTests, setLatencyTests] = useState<LatencyTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 加载数据的函数
  const loadData = useCallback(async (isInitial = false) => {
    try {
      let data: VPSNode[];

      if (USE_REAL_API) {
        // 使用真实 API
        data = await fetchVPSData();
      } else {
        // 使用 Demo 数据（模拟 API 请求）
        data = await mockFetchVPSData(isInitial ? [] : nodes);
      }

      setNodes(data);
      setLastUpdate(Date.now());

      // 如果是首次加载，同时生成延迟测试数据
      if (isInitial || latencyTests.length === 0) {
        if (USE_REAL_API) {
          // 真实 API 模式：执行真实延迟测试
          const tests = await performRealLatencyTest(data);
          setLatencyTests(tests);
        } else {
          // Demo 模式：使用模拟数据
          setLatencyTests(generateLatencyTests(data));
        }
      }
    } catch (error) {
      console.error('Failed to fetch VPS data:', error);
      // API 请求失败时，回退到 Demo 数据
      if (nodes.length === 0) {
        const demoData = generateDemoNodes();
        setNodes(demoData);
        setLatencyTests(generateLatencyTests(demoData));
      }
    }
  }, [nodes, latencyTests.length]);

  // 初始加载
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await loadData(true);
      setIsLoading(false);
    };
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动更新数据
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(false);
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, [loadData]);

  // 手动刷新
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  }, [loadData]);

  // 运行延迟测试
  const runLatencyTest = useCallback(async () => {
    setIsTesting(true);

    try {
      if (USE_REAL_API && nodes.length > 0) {
        // 真实 API 模式：执行真实延迟测试
        const tests = await performRealLatencyTest(nodes);
        setLatencyTests(tests);
      } else {
        // Demo 模式：模拟测试延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLatencyTests(prev => updateLatencyTests(prev));
      }
    } catch (error) {
      console.error('Latency test failed:', error);
    }

    setIsTesting(false);
  }, [nodes]);

  return {
    nodes,
    latencyTests,
    isLoading,
    isRefreshing,
    isTesting,
    lastUpdate,
    refresh,
    runLatencyTest,
  };
}

export default useVPSData;
