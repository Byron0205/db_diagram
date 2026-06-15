/**
 * Modal de importación inteligente: pega la respuesta completa de Claude
 * (prosa + bloques ```sql) y la app extrae el SQL automáticamente.
 *
 * Acciones:
 *  - "Nueva pestaña"         → crea una pestaña nueva con el SQL extraído.
 *  - "Reemplazar activa"     → sobrescribe el SQL de la pestaña actual.
 *
 * Sección plegable con el prompt reutilizable para Claude.
 */

import { useEffect, useMemo, useState } from 'react';
import { extractSql } from '../lib/extractSql';
import { parseSql } from '../parser/sqlParser';
import { CLAUDE_PROMPT } from '../data/claudePrompt';
import { copyToClipboard } from '../lib/clipboard';

interface ImportModalProps {
  activeTabName: string;
  onNewTab: (name: string, sql: string) => void;
  onReplaceActive: (sql: string) => void;
  onClose: () => void;
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-slate-700 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

export function ImportModal({ activeTabName, onNewTab, onReplaceActive, onClose }: ImportModalProps) {
  const [raw, setRaw]           = useState('');
  const [tabName, setTabName]   = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied]     = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Vista previa en vivo: extraer SQL y parsear
  const extracted = useMemo(() => extractSql(raw), [raw]);
  const preview   = useMemo(() => (extracted ? parseSql(extracted) : null), [extracted]);

  // Nombre de pestaña derivado automáticamente del primer CREATE TABLE
  const derivedName = useMemo(() => {
    if (!extracted) return '';
    const match = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.)?[`"[\s]?(\w+)/i.exec(extracted);
    return match ? match[1] : '';
  }, [extracted]);

  function handleNewTab() {
    if (!extracted) return;
    onNewTab(tabName.trim() || derivedName, extracted);
    onClose();
  }

  function handleReplaceActive() {
    if (!extracted) return;
    onReplaceActive(extracted);
    onClose();
  }

  async function handleCopyPrompt() {
    const ok = await copyToClipboard(CLAUDE_PROMPT);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const hasContent = extracted.length > 0;
  const tableCount = preview?.tables.length ?? 0;
  const fkCount    = preview ? preview.tables.reduce((acc, t) => acc + t.foreignKeys.length, 0) : 0;

  return (
    /* Fondo oscuro */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Contenedor — detiene propagación */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-slate-800 border border-slate-600 rounded-lg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-100">Importar desde Claude</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pega la respuesta completa — el SQL se extrae automáticamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors text-xl leading-none px-1"
            title="Cerrar (Escape)"
          >
            ×
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">

          {/* ── Textarea ────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Respuesta de Claude
            </label>
            <textarea
              className="w-full h-44 bg-slate-900 border border-slate-600 rounded p-3 text-xs text-slate-300 font-mono resize-none outline-none focus:border-indigo-500 placeholder:text-slate-600"
              placeholder={`Pega aquí la respuesta completa de Claude.\nPuede incluir texto explicativo y bloques \`\`\`sql.\nEl SQL se extrae solo.`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* ── Vista previa ─────────────────────────────────────────── */}
          {raw.trim() && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded border text-xs ${
              hasContent
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
            }`}>
              {hasContent ? (
                <>
                  <span>✓</span>
                  <span>
                    SQL extraído —{' '}
                    <strong>{tableCount}</strong> tabla{tableCount !== 1 ? 's' : ''},{' '}
                    <strong>{fkCount}</strong> FK{fkCount !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <>
                  <span>⚠</span>
                  <span>
                    No se detectó ningún bloque SQL. Asegúrate de que la respuesta
                    contiene un bloque <Code>```sql</Code> o sentencias{' '}
                    <Code>CREATE TABLE</Code>.
                  </span>
                </>
              )}
            </div>
          )}

          {/* ── Nombre de pestaña ────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre de la pestaña{' '}
              <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
              placeholder={derivedName || 'Esquema importado'}
              value={tabName}
              onChange={(e) => setTabName(e.target.value)}
            />
          </div>

          {/* ── Sección plegable: Prompt para Claude ─────────────────── */}
          <div className="border border-slate-700 rounded">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              onClick={() => setPromptOpen((v) => !v)}
            >
              <span>💡 Prompt reutilizable para Claude</span>
              <span className={`transition-transform ${promptOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {promptOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-700">
                <p className="text-xs text-slate-500 pt-3">
                  Copia este prompt y pégalo antes de tu mensaje en Claude para garantizar
                  SQL compatible con el parser del diagramador.
                </p>
                <pre className="text-xs bg-slate-900 border border-slate-700 rounded p-3 overflow-x-auto font-mono text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {CLAUDE_PROMPT}
                </pre>
                <button
                  onClick={handleCopyPrompt}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                    copied
                      ? 'bg-emerald-700 border-emerald-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-slate-100'
                  }`}
                >
                  {copied ? '✓ Copiado' : 'Copiar prompt'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3 border-t border-slate-700 shrink-0 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-600 shrink-0">
            Pestaña activa: <span className="text-slate-500">{activeTabName}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleReplaceActive}
              disabled={!hasContent}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Sobreescribe el SQL de la pestaña activa"
            >
              Reemplazar activa
            </button>
            <button
              onClick={handleNewTab}
              disabled={!hasContent}
              className="px-4 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded border border-indigo-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Crea una nueva pestaña con el SQL importado"
            >
              Nueva pestaña
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
