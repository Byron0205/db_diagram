/**
 * Barra de pestañas de esquemas.
 * - Clic: cambiar pestaña activa
 * - Doble clic en el nombre: renombrar inline
 * - Botón ×: cerrar (deshabilitado si solo queda una)
 * - Botón +: crear nueva pestaña vacía
 */

import { useState, useRef, useEffect } from 'react';
import type { SchemaTab, TabKind } from '../hooks/useTabs';

interface TabBarProps {
  tabs: SchemaTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (kind: TabKind) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

const KIND_BADGE: Record<TabKind, string> = { 'sql-schema': 'SQL', flowchart: 'FLW' };

export function TabBar({ tabs, activeId, onSelect, onAdd, onRemove, onRename }: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (!addMenuOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [addMenuOpen]);

  function handleAdd(kind: TabKind) {
    setAddMenuOpen(false);
    onAdd(kind);
  }

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
              <>
                <span
                  className={`shrink-0 text-[9px] font-bold tracking-wide px-1 rounded-sm ${
                    tab.kind === 'flowchart'
                      ? 'bg-emerald-900/60 text-emerald-300'
                      : 'bg-indigo-900/60 text-indigo-300'
                  }`}
                >
                  {KIND_BADGE[tab.kind]}
                </span>
                <span className="max-w-[130px] truncate select-none">{tab.name}</span>
              </>
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

      {/* Botón nueva pestaña — abre selector de tipo de proyecto */}
      <div ref={addMenuRef} className="relative shrink-0">
        <button
          onClick={(e) => {
            // React limpia `e.currentTarget` apenas termina de despachar el
            // evento, así que el rect se calcula acá (síncrono, dentro del
            // handler) y NO dentro del callback de setAddMenuOpen — ese
            // callback se invoca en un render diferido, donde currentTarget
            // ya es null y getBoundingClientRect() revienta con excepción
            // no capturada (pantalla en blanco, sin error boundary).
            if (!addMenuOpen) {
              // El contenedor de la barra usa overflow-x-auto, lo que por
              // spec de CSS fuerza overflow-y a 'auto' también — un popover
              // `absolute` que sale hacia abajo del contenedor quedaría
              // recortado por ese overflow. `fixed` con coordenadas del
              // botón lo saca de ese clipping.
              const rect = e.currentTarget.getBoundingClientRect();
              setAddMenuPos({ top: rect.bottom + 4, left: rect.left });
            }
            setAddMenuOpen((v) => !v);
          }}
          className="ml-1 px-2 py-0.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded text-base leading-none transition-colors"
          title="Nueva pestaña"
        >
          +
        </button>
        {addMenuOpen && addMenuPos && (
          <div
            className="fixed w-44 bg-slate-800 border border-slate-600 rounded shadow-xl overflow-hidden z-50"
            style={{ top: addMenuPos.top, left: addMenuPos.left }}
          >
            <button
              onClick={() => handleAdd('sql-schema')}
              className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              🗄️ Esquema SQL
            </button>
            <button
              onClick={() => handleAdd('flowchart')}
              className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              🔀 Diagrama de flujo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
