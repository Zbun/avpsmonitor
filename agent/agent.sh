#!/bin/bash

# ============================================
# VPS Monitor Agent - Shell 版本
# 
# 轻量级监控 Agent，内存占用 < 1MB
# 依赖: bash, curl, awk, grep
#
# 使用方法:
#   chmod +x agent.sh
#   ./agent.sh https://your-monitor.vercel.app your-api-token node-id
#
# 或设置环境变量:
#   export SERVER_URL=https://your-monitor.vercel.app
#   export API_TOKEN=your-api-token
#   export NODE_ID=node-1
#   ./agent.sh
# ============================================

set -e

# ===== 配置 =====
SERVER_URL="${SERVER_URL:-${1:-https://your-monitor.vercel.app}}"
API_TOKEN="${API_TOKEN:-${2:-your-secret-token}}"
NODE_ID="${NODE_ID:-${3:-node-1}}"
NODE_NAME="${NODE_NAME:-}"  # 自定义主机名（留空则使用 hostname）
INTERVAL="${INTERVAL:-4}"  # 上报间隔（秒）
TRAFFIC_RESET_DAY="${TRAFFIC_RESET_DAY:-1}"

# 用于计算网络速度的变量
LAST_RX=0
LAST_TX=0
LAST_TIME_MS=0

# 缓存的网卡名称和时间戳函数类型
CACHED_INTERFACE=""
USE_MS_TIMESTAMP=0

# ===== 工具函数 =====

