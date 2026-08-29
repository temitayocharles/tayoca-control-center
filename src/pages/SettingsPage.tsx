import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, Clock, ExternalLink, List, Loader2, RotateCw, Save, Server, Table, XCircle } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { n8nApi } from '../services/n8n';
import { useSettings, type Settings, type TableDensity } from '../hooks/useSettings';
import { getNotificationSettings, saveNotificationSettings, useNotifications } from '../hooks/useNotifications';
import { getN8nUrl } from '../lib/utils';
import { useToast } from '../components/Toast';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [formData, setFormData] = useState<Settings>(settings);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [notificationSettings, setNotificationSettings] = useState(getNotificationSettings);
  const [saving, setSaving] = useState(false);
  const { permission, requestPermission, isSupported } = useNotifications();
  const toast = useToast();
  const n8nUrl = getN8nUrl();

  useEffect(() => {
    setFormData(settings);
    setNotificationSettings(getNotificationSettings());
  }, [settings]);

  const handleChange = (field: keyof Settings, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value } as Settings));
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    const success = await n8nApi.testConnection();
    setConnectionStatus(success ? 'success' : 'error');
  };

  const handleNotificationChange = async (field: 'enabled' | 'onError' | 'onSuccess', value: boolean) => {
    if (field === 'enabled' && value && permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') return;
    }
    const next = { ...notificationSettings, [field]: value };
    setNotificationSettings(next);
    saveNotificationSettings(next);
  };

  const handleSave = () => {
    setSaving(true);
    try {
      updateSettings(formData);
      toast.success('Settings saved');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (checked: boolean, onChange: (v: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return <>
    <PageHeader title="Settings" description="Control-center preferences and managed connection status" />
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="app-card p-6">
        <h3 className="mb-4 text-sm font-bold text-neutral-900 dark:text-white">Managed connection</h3>
        <div className="app-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 text-sm font-semibold text-neutral-900 dark:text-white">
                <span className="app-inset p-2"><Server size={15} /></span>
                n8n gateway
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Credentials are managed server-side. API keys are never entered or stored in this browser.
              </p>
            </div>
            <span className="app-badge app-badge-success">Managed</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={handleTestConnection} disabled={connectionStatus === 'testing'} className="app-btn app-btn-secondary disabled:opacity-50">
              {connectionStatus === 'testing' ? <Loader2 size={14} className="animate-spin" /> : connectionStatus === 'success' ? <CheckCircle size={14} className="text-emerald-500" /> : connectionStatus === 'error' ? <XCircle size={14} className="text-red-500" /> : <Server size={14} />} Test connection
            </button>
            {connectionStatus === 'success' && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Connected</span>}
            {connectionStatus === 'error' && <span className="text-sm font-medium text-red-600 dark:text-red-400">Connection failed</span>}
            {n8nUrl && <a href={n8nUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-300 hover:text-brand-700 dark:hover:text-brand-300">Open native n8n <ExternalLink size={13} /></a>}
          </div>
        </div>
      </section>

      <section className="app-card p-6">
        <h3 className="mb-4 text-sm font-bold text-neutral-900 dark:text-white">Preferences</h3>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200"><span className="app-inset p-2"><RotateCw size={14} /></span>Auto-refresh data</label>
            {toggle(formData.autoRefresh, v => handleChange('autoRefresh', v))}
          </div>
          {formData.autoRefresh && (
            <div>
              <label className="mb-2 flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200"><span className="app-inset p-2"><Clock size={14} /></span>Refresh interval</label>
              <select value={formData.refreshInterval} onChange={e => handleChange('refreshInterval', Number(e.target.value))} className="app-select">
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          )}
          <div>
            <label className="mb-2 flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200"><span className="app-inset p-2"><Table size={14} /></span>Table density</label>
            <div className="flex gap-2">
              {(['compact','normal','comfortable'] as TableDensity[]).map(d => (
                <button key={d} type="button" onClick={() => handleChange('tableDensity', d)} className={`app-btn flex-1 ${formData.tableDensity === d ? 'app-btn-primary' : 'app-btn-secondary'}`}>
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200"><span className="app-inset p-2"><List size={14} /></span>Default page size</label>
            <select value={formData.defaultPageSize} onChange={e => handleChange('defaultPageSize', Number(e.target.value))} className="app-select">
              {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n} items</option>)}
            </select>
          </div>
        </div>
      </section>

      {isSupported && (
        <section className="app-card p-6">
          <h3 className="mb-2 text-sm font-bold text-neutral-900 dark:text-white">Notifications</h3>
          <p className="mb-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Browser notifications are in-session alerts. They are detected while the Dashboard is open and refreshing; they are not background or server-push notifications.
          </p>
          <div className="space-y-4">
            <label className="flex items-center justify-between text-sm font-medium text-neutral-700 dark:text-neutral-200">
              <span className="flex items-center gap-2.5"><span className="app-inset p-2"><Bell size={14} /></span>Dashboard browser notifications</span>
              {toggle(notificationSettings.enabled, v => handleNotificationChange('enabled', v))}
            </label>
            {notificationSettings.enabled && (
              <>
                <label className="flex items-center justify-between text-sm text-neutral-700 dark:text-neutral-200">
                  <span>Execution errors</span>
                  {toggle(notificationSettings.onError, v => handleNotificationChange('onError', v))}
                </label>
                <label className="flex items-center justify-between text-sm text-neutral-700 dark:text-neutral-200">
                  <span>Execution success</span>
                  {toggle(notificationSettings.onSuccess, v => handleNotificationChange('onSuccess', v))}
                </label>
              </>
            )}
          </div>
        </section>
      )}

      <section className="app-card flex items-center justify-between gap-3 p-6">
        <button onClick={() => { resetSettings(); toast.info('Settings reset'); }} className="app-btn app-btn-danger">Reset defaults</button>
        <button onClick={handleSave} disabled={saving} className="app-btn app-btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
        </button>
      </section>
    </div>
  </>;
};
