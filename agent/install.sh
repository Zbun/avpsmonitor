#!/bin/bash

# ============================================
# VPS Monitor Agent 一键安装脚本
# 
# Shell 轻量版，内存占用 < 1MB，无需 Node.js
# 
# 使用方法:
#   curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/install.sh | bash -s -- \
#     https://your-app.vercel.app \
#     your-api-token \
#     node-id
# ============================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "========================================"
echo "  VPS Monitor Agent 安装脚本"
echo "  (Shell 轻量版，内存 < 1MB)"
echo "========================================"
echo -e "${NC}"

# 检查参数
SERVER_URL="${1:-}"
API_TOKEN="${2:-}"
NODE_ID="${3:-$(hostname)}"

if [ -z "$SERVER_URL" ] || [ -z "$API_TOKEN" ]; then
    echo -e "${RED}错误: 缺少必需参数${NC}"
    echo ""
    echo "使用方法:"
    echo "  curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/install.sh | bash -s -- \\"
    echo "    https://your-app.vercel.app \\"
    echo "    your-api-token \\"
    echo "    node-id"
    echo ""
    echo "参数说明:"
    echo "  SERVER_URL  - Vercel 部署地址 (必需)"
    echo "  API_TOKEN   - API 认证 Token (必需)"
    echo "  NODE_ID     - 节点 ID (可选，默认使用主机名)"
    echo ""
    exit 1
fi

echo "Server URL: $SERVER_URL"
echo "Node ID: $NODE_ID"
echo "位置信息: 将根据 IP 自动识别"
echo ""

# 检查依赖
echo -e "${YELLOW}[1/5] 检查依赖...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: 未找到 $1${NC}"
        return 1
    fi
    return 0
}

missing_deps=0
for cmd in curl awk grep; do
    if ! check_command $cmd; then
        missing_deps=1
    fi
done

# bc 是可选的，没有的话尝试安装
if ! command -v bc &> /dev/null; then
    echo -e "${YELLOW}bc 未安装，尝试安装...${NC}"
    if command -v apt-get &> /dev/null; then
        apt-get update -qq && apt-get install -y -qq bc 2>/dev/null || true
    elif command -v yum &> /dev/null; then
        yum install -y -q bc 2>/dev/null || true
    elif command -v apk &> /dev/null; then
        apk add --quiet bc 2>/dev/null || true
    fi
fi

if [ $missing_deps -eq 1 ]; then
    echo -e "${RED}请先安装缺失的依赖${NC}"
    exit 1
fi

echo -e "${GREEN}依赖检查通过${NC}"

# 清理旧安装
INSTALL_DIR="/opt/vps-agent"
SERVICE_FILE="/etc/systemd/system/vps-agent.service"
SERVICE_NAME="vps-agent"

echo -e "${YELLOW}[2/5] 清理旧安装...${NC}"

if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
    echo "停止旧服务..."
    systemctl stop $SERVICE_NAME 2>/dev/null || true
fi

if systemctl is-enabled --quiet $SERVICE_NAME 2>/dev/null; then
    echo "禁用旧服务..."
    systemctl disable $SERVICE_NAME 2>/dev/null || true
fi

if [ -f "$SERVICE_FILE" ]; then
    rm -f "$SERVICE_FILE"
fi

if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
fi

systemctl daemon-reload 2>/dev/null || true
echo -e "${GREEN}旧安装已清理${NC}"

# 创建安装目录
echo -e "${YELLOW}[3/5] 下载 Agent 脚本...${NC}"
mkdir -p "$INSTALL_DIR"

# 下载 Agent 脚本
curl -fsSL "https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/agent.sh" -o "$INSTALL_DIR/agent.sh"
chmod +x "$INSTALL_DIR/agent.sh"
echo -e "${GREEN}下载完成${NC}"

# 创建环境配置
echo -e "${YELLOW}[4/5] 创建配置文件...${NC}"
cat > "$INSTALL_DIR/.env" << EOF
SERVER_URL=$SERVER_URL
API_TOKEN=$API_TOKEN
NODE_ID=$NODE_ID
INTERVAL=4
TRAFFIC_RESET_DAY=1
EOF
echo -e "${GREEN}配置文件已创建${NC}"

# 创建 systemd 服务
echo -e "${YELLOW}[5/5] 创建系统服务...${NC}"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=VPS Monitor Agent
After=network.target

[Service]
Type=simple
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/bin/bash $INSTALL_DIR/agent.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
systemctl daemon-reload
systemctl enable vps-agent
systemctl start vps-agent

# 检查状态
sleep 2
if systemctl is-active --quiet vps-agent; then
    echo -e "${GREEN}"
    echo "========================================"
    echo "  ✓ 安装成功！"
    echo "========================================"
    echo -e "${NC}"
    echo ""
    echo "服务状态: $(systemctl is-active vps-agent)"
    echo "内存占用: < 1MB"
    echo ""
    echo "常用命令:"
    echo "  systemctl status vps-agent   # 查看状态"
    echo "  journalctl -u vps-agent -f   # 查看日志"
    echo "  systemctl restart vps-agent  # 重启服务"
    echo ""
    echo "卸载:"
    echo "  curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/uninstall.sh | bash"
    echo ""
else
    echo -e "${RED}"
    echo "========================================"
    echo "  ✗ 服务启动失败"
    echo "========================================"
    echo -e "${NC}"
    echo "请检查日志: journalctl -u vps-agent -n 50"
    exit 1
fi
