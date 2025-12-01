import React, { useState } from 'react';
import { RefreshCw, Server, ChevronDown } from 'lucide-react';
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
  const [showMenu, setShowMenu] = useState(false);

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
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 移动端布局 */}
        <div className="md:hidden flex items-center justify-between h-12">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Server className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800 dark:text-white">VPS Monitor</span>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-2 mr-2 text-xs text-slate-500 dark:text-gray-400">
              <span className="text-green-600 dark:text-green-400 font-medium">{onlineCount}</span>
              {offlineCount > 0 && <span className="text-red-500 font-medium">/ {offlineCount}</span>}
            </div>
            <ThemeToggle />
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* 桌面端布局 */}
        <div className="hidden md:flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">VPS Monitor</h1>
              <p className="text-[11px] text-slate-400 dark:text-gray-500">服务器监控</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span><span className="font-medium text-green-600 dark:text-green-400">{onlineCount}</span> 在线</span>
            </div>
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span><span className="font-medium text-yellow-600 dark:text-yellow-400">{warningCount}</span> 警告</span>
              </div>
            )}
            {offlineCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span><span className="font-medium text-red-600 dark:text-red-400">{offlineCount}</span> 离线</span>
              </div>
            )}
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>延迟 <span className="font-medium text-blue-600 dark:text-blue-400">{isNaN(avgLatency) ? '-' : `${Math.round(avgLatency)}ms`}</span></span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
          </div>
        </div>
      </div>

      {/* 移动端下拉面板 */}
      <div className={`md:hidden overflow-hidden transition-all duration-200 ${showMenu ? 'max-h-16' : 'max-h-0'}`}>
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>在线 <span className="font-semibold text-green-600 dark:text-green-400">{onlineCount}</span></span>
              <span>警告 <span className="font-semibold text-yellow-600 dark:text-yellow-400">{warningCount}</span></span>
              <span>离线 <span className="font-semibold text-red-600 dark:text-red-400">{offlineCount}</span></span>
            </div>
            <span>延迟 <span className="font-semibold text-blue-600 dark:text-blue-400">{isNaN(avgLatency) ? '-' : `${Math.round(avgLatency)}ms`}</span></span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
