'use client';

import React from 'react';
import Link from 'next/link';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import { ArrowRight } from 'lucide-react';

interface RecentOrder {
  id: string;
  orderNum: string;
  client: string;
  vehicle: string;
  mechanic: string;
  status: OrderStatus;
  total: number;
  updatedAt: string;
}

const recentOrders: RecentOrder[] = [
  {
    id: 'order-001',
    orderNum: 'WO-2026-0089',
    client: 'Rafael Dominguez',
    vehicle: '2019 Toyota Camry',
    mechanic: 'Derek Hollis',
    status: 'U toku',
    total: 624,
    updatedAt: 'Prije 2h',
  },
  {
    id: 'order-002',
    orderNum: 'WO-2026-0088',
    client: 'Priya Nair',
    vehicle: '2021 Honda CR-V',
    mechanic: 'Tomas Reyes',
    status: 'Čeka dijelove',
    total: 1180,
    updatedAt: 'Prije 3h',
  },
  {
    id: 'order-003',
    orderNum: 'WO-2026-0087',
    client: 'Sandra Kowalski',
    vehicle: '2017 Ford F-150',
    mechanic: 'Derek Hollis',
    status: 'Spreman za preuzimanje',
    total: 895,
    updatedAt: 'Prije 4h',
  },
  {
    id: 'order-004',
    orderNum: 'WO-2026-0086',
    client: 'James Okonkwo',
    vehicle: '2020 Chevy Silverado',
    mechanic: 'Mei-Ling Park',
    status: 'Otvoren',
    total: 340,
    updatedAt: 'Prije 5h',
  },
  {
    id: 'order-005',
    orderNum: 'WO-2026-0085',
    client: 'Alicia Ferreira',
    vehicle: '2022 BMW 3 Series',
    mechanic: 'Tomas Reyes',
    status: 'Zatvoren',
    total: 2140,
    updatedAt: 'Danas',
  },
  {
    id: 'order-006',
    orderNum: 'WO-2026-0084',
    client: 'Kevin Strauss',
    vehicle: '2018 Nissan Altima',
    mechanic: 'Mei-Ling Park',
    status: 'Zatvoren',
    total: 480,
    updatedAt: 'Danas',
  },
];

export default function RecentOrdersTable() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Nedavni radni nalozi
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Posljednjih 6 naloga · svi majstori
          </p>
        </div>
        <Link
                    href="/work-order-managment"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Prikaži sve
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nalog #
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Klijent / Vozilo
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                Majstor
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ukupno
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-muted/40 transition-colors duration-100 group"
              >
                <td className="px-5 py-3.5">
                  <span className="font-mono-data text-xs font-medium text-primary">
                    {order.orderNum}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-medium text-foreground leading-tight">
                    {order.client}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.vehicle}
                  </p>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell text-muted-foreground">
                  {order.mechanic}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={order.status} size="sm" />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-semibold text-foreground tabular-nums">
                    {order.total.toLocaleString()} KM
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.updatedAt}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}