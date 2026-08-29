import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Workflow, Activity, Settings } from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Workflow, label: 'Workflows', path: '/workflows' },
  { icon: Activity, label: 'Runs', path: '/executions' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 md:hidden safe-area-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex items-center justify-around h-16 max-w-md px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand-600 dark:bg-brand-400" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
