// VPS 服务器数据类型定义

export interface VPSNode {
  id: string;
  name: string;
  location: string;
  countryCode: string;  // ISO 3166-1 alpha-2 国家代码，用于国旗展示
  ipAddress: string;    // 脱敏后的 IPv4 地址
  ipv6Address?: string;  // 脱敏后的 IPv6 地址
  ipv6Supported?: boolean; // 是否支持 IPv6
  status: 'online' | 'offline' | 'warning';

  // 系统信息
  os: string;           // 操作系统，如 "Ubuntu 22.04"
  uptime: number;       // 开机时间（秒）
  load: [number, number, number];  // 1分钟、5分钟、15分钟负载

  // 到期信息
  expireDate?: string;  // 到期时间，如 "2025-12-31"

  // 资源使用
  cpu: {
    cores: number;
    usage: number;  // 百分比
    model: string;
  };
  memory: {
    total: number;  // 字节
    used: number;   // 字节
    usage: number;  // 百分比
  };
  disk: {
    total: number;  // 字节
    used: number;   // 字节
    usage: number;  // 百分比
  };

  // 网络流量
  network: {
    monthlyTotal: number;      // 月流量限制（字节）
    monthlyUsed: number;       // 月已用流量（字节）
    totalUpload: number;       // 总上传（字节）
    totalDownload: number;     // 总下载（字节）
    currentUpload: number;     // 当前上传速度（字节/秒）
    currentDownload: number;   // 当前下载速度（字节/秒）
    resetDay: number;          // 流量重置日（1-28，表示每月几号重置）
  };

  // Agent 上报的三网延迟测试结果（毫秒，-1 表示不可达）
  latency?: {
    CT: number;  // 电信
    CU: number;  // 联通
    CM: number;  // 移动
  } | null;

  // 最后更新时间
  lastUpdate: number;  // 时间戳
}

export interface ISPLatency {
  name: string;
  code: 'CT' | 'CU' | 'CM';  // 电信、联通、移动
  latency: number | null;    // 延迟（毫秒），null 表示不可达
  status: 'good' | 'medium' | 'poor' | 'offline';
  packetLoss: number;        // 丢包率百分比
}

export interface LatencyTest {
  nodeId: string;
  isps: ISPLatency[];
  lastTest: number;  // 时间戳
}

// 国旗 emoji 映射
export const countryFlags: Record<string, string> = {
  'CN': '🇨🇳',
  'US': '🇺🇸',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'SG': '🇸🇬',
  'HK': '🇭🇰',
  'TW': '🇹🇼',
  'DE': '🇩🇪',
  'GB': '🇬🇧',
  'FR': '🇫🇷',
  'NL': '🇳🇱',
  'RU': '🇷🇺',
  'CA': '🇨🇦',
  'AU': '🇦🇺',
  'IN': '🇮🇳',
  'BR': '🇧🇷',
};

// 获取国旗 emoji
export function getCountryFlag(countryCode: string): string {
  return countryFlags[countryCode.toUpperCase()] || '🏳️';
}

// 格式化字节
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 格式化网络速度
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0B/s';
  const k = 1024;
  const sizes = ['B/s', 'K/s', 'M/s', 'G/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + sizes[i];
}

// 格式化运行时间
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}天${hours}时`;
  } else if (hours > 0) {
    return `${hours}时${minutes}分`;
  } else {
    return `${minutes}分钟`;
  }
}

// 格式化百分比
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// 获取状态颜色
export function getStatusColor(status: 'online' | 'offline' | 'warning'): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'offline':
      return 'bg-red-500';
    case 'warning':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
}

// 获取延迟状态
export function getLatencyStatus(latency: number | null): ISPLatency['status'] {
  if (latency === null) return 'offline';
  if (latency < 50) return 'good';
  if (latency < 150) return 'medium';
  return 'poor';
}

// 获取延迟颜色 - 同时支持暗色和亮色模式
export function getLatencyColor(status: ISPLatency['status']): string {
  switch (status) {
    case 'good':
      return 'dark:text-green-400 text-green-600';
    case 'medium':
      return 'dark:text-yellow-400 text-yellow-600';
    case 'poor':
      return 'dark:text-orange-400 text-orange-600';
    case 'offline':
      return 'dark:text-red-400 text-red-600';
    default:
      return 'dark:text-gray-400 text-gray-600';
  }
}

// 获取使用率颜色
export function getUsageColor(percentage: number): string {
  if (percentage < 60) return 'bg-green-500';
  if (percentage < 80) return 'bg-yellow-500';
  return 'bg-red-500';
}

// 获取使用率背景色
export function getUsageBgColor(percentage: number): string {
  if (percentage < 60) return 'bg-green-500/20';
  if (percentage < 80) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

// 计算流量周期
export function getTrafficCycle(resetDay: number): { start: string; end: string } {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let startDate: Date;
  let endDate: Date;

  if (currentDay >= resetDay) {
    // 当前日期 >= 重置日，周期为本月重置日到下月重置日前一天
    startDate = new Date(currentYear, currentMonth, resetDay);
    endDate = new Date(currentYear, currentMonth + 1, resetDay - 1);
  } else {
    // 当前日期 < 重置日，周期为上月重置日到本月重置日前一天
    startDate = new Date(currentYear, currentMonth - 1, resetDay);
    endDate = new Date(currentYear, currentMonth, resetDay - 1);
  }

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
}

// 格式化到期时间
export function formatExpireDate(dateStr?: string): { text: string; isNear: boolean; isExpired: boolean } {
  if (!dateStr) return { text: '永久', isNear: false, isExpired: false };

  const expireDate = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const year = expireDate.getFullYear();
  const month = expireDate.getMonth() + 1;
  const day = expireDate.getDate();
  const text = `${year}/${month}/${day}`;

  if (diffDays < 0) {
    return { text: `已过期`, isNear: false, isExpired: true };
  } else if (diffDays <= 30) {
    return { text: `${text} (${diffDays}天)`, isNear: true, isExpired: false };
  }

  return { text, isNear: false, isExpired: false };
}
