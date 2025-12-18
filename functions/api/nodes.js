// KV 存储的 key 前缀
const KV_PREFIX = 'vps:node:';
const NODES_LIST_KEY = 'vps:nodes:list';

// 默认值
const DEFAULTS = {
  monthlyTotal: 1099511627776, // 1TB
  resetDay: 1,
  refreshInterval: 2000,
};

// 解析流量配置
function parseTrafficSize(value) {
  if (!value) return DEFAULTS.monthlyTotal;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(TB?|GB?)?$/i);
  if (!match) return DEFAULTS.monthlyTotal;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'G').toUpperCase();
  if (unit.startsWith('T')) {
    return num * 1024 * 1024 * 1024 * 1024;
  }
  return num * 1024 * 1024 * 1024;
}

function getPreConfiguredServers(env) {
  const servers = new Map();
  const config = env.VPS_SERVERS;
  if (!config) return servers;

  try {
    config.split(',').forEach((item) => {
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

function generatePlaceholderNode(id, config) {
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

function simplifyOS(os) {
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
  if (osLower.startsWith('linux')) return 'Linux';
  return os.split(' ')[0] || 'Unknown';
}

export async function onRequest(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const preConfigured = getPreConfiguredServers(env);
    const now = Date.now();

    // 检查 KV 命名空间
    if (!env.VPS_KV) {
      const placeholderNodes = Array.from(preConfigured.entries()).map(([id, config]) =>
        generatePlaceholderNode(id, config)
      );
      return new Response(JSON.stringify({
        nodes: placeholderNodes,
        timestamp: now,
        count: placeholderNodes.length,
        kvAvailable: false,
        message: 'Workers KV not configured. Please bind a KV namespace named VPS_KV.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const kv = env.VPS_KV;

    // 获取所有节点 ID
    let nodeIds = [];
    try {
      const rawList = await kv.get(NODES_LIST_KEY, 'json');
      if (rawList && Array.isArray(rawList)) {
        nodeIds = rawList;
      }
    } catch (e) {
      console.warn('Error fetching node list:', e);
    }

    // 批量获取所有节点数据
    const results = await Promise.all(
      nodeIds.map(async (nodeId) => {
        try {
          const data = await kv.get(`${KV_PREFIX}${nodeId}`, 'json');
          return data;
        } catch (e) {
          console.warn(`Error fetching node ${nodeId}:`, e);
          return null;
        }
      })
    );

    // 处理每个节点的数据
    const nodes = nodeIds.map((nodeId, index) => {
      try {
        const nodeData = results[index];
        if (!nodeData) return null;

        const isOnline = (now - nodeData.lastUpdate) < 15000;
        const isOfflineTooLong = (now - nodeData.lastUpdate) >= 60000;

        if (isOfflineTooLong) {
          preConfigured.delete(nodeId);
          return null;
        }

        const preConfig = preConfigured.get(nodeId);
        preConfigured.delete(nodeId);

        const network = nodeData.network || {};
        const resetDay = preConfig?.resetDay || nodeData.trafficResetDay || network.resetDay || DEFAULTS.resetDay;

        return {
          ...nodeData,
          name: preConfig?.name || nodeData.name || nodeId,
          countryCode: preConfig?.countryCode || nodeData.countryCode || 'US',
          location: preConfig?.location || nodeData.location || 'Unknown',
          status: isOnline ? 'online' : 'offline',
          ipv6Address: nodeData.ipv6Address || '',
          expireDate: preConfig?.expireDate || nodeData.expireDate || '',
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
            monthlyTotal: preConfig?.monthlyTotal || network.monthlyTotal || DEFAULTS.monthlyTotal,
            resetDay: resetDay,
          },
          latency: nodeData.latency || null,
        };
      } catch (e) {
        console.error(`Error processing node ${nodeId}:`, e);
        return null;
      }
    });

    const validNodes = nodes.filter(Boolean);
    const remainingPreConfigured = Array.from(preConfigured.entries()).map(([id, config]) =>
      generatePlaceholderNode(id, config)
    );
    const allNodes = [...validNodes, ...remainingPreConfigured];
    const refreshInterval = parseInt(env.REFRESH_INTERVAL || '', 10) || DEFAULTS.refreshInterval;

    return new Response(JSON.stringify({
      nodes: allNodes,
      timestamp: now,
      count: allNodes.length,
      kvAvailable: true,
      refreshInterval,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    const preConfigured = getPreConfiguredServers(env);
    const placeholderNodes = Array.from(preConfigured.entries()).map(([id, config]) =>
      generatePlaceholderNode(id, config)
    );
    const refreshInterval = parseInt(env.REFRESH_INTERVAL || '', 10) || DEFAULTS.refreshInterval;

    return new Response(JSON.stringify({
      nodes: placeholderNodes,
      timestamp: Date.now(),
      count: placeholderNodes.length,
      error: 'KV connection failed',
      kvAvailable: false,
      refreshInterval,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}


