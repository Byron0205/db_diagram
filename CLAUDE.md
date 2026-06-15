# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # servidor de desarrollo (Vite, HMR)
npm run build     # type-check (tsc -b) + build de producción
npm run lint      # ESLint
npm run preview   # sirve el último build de producción
```

No hay suite de tests configurada. La verificación es manual ejecutando `npm run dev`.

## Stack

- **Vite 8 + React 19 + TypeScript 6** — SPA, sin SSR.
- **Tailwind CSS 4** vía el plugin `@tailwindcss/vite` (sin `tailwind.config.js`; la directiva `@import "tailwindcss"` va en `src/index.css`).
- **CodeMirror 6** (`@uiw/react-codemirror` + `@codemirror/lang-sql`) — editor SQL con dialecto genérico definido en `SqlEditor.tsx`.
- **React Flow 12** (`@xyflow/react`) — canvas de diagrama con nodos custom.
- **dagre** (`@dagrejs/dagre`) — auto-layout dirigido para posicionamiento inicial de nodos.
- **html-to-image** — exportación del canvas a PNG.

### Restricciones del compilador relevantes
`tsconfig.app.json` tiene `erasableSyntaxOnly: true` y `noUnusedLocals/Parameters: true`.
- Prohíbe `enum`, `namespace` y **constructor parameter properties** (`constructor(private x: T)`). Usar campos declarados explícitamente.
- Todos los imports de solo tipo deben usar `import type` o la forma inline `type Node`.

## Arquitectura

### Flujo de datos principal

```
[SqlEditor] → onChange → useTabs.updateActiveSql
                              ↓
                         activeTab.sql (localStorage)
                              ↓ (debounce 400ms)
                         parseSql()  ← src/parser/sqlParser.ts
                              ↓
                         Table[]  ←  src/parser/types.ts
                              ↓
                         buildGraph()  ← src/diagram/buildGraph.ts
                              ↓
                    nodes: TableNodeType[]  +  edges: Edge[]
                              ↓ (solo nodos sin posición conocida)
                         applyAutoLayout()  ← src/diagram/autoLayout.ts
                              ↓
                    [DiagramCanvas / React Flow]
```

El estado de posiciones manuales del usuario se mantiene en un `useRef<Map>` dentro de `DiagramCanvas` y se preserva entre regeneraciones del diagrama; solo se resetea al pulsar "Re-acomodar".

### Parser (`src/parser/`)

Pipeline: `tokenize()` → `Cursor` → `parseCreateTable()` → `parseSql()`.

- `tokenize()` emite tokens `IDENT | STRING | COMMENT | LPAREN | RPAREN | COMMA | SEMICOLON | DOT | EOF`. Los comentarios `--` se emiten como `COMMENT` (no se descartan) para capturarlos como descripción de tabla/columna.
- `parseSql()` acumula tokens `COMMENT` consecutivos antes de cada `CREATE TABLE` y los pasa como `tableDescription`. Los tokens `COMMENT` al final de una definición de columna (antes o después de la coma) se asignan como `column.description`.
- El parser es **tolerante a errores**: si una tabla falla, se llama a `skipToNextCreate()` y el parseo continúa. Los errores se acumulan en `ParseResult.errors`.

### Tipos del diagrama (`src/diagram/`)

Los nodos de React Flow se tipan como `TableNodeType = Node<{ table: Table }, 'tableNode'>` (no como `NodeData` directo). Esto es obligatorio para que `NodeProps<TableNodeType>` resuelva correctamente en `TableNode.tsx`.

El ID de cada nodo es el nombre de la tabla. Los handle IDs siguen el patrón:
- Source (FK sale): `col-src-{tableName}-{colName}`
- Target (FK llega): `col-tgt-{tableName}`

### Persistencia (`src/hooks/useTabs.ts`)

- Clave `sqldiagram-tabs` → `SchemaTab[]` en localStorage.
- Clave `sqldiagram-active-tab` → ID de la pestaña activa.
- Incluye migración desde el formato antiguo de clave única `sqldiagram-schema`.

## Convenciones

- **Idioma**: código en inglés (nombres de variables, tipos), UI y comentarios en español.
- **Estilos**: exclusivamente clases Tailwind en los componentes. No hay módulos CSS ni archivos `.css` adicionales salvo `src/index.css` (solo la directiva de Tailwind + overrides mínimos para CodeMirror y React Flow).
- **Nodos custom de React Flow**: siempre usar `Node<Data, 'nodeType'>` como tipo base y registrarlos en `nodeTypes` con `as const` en el `type` del nodo al construirlos en `buildGraph.ts`.
