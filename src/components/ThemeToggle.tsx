import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ darkMode, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="group inline-flex items-center justify-center w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300 hover:text-brand-700 dark:hover:text-brand-300 hover:border-brand-300 dark:hover:border-brand-500 transition-colors"
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
};
