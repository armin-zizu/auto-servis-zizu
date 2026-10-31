'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import {
  DEFAULT_SUPPLIERS,
  ORDERS_STORAGE_KEY,
  SUPPLIERS_STORAGE_KEY,
  SUPPLIER_PAYMENTS_STORAGE_KEY,
  SupplierPaymentRecord,
  WorkOrder,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { pull, push, readCache, subscribe, writeCache } from '@/lib/syncStore';
import { orderFinanceDate } from '@/lib/financeData';
import { supplierRemainingAmount } from '@/lib/supplierPayments';
import { supplierNameFromSlug, supplierSlug } from '@/lib/supplierRoutes';
import { toast } from 'sonner';

const money = (value: number) => `${value.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`;

export default function SupplierPaymentPage({ supplierSlugValue }: { supplierSlugValue: string }) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [payments, setPayments] = useState<SupplierPaymentRecord[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>(DEFAULT_SUPPLIERS);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = () => {
      setOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
      setPayments(readCache<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY, []));
      setSuppliers(readCache<string[]>(SUPPLIERS_STORAGE_KEY, DEFAULT_SUPPLIERS));
    };
    refresh();
    void pull<WorkOrder[]>(ORDERS_STORAGE_KEY).then(refresh);
    void pull<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY).then(refresh);
    void pull<string[]>(SUPPLIERS_STORAGE_KEY).then(refresh);
    const unsubOrders = subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, refresh);
    const unsubPayments = subscribe<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY, refresh);
    const unsubSuppliers = subscribe<string[]>(SUPPLIERS_STORAGE_KEY, refresh);
    return () => { unsubOrders(); unsubPayments(); unsubSuppliers(); };
  }, []);

  const supplier = useMemo(
    () => supplierNameFromSlug(supplierSlugValue, suppliers),
    [supplierSlugValue, suppliers]
  );
  const encodedSupplierSlug = encodeURIComponent(supplierSlug(supplier));
  const candidates = useMemo(() => orders
    .filter((order) => order.status === 'Zatvoren' && supplierRemainingAmount(order, supplier) > 0)
    .filter((order) => {
      const date = orderFinanceDate(order);
      return (!from || date >= from) && (!to || date <= to);
    })
    .sort((a, b) => orderFinanceDate(a).localeCompare(orderFinanceDate(b))), [orders, from, to, supplier]);

  useEffect(() => setSelected(new Set(candidates.map((order) => order.id))), [candidates]);
  const selectedOrders = candidates.filter((order) => selected.has(order.id));
  const total = selectedOrders.reduce((sum, order) => sum + supplierRemainingAmount(order, supplier), 0);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const confirmPayment = () => {
    if (!selectedOrders.length) return;
    const paymentId = `supplier-payment-${Date.now()}`;
    const paidAt = `${to || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
    const allocationAmounts: Record<string, number> = {};
    const nextOrders = orders.map((order) => {
      if (!selected.has(order.id)) return order;
      const amount = supplierRemainingAmount(order, supplier);
      allocationAmounts[order.id] = amount;
      return {
        ...order,
        supplierPaymentAllocations: [
          ...(order.supplierPaymentAllocations ?? []),
          { paymentId, supplier, amount, paidAt },
        ],
      };
    });
    const record: SupplierPaymentRecord = {
      id: paymentId,
      supplier,
      paidAt,
      from: from || orderFinanceDate(selectedOrders[0]),
      to,
      amount: total,
      orderIds: selectedOrders.map((order) => order.id),
      orderAmounts: allocationAmounts,
    };
    const nextPayments = [record, ...payments];
    writeCache(ORDERS_STORAGE_KEY, nextOrders);
    writeCache(SUPPLIER_PAYMENTS_STORAGE_KEY, nextPayments);
    void push(ORDERS_STORAGE_KEY, nextOrders);
    void push(SUPPLIER_PAYMENTS_STORAGE_KEY, nextPayments);
    setOrders(nextOrders);
    setPayments(nextPayments);
    setSelected(new Set());
    toast.success(`Plaćeno ${money(total)} dobavljaču ${supplier}`);
  };

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link href={`/dobavljaci/${encodedSupplierSlug}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ArrowLeft size={13} /> {supplier}</Link>
        <div><h1 className="text-2xl font-semibold text-foreground">Novo plaćanje</h1><p className="mt-1 text-sm text-muted-foreground">{supplier} · zatvoreni neplaćeni nalozi</p></div>
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-muted-foreground">Od datuma<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></label>
          <label className="text-xs font-medium text-muted-foreground">Do datuma<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></label>
          <button type="button" onClick={() => setSelected(new Set(candidates.map((order) => order.id)))} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><RotateCcw size={14} /> Označi sve</button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"><p className="text-sm font-semibold">Neplaćeni nalozi · {selectedOrders.length}</p><p className="text-lg font-bold text-primary tabular-nums">{money(total)}</p></div>
          {candidates.length === 0 ? <div className="px-4 py-12 text-center text-sm text-muted-foreground">Nema neplaćenih zatvorenih naloga za odabrani period.</div> : <div className="divide-y divide-border">{candidates.map((order) => <label key={order.id} className="flex min-w-0 cursor-pointer items-center gap-2 px-3 py-3 hover:bg-muted/30 sm:gap-3 sm:px-4"><input type="checkbox" checked={selected.has(order.id)} onChange={() => toggle(order.id)} className="shrink-0 rounded accent-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{order.orderNum}</p><p className="truncate text-xs text-muted-foreground">{order.clientName} · {orderFinanceDate(order)}</p></div><p className="shrink-0 text-sm font-bold tabular-nums">{money(supplierRemainingAmount(order, supplier))}</p></label>)}</div>}
          <div className="border-t border-border bg-muted/20 p-4"><button type="button" disabled={!selectedOrders.length} onClick={confirmPayment} className="ml-auto flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"><Check size={16} /> Potvrdi plaćanje · {money(total)}</button></div>
        </div>
      </div>
    </AppLayout>
  );
}
