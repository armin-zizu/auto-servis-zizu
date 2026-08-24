'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BellRing } from 'lucide-react';
import { activeMechanicNames, useMechanics } from '@/lib/mechanics';
import { pull, readCache, subscribe } from '@/lib/syncStore';
import { ORDERS_STORAGE_KEY, WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';
import {
  formatBonusPeriod,
  getPendingPayoutPeriod,
  isBonusPayoutDay,
  WEEKLY_BONUSES_STORAGE_KEY,
  WEEKLY_BONUS_RATE,
  WeeklyBonus,
} from '@/lib/weeklyBonuses';

/**
 * Friday reminder banner: shown only on Fridays when there are unpaid weekly
 * bonuses for the Saturday–Friday period that just closed.
 */
export default function BonusPayoutReminder() {
  const { mechanics } = useMechanics();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [bonuses, setBonuses] = useState<WeeklyBonus[]>([]);
  const [isFriday, setIsFriday] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const period = useMemo(() => getPendingPayoutPeriod(), []);

  useEffect(() => {
    setIsFriday(isBonusPayoutDay());
    try {
      setDismissed(window.localStorage.getItem(`bonus-reminder-dismissed-${period.key}`) === '1');
    } catch {
      /* ignore */
    }
    const refresh = () => {
      setOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
      setBonuses(readCache<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, []));
    };
    refresh();
    void Promise.all([
      pull<WorkOrder[]>(ORDERS_STORAGE_KEY),
      pull<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY),
    ]).then(refresh);
    const unsubOrders = subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, refresh);
    const unsubBonuses = subscribe<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, refresh);
    return () => {
      unsubOrders();
      unsubBonuses();
    };
  }, [period.key]);

  const unpaid = useMemo(() => {
    if (!isFriday) return [];
    const allowed = new Set(activeMechanicNames(mechanics));
    const calculated = new Set(
      bonuses.filter((b) => b.periodKey === period.key).map((b) => b.mechanic)
    );
    // Mechanics with closed orders in the period that have no bonus record yet
    // (or an unpaid one) still need a payout.
    const pending = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status !== 'Zatvoren' || !allowed.has(order.mechanic)) return;
      const day = order.workDate || order.updatedAt;
      if (day < period.start || day > period.end) return;
      pending.set(
        order.mechanic,
        (pending.get(order.mechanic) ?? 0) + (Number(order.laborTotal) || 0)
      );
    });
    return [...pending.entries()]
      .filter(([mechanic]) => {
        const bonus = bonuses.find((b) => b.periodKey === period.key && b.mechanic === mechanic);
        return !bonus || !bonus.paid;
      })
      .map(([mechanic, labor]) => ({ mechanic, labor, amount: labor * (WEEKLY_BONUS_RATE / 100) }));
  }, [isFriday, orders, bonuses, period, mechanics]);

  if (!isFriday || dismissed || unpaid.length === 0) return null;

  const total = unpaid.reduce((sum, item) => sum + item.amount, 0);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(`bonus-reminder-dismissed-${period.key}`, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <BellRing size={20} className="text-amber-600 shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">
          Danas je petak — vrijeme za isplatu sedmičnih bonusa!
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Period {formatBonusPeriod(period)}: {unpaid.length}{' '}
          {unpaid.length === 1 ? 'majstor čeka' : 'majstora čekaju'} isplatu od {WEEKLY_BONUS_RATE}%
          — ukupno <strong>{total.toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM</strong>{' '}
          ({unpaid.map((item) => `${item.mechanic}: ${item.amount.toLocaleString()} KM`).join(', ')}
          )
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/majstori/isplate"
          className="inline-flex items-center px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Otvori isplate
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
        >
          Zatvori
        </button>
      </div>
    </div>
  );
}
