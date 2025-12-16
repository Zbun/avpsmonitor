// 从环境变量获取 API Token
const getApiToken = (env) => env.API_TOKEN || 'your-secret-token';

// KV 存储的 key 前缀
const KV_PREFIX = 'vps:node:';
const GEO_CACHE_PREFIX = 'vps:geo:';
const NODES_LIST_KEY = 'vps:nodes:list';

// 查询 IP 地理位置
async function getGeoInfo(ip, kv) {
  if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
    return null;
  }

  if (kv) {
    try {
      const cacheKey = `${GEO_CACHE_PREFIX}${ip}`;
      const cached = await kv.get(cacheKey, 'json');
      if (cached) return cached;
    } catch (e) {
      console.warn('KV cache read failed:', e);
    }
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp`);
    const data = await response.json();

    if (data.status === 'success') {
      const geoInfo = {
        country: data.country || '',
        countryCode: data.countryCode || '',
        city: data.city || '',
        region: data.regionName || '',
        isp: data.isp || '',
      };

      if (kv) {
        try {
          const cacheKey = `${GEO_CACHE_PREFIX}${ip}`;
          await kv.put(cacheKey, JSON.stringify(geoInfo), { expirationTtl: 86400 });
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

export async function onRequest(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Token, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const API_TOKEN = getApiToken(env);

    // 验证 Token
    const token = request.headers.get('x-api-token') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (token !== API_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 检查 KV 命名空间
    if (!env.VPS_KV) {
      return new Response(JSON.stringify({
        error: 'Storage not available',
        message: 'Workers KV is not configured. Please bind a KV namespace named VPS_KV.',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const kv = env.VPS_KV;
    const body = await request.json();
    const { nodeId, ipAddress, ...data } = body;

    if (!nodeId) {
      return new Response(JSON.stringify({ error: 'Missing nodeId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 获取 IP 地理位置信息
    let geoInfo = null;
    let location = data.location;
    let countryCode = data.countryCode;
    let name = data.name;

    if (ipAddress && (!location || location === 'Unknown' || !countryCode)) {
      geoInfo = await getGeoInfo(ipAddress, kv);

      if (geoInfo) {
        if (!countryCode || countryCode === 'US') {
          countryCode = geoInfo.countryCode;
        }
        if (!location || location === 'Unknown') {
          location = geoInfo.city || geoInfo.region || geoInfo.country;
        }
        if (!name || name === nodeId) {
          name = geoInfo.city
            ? `${geoInfo.city} ${geoInfo.isp?.split(' ')[0] || ''}`.trim()
            : `${geoInfo.country} VPS`;
        }
      }
    }

    // 月流量统计逻辑
    const trafficResetDay = data.trafficResetDay || 1;
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let cycleStartDate;
    if (currentDay >= trafficResetDay) {
      cycleStartDate = new Date(currentYear, currentMonth, trafficResetDay);
    } else {
      cycleStartDate = new Date(currentYear, currentMonth - 1, trafficResetDay);
    }
    const cycleStartKey = `${cycleStartDate.getFullYear()}-${cycleStartDate.getMonth() + 1}-${cycleStartDate.getDate()}`;

    const trafficKey = `vps:traffic:${nodeId}`;
    let trafficData = null;

    try {
      const rawTraffic = await kv.get(trafficKey, 'json');
      if (rawTraffic) trafficData = rawTraffic;
    } catch (e) {
      console.warn('Error reading traffic data:', e);
    }

    const totalUpload = data.network?.totalUpload || 0;
    const totalDownload = data.network?.totalDownload || 0;

    if (!trafficData || trafficData.cycleStart !== cycleStartKey) {
      trafficData = {
        cycleStart: cycleStartKey,
        baseUpload: totalUpload,
        baseDownload: totalDownload,
      };
      await kv.put(trafficKey, JSON.stringify(trafficData), { expirationTtl: 45 * 24 * 60 * 60 });
    }

    const monthlyUpload = Math.max(0, totalUpload - trafficData.baseUpload);
    const monthlyDownload = Math.max(0, totalDownload - trafficData.baseDownload);
    const monthlyUsed = monthlyUpload + monthlyDownload;

    const nodeData = {
      id: nodeId,
      ipAddress,
      ...data,
      name: name || nodeId,
      location: location || 'Unknown',
      countryCode: countryCode || 'US',
      lastUpdate: Date.now(),
      status: 'online',
      network: {
        ...data.network,
        monthlyUsed: monthlyUsed,
      },
      latency: data.latency || null,
    };

    // 存储节点数据到 KV
    await kv.put(`${KV_PREFIX}${nodeId}`, JSON.stringify(nodeData), { expirationTtl: 20 });

    // 维护节点列表
    let nodeList = [];
    try {
      const rawList = await kv.get(NODES_LIST_KEY, 'json');
      if (rawList && Array.isArray(rawList)) {
        nodeList = rawList;
      }
    } catch (e) {
      console.warn('Error reading nodes list:', e);
    }

    if (!nodeList.includes(nodeId)) {
      nodeList.push(nodeId);
      await kv.put(NODES_LIST_KEY, JSON.stringify(nodeList), { expirationTtl: 365 * 24 * 60 * 60 });
    }

    return new Response(JSON.stringify({
      success: true,
      geo: geoInfo ? { location, countryCode, name } : null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error processing report:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

