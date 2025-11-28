import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

// KV 存储的 key 前缀
const KV_PREFIX = 'vps:node:';

// 默认值
const DEFAULTS = {
  monthlyTotal: 1099511627776, // 1TB
  resetDay: 1,
};

// Redis 客户端单例
let redisClient: Redis | null = null;

// 获取 Redis 连接
function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('REDIS_URL not configured');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    return redisClient;
  } catch (e) {
    console.error('Failed to create Redis client:', e);
    return null;
  }
}

// 从环境变量解析预配置的服务器列表
// 格式: VPS_SERVERS=id1:名称1:HK:Hong Kong:2025-12-31:1:1024,id2:名称2:JP:Tokyo:2025-06-15:15:2048
// 字段: 节点ID:显示名称:国家代码:位置:到期日期:流量重置日:月流量总数(GB)
interface ServerConfig {
  name: string;
  countryCode: string;
  location: string;
  expireDate?: string;
  resetDay: number;
  monthlyTotal: number; // 月流量总数（字节）
}

// 解析流量配置，支持 TB/GB/T/G 单位（不区分大小写），无单位默认 GB
function parseTrafficSize(value: string | undefined): number {
  if (!value) return DEFAULTS.monthlyTotal;
  const trimmed = value.trim();
  // 支持: 3TB, 3tb, 3T, 3t, 500GB, 500gb, 500G, 500g, 1024
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(TB?|GB?)?$/i);
  if (!match) return DEFAULTS.monthlyTotal;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'G').toUpperCase();
  if (unit.startsWith('T')) {
    return num * 1024 * 1024 * 1024 * 1024; // TB -> bytes
  }
  return num * 1024 * 1024 * 1024; // GB -> bytes
}

function getPreConfiguredServers(): Map<string, ServerConfig> {
  const servers = new Map<string, ServerConfig>();
  const config = process.env.VPS_SERVERS;

  if (!config) return servers;

  try {
    config.split(',').forEach(item => {
      const parts = item.trim().split(':');
      const [id, name, countryCode, location, expireDate, resetDay, monthlyTotalStr] = parts;
      if (id && name) {
        servers.set(id.trim(), {
          name: name.trim(),
          countryCode: (countryCode || 'US').trim(),
          location: (location || name).trim(),
          expireDate: expireDate?.trim() || undefined,
          resetDay: parseInt(resetDay) || DEFAULTS.resetDay,
          monthlyTotal: parseTrafficSize(monthlyTotalStr),
        });
      }
    });
  } catch (e) {
    console.error('Error parsing VPS_SERVERS:', e);
  }

  return servers;
}

