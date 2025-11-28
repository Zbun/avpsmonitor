import { useState, useEffect, useCallback, useRef } from 'react';

interface PingResult {
  host: string;
  latency: number | null;
  status: 'success' | 'timeout' | 'error';
}

interface UsePingReturn {
  ping: (url: string) => Promise<PingResult>;
  pingMultiple: (urls: string[]) => Promise<PingResult[]>;
  isPinging: boolean;
}

/**
 * 纯前端实现的 ping 延迟测试 Hook
 * 使用多种方式测试延迟：
 * 1. fetch API 测量响应时间
 * 2. Image 加载时间
 * 3. WebSocket 连接时间（如果支持）
 */
export function usePing(): UsePingReturn {
  const [isPinging, setIsPinging] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 使用 fetch 测试延迟
  const pingWithFetch = async (url: string, timeout = 5000): Promise<number | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const start = performance.now();
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      const end = performance.now();
      clearTimeout(timeoutId);
      return Math.round(end - start);
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  // 使用 Image 加载测试延迟
  const pingWithImage = (url: string, timeout = 5000): Promise<number | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const start = performance.now();

      const timer = setTimeout(() => {
        img.src = '';
        resolve(null);
      }, timeout);

      img.onload = img.onerror = () => {
        clearTimeout(timer);
        const end = performance.now();
        resolve(Math.round(end - start));
      };

      // 添加时间戳防止缓存
      img.src = `${url}?_=${Date.now()}`;
    });
  };

  // 单个 URL ping 测试
  const ping = useCallback(async (url: string): Promise<PingResult> => {
    setIsPinging(true);

    try {
      // 优先使用 fetch
      let latency = await pingWithFetch(url);

      // 如果 fetch 失败，尝试 Image 方式
      if (latency === null) {
        latency = await pingWithImage(url);
      }

      setIsPinging(false);

      return {
        host: url,
        latency,
        status: latency !== null ? 'success' : 'timeout',
      };
    } catch {
      setIsPinging(false);
      return {
        host: url,
        latency: null,
        status: 'error',
      };
    }
  }, []);

  // 批量 ping 测试
  const pingMultiple = useCallback(async (urls: string[]): Promise<PingResult[]> => {
    setIsPinging(true);

    const results = await Promise.all(
      urls.map(url => ping(url))
    );

    setIsPinging(false);
    return results;
  }, [ping]);

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ping,
    pingMultiple,
    isPinging,
  };
}

// 预定义的测速节点（用于三网测试）
export const ISP_TEST_NODES = {
  // 电信测速节点
  CT: [
    'https://speed.cloudflare.com/__down?bytes=1000',
    'https://www.189.cn/favicon.ico',
  ],
  // 联通测速节点
  CU: [
    'https://speed.cloudflare.com/__down?bytes=1000',
    'https://www.10010.com/favicon.ico',
  ],
  // 移动测速节点
  CM: [
    'https://speed.cloudflare.com/__down?bytes=1000',
    'https://www.10086.cn/favicon.ico',
  ],
};

export default usePing;
