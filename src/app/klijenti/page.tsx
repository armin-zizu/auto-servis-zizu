 'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Phone, Search, UserRound } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/ui/Modal';
import { mockWorkOrders, WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache } from '@/lib/syncStore';

const clients = [
  { name: 'Rafael Dominguez', phone: '(512) 883-4201', vehicle: '2019 Toyota Camry', orders: 4 },
  { name: 'Priya Nair', phone: '(737) 412-9930', vehicle: '2021 Honda CR-V', orders: 2 },
  { name: 'Sandra Kowalski', phone: '(210) 554-7823', vehicle: '2017 Ford F-150', orders: 3 },
  { name: 'James Okonkwo', phone: '(469) 228-6140', vehicle: '2020 Chevrolet Silverado', orders: 1 },
  { name: 'Alicia Ferreira', phone: '(832) 774-3391', vehicle: '2022 BMW 330i', orders: 2 },
];

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<typeof clients[number] | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>(mockWorkOrders);

useEffect(() => {
    setOrders(readCache<WorkOrder[]>('autoservis-work-orders', mockWorkOrders));
  }, []);

  const filteredClients = useMemo(
    () => clients.filter((client) => client.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const clientOrders = selectedClient
    ? orders.filter((order) => order.clientName === selectedClient.name)
    : [];

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">Dashboard</Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Klijenti</h1>
          <p className="text-sm text-muted-foreground mt-1">Pregled klijenata i njihovih vozila</p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Search size={16} className="text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pretraži klijente..." className="flex-1 text-sm bg-transparent focus:outline-none" aria-label="Pretraži klijente" />
          </div>
          <div className="divide-y divide-border">
            {filteredClients.map((client) => (
              <button type="button" key={client.name} onClick={() => setSelectedClient(client)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 focus:outline-none focus:bg-muted/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><UserRound size={17} className="text-primary" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone size={12} /> {client.phone}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-foreground flex items-center gap-1 justify-end"><Car size={13} className="text-muted-foreground" /> {client.vehicle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{orders.filter((order) => order.clientName === client.name).length} radna naloga</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Modal
          open={selectedClient !== null}
          onClose={() => setSelectedClient(null)}
          title={selectedClient?.name || 'Klijent'}
          subtitle={selectedClient ? `${selectedClient.phone} · ${clientOrders.length} radnih naloga` : undefined}
          size="xl"
        >
          <div className="space-y-3">
            {clientOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Ovaj klijent još nema radnih naloga.</p>
            ) : clientOrders.map((order) => (
              <button type="button" key={order.id} onClick={() => router.push(`/work-order-managment?order=${encodeURIComponent(order.id)}`)} className="w-full text-left p-4 bg-muted/30 border border-border rounded-lg flex items-center justify-between gap-4 hover:bg-muted transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-primary">{order.orderNum}</p>
                  <p className="text-sm text-foreground mt-1">{order.vehicle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{order.createdAt} · {order.status}</p>
                </div>
                <p className="text-sm font-bold text-foreground tabular-nums">{order.orderTotal.toFixed(2)} KM</p>
              </button>
            ))}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
