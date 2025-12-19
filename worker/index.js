// VPS Monitor - Cloudflare Worker (D1 版本)
// 处理 API 请求，静态资源由 assets 自动处理

const DEFAULTS = {
  monthlyTotal: 1099511627776,
  resetDay: 1,
  refreshInterval: 2000,
};

// ==================== 数据库初始化 ====================

async function initDB(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      data TEXT,
      updated_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS traffic (
      node_id TEXT PRIMARY KEY,
      cycle_start TEXT,
      base_upload INTEGER,
      base_download INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS geo_cache (
      ip TEXT PRIMARY KEY,
      data TEXT,
      created_at INTEGER
    )`),
  ]);
}

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

// IPv4 脱敏：1.2.3.4 -> 1.***.4
function maskIPv4(ip) {
  if (!ip || ip === '-') return ip;
  const parts = ip.split('.');
  if (parts.length !== 4) return null; // 非 IPv4 返回 null
  return `${parts[0]}.***.${parts[3]}`;
}

async function getGeoInfo(ip, db) {
  if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip === '127.0.0.1') return null;

  if (db) {
    try {
      const cached = await db.prepare('SELECT data, created_at FROM geo_cache WHERE ip = ?').bind(ip).first();
      if (cached && (Date.now() - cached.created_at) < 86400000) {
        return JSON.parse(cached.data);
      }
    } catch (e) { }
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp`);
    const data = await res.json();
    if (data.status === 'success') {
      const geoInfo = {
        country: data.country || '', countryCode: data.countryCode || '',
        city: data.city || '', region: data.regionName || '', isp: data.isp || '',
      };
      if (db) {
        try {
          await db.prepare('INSERT OR REPLACE INTO geo_cache (ip, data, created_at) VALUES (?, ?, ?)')
            .bind(ip, JSON.stringify(geoInfo), Date.now()).run();
        } catch (e) { }
      }
      return geoInfo;
    }
  } catch (e) { console.error('Geo lookup failed:', e); }
  return null;
}

// ==================== API 处理 ====================

async function handleNodes(env) {
  const preConfigured = getPreConfiguredServers(env);
  const configOrder = Array.from(preConfigured.keys()); // 保持配置顺序
  const now = Date.now();
  const db = env.VPS_DB;

  if (!db) {
    const nodes = Array.from(preConfigured.entries()).map(([id, c]) => generatePlaceholderNode(id, c));
    return jsonResponse({ nodes, timestamp: now, count: nodes.length, d1Available: false });
  }

  try {
    await initDB(db);
  } catch (e) { }

  // 获取数据库中的节点数据
  const dbNodes = new Map();
  try {
    const result = await db.prepare('SELECT id, data, updated_at FROM nodes').all();
    for (const row of (result.results || [])) {
      dbNodes.set(row.id, { data: JSON.parse(row.data), updated_at: row.updated_at });
    }
  } catch (e) { }

  // 按 VPS_SERVERS 顺序构建节点列表
  const allNodes = [];
  const processedIds = new Set();

  // 先按配置顺序处理
  for (const nodeId of configOrder) {
    const preConfig = preConfigured.get(nodeId);
    const dbNode = dbNodes.get(nodeId);
    processedIds.add(nodeId);

    if (!dbNode || (now - dbNode.updated_at) >= 60000) {
      // 无数据或过期超过60秒，显示占位
      allNodes.push(generatePlaceholderNode(nodeId, preConfig));
      continue;
    }

    const nodeData = dbNode.data;
    const isOnline = (now - dbNode.updated_at) < 15000;
    const network = nodeData.network || {};

    allNodes.push({
      ...nodeData,
      name: preConfig?.name || nodeData.name || nodeId,
      countryCode: preConfig?.countryCode || nodeData.countryCode || 'US',
      location: preConfig?.location || nodeData.location || 'Unknown',
      expireDate: preConfig?.expireDate || nodeData.expireDate || '',
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
        resetDay: preConfig?.resetDay || network.resetDay || DEFAULTS.resetDay,
      },
    });
  }

  // 处理不在配置中但在数据库中的节点（追加到末尾）
  for (const [nodeId, dbNode] of dbNodes) {
    if (processedIds.has(nodeId)) continue;
    if ((now - dbNode.updated_at) >= 60000) continue;

    const nodeData = dbNode.data;
    const isOnline = (now - dbNode.updated_at) < 15000;
    const network = nodeData.network || {};

    allNodes.push({
      ...nodeData,
      status: isOnline ? 'online' : 'offline',
      os: simplifyOS(nodeData.os),
      cpu: { ...nodeData.cpu, usage: isOnline ? (nodeData.cpu?.usage || 0) : 0 },
      memory: { ...nodeData.memory, usage: isOnline ? (nodeData.memory?.usage || 0) : 0 },
      disk: { ...nodeData.disk, usage: isOnline ? (nodeData.disk?.usage || 0) : 0 },
      network: {
        ...network,
        currentUpload: isOnline ? (network.currentUpload || 0) : 0,
        currentDownload: isOnline ? (network.currentDownload || 0) : 0,
      },
    });
  }

  return jsonResponse({
    nodes: allNodes, timestamp: now, count: allNodes.length, d1Available: true,
    refreshInterval: parseInt(env.REFRESH_INTERVAL) || DEFAULTS.refreshInterval,
  });
}

