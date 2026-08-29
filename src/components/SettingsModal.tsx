import React, { useEffect, useState } from 'react';
import { Clock, RotateCw, X } from 'lucide-react';
import type { Settings } from '../hooks/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Partial<Settings>) => void;
  onReset: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onReset }) => {
  const [formData, setFormData] = useState<Settings>(settings);
  useEffect(() => { setFormData(settings); }, [settings, isOpen]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="app-overlay" />
      <div className="app-dialog relative w-full max-w-md animate-pop-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Quick settings</h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Connection credentials are managed server-side.</p>
          </div>
          <button onClick={onClose} className="app-icon-btn p-2" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              <span className="app-inset p-2"><RotateCw size={15} /></span>
              Auto-refresh
            </label>
            <input type="checkbox" checked={formData.autoRefresh} onChange={e => setFormData(prev => ({ ...prev, autoRefresh: e.target.checked }))} className="h-4 w-4 accent-brand-600 dark:accent-brand-400" />
          </div>
          {formData.autoRefresh && (
            <div>
              <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                <span className="app-inset p-2"><Clock size={15} /></span>
                Refresh interval
              </label>
              <select value={formData.refreshInterval} onChange={e => setFormData(prev => ({ ...prev, refreshInterval: Number(e.target.value) }))} className="app-select">
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <button onClick={() => { onReset(); onClose(); }} className="app-btn app-btn-danger">Reset</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="app-btn app-btn-ghost">Cancel</button>
            <button onClick={() => { onSave(formData); onClose(); }} className="app-btn app-btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};
