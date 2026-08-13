'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { activeMechanicNames, useMechanics } from '@/lib/mechanics';
import { pull, readCache, subscribe, writeCache, push } from '@/lib/syncStore';
import { ORDERS_STORAGE_KEY, WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';
import { calculateWeeklyBonuses, formatBonusPeriod, getWeeklyBonusPeriod, WeeklyBonus, WEEKLY_BONUSES_STORAGE_KEY, WEEKLY_BONUS_RATE } from '@/lib/weeklyBonuses';

interface Salary { id: string; name: string; month: string; amount: number; paid: boolean }
const SALARIES_STORAGE_KEY = 'autoservis-salaries';

function readSession() {
  try { return JSON.parse(window.sessionStorage.getItem('autoservis-session') || window.localStorage.getItem('autoservis-session') || 'null') as { userRole?: string; userName?: string } | null; } catch { return null; }
}

export default function MechanicPayoutsPage() {
  const { mechanics } = useMechanics();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [bonuses, setBonuses] = useState<WeeklyBonus[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showOrders, setShowOrders] = useState(false);
  const [message, setMessage] = useState('');
  const [isMechanic, setIsMechanic] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [salaryName, setSalaryName] = useState('');
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryAmount, setSalaryAmount] = useState('');
  const period = useMemo(() => getWeeklyBonusPeriod(), []);

  useEffect(() => {
    let active = true;
    const session = readSession();
    setIsMechanic(session?.userRole === 'mechanic');
    setCurrentUserName(session?.userName || '');
    void Promise.all([pull<WorkOrder[]>(ORDERS_STORAGE_KEY), pull<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY), pull<Salary[]>(SALARIES_STORAGE_KEY)]).then(([remoteOrders, remoteBonuses, remoteSalaries]) => {
      if (!active) return;
      setOrders(remoteOrders ?? readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
      setBonuses(remoteBonuses ?? readCache<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, []));
      setSalaries(remoteSalaries ?? readCache<Salary[]>(SALARIES_STORAGE_KEY, []));
    });
    const unsubOrders = subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, () => setOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, [])));
    const unsubBonuses = subscribe<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, () => setBonuses(readCache<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, [])));
    const unsubSalaries = subscribe<Salary[]>(SALARIES_STORAGE_KEY, () => setSalaries(readCache<Salary[]>(SALARIES_STORAGE_KEY, [])));
    return () => { active = false; unsubOrders(); unsubBonuses(); unsubSalaries(); };
  }, []);

  const availableMechanics = useMemo(() => isMechanic && currentUserName ? [currentUserName] : activeMechanicNames(mechanics), [isMechanic, currentUserName, mechanics]);
  useEffect(() => { if (!availableMechanics.includes(salaryName)) setSalaryName(availableMechanics[0] ?? ''); }, [availableMechanics, salaryName]);

  const periodBonuses = bonuses.filter((bonus) => bonus.periodKey === period.key);
  const calculatedNames = new Set(periodBonuses.map((bonus) => bonus.mechanic));
  const eligibleOrders = useMemo(() => orders.filter((order) => order.status === 'Zatvoren' && order.updatedAt >= period.start && order.updatedAt <= period.end && availableMechanics.includes(order.mechanic) && !calculatedNames.has(order.mechanic)), [orders, period, availableMechanics, periodBonuses]);
  const selectableNames = [...new Set(eligibleOrders.map((order) => order.mechanic))];
  const selectedOrders = eligibleOrders.filter((order) => selected.has(order.mechanic));
  const visibleBonuses = isMechanic ? bonuses.filter((bonus) => bonus.mechanic === currentUserName) : bonuses;
  const visibleSalaries = isMechanic ? salaries.filter((salary) => salary.name === currentUserName) : salaries;
  const unpaidTotal = [...visibleBonuses, ...visibleSalaries].filter((item) => !item.paid).reduce((sum, item) => sum + item.amount, 0);

  const saveBonuses = (next: WeeklyBonus[]) => { setBonuses(next); writeCache(WEEKLY_BONUSES_STORAGE_KEY, next); void push(WEEKLY_BONUSES_STORAGE_KEY, next); };
  const saveSalaries = (next: Salary[]) => { setSalaries(next); writeCache(SALARIES_STORAGE_KEY, next); void push(SALARIES_STORAGE_KEY, next); };
  const createBonus = () => {
    if (!selected.size) { setMessage('Odaberite barem jednog majstora za obračun.'); return; }
    const next = calculateWeeklyBonuses(orders, [...selected], period);
    if (!next.length) { setMessage('Odabrani majstori nemaju zatvorene naloge u ovom periodu.'); return; }
    saveBonuses([...bonuses, ...next]); setSelected(new Set()); setShowOrders(false); setMessage(`Obračun je kreiran za ${next.length} majstora.`);
  };
  const addSalary = (event: React.FormEvent) => { event.preventDefault(); const amount = Number(salaryAmount); if (!salaryName || !salaryMonth || !Number.isFinite(amount) || amount <= 0) return; saveSalaries([...salaries, { id: `salary-${Date.now()}`, name: salaryName, month: salaryMonth, amount, paid: false }]); setSalaryAmount(''); };

  return <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com"><div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
    <div><Link href="/" className="text-xs text-primary hover:underline">Dashboard</Link><h1 className="text-2xl font-semibold text-foreground mt-2">Isplate majstorima</h1><p className="text-sm text-muted-foreground mt-1">Odaberite majstore, provjerite naloge i obračunajte 10% od rada.</p></div>
    <section className="bg-card border border-border rounded-xl shadow-card overflow-hidden"><div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="font-semibold text-foreground">Sedmični obračun bonusa</h2><p className="text-xs text-muted-foreground mt-1">Period: {formatBonusPeriod(period)} · {WEEKLY_BONUS_RATE}% od rada na zatvorenim nalozima</p></div>{!isMechanic && <button type="button" onClick={createBonus} disabled={!selected.size} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"><Plus size={16} /> Obračunaj odabrane</button>}</div>
      {!isMechanic && <div className="px-5 py-4 border-b border-border bg-muted/20"><p className="text-xs font-semibold text-foreground mb-3">Odaberite majstore za obračun</p>{selectableNames.length ? <div className="flex flex-wrap gap-2">{selectableNames.map((name) => { const mechanicOrders = eligibleOrders.filter((order) => order.mechanic === name); const labor = mechanicOrders.reduce((sum, order) => sum + order.laborTotal, 0); const checked = selected.has(name); return <button key={name} type="button" onClick={() => setSelected((current) => { const next = new Set(current); checked ? next.delete(name) : next.add(name); return next; })} className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${checked ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-muted'}`}><span className="block font-semibold">{name}</span><span className="block mt-0.5 opacity-80">{mechanicOrders.length} naloga · 10% = {(labor * .1).toLocaleString()} KM</span></button>; })}</div> : <p className="text-xs text-muted-foreground">Nema novih zatvorenih naloga za obračun u ovom periodu.</p>}{selectedOrders.length > 0 && <div className="mt-4"><button type="button" onClick={() => setShowOrders((value) => !value)} className="inline-flex items-center gap-1 text-xs font-medium text-primary">{showOrders ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Nalozi uključeni u obračun ({selectedOrders.length})</button>{showOrders && <div className="mt-2 divide-y rounded-lg border border-border bg-card">{selectedOrders.map((order) => <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2 text-xs"><span><strong>{order.orderNum}</strong> · {order.clientName} · {order.mechanic}</span><span className="font-medium">Rad {order.laborTotal.toLocaleString()} KM · bonus {(order.laborTotal * .1).toLocaleString()} KM</span></div>)}</div>}</div>}</div>}
      {message && <p className="px-5 pt-3 text-xs text-primary">{message}</p>}
      <div className="divide-y divide-border">{periodBonuses.filter((bonus) => !isMechanic || bonus.mechanic === currentUserName).map((bonus) => <div key={bonus.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"><div><p className="text-sm font-medium text-foreground">{bonus.mechanic}</p><p className="text-xs text-muted-foreground mt-0.5">{bonus.orders} zatvorenih naloga · rad {bonus.laborRevenue.toLocaleString()} KM · {WEEKLY_BONUS_RATE}% bonus</p></div><div className="flex items-center gap-3"><span className={`font-bold tabular-nums ${bonus.paid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{bonus.amount.toLocaleString()} KM</span>{!isMechanic && <button type="button" onClick={() => saveBonuses(bonuses.map((item) => item.id === bonus.id ? { ...item, paid: !item.paid } : item))} className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium ${bonus.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{bonus.paid ? <Check size={14} /> : <Save size={14} />}{bonus.paid ? 'Isplaćeno' : 'Označi isplaćeno'}</button>}</div></div>)}{!periodBonuses.length && <p className="px-5 py-5 text-sm text-muted-foreground">Još nema kreiranog obračuna za ovaj period.</p>}</div>
    </section>
    <section className="bg-card border border-border rounded-xl shadow-card overflow-hidden"><div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-foreground">Obaveze za isplatu</h2><p className="text-xs text-muted-foreground mt-1">Neisplaćeno ukupno: {unpaidTotal.toLocaleString()} KM</p></div><div className="divide-y divide-border">{[...visibleBonuses, ...visibleSalaries].map((item) => <div key={item.id} className="px-5 py-3 flex items-center justify-between"><div><p className="text-sm font-medium">{'mechanic' in item ? item.mechanic : item.name}</p><p className="text-xs text-muted-foreground">{'periodKey' in item ? 'Sedmični bonus 10%' : `Mjesečna plata · ${item.month}`}</p></div><span className={`font-semibold tabular-nums ${item.paid ? 'line-through text-muted-foreground' : ''}`}>{item.amount.toLocaleString()} KM</span></div>)}{!visibleBonuses.length && !visibleSalaries.length && <p className="px-5 py-5 text-sm text-muted-foreground">Nema evidentiranih obaveza.</p>}</div></section>
    {!isMechanic && <section className="bg-card border border-border rounded-xl shadow-card overflow-hidden"><div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-foreground">Nova mjesečna plata</h2><p className="text-xs text-muted-foreground mt-1">Fiksnu platu evidentirajte odvojeno od sedmičnog bonusa.</p></div><form onSubmit={addSalary} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"><label className="text-xs font-medium">Majstor<select value={salaryName} onChange={(event) => setSalaryName(event.target.value)} className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg">{availableMechanics.map((name) => <option key={name}>{name}</option>)}</select></label><label className="text-xs font-medium">Mjesec<input type="month" value={salaryMonth} onChange={(event) => setSalaryMonth(event.target.value)} className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" /></label><label className="text-xs font-medium">Iznos plate<input type="number" min={0} step={0.01} value={salaryAmount} onChange={(event) => setSalaryAmount(event.target.value)} className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg" /></label><button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg"><Plus size={16} /> Dodaj platu</button></form></section>}
  </div></AppLayout>;
}
