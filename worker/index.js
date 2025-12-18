// VPS Monitor - Cloudflare Worker
// 处理 API 请求，静态资源由 assets 自动处理

const KV_PREFIX = 'vps:node:';
const NODES_LIST_KEY = 'vps:nodes:list';
const GEO_CACHE_PREFIX = 'vps:geo:';

const DEFAULTS = {
  monthlyTotal: 1099511627776,
  resetDay: 1,
  refreshInterval: 2000,
};

// ==================== 工具函数 ====================

function parseTrafficSize(value) {
  if (!value) return DEFAULTS.monthlyTotal;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(TB?|GB?)?$/i);
  if (!match) return DEFAULTS.monthlyTotal;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'G').toUpperCase();
  return unit.startsWith('T') 
    ? num * 1024 * 1024 * 1024 * 1024 
    : num * 1024 * 1024 * 1024;
}

function getPreConfiguredServers(env) {
  const servers = new Map();
  if (!env.VPS_SERVERS) return servers;
  try {
    env.VPS_SERVERS.split(',').forEach(item => {
      const [id, name, countryCode, location, expireDate, resetDay, monthlyTotal] = item.trim().split(':');
      if (id && name) {
        servers.set(id.trim(), {
          name: name.trim(),
          countryCode: (countryCode || 'US').trim(),
          location: (location || name).trim(),
          expireDate: expireDate?.trim() || undefined,
          resetDay: parseInt(resetDay) || DEFAULTS.resetDay,
          monthlyTotal: parseTrafficSize(monthlyTotal),
        });
      }
    });
  } catch (e) { console.error('Error parsing VPS_SERVERS:', e); }
  return servers;
}

function generatePlaceholderNode(id, config) {
  return {
    id, name: config.name, countryCode: config.countryCode,
    location: config.location, expireDate: config.expireDate || '',
    status: 'offline', ipAddress: '-', protocol: 'KVM', os: 'Unknown',
    uptime: 0, load: [0, 0, 0],
    cpu: { model: 'Unknown', cores: 1, usage: 0 },
    memory: { total: 0, used: 0, usage: 0 },
    disk: { total: 0, used: 0, usage: 0 },
    network: {
      currentUpload: 0, currentDownload: 0, totalUpload: 0, totalDownload: 0,
      monthlyUsed: 0, monthlyTotal: config.monthlyTotal || DEFAULTS.monthlyTotal,
      resetDay: config.resetDay || DEFAULTS.resetDay,
    },
    lastUpdate: 0,
  };
}

function simplifyOS(os) {
  if (!os || os === 'Unknown') return 'Unknown';
  const l = os.toLowerCase();
  if (l.includes('debian')) return 'Debian';
  if (l.includes('ubuntu')) return 'Ubuntu';
  if (l.includes('centos')) return 'CentOS';
  if (l.includes('alpine')) return 'Alpine';
  if (l.startsWith('linux')) return 'Linux';
  return os.split(' ')[0] || 'Unknown';
}

