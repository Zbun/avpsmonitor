import React, { useState } from 'react';
import {
  Server,
  Clock,
  Cpu,
  HardDrive,
  Activity,
  ArrowUp,
  ArrowDown,
  Wifi,
  Globe,
  ChevronDown,
  Calendar,
  Monitor
} from 'lucide-react';
import { VPSNode, LatencyTest } from '../types';
import {
  formatBytes,
  formatSpeed,
  formatUptime,
  getCountryFlag,
  getStatusColor,
  getLatencyColor,
  getTrafficCycle,
  formatExpireDate,
} from '../types';
import ProgressBar from './ProgressBar';

interface VPSCardProps {
  node: VPSNode;
  latencyTest?: LatencyTest;
  viewMode?: 'grid' | 'list';
}

export const VPSCard: React.FC<VPSCardProps> = ({ node, latencyTest, viewMode = 'grid' }) => {
  const statusColor = getStatusColor(node.status);
  const flag = getCountryFlag(node.countryCode);
  const trafficCycle = getTrafficCycle(node.network.resetDay);
  const expireInfo = formatExpireDate(node.expireDate);

  // 网格模式 - 卡片
  if (viewMode === 'grid') {
    return (
      <div className={`
        bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl 
        border border-slate-200 dark:border-slate-700/50
        p-4 card-hover relative overflow-hidden
        ${node.status === 'offline' ? 'opacity-60' : ''}
      `}>
        {/* 状态指示条 */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${statusColor}`} />

        {/* 头部信息 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`
              w-9 h-9 rounded-lg flex items-center justify-center
              ${node.status === 'online' ? 'bg-green-500/20' :
                node.status === 'warning' ? 'bg-yellow-500/20' : 'bg-red-500/20'}
            `}>
              <Server className={`w-4.5 h-4.5 ${node.status === 'online' ? 'text-green-400' :
                node.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                }`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-white">{node.name}</h3>
                <span className="flag-emoji text-sm">{flag}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {node.location} · {node.protocol}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusColor} ${node.status === 'online' ? 'animate-pulse glow-green' :
              node.status === 'warning' ? 'glow-yellow' : ''
              }`} />
            <span className="text-xs text-slate-500 dark:text-gray-400 capitalize">{node.status}</span>
          </div>
        </div>

        {/* 系统信息行 */}
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-gray-400">
          <Monitor className="w-3 h-3" />
          <span>{node.os}</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Calendar className="w-3 h-3" />
          <span className={expireInfo.isExpired ? 'text-red-500' : expireInfo.isNear ? 'text-yellow-500' : ''}>
            {expireInfo.text}
          </span>
        </div>

        {/* 运行时间和负载 */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-500 dark:text-gray-400">运行:</span>
            <span className="font-medium text-slate-700 dark:text-white">
              {node.status === 'offline' ? '-' : formatUptime(node.uptime)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-500 dark:text-gray-400">负载:</span>
            <span className="font-medium text-slate-700 dark:text-white">
              {node.status === 'offline' ? '-' : node.load[0].toFixed(2)}
            </span>
          </div>
        </div>

        {/* 资源使用 */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            <div className="flex-1">
              <ProgressBar
                value={node.cpu.usage}
                label={`CPU ${node.cpu.cores}核`}
                size="sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M9 9h6v6H9z" />
              </svg>
            </div>
            <div className="flex-1">
              <ProgressBar
                value={node.memory.usage}
                label={`内存 ${formatBytes(node.memory.used)}/${formatBytes(node.memory.total)}`}
                size="sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
            <div className="flex-1">
              <ProgressBar
                value={node.disk.usage}
                label={`硬盘 ${formatBytes(node.disk.used)}/${formatBytes(node.disk.total)}`}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* 网络流量 */}
        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-2.5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              实时速度
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-green-500 dark:text-green-400" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  {formatSpeed(node.network.currentUpload)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {formatSpeed(node.network.currentDownload)}
                </span>
              </div>
            </div>
          </div>

          {/* 月流量 - 优化布局防止折行 */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-gray-400">月流量 ({trafficCycle.start}-{trafficCycle.end})</span>
              <span className="text-slate-600 dark:text-gray-300 font-medium">
                {formatBytes(node.network.monthlyUsed)}/{formatBytes(node.network.monthlyTotal)}
              </span>
            </div>
            <ProgressBar
              value={node.network.monthlyUsed}
              max={node.network.monthlyTotal}
              showPercent={false}
              size="sm"
            />
          </div>

          {/* 总流量 */}
          <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400 mt-2">
            <span>↑ {formatBytes(node.network.totalUpload)}</span>
            <span>↓ {formatBytes(node.network.totalDownload)}</span>
          </div>
        </div>

        {/* 延迟测试 - 优化布局 */}
        {latencyTest && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-gray-400">三网延迟</span>
              <div className="flex items-center gap-2">
                {latencyTest.isps.map((isp, index) => {
                  const colorClass = getLatencyColor(isp.status);
                  const ispConfig = {
                    'CT': { label: '电信', color: 'text-blue-500' },
                    'CU': { label: '联通', color: 'text-red-500' },
                    'CM': { label: '移动', color: 'text-green-500' },
                  }[isp.code] || { label: isp.name, color: 'text-gray-500' };
                  return (
                    <React.Fragment key={isp.code}>
                      {index > 0 && <span className="text-slate-300 dark:text-slate-600 text-xs">/</span>}
                      <span className="text-xs">
                        <span className={ispConfig.color}>{ispConfig.label}</span>
                        <span className={`font-medium ml-0.5 ${colorClass}`}>
                          {isp.latency !== null ? isp.latency : '-'}
                        </span>
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 列表模式返回 null，由 VPSTable 处理
  return null;
};

// 列表模式表格组件
interface VPSTableProps {
  nodes: VPSNode[];
  latencyTests: LatencyTest[];
}

export const VPSTable: React.FC<VPSTableProps> = ({ nodes, latencyTests }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
      {/* 桌面端表格 */}
      <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-240px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 dark:bg-slate-900/95 text-left text-xs">
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-gray-300">服务器</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center">状态</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center">CPU</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center">内存</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center">硬盘</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center">↑速度</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center">↓速度</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center">流量</th>
              <th className="px-2 py-2 font-medium text-slate-600 dark:text-gray-300 text-center whitespace-nowrap">
                <span className="text-blue-500">电</span>/
                <span className="text-red-500">联</span>/
                <span className="text-green-500">移</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {nodes.map(node => {
              const latencyTest = latencyTests.find(t => t.nodeId === node.id);
              const statusColor = getStatusColor(node.status);
              const flag = getCountryFlag(node.countryCode);
              const expireInfo = formatExpireDate(node.expireDate);
              const isExpanded = expandedId === node.id;
              const trafficPercent = (node.network.monthlyUsed / node.network.monthlyTotal * 100).toFixed(1);

              return (
                <React.Fragment key={node.id}>
                  <tr
                    onClick={() => toggleExpand(node.id)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${node.status === 'offline' ? 'opacity-60' : ''}`}
                  >
                    {/* 服务器信息 */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flag-emoji text-sm">{flag}</span>
                        <div>
                          <div className="font-medium text-slate-800 dark:text-white text-xs">{node.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-gray-400">{node.location}</div>
                        </div>
                      </div>
                    </td>

                    {/* 状态 */}
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${node.status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                        node.status === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                        {node.status === 'online' ? '在线' : node.status === 'warning' ? '警告' : '离线'}
                      </span>
                    </td>

                    {/* CPU */}
                    <td className="px-2 py-2 text-center">
                      <span className={`text-xs font-medium ${node.cpu.usage < 60 ? 'text-green-600 dark:text-green-400' :
                        node.cpu.usage < 80 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>{node.cpu.usage.toFixed(0)}%</span>
                    </td>

                    {/* 内存 */}
                    <td className="px-2 py-2 text-center">
                      <span className={`text-xs font-medium ${node.memory.usage < 60 ? 'text-green-600 dark:text-green-400' :
                        node.memory.usage < 80 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>{node.memory.usage.toFixed(0)}%</span>
                    </td>

                    {/* 硬盘 */}
                    <td className="px-2 py-2 text-center">
                      <span className={`text-xs font-medium ${node.disk.usage < 60 ? 'text-green-600 dark:text-green-400' :
                        node.disk.usage < 80 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>{node.disk.usage.toFixed(0)}%</span>
                    </td>

                    {/* 上传速度 */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {formatSpeed(node.network.currentUpload)}
                      </span>
                    </td>

                    {/* 下载速度 */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {formatSpeed(node.network.currentDownload)}
                      </span>
                    </td>

                    {/* 月流量 */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-medium ${parseFloat(trafficPercent) < 60 ? 'text-green-600 dark:text-green-400' :
                          parseFloat(trafficPercent) < 80 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>{formatBytes(node.network.monthlyUsed)}</span>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500">
                          / {formatBytes(node.network.monthlyTotal)}
                        </span>
                      </div>
                    </td>

                    {/* 三网延迟 */}
                    <td className="px-2 py-2 text-center">
                      {latencyTest ? (
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span className={getLatencyColor(latencyTest.isps.find(i => i.code === 'CT')?.status || 'offline')}>
                            {latencyTest.isps.find(i => i.code === 'CT')?.latency ?? '-'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <span className={getLatencyColor(latencyTest.isps.find(i => i.code === 'CU')?.status || 'offline')}>
                            {latencyTest.isps.find(i => i.code === 'CU')?.latency ?? '-'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <span className={getLatencyColor(latencyTest.isps.find(i => i.code === 'CM')?.status || 'offline')}>
                            {latencyTest.isps.find(i => i.code === 'CM')?.latency ?? '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <tr className="bg-slate-50 dark:bg-slate-900/30">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">操作系统</div>
                            <div className="font-medium text-slate-700 dark:text-white truncate">{node.os}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">运行时间</div>
                            <div className="font-medium text-slate-700 dark:text-white">
                              {node.status === 'offline' ? '-' : formatUptime(node.uptime)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">负载</div>
                            <div className="font-medium text-slate-700 dark:text-white">
                              {node.status === 'offline' ? '-' : node.load[0].toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">到期时间</div>
                            <div className={`font-medium ${expireInfo.isExpired ? 'text-red-500' :
                              expireInfo.isNear ? 'text-yellow-500' : 'text-slate-700 dark:text-white'
                              }`}>{expireInfo.text}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">内存</div>
                            <div className="font-medium text-slate-700 dark:text-white">
                              {formatBytes(node.memory.used)}/{formatBytes(node.memory.total)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">硬盘</div>
                            <div className="font-medium text-slate-700 dark:text-white">
                              {formatBytes(node.disk.used)}/{formatBytes(node.disk.total)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">月流量</div>
                            <div className="font-medium text-slate-700 dark:text-white">
                              {formatBytes(node.network.monthlyUsed)}/{formatBytes(node.network.monthlyTotal)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">流量周期</div>
                            <div className="font-medium text-slate-700 dark:text-white">
                              每月{node.network.resetDay}号
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">总上传</div>
                            <div className="font-medium text-green-600 dark:text-green-400">
                              {formatBytes(node.network.totalUpload)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">总下载</div>
                            <div className="font-medium text-blue-600 dark:text-blue-400">
                              {formatBytes(node.network.totalDownload)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">协议</div>
                            <div className="font-medium text-slate-700 dark:text-white">{node.protocol}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 dark:text-gray-500 text-[10px]">IP地址</div>
                            <div className="font-medium text-slate-700 dark:text-white">{node.ipAddress}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 移动端列表 */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
        {nodes.map(node => {
          const latencyTest = latencyTests.find(t => t.nodeId === node.id);
          const statusColor = getStatusColor(node.status);
          const flag = getCountryFlag(node.countryCode);
          const expireInfo = formatExpireDate(node.expireDate);
          const isExpanded = expandedId === node.id;
          const trafficPercent = (node.network.monthlyUsed / node.network.monthlyTotal * 100).toFixed(0);

          return (
            <div
              key={node.id}
              className={`${node.status === 'offline' ? 'opacity-60' : ''}`}
            >
              {/* 可点击的主区域 */}
              <div
                onClick={() => toggleExpand(node.id)}
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/30"
              >
                {/* 左侧: 国旗+名称 */}
                <span className="flag-emoji text-base">{flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm text-slate-800 dark:text-white truncate">{node.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-gray-400">
                    <span>{node.location}</span>
                    <span className="text-green-500">↑{formatSpeed(node.network.currentUpload)}</span>
                    <span className="text-blue-500">↓{formatSpeed(node.network.currentDownload)}</span>
                  </div>
                </div>

                {/* 右侧: 核心指标 */}
                <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
                  <div className="text-center">
                    <div className={`font-semibold ${node.cpu.usage < 60 ? 'text-green-600 dark:text-green-400' :
                      node.cpu.usage < 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      }`}>{node.cpu.usage.toFixed(0)}%</div>
                    <div className="text-[9px] text-slate-400">CPU</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-semibold ${node.memory.usage < 60 ? 'text-green-600 dark:text-green-400' :
                      node.memory.usage < 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      }`}>{node.memory.usage.toFixed(0)}%</div>
                    <div className="text-[9px] text-slate-400">内存</div>
                  </div>
                  <div className="text-center min-w-[50px]">
                    <div className={`font-semibold ${parseFloat(trafficPercent) < 60 ? 'text-green-600 dark:text-green-400' :
                      parseFloat(trafficPercent) < 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      }`}>{formatBytes(node.network.monthlyUsed)}</div>
                    <div className="text-[9px] text-slate-400">/{formatBytes(node.network.monthlyTotal)}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 bg-slate-50/50 dark:bg-slate-800/30">
                  {/* 延迟信息 */}
                  {latencyTest && (
                    <div className="flex items-center justify-center gap-3 mb-2 py-1.5 bg-white dark:bg-slate-800/50 rounded text-xs">
                      <span className="text-slate-400">延迟:</span>
                      <span><span className="text-blue-500">电信</span> <span className={getLatencyColor(latencyTest.isps.find(i => i.code === 'CT')?.status || 'offline')}>{latencyTest.isps.find(i => i.code === 'CT')?.latency ?? '-'}ms</span></span>
                      <span><span className="text-red-500">联通</span> <span className={getLatencyColor(latencyTest.isps.find(i => i.code === 'CU')?.status || 'offline')}>{latencyTest.isps.find(i => i.code === 'CU')?.latency ?? '-'}ms</span></span>
                      <span><span className="text-green-500">移动</span> <span className={getLatencyColor(latencyTest.isps.find(i => i.code === 'CM')?.status || 'offline')}>{latencyTest.isps.find(i => i.code === 'CM')?.latency ?? '-'}ms</span></span>
                    </div>
                  )}

                  {/* 详细信息网格 */}
                  <div className="grid grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">硬盘</div>
                      <div className={`font-medium ${node.disk.usage < 60 ? 'text-green-600 dark:text-green-400' :
                        node.disk.usage < 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                        }`}>{node.disk.usage.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">运行</div>
                      <div className="font-medium text-slate-700 dark:text-white">
                        {node.status === 'offline' ? '-' : formatUptime(node.uptime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">负载</div>
                      <div className="font-medium text-slate-700 dark:text-white">
                        {node.status === 'offline' ? '-' : node.load[0].toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">到期</div>
                      <div className={`font-medium ${expireInfo.isExpired ? 'text-red-500' :
                        expireInfo.isNear ? 'text-yellow-500' : 'text-slate-700 dark:text-white'
                        }`}>{expireInfo.text}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">月流量</div>
                      <div className="font-medium text-slate-700 dark:text-white">
                        {formatBytes(node.network.monthlyUsed)}/{formatBytes(node.network.monthlyTotal)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">总上传</div>
                      <div className="font-medium text-green-600 dark:text-green-400">
                        {formatBytes(node.network.totalUpload)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">总下载</div>
                      <div className="font-medium text-blue-600 dark:text-blue-400">
                        {formatBytes(node.network.totalDownload)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 dark:text-gray-500 text-[9px]">协议</div>
                      <div className="font-medium text-slate-700 dark:text-white">{node.protocol}</div>
                    </div>
                  </div>

                  {/* 系统信息 */}
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 text-[11px]">
                    <span className="text-slate-400">系统:</span>
                    <span className="ml-1 text-slate-600 dark:text-gray-300">{node.os}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VPSCard;
