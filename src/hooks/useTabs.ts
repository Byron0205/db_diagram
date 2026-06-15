import { useState, useCallback } from 'react';
import { EXAMPLE_SCHEMA } from '../data/exampleSchema';

export interface SchemaTab {
  id: string;
  name: string;
  sql: string;
}

const TABS_KEY   = 'sqldiagram-tabs';
const ACTIVE_KEY = 'sqldiagram-active-tab';

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function persistTabs(tabs: SchemaTab[]): void {
  try { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); } catch { /* sin storage */ }
}

function persistActive(id: string): void {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* sin storage */ }
}

function loadTabs(): SchemaTab[] {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SchemaTab[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignorar */ }

  // Migración desde el formato antiguo (clave 'sqldiagram-schema')
  try {
    const old = localStorage.getItem('sqldiagram-schema');
    if (old) {
      const sql = JSON.parse(old) as string;
      if (typeof sql === 'string' && sql.trim()) {
        return [{ id: genId(), name: 'Esquema 1', sql }];
      }
    }
  } catch { /* ignorar */ }

  return [{ id: genId(), name: 'Esquema 1', sql: EXAMPLE_SCHEMA }];
}

function loadActiveId(tabs: SchemaTab[]): string {
  try {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored && tabs.some((t) => t.id === stored)) return stored;
  } catch { /* ignorar */ }
  return tabs[0].id;
}

export function useTabs() {
  const [tabs, setTabsRaw] = useState<SchemaTab[]>(loadTabs);
  const [activeId, setActiveIdRaw] = useState<string>(() => loadActiveId(loadTabs()));

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const setTabs = useCallback((next: SchemaTab[]) => {
    setTabsRaw(next);
    persistTabs(next);
  }, []);

  const setActiveId = useCallback((id: string) => {
    setActiveIdRaw(id);
    persistActive(id);
  }, []);

  const updateActiveSql = useCallback(
    (sql: string) => {
      setTabs(tabs.map((t) => (t.id === activeId ? { ...t, sql } : t)));
    },
    [tabs, activeId, setTabs]
  );

  const addTab = useCallback(() => {
    const newTab: SchemaTab = { id: genId(), name: `Esquema ${tabs.length + 1}`, sql: '' };
    const next = [...tabs, newTab];
    setTabs(next);
    setActiveId(newTab.id);
  }, [tabs, setTabs, setActiveId]);

  /**
   * Crea una nueva pestaña con un SQL dado.
   * Si `name` está vacío, intenta derivarlo del primer CREATE TABLE encontrado.
   */
  const addTabWithSql = useCallback(
    (name: string, sql: string) => {
      let tabName = name.trim();
      if (!tabName) {
        const match = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.)?[`"[\s]?(\w+)/i.exec(sql);
        tabName = match ? match[1] : `Esquema ${tabs.length + 1}`;
      }
      const newTab: SchemaTab = { id: genId(), name: tabName, sql };
      const next = [...tabs, newTab];
      setTabs(next);
      setActiveId(newTab.id);
    },
    [tabs, setTabs, setActiveId]
  );

  const removeTab = useCallback(
    (id: string) => {
      if (tabs.length <= 1) return;
      const next = tabs.filter((t) => t.id !== id);
      setTabs(next);
      if (activeId === id) setActiveId(next[next.length - 1].id);
    },
    [tabs, activeId, setTabs, setActiveId]
  );

  const renameTab = useCallback(
    (id: string, name: string) => {
      setTabs(tabs.map((t) => (t.id === id ? { ...t, name } : t)));
    },
    [tabs, setTabs]
  );

  return { tabs, activeTab, activeId, setActiveId, updateActiveSql, addTab, addTabWithSql, removeTab, renameTab };
}
