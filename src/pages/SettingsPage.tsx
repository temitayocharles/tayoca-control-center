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

  return <>
    <PageHeader title="Settings" description="Control-center preferences and managed connection status" />
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">Managed connection</h3>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white"><Server size={15}/> n8n gateway</div>
              <p className="mt-1 text-xs text-neutral-500">Credentials are managed server-side. API keys are never entered or stored in this browser.</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Managed</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleTestConnection} disabled={connectionStatus === 'testing'} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50">
              {connectionStatus === 'testing' ? <Loader2 size={14} className="animate-spin"/> : connectionStatus === 'success' ? <CheckCircle size={14} className="text-emerald-500"/> : connectionStatus === 'error' ? <XCircle size={14} className="text-red-500"/> : <Server size={14}/>} Test connection
            </button>
            {connectionStatus === 'success' && <span className="text-sm text-emerald-600">Connected</span>}
            {connectionStatus === 'error' && <span className="text-sm text-red-600">Connection failed</span>}
            {n8nUrl && <a href={n8nUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-300 hover:underline">Open native n8n <ExternalLink size={13}/></a>}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><RotateCw size={14}/> Auto-refresh data</label><button type="button" onClick={() => handleChange('autoRefresh', !formData.autoRefresh)} className={`relative w-10 h-6 rounded-full ${formData.autoRefresh ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}><span className={`absolute top-1 w-4 h-4 rounded-full shadow bg-white dark:bg-neutral-900 ${formData.autoRefresh ? 'left-5' : 'left-1'}`}/></button></div>
          {formData.autoRefresh && <div><label className="flex items-center gap-2 text-sm mb-2"><Clock size={14}/> Refresh interval</label><select value={formData.refreshInterval} onChange={e => handleChange('refreshInterval', Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent dark:border-neutral-700"><option value={10}>10 seconds</option><option value={30}>30 seconds</option><option value={60}>1 minute</option><option value={300}>5 minutes</option></select></div>}
          <div><label className="flex items-center gap-2 text-sm mb-2"><Table size={14}/> Table density</label><div className="flex gap-2">{(['compact','normal','comfortable'] as TableDensity[]).map(d => <button key={d} type="button" onClick={() => handleChange('tableDensity', d)} className={`flex-1 px-3 py-2 text-sm rounded-lg border ${formData.tableDensity === d ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'dark:border-neutral-700'}`}>{d[0].toUpperCase()+d.slice(1)}</button>)}</div></div>
          <div><label className="flex items-center gap-2 text-sm mb-2"><List size={14}/> Default page size</label><select value={formData.defaultPageSize} onChange={e => handleChange('defaultPageSize', Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent dark:border-neutral-700">{[10,15,25,50,100].map(n => <option key={n} value={n}>{n} items</option>)}</select></div>
        </div>
      </section>

      {isSupported && <section className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6"><h3 className="text-sm font-medium mb-2">Notifications</h3><p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">Browser notifications are in-session alerts. They are detected while the Dashboard is open and refreshing; they are not background or server-push notifications.</p><div className="space-y-3"><label className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Bell size={14}/> Dashboard browser notifications</span><input type="checkbox" checked={notificationSettings.enabled} onChange={e => handleNotificationChange('enabled', e.target.checked)}/></label>{notificationSettings.enabled && <><label className="flex items-center justify-between text-sm"><span>Execution errors</span><input type="checkbox" checked={notificationSettings.onError} onChange={e => handleNotificationChange('onError', e.target.checked)}/></label><label className="flex items-center justify-between text-sm"><span>Execution success</span><input type="checkbox" checked={notificationSettings.onSuccess} onChange={e => handleNotificationChange('onSuccess', e.target.checked)}/></label></>}</div></section>}

      <section className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 flex items-center justify-between gap-3"><button onClick={() => { resetSettings(); toast.info('Settings reset'); }} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg">Reset defaults</button><button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Save changes</button></section>
    </div>
  </>;
};
