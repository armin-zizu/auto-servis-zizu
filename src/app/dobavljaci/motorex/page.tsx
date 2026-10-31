'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, CalendarRange, ChevronRight, Plus, WalletCards } from 'lucide-react';
import { ORDERS_STORAGE_KEY, SUPPLIER_PAYMENTS_STORAGE_KEY, SupplierPaymentRecord, WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';
import { pull, readCache, subscribe } from '@/lib/syncStore';

const SUPPLIER = 'Motorex';
const money = (value: number) => `${value.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`;
const dateText = (value?: string) => value ? value.slice(0, 10).split('-').reverse().join('.') : '—';

export default function MotorexPage() {
  const [payments, setPayments] = useState<SupplierPaymentRecord[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setPayments(readCache<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY, []));
      setOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
    };
    refresh();
    void pull<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY).then(refresh);
    void pull<WorkOrder[]>(ORDERS_STORAGE_KEY).then(refresh);
    const unsubPayments = subscribe<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY, refresh);
    const unsubOrders = subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, refresh);
    return () => { unsubPayments(); unsubOrders(); };
  }, []);

  const list = useMemo(() => payments.filter((item) => item.supplier === SUPPLIER).sort((a, b) => b.paidAt.localeCompare(a.paidAt)), [payments]);
  const total = list.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><Link href="/dobavljaci" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ArrowLeft size={13} /> Dobavljači</Link><h1 className="mt-2 text-2xl font-semibold text-foreground">Motorex</h1><p className="mt-1 text-sm text-muted-foreground">Zbirni računi po datumskom periodu</p></div>
          <Link href="/dobavljaci/motorex/novo" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:w-auto"><Plus size={16} /> Novo plaćanje</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Ukupno plaćeno</p><p className="mt-1 text-lg font-bold tabular-nums">{money(total)}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Broj računa</p><p className="mt-1 text-lg font-bold">{list.length}</p></div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {list.length === 0 ? (
            <div className="px-4 py-14 text-center"><WalletCards size={28} className="mx-auto text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">Još nema plaćenih zbirnih računa</p></div>
          ) : <div className="divide-y divide-border">{list.map((payment) => {
            const open = expanded === payment.id;
            const included = orders.filter((order) => payment.orderIds.includes(order.id));
            return <div key={payment.id}><button type="button" onClick={() => setExpanded(open ? null : payment.id)} className="flex w-full min-w-0 items-center gap-2 px-3 py-4 text-left hover:bg-muted/30 sm:gap-3 sm:px-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarRange size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{dateText(payment.from)} — {dateText(payment.to)}</p><p className="mt-0.5 text-xs text-muted-foreground">{payment.orderIds.length} naloga · plaćeno {dateText(payment.paidAt)}</p></div><div className="shrink-0 text-right"><p className="text-sm font-bold tabular-nums">{money(payment.amount)}</p><p className="mt-1 text-xs text-emerald-600">Plaćeno</p></div><ChevronRight size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} /></button>{open && <div className="border-t border-border bg-muted/20 px-4 py-3"><p className="mb-2 text-xs font-medium text-muted-foreground">Obuhvaćeni nalozi</p>{included.map((order) => <Link key={order.id} href={`/work-order-managment?order=${order.id}`} className="mb-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-card px-2 py-2 text-sm sm:px-3"><span className="font-medium">{order.orderNum}</span><span className="truncate text-xs text-muted-foreground">{order.clientName}</span><span className="shrink-0 text-right text-xs font-semibold tabular-nums">{money(payment.orderAmounts?.[order.id] || 0)}</span></Link>)}</div>}</div>;
          })}</div>}
        </div>
      </div>
    </AppLayout>
  );
}
