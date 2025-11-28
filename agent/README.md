# VPS Monitor Agent

VPS 监控 Agent，运行在被监控的 VPS 上，定时上报系统状态到部署在 Vercel 上的监控站点。

## 功能特性

- 📊 收集 CPU、内存、磁盘使用率
- 🌐 监控网络上传/下载速度
- ⏱️ 系统运行时间和负载
- 🔄 自动定时上报（默认 5 秒）
- 🔐 Token 认证保护
- 🚀 零依赖，纯 Node.js 实现
- 🌍 **自动识别 IP 位置**（国家、城市、ISP）

## 一键安装

在需要监控的 VPS 上执行（只需 3 个参数！）：

```bash
curl -fsSL https://your-monitor.vercel.app/install.sh | bash -s -- \
  https://your-monitor.vercel.app \
  your-api-token \
  node-1
```

**位置信息会根据 VPS 的 IP 地址自动识别！** 无需手动配置国家、城市等信息。

参数说明：
1. `SERVER_URL` - 你的监控站点地址（部署在 Vercel 上）
2. `API_TOKEN` - API 认证 Token（需与 Vercel 环境变量一致）
3. `NODE_ID` - 节点唯一标识（可选，默认使用主机名）

如果需要手动指定位置（覆盖自动识别），可以添加更多参数：
```bash
curl -fsSL https://xxx/install.sh | bash -s -- \
  https://your-monitor.vercel.app \
  your-api-token \
  node-1 \
  "香港CN2" \
  HK \
  "Hong Kong"
```

## 手动安装

### 1. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. 下载 Agent

```bash
sudo mkdir -p /opt/vps-agent
cd /opt/vps-agent
```

将 `agent.js` 文件复制到此目录。

### 3. 配置环境变量

创建 `.env` 文件：

```bash
cat > .env << EOF
SERVER_URL=https://your-monitor.vercel.app
API_TOKEN=your-secret-token
NODE_ID=node-1
NODE_NAME=香港CN2
COUNTRY_CODE=HK
LOCATION=Hong Kong
INTERVAL=5000
EOF
```

### 4. 创建系统服务

```bash
sudo cat > /etc/systemd/system/vps-agent.service << EOF
[Unit]
Description=VPS Monitor Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/vps-agent
EnvironmentFile=/opt/vps-agent/.env
ExecStart=/usr/bin/node /opt/vps-agent/agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 5. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable vps-agent
sudo systemctl start vps-agent
```

## 配置说明

| 环境变量 | 说明 | 默认值 | 是否必需 |
|---------|------|--------|---------|
| SERVER_URL | 监控站点地址（Vercel 部署） | - | ✅ 必需 |
| API_TOKEN | API 认证 Token | - | ✅ 必需 |
| NODE_ID | 节点唯一标识 | 主机名 | 可选 |
| NODE_NAME | 节点显示名称 | 自动识别 | 可选 |
| COUNTRY_CODE | 国家代码（显示国旗） | 自动识别 | 可选 |
| LOCATION | 位置描述 | 自动识别 | 可选 |
| INTERVAL | 上报间隔（毫秒） | 5000 | 可选 |

> 💡 位置相关的配置（NODE_NAME、COUNTRY_CODE、LOCATION）留空时，服务端会根据 VPS 的公网 IP 自动识别！

## 常用命令

```bash
# 查看服务状态
sudo systemctl status vps-agent

# 查看实时日志
sudo journalctl -u vps-agent -f

# 重启服务
sudo systemctl restart vps-agent

# 停止服务
sudo systemctl stop vps-agent

# 禁用开机自启
sudo systemctl disable vps-agent
```

## 卸载

```bash
sudo systemctl stop vps-agent
sudo systemctl disable vps-agent
sudo rm /etc/systemd/system/vps-agent.service
sudo rm -rf /opt/vps-agent
sudo systemctl daemon-reload
```

## 收集的数据

Agent 会收集并上报以下信息：

- **CPU**: 使用率、核心数、型号
- **内存**: 总量、已用、使用率
- **磁盘**: 总量、已用、使用率
- **网络**: 实时上传/下载速度、总流量
- **系统**: 运行时间、负载、操作系统信息、IP 地址

## 故障排查

### Agent 无法启动

1. 检查 Node.js 是否安装：`node -v`
2. 检查配置文件是否存在：`cat /opt/vps-agent/.env`
3. 查看错误日志：`sudo journalctl -u vps-agent -n 50`

### 数据无法上报

1. 检查网络连通性：`curl -I $SERVER_URL`
2. 检查 Token 是否正确
3. 检查 Node ID 是否与服务端配置一致

### 网络速度显示为 0

这是正常的，Agent 启动后需要等待一个上报周期（默认 5 秒）才能计算出网络速度。

## License

MIT
