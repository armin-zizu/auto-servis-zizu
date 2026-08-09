'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Wrench,
  LogOut,
  Settings,
  Users,
  DollarSign,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Kontrolna tabla',
    href: '/',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Radni nalozi',
    href: '/work-order-managment',
    icon: <ClipboardList size={20} />,
    badge: 5,
  },
];

const bottomNavItems: NavItem[] = [
  {
    label: 'Postavke',
    href: '/postavke',
    icon: <Settings size={20} />,
    ownerOnly: true,
  },
];

const financeNavItems = [
  { label: 'Pregled finansija', href: '/finansije' },
  { label: 'Prihodi', href: '/finansije/prihodi' },
  { label: 'Troškovi', href: '/finansije/troskovi' },
  { label: 'Isplate majstorima', href: '/majstori/isplate' },
];

interface SidebarProps {
  userRole?: 'owner' | 'mechanic';
  userName?: string;
  userEmail?: string;
}

export default function Sidebar({
  userRole = 'owner',
  userName = 'Armin Mujić',
  userEmail = 'armin@autoservis.com',
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const visibleNav = navItems.filter(
    (item) => !item.ownerOnly || userRole === 'owner'
  );

  return (
    <aside
      className={`relative flex flex-col bg-card border-r border-border sidebar-transition shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ minHeight: '100vh' }}
    >
      {/* Logo */}
      <div
        className={`flex items-center border-b border-border h-16 px-3 ${
          collapsed ? 'justify-center' : 'gap-2 px-4'
        }`}
      >
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-semibold text-base text-foreground tracking-tight">
            AutoServis
          </span>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-semibold">
                {userName.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-tight">
                {userName}
              </p>
              <p className="text-xs text-muted-foreground capitalize leading-tight">
                {userRole === 'owner' ? 'Vlasnik / Menadžer' : 'Majstor'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p
          className={`text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2 px-2 ${
            collapsed ? 'hidden' : 'block'
          }`}
        >
          Glavno
        </p>
        {visibleNav.map((item) => (
          <Link
            key={`nav-${item.href}`}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`group flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative
              ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                {item.badge}
              </span>
            )}
            {collapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
            )}
          </Link>
        ))}

        <div className="mt-4">
          <Link
            href="/finansije"
            title={collapsed ? 'Finansije' : undefined}
            className={`group flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${
              pathname.startsWith('/finansije') || pathname.startsWith('/majstori/isplate')
                ? 'bg-primary/10 text-primary'
                : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="shrink-0"><DollarSign size={20} /></span>
            {!collapsed && <span className="flex-1 truncate">Finansije</span>}
          </Link>
          {!collapsed && (
            <div className="ml-9 mt-1 space-y-0.5 border-l border-border pl-3">
              {financeNavItems.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-2 py-1.5 rounded-md text-xs transition-colors ${
                    pathname === item.href
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {userRole === 'owner' && (
          <>
            <p
              className={`text-xs font-medium text-muted-foreground uppercase tracking-widest mt-4 mb-2 px-2 ${
                collapsed ? 'hidden' : 'block'
              }`}
            >
              Admin
            </p>
            <Link
              href="/majstori"
              title={collapsed ? 'Majstori' : undefined}
              className={`group flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                text-secondary-foreground hover:bg-muted hover:text-foreground
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className="shrink-0">
                <Wrench size={20} />
              </span>
              {!collapsed && <span>Majstori</span>}
            </Link>
            <Link
              href="/klijenti"
              title={collapsed ? 'Klijenti' : undefined}
              className={`group flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                text-secondary-foreground hover:bg-muted hover:text-foreground
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className="shrink-0">
                <Users size={20} />
              </span>
              {!collapsed && <span>Klijenti</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border space-y-0.5">
        {bottomNavItems
          .filter((item) => !item.ownerOnly || userRole === 'owner')
          .map((item) => (
            <Link
              key={`bottom-nav-${item.label}`}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium text-secondary-foreground hover:bg-muted hover:text-foreground transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        <Link
          href="/sing-up-login"
          onClick={() => {
            window.localStorage.removeItem('autoservis-session');
            window.sessionStorage.removeItem('autoservis-session');
          }}
          title={collapsed ? 'Odjava' : undefined}
          className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium text-secondary-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <span className="shrink-0">
            <LogOut size={20} />
          </span>
          {!collapsed && <span>Odjava</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-card hover:shadow-card-hover transition-all duration-150 z-10"
        aria-label={collapsed ? 'Proširi bočnu traku' : 'Skupi bočnu traku'}
      >
        {collapsed ? (
          <ChevronRight size={12} className="text-muted-foreground" />
        ) : (
          <ChevronLeft size={12} className="text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}
