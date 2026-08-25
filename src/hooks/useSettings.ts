import { useState, useEffect, useCallback } from 'react';

export type TableDensity = 'compact' | 'normal' | 'comfortable';

export interface Settings {
  refreshInterval: number;
  autoRefresh: boolean;
  tableDensity: TableDensity;
  defaultPageSize: number;
}

const STORAGE_KEY = 'n8n-dashboard-settings';
const LEGACY_SENSITIVE_STORAGE_KEY = 'n8n-dashboard-credentials';

const defaultSettings: Settings = {
  refreshInterval: 30,
  autoRefresh: true,
  tableDensity: 'normal',
  defaultPageSize: 15,
};

const normalizeSettings = (value: unknown): Settings => {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const density = raw.tableDensity;
  return {
    refreshInterval: typeof raw.refreshInterval === 'number' ? raw.refreshInterval : defaultSettings.refreshInterval,
    autoRefresh: typeof raw.autoRefresh === 'boolean' ? raw.autoRefresh : defaultSettings.autoRefresh,
    tableDensity: density === 'compact' || density === 'comfortable' || density === 'normal' ? density : defaultSettings.tableDensity,
    defaultPageSize: typeof raw.defaultPageSize === 'number' ? raw.defaultPageSize : defaultSettings.defaultPageSize,
  };
};

const loadSettings = (): Settings => {
  try {
    localStorage.removeItem(LEGACY_SENSITIVE_STORAGE_KEY);
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeSettings(JSON.parse(stored)) : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

const saveSettings = (settings: Settings): void => {
  localStorage.removeItem(LEGACY_SENSITIVE_STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const useSettings = () => {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);

  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState((prev) => {
      const updated = normalizeSettings({ ...prev, ...newSettings });
      saveSettings(updated);
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_SENSITIVE_STORAGE_KEY);
    setSettingsState(defaultSettings);
  }, []);

  return {
    settings,
    isConfigured: true,
    updateSettings,
    resetSettings,
  };
};

export const getStoredSettings = (): Settings => loadSettings();
