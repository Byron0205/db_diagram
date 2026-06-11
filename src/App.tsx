/**
 * Componente raíz de la SPA.
 * Layout dividido en dos paneles:
 *   - Izquierda: editor SQL (CodeMirror) con autoguardado en localStorage
 *   - Derecha:   canvas de diagrama (React Flow) con actualización en vivo
 */

import { useMemo, useState } from 'react';
import { SqlEditor } from './components/SqlEditor';
import { DiagramCanvas } from './components/DiagramCanvas';
import { useDebounce } from './hooks/useDebounce';
import { useLocalStorage } from './hooks/useLocalStorage';
import { parseSql } from './parser/sqlParser';
import { EXAMPLE_SCHEMA } from './data/exampleSchema';

// Ancho del panel izquierdo en píxeles (se puede ajustar arrastrando en el futuro)
const EDITOR_PANEL_WIDTH = 380;

export default function App() {
  // El texto SQL se persiste en localStorage; primera vez carga el esquema de ejemplo
  const [sqlText, setSqlText] = useLocalStorage<string>('sqldiagram-schema', EXAMPLE_SCHEMA);

  // Debounce de 400ms para no parsear en cada pulsación de tecla
  const debouncedSql = useDebounce(sqlText, 400);

  // Parseamos el SQL debounced para obtener tablas y errores
  const { tables, errors } = useMemo(() => parseSql(debouncedSql), [debouncedSql]);

  // Estado del panel: permite mostrar/ocultar el editor en pantallas pequeñas
  const [editorOpen, setEditorOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* ── Panel izquierdo: editor SQL ─────────────────────────────────── */}
      <div
        className={`flex flex-col border-r border-slate-700 shrink-0 transition-all duration-200 ${
          editorOpen ? '' : 'w-0 overflow-hidden'
        }`}
        style={{ width: editorOpen ? EDITOR_PANEL_WIDTH : 0 }}
      >
        <SqlEditor value={sqlText} onChange={setSqlText} />
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
          {errors.length > 0 && (
            <span className="text-xs text-amber-400">
              ⚠ {errors.length} advertencia{errors.length > 1 ? 's' : ''} de parseo
            </span>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0">
          <DiagramCanvas tables={tables} errors={errors} />
        </div>
      </div>
    </div>
  );
}
