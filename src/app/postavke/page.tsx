'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Clock3,
  Download,
  KeyRound,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Mechanic, findMechanic, useMechanics } from '@/lib/mechanics';
import { ACCOUNTS_STORAGE_KEY, MechanicAccount, readAccounts } from '@/lib/accounts';
import { readCache, writeCache, push } from '@/lib/syncStore';

type Account = MechanicAccount;
type Workshop = { name: string; address: string; phone: string; email: string };
const accountKey = ACCOUNTS_STORAGE_KEY;
const workshopKey = 'autoservis-workshop-settings';
const defaultWorkshop: Workshop = { name: 'Auto Servis Zizu', address: '', phone: '', email: '' };
const NOTIFICATION_KEY = 'autoservis-notification-settings';
const OWNER_PASSWORD_KEY = 'autoservis-owner-password';

function load<T>(key: string, fallback: T): T {
  return readCache<T>(key, fallback);
}

export default function SettingsPage() {
  const { mechanics, save: saveMechanics } = useMechanics();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mechanicId, setMechanicId] = useState('');
  const [workshop, setWorkshop] = useState(defaultWorkshop);
  const [isOwner, setIsOwner] = useState(true);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [payoutNotices, setPayoutNotices] = useState(true);
  const [orderNotices, setOrderNotices] = useState(true);

  useEffect(() => {
    try {
      const session = JSON.parse(
        sessionStorage.getItem('autoservis-session') ||
          localStorage.getItem('autoservis-session') ||
          'null'
      ) as { userRole?: string } | null;
      setIsOwner(!session || session.userRole === 'owner');
      setAccounts(readAccounts());
      setWorkshop(load(workshopKey, defaultWorkshop));
      const notices = load('autoservis-notification-settings', { payout: true, order: true });
      setPayoutNotices(notices.payout);
      setOrderNotices(notices.order);
    } catch {
      setAccounts([]);
    }
  }, []);

const saveAccounts = (next: Account[]) => {
    setAccounts(next);
    writeCache(accountKey, next);
    void push(accountKey, next);
  };
  const selectedMechanic = findMechanic(mechanics, mechanicId);

  /** Links the login to the chosen mechanic, or creates a roster entry from the typed name. */
  const resolveMechanic = (fullName: string, loginEmail: string): Mechanic => {
    if (selectedMechanic) {
      const updated = { ...selectedMechanic, email: selectedMechanic.email || loginEmail };
      saveMechanics(mechanics.map((m) => (m.id === updated.id ? updated : m)));
      return updated;
    }
    const existing = mechanics.find((m) => m.name.toLowerCase() === fullName.toLowerCase());
    if (existing) return existing;
    const created: Mechanic = {
      id: `mech-${Date.now()}`,
      name: fullName,
      specialty: 'Servis',
      email: loginEmail,
      phone: '',
      active: true,
    };
    saveMechanics([...mechanics, created]);
    return created;
  };

  const createAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (accounts.some((account) => account.email === normalizedEmail)) {
      setMessage('Email već postoji.');
      return;
    }
    const fullName = (selectedMechanic?.name ?? name).trim();
    if (!fullName) {
      setMessage('Unesite ime majstora ili odaberite postojećeg.');
      return;
    }
    if (accounts.some((account) => account.mechanicId && account.mechanicId === mechanicId)) {
      setMessage('Taj majstor već ima login.');
      return;
    }
    const mechanic = resolveMechanic(fullName, normalizedEmail);
    saveAccounts([
      ...accounts,
      {
        id: `mechanic-${Date.now()}`,
        fullName: mechanic.name,
        email: normalizedEmail,
        password,
        role: 'mechanic',
        mechanicId: mechanic.id,
      },
    ]);
    setName('');
    setEmail('');
    setPassword('');
    setMechanicId('');
    setMessage(`Login je kreiran i povezan sa majstorom ${mechanic.name}.`);
  };

  const linkAccount = (accountId: string, nextMechanicId: string) => {
    const mechanic = findMechanic(mechanics, nextMechanicId);
    if (!mechanic) return;
    saveAccounts(
      accounts.map((account) =>
        account.id === accountId
          ? { ...account, mechanicId: mechanic.id, fullName: mechanic.name }
          : account
      )
    );
    setMessage(`Login je povezan sa majstorom ${mechanic.name}.`);
  };
  const changeMechanicPassword = (id: string) => {
    if (newPassword.length < 6) {
      setMessage('Lozinka mora imati najmanje 6 znakova.');
      return;
    }
    saveAccounts(
      accounts.map((account) =>
        account.id === id ? { ...account, password: newPassword } : account
      )
    );
    setEditingId(null);
    setNewPassword('');
    setMessage('Lozinka je promijenjena.');
  };
