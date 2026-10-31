'use client';

import React, { useMemo } from 'react';
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

function toIso(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Current week, Monday → today. */
function currentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return { from: toIso(monday), to: toIso(now) };
}

/** Last `days` days including today. */
function lastDaysRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: toIso(from), to: toIso(to) };
}

interface FinancePeriodPickerProps {
  period: PeriodFilter;
  onChange: (period: PeriodFilter) => void;
}

/** Month selector + custom date-range picker for finance pages. */
export default function FinancePeriodPicker({ period, onChange }: FinancePeriodPickerProps) {
  const months = useMemo(() => lastMonths(12), []);
  const showRange = period.mode === 'range';

  const inputClass =
    'min-w-0 max-w-full px-2 py-2 text-xs sm:px-3 sm:text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="min-w-0 bg-card border border-border rounded-xl shadow-card p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <CalendarDays size={18} className="text-primary shrink-0" />

      {/* Quick presets */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ mode: 'range', ...currentWeekRange() })}
          className="px-2 sm:px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          Ova sedmica
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: 'range', ...lastDaysRange(15) })}
          className="px-2 sm:px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          Zadnjih 15 dana
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: 'range', ...lastDaysRange(30) })}
          className="px-2 sm:px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          Zadnjih 30 dana
        </button>
      </div>

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
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:w-auto sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end sm:gap-2">
          <label className="block min-w-0 rounded-lg border border-border bg-background p-2 text-xs text-muted-foreground">Od
            <input
              type="date"
              value={period.from || ''}
              onChange={(event) =>
                onChange({ mode: 'range', from: event.target.value, to: period.to })
              }
              className={`${inputClass} mt-1 block box-border w-full`}
              aria-label="Od datuma"
            />
          </label>
          <span className="hidden pb-2 text-sm text-muted-foreground sm:block">do</span>
          <label className="block min-w-0 rounded-lg border border-border bg-background p-2 text-xs text-muted-foreground">Do
            <input
              type="date"
              value={period.to || ''}
              onChange={(event) =>
                onChange({ mode: 'range', from: period.from, to: event.target.value })
              }
              className={`${inputClass} mt-1 block box-border w-full`}
              aria-label="Do datuma"
            />
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (showRange) {
            onChange({ mode: 'month', month: months[0] });
          } else {
            const today = new Date();
            onChange({
              mode: 'range',
              from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)),
              to: toIso(today),
            });
          }
        }}
        className="text-xs font-medium text-primary hover:underline ml-auto"
      >
        {showRange ? 'Odaberi mjesec' : 'Custom raspon'}
      </button>
    </div>
  );
}
