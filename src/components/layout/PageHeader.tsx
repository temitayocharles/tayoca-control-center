import React from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showThemeToggle?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, showThemeToggle = false }) => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <div className="mb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-brand-500 to-gold-500" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {title}
            </h1>
          </div>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showThemeToggle && (
            <ThemeToggle darkMode={darkMode} toggleTheme={toggleTheme} />
          )}
          {actions}
        </div>
      </div>
    </div>
  );
};
