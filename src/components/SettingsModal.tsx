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

  return <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-neutral-800"><div><h2 className="text-sm font-medium">Quick settings</h2><p className="text-xs text-neutral-500 mt-0.5">Connection credentials are managed server-side.</p></div><button onClick={onClose} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={16}/></button></div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><RotateCw size={14}/> Auto-refresh</label><input type="checkbox" checked={formData.autoRefresh} onChange={e => setFormData(prev => ({ ...prev, autoRefresh: e.target.checked }))}/></div>
        {formData.autoRefresh && <div><label className="flex items-center gap-2 text-sm mb-1.5"><Clock size={14}/> Refresh interval</label><select value={formData.refreshInterval} onChange={e => setFormData(prev => ({ ...prev, refreshInterval: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-md border bg-transparent dark:border-neutral-700"><option value={10}>10 seconds</option><option value={30}>30 seconds</option><option value={60}>1 minute</option><option value={300}>5 minutes</option></select></div>}
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t dark:border-neutral-800"><button onClick={() => { onReset(); onClose(); }} className="px-3 py-1.5 text-sm text-red-600">Reset</button><div className="flex gap-2"><button onClick={onClose} className="px-3 py-1.5 text-sm">Cancel</button><button onClick={() => { onSave(formData); onClose(); }} className="px-3 py-1.5 text-sm rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Save</button></div></div>
    </div>
  </div>;
};
