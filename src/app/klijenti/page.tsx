'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Phone, Search, UserRound } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/ui/Modal';
import { WorkOrder, ORDERS_STORAGE_KEY } from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache, pull, subscribe } from '@/lib/syncStore';

interface ClientRecord {
  name: string;
  phone: string;
  vehicle: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    const refresh = () => setOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
    refresh();
    void pull<WorkOrder[]>(ORDERS_STORAGE_KEY).then((remote) => {
      if (remote) setOrders(remote);
    });
    return subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, () =>
      setOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []))
    );
  }, []);

  // Build the client list from actual work orders: one entry per client name,
  // keeping the most recent phone/vehicle seen for that client.
  const clients = useMemo<ClientRecord[]>(() => {
    const map = new Map<string, ClientRecord>();
    for (const order of orders) {
      const name = (order.clientName || '').trim();
      if (!name) continue;
      const existing = map.get(name.toLowerCase());
      if (existing) {
        if (order.clientPhone) existing.phone = order.clientPhone;
        if (order.vehicle) existing.vehicle = order.vehicle;
      } else {
        map.set(name.toLowerCase(), {
          name,
          phone: order.clientPhone || '',
          vehicle: order.vehicle || '',
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.vehicle.toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );
  const clientOrders = selectedClient
    ? orders.filter(
        (order) =>
          (order.clientName || '').trim().toLowerCase() === selectedClient.name.toLowerCase()
      )
    : [];

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Klijenti</h1>
          <p className="text-sm text-muted-foreground mt-1">Pregled klijenata i njihovih vozila</p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pretraži klijente..."
              className="flex-1 text-sm bg-transparent focus:outline-none"
              aria-label="Pretraži klijente"
            />
          </div>
          <div className="divide-y divide-border">
            {filteredClients.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Nema klijenata. Klijenti se automatski dodaju iz kreiranih radnih naloga.
              </p>
            ) : (
              filteredClients.map((client) => (
                <button
                  type="button"
                  key={client.name}
                  onClick={() => setSelectedClient(client)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 focus:outline-none focus:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserRound size={17} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                      {client.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone size={12} /> {client.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {client.vehicle && (
                      <p className="text-sm text-foreground flex items-center gap-1 justify-end">
                        <Car size={13} className="text-muted-foreground" /> {client.vehicle}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {
                        orders.filter(
                          (order) =>
                            (order.clientName || '').trim().toLowerCase() ===
                            client.name.toLowerCase()
                        ).length
                      }{' '}
                      radnih naloga
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <Modal
          open={selectedClient !== null}
          onClose={() => setSelectedClient(null)}
          title={selectedClient?.name || 'Klijent'}
          subtitle={
            selectedClient
              ? `${selectedClient.phone ? selectedClient.phone + ' · ' : ''}${clientOrders.length} radnih naloga`
              : undefined
          }
          size="xl"
        >
          <div className="space-y-3">
            {clientOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ovaj klijent još nema radnih naloga.
              </p>
            ) : (
              clientOrders.map((order) => (
                <button
                  type="button"
                  key={order.id}
                  onClick={() =>
                    router.push(`/work-order-managment?order=${encodeURIComponent(order.id)}`)
                  }
                  className="w-full text-left p-4 bg-muted/30 border border-border rounded-lg flex items-center justify-between gap-4 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-semibold text-primary">{order.orderNum}</p>
                    <p className="text-sm text-foreground mt-1">{order.vehicle}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.createdAt} · {order.status}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    {order.orderTotal.toFixed(2)} KM
                  </p>
                </button>
              ))
            )}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
