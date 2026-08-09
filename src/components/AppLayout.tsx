'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  userRole?: 'owner' | 'mechanic';
  userName?: string;
  userEmail?: string;
}

export default function AppLayout({
  children,
  userRole = 'owner',
  userName = 'Armin Mujić',
  userEmail = 'armin@autoservis.com',
}: AppLayoutProps) {
  const [session, setSession] = useState({ userRole, userName, userEmail });

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem('autoservis-session')
        || window.localStorage.getItem('autoservis-session');
      if (stored) setSession(JSON.parse(stored));
    } catch {
      setSession({ userRole, userName, userEmail });
    }
  }, [userRole, userName, userEmail]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={session.userRole} userName={session.userName} userEmail={session.userEmail} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
