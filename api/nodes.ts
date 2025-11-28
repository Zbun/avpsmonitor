import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

// KV 存储的 key 前缀
const KV_PREFIX = 'vps:node:';

// 默认值
const DEFAULTS = {
  monthlyTotal: 1099511627776, // 1TB
  resetDay: 1,
};

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
    // 获取所有节点 ID
    const nodeIds = await kv.smembers('vps:nodes') || [];
    const now = Date.now();

    // 获取每个节点的数据
    const nodes = await Promise.all(
      nodeIds.map(async (nodeId) => {
        const data = await kv.get(`${KV_PREFIX}${nodeId}`);
        if (!data) {
          // 节点数据过期，从列表中移除
          await kv.srem('vps:nodes', nodeId);
          return null;
        }

        // 检查是否超时（60秒无更新视为离线）
        const nodeData = data as any;
        const isOnline = (now - nodeData.lastUpdate) < 60000;

        // 确保 network 对象有所有必需字段
        const network = nodeData.network || {};

        return {
          ...nodeData,
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
      })
    );

    // 过滤掉 null 值
    const validNodes = nodes.filter(Boolean);

    return res.status(200).json({
      nodes: validNodes,
      timestamp: now,
      count: validNodes.length
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return res.status(500).json({ error: 'Internal server error', nodes: [] });
  }
}
