import { WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';

export const WEEKLY_BONUSES_STORAGE_KEY = 'autoservis-weekly-bonuses';
export const WEEKLY_BONUS_RATE = 10;

export interface BonusPeriod {
  key: string;
  start: string;
  end: string;
}

export interface WeeklyBonus {
  id: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  mechanic: string;
  orders: number;
  laborRevenue: number;
  amount: number;
  paid: boolean;
  createdAt: string;
}

function toIsoDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** The latest Friday and the preceding Saturday–Friday bonus period. */
export function getWeeklyBonusPeriod(today = new Date()): BonusPeriod {
  const friday = new Date(today);
  friday.setHours(0, 0, 0, 0);
  friday.setDate(friday.getDate() - ((friday.getDay() - 5 + 7) % 7));
  const start = new Date(friday);
  start.setDate(friday.getDate() - 6);
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(friday);
  return { key: `${startIso}_${endIso}`, start: startIso, end: endIso };
}

export function calculateWeeklyBonuses(
  orders: WorkOrder[],
  mechanicNames: string[],
  period: BonusPeriod
): WeeklyBonus[] {
  const allowedMechanics = new Set(mechanicNames);
  const grouped = new Map<string, { orders: number; laborRevenue: number }>();

  orders.forEach((order) => {
    if (order.status !== 'Zatvoren' || !allowedMechanics.has(order.mechanic)) return;
    const completedOn = order.updatedAt;
    if (completedOn < period.start || completedOn > period.end) return;
    const current = grouped.get(order.mechanic) ?? { orders: 0, laborRevenue: 0 };
    current.orders += 1;
    current.laborRevenue += Number(order.laborTotal) || 0;
    grouped.set(order.mechanic, current);
  });

  return [...grouped.entries()].map(([mechanic, summary]) => ({
    id: `weekly-bonus-${period.key}-${mechanic}`,
    periodKey: period.key,
    periodStart: period.start,
    periodEnd: period.end,
    mechanic,
    orders: summary.orders,
    laborRevenue: summary.laborRevenue,
    amount: summary.laborRevenue * (WEEKLY_BONUS_RATE / 100),
    paid: false,
    createdAt: toIsoDate(new Date()),
  }));
}

export function formatBonusPeriod(period: Pick<BonusPeriod, 'start' | 'end'>): string {
  const format = (date: string) =>
    new Intl.DateTimeFormat('bs-BA', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${date}T00:00:00`)
    );
  return `${format(period.start)} – ${format(period.end)}`;
}
