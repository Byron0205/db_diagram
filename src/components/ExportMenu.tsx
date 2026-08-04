/**
 * Dropdown de exportación reutilizable, sin acoplamiento de dominio — se usa
 * tanto en DiagramCanvas (SQL) como en FlowchartCanvas. Se cierra al hacer
 * clic afuera (seguro acá: es HTML plano, no un nodo/pane de React Flow).
 */

import { useEffect, useRef, useState } from 'react';

export interface ExportMenuItem {
  label: string;
  onClick: () => void;
}

interface ExportMenuProps {
  items: ExportMenuItem[];
}

export function ExportMenu({ items }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded border border-indigo-500 transition-colors cursor-pointer"
        title="Exportar diagrama"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Exportar
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-slate-600 rounded shadow-xl overflow-hidden z-10">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
