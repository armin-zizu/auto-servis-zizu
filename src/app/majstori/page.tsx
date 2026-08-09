import React from 'react';
import Link from 'next/link';
import { ArrowRight, Users, Wrench } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

const mechanics = [
  { name: 'Derek Hollis', specialty: 'Servis i dijagnostika', orders: 18, status: 'Aktivan' },
  { name: 'Tomas Reyes', specialty: 'Kočnice i ovjes', orders: 14, status: 'Aktivan' },
  { name: 'Mei-Ling Park', specialty: 'Elektronika', orders: 11, status: 'Aktivan' },
  { name: 'Antoine Briggs', specialty: 'Motor i mjenjač', orders: 9, status: 'Aktivan' },
];

export default function MechanicsPage() {
  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/" className="text-xs text-primary hover:underline">Dashboard</Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">Majstori</h1>
            <p className="text-sm text-muted-foreground mt-1">Pregled članova servisnog tima</p>
          </div>
          <Link href="/majstori/isplate" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            Isplate <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {mechanics.map((mechanic) => (
            <div key={mechanic.name} className="bg-card border border-border rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wrench size={19} className="text-primary" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-1">{mechanic.status}</span>
              </div>
              <h2 className="text-base font-semibold text-foreground mt-5">{mechanic.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">{mechanic.specialty}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-5">
                <Users size={14} /> {mechanic.orders} završenih naloga
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
