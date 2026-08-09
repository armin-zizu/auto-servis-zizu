'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { activeMechanicNames, useMechanics } from '@/lib/mechanics';
import { readCache, writeCache, subscribe, push } from '@/lib/syncStore';
import { ORDERS_STORAGE_KEY, WorkOrder, mockWorkOrders } from '@/app/work-order-managment/data/mockWorkOrders';
import {
  calculateWeeklyBonuses,
  formatBonusPeriod,
  getWeeklyBonusPeriod,
  WeeklyBonus,
  WEEKLY_BONUSES_STORAGE_KEY,
  WEEKLY_BONUS_RATE,
} from '@/lib/weeklyBonuses';

interface Payout {
  id: string;
  name: string;
  orders: number;
  amount: number;
  paid: boolean;
}
interface Salary {
  id: string;
  name: string;
  month: string;
  amount: number;
  paid: boolean;
}

const initialPayouts: Payout[] = [];
const demoPayoutIds = new Set(['mech-001', 'mech-002', 'mech-003', 'mech-004']);
const PAYOUTS_STORAGE_KEY = 'autoservis-payouts';
const SALARIES_STORAGE_KEY = 'autoservis-salaries';

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return readCache<T>(key, fallback);
}

function withoutDemoPayouts(payouts: Payout[]): Payout[] {
  return payouts.filter((payout) => !demoPayoutIds.has(payout.id));
}

function readSession() {
  try {
    return JSON.parse(
      window.sessionStorage.getItem('autoservis-session') ||
        window.localStorage.getItem('autoservis-session') ||
        'null'
    ) as { userRole?: string; userName?: string } | null;
  } catch {
    return null;
  }
}

