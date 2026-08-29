import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import type { Command } from '../hooks/useCommandPalette';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  commands: Command[];
  onSelectCommand: (command: Command) => void;
}

const categoryLabels: Record<string, string> = {
  navigation: 'Navigation',
  action: 'Actions',
  workflow: 'Workflows',
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  commands,
  onSelectCommand,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % commands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (commands[selectedIndex]) {
            onSelectCommand(commands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [commands, selectedIndex, onSelectCommand, onClose]
  );

  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const groupedCommands = commands.reduce<Record<string, Command[]>>((acc, command) => {
    const category = command.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(command);
    return acc;
  }, {});

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="app-overlay" />

      {/* Dialog */}
      <div
        className="app-dialog relative w-full max-w-xl animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <Search size={18} className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
          />
          <kbd className="app-kbd hidden sm:inline-flex">ESC</kbd>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {commands.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category}>
                <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
                  {categoryLabels[category] || category}
                </div>
                {categoryCommands.map((command) => {
                  const index = globalIndex++;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={command.id}
                      data-index={index}
                      onClick={() => onSelectCommand(command)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between gap-4 px-5 py-2.5 text-left transition-colors border-l-2 ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500'
                          : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-neutral-900 dark:text-white">
                          {command.label}
                        </div>
                        {command.description && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {command.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CornerDownLeft size={14} className="text-brand-600 dark:text-brand-300 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5 px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400 dark:text-neutral-500">
          <span className="flex items-center gap-1.5">
            <ArrowUp size={11} />
            <ArrowDown size={11} />
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <CornerDownLeft size={11} />
            select
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="app-kbd !text-[9px] !px-1.5 !py-0.5">ESC</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
};
