import React from 'react';
import {
  Server,
  Clock,
  Cpu,
  HardDrive,
  Activity,
  ArrowUp,
  ArrowDown,
  Wifi,
  Globe
} from 'lucide-react';
import { VPSNode, LatencyTest, ISPLatency } from '../types';
import {
  formatBytes,
  formatSpeed,
  formatUptime,
  getCountryFlag,
  getStatusColor,
  getLatencyColor,
  getUsageColor,
} from '../types';
import ProgressBar from './ProgressBar';

interface VPSCardProps {
  node: VPSNode;
  latencyTest?: LatencyTest;
}

export const VPSCard: React.FC<VPSCardProps> = ({ node, latencyTest }) => {
  const statusColor = getStatusColor(node.status);
  const flag = getCountryFlag(node.countryCode);

  // ISP 图标组件
  const ISPBadge: React.FC<{ isp: ISPLatency }> = ({ isp }) => {
    const colorClass = getLatencyColor(isp.status);
    const bgColor = {
      'CT': 'bg-blue-500/20',
      'CU': 'bg-red-500/20',
      'CM': 'bg-green-500/20',
    }[isp.code];

    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${bgColor}`}>
        <span className="text-xs font-medium text-gray-300">{isp.name}</span>
        <span className={`text-xs font-bold ${colorClass}`}>
          {isp.latency !== null ? `${isp.latency}ms` : 'N/A'}
        </span>
      </div>
    );
  };

  return (
    <div className={`
      bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl 
      border border-slate-200 dark:border-slate-700/50
      p-5 card-hover relative overflow-hidden
      ${node.status === 'offline' ? 'opacity-60' : ''}
    `}>
      {/* 状态指示条 */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusColor}`} />

      {/* 头部信息 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${node.status === 'online' ? 'bg-green-500/20' :
              node.status === 'warning' ? 'bg-yellow-500/20' : 'bg-red-500/20'}
          `}>
            <Server className={`w-5 h-5 ${node.status === 'online' ? 'text-green-400' :
              node.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
              }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-white">{node.name}</h3>
              <span className="flag-emoji text-lg">{flag}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {node.location} · {node.protocol}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor} ${node.status === 'online' ? 'animate-pulse glow-green' :
            node.status === 'warning' ? 'glow-yellow' : ''
            }`} />
          <span className="text-xs text-slate-500 dark:text-gray-400 capitalize">{node.status}</span>
        </div>
      </div>

      {/* 运行时间和负载 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400">运行时间</p>
            <p className="text-sm font-medium text-slate-700 dark:text-white">
              {node.status === 'offline' ? '-' : formatUptime(node.uptime)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400">负载</p>
            <p className="text-sm font-medium text-slate-700 dark:text-white">
              {node.status === 'offline' ? '-' :
                `${node.load[0].toFixed(2)} / ${node.load[1].toFixed(2)} / ${node.load[2].toFixed(2)}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* 资源使用 */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <ProgressBar
              value={node.cpu.usage}
              label={`CPU (${node.cpu.cores}核)`}
              size="sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
          </div>
          <div className="flex-1">
            <ProgressBar
              value={node.memory.usage}
              label={`内存 (${formatBytes(node.memory.used)}/${formatBytes(node.memory.total)})`}
              size="sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <div className="flex-1">
            <ProgressBar
              value={node.disk.usage}
              label={`硬盘 (${formatBytes(node.disk.used)}/${formatBytes(node.disk.total)})`}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 网络流量 */}
      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            实时速度
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-green-500 dark:text-green-400" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {formatSpeed(node.network.currentUpload)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {formatSpeed(node.network.currentDownload)}
            </span>
          </div>
        </div>

        {/* 月流量 */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <ProgressBar
            value={node.network.monthlyUsed}
            max={node.network.monthlyTotal}
            label={`月流量 (${formatBytes(node.network.monthlyUsed)}/${formatBytes(node.network.monthlyTotal)})`}
            size="sm"
          />
        </div>

        {/* 总流量 */}
        <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400 mt-2">
          <span>总上传: {formatBytes(node.network.totalUpload)}</span>
          <span>总下载: {formatBytes(node.network.totalDownload)}</span>
        </div>
      </div>

      {/* 延迟测试 */}
      {latencyTest && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-2">三网延迟</p>
          <div className="flex gap-2 flex-wrap">
            {latencyTest.isps.map(isp => (
              <ISPBadge key={isp.code} isp={isp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VPSCard;
