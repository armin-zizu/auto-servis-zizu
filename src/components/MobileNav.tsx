'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wrench,
  X,
} from 'lucide-react';

interface MobileNavProps {
  userRole?: 'owner' | 'mechanic';
  userName?: string;
}

const mainItems = [
  { label: 'Tabla', href: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Nalozi', href: '/work-order-managment', icon: <ClipboardList size={20} /> },
  { label: 'Finansije', href: '/finansije', icon: <DollarSign size={20} /> },
];

const moreItems = [
  { label: 'Majstori', href: '/majstori', icon: <Wrench size={18} />, ownerOnly: true },
  { label: 'Klijenti', href: '/klijenti', icon: <Users size={18} />, ownerOnly: true },
  { label: 'Isplate majstorima', href: '/majstori/isplate', icon: <DollarSign size={18} /> },
  { label: 'Prihodi', href: '/finansije/prihodi', icon: <DollarSign size={18} /> },
  { label: 'Troškovi', href: '/finansije/troskovi', icon: <DollarSign size={18} /> },
  { label: 'Postavke', href: '/postavke', icon: <Settings size={18} />, ownerOnly: true },
];

export default function MobileNav({ userRole = 'owner', userName = '' }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const visibleMore = moreItems.filter((item) => !item.ownerOnly || userRole === 'owner');

  const logout = () => {
    window.localStorage.removeItem('autoservis-session');
    window.sessionStorage.removeItem('autoservis-session');
  };

  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Zatvori meni"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute bottom-16 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-4 pb-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {userRole === 'owner' ? 'Vlasnik / Menadžer' : 'Majstor'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zatvori meni"
                className="p-2 text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {visibleMore.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link
                href="/sing-up-login"
                onClick={logout}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} /> Odjava
              </Link>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
        {mainItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Više"
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
            open ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Menu size={20} />
          Više
        </button>
      </nav>
    </>
  );
}
