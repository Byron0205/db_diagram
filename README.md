# SQL Schema Diagram

SPA para pegar/escribir sentencias `CREATE TABLE` y visualizar el esquema como un
diagrama entidad-relación interactivo, en tiempo real y 100% en el navegador
(sin backend — todo vive en `localStorage`).

## Funcionalidades principales

- **Editor SQL** con resaltado de sintaxis (CodeMirror 6) y parser propio tolerante
  a errores (soporta múltiples dialectos: MySQL, PostgreSQL, SQL Server, SQLite).
- **Diagrama interactivo** (React Flow) con auto-layout (dagre), reacomodo manual
  y automático al detectar cambios estructurales, exportación a PNG.
- **Pestañas** para mantener varios esquemas en paralelo, persistidas en `localStorage`.
- **Importación inteligente** desde texto libre o respuestas de Claude (extrae
  bloques ` ```sql ` o detecta `CREATE TABLE` en prosa).
- **Compartir por URL**: el esquema se comprime (lz-string) y viaja en el hash
  de la URL — no requiere servidor.
- **Documentación desde comentarios SQL**: los comentarios `--` antes de un
  `CREATE TABLE` o al final de una columna se muestran en el diagrama.

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo (Vite, HMR)
npm run build     # type-check (tsc -b) + build de producción
npm run lint      # ESLint
npm run preview   # sirve el último build de producción
```

No hay suite de tests configurada todavía. La verificación es manual ejecutando
`npm run dev` (ver `ROADMAP.md` → sección "Técnico / deuda").

## Stack

Vite 8 + React 19 + TypeScript 6 · Tailwind CSS 4 · CodeMirror 6 · React Flow 12 ·
dagre · html-to-image · lz-string.

## Documentación del proyecto

- **`CLAUDE.md`** — arquitectura, flujo de datos, convenciones de código. Léelo
  antes de tocar el parser o el diagrama.
- **`ROADMAP.md`** — ideas y mejoras pendientes, organizadas por área.