async function getGeoInfo(ip, kv) {
  if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip === '127.0.0.1') return null;
  
  if (kv) {
    try {
      const cached = await kv.get(`${GEO_CACHE_PREFIX}${ip}`, 'json');
      if (cached) return cached;
    } catch (e) {}
  }
  
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp`);
    const data = await res.json();
    if (data.status === 'success') {
      const geoInfo = {
        country: data.country || '', countryCode: data.countryCode || '',
        city: data.city || '', region: data.regionName || '', isp: data.isp || '',
      };
      if (kv) {
        try { await kv.put(`${GEO_CACHE_PREFIX}${ip}`, JSON.stringify(geoInfo), { expirationTtl: 86400 }); } catch (e) {}
      }
      return geoInfo;
    }
  } catch (e) { console.error('Geo lookup failed:', e); }
  return null;
}

// ==================== API 处理 ====================

async function handleNodes(env) {
  const preConfigured = getPreConfiguredServers(env);
  const now = Date.now();
  const kv = env.VPS_KV;

  if (!kv) {
    const nodes = Array.from(preConfigured.entries()).map(([id, c]) => generatePlaceholderNode(id, c));
    return jsonResponse({ nodes, timestamp: now, count: nodes.length, kvAvailable: false });
  }

  let nodeIds = [];
  try {
    const list = await kv.get(NODES_LIST_KEY, 'json');
    if (Array.isArray(list)) nodeIds = list;
  } catch (e) {}

  const results = await Promise.all(nodeIds.map(id => kv.get(`${KV_PREFIX}${id}`, 'json').catch(() => null)));

  const nodes = nodeIds.map((nodeId, i) => {
    const nodeData = results[i];
    if (!nodeData) return null;

    const isOnline = (now - nodeData.lastUpdate) < 15000;
    if ((now - nodeData.lastUpdate) >= 60000) {
      preConfigured.delete(nodeId);
      return null;
    }

    const preConfig = preConfigured.get(nodeId);
    preConfigured.delete(nodeId);
    const network = nodeData.network || {};

    return {
      ...nodeData,
      name: preConfig?.name || nodeData.name || nodeId,
      countryCode: preConfig?.countryCode || nodeData.countryCode || 'US',
      location: preConfig?.location || nodeData.location || 'Unknown',
      status: isOnline ? 'online' : 'offline',
      os: simplifyOS(nodeData.os),
      cpu: { ...nodeData.cpu, usage: isOnline ? (nodeData.cpu?.usage || 0) : 0 },
      memory: { ...nodeData.memory, usage: isOnline ? (nodeData.memory?.usage || 0) : 0 },
      disk: { ...nodeData.disk, usage: isOnline ? (nodeData.disk?.usage || 0) : 0 },
      network: {
        ...network,
        currentUpload: isOnline ? (network.currentUpload || 0) : 0,
        currentDownload: isOnline ? (network.currentDownload || 0) : 0,
        monthlyTotal: preConfig?.monthlyTotal || network.monthlyTotal || DEFAULTS.monthlyTotal,
      },
    };
  }).filter(Boolean);

  const remaining = Array.from(preConfigured.entries()).map(([id, c]) => generatePlaceholderNode(id, c));
  const allNodes = [...nodes, ...remaining];

  return jsonResponse({
    nodes: allNodes, timestamp: now, count: allNodes.length, kvAvailable: true,
    refreshInterval: parseInt(env.REFRESH_INTERVAL) || DEFAULTS.refreshInterval,
  });
}

async function handleReport(request, env) {
  const token = request.headers.get('x-api-token') || request.headers.get('authorization')?.replace('Bearer ', '');
  const authToken = env.VPS_AUTH_TOKEN || env.API_TOKEN;
  
  if (!authToken || token !== authToken) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const kv = env.VPS_KV;
  if (!kv) {
    return jsonResponse({ error: 'KV not configured' }, 503);
  }

  const body = await request.json();
  const { nodeId, ipAddress, ...data } = body;

  if (!nodeId) {
    return jsonResponse({ error: 'Missing nodeId' }, 400);
  }

  // 地理位置
  let geoInfo = null, location = data.location, countryCode = data.countryCode, name = data.name;
  if (ipAddress && (!location || location === 'Unknown' || !countryCode)) {
    geoInfo = await getGeoInfo(ipAddress, kv);
    if (geoInfo) {
      if (!countryCode || countryCode === 'US') countryCode = geoInfo.countryCode;
      if (!location || location === 'Unknown') location = geoInfo.city || geoInfo.region || geoInfo.country;
      if (!name || name === nodeId) name = geoInfo.city ? `${geoInfo.city} ${geoInfo.isp?.split(' ')[0] || ''}`.trim() : `${geoInfo.country} VPS`;
    }
  }

  // 月流量计算
  const resetDay = data.trafficResetDay || 1;
  const now = new Date();
  const cycleStart = now.getDate() >= resetDay
    ? new Date(now.getFullYear(), now.getMonth(), resetDay)
    : new Date(now.getFullYear(), now.getMonth() - 1, resetDay);
  const cycleKey = `${cycleStart.getFullYear()}-${cycleStart.getMonth() + 1}-${cycleStart.getDate()}`;
  
  const trafficKey = `vps:traffic:${nodeId}`;
  let trafficData = await kv.get(trafficKey, 'json').catch(() => null);
  const totalUp = data.network?.totalUpload || 0, totalDown = data.network?.totalDownload || 0;

  if (!trafficData || trafficData.cycleStart !== cycleKey) {
    trafficData = { cycleStart: cycleKey, baseUpload: totalUp, baseDownload: totalDown };
    await kv.put(trafficKey, JSON.stringify(trafficData), { expirationTtl: 45 * 86400 });
  }

  const monthlyUsed = Math.max(0, totalUp - trafficData.baseUpload) + Math.max(0, totalDown - trafficData.baseDownload);

  // 保存节点数据
  const nodeData = {
    id: nodeId, ipAddress, ...data,
    name: name || nodeId, location: location || 'Unknown', countryCode: countryCode || 'US',
    lastUpdate: Date.now(), status: 'online',
    network: { ...data.network, monthlyUsed },
    latency: data.latency || null,
  };

  await kv.put(`${KV_PREFIX}${nodeId}`, JSON.stringify(nodeData), { expirationTtl: 20 });

  // 更新节点列表
  let nodeList = await kv.get(NODES_LIST_KEY, 'json').catch(() => []) || [];
  if (!nodeList.includes(nodeId)) {
    nodeList.push(nodeId);
    await kv.put(NODES_LIST_KEY, JSON.stringify(nodeList), { expirationTtl: 365 * 86400 });
  }

  return jsonResponse({ success: true, geo: geoInfo ? { location, countryCode, name } : null });
}

// ==================== 响应辅助 ====================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token, Authorization',
    },
  });
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token, Authorization',
    },
  });
}

// ==================== 主入口 ====================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    // API 路由
    if (path === '/api/nodes' && request.method === 'GET') {
      return handleNodes(env);
    }

    if (path === '/api/report' && request.method === 'POST') {
      return handleReport(request, env);
    }

    // 静态资源由 assets 自动处理，这里返回 null 让 Cloudflare 处理
    return env.ASSETS.fetch(request);
  },
};

