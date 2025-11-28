import type { VercelRequest, VercelResponse } from '@vercel/node';

// 从环境变量获取 API Token
const API_TOKEN = process.env.API_TOKEN || 'your-secret-token';

// KV 存储的 key 前缀
const KV_PREFIX = 'vps:node:';
const GEO_CACHE_PREFIX = 'vps:geo:';

// 动态获取 KV 连接
async function getKV() {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.ping();
    return kv;
  } catch (e) {
    console.warn('Vercel KV not available:', e);
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
async function getGeoInfo(ip: string, kv: any): Promise<GeoInfo | null> {
  // 跳过内网 IP
  if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
    return null;
  }

  // 如果 KV 可用，先检查缓存
  if (kv) {
    try {
      const cacheKey = `${GEO_CACHE_PREFIX}${ip}`;
      const cached = await kv.get(cacheKey);
      if (cached) {
        return cached as GeoInfo;
      }
    } catch (e) {
      console.warn('KV cache read failed:', e);
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

      // 如果 KV 可用，缓存 24 小时
      if (kv) {
        try {
          const cacheKey = `${GEO_CACHE_PREFIX}${ip}`;
          await kv.set(cacheKey, geoInfo, { ex: 86400 });
        } catch (e) {
          console.warn('KV cache write failed:', e);
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

  // 获取 KV 连接
  const kv = await getKV();

  if (!kv) {
    return res.status(503).json({
      error: 'Storage not available',
      message: 'Vercel KV is not configured. Please configure KV storage in Vercel dashboard.'
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
      geoInfo = await getGeoInfo(ipAddress, kv);

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

    // 存储节点数据到 Vercel KV，设置 60 秒过期（节点超时即自动清除）
    const nodeData = {
      id: nodeId,
      ipAddress,
      ...data,
      name: name || nodeId,
      location: location || 'Unknown',
      countryCode: countryCode || 'US',
      lastUpdate: Date.now(),
      status: 'online',
    };

    await kv.set(`${KV_PREFIX}${nodeId}`, nodeData, { ex: 60 });

    // 维护节点列表
    const nodeList = await kv.smembers('vps:nodes') || [];
    if (!nodeList.includes(nodeId)) {
      await kv.sadd('vps:nodes', nodeId);
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
