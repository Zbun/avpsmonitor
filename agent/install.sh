#!/bin/bash

# VPS Monitor Agent 一键安装脚本
# 使用方法: curl -fsSL https://xxx.vercel.app/install.sh | bash -s -- <SERVER_URL> <API_TOKEN> [NODE_ID] [EXPIRE_DATE] [TRAFFIC_RESET_DAY]
# 位置信息会根据 VPS IP 自动识别！

set -e

SERVER_URL="${1:-https://your-monitor.vercel.app}"
API_TOKEN="${2:-your-secret-token}"
NODE_ID="${3:-$(hostname)}"
# 新增可配置项
EXPIRE_DATE="${4:-}"       # VPS 到期时间，格式: YYYY-MM-DD
TRAFFIC_RESET_DAY="${5:-1}" # 流量重置日，1-28

INSTALL_DIR="/opt/vps-agent"
SERVICE_NAME="vps-agent"

echo "=========================================="
echo "VPS Monitor Agent Installer"
echo "=========================================="
echo "Server URL: $SERVER_URL"
echo "Node ID: $NODE_ID"
echo "位置信息: 将根据 IP 自动识别"
[ -n "$EXPIRE_DATE" ] && echo "到期时间: $EXPIRE_DATE"
echo "流量重置日: 每月${TRAFFIC_RESET_DAY}号"
echo "Install Dir: $INSTALL_DIR"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node -v)"

# 创建安装目录
sudo mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 下载 agent 文件
cat > agent.js << 'AGENT_EOF'
#!/usr/bin/env node
const os = require('os');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');

const CONFIG = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  apiToken: process.env.API_TOKEN || 'your-secret-token',
  nodeId: process.env.NODE_ID || 'node-1',
  interval: parseInt(process.env.INTERVAL) || 5000,
  expireDate: process.env.EXPIRE_DATE || '',
  trafficResetDay: parseInt(process.env.TRAFFIC_RESET_DAY) || 1,
};

let lastNetworkStats = null;
let lastNetworkTime = null;

function getNetworkStats() {
  try {
    let rx = 0, tx = 0;
    if (process.platform === 'linux' && fs.existsSync('/proc/net/dev')) {
      const data = fs.readFileSync('/proc/net/dev', 'utf-8');
      const lines = data.split('\n').slice(2);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10) continue;
        const iface = parts[0].replace(':', '');
        if (iface === 'lo') continue;
        rx += parseInt(parts[1]) || 0;
        tx += parseInt(parts[9]) || 0;
      }
    }
    return { rx, tx };
  } catch (e) {
    return { rx: 0, tx: 0 };
  }
}

function calculateNetworkSpeed() {
  const now = Date.now();
  const stats = getNetworkStats();
  let uploadSpeed = 0, downloadSpeed = 0;
  
  if (lastNetworkStats && lastNetworkTime) {
    const timeDiff = (now - lastNetworkTime) / 1000;
    if (timeDiff > 0) {
      uploadSpeed = Math.max(0, (stats.tx - lastNetworkStats.tx) / timeDiff);
      downloadSpeed = Math.max(0, (stats.rx - lastNetworkStats.rx) / timeDiff);
    }
  }
  
  lastNetworkStats = stats;
  lastNetworkTime = now;
  return { uploadSpeed, downloadSpeed, totalUpload: stats.tx, totalDownload: stats.rx };
}

function getDiskUsage() {
  try {
    const output = execSync("df -B1 / | tail -1").toString();
    const parts = output.trim().split(/\s+/);
    const total = parseInt(parts[1]) || 0;
    const used = parseInt(parts[2]) || 0;
    return { total, used, usage: total > 0 ? (used / total) * 100 : 0 };
  } catch (e) {
    return { total: 0, used: 0, usage: 0 };
  }
}

async function getCpuUsage() {
  return new Promise((resolve) => {
    const cpus1 = os.cpus();
    setTimeout(() => {
      const cpus2 = os.cpus();
      let totalIdle = 0, totalTick = 0;
      for (let i = 0; i < cpus1.length; i++) {
        const cpu1 = cpus1[i].times, cpu2 = cpus2[i].times;
        const idle = cpu2.idle - cpu1.idle;
        const total = (cpu2.user - cpu1.user) + (cpu2.nice - cpu1.nice) + 
                     (cpu2.sys - cpu1.sys) + idle + (cpu2.irq - cpu1.irq);
        totalIdle += idle;
        totalTick += total;
      }
      resolve(totalTick > 0 ? ((totalTick - totalIdle) / totalTick) * 100 : 0);
    }, 100);
  });
}

function getIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '-';
}

function getIPv6() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv6' && !iface.internal && !iface.address.startsWith('fe80:')) {
        return iface.address;
      }
    }
  }
  return '';
}

function getOSInfo() {
  if (process.platform === 'linux') {
    try {
      if (fs.existsSync('/etc/os-release')) {
        const content = fs.readFileSync('/etc/os-release', 'utf-8');
        const lines = content.split('\n');
        let prettyName = '';
        let name = '';
        let version = '';
        for (const line of lines) {
          if (line.startsWith('PRETTY_NAME=')) {
            prettyName = line.split('=')[1].replace(/"/g, '').trim();
          } else if (line.startsWith('NAME=')) {
            name = line.split('=')[1].replace(/"/g, '').trim();
          } else if (line.startsWith('VERSION_ID=')) {
            version = line.split('=')[1].replace(/"/g, '').trim();
          }
        }
        if (prettyName) return prettyName;
        if (name) return version ? name + ' ' + version : name;
      }
    } catch (e) {}
    return 'Linux ' + os.release();
  }
  return os.type() + ' ' + os.release();
}

async function getSystemInfo() {
  const cpuUsage = await getCpuUsage();
  const network = calculateNetworkSpeed();
  const disk = getDiskUsage();
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();
  
  return {
    ipAddress: getIP(),
    ipv6Address: getIPv6(),
    os: getOSInfo(),
    uptime: os.uptime(),
    load: os.loadavg(),
    status: 'online',
    cpu: { model: cpus[0]?.model || 'Unknown', cores: cpus.length, usage: cpuUsage },
    memory: { total: totalMem, used: usedMem, usage: (usedMem / totalMem) * 100 },
    disk: disk,
    network: {
      currentUpload: network.uploadSpeed,
      currentDownload: network.downloadSpeed,
      totalUpload: network.totalUpload,
      totalDownload: network.totalDownload,
      monthlyUsed: network.totalDownload + network.totalUpload,
    },
  };
}

async function report() {
  try {
    const data = await getSystemInfo();
    // 直接展开系统数据，不嵌套在 data 对象中
    const reportData = { 
      nodeId: CONFIG.nodeId, 
      protocol: 'KVM', 
      ...data,
      trafficResetDay: CONFIG.trafficResetDay,
    };
    if (CONFIG.expireDate) {
      reportData.expireDate = CONFIG.expireDate;
    }
    const payload = JSON.stringify(reportData);
    const url = new URL(`${CONFIG.serverUrl}/api/report`);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-API-Token': CONFIG.apiToken,
      },
      rejectUnauthorized: false,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[${new Date().toISOString()}] OK`);
        } else {
          console.error(`[${new Date().toISOString()}] Error: ${res.statusCode}`);
        }
      });
    });
    
    req.on('error', (e) => console.error(`[${new Date().toISOString()}] ${e.message}`));
    req.write(payload);
    req.end();
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ${e.message}`);
  }
}

console.log('VPS Agent Starting...');
console.log(`Server: ${CONFIG.serverUrl}, Node: ${CONFIG.nodeId}`);
calculateNetworkSpeed();
setTimeout(report, 1000);
setInterval(report, CONFIG.interval);
AGENT_EOF

# 创建环境配置
cat > .env << EOF
SERVER_URL=$SERVER_URL
API_TOKEN=$API_TOKEN
NODE_ID=$NODE_ID
INTERVAL=5000
TRAFFIC_RESET_DAY=$TRAFFIC_RESET_DAY
EOF

# 如果指定了到期时间，也写入配置
[ -n "$EXPIRE_DATE" ] && echo "EXPIRE_DATE=$EXPIRE_DATE" >> .env

# 创建 systemd 服务
sudo cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=VPS Monitor Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME

echo ""
echo "=========================================="
echo "Installation completed!"
echo "=========================================="
echo "Check status: sudo systemctl status $SERVICE_NAME"
echo "View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "=========================================="
