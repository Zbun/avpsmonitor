import React from 'react';
import { Github, Heart, ExternalLink, Server } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700/50 py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
            <Server className="w-4 h-4" />
            <span>Powered by</span>
            <span className="text-slate-700 dark:text-gray-300">Vercel + KV</span>
            <span className="text-slate-300 dark:text-gray-600">·</span>
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400">
            <a
              href="https://github.com/Zbun/avpsmonitor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300 dark:text-gray-600">|</span>
            <span>VPS Monitor v1.0.0</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 text-center text-xs text-slate-400 dark:text-gray-500">
          <p>
            一键部署到 Vercel，VPS 安装 Agent 即可监控。支持 IP 自动识别位置，无需手动配置。
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
