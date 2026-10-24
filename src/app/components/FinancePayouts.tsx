'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { activeMechanicNames, useMechanics } from '@/lib/mechanics';
import { PayoutRecord } from '@/lib/financeData';
import { PeriodFilter } from '@/lib/financeData';
import { pull, push, readCache, subscribe, writeCache } from '@/lib/syncStore';

const PAYOUTS_STORAGE_KEY = 'autoservis-payouts';

function isInPeriod(date: string, period: PeriodFilter) {
  if (!date) return false;
  if (period.mode === 'month') return date.slice(0, 7) === period.month;
  if (period.from && date < period.from) return false;
  if (period.to && date > period.to) return false;
  return true;
}

export default function FinancePayouts({ period }: { period: PeriodFilter }) {
  const { mechanics } = useMechanics();
  const names = activeMechanicNames(mechanics);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  useEffect(() => {
    const refresh = () => setPayouts(readCache<PayoutRecord[]>(PAYOUTS_STORAGE_KEY, []));
    refresh();
    void pull<PayoutRecord[]>(PAYOUTS_STORAGE_KEY).then(refresh);
    const unsubscribe = subscribe<PayoutRecord[]>(PAYOUTS_STORAGE_KEY, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!name && names.length) setName(names[0]);
  }, [names, name]);

  const visiblePayouts = useMemo(
    () => payouts.filter((payout) => isInPeriod(payout.date || '', period)),
    [payouts, period]
  );

  const save = (next: PayoutRecord[]) => {
    setPayouts(next);
    writeCache(PAYOUTS_STORAGE_KEY, next);
    void push(PAYOUTS_STORAGE_KEY, next);
  };

  const addPayout = (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!name || !date || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    save([
      { id: `payout-${Date.now()}`, name, amount: parsedAmount, date, note: note.trim(), paid: false },
      ...payouts,
    ]);
    setAmount('');
    setNote('');
  };

  return (
    <section id="isplate" className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Ručno evidentirane isplate majstorima</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Isplata se prikazuje samo kada je ovdje ručno unesete. Nema automatske plate ni bonusa.
        </p>
      </div>
      <form onSubmit={addPayout} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end border-b border-border">
        <label className="text-xs font-medium text-foreground">
          Majstor
          <input list="finance-mechanics-list" value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />
          <datalist id="finance-mechanics-list">
            {names.map((mechanic) => <option key={mechanic} value={mechanic} />)}
          </datalist>
        </label>
        <label className="text-xs font-medium text-foreground">
          Iznos (KM)
          <input type="number" min={0.01} step={0.01} value={amount} onChange={(event) => setAmount(event.target.value)} required className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />
        </label>
        <label className="text-xs font-medium text-foreground">
          Datum
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />
        </label>
        <label className="text-xs font-medium text-foreground">
          Napomena
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Npr. isplata za radove" className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" />
        </label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg">
          <Plus size={16} /> Dodaj isplatu
        </button>
      </form>
      <div className="divide-y divide-border">
        {visiblePayouts.map((payout) => (
          <div key={payout.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{payout.name}</p>
              <p className="text-xs text-muted-foreground">{payout.date || 'Datum nije evidentiran'}{payout.note ? ` · ${payout.note}` : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold tabular-nums ${payout.paid ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {Number(payout.amount || 0).toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM
              </span>
              <button type="button" onClick={() => save(payouts.map((item) => item.id === payout.id ? { ...item, paid: !item.paid } : item))} className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium ${payout.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Check size={14} /> {payout.paid ? 'Isplaćeno' : 'Označi isplaćeno'}
              </button>
              <button type="button" aria-label={`Obriši isplatu ${payout.name}`} onClick={() => save(payouts.filter((item) => item.id !== payout.id))} className="p-2 text-muted-foreground hover:text-red-600" title="Obriši isplatu">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {!visiblePayouts.length && <p className="px-5 py-6 text-center text-sm text-muted-foreground">Nema ručno evidentiranih isplata u odabranom periodu.</p>}
      </div>
    </section>
  );
}
