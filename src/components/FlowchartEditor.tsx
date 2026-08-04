/**
 * Editor de texto plano para diagramas de flujo (sintaxis Mermaid).
 * A diferencia de SqlEditor, no usa un dialecto de resaltado de sintaxis —
 * fuera de alcance del MVP de flowchart.
 */

import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';

interface FlowchartEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function FlowchartEditor({ value, onChange }: FlowchartEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Diagrama de flujo
        </span>
        <span className="text-xs text-slate-600">Mermaid flowchart</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
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