# 初始化时间戳精度检测
init_timestamp() {
    if date +%s%3N >/dev/null 2>&1; then
        # 验证输出是否真的是毫秒级（13位数字）
        local ts=$(date +%s%3N)
        if [ ${#ts} -ge 13 ]; then
            USE_MS_TIMESTAMP=1
        fi
    fi
}

# 获取毫秒级时间戳（使用缓存的检测结果）
get_time_ms() {
    if [ $USE_MS_TIMESTAMP -eq 1 ]; then
        date +%s%3N
    else
        # 降级到秒级并乘以 1000
        echo $(($(date +%s) * 1000))
    fi
}

# 初始化网卡检测
init_interface() {
    # 优先获取默认路由的网卡
    CACHED_INTERFACE=$(ip route 2>/dev/null | grep default | awk '{print $5}' | head -1)
    if [ -z "$CACHED_INTERFACE" ]; then
        # 备选：获取第一个非 lo 网卡
        CACHED_INTERFACE=$(ls /sys/class/net | grep -v lo | head -1)
    fi
}

# 获取主网卡名称（使用缓存）
get_main_interface() {
    echo "$CACHED_INTERFACE"
}

# 获取主机名（优先使用 NODE_NAME 环境变量）
get_hostname() {
    if [ -n "$NODE_NAME" ]; then
        echo "$NODE_NAME"
    else
        hostname 2>/dev/null || cat /etc/hostname 2>/dev/null || echo ""
    fi
}

# 获取 CPU 使用率
get_cpu_usage() {
    # 读取两次 /proc/stat 计算 CPU 使用率
    local cpu1=($(head -1 /proc/stat | awk '{print $2,$3,$4,$5,$6,$7,$8}'))
    sleep 0.2
    local cpu2=($(head -1 /proc/stat | awk '{print $2,$3,$4,$5,$6,$7,$8}'))
    
    local idle1=${cpu1[3]}
    local idle2=${cpu2[3]}
    local total1=0
    local total2=0
    
    for val in "${cpu1[@]}"; do total1=$((total1 + val)); done
    for val in "${cpu2[@]}"; do total2=$((total2 + val)); done
    
    local diff_idle=$((idle2 - idle1))
    local diff_total=$((total2 - total1))
    
    if [ $diff_total -eq 0 ]; then
        echo "0"
    else
        echo "scale=1; (1 - $diff_idle / $diff_total) * 100" | bc 2>/dev/null || echo "0"
    fi
}

# 获取内存信息 (返回: total used usage)
get_memory_info() {
    local total=$(grep MemTotal /proc/meminfo | awk '{print $2 * 1024}')
    local available=$(grep MemAvailable /proc/meminfo | awk '{print $2 * 1024}')
    local used=$((total - available))
    local usage=$(echo "scale=1; $used * 100 / $total" | bc 2>/dev/null || echo "0")
    echo "$total $used $usage"
}

# 获取磁盘信息 (返回: total used usage)
get_disk_info() {
    local disk=$(df -B1 / 2>/dev/null | tail -1)
    local total=$(echo "$disk" | awk '{print $2}')
    local used=$(echo "$disk" | awk '{print $3}')
    local usage=$(echo "$disk" | awk '{print $5}' | tr -d '%')
    echo "$total $used $usage"
}

# 获取网络流量 (返回: rx tx)
get_network_bytes() {
    if [ -z "$CACHED_INTERFACE" ]; then
        echo "0 0"
        return
    fi
    
    local rx=$(cat /sys/class/net/$CACHED_INTERFACE/statistics/rx_bytes 2>/dev/null || echo 0)
    local tx=$(cat /sys/class/net/$CACHED_INTERFACE/statistics/tx_bytes 2>/dev/null || echo 0)
    echo "$rx $tx"
}

# 计算网络速度
calculate_network_speed() {
    local now=$(get_time_ms)
    local net=($(get_network_bytes))
    local rx=${net[0]}
    local tx=${net[1]}
    
    local rx_speed=0
    local tx_speed=0
    
    if [ $LAST_TIME_MS -gt 0 ]; then
        local elapsed_ms=$((now - LAST_TIME_MS))
        if [ $elapsed_ms -gt 0 ]; then
            # 计算每秒字节数: (字节差 * 1000) / 毫秒差
            rx_speed=$(( (rx - LAST_RX) * 1000 / elapsed_ms ))
            tx_speed=$(( (tx - LAST_TX) * 1000 / elapsed_ms ))
            # 防止负数（系统重启或计数器溢出）
            [ $rx_speed -lt 0 ] && rx_speed=0
            [ $tx_speed -lt 0 ] && tx_speed=0
        fi
    fi
    
    LAST_RX=$rx
    LAST_TX=$tx
    LAST_TIME_MS=$now
    
    # 返回: 下载速度 上传速度 总下载 总上传
    echo "$rx_speed $tx_speed $rx $tx"
}

# 获取系统负载
get_load_average() {
    cat /proc/loadavg | awk '{print $1","$2","$3}'
}

# 获取运行时间（秒）
get_uptime() {
    cat /proc/uptime | awk '{print int($1)}'
}

# 获取 CPU 型号
get_cpu_model() {
    grep "model name" /proc/cpuinfo 2>/dev/null | head -1 | cut -d: -f2 | sed 's/^ *//' || echo "Unknown"
}

# 获取 CPU 核心数
get_cpu_cores() {
    grep -c processor /proc/cpuinfo 2>/dev/null || echo "1"
}

# 获取操作系统信息
get_os_info() {
    if [ -f /etc/os-release ]; then
        local pretty=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
        if [ -n "$pretty" ]; then
            echo "$pretty"
            return
        fi
        local name=$(grep "^NAME=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
        local version=$(grep "^VERSION_ID=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
        if [ -n "$name" ]; then
            echo "$name $version"
            return
        fi
    fi
    echo "Linux $(uname -r)"
}

# 获取公网 IPv4 地址
get_ipv4() {
    local iface=$(get_main_interface)
    if [ -n "$iface" ]; then
        ip -4 addr show dev $iface 2>/dev/null | grep inet | awk '{print $2}' | cut -d/ -f1 | head -1
    fi
}

# 获取公网 IPv6 地址（全球单播地址）
get_ipv6() {
    local iface=$(get_main_interface)
    if [ -n "$iface" ]; then
        # 获取以 2 或 3 开头的全球单播地址
        ip -6 addr show dev $iface 2>/dev/null | grep inet6 | grep -v fe80 | grep -v "::1" | awk '{print $2}' | cut -d/ -f1 | grep "^[23]" | head -1
    fi
}

# ===== 主逻辑 =====

# 构建 JSON 数据
build_json() {
    local cpu_usage=$(get_cpu_usage)
    local mem=($(get_memory_info))
    local disk=($(get_disk_info))
    local net=($(calculate_network_speed))
    local load=$(get_load_average)
    local uptime=$(get_uptime)
    local cpu_model=$(get_cpu_model)
    local cpu_cores=$(get_cpu_cores)
    local os_info=$(get_os_info)
    local ipv4=$(get_ipv4)
    local ipv6=$(get_ipv6)
    local host_name=$(get_hostname)
    
    # 计算月流量（简化：使用总流量）
    local monthly_used=$((${net[2]} + ${net[3]}))
    
    cat << EOF
{
  "nodeId": "$NODE_ID",
  "name": "$host_name",
  "ipAddress": "$ipv4",
  "ipv6Address": "${ipv6:-}",
  "os": "$os_info",
  "uptime": $uptime,
  "load": [$load],
  "status": "online",
  "protocol": "KVM",
  "trafficResetDay": $TRAFFIC_RESET_DAY,
  "cpu": {
    "model": "$cpu_model",
    "cores": $cpu_cores,
    "usage": ${cpu_usage:-0}
  },
  "memory": {
    "total": ${mem[0]},
    "used": ${mem[1]},
    "usage": ${mem[2]:-0}
  },
  "disk": {
    "total": ${disk[0]},
    "used": ${disk[1]},
    "usage": ${disk[2]:-0}
  },
  "network": {
    "currentDownload": ${net[0]},
    "currentUpload": ${net[1]},
    "totalDownload": ${net[2]},
    "totalUpload": ${net[3]},
    "monthlyUsed": $monthly_used
  }
}
EOF
}

# 发送数据到服务器
send_report() {
    local json=$(build_json)
    
    curl -s -X POST "$SERVER_URL/api/report" \
        -H "Content-Type: application/json" \
        -H "X-API-Token: $API_TOKEN" \
        -d "$json" \
        --connect-timeout 5 \
        --max-time 10 \
        >/dev/null 2>&1
    
    return $?
}

# 主循环
main() {
    echo "========================================"
    echo "  VPS Monitor Agent (Shell Version)"
    echo "========================================"
    echo "Server URL: $SERVER_URL"
    echo "Node ID: $NODE_ID"
    echo "Interval: ${INTERVAL}s"
    echo "Traffic Reset Day: $TRAFFIC_RESET_DAY"
    
    # 初始化检测
    init_timestamp
    init_interface
    
    echo "OS: $(get_os_info)"
    echo "Interface: $CACHED_INTERFACE"
    echo "MS Timestamp: $([ $USE_MS_TIMESTAMP -eq 1 ] && echo 'Yes' || echo 'No (fallback to seconds)')"
    echo "IPv4: $(get_ipv4)"
    echo "IPv6: $(get_ipv6 || echo 'Not detected')"
    echo "========================================"
    echo ""
    
    # 验证配置
    if [ "$SERVER_URL" = "https://your-monitor.vercel.app" ]; then
        echo "Error: Please configure SERVER_URL"
        exit 1
    fi
    
    if [ "$API_TOKEN" = "your-secret-token" ]; then
        echo "Error: Please configure API_TOKEN"
        exit 1
    fi
    
    echo "Starting monitor agent..."
    
    # 初始化网络统计（需要两次采样才能计算速度）
    echo "Initializing network statistics..."
    calculate_network_speed >/dev/null
    sleep 1  # 等待 1 秒
    calculate_network_speed >/dev/null  # 第二次采样建立基准
    
    while true; do
        if send_report; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Report sent successfully"
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Report failed"
        fi
        
        # 分段 sleep，中间进行网络采样以提高速度计算准确性
        # 将 INTERVAL 分成两半，中间做一次采样
        local half_interval=$((INTERVAL / 2))
        if [ $half_interval -gt 0 ]; then
            sleep $half_interval
            calculate_network_speed >/dev/null  # 中间采样
            sleep $((INTERVAL - half_interval))
        else
            sleep $INTERVAL
        fi
    done
}

# 运行
main
