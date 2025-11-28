#!/usr/bin/env node

/**
 * VPS Monitor Agent
 * 
 * 在 VPS 上运行此脚本，定时向服务器上报系统状态
 * 服务端会根据 IP 自动识别位置信息（国家、城市等）
 * 
 * 最简使用方法:
 *   SERVER_URL=https://xxx.vercel.app API_TOKEN=xxx NODE_ID=node-1 node agent.js
 * 
 * 或配置环境变量后运行:
 *   1. 复制 .env.example 为 .env
 *   2. 修改配置
 *   3. 运行: node agent.js
 *   4. 推荐使用 pm2 守护运行: pm2 start agent.js --name vps-agent
 */

const os = require('os');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// ===== 配置 =====
const CONFIG = {
  // 服务器地址 (部署在 Vercel 上的监控站点)
  serverUrl: process.env.SERVER_URL || 'https://your-monitor.vercel.app',
  // API Token (需要与 Vercel 环境变量中的 API_TOKEN 一致)
  apiToken: process.env.API_TOKEN || 'your-secret-token',
  // 节点 ID (唯一标识)
  nodeId: process.env.NODE_ID || 'node-1',
  // 节点名称 (显示用，留空则自动根据 IP 生成)
  nodeName: process.env.NODE_NAME || '',
  // 位置 (留空则自动根据 IP 识别)
  location: process.env.LOCATION || '',
  // 国家代码 (留空则自动根据 IP 识别)
  countryCode: process.env.COUNTRY_CODE || '',
  // 虚拟化类型
  protocol: process.env.PROTOCOL || 'KVM',
  // 上报间隔 (毫秒)
  interval: parseInt(process.env.INTERVAL) || 5000,
  // VPS 到期时间 (格式: YYYY-MM-DD，如 2025-12-31)
  expireDate: process.env.EXPIRE_DATE || '',
  // 流量重置日 (每月第几天重置，1-28)
  trafficResetDay: parseInt(process.env.TRAFFIC_RESET_DAY) || 1,
};

// 网络流量统计
let lastNetworkStats = null;
let lastNetworkTime = null;
let totalUpload = 0;
let totalDownload = 0;

// 获取网络接口流量
function getNetworkStats() {
  try {
    const interfaces = os.networkInterfaces();
    let rx = 0, tx = 0;

    // Linux: 读取 /proc/net/dev
    if (process.platform === 'linux') {
      const data = require('fs').readFileSync('/proc/net/dev', 'utf-8');
      const lines = data.split('\n').slice(2);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10) continue;
        const iface = parts[0].replace(':', '');
        if (iface === 'lo') continue; // 跳过回环接口
        rx += parseInt(parts[1]) || 0;
        tx += parseInt(parts[9]) || 0;
      }
    }
    // macOS: 使用 netstat
    else if (process.platform === 'darwin') {
      const output = execSync('netstat -ib').toString();
      const lines = output.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10 || parts[0] === 'Name' || parts[0].startsWith('lo')) continue;
        rx += parseInt(parts[6]) || 0;
        tx += parseInt(parts[9]) || 0;
      }
    }

    return { rx, tx };
  } catch (e) {
    console.error('Error getting network stats:', e.message);
    return { rx: 0, tx: 0 };
  }
}

// 计算网络速度
function calculateNetworkSpeed() {
  const now = Date.now();
  const stats = getNetworkStats();

  let uploadSpeed = 0;
  let downloadSpeed = 0;

  if (lastNetworkStats && lastNetworkTime) {
    const timeDiff = (now - lastNetworkTime) / 1000;
    if (timeDiff > 0) {
      uploadSpeed = Math.max(0, (stats.tx - lastNetworkStats.tx) / timeDiff);
      downloadSpeed = Math.max(0, (stats.rx - lastNetworkStats.rx) / timeDiff);
    }
  }

  lastNetworkStats = stats;
  lastNetworkTime = now;
  totalUpload = stats.tx;
  totalDownload = stats.rx;

  return { uploadSpeed, downloadSpeed, totalUpload, totalDownload };
}

// 获取磁盘使用情况
function getDiskUsage() {
  try {
    if (process.platform === 'win32') {
      // Windows
      return { total: 0, used: 0, usage: 0 };
    } else {
      // Linux/macOS
      const output = execSync("df -B1 / | tail -1").toString();
      const parts = output.trim().split(/\s+/);
      const total = parseInt(parts[1]) || 0;
      const used = parseInt(parts[2]) || 0;
      const usage = total > 0 ? (used / total) * 100 : 0;
      return { total, used, usage };
    }
  } catch (e) {
    console.error('Error getting disk usage:', e.message);
    return { total: 0, used: 0, usage: 0 };
  }
}

// 获取 CPU 使用率
function getCpuUsage() {
  return new Promise((resolve) => {
    const cpus1 = os.cpus();
    setTimeout(() => {
      const cpus2 = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      for (let i = 0; i < cpus1.length; i++) {
        const cpu1 = cpus1[i].times;
        const cpu2 = cpus2[i].times;

        const idle = cpu2.idle - cpu1.idle;
        const total = (cpu2.user - cpu1.user) + (cpu2.nice - cpu1.nice) +
          (cpu2.sys - cpu1.sys) + (cpu2.idle - cpu1.idle) +
          (cpu2.irq - cpu1.irq);

        totalIdle += idle;
        totalTick += total;
      }

      const usage = totalTick > 0 ? ((totalTick - totalIdle) / totalTick) * 100 : 0;
      resolve(usage);
    }, 100);
  });
}

