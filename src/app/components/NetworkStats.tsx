import { NetworkMetrics } from '../types';

interface NetworkStatsProps {
  network: NetworkMetrics;
}

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format speed (bytes per second to human readable)
const formatSpeed = (bytesPerSecond: number): string => {
  return formatBytes(bytesPerSecond) + '/s';
};

export default function NetworkStats({ network }: NetworkStatsProps) {
  const trafficPercentage = network.monthlyTraffic.total > 0 
    ? (network.monthlyTraffic.used / network.monthlyTraffic.total) * 100 
    : 0;
  
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">网络流量</h2>
      
      <div className="space-y-4">
        {/* Monthly Traffic */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-400">月流量</span>
            <span className="text-sm font-medium">{trafficPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${trafficPercentage < 80 ? 'bg-blue-500' : 'bg-yellow-500'} transition-all duration-300`}
              style={{ width: `${Math.min(trafficPercentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatBytes(network.monthlyTraffic.used)} / {formatBytes(network.monthlyTraffic.total)}
          </div>
        </div>
        
        {/* Real-time Speed */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">实时上传</div>
            <div className="text-lg font-semibold text-green-400">
              ↑ {formatSpeed(network.currentSpeed.upload)}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">实时下载</div>
            <div className="text-lg font-semibold text-blue-400">
              ↓ {formatSpeed(network.currentSpeed.download)}
            </div>
          </div>
        </div>
        
        {/* Total Traffic */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400">总上传</div>
            <div className="text-sm font-medium">{formatBytes(network.totalTraffic.upload)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">总下载</div>
            <div className="text-sm font-medium">{formatBytes(network.totalTraffic.download)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
