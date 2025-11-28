import React from 'react';
import { RefreshCw, Server, Activity } from 'lucide-react';
import { VPSNode, LatencyTest } from '../types';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  nodes: VPSNode[];
  latencyTests: LatencyTest[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  nodes,
  latencyTests,
  onRefresh,
  isRefreshing
}) => {
  const onlineCount = nodes.filter(n => n.status === 'online').length;
  const warningCount = nodes.filter(n => n.status === 'warning').length;
  const offlineCount = nodes.filter(n => n.status === 'offline').length;

  // 计算平均延迟
  const avgLatency = latencyTests.reduce((acc, test) => {
    const validLatencies = test.isps
      .map(isp => isp.latency)
      .filter((l): l is number => l !== null);
    if (validLatencies.length === 0) return acc;
    return acc + validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
  }, 0) / latencyTests.filter(t => t.isps.some(i => i.latency !== null)).length;

  return (
    <header className="backdrop-blur-md border-b sticky top-0 z-50 bg-white/90 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo 和标题 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">VPS Monitor</h1>
              <p className="text-xs text-slate-500 dark:text-gray-400">服务器监控探针</p>
            </div>
          </div>

          {/* 状态概览 */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-600 dark:text-gray-300">
                <span className="font-semibold text-green-600 dark:text-green-400">{onlineCount}</span> 在线
              </span>
            </div>
            {warningCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm text-slate-600 dark:text-gray-300">
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">{warningCount}</span> 警告
                </span>
              </div>
            )}
            {offlineCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-slate-600 dark:text-gray-300">
                  <span className="font-semibold text-red-600 dark:text-red-400">{offlineCount}</span> 离线
                </span>
              </div>
            )}
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-sm text-slate-600 dark:text-gray-300">
                平均延迟: <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {isNaN(avgLatency) ? 'N/A' : `${Math.round(avgLatency)}ms`}
                </span>
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            {/* 主题切换 */}
            <ThemeToggle />

            {/* 刷新按钮 */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                bg-indigo-100 hover:bg-indigo-200
                dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30
                text-indigo-600 dark:text-indigo-400
                font-medium text-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          </div>
        </div>
      </div>

      {/* 移动端状态概览 */}
      <div className="md:hidden border-t px-4 py-2 border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-transparent">
        <div className="flex items-center justify-center gap-4 text-xs">
          <span className="text-green-600 dark:text-green-400 font-medium">{onlineCount} 在线</span>
          {warningCount > 0 && <span className="text-yellow-600 dark:text-yellow-400 font-medium">{warningCount} 警告</span>}
          {offlineCount > 0 && <span className="text-red-600 dark:text-red-400 font-medium">{offlineCount} 离线</span>}
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            延迟: {isNaN(avgLatency) ? 'N/A' : `${Math.round(avgLatency)}ms`}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
