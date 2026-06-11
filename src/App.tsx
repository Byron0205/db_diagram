import { useMemo, useState } from 'react';
import { SqlEditor } from './components/SqlEditor';
import { DiagramCanvas } from './components/DiagramCanvas';
import { TabBar } from './components/TabBar';
import { HelpModal } from './components/HelpModal';
import { useDebounce } from './hooks/useDebounce';
import { useTabs } from './hooks/useTabs';
import { parseSql } from './parser/sqlParser';

const EDITOR_PANEL_WIDTH = 560;

export default function App() {
  const { tabs, activeTab, activeId, setActiveId, updateActiveSql, addTab, removeTab, renameTab } =
    useTabs();

  // Debounce de 400ms para no parsear en cada pulsación de tecla
  const debouncedSql = useDebounce(activeTab.sql, 400);

  // Parsear el SQL debounced para obtener tablas y errores
  const { tables, errors } = useMemo(() => parseSql(debouncedSql), [debouncedSql]);

  const [editorOpen, setEditorOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* ── Panel izquierdo: pestañas + editor SQL ───────────────────────── */}
      <div
        className={`flex flex-col border-r border-slate-700 shrink-0 transition-all duration-200 ${
          editorOpen ? '' : 'overflow-hidden'
        }`}
        style={{ width: editorOpen ? EDITOR_PANEL_WIDTH : 0 }}
      >
        {/* Barra de pestañas */}
        <TabBar
          tabs={tabs}
          activeId={activeId}
          onSelect={setActiveId}
          onAdd={addTab}
          onRemove={removeTab}
          onRename={renameTab}
        />

        {/* Editor SQL */}
        <div className="flex-1 min-h-0">
          <SqlEditor value={activeTab.sql} onChange={updateActiveSql} />
        </div>
      </div>

      {/* ── Divisor / toggle ────────────────────────────────────────────── */}
      <button
        onClick={() => setEditorOpen((v) => !v)}
        className="flex items-center justify-center w-5 bg-slate-800 hover:bg-slate-700 border-r border-slate-700 shrink-0 cursor-col-resize transition-colors group"
        title={editorOpen ? 'Ocultar editor' : 'Mostrar editor'}
      >
        <svg
          className={`w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform ${
            editorOpen ? '' : 'rotate-180'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── Panel derecho: canvas del diagrama ──────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior del canvas */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-200">SQL Schema Diagram</h1>
            {tables.length > 0 && (
              <span className="text-xs text-slate-500">
                {tables.length} tabla{tables.length !== 1 ? 's' : ''}
                {' · '}
                {tables.reduce((acc, t) => acc + t.foreignKeys.length, 0)} FK
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {errors.length > 0 && (
              <span className="text-xs text-amber-400">
                ⚠ {errors.length} advertencia{errors.length > 1 ? 's' : ''} de parseo
              </span>
            )}
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center justify-center w-6 h-6 rounded-full border border-slate-600 text-slate-400 hover:text-slate-100 hover:border-slate-400 text-xs font-bold transition-colors cursor-pointer"
              title="Ayuda — cómo usar la herramienta"
            >
              ?
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0">
          <DiagramCanvas tables={tables} errors={errors} />
        </div>
      </div>
      {/* Modal de ayuda */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
