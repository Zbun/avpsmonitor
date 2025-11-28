import { useState, useEffect, useCallback } from 'react';
import { VPSNode, LatencyTest } from '../types';
import {
  mockVPSNodes,
  mockLatencyTests,
  updateMockData,
  updateLatencyTests
} from '../data/mockData';

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

export function useVPSData(): UseVPSDataReturn {
  const [nodes, setNodes] = useState<VPSNode[]>(mockVPSNodes);
  const [latencyTests, setLatencyTests] = useState<LatencyTest[]>(mockLatencyTests);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 初始加载
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // 自动更新数据（模拟实时更新）
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => updateMockData(prev));
      setLastUpdate(Date.now());
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, []);

  // 手动刷新
  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    // 模拟网络请求延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    setNodes(prev => updateMockData(prev));
    setLastUpdate(Date.now());
    setIsRefreshing(false);
  }, []);

  // 运行延迟测试
  const runLatencyTest = useCallback(async () => {
    setIsTesting(true);

    // 模拟测试过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    setLatencyTests(prev => updateLatencyTests(prev));
    setIsTesting(false);
  }, []);

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
