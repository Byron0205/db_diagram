/**
 * Barra de pestañas de esquemas.
 * - Clic: cambiar pestaña activa
 * - Doble clic en el nombre: renombrar inline
 * - Botón ×: cerrar (deshabilitado si solo queda una)
 * - Botón +: crear nueva pestaña vacía
 */

import { useState, useRef, useEffect } from 'react';
import type { SchemaTab } from '../hooks/useTabs';

interface TabBarProps {
  tabs: SchemaTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function TabBar({ tabs, activeId, onSelect, onAdd, onRemove, onRename }: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function startEdit(tab: SchemaTab, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(tab.id);
    setEditValue(tab.name);
  }

  function commitEdit() {
    if (editingId && editValue.trim()) onRename(editingId, editValue.trim());
    setEditingId(null);
  }

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-900 border-b border-slate-700 overflow-x-auto shrink-0 scrollbar-none">
      {tabs.map((tab) => {
        const isActive  = tab.id === activeId;
        const isEditing = editingId === tab.id;

        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs cursor-pointer shrink-0 group transition-colors ${
              isActive
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            onClick={() => { if (!isEditing) onSelect(tab.id); }}
            onDoubleClick={(e) => startEdit(tab, e)}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-600 text-slate-100 rounded px-1 w-28 outline-none text-xs"
              />
            ) : (
              <span className="max-w-[130px] truncate select-none">{tab.name}</span>
            )}

            {/* Botón de cerrar: visible solo en hover cuando hay más de una pestaña */}
            {tabs.length > 1 && !isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(tab.id); }}
                className={`ml-0.5 rounded-sm leading-none transition-colors ${
                  isActive
                    ? 'text-slate-400 hover:text-white'
                    : 'text-transparent group-hover:text-slate-500 hover:!text-slate-200'
                }`}
                title="Cerrar pestaña"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* Botón nueva pestaña */}
      <button
        onClick={onAdd}
        className="ml-1 px-2 py-0.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded text-base leading-none transition-colors shrink-0"
        title="Nueva pestaña de esquema"
      >
        +
      </button>
    </div>
  );
}
