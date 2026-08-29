import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'text-emerald-800 dark:text-emerald-200',
  error: 'text-red-800 dark:text-red-200',
  warning: 'text-amber-800 dark:text-amber-200',
  info: 'text-brand-800 dark:text-brand-200',
};

const accent = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-brand-500',
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = icons[toast.type];

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl shadow-neutral-900/10 ring-1 ring-black/[0.02] transition-all duration-200 ${styles[toast.type]} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${accent[toast.type]}`} />
      <div className="flex items-start gap-3 p-4 pl-5">
        <Icon size={18} className={`mt-0.5 flex-shrink-0 ${accent[toast.type]} rounded-full p-0.5 text-white`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs opacity-80 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => addToast('success', title, message), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast('error', title, message), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast('warning', title, message), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast('info', title, message), [addToast]);

  const value: ToastContextValue = {
    toasts,
    addToast,
    dismissToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
