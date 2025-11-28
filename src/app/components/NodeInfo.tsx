import { VPSNode } from '../types';

interface NodeInfoProps {
  node: VPSNode;
}

// Map of country codes to flag emojis
const getFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Format uptime from seconds to readable string
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}时`);
  if (minutes > 0) parts.push(`${minutes}分`);
  
  return parts.length > 0 ? parts.join(' ') : '刚启动';
};

export default function NodeInfo({ node }: NodeInfoProps) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">节点信息</h2>
        <span className={`px-2 py-1 text-xs rounded-full ${
          node.online 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {node.online ? '在线' : '离线'}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getFlagEmoji(node.countryCode)}</span>
          <div>
            <div className="font-medium">{node.name}</div>
            <div className="text-sm text-gray-400">{node.location}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-xs text-gray-400">开机时间</div>
            <div className="text-sm font-medium">{formatUptime(node.uptime)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">协议类型</div>
            <div className="text-sm font-medium">{node.protocol}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
