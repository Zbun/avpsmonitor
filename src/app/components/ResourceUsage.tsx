import { SystemResources } from '../types';

interface ResourceUsageProps {
  resources: SystemResources;
}

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get color based on percentage
const getUsageColor = (percentage: number): string => {
  if (percentage < 50) return 'bg-green-500';
  if (percentage < 80) return 'bg-yellow-500';
  return 'bg-red-500';
};

interface ProgressBarProps {
  label: string;
  percentage: number;
  used: string;
  total: string;
}

const ProgressBar = ({ label, percentage, used, total }: ProgressBarProps) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
    </div>
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full ${getUsageColor(percentage)} transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
    <div className="text-xs text-gray-500 mt-1">{used} / {total}</div>
  </div>
);

export default function ResourceUsage({ resources }: ResourceUsageProps) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">系统资源</h2>
      
      <div className="space-y-4">
        <ProgressBar
          label="CPU 使用率"
          percentage={resources.cpu.usage}
          used={`${resources.cpu.cores} 核心`}
          total={resources.cpu.model}
        />
        
        <ProgressBar
          label="内存使用"
          percentage={resources.memory.percentage}
          used={formatBytes(resources.memory.used)}
          total={formatBytes(resources.memory.total)}
        />
        
        <ProgressBar
          label="硬盘使用"
          percentage={resources.disk.percentage}
          used={formatBytes(resources.disk.used)}
          total={formatBytes(resources.disk.total)}
        />
        
        <div>
          <div className="text-sm text-gray-400 mb-1">系统负载</div>
          <div className="flex gap-4">
            {resources.load.map((load, idx) => (
              <div key={idx} className="text-center">
                <div className="text-lg font-medium">{load.toFixed(2)}</div>
                <div className="text-xs text-gray-500">
                  {idx === 0 ? '1分钟' : idx === 1 ? '5分钟' : '15分钟'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