async function handleReport(request, env) {
  try {
    const token = request.headers.get('x-api-token') || request.headers.get('authorization')?.replace('Bearer ', '');
    const authToken = env.VPS_AUTH_TOKEN || env.API_TOKEN;

    if (!authToken || token !== authToken) {
      return jsonResponse({ error: 'Unauthorized', debug: { hasToken: !!token, hasAuthToken: !!authToken } }, 401);
    }

    const db = env.VPS_DB;
    if (!db) {
      return jsonResponse({ error: 'D1 not configured' }, 503);
    }

    try {
      await initDB(db);
    } catch (e) { }

    const body = await request.json();
    const { nodeId, ipAddress, ...data } = body;

    if (!nodeId) {
      return jsonResponse({ error: 'Missing nodeId' }, 400);
    }

    // 地理位置
    let geoInfo = null, location = data.location, countryCode = data.countryCode, name = data.name;
    if (ipAddress && (!location || location === 'Unknown' || !countryCode)) {
      geoInfo = await getGeoInfo(ipAddress, db);
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

    const totalUp = data.network?.totalUpload || 0, totalDown = data.network?.totalDownload || 0;

    let trafficData = null;
    try {
      trafficData = await db.prepare('SELECT cycle_start, base_upload, base_download FROM traffic WHERE node_id = ?')
        .bind(nodeId).first();
    } catch (e) { }

    if (!trafficData || trafficData.cycle_start !== cycleKey) {
      trafficData = { cycle_start: cycleKey, base_upload: totalUp, base_download: totalDown };
      await db.prepare('INSERT OR REPLACE INTO traffic (node_id, cycle_start, base_upload, base_download) VALUES (?, ?, ?, ?)')
        .bind(nodeId, cycleKey, totalUp, totalDown).run();
    }

    const monthlyUsed = Math.max(0, totalUp - trafficData.base_upload) + Math.max(0, totalDown - trafficData.base_download);

    // IP 脱敏处理：IPv4 只保留首尾，IPv6 不存储
    const maskedIP = maskIPv4(ipAddress);
    // maskedIP 为 null 表示非 IPv4（可能是 IPv6），不存储

    // 保存节点数据
    const nodeData = {
      id: nodeId,
      ipAddress: maskedIP || '-', // IPv6 不存储，显示为 -
      ...data,
      name: name || nodeId, location: location || 'Unknown', countryCode: countryCode || 'US',
      lastUpdate: Date.now(), status: 'online',
      network: { ...data.network, monthlyUsed },
      latency: data.latency || null,
    };

    await db.prepare('INSERT OR REPLACE INTO nodes (id, data, updated_at) VALUES (?, ?, ?)')
      .bind(nodeId, JSON.stringify(nodeData), Date.now()).run();

    return jsonResponse({ success: true, geo: geoInfo ? { location, countryCode, name } : null });
  } catch (error) {
    console.error('Error in handleReport:', error);
    return jsonResponse({
      error: 'Report processing failed',
      message: error.message,
      stack: error.stack
    }, 500);
  }
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
    try {
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

      // 静态资源由 assets 自动处理
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      // 如果没有 ASSETS，返回 404
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      // 捕获所有错误，返回详细信息
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
