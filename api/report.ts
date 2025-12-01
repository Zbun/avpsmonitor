import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

// 从环境变量获取 API Token
const API_TOKEN = process.env.API_TOKEN || 'your-secret-token';

// KV 存储的 key 前缀
const KV_PREFIX = 'vps:node:';
const GEO_CACHE_PREFIX = 'vps:geo:';

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

// IP 地理位置信息接口
interface GeoInfo {
  country: string;
  countryCode: string;
  city: string;
  region: string;
  isp: string;
}

// 查询 IP 地理位置（使用免费的 ip-api.com）
async function getGeoInfo(ip: string, redis: Redis | null): Promise<GeoInfo | null> {
  // 跳过内网 IP
  if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
    return null;
  }

  // 如果 Redis 可用，先检查缓存
  if (redis) {
    try {
      const cacheKey = `${GEO_CACHE_PREFIX}${ip}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return (typeof cached === 'string' ? JSON.parse(cached) : cached) as GeoInfo;
      }
    } catch (e) {
      console.warn('Redis cache read failed:', e);
    }
  }

  try {
    // 使用 ip-api.com 免费 API（限制：45次/分钟）
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp`);
    const data = await response.json();

    if (data.status === 'success') {
      const geoInfo: GeoInfo = {
        country: data.country || '',
        countryCode: data.countryCode || '',
        city: data.city || '',
        region: data.regionName || '',
        isp: data.isp || '',
      };

      // 如果 Redis 可用，缓存 24 小时
      if (redis) {
        try {
          const cacheKey = `${GEO_CACHE_PREFIX}${ip}`;
          await redis.setex(cacheKey, 86400, JSON.stringify(geoInfo));
        } catch (e) {
          console.warn('Redis cache write failed:', e);
        }
      }

      return geoInfo;
    }
  } catch (error) {
    console.error('Error fetching geo info:', error);
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Token, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证 Token
  const token = req.headers['x-api-token'] ||
    (req.headers['authorization'] as string)?.replace('Bearer ', '');
  if (token !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 获取 Redis 连接
  const redis = getRedis();

  if (!redis) {
    return res.status(503).json({
      error: 'Storage not available',
      message: 'Redis is not configured. Please set REDIS_URL and REDIS_TOKEN environment variables.'
    });
  }

  try {
    const { nodeId, ipAddress, ...data } = req.body;

    if (!nodeId) {
      return res.status(400).json({ error: 'Missing nodeId' });
    }

    // 获取 IP 地理位置信息
    let geoInfo: GeoInfo | null = null;
    let location = data.location;
    let countryCode = data.countryCode;
    let name = data.name;

    // 如果上报了 IP 且没有手动指定位置，则自动获取
    if (ipAddress && (!location || location === 'Unknown' || !countryCode)) {
      geoInfo = await getGeoInfo(ipAddress, redis);

      if (geoInfo) {
        // 自动填充位置信息
        if (!countryCode || countryCode === 'US') {
          countryCode = geoInfo.countryCode;
        }
        if (!location || location === 'Unknown') {
          location = geoInfo.city || geoInfo.region || geoInfo.country;
        }
        // 如果没有设置名称，使用"城市 ISP"作为默认名称
        if (!name || name === nodeId) {
          name = geoInfo.city
            ? `${geoInfo.city} ${geoInfo.isp?.split(' ')[0] || ''}`.trim()
            : `${geoInfo.country} VPS`;
        }
      }
    }

    // ===== 月流量统计逻辑 =====
    const trafficResetDay = data.trafficResetDay || 1;
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 计算当前计费周期的开始时间
    let cycleStartDate: Date;
    if (currentDay >= trafficResetDay) {
      // 当前日期 >= 重置日，周期从本月重置日开始
      cycleStartDate = new Date(currentYear, currentMonth, trafficResetDay);
    } else {
      // 当前日期 < 重置日，周期从上月重置日开始
      cycleStartDate = new Date(currentYear, currentMonth - 1, trafficResetDay);
    }
    const cycleStartKey = `${cycleStartDate.getFullYear()}-${cycleStartDate.getMonth() + 1}-${cycleStartDate.getDate()}`;

    // 获取或创建月流量基准数据
    const trafficKey = `vps:traffic:${nodeId}`;
    let trafficData: { cycleStart: string; baseUpload: number; baseDownload: number } | null = null;

    try {
      const rawTraffic = await redis.get(trafficKey);
      if (rawTraffic) {
        trafficData = typeof rawTraffic === 'string' ? JSON.parse(rawTraffic) : rawTraffic;
      }
    } catch (e) {
      console.warn('Error reading traffic data:', e);
    }

    const totalUpload = data.network?.totalUpload || 0;
    const totalDownload = data.network?.totalDownload || 0;

    // 判断是否需要重置基准（新周期或首次连接）
    if (!trafficData || trafficData.cycleStart !== cycleStartKey) {
      // 新周期或首次连接，记录当前值作为基准
      trafficData = {
        cycleStart: cycleStartKey,
        baseUpload: totalUpload,
        baseDownload: totalDownload,
      };
      // 保存基准数据（设置较长过期时间，如 45 天）
      await redis.setex(trafficKey, 45 * 24 * 60 * 60, JSON.stringify(trafficData));
    }

    // 计算本月已用流量
    const monthlyUpload = Math.max(0, totalUpload - trafficData.baseUpload);
    const monthlyDownload = Math.max(0, totalDownload - trafficData.baseDownload);
    const monthlyUsed = monthlyUpload + monthlyDownload;

    // 存储节点数据到 Redis，设置 60 秒过期（节点超时即自动清除）
    const nodeData = {
      id: nodeId,
      ipAddress,
      ...data,
      name: name || nodeId,
      location: location || 'Unknown',
      countryCode: countryCode || 'US',
      lastUpdate: Date.now(),
      status: 'online',
      // 覆盖月流量数据
      network: {
        ...data.network,
        monthlyUsed: monthlyUsed,
      },
      // 保存延迟测试数据（如果 Agent 上报了）
      latency: data.latency || null,
    };

    // 存储节点数据到 Redis，设置 20 秒过期（结合 4 秒上报间隔，给 5 次容错机会）
    await redis.setex(`${KV_PREFIX}${nodeId}`, 20, JSON.stringify(nodeData));

    // 维护节点列表
    const nodeList = await redis.smembers('vps:nodes') || [];
    if (!nodeList.includes(nodeId)) {
      await redis.sadd('vps:nodes', nodeId);
    }

    return res.status(200).json({
      success: true,
      geo: geoInfo ? {
        location,
        countryCode,
        name
      } : null
    });
  } catch (error) {
    console.error('Error processing report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
