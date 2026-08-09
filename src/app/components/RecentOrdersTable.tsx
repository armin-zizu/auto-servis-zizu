'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { orderDate, useDashboardOrders } from '@/lib/useDashboardOrders';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('bs-BA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function RecentOrdersTable() {
  const orders = useDashboardOrders();
  const recentOrders = React.useMemo(
    () => [...orders].sort((a, b) => orderDate(b).getTime() - orderDate(a).getTime()).slice(0, 6),
    [orders]
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">Nedavni radni nalozi</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Posljednjih {recentOrders.length} naloga · svi majstori
          </p>
        </div>
        <Link href="/work-order-managment" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          Prikaži sve <ArrowRight size={14} />
        </Link>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nalog #</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Klijent / Vozilo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Majstor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ukupno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentOrders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/40 transition-colors duration-100 group">
                <td className="px-5 py-3.5"><span className="font-mono-data text-xs font-medium text-primary">{order.orderNum}</span></td>
                <td className="px-4 py-3.5">
                  <p className="font-medium text-foreground leading-tight">{order.clientName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.vehicle}</p>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell text-muted-foreground">{order.mechanic}</td>
                <td className="px-4 py-3.5"><StatusBadge status={order.status} size="sm" /></td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-semibold text-foreground tabular-nums">{Number(order.orderTotal || 0).toLocaleString()} KM</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(orderDate(order))}</p>
                </td>
              </tr>
            ))}
            {!recentOrders.length && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Nema sačuvanih radnih naloga.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
