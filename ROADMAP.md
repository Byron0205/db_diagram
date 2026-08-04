# Roadmap — SQL Schema Diagram v2

Ideas y mejoras identificadas al cierre de v1. Organizadas por área y prioridad aproximada.

---

## Parser

### Soporte `ALTER TABLE`
El parser actual solo procesa `CREATE TABLE`. Muchos dumps reales definen las FK en sentencias `ALTER TABLE ADD CONSTRAINT` separadas. Añadir soporte permitiría importar scripts de producción sin modificarlos.

### Comentarios de bloque `/* */` como documentación
Los comentarios `/* */` se descartan hoy (línea 54-59 de `sqlParser.ts`). Podrían capturarse igual que `--` para usarse como descripción de tabla o columna cuando aparecen en la misma posición.

### Soporte `CREATE VIEW`
Representar vistas en el diagrama con un estilo visual diferenciado (borde punteado, icono distinto). Actualmente el parser ignora todo lo que no sea `CREATE TABLE`.

### Tipos de columna enriquecidos
Detectar y visualizar `ENUM('a','b','c')` mostrando los valores permitidos en el tooltip de columna. El parser actual almacena el tipo como string pero no desglosa los argumentos de `ENUM`.

---

## Diagrama

### ✅ Resaltado de relaciones al seleccionar una tabla (implementado)
Clic en un nodo resalta las aristas y tablas conectadas (opacidad reducida en el resto); clic en el fondo limpia la selección. Ver `DiagramCanvas.tsx` (`onNodeClick`/`onPaneClick`, `connectedSet`).

### ✅ Colapsar/expandir columnas en un nodo (implementado)
Botón chevron en la cabecera de `TableNode` oculta la lista de columnas. Los handles de las columnas FK se mantienen montados (agrupados bajo la cabecera) mientras está colapsado para no romper las aristas existentes.

### ✅ Agrupación visual por módulo (implementado, versión simplificada)
Implementado como etiquetado por color en lugar de contenedores arrastrables de React Flow: cada tabla puede asignarse a un grupo (nombre libre) desde un botón en la cabecera del nodo, con color derivado por hash del nombre y leyenda en el canvas. Los contenedores arrastrables (agrupar por posición, no solo por color) quedan como posible mejora futura si se necesita organización espacial además de visual. El estado de grupos no se persiste todavía en `localStorage` — pendiente si se requiere entre sesiones.

### Ocultar tablas del diagrama sin borrarlas del SQL
Checkbox o menú contextual por nodo para excluir una tabla del canvas temporalmente. El SQL no cambia, solo el renderizado.

### Filtro / búsqueda de tablas
Campo de búsqueda en la barra superior que resalta o hace zoom sobre el nodo cuyo nombre coincide. Especialmente útil cuando el esquema supera ~15 tablas.

---

## Importación y exportación

### ✅ Importar archivo `.sql` desde disco (implementado)
Botón "📂 Abrir archivo .sql" en `ImportModal.tsx` que lee un archivo local con la File API y llena el textarea de importación.

### ✅ Exportar a SVG (implementado)
Menú "Exportar" en `DiagramCanvas.tsx` con opción SVG vía `toSvg()` de `html-to-image`, junto a PNG.

### ✅ Exportar a Mermaid (implementado)
`src/lib/exportDiagram.ts` → `tablesToMermaid()` genera sintaxis `erDiagram` a partir de `Table[]`, descargable como `.mmd` desde el menú Exportar.

### ✅ Exportar documentación a Markdown (implementado)
`src/lib/exportDiagram.ts` → `tablesToMarkdown()` genera un `.md` con tabla de columnas y descripciones (de los comentarios SQL) por cada tabla, descargable desde el menú Exportar.

---

## Editor SQL

### Formatear / prettify SQL
Botón "Formatear" que aplica indentación y capitalización de keywords al SQL activo. Puede hacerse con una librería como `sql-formatter` o con un formateador propio sencillo.

### Marcadores de error inline en el editor
Hoy los errores de parseo aparecen como contador en la barra superior. Sería más útil subrayar en el editor la línea aproximada donde falló cada `CREATE TABLE`, usando las extensiones de diagnóstico de CodeMirror 6.

### Snippets / plantillas
Paleta de comandos (`Ctrl+P` o botón) con fragmentos predefinidos: tabla simple, tabla con PK compuesta, tabla con auditoría (`created_at`, `updated_at`). Inserta el snippet en la posición del cursor del editor.

---

## Pestañas y persistencia

### Reordenar pestañas con drag & drop
La barra de pestañas actual no permite reordenarlas. Añadir drag entre tabs y persistir el orden en `localStorage`.

### Duplicar pestaña
Opción en el menú contextual (clic derecho sobre pestaña) para crear una copia de la pestaña activa con un nombre derivado.

### Exportar / importar todas las pestañas como JSON
Botón "Exportar workspace" que genera un JSON con el array `SchemaTab[]` completo y "Importar workspace" que lo restaura. Permite hacer backups o mover el estado entre navegadores.

---

## Compartir

### URL corta con backend mínimo
Las URLs con `#import=` pueden volverse muy largas para esquemas grandes. Un endpoint serverless (Cloudflare Worker o similar) que almacena el payload comprimido y devuelve un ID corto (`/s/abc123`) reduciría la longitud y permitiría compartir por chat o QR.

### Vista de solo lectura embebible
Parámetro `?readonly=1` en la URL que oculta el editor SQL y la barra de pestañas, mostrando solo el canvas. Útil para incrustar el diagrama en wikis o documentación.

---

## UX general

### Deshacer cambios en el SQL (Ctrl+Z en el canvas)
CodeMirror ya gestiona undo/redo dentro del editor. Para el canvas: deshacer el último "Re-acomodar" o la última importación con un botón o atajo.

### Indicador de tamaño del esquema en la URL
Cuando el usuario pulsa "Copiar enlace", mostrar cuántos caracteres tiene la URL generada y advertir si supera un umbral (~2000 caracteres) para que sepa que puede fallar en ciertos navegadores.

### Modo PWA (instalable)
Añadir `manifest.json` y un Service Worker mínimo para que la app pueda instalarse como aplicación de escritorio y funcionar offline. El 100% del estado está en localStorage; no requiere red.

---

## Técnico / deuda

### Migrar posiciones del canvas a `useTabs`
Hoy las posiciones manuales de los nodos se guardan en un `useRef` dentro de `DiagramCanvas` y se pierden al recargar. Moverlas a `localStorage` (asociadas al ID de pestaña) las haría persistentes entre sesiones.

### Tests unitarios para el parser
`parseSql()` es la pieza más crítica y compleja del sistema. Un conjunto de tests con casos como PK compuesta, FK inline, nombres calificados y errores tolerados daría confianza para extender el parser sin regresiones. Considerar Vitest, que ya es compatible con Vite.

### Límite y paginación para esquemas muy grandes
Para schemas con >50 tablas el render de React Flow puede degradarse. Evaluar virtualización de nodos o límites de visibilidad basados en el viewport del canvas.
