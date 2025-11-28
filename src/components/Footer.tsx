import React from 'react';
import { Github, Heart, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700/50 py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>using React + Tailwind CSS</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400">
            <a
              href="https://github.com"
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
            本项目为纯前端实现，实际使用需配合后端 API 获取真实服务器数据。
            部署后可通过配置文件自定义节点信息。
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
