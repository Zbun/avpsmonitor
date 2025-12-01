import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-14 h-7 rounded-full p-1 transition-all duration-300
        ${theme === 'dark'
          ? 'bg-slate-700 hover:bg-slate-600'
          : 'bg-blue-100 hover:bg-blue-200'
        }
      `}
      aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
    >
      <div
        className={`
          absolute top-1 w-5 h-5 rounded-full transition-all duration-300
          flex items-center justify-center
          ${theme === 'dark'
            ? 'left-1 bg-slate-900'
            : 'left-8 bg-white'
          }
        `}
      >
        {theme === 'dark' ? (
          <Moon className="w-3 h-3 text-yellow-400" />
        ) : (
          <Sun className="w-3 h-3 text-yellow-500" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
