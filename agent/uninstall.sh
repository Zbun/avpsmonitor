#!/bin/bash

# ============================================
# VPS Monitor Agent 卸载脚本
# 
# 使用方法:
#   curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/uninstall.sh | bash
# 
# 或本地执行:
#   chmod +x uninstall.sh && ./uninstall.sh
# ============================================

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}"
echo "========================================"
echo "  VPS Monitor Agent 卸载脚本"
echo "========================================"
echo -e "${NC}"

# 配置
INSTALL_DIR="/opt/vps-agent"
SERVICE_NAME="vps-agent"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# 检查是否安装
if [ ! -d "$INSTALL_DIR" ] && [ ! -f "$SERVICE_FILE" ]; then
    echo -e "${YELLOW}未检测到 VPS Monitor Agent 安装${NC}"
    exit 0
fi

# 确认卸载
echo "即将卸载 VPS Monitor Agent"
echo "  安装目录: $INSTALL_DIR"
echo "  服务文件: $SERVICE_FILE"
echo ""
read -p "确认卸载? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消卸载"
    exit 0
fi

echo ""
echo -e "${YELLOW}[1/3] 停止服务...${NC}"

# 停止服务
if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
    systemctl stop $SERVICE_NAME
    echo "  服务已停止"
else
    echo "  服务未运行"
fi

# 禁用服务
if systemctl is-enabled --quiet $SERVICE_NAME 2>/dev/null; then
    systemctl disable $SERVICE_NAME 2>/dev/null
    echo "  服务已禁用"
else
    echo "  服务未启用"
fi

echo -e "${YELLOW}[2/3] 删除文件...${NC}"

# 删除服务文件
if [ -f "$SERVICE_FILE" ]; then
    rm -f "$SERVICE_FILE"
    echo "  已删除: $SERVICE_FILE"
fi

# 重载 systemd
systemctl daemon-reload 2>/dev/null || true

# 删除安装目录
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo "  已删除: $INSTALL_DIR"
fi

echo -e "${YELLOW}[3/3] 清理完成${NC}"

echo ""
echo -e "${GREEN}"
echo "========================================"
echo "  ✓ VPS Monitor Agent 已卸载"
echo "========================================"
echo -e "${NC}"
echo ""
echo "如需重新安装，请运行:"
echo "  curl -fsSL https://raw.githubusercontent.com/Zbun/avpsmonitor/main/agent/install.sh | bash -s -- \\"
echo "    https://your-app.vercel.app \\"
echo "    your-api-token \\"
echo "    node-id"
echo ""
