import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { shortcuts } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={handleBackdropClick}
    >
      <div className="app-overlay" />
      <div className="app-dialog relative w-full max-w-sm animate-pop-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="app-inset p-2">
              <Keyboard size={16} className="text-brand-600 dark:text-brand-300" />
            </span>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="app-icon-btn p-2" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-1.5 divide-y divide-neutral-100 dark:divide-neutral-800">
            {shortcuts.map(({ key, description }) => (
              <div key={key} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{description}</span>
                <kbd className="app-kbd">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
