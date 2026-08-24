'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Trash2, Users, Wrench } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';
import { Mechanic, useMechanics } from '@/lib/mechanics';
import {
  ORDERS_STORAGE_KEY,
  WorkOrder,
  mockWorkOrders,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache, pull, subscribe } from '@/lib/syncStore';

function readOrders(): WorkOrder[] {
  if (typeof window === 'undefined') return mockWorkOrders;
  return readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, mockWorkOrders);
}

function readSession() {
  try {
    return JSON.parse(
      window.sessionStorage.getItem('autoservis-session') ||
        window.localStorage.getItem('autoservis-session') ||
        'null'
    ) as { userRole?: string } | null;
  } catch {
    return null;
  }
}

export default function MechanicsPage() {
  const { mechanics, save } = useMechanics();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [isOwner, setIsOwner] = useState(true);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Mechanic | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    setIsOwner(!session || session.userRole === 'owner');
    setOrders(readOrders());
    // Fetch the latest orders from Supabase so completed-order counts are
    // correct on any device.
    void pull<WorkOrder[]>(ORDERS_STORAGE_KEY).then((remote) => {
      if (remote) setOrders(remote);
    });
    const unsubscribe = subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, () => setOrders(readOrders()));
    return unsubscribe;
  }, []);

  const completedByMechanic = useMemo(() => {
    const counts = new Map<string, number>();
    orders
      .filter((order) => order.status === 'Zatvoren')
      .forEach((order) => counts.set(order.mechanic, (counts.get(order.mechanic) ?? 0) + 1));
    return counts;
  }, [orders]);

  const mechanicOrders = useMemo(
    () =>
      selectedMechanic ? orders.filter((order) => order.mechanic === selectedMechanic.name) : [],
    [orders, selectedMechanic]
  );

  const addMechanic = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (mechanics.some((mechanic) => mechanic.name.toLowerCase() === trimmedName.toLowerCase())) {
      setMessage('Majstor s tim imenom već postoji.');
      return;
    }
    save([
      ...mechanics,
      {
        id: `mech-${Date.now()}`,
        name: trimmedName,
        specialty: specialty.trim() || 'Servis',
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        active: true,
      },
    ]);
    setName('');
    setSpecialty('');
    setEmail('');
    setPhone('');
    setMessage(`Majstor ${trimmedName} je dodan.`);
  };

  const toggleActive = (id: string) => {
    save(
      mechanics.map((mechanic) =>
        mechanic.id === id ? { ...mechanic, active: !mechanic.active } : mechanic
      )
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    save(mechanics.filter((mechanic) => mechanic.id !== deleteTarget.id));
    setMessage(`Majstor ${deleteTarget.name} je obrisan.`);
    setDeleteTarget(null);
  };

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/" className="text-xs text-primary hover:underline">
              Dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">Majstori</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pregled članova servisnog tima ·{' '}
              {mechanics.filter((mechanic) => mechanic.active).length} aktivnih
            </p>
          </div>
          <Link
            href="/majstori/isplate"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
          >
            Isplate <ArrowRight size={15} />
          </Link>
        </div>

        {isOwner && (
          <section className="bg-card border border-border rounded-xl shadow-card p-5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Plus size={18} className="text-primary" /> Novi majstor
            </h2>
            <form onSubmit={addMechanic} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ime i prezime"
                className="px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="Specijalnost"
                className="px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email (opcionalno)"
                className="px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Telefon (opcionalno)"
                className="px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="md:col-span-4 justify-self-start inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
              >
                <Plus size={15} /> Dodaj majstora
              </button>
            </form>
            {message && <p className="text-sm text-emerald-600 mt-3">{message}</p>}
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {mechanics.map((mechanic) => (
            <button
              type="button"
              key={mechanic.id}
              onClick={() => setSelectedMechanic(mechanic)}
              className="bg-card border border-border rounded-xl shadow-card p-5 text-left hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wrench size={19} className="text-primary" />
                </div>
                <button
                  type="button"
                  disabled={!isOwner}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleActive(mechanic.id);
                  }}
                  className={`text-xs font-medium rounded-full px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${mechanic.active ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-muted-foreground bg-muted hover:bg-secondary'}`}
                  title={isOwner ? 'Promijeni status' : undefined}
                >
                  {mechanic.active ? 'Aktivan' : 'Neaktivan'}
                </button>
              </div>
              <h2 className="text-base font-semibold text-foreground mt-5">{mechanic.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">{mechanic.specialty}</p>
              {mechanic.email && (
                <p className="text-xs text-muted-foreground mt-1">{mechanic.email}</p>
              )}
              {mechanic.phone && (
                <p className="text-xs text-muted-foreground mt-1">{mechanic.phone}</p>
              )}
              <div className="flex items-center justify-between mt-5">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users size={14} /> {completedByMechanic.get(mechanic.name) ?? 0} završenih naloga
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(mechanic);
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={`Obriši majstora ${mechanic.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>

        {mechanics.length === 0 && (
          <div className="bg-card border border-border rounded-xl shadow-card p-10 text-center text-sm text-muted-foreground">
            Nema unesenih majstora. Dodajte prvog majstora iznad.
          </div>
        )}
      </div>

      <Modal
        open={selectedMechanic !== null}
        onClose={() => setSelectedMechanic(null)}
        title={selectedMechanic?.name || 'Majstor'}
        subtitle={
          selectedMechanic
            ? `${mechanicOrders.length} radnih naloga · ${mechanicOrders.filter((o) => o.status === 'Zatvoren').length} završenih`
            : undefined
        }
        size="xl"
      >
        <div className="space-y-3">
          {mechanicOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ovaj majstor još nema radnih naloga.
            </p>
          ) : (
            mechanicOrders.map((order) => (
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
                  <p className="text-sm text-foreground mt-1">
                    {order.clientName} · {order.vehicle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.createdAt} · {order.status}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {(Number(order.orderTotal) || 0).toFixed(2)} KM
                </p>
              </button>
            ))
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Obriši majstora"
        description={`Da li ste sigurni da želite obrisati majstora ${deleteTarget?.name ?? ''}? Postojeći nalozi zadržavaju njegovo ime.`}
        confirmLabel="Obriši majstora"
      />
    </AppLayout>
  );
}