// 根据预配置生成离线节点占位数据
function generatePlaceholderNode(id: string, config: ServerConfig) {
  return {
    id,
    name: config.name,
    countryCode: config.countryCode,
    location: config.location,
    expireDate: config.expireDate || '',
    status: 'offline',
    ipAddress: '-',
    protocol: 'KVM',
    os: 'Unknown',
    uptime: 0,
    load: [0, 0, 0],
    cpu: { model: 'Unknown', cores: 1, usage: 0 },
    memory: { total: 0, used: 0, usage: 0 },
    disk: { total: 0, used: 0, usage: 0 },
    network: {
      currentUpload: 0,
      currentDownload: 0,
      totalUpload: 0,
      totalDownload: 0,
      monthlyUsed: 0,
      monthlyTotal: config.monthlyTotal || DEFAULTS.monthlyTotal,
      resetDay: config.resetDay || DEFAULTS.resetDay,
    },
    lastUpdate: 0,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取预配置的服务器列表
    const preConfigured = getPreConfiguredServers();
    const now = Date.now();

    // 尝试获取 Redis 连接
    const redis = getRedis();

    // 如果 Redis 不可用，返回预配置的离线节点
    if (!redis) {
      const placeholderNodes = Array.from(preConfigured.entries()).map(([id, config]) =>
        generatePlaceholderNode(id, config)
      );

      return res.status(200).json({
        nodes: placeholderNodes,
        timestamp: now,
        count: placeholderNodes.length,
        kvAvailable: false,
        message: 'Redis not configured. Set REDIS_URL and REDIS_TOKEN environment variables.',
      });
    }

    // 获取所有节点 ID
    let nodeIds: string[] = [];
    try {
      nodeIds = await redis.smembers('vps:nodes') || [];
    } catch (e) {
      console.warn('Error fetching node list:', e);
    }

    // 获取每个节点的数据
    const nodes = await Promise.all(
      nodeIds.map(async (nodeId: string) => {
        try {
          const rawData = await redis.get(`${KV_PREFIX}${nodeId}`);
          if (!rawData) {
            // 节点数据过期，从列表中移除
            await redis.srem('vps:nodes', nodeId);
            return null;
          }

          // 解析 JSON 数据
          const nodeData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          // 检查是否超时（60秒无更新视为离线）
          const isOnline = (now - nodeData.lastUpdate) < 60000;

          // 优先使用环境变量中的配置
          const preConfig = preConfigured.get(nodeId);

          // 从预配置中移除已处理的节点
          preConfigured.delete(nodeId);

          // 确保 network 对象有所有必需字段
          const network = nodeData.network || {};

          // 简化操作系统名称（如 "Linux 5.15.0-91-generic" -> "Debian" 或 "Ubuntu"）
          const simplifyOS = (os: string): string => {
            if (!os || os === 'Unknown') return 'Unknown';
            const osLower = os.toLowerCase();
            if (osLower.includes('debian')) return 'Debian';
            if (osLower.includes('ubuntu')) return 'Ubuntu';
            if (osLower.includes('centos')) return 'CentOS';
            if (osLower.includes('rocky')) return 'Rocky';
            if (osLower.includes('alma')) return 'AlmaLinux';
            if (osLower.includes('fedora')) return 'Fedora';
            if (osLower.includes('arch')) return 'Arch';
            if (osLower.includes('alpine')) return 'Alpine';
            if (osLower.includes('darwin') || osLower.includes('macos')) return 'macOS';
            if (osLower.includes('windows')) return 'Windows';
            // 如果都不匹配，尝试取 Linux 发行版名称
            if (osLower.startsWith('linux')) return 'Linux';
            return os.split(' ')[0] || 'Unknown'; // 返回第一个单词
          };

          // 确定流量重置日：VPS_SERVERS 配置 > Agent 上报 > 默认值
          const resetDay = preConfig?.resetDay || nodeData.trafficResetDay || network.resetDay || DEFAULTS.resetDay;

          return {
            ...nodeData,
            // 环境变量配置优先
            name: preConfig?.name || nodeData.name || nodeId,
            countryCode: preConfig?.countryCode || nodeData.countryCode || 'US',
            location: preConfig?.location || nodeData.location || 'Unknown',
            status: isOnline ? 'online' : 'offline',
            // IPv6 地址
            ipv6Address: nodeData.ipv6Address || '',
            // 到期时间：VPS_SERVERS 配置 > Agent 上报 > 空
            expireDate: preConfig?.expireDate || nodeData.expireDate || '',
            // 简化操作系统名称
            os: simplifyOS(nodeData.os),
            uptime: nodeData.uptime || 0,
            load: nodeData.load || [0, 0, 0],
            cpu: {
              model: nodeData.cpu?.model || 'Unknown',
              cores: nodeData.cpu?.cores || 1,
              usage: isOnline ? (nodeData.cpu?.usage || 0) : 0,
            },
            memory: {
              total: nodeData.memory?.total || 0,
              used: nodeData.memory?.used || 0,
              usage: isOnline ? (nodeData.memory?.usage || 0) : 0,
            },
            disk: {
              total: nodeData.disk?.total || 0,
              used: nodeData.disk?.used || 0,
              usage: isOnline ? (nodeData.disk?.usage || 0) : 0,
            },
            network: {
              currentUpload: isOnline ? (network.currentUpload || 0) : 0,
              currentDownload: isOnline ? (network.currentDownload || 0) : 0,
              totalUpload: network.totalUpload || 0,
              totalDownload: network.totalDownload || 0,
              monthlyUsed: network.monthlyUsed || 0,
              // 月流量总数：VPS_SERVERS 配置 > Agent 上报 > 默认值
              monthlyTotal: preConfig?.monthlyTotal || network.monthlyTotal || DEFAULTS.monthlyTotal,
              resetDay: resetDay,
            },
          };
        } catch (e) {
          console.error(`Error fetching node ${nodeId}:`, e);
          return null;
        }
      })
    );

    // 过滤掉 null 值
    const validNodes = nodes.filter(Boolean);

    // 添加预配置但尚未上报数据的节点（显示为离线）
    const remainingPreConfigured = Array.from(preConfigured.entries()).map(([id, config]) =>
      generatePlaceholderNode(id, config)
    );

    const allNodes = [...validNodes, ...remainingPreConfigured];

    return res.status(200).json({
      nodes: allNodes,
      timestamp: now,
      count: allNodes.length,
      kvAvailable: true,
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);

    // 即使出错，也尝试返回预配置的节点
    const preConfigured = getPreConfiguredServers();
    const placeholderNodes = Array.from(preConfigured.entries()).map(([id, config]) =>
      generatePlaceholderNode(id, config)
    );

    return res.status(200).json({
      nodes: placeholderNodes,
      timestamp: Date.now(),
      count: placeholderNodes.length,
      error: 'KV connection failed',
      kvAvailable: false,
    });
  }
}
