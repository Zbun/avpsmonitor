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
INTERVAL="${INTERVAL:-4}"  # 上报间隔（秒）
TRAFFIC_RESET_DAY="${TRAFFIC_RESET_DAY:-1}"

# 用于计算网络速度的变量
LAST_RX=0
LAST_TX=0
LAST_TIME_MS=0

# ===== 工具函数 =====

# 获取毫秒级时间戳
get_time_ms() {
    # 优先使用 date +%s%3N (Linux)
    if date +%s%3N >/dev/null 2>&1; then
        date +%s%3N
    else
        # 降级到秒级并乘以 1000
        echo $(($(date +%s) * 1000))
    fi
}

# 获取主网卡名称
get_main_interface() {
    # 优先获取默认路由的网卡
    local iface=$(ip route 2>/dev/null | grep default | awk '{print $5}' | head -1)
    if [ -z "$iface" ]; then
        # 备选：获取第一个非 lo 网卡
        iface=$(ls /sys/class/net | grep -v lo | head -1)
    fi
    echo "$iface"
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
    local iface=$(get_main_interface)
    if [ -z "$iface" ]; then
        echo "0 0"
        return
    fi
    
    local rx=$(cat /sys/class/net/$iface/statistics/rx_bytes 2>/dev/null || echo 0)
    local tx=$(cat /sys/class/net/$iface/statistics/tx_bytes 2>/dev/null || echo 0)
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

# 三网延迟测试目标（使用各运营商 DNS 服务器）
# 电信: 114.114.114.114 (114DNS) 或 202.96.128.86 (广东电信)
# 联通: 123.125.81.6 (北京联通) 或 221.5.88.88 (山东联通)  
# 移动: 211.136.192.6 (北京移动) 或 183.232.231.172 (广东移动)
CT_TEST_IP="114.114.114.114"
CU_TEST_IP="123.125.81.6"
CM_TEST_IP="211.136.192.6"

# Ping 测试（返回延迟毫秒数，失败返回 -1）
ping_test() {
    local ip=$1
    local count=${2:-3}
    
    # 使用 ping 命令测试，取平均值
    # Linux 输出格式: rtt min/avg/max/mdev = 10.123/15.456/20.789/3.456 ms
    local output=$(ping -c $count -W 2 $ip 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "-1"
        return
    fi
    
    # 尝试多种解析方式
    local result=""
    
    # 方式1: 从 rtt/round-trip 行解析 avg 值
    result=$(echo "$output" | grep -E 'rtt|round-trip' | awk -F'/' '{print $5}')
    
    # 方式2: 如果上面失败，尝试从 time= 中取值
    if [ -z "$result" ] || [ "$result" = "0" ]; then
        result=$(echo "$output" | grep -oE 'time=[0-9.]+' | tail -1 | cut -d= -f2)
    fi
    
    if [ -n "$result" ] && [ "$result" != "0" ]; then
        # 四舍五入到整数（兼容没有 printf 的系统）
        echo "$result" | awk '{printf "%.0f", $1}' 2>/dev/null || echo "${result%.*}"
    else
        echo "-1"
    fi
}

# 获取三网延迟（返回 JSON 格式）
get_latency_test() {
    local ct_latency=$(ping_test $CT_TEST_IP)
    local cu_latency=$(ping_test $CU_TEST_IP)
    local cm_latency=$(ping_test $CM_TEST_IP)
    
    # 构建 JSON
    echo "{\"CT\": $ct_latency, \"CU\": $cu_latency, \"CM\": $cm_latency}"
}

# ===== 主逻辑 =====

# 延迟测试缓存（每分钟更新一次，避免频繁 ping）
LATENCY_CACHE=""
LATENCY_CACHE_TIME=0

# 获取延迟数据（带缓存）
get_cached_latency() {
    local now=$(date +%s)
    local cache_ttl=60  # 60秒缓存
    
    if [ -z "$LATENCY_CACHE" ] || [ $((now - LATENCY_CACHE_TIME)) -gt $cache_ttl ]; then
        LATENCY_CACHE=$(get_latency_test)
        LATENCY_CACHE_TIME=$now
    fi
    echo "$LATENCY_CACHE"
}

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
    local latency=$(get_cached_latency)
    
    # 计算月流量（简化：使用总流量）
    local monthly_used=$((${net[2]} + ${net[3]}))
    
    cat << EOF
{
  "nodeId": "$NODE_ID",
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
  },
  "latency": $latency
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
    echo "OS: $(get_os_info)"
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
    sleep 2  # 等待 2 秒以获取更准确的初始速度
    
    while true; do
        if send_report; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Report sent successfully"
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Report failed"
        fi
        sleep $INTERVAL
    done
}

# 运行
main
