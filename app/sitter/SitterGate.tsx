'use client';

import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, LockKeyhole, PawPrint } from 'lucide-react';
import SitterApp from './SitterApp';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import '../auth.css';

const storageKey = 'sitter-passphrase';
type VerifyResponse = { ok?: boolean; error?: string };

export default function SitterGate() {
  const [passphrase, setPassphrase] = useState('');
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const [checking, setChecking] = useState(isSupabaseConfigured);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;
    const stored = window.sessionStorage.getItem(storageKey);
    const verification = stored
      ? supabase.functions.invoke<VerifyResponse>('sitter-ai', { body: { action: 'verify', passphrase: stored } })
      : Promise.resolve({ data: undefined, error: undefined });
    void verification.then(({ data, error }) => {
      if (stored && !error && data?.ok) setUnlocked(stored);
      else if (stored) window.sessionStorage.removeItem(storageKey);
      setChecking(false);
    });
  }, [supabase]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !passphrase.trim()) return;
    setVerifying(true);
    setMessage('Checking…');
    const clean = passphrase.trim();
    const { data, error } = await supabase.functions.invoke<VerifyResponse>('sitter-ai', { body: { action: 'verify', passphrase: clean } });
    if (!error && data?.ok) {
      window.sessionStorage.setItem(storageKey, clean);
      setUnlocked(clean);
      setMessage('');
    } else {
      setMessage(data?.error || 'That passphrase was not recognized.');
    }
    setVerifying(false);
  }

  function lock() {
    window.sessionStorage.removeItem(storageKey);
    setUnlocked(null);
    setPassphrase('');
  }

  if (checking) return <main className="auth-shell"><div className="auth-loader" aria-label="Loading" /></main>;
  if (unlocked && supabase) return <SitterApp supabase={supabase} passphrase={unlocked} onLock={lock} />;

  return <main className="auth-shell">
    <section className="auth-card">
      <span className="auth-trip-mark" aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }}><PawPrint size={24} color="#c9634c" /></span>
      <p className="auth-kicker"><LockKeyhole size={13} /> For Flynn only</p>
      <h1>House &amp; dog<br /><em>guide.</em></h1>
      <p className="auth-lede">Enter the passphrase Patrik gave you to open the sitter guide.</p>
      {!isSupabaseConfigured ? <div className="auth-setup"><KeyRound size={20} /><div><strong>Not set up yet</strong><p>The sitter guide isn&apos;t configured yet on this deployment.</p></div></div> : <form className="auth-form" autoComplete="off" onSubmit={(event) => void unlock(event)}>
        <label htmlFor="sitter-passphrase">Passphrase</label>
        <div><LockKeyhole size={18} /><input id="sitter-passphrase" name="sitter-passphrase" type="password" autoComplete="off" enterKeyHint="go" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Passphrase" /></div>
        <button type="submit" disabled={verifying || !passphrase.trim()}>{verifying ? 'Checking…' : 'Open the guide'}</button>
        {message && <p role="status">{message}</p>}
      </form>}
      <small>Dog &amp; house sitting guide · Aug 29 – Sep 14, 2026</small>
    </section>
  </main>;
}