const updateNotices = (payout: boolean, order: boolean) => {
    setPayoutNotices(payout);
    setOrderNotices(order);
    const value = { payout, order };
    writeCache(NOTIFICATION_KEY, value);
    void push(NOTIFICATION_KEY, value);
  };
  const backup = () => {
    const data = Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith('autoservis-'))
        .map((key) => [key, localStorage.getItem(key)])
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'autoservis-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Postavke</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Radionica, korisnici, sigurnost i obavijesti
          </p>
        </div>
        {!isOwner ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            Samo administrator može upravljati postavkama.
          </div>
        ) : (
          <>
            <section className="bg-card border border-border rounded-xl shadow-card p-5">
              <h2 className="font-semibold flex items-center gap-2">
                <Save size={18} className="text-primary" /> Podaci radionice
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {(['name', 'address', 'phone', 'email'] as const).map((field) => (
                  <input
                    key={field}
                    value={workshop[field]}
                    onChange={(event) => setWorkshop({ ...workshop, [field]: event.target.value })}
                    placeholder={
                      field === 'name'
                        ? 'Naziv radionice'
                        : field === 'address'
                          ? 'Adresa'
                          : field === 'phone'
                            ? 'Telefon'
                            : 'Email'
                    }
                    className="px-3 py-2 text-sm bg-background border border-input rounded-lg"
                  />
                ))}
              </div>
<button
                type="button"
                onClick={() => {
                  writeCache(workshopKey, workshop);
                  void push(workshopKey, workshop);
                  setMessage('Podaci radionice su sačuvani.');
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg"
              >
                <Save size={15} /> Sačuvaj
              </button>
            </section>
            <section className="bg-card border border-border rounded-xl shadow-card p-5">
              <h2 className="font-semibold flex items-center gap-2">
                <UserPlus size={18} className="text-primary" /> Korisnici i login
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Svaki login je povezan sa majstorom — kada se majstor prijavi, nalozi se automatski
                vode na njegovo ime.
              </p>
              <form onSubmit={createAccount} className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <select
                  value={mechanicId}
                  onChange={(e) => setMechanicId(e.target.value)}
                  className="px-3 py-2 text-sm bg-background border border-input rounded-lg"
                >
                  <option value="">Novi majstor (iz imena)</option>
                  {mechanics.map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.name}
                      {mechanic.active ? '' : ' (neaktivan)'}
                    </option>
                  ))}
                </select>
                <input
                  required={!selectedMechanic}
                  disabled={Boolean(selectedMechanic)}
                  value={selectedMechanic ? selectedMechanic.name : name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ime i prezime"
                  className="px-3 py-2 text-sm bg-background border border-input rounded-lg disabled:opacity-60"
                />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="px-3 py-2 text-sm bg-background border border-input rounded-lg"
                />
                <input
                  required
                  minLength={6}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Lozinka, min. 6 znakova"
                  className="px-3 py-2 text-sm bg-background border border-input rounded-lg"
                />
                <button
                  type="submit"
                  className="md:col-span-3 justify-self-start inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg"
                >
                  <Plus size={15} /> Kreiraj login
                </button>
              </form>
              <div className="divide-y divide-border mt-4">
                {accounts.map((account) => (
                  <div key={account.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{account.fullName}</p>
                        <p className="text-xs text-muted-foreground">{account.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Majstor:</span>
                          <select
                            value={account.mechanicId ?? ''}
                            onChange={(e) => linkAccount(account.id, e.target.value)}
                            className="px-2 py-1 text-xs bg-background border border-input rounded-lg"
                          >
                            <option value="">Nije povezan</option>
                            {mechanics.map((mechanic) => (
                              <option key={mechanic.id} value={mechanic.id}>
                                {mechanic.name}
                                {mechanic.active ? '' : ' (neaktivan)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === account.id ? null : account.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs text-primary bg-primary/10 rounded-lg"
                        >
                          <KeyRound size={14} /> Promijeni lozinku
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            saveAccounts(accounts.filter((item) => item.id !== account.id))
                          }
                          className="p-2 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {editingId === account.id && (
                      <div className="flex gap-2 mt-3 max-w-md">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nova lozinka"
                          className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => changeMechanicPassword(account.id)}
                          className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg"
                        >
                          Sačuvaj
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl shadow-card p-5">
                <h2 className="font-semibold flex items-center gap-2">
                  <Clock3 size={18} className="text-primary" /> Radno vrijeme
                </h2>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Pon - Pet</span>
                    <strong>08:00 - 17:00</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Subota</span>
                    <strong>08:00 - 14:00</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Nedjelja</span>
                    <strong>Zatvoreno</strong>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl shadow-card p-5">
                <h2 className="font-semibold flex items-center gap-2">
                  <Bell size={18} className="text-primary" /> Obavijesti
                </h2>
                <label className="flex justify-between mt-4 text-sm">
                  <span>Podsjetnici za isplate</span>
                  <input
                    type="checkbox"
                    checked={payoutNotices}
                    onChange={(e) => updateNotices(e.target.checked, orderNotices)}
                  />
                </label>
                <label className="flex justify-between mt-4 text-sm">
                  <span>Obavijesti o nalozima</span>
                  <input
                    type="checkbox"
                    checked={orderNotices}
                    onChange={(e) => updateNotices(payoutNotices, e.target.checked)}
                  />
                </label>
              </div>
            </section>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl shadow-card p-5">
                <h2 className="font-semibold flex items-center gap-2">
                  <KeyRound size={18} className="text-primary" /> Admin lozinka
                </h2>
                <div className="flex gap-2 mt-4">
                  <input
                    type="password"
                    minLength={6}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Nova admin lozinka"
                    className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-lg"
                  />
                  <button
                    type="button"
onClick={() => {
                      if (ownerPassword.length >= 6) {
                        writeCache(OWNER_PASSWORD_KEY, ownerPassword);
                        void push(OWNER_PASSWORD_KEY, ownerPassword);
                        setOwnerPassword('');
                        setMessage('Admin lozinka je promijenjena.');
                      }
                    }}
                    className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg"
                  >
                    Sačuvaj
                  </button>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl shadow-card p-5">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" /> Finansijska pravila
                </h2>
                <p className="text-sm mt-3">
                  Valuta: <strong>KM</strong>
                </p>
                <p className="text-sm mt-1">
                  Isplata majstoru: <strong>10% od rada</strong>
                </p>
              </div>
            </section>
            <section className="bg-card border border-border rounded-xl shadow-card p-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Sigurnosna kopija</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Preuzmite podatke kao JSON fajl.
                </p>
              </div>
              <button
                type="button"
                onClick={backup}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg"
              >
                <Download size={16} /> Izvezi podatke
              </button>
            </section>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
          </>
        )}
      </div>
    </AppLayout>
  );
}
