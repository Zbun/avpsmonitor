import { ISPLatency } from '../types';

interface ISPConnectionProps {
  ispLatency: ISPLatency[];
}

// Get color based on status
const getStatusColor = (status: ISPLatency['status']): string => {
  switch (status) {
    case 'good': return 'text-green-400 bg-green-500/20';
    case 'warning': return 'text-yellow-400 bg-yellow-500/20';
    case 'poor': return 'text-red-400 bg-red-500/20';
    case 'offline': return 'text-gray-400 bg-gray-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
};

const getStatusText = (status: ISPLatency['status']): string => {
  switch (status) {
    case 'good': return '优秀';
    case 'warning': return '一般';
    case 'poor': return '较差';
    case 'offline': return '离线';
    default: return '未知';
  }
};

// Get ISP icon based on code
const getISPIcon = (code: string): string => {
  switch (code) {
    case 'cu': return '🔵'; // China Unicom
    case 'cm': return '🟢'; // China Mobile
    case 'ct': return '🟡'; // China Telecom
    default: return '⚪';
  }
};

export default function ISPConnection({ ispLatency }: ISPConnectionProps) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">运营商连接质量</h2>
      
      <div className="space-y-3">
        {ispLatency.map((isp) => (
          <div 
            key={isp.code}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{getISPIcon(isp.code)}</span>
              <div>
                <div className="font-medium">{isp.name}</div>
                <div className="text-xs text-gray-400">
                  {isp.latency !== null ? `延迟: ${isp.latency}ms` : '无法连接'}
                </div>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(isp.status)}`}>
              {getStatusText(isp.status)}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
        <div className="text-xs text-gray-400">
          <div className="flex justify-between mb-1">
            <span>🟢 优秀</span>
            <span>&lt; 50ms</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>🟡 一般</span>
            <span>50-100ms</span>
          </div>
          <div className="flex justify-between">
            <span>🔴 较差</span>
            <span>&gt; 100ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
