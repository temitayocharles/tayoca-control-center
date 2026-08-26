import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Link, List, ListOrdered, Quote, Type } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, disabled = false }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  const command = (name: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  const addLink = () => {
    const url = window.prompt('Paste the link URL');
    if (url) command('createLink', url);
  };

  const toolbar = [
    { label: 'Bold', icon: Bold, action: () => command('bold') },
    { label: 'Italic', icon: Italic, action: () => command('italic') },
    { label: 'Heading', icon: Type, action: () => command('formatBlock', 'h2') },
    { label: 'Bullets', icon: List, action: () => command('insertUnorderedList') },
    { label: 'Numbered list', icon: ListOrdered, action: () => command('insertOrderedList') },
    { label: 'Quote', icon: Quote, action: () => command('formatBlock', 'blockquote') },
    { label: 'Link', icon: Link, action: addLink },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800/60">
        {toolbar.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={action}
            title={label}
            className="rounded-lg p-2 text-neutral-600 transition hover:bg-white hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="min-h-[360px] px-5 py-4 text-[15px] leading-7 text-neutral-800 outline-none dark:text-neutral-100 [&_a]:text-blue-600 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-6 [&_ol]:list-decimal [&_p]:my-3 [&_ul]:list-disc"
      />
    </div>
  );
};
