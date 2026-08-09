import React from 'react';
import Link from 'next/link';
import { ArrowRight, DollarSign, Package, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

const sections = [
  {
    href: '/finansije/prihodi',
    label: 'Prihodi',
    value: '24,810 KM',
    description: 'Ukupan prihod MTD',
    icon: DollarSign,
    className: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    href: '/finansije/troskovi',
    label: 'Troškovi',
    value: '13,560 KM',
    description: 'Ukupni troškovi MTD',
    icon: Package,
    className: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    href: '/majstori/isplate',
    label: 'Isplate majstorima',
    value: '4,218 KM',
    description: 'Neisplaćene obaveze MTD',
    icon: Users,
    className: 'bg-blue-50 border-blue-200 text-blue-700',
  },
];

export default function FinancePage() {
  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">Dashboard</Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Finansije</h1>
          <p className="text-sm text-muted-foreground mt-1">Pregled prihoda, troškova i isplata za tekući mjesec</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className={`rounded-xl border p-5 shadow-card hover:shadow-card-hover transition-shadow ${section.className}`}
              >
                <div className="flex items-start justify-between">
                  <Icon size={22} />
                  <ArrowRight size={17} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wide mt-6">{section.label}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{section.value}</p>
                <p className="text-xs mt-1 opacity-80">{section.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