export default function MechanicPayoutsPage() {
  const { mechanics } = useMechanics();

  const [payouts, setPayouts] = useState(initialPayouts);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [weeklyBonuses, setWeeklyBonuses] = useState<WeeklyBonus[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [salaryName, setSalaryName] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('2026-08');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [payoutName, setPayoutName] = useState('');
  const [payoutOrders, setPayoutOrders] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [isMechanic, setIsMechanic] = useState(false);
  const [bonusMessage, setBonusMessage] = useState('');
  const bonusPeriod = useMemo(() => getWeeklyBonusPeriod(), []);

useEffect(() => {
    const session = readSession();
    const mechanicSession = session?.userRole === 'mechanic';
    setIsMechanic(mechanicSession);
    setCurrentUserName(session?.userName || '');
    if (mechanicSession && session?.userName) setSalaryName(session.userName);
    setPayouts(withoutDemoPayouts(readStored(PAYOUTS_STORAGE_KEY, initialPayouts)));
    setSalaries(readStored(SALARIES_STORAGE_KEY, []));
    setWeeklyBonuses(readStored(WEEKLY_BONUSES_STORAGE_KEY, []));
    setStorageLoaded(true);
    // Pull latest from shared storage on mount.
    void import('@/lib/syncStore').then(({ pull }) => {
      void pull<Payout[]>(PAYOUTS_STORAGE_KEY).then((remote) => {
        if (remote) setPayouts(withoutDemoPayouts(remote));
      });
      void pull<Salary[]>(SALARIES_STORAGE_KEY).then((remote) => {
        if (remote) setSalaries(remote);
      });
      void pull<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY).then((remote) => {
        if (remote) setWeeklyBonuses(remote);
      });
    });
    // Subscribe to realtime changes from other devices.
    const unsubPayouts = subscribe<Payout[]>(PAYOUTS_STORAGE_KEY, () => {
      setPayouts(withoutDemoPayouts(readStored(PAYOUTS_STORAGE_KEY, initialPayouts)));
    });
    const unsubSalaries = subscribe<Salary[]>(SALARIES_STORAGE_KEY, () => {
      setSalaries(readStored(SALARIES_STORAGE_KEY, []));
    });
    const unsubBonuses = subscribe<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, () => {
      setWeeklyBonuses(readStored(WEEKLY_BONUSES_STORAGE_KEY, []));
    });
    return () => {
      unsubPayouts();
      unsubSalaries();
      unsubBonuses();
    };
  }, []);

  useEffect(() => {
    if (storageLoaded) {
      writeCache(PAYOUTS_STORAGE_KEY, payouts);
      void push(PAYOUTS_STORAGE_KEY, payouts);
    }
  }, [payouts, storageLoaded]);
  useEffect(() => {
    if (storageLoaded) {
      writeCache(SALARIES_STORAGE_KEY, salaries);
      void push(SALARIES_STORAGE_KEY, salaries);
    }
  }, [salaries, storageLoaded]);
  useEffect(() => {
    if (storageLoaded) {
      writeCache(WEEKLY_BONUSES_STORAGE_KEY, weeklyBonuses);
      void push(WEEKLY_BONUSES_STORAGE_KEY, weeklyBonuses);
    }
  }, [weeklyBonuses, storageLoaded]);

  const visiblePayouts = isMechanic
    ? payouts.filter((payout) => payout.name === currentUserName)
    : payouts;
  const visibleSalaries = isMechanic
    ? salaries.filter((salary) => salary.name === currentUserName)
    : salaries;
  const visibleBonuses = isMechanic
    ? weeklyBonuses.filter((bonus) => bonus.mechanic === currentUserName)
    : weeklyBonuses;
  const availableMechanics = useMemo(
    () => (isMechanic && currentUserName ? [currentUserName] : activeMechanicNames(mechanics)),
    [isMechanic, currentUserName, mechanics]
  );

  useEffect(() => {
    if (!availableMechanics.includes(salaryName)) setSalaryName(availableMechanics[0] ?? '');
    if (!availableMechanics.includes(payoutName)) setPayoutName(availableMechanics[0] ?? '');
  }, [availableMechanics, salaryName, payoutName]);
  const unpaidTotal =
    visiblePayouts
      .filter((payout) => !payout.paid)
      .reduce((total, payout) => total + payout.amount, 0) +
    visibleSalaries
      .filter((salary) => !salary.paid)
      .reduce((total, salary) => total + salary.amount, 0) +
    visibleBonuses
      .filter((bonus) => !bonus.paid)
      .reduce((total, bonus) => total + bonus.amount, 0);

  const currentPeriodBonuses = weeklyBonuses.filter((bonus) => bonus.periodKey === bonusPeriod.key);

  const updatePayout = (id: string, changes: Partial<Payout>) =>
    setPayouts((current) =>
      current.map((payout) => (payout.id === id ? { ...payout, ...changes } : payout))
    );
  const addPayout = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(payoutAmount);
    const orders = Number(payoutOrders);
    if (!payoutName || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(orders) || orders < 0) return;
    setPayouts((current) => [
      ...current,
      { id: `payout-${Date.now()}`, name: payoutName, orders, amount, paid: false },
    ]);
    setPayoutOrders('');
    setPayoutAmount('');
  };
  const addSalary = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(salaryAmount);
    if (!amount || amount < 0 || !salaryMonth) return;
    setSalaries((current) => [
      ...current,
      { id: `salary-${Date.now()}`, name: salaryName, month: salaryMonth, amount, paid: false },
    ]);
    setSalaryAmount('');
  };
  const createWeeklyBonus = () => {
    if (currentPeriodBonuses.length > 0) {
      setBonusMessage('Obračun za ovaj period je već kreiran.');
      return;
    }
    const orders = readStored<WorkOrder[]>(ORDERS_STORAGE_KEY, mockWorkOrders);
    const bonuses = calculateWeeklyBonuses(orders, activeMechanicNames(mechanics), bonusPeriod);
    if (!bonuses.length) {
      setBonusMessage('Nema zatvorenih naloga za aktivne majstore u ovom periodu.');
      return;
    }
    setWeeklyBonuses((current) => [...current, ...bonuses]);
    setBonusMessage(`Obračun je kreiran za ${bonuses.length} majstora.`);
  };

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Isplate majstorima</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unesite iznos i označite kada je isplata izvršena
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Sedmični bonus od rada</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Period: {formatBonusPeriod(bonusPeriod)} · {WEEKLY_BONUS_RATE}% od rada na zatvorenim nalozima
              </p>
            </div>
            {!isMechanic && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createWeeklyBonus}
                  disabled={currentPeriodBonuses.length > 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus size={16} /> {currentPeriodBonuses.length > 0 ? 'Obračun je kreiran' : 'Obračunaj bonus'}
                </button>
                {currentPeriodBonuses.some((bonus) => !bonus.paid) && (
                  <button
                    type="button"
                    onClick={() => setWeeklyBonuses((current) => current.map((bonus) => bonus.periodKey === bonusPeriod.key ? { ...bonus, paid: true } : bonus))}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                  >
                    <Check size={16} /> Označi sve isplaćeno
                  </button>
                )}
              </div>
            )}
          </div>
          {bonusMessage && <p className="px-5 pt-3 text-xs text-primary">{bonusMessage}</p>}
          {currentPeriodBonuses.length > 0 ? (
            <div className="divide-y divide-border">
              {currentPeriodBonuses
                .filter((bonus) => !isMechanic || bonus.mechanic === currentUserName)
                .map((bonus) => (
                  <div key={bonus.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bonus.mechanic}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bonus.orders} zatvorenih naloga · rad {bonus.laborRevenue.toLocaleString()} KM · {WEEKLY_BONUS_RATE}% bonus
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-base font-bold tabular-nums ${bonus.paid ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {bonus.amount.toLocaleString()} KM
                      </span>
                      {!isMechanic && (
                        <button
                          type="button"
                          onClick={() => setWeeklyBonuses((current) => current.map((item) => item.id === bonus.id ? { ...item, paid: !item.paid } : item))}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${bonus.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {bonus.paid ? <Check size={14} /> : <Save size={14} />}
                          {bonus.paid ? 'Isplaćeno' : 'Označi isplaćeno'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="px-5 py-5 text-sm text-muted-foreground">Još nema obračuna bonusa za ovaj petak.</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Isplate MTD</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Neisplaćeno ukupno: {unpaidTotal.toLocaleString()} KM
              </p>
            </div>
            <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1">
              Fiksna stopa 10%
            </span>
          </div>
          <div className="divide-y divide-border">
            {visiblePayouts.map((payout) => (
              <div
                key={payout.id}
                className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between"
              >
                <div className="min-w-48">
                  <p className="text-sm font-medium text-foreground">{payout.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {payout.orders} završenih naloga · stopa 10%
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs text-muted-foreground">
                    Iznos za isplatu
                    <div className="relative mt-1">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        KM
                      </span>
                      <input
                        disabled={isMechanic}
                        type="number"
                        min={0}
                        step={0.01}
                        value={payout.amount}
                        onChange={(event) =>
                          updatePayout(payout.id, { amount: Number(event.target.value) || 0 })
                        }
                        className="w-36 pl-3 pr-10 py-2 text-sm bg-background border border-input rounded-lg text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                        aria-label={`Iznos za isplatu ${payout.name}`}
                      />
                    </div>
                  </label>
                  <button
                    disabled={isMechanic}
                    type="button"
                    onClick={() => updatePayout(payout.id, { paid: !payout.paid })}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors mt-5 disabled:opacity-60 ${payout.paid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                  >
                    {payout.paid ? <Check size={14} /> : <Save size={14} />}
                    {payout.paid ? 'Isplaćeno' : 'Označi isplaćeno'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {visibleSalaries.length > 0 && (
            <div className="border-t-2 border-border">
              <div className="px-5 py-3 bg-muted/30">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Mjesečne plate
                </h3>
              </div>
              <div className="divide-y divide-border">
                {visibleSalaries.map((salary) => (
                  <div
                    key={salary.id}
                    className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{salary.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mjesečna plata · {salary.month}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-foreground tabular-nums">
                        {salary.amount.toLocaleString()} KM
                      </span>
                      <button
                        disabled={isMechanic}
                        type="button"
                        onClick={() =>
                          setSalaries((current) =>
                            current.map((item) =>
                              item.id === salary.id ? { ...item, paid: !item.paid } : item
                            )
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60 ${salary.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        {salary.paid ? <Check size={14} /> : <Save size={14} />}
                        {salary.paid ? 'Isplaćeno' : 'Označi isplaćeno'}
                      </button>
                      <button
                        disabled={isMechanic}
                        type="button"
                        onClick={() =>
                          setSalaries((current) => current.filter((item) => item.id !== salary.id))
                        }
                        className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                        aria-label={`Obriši platu ${salary.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {!isMechanic && (
          <>
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Nova isplata majstoru</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Dodajte samo isplate koje želite evidentirati.
              </p>
            </div>
            <form onSubmit={addPayout} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
              <label className="text-xs font-medium text-foreground">
                Majstor
                <select value={payoutName} onChange={(event) => setPayoutName(event.target.value)} required className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
                  {availableMechanics.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-foreground">
                Broj naloga
                <input type="number" min={0} step={1} value={payoutOrders} onChange={(event) => setPayoutOrders(event.target.value)} required placeholder="npr. 4" className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="text-xs font-medium text-foreground">
                Iznos isplate
                <div className="relative mt-1">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KM</span>
                  <input type="number" min={0} step={0.01} value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} required placeholder="npr. 450" className="w-full pl-3 pr-10 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </label>
              <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                <Plus size={16} /> Dodaj isplatu
              </button>
            </form>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Nova mjesečna plata</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Dodajte fiksnu mjesečnu platu majstora kao novu obavezu za isplatu.
              </p>
            </div>
            <form
              onSubmit={addSalary}
              className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
            >
              <label className="text-xs font-medium text-foreground">
                Majstor
                <select
                  value={salaryName}
                  onChange={(event) => setSalaryName(event.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {availableMechanics.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-foreground">
                Mjesec
                <input
                  type="month"
                  value={salaryMonth}
                  onChange={(event) => setSalaryMonth(event.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Iznos plate
                <div className="relative mt-1">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    KM
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={salaryAmount}
                    onChange={(event) => setSalaryAmount(event.target.value)}
                    required
                    placeholder="npr. 1800"
                    className="w-full pl-3 pr-10 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} /> Dodaj platu
              </button>
            </form>
          </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
