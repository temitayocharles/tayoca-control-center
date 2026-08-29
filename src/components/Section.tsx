import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ title, children, action, className = '' }) => {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="app-section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
};
