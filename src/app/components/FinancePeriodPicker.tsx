'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PeriodFilter } from '@/lib/financeData';

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'August',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
];

function monthLabel(value: string): string {
  const [year, month] = value.split('-');
  const idx = Number(month) - 1;
  return `${MONTH_NAMES[idx] ?? month} ${year}`;
}

function lastMonths(count: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

interface FinancePeriodPickerProps {
  period: PeriodFilter;
  onChange: (period: PeriodFilter) => void;
}

/** Month selector + custom date-range picker for finance pages. */
export default function FinancePeriodPicker({ period, onChange }: FinancePeriodPickerProps) {
  const months = useMemo(() => lastMonths(12), []);
  const [showRange, setShowRange] = useState(period.mode === 'range');

  const inputClass =
    'px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-4 flex flex-wrap items-center gap-3">
      <CalendarDays size={18} className="text-primary shrink-0" />

      {!showRange ? (
        <select
          value={period.mode === 'month' ? period.month : ''}
          onChange={(event) => onChange({ mode: 'month', month: event.target.value })}
          className={inputClass}
          aria-label="Odaberi mjesec"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {monthLabel(month)}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            type="date"
            value={period.from || ''}
            onChange={(event) =>
              onChange({ mode: 'range', from: event.target.value, to: period.to })
            }
            className={inputClass}
            aria-label="Od datuma"
          />
          <span className="text-sm text-muted-foreground">do</span>
          <input
            type="date"
            value={period.to || ''}
            onChange={(event) =>
              onChange({ mode: 'range', from: period.from, to: event.target.value })
            }
            className={inputClass}
            aria-label="Do datuma"
          />
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setShowRange(!showRange);
          if (!showRange) onChange({ mode: 'month', month: months[0] });
        }}
        className="text-xs font-medium text-primary hover:underline ml-auto"
      >
        {showRange ? 'Odaberi mjesec' : 'Custom raspon'}
      </button>
    </div>
  );
}
