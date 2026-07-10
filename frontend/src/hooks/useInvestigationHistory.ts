import { useEffect, useMemo, useState } from 'react';

export interface InvestigationHistoryItem {
  id: string;
  ts: number;
  incident: string;
  severity: 'P0' | 'P1' | 'P2';
  outcome: 'completed' | 'failed' | 'rejected';
  confidence?: number;
}

const STORAGE_KEY = 'opspilot.investigationHistory.v1';

function safeParse(json: string | null): InvestigationHistoryItem[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? (value as InvestigationHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: InvestigationHistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

export function useInvestigationHistory() {
  const [items, setItems] = useState<InvestigationHistoryItem[]>(() => safeParse(localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    save(items);
  }, [items]);

  const recent = useMemo(() => items.slice(0, 8), [items]);

  function add(next: Omit<InvestigationHistoryItem, 'id' | 'ts'>) {
    const item: InvestigationHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ts: Date.now(),
      ...next,
    };
    setItems((prev) => [item, ...prev].slice(0, 50));
  }

  return { items, recent, add };
}

