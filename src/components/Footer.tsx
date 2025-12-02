import React from 'react';
import { Github, Heart, Zap, Cloud, MapPin, Terminal } from 'lucide-react';

const features = [
  { icon: Cloud, text: 'Serverless' },
  { icon: Zap, text: '< 1MB RAM' },
  { icon: MapPin, text: 'Auto GeoIP' },
  { icon: Terminal, text: 'Shell Only' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="mt-3 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* 特性标签 */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-gray-500">
            {features.map((feature, index) => (
              <span key={index} className="inline-flex items-center gap-1">
                <feature.icon className="w-3 h-3" />
                {feature.text}
              </span>
            ))}
          </div>

          {/* GitHub + Heart */}
          <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500">
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            <a
              href="https://github.com/Zbun/avpsmonitor"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
