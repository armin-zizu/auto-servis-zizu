'use client';

import { useEffect, useMemo, useState } from 'react';
import { WorkOrder, ORDERS_STORAGE_KEY } from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache, pull, subscribe, SYNC_EVENT } from './syncStore';
import { WEEKLY_BONUSES_STORAGE_KEY, WeeklyBonus } from './weeklyBonuses';

export interface PayoutRecord { id: string; name: string; orders: number; amount: number; paid: boolean }
export interface SalaryRecord { id: string; name: string; month: string; amount: number; paid: boolean }

export interface FinanceSummary {
  revenue: number;
  laborRevenue: number;
  partsRevenue: number;
  partsCost: number;
  payoutsTotal: number;
  unpaidPayouts: number;
  mechanicEarnings: number;
  operatingProfit: number;
  closedOrders: number;
}

const PAYOUTS_STORAGE_KEY = 'autoservis-payouts';
const SALARIES_STORAGE_KEY = 'autoservis-salaries';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function isInCurrentMonth(date: string | undefined): boolean {
  return Boolean(date && date.slice(0, 7) === currentMonth());
}

function sum(values: { amount: number }[]) {
  return values.reduce((total, value) => total + (Number(value.amount) || 0), 0);
}

export function useFinanceSummary(): FinanceSummary {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    const keys = [ORDERS_STORAGE_KEY, PAYOUTS_STORAGE_KEY, SALARIES_STORAGE_KEY, WEEKLY_BONUSES_STORAGE_KEY];
    const unsubscribers = keys.map((key) => subscribe(key, refresh));
    void Promise.all(keys.map((key) => pull(key))).then(refresh);
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return useMemo(() => {
    const orders = readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []);
    const payouts = readCache<PayoutRecord[]>(PAYOUTS_STORAGE_KEY, []);
    const salaries = readCache<SalaryRecord[]>(SALARIES_STORAGE_KEY, []);
    const bonuses = readCache<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, []);
    const closedOrders = orders.filter((order) => order.status === 'Zatvoren' && isInCurrentMonth(order.updatedAt));
    const relevantSalaries = salaries.filter((salary) => salary.month === currentMonth());
    const relevantBonuses = bonuses.filter((bonus) => isInCurrentMonth(bonus.createdAt));
    const paymentRecords = [...payouts, ...relevantSalaries, ...relevantBonuses];

    const mechanicEarnings = closedOrders.reduce(
      (total, order) => total + (Number(order.mechanicPayout) || Number(order.laborTotal) * 0.1 || 0),
      0
    );
    const revenue = closedOrders.reduce((total, order) => total + (Number(order.orderTotal) || 0), 0);
    const partsCost = closedOrders.reduce(
      (total, order) => total + (Number(order.partsPurchaseCost ?? order.partsTotal) || 0),
      0
    );

    return {
      revenue,
      laborRevenue: closedOrders.reduce((total, order) => total + (Number(order.laborTotal) || 0), 0),
      partsRevenue: closedOrders.reduce((total, order) => total + (Number(order.partsTotal) || 0), 0),
      partsCost,
      payoutsTotal: sum(paymentRecords),
      unpaidPayouts: sum(paymentRecords.filter((record) => !record.paid)),
      mechanicEarnings,
      // Net profit: the parts margin plus charged labor after the mechanic's
      // 10% share. Parts procurement stays separate from mechanic payouts.
      operatingProfit: revenue - partsCost - mechanicEarnings,
      closedOrders: closedOrders.length,
    };
  }, [version]);
}
