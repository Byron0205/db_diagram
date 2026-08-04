/**
 * Nodo custom de React Flow que representa una tabla SQL.
 * Muestra descripción de tabla (de comentarios SQL) y descripciones de columna.
 * Soporta: colapsar/expandir columnas, resaltado por selección y agrupación
 * visual por color (asignada por el usuario, ver DiagramCanvas).
 */

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TableNodeType } from '../diagram/buildGraph';
import { sourceHandleId, targetHandleId } from '../diagram/buildGraph';

function KeyIcon() {
  return (
    <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FkIcon() {
  return (
    <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-indigo-300/70 transition-transform ${open ? '' : '-rotate-90'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

interface GroupBadgeProps {
  tableName: string;
  group: { name: string; color: string } | null | undefined;
  existingGroups: string[] | undefined;
  open: boolean;
  onToggle: (() => void) | undefined;
  onSetGroup: ((tableName: string, group: string | null) => void) | undefined;
}

// El estado "abierto/cerrado" vive en DiagramCanvas y se cierra a través de
// onNodeClick/onPaneClick (los mismos handlers que limpian el resaltado), así
// cualquier clic fuera del popover — en cualquier parte del canvas — lo cierra,
// sin depender de un listener manual de "click outside" sobre el documento.
function GroupBadge({ tableName, group, existingGroups, open, onToggle, onSetGroup }: GroupBadgeProps) {
  // El valor inicial se deriva de `group` una sola vez por montaje: el
  // componente se remonta (ver `key` en TableNode) cada vez que `open`
  // cambia, así el input siempre arranca sincronizado sin usar un efecto.
  const [value, setValue] = useState(group?.name ?? '');
  const listId = `group-suggestions-${tableName}`;

  function commit() {
    const trimmed = value.trim();
    onSetGroup?.(tableName, trimmed || null);
    onToggle?.();
  }

  return (
    <div className="relative nodrag nopan">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        title={group ? `Grupo: ${group.name}` : 'Asignar a un grupo'}
        className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 hover:scale-110 transition-transform"
        style={{ background: group?.color ?? 'transparent' }}
      />
      {open && (
        <div className="absolute z-20 top-5 left-0 w-40 bg-slate-900 border border-slate-600 rounded shadow-xl p-2 space-y-1.5">
          <input
            autoFocus
            list={listId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') onToggle?.();
            }}
            placeholder="Nombre de grupo"
            className="w-full bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-indigo-500"
          />
          <datalist id={listId}>
            {existingGroups?.map((g) => <option key={g} value={g} />)}
          </datalist>
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={commit}
              className="flex-1 text-[11px] px-1.5 py-0.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded"
            >
              Guardar
            </button>
            {group && (
              <button
                type="button"
                onClick={() => {
                  onSetGroup?.(tableName, null);
                  onToggle?.();
                }}
                className="text-[11px] px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const TableNode = memo(function TableNode({ data, selected: multiSelected }: NodeProps<TableNodeType>) {
  const {
    table,
    collapsed,
    dimmed,
    selected,
    group,
    existingGroups,
    groupPickerOpen,
    onToggleCollapse,
    onSetGroup,
    onToggleGroupPicker,
  } = data;

  const fkColumns = table.columns.filter((c) => c.isForeignKey);

  return (
    <div
      className={`min-w-[220px] max-w-[320px] bg-slate-800 border rounded shadow-lg select-none transition-opacity ${
        selected ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-600'
      } ${multiSelected ? 'outline-dashed outline-2 outline-offset-2 outline-sky-400' : ''} ${
        dimmed ? 'opacity-30' : 'opacity-100'
      }`}
      style={group ? { borderLeft: `4px solid ${group.color}` } : undefined}
    >
      {/* Handle target: las FK llegan a la tabla aquí */}
      <Handle
        type="target"
        position={Position.Left}
        id={targetHandleId(table.name)}
        style={{ background: '#6366f1', width: 8, height: 8, left: -5, top: '50%' }}
      />

      {/* Cabecera de la tabla */}
      <div className="px-3 py-2 bg-indigo-900 border-b border-slate-600 rounded-t">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleCollapse?.(table.name)}
            className="nodrag nopan shrink-0"
            title={collapsed ? 'Expandir columnas' : 'Colapsar columnas'}
          >
            <ChevronIcon open={!collapsed} />
          </button>
          <GroupBadge
            key={groupPickerOpen ? 'open' : 'closed'}
            tableName={table.name}
            group={group}
            existingGroups={existingGroups}
            open={groupPickerOpen ?? false}
            onToggle={onToggleGroupPicker ? () => onToggleGroupPicker(table.name) : undefined}
            onSetGroup={onSetGroup}
          />
          <span className="text-sm font-bold text-white tracking-wide truncate">{table.name}</span>
          {collapsed && (
            <span className="ml-auto text-[10px] text-indigo-300/60 shrink-0">
              {table.columns.length} col.
            </span>
          )}
        </div>
        {table.description && !collapsed && (
          <span className="text-[11px] text-indigo-300/70 italic leading-tight block mt-0.5 whitespace-pre-wrap">
            {table.description}
          </span>
        )}
      </div>

      {/* Handles de FK "flotantes": se mantienen montados mientras está
          colapsado para que las aristas no pierdan su punto de anclaje. */}
      {collapsed && fkColumns.length > 0 && (
        <div className="relative h-0">
          {fkColumns.map((col) => (
            <Handle
              key={col.name}
              type="source"
              position={Position.Right}
              id={sourceHandleId(table.name, col.name)}
              style={{ background: '#6366f1', width: 8, height: 8, right: -5, top: 0, position: 'absolute' }}
            />
          ))}
        </div>
      )}

      {/* Lista de columnas */}
      {!collapsed && (
        <div className="divide-y divide-slate-700">
          {table.columns.map((col) => (
            <div key={col.name} className="group">
              <div
                className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-slate-700/50"
                title={col.description}
              >
                {/* Icono de PK o FK */}
                <span className="w-4 flex items-center justify-center shrink-0">
                  {col.isPrimaryKey ? (
                    <KeyIcon />
                  ) : col.isForeignKey ? (
                    <FkIcon />
                  ) : (
                    <span className="w-3" />
                  )}
                </span>

                {/* Nombre de la columna */}
                <span
                  className={`font-medium truncate ${
                    col.isPrimaryKey
                      ? 'text-amber-300'
                      : col.isForeignKey
                      ? 'text-indigo-300'
                      : 'text-slate-200'
                  }`}
                >
                  {col.name}
                </span>

                {/* Tipo de dato */}
                <span className="ml-auto text-slate-500 shrink-0 pl-2">{col.type}</span>

                {/* NOT NULL indicator */}
                {col.isNotNull && !col.isPrimaryKey && (
                  <span className="text-slate-600 text-[9px] shrink-0">NN</span>
                )}

                {/* Indicador de que tiene descripción */}
                {col.description && (
                  <span className="text-indigo-500/60 text-[9px] shrink-0" title={col.description}>
                    ●
                  </span>
                )}

                {/* Handle source: las FK salen de esta columna */}
                {col.isForeignKey && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={sourceHandleId(table.name, col.name)}
                    style={{
                      background: '#6366f1',
                      width: 8,
                      height: 8,
                      right: -5,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                )}
              </div>

              {/* Descripción de columna expandida bajo la fila */}
              {col.description && (
                <div className="hidden group-hover:block px-3 pb-1.5 text-[10px] text-slate-400/70 italic bg-slate-700/30 -mt-px">
                  {col.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PK compuesta a nivel de tabla */}
      {table.primaryKey.length > 1 && !collapsed && (
        <div className="px-3 py-1 bg-slate-900/50 border-t border-slate-700 rounded-b">
          <span className="text-[10px] text-amber-500/70">
            PK: {table.primaryKey.join(', ')}
          </span>
        </div>
      )}
    </div>
  );
});
