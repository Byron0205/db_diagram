/**
 * Modal de ayuda con guía de uso completa de la herramienta.
 * Se cierra con el botón ×, haciendo clic en el fondo o pulsando Escape.
 */

import { useEffect } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

// ── Componentes de presentación ───────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-700">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-slate-700 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

function Block({ children }: { children: string }) {
  return (
    <pre className="text-xs bg-slate-900 border border-slate-700 rounded p-3 overflow-x-auto font-mono text-slate-300 leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start bg-indigo-950/50 border border-indigo-800/50 rounded p-2.5 text-xs text-slate-300">
      <span className="text-indigo-400 shrink-0 mt-0.5">💡</span>
      <span>{children}</span>
    </div>
  );
}

function Row({ label, desc }: { label: React.ReactNode; desc: string }) {
  return (
    <div className="flex gap-3 items-start py-1.5 border-b border-slate-800 last:border-0">
      <div className="shrink-0 w-48">{label}</div>
      <span className="text-slate-400 text-xs">{desc}</span>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

export function HelpModal({ onClose }: HelpModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* Fondo oscuro */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Contenedor del modal — detiene la propagación del clic */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-slate-800 border border-slate-600 rounded-lg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-100">Guía de uso</h2>
            <p className="text-xs text-slate-500 mt-0.5">SQL Schema Diagram — referencia rápida</p>
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
        <div className="overflow-y-auto px-6 py-5 flex-1">

          {/* ── CREATE TABLE ────────────────────────────────────────────── */}
          <Section title="Crear tablas">
            <p className="text-xs text-slate-400 mb-3">
              Escribe sentencias <Code>CREATE TABLE</Code> en el panel izquierdo. El diagrama
              se actualiza automáticamente mientras escribes.
            </p>
            <Block>{`CREATE TABLE productos (
  id          INT           NOT NULL PRIMARY KEY,
  nombre      VARCHAR(200)  NOT NULL,
  precio      DECIMAL(10,2) NOT NULL,
  categoria_id INT
);`}</Block>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <p>También se soportan variantes como:</p>
              <ul className="mt-1.5 space-y-1 ml-3 list-disc list-inside">
                <li><Code>CREATE TABLE IF NOT EXISTS nombre (...)</Code></li>
                <li>Nombres calificados: <Code>dbo.Tabla</Code>, <Code>public.tabla</Code></li>
                <li>
                  Identificadores con comillas:{' '}
                  <Code>`nombre`</Code> <Code>&quot;nombre&quot;</Code> <Code>[nombre]</Code>
                </li>
              </ul>
            </div>
          </Section>

          {/* ── COLUMNAS ────────────────────────────────────────────────── */}
          <Section title="Columnas y tipos de datos">
            <p className="text-xs text-slate-400 mb-3">
              Cada columna se define como <Code>nombre TIPO [modificadores]</Code>.
              Los tipos con parámetros se soportan igual:{' '}
              <Code>VARCHAR(255)</Code>, <Code>DECIMAL(10,2)</Code>.
            </p>

            <p className="text-xs font-semibold text-slate-300 mb-2">Modificadores soportados</p>
            <div className="text-xs mb-4">
              <Row label={<Code>NOT NULL</Code>} desc="Columna requerida (se muestra 'NN' en el nodo)" />
              <Row label={<Code>UNIQUE</Code>} desc="Valor único en la tabla" />
              <Row label={<Code>DEFAULT valor</Code>} desc="Valor por defecto (se ignora en el diagrama)" />
              <Row label={<Code>AUTO_INCREMENT / IDENTITY</Code>} desc="Generación automática de valor" />
            </div>

            <p className="text-xs font-semibold text-slate-300 mb-2">Tipos reconocidos (resaltado)</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              INT, BIGINT, SMALLINT, TINYINT, DECIMAL, NUMERIC, FLOAT, DOUBLE, BIT, BOOLEAN,
              VARCHAR, CHAR, TEXT, NVARCHAR, NCHAR, DATE, DATETIME, TIMESTAMP, TIME,
              BLOB, UUID, UNIQUEIDENTIFIER, JSON, XML…
            </p>
          </Section>

          {/* ── LLAVES ──────────────────────────────────────────────────── */}
          <Section title="Llaves primarias y foráneas">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              Llave primaria — icono <span className="text-amber-400">🔑</span>
            </p>
            <Block>{`-- Inline
id INT NOT NULL PRIMARY KEY

-- A nivel de tabla (PK compuesta)
PRIMARY KEY (pedido_id, producto_id)`}</Block>

            <p className="text-xs font-semibold text-slate-300 mt-4 mb-2">
              Llave foránea — icono <span className="text-indigo-400">🔗</span> y línea de conexión
            </p>
            <Block>{`-- Inline (referencia directa en la columna)
usuario_id INT REFERENCES usuarios(id)

-- A nivel de tabla
FOREIGN KEY (usuario_id) REFERENCES usuarios(id)

-- Con nombre de constraint
CONSTRAINT fk_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)

-- ON DELETE/UPDATE se reconocen y se ignoran sin romper el parseo
FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE`}</Block>

            <div className="mt-3">
              <Tip>
                Las FK solo dibujan una línea si la tabla referenciada también está definida
                en el mismo esquema. FK a tablas externas se marcan en el nodo pero no
                generan aristas.
              </Tip>
            </div>
          </Section>

          {/* ── COMENTARIOS COMO DOC ────────────────────────────────────── */}
          <Section title="Documentar con comentarios SQL">
            <p className="text-xs text-slate-400 mb-3">
              Los comentarios <Code>--</Code> se capturan y se muestran en el diagrama.
              No necesitas ninguna sintaxis especial: son comentarios SQL estándar.
            </p>
            <Block>{`-- Descripción de la tabla: aparece en la cabecera del nodo.
-- Puede ocupar varias líneas consecutivas.
CREATE TABLE pedidos (
  id          INT      NOT NULL PRIMARY KEY, -- PK surrogate
  estado      VARCHAR(30) NOT NULL,          -- pending | paid | shipped
  cliente_id  INT      NOT NULL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);`}</Block>
            <div className="mt-3 space-y-2 text-xs">
              <Row
                label={<span className="text-slate-300">Antes del <Code>CREATE TABLE</Code></span>}
                desc="Se muestra como subtítulo en la cabecera del nodo (soporte multiline)"
              />
              <Row
                label={<span className="text-slate-300">Al final de una columna</span>}
                desc="Se muestra al pasar el cursor sobre esa fila del nodo (hover)"
              />
            </div>
          </Section>

          {/* ── CANVAS ──────────────────────────────────────────────────── */}
          <Section title="Controles del canvas">
            <div className="text-xs space-y-0.5">
              <Row label={<span className="text-slate-300">Rueda del ratón</span>} desc="Zoom in / zoom out" />
              <Row label={<span className="text-slate-300">Arrastrar el fondo</span>} desc="Mover la vista (pan)" />
              <Row label={<span className="text-slate-300">Arrastrar una tabla</span>} desc="Reposicionar el nodo libremente" />
              <Row
                label={<span className="text-slate-300">Botón <Code>Re-acomodar</Code></span>}
                desc="Reorganiza todas las tablas automáticamente con auto-layout (dagre)"
              />
              <Row
                label={<span className="text-slate-300">Botón <Code>Exportar PNG</Code></span>}
                desc="Descarga el diagrama visible como imagen PNG (resolución 2×)"
              />
              <Row
                label={<span className="text-slate-300">Botón <Code>‹</Code> del divisor</span>}
                desc="Muestra u oculta el panel del editor SQL"
              />
              <Row label={<span className="text-slate-300">Minimapa</span>} desc="Vista general del diagrama en la esquina inferior derecha" />
            </div>
          </Section>

          {/* ── PESTAÑAS ────────────────────────────────────────────────── */}
          <Section title="Pestañas de esquemas">
            <p className="text-xs text-slate-400 mb-3">
              Guarda varios esquemas independientes para comparar alternativas de diseño
              o separar módulos de tu sistema.
            </p>
            <div className="text-xs space-y-0.5">
              <Row label={<span className="text-slate-300">Clic en una pestaña</span>} desc="Cambia al esquema de esa pestaña" />
              <Row label={<span className="text-slate-300">Doble clic en el nombre</span>} desc="Renombra la pestaña inline (confirmar con Enter, cancelar con Escape)" />
              <Row label={<span className="text-slate-300">Botón <Code>+</Code></span>} desc="Crea una nueva pestaña vacía" />
              <Row label={<span className="text-slate-300">Botón <Code>×</Code></span>} desc="Cierra esa pestaña (no disponible si solo hay una)" />
            </div>
            <div className="mt-3">
              <Tip>
                Todo se guarda automáticamente en el navegador (localStorage). Al recargar
                la página recuperas exactamente el estado en que lo dejaste.
              </Tip>
            </div>
          </Section>

          {/* ── TIPS GENERALES ──────────────────────────────────────────── */}
          <Section title="Tips de uso">
            <div className="space-y-2">
              <Tip>
                El parser es <strong className="text-slate-200">tolerante a errores</strong>: si una
                sentencia está incompleta (porque estás a mitad de escribirla), las demás tablas
                siguen dibujándose con normalidad.
              </Tip>
              <Tip>
                Puedes mezclar dialectos sin problema: <Code>AUTO_INCREMENT</Code> (MySQL),
                {' '}<Code>IDENTITY</Code> (SQL Server), <Code>SERIAL</Code> (PostgreSQL) — todos
                se reconocen y se ignoran sin romper el parseo.
              </Tip>
              <Tip>
                Al re-acomodar el diagrama, las posiciones que hayas ajustado manualmente
                se resetean. Úsalo cuando el diagrama se desordene mucho.
              </Tip>
              <Tip>
                Las posiciones que arrastras manualmente se <strong className="text-slate-200">conservan</strong> entre
                regeneraciones del diagrama: agregar columnas o nuevas tablas no mueve
                lo que ya tenías ubicado.
              </Tip>
            </div>
          </Section>

        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3 border-t border-slate-700 shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-600">Pulsa <Code>Escape</Code> o haz clic fuera para cerrar</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded border border-indigo-500 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