// 获取负载
function getLoadAverage() {
  const load = os.loadavg();
  return [load[0] || 0, load[1] || 0, load[2] || 0];
}

// 获取系统信息
async function getSystemInfo() {
  const cpuUsage = await getCpuUsage();
  const network = calculateNetworkSpeed();
  const disk = getDiskUsage();
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // 计算月流量 (简化: 使用当前累计值)
  // 实际应该根据 trafficResetDay 计算
  const monthlyUsed = totalDownload + totalUpload;

  return {
    ipAddress: getPublicIP(),
    ipv6Address: detectIPv6(),
    os: `${os.type()} ${os.release()}`,
    uptime: os.uptime(),
    load: getLoadAverage(),
    status: 'online',
    cpu: {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      usage: cpuUsage,
    },
    memory: {
      total: totalMem,
      used: usedMem,
      usage: (usedMem / totalMem) * 100,
    },
    disk: disk,
    network: {
      currentUpload: network.uploadSpeed,
      currentDownload: network.downloadSpeed,
      totalUpload: network.totalUpload,
      totalDownload: network.totalDownload,
      monthlyUsed: monthlyUsed,
    },
  };
}

// 尝试获取公网 IP
let cachedPublicIP = '';
let cachedPublicIPv6 = '';

// 检测 IPv6 地址
function detectIPv6() {
  if (cachedPublicIPv6) return cachedPublicIPv6;

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // 检查 IPv6 地址（非内部、非链路本地）
        if (iface.family === 'IPv6' && !iface.internal) {
          // 排除链路本地地址 (fe80::)
          if (!iface.address.startsWith('fe80:') && !iface.address.startsWith('::1')) {
            cachedPublicIPv6 = iface.address;
            return cachedPublicIPv6;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error detecting IPv6:', e.message);
  }

  return '';
}

function getPublicIP() {
  if (cachedPublicIP) return cachedPublicIP;

  try {
    // 尝试从网卡获取非内网 IP
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!iface.address.startsWith('10.') &&
            !iface.address.startsWith('172.') &&
            !iface.address.startsWith('192.168.')) {
            cachedPublicIP = iface.address;
            return cachedPublicIP;
          }
        }
      }
    }

    // 返回第一个非内网 IPv4
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          cachedPublicIP = iface.address;
          return cachedPublicIP;
        }
      }
    }
  } catch (e) {
    console.error('Error getting IP:', e.message);
  }

  return '-';
}

// 上报数据到服务器
async function report() {
  try {
    const data = await getSystemInfo();

    // 构建上报数据，只包含有值的配置项
    const reportData = {
      nodeId: CONFIG.nodeId,
      protocol: CONFIG.protocol || 'KVM',
      ...data,
    };

    // 只有手动配置了才发送，否则让服务端自动识别
    if (CONFIG.nodeName) {
      reportData.name = CONFIG.nodeName;
    }
    if (CONFIG.location) {
      reportData.location = CONFIG.location;
    }
    if (CONFIG.countryCode) {
      reportData.countryCode = CONFIG.countryCode;
    }
    // 到期时间
    if (CONFIG.expireDate) {
      reportData.expireDate = CONFIG.expireDate;
    }
    // 流量重置日
    reportData.trafficResetDay = CONFIG.trafficResetDay;

    const payload = JSON.stringify(reportData);

    const url = new URL(`${CONFIG.serverUrl}/api/report`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-API-Token': CONFIG.apiToken,
      },
      // 忽略自签名证书错误 (生产环境不建议)
      rejectUnauthorized: false,
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[${new Date().toISOString()}] Report sent successfully`);
        } else {
          console.error(`[${new Date().toISOString()}] Report failed: ${res.statusCode} ${body}`);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[${new Date().toISOString()}] Request error: ${e.message}`);
    });

    req.write(payload);
    req.end();

  } catch (e) {
    console.error(`[${new Date().toISOString()}] Error:`, e.message);
  }
}

// 启动
console.log('========================================');
console.log('VPS Monitor Agent Starting...');
console.log(`Server URL: ${CONFIG.serverUrl}`);
console.log(`Node ID: ${CONFIG.nodeId}`);
console.log(`Report Interval: ${CONFIG.interval}ms`);
console.log(`IPv6: ${detectIPv6() || 'Not detected'}`);
if (CONFIG.expireDate) {
  console.log(`Expire Date: ${CONFIG.expireDate}`);
}
console.log(`Traffic Reset Day: ${CONFIG.trafficResetDay}`);
console.log('========================================');

// 初始化网络统计
calculateNetworkSpeed();

// 立即上报一次
setTimeout(report, 1000);

// 定时上报
setInterval(report, CONFIG.interval);

// 保持进程运行
process.on('SIGINT', () => {
  console.log('\nAgent stopped.');
  process.exit(0);
});
