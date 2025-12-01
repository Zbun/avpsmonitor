import { useState, useEffect, useCallback, useRef } from 'react';
import { VPSNode, LatencyTest, ISPLatency, getLatencyStatus } from '../types';
import {
  generateDemoNodes,
  generateLatencyTests,
  updateLatencyTests
} from '../data/mockData';

// 默认刷新间隔（毫秒）
const DEFAULT_REFRESH_INTERVAL = 2000;

// API 响应类型
interface APIResponse {
  nodes: VPSNode[];
  refreshInterval?: number;
}

// 请求节流：防止并发请求
let isFetching = false;
let pendingFetch: Promise<APIResponse> | null = null;

// 测量到服务器的延迟
async function measureLatency(url: string): Promise<number | null> {
  try {
    const start = performance.now();
    const response = await fetch(url, {
      method: 'GET',
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

// 生成真实延迟测试数据（优先使用 Agent 上报的数据）
async function performRealLatencyTest(nodes: VPSNode[]): Promise<LatencyTest[]> {
  // 如果没有 Agent 数据，回退到前端估算
  const apiLatency = await measureLatency(`${window.location.origin}/api/nodes`);

  return nodes.map(node => {
    // 优先使用 Agent 上报的延迟数据
    if (node.latency && (node.latency.CT > 0 || node.latency.CU > 0 || node.latency.CM > 0)) {
      const createISPFromAgent = (code: 'CT' | 'CU' | 'CM', name: string, latency: number): ISPLatency => ({
        name,
        code,
        latency: latency > 0 ? latency : null,
        status: latency > 0 ? getLatencyStatus(latency) : 'offline',
        packetLoss: latency > 0 ? 0 : 100,
      });

      return {
        nodeId: node.id,
        isps: [
          createISPFromAgent('CT', '电信', node.latency.CT),
          createISPFromAgent('CU', '联通', node.latency.CU),
          createISPFromAgent('CM', '移动', node.latency.CM),
        ],
        lastTest: Date.now(),
      };
    }

    // 回退到基于 API 延迟的估算
    const baseLatency = apiLatency || 100;
    const regionFactors: Record<string, number> = {
      'CN': 0.5,
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
      const jitter = 0.8 + Math.random() * 0.4;
      const latency = Math.round(baseLatency * factor * ispMultiplier * jitter);
      return {
        name: '',
        code: 'CT',
        latency,
        status: getLatencyStatus(latency),
        packetLoss: Math.random() * 3,
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

// 从 API 获取数据（带请求去重和超时）
async function fetchVPSData(): Promise<APIResponse> {
  if (isFetching && pendingFetch) {
    return pendingFetch;
  }

  isFetching = true;
  pendingFetch = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/nodes', {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch VPS data');
      }
      const data = await response.json();
      return {
        nodes: data.nodes || [],
        refreshInterval: data.refreshInterval,
      };
    } finally {
      isFetching = false;
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

export function useVPSData(): UseVPSDataReturn {
  const [nodes, setNodes] = useState<VPSNode[]>([]);
  const [latencyTests, setLatencyTests] = useState<LatencyTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [usingDemo, setUsingDemo] = useState(false);
  // 存储服务器返回的刷新间隔
  const refreshIntervalRef = useRef<number>(DEFAULT_REFRESH_INTERVAL);

  const loadData = useCallback(async () => {
    try {
      const response = await fetchVPSData();

      // 更新刷新间隔（如果服务器返回了新值）
      if (response.refreshInterval && response.refreshInterval > 0) {
        refreshIntervalRef.current = response.refreshInterval;
      }

      setNodes(response.nodes);
      setLastUpdate(Date.now());
      setUsingDemo(false);

      // 每次刷新都更新延迟测试数据（使用 Agent 上报的真实数据或前端估算）
      const tests = await performRealLatencyTest(response.nodes);
      setLatencyTests(tests);
    } catch (error) {
      console.error('Failed to fetch VPS data:', error);
      if (nodes.length === 0) {
        const demoData = generateDemoNodes();
        setNodes(demoData);
        setLatencyTests(generateLatencyTests(demoData));
        setUsingDemo(true);
      }
    }
  }, [nodes]);

  // 初始加载
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    };
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动更新数据（使用动态刷新间隔）
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextFetch = () => {
      timeoutId = setTimeout(async () => {
        await loadData();
        scheduleNextFetch();
      }, refreshIntervalRef.current);
    };

    scheduleNextFetch();

    return () => clearTimeout(timeoutId);
  }, [loadData]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const runLatencyTest = useCallback(async () => {
    setIsTesting(true);

    try {
      if (!usingDemo && nodes.length > 0) {
        const tests = await performRealLatencyTest(nodes);
        setLatencyTests(tests);
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLatencyTests(prev => updateLatencyTests(prev));
      }
    } catch (error) {
      console.error('Latency test failed:', error);
    }

    setIsTesting(false);
  }, [nodes, usingDemo]);

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
