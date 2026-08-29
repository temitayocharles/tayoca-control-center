import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Settings,
  X,
  Menu,
  AlertCircle,
  BarChart3,
  FileText,
  ListTodo,
  Calendar,
  Webhook,
  Archive,
  FilePenLine,
  Braces,
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../ThemeToggle';
import { BrandMark } from '../BrandMark';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Workflow, label: 'Workflows', path: '/workflows' },
      { icon: Activity, label: 'Executions', path: '/executions' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { icon: FilePenLine, label: 'Website CMS', path: '/content' },
      { icon: Braces, label: 'Workflow Studio', path: '/workflow-studio' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { icon: AlertCircle, label: 'Error Log', path: '/errors' },
      { icon: BarChart3, label: 'Performance', path: '/performance' },
      { icon: FileText, label: 'Usage Reports', path: '/reports' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: Calendar, label: 'Schedules', path: '/schedules' },
    ],
  },
  {
    title: 'Advanced n8n',
    items: [
      { icon: ListTodo, label: 'Active Runs', path: '/queue' },
      { icon: Webhook, label: 'Webhooks', path: '/webhooks' },
      { icon: Archive, label: 'Backups', path: '/backups' },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const { isMobileOpen, closeMobile } = useSidebar();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();

  const NavItemComponent: React.FC<{ item: NavItem }> = ({ item }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <NavLink
        to={item.path}
        onClick={closeMobile}
        className={`app-sidebar-item ${isActive ? 'app-sidebar-item-active' : ''}`}
      >
        <Icon size={19} className="flex-shrink-0 opacity-90" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <BrandMark size={36} />
        <div className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-white">
            Tayoca
          </span>
          <span className="block text-[11px] font-medium tracking-[0.16em] uppercase text-[#c9b998]">
            Control Centre
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3.5 py-3 overflow-y-auto no-scrollbar">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
            {section.title && (
              <div className="px-2 pb-2">
                <span className="app-sidebar-label">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {section.items.map(item => (
                <NavItemComponent key={item.path} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-3.5 py-4 border-t border-white/10 space-y-1">
        {bottomNavItems.map(item => (
          <NavItemComponent key={item.path} item={item} />
        ))}

        <div className="flex items-center justify-between gap-3 px-2 pt-3">
          <div className="text-[13px] font-medium text-white/70">
            {darkMode ? 'Night' : 'Day'} theme
          </div>
          <ThemeToggle darkMode={darkMode} toggleTheme={toggleTheme} />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          app-sidebar fixed top-0 left-0 h-full z-50 flex flex-col w-64 transition-transform duration-200
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            onClick={closeMobile}
            className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 md:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}

        {sidebarContent}
      </aside>
    </>
  );
};

// Mobile menu button component
export const MobileMenuButton: React.FC = () => {
  const { openMobile } = useSidebar();

  return (
    <button
      onClick={openMobile}
      className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 md:hidden"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
};
