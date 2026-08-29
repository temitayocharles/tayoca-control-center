import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, MobileMenuButton } from './Sidebar';
import { MobileBottomNav } from '../MobileBottomNav';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { BrandMark } from '../BrandMark';

export const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="app-page min-h-screen">
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Sidebar />

      {/* Main Content */}
      <div className={`transition-all duration-200 ${isMobile ? '' : 'md:ml-64'}`}>
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 md:hidden">
          <MobileMenuButton />
          <div className="flex items-center gap-2.5">
            <BrandMark size={26} />
            <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
              Tayoca Control
            </span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <div id="main-content" className="p-4 pb-24 md:p-6 lg:p-8 lg:pb-10">
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
