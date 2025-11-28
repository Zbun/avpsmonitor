import React from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from 'lucide-react';
import { VPSNode, LatencyTest } from '../types';
import { getLatencyColor } from '../types';

interface LatencyPanelProps {
  nodes: VPSNode[];
  latencyTests: LatencyTest[];
  onRunTest: () => void;
  isTesting: boolean;
}

export const LatencyPanel: React.FC<LatencyPanelProps> = ({
  nodes,
  latencyTests,
  onRunTest,
  isTesting,
}) => {
  // 获取趋势图标
  const getTrendIcon = (latency: number | null, prevLatency?: number) => {
    if (latency === null) return <Minus className="w-3 h-3 text-gray-500" />;
    if (!prevLatency) return <Minus className="w-3 h-3 text-gray-500" />;

    const diff = latency - prevLatency;
    if (Math.abs(diff) < 5) return <Minus className="w-3 h-3 text-gray-500" />;
    if (diff > 0) return <TrendingUp className="w-3 h-3 text-red-400" />;
    return <TrendingDown className="w-3 h-3 text-green-400" />;
  };

  // ISP 颜色映射 - 默认亮色模式，dark: 前缀用于暗色模式
  const ispColors: Record<string, { bg: string; text: string; border: string }> = {
    'CT': { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-500/30' },
    'CU': { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-300 dark:border-red-500/30' },
    'CM': { bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-500/30' },
  };

  return (
    <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">三网延迟测试</h2>
        </div>
        <button
          onClick={onRunTest}
          disabled={isTesting}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
            bg-yellow-100 hover:bg-yellow-200
            dark:bg-yellow-500/20 dark:hover:bg-yellow-500/30 
            text-yellow-600 dark:text-yellow-400 font-medium
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
          {isTesting ? '测试中...' : '重新测试'}
        </button>
      </div>

      {/* ISP 图例 */}
      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] text-slate-500 dark:text-gray-400">电信</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-slate-500 dark:text-gray-400">联通</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-slate-500 dark:text-gray-400">移动</span>
        </div>
      </div>

      {/* 延迟表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-slate-200 dark:border-slate-700">
              <th className="pb-2 text-xs font-medium text-slate-500 dark:text-gray-400">节点</th>
              <th className="pb-2 text-xs font-medium text-slate-500 dark:text-gray-400 text-center">电信</th>
              <th className="pb-2 text-xs font-medium text-slate-500 dark:text-gray-400 text-center">联通</th>
              <th className="pb-2 text-xs font-medium text-slate-500 dark:text-gray-400 text-center">移动</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {nodes.map(node => {
              const test = latencyTests.find(t => t.nodeId === node.id);

              return (
                <tr key={node.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'online' ? 'bg-green-500' :
                        node.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                      <span className="text-xs text-slate-700 dark:text-white font-medium">{node.name}</span>
                    </div>
                  </td>
                  {['CT', 'CU', 'CM'].map(code => {
                    const isp = test?.isps.find(i => i.code === code);
                    const colors = ispColors[code];

                    return (
                      <td key={code} className="py-2 text-center">
                        <div className={`
                          inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded
                          ${colors.bg} border ${colors.border}
                        `}>
                          <span className={`text-xs font-medium ${isp ? getLatencyColor(isp.status) : 'text-gray-500'
                            }`}>
                            {isp?.latency !== null && isp?.latency !== undefined
                              ? `${isp.latency}ms`
                              : 'N/A'}
                          </span>
                          {isp && getTrendIcon(isp.latency)}
                        </div>
                        {isp && isp.packetLoss > 0 && (
                          <div className="text-[10px] text-red-400 mt-0.5">
                            丢包: {isp.packetLoss.toFixed(1)}%
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 延迟说明 */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>&lt;50ms 优秀</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span>50-150ms 良好</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>&gt;150ms 较差</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>不可达</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatencyPanel;
