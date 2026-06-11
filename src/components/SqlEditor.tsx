/**
 * Editor de SQL con resaltado de palabras reservadas usando CodeMirror 6.
 * Dialecto genérico (no atado a un motor) con todas las keywords y tipos
 * definidos en sqlKeywords.ts.
 */

import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLDialect } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { SQL_KEYWORDS, SQL_TYPES } from '../parser/sqlKeywords';

// Creamos un dialecto SQL genérico con nuestra lista de keywords y tipos
const GenericSQL = SQLDialect.define({
  keywords: SQL_KEYWORDS.join(' ').toLowerCase(),
  types: SQL_TYPES.join(' ').toLowerCase(),
  operatorChars: '*+-%<>!=&|^~',
  identifierQuotes: '`"[]',
});

interface SqlEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function SqlEditor({ value, onChange }: SqlEditorProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Cabecera del panel */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          SQL Schema
        </span>
        <span className="text-xs text-slate-600">CREATE TABLE</span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={[sql({ dialect: GenericSQL, upperCaseKeywords: false })]}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            rectangularSelection: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
