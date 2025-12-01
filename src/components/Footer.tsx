import React from 'react';
import { Github, Heart, ExternalLink, Server } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700/50 py-3 mt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
            <Server className="w-3.5 h-3.5" />
            <span>Powered by</span>
            <span className="text-slate-700 dark:text-gray-300">Vercel + KV</span>
            <span className="text-slate-300 dark:text-gray-600">·</span>
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
            <a
              href="https://github.com/Zbun/avpsmonitor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span className="text-slate-300 dark:text-gray-600">|</span>
            <span>VPS Monitor v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
