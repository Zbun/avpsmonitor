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
// 格式: VPS_SERVERS=id1:名称1:HK:Hong Kong,id2:名称2:JP:Tokyo
function getPreConfiguredServers(): Map<string, { name: string; countryCode: string; location: string }> {
  const servers = new Map();
  const config = process.env.VPS_SERVERS;

  if (!config) return servers;

  try {
    config.split(',').forEach(item => {
      const [id, name, countryCode, location] = item.trim().split(':');
      if (id && name) {
        servers.set(id.trim(), {
          name: name.trim(),
          countryCode: (countryCode || 'US').trim(),
          location: (location || name).trim(),
        });
      }
    });
  } catch (e) {
    console.error('Error parsing VPS_SERVERS:', e);
  }

  return servers;
}

// 根据预配置生成离线节点占位数据
function generatePlaceholderNode(id: string, config: { name: string; countryCode: string; location: string }) {
  return {
    id,
    name: config.name,
    countryCode: config.countryCode,
    location: config.location,
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
      monthlyTotal: DEFAULTS.monthlyTotal,
      resetDay: DEFAULTS.resetDay,
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

          return {
            ...nodeData,
            // 环境变量配置优先
            name: preConfig?.name || nodeData.name || nodeId,
            countryCode: preConfig?.countryCode || nodeData.countryCode || 'US',
            location: preConfig?.location || nodeData.location || 'Unknown',
            status: isOnline ? 'online' : 'offline',
            // 确保必需字段有默认值
            os: nodeData.os || 'Unknown',
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
              monthlyTotal: network.monthlyTotal || DEFAULTS.monthlyTotal,
              resetDay: network.resetDay || DEFAULTS.resetDay,
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
