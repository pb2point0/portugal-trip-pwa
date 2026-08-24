'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { KeyRound, LockKeyhole, Mail } from 'lucide-react';
import FullTripApp from './FullTripApp';
import { getSupabase, isSupabaseConfigured } from './supabase';
import './auth.css';
import './auth-password.css';

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!next) localStorage.removeItem('trip-weather-v1');
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function signIn() {
    if (!supabase || !email || !password) return;
    setSigningIn(true);
    setMessage('Signing in…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? 'That email and password combination was not recognized.' : 'Welcome back.');
    setSigningIn(false);
  }

  async function signOut() {
    localStorage.removeItem('trip-weather-v1');
    await supabase?.auth.signOut();
  }

  if (loading) return <main className="auth-shell"><div className="auth-loader" aria-label="Loading"/></main>;
  if (session && supabase) return <FullTripApp supabase={supabase} userEmail={session.user.email ?? 'Traveler'} onSignOut={signOut}/>;

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="auth-mark">P</div>
      <p className="auth-kicker"><LockKeyhole size={13}/> Authorized travelers only</p>
      <h1>Private Portugal<br/><em>trip.</em></h1>
      <p className="auth-lede">Sign in to open the protected itinerary, reservations, routes, and plans.</p>
      {!isSupabaseConfigured ? <div className="auth-setup"><KeyRound size={20}/><div><strong>Supabase setup needed</strong><p>Add the project URL and publishable key to the GitHub repository secrets before deployment.</p></div></div> : <div className="auth-form">
        <label htmlFor="email">Email</label>
        <div><Mail size={18}/><input id="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
        <label htmlFor="password">Trip password</label>
        <div><LockKeyhole size={18}/><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your private password" onKeyDown={e=>e.key==='Enter'&&void signIn()}/></div>
        <button disabled={signingIn || !email || !password} onClick={()=>void signIn()}>{signingIn ? 'Signing in…' : 'Open private trip'}</button>
        {message&&<p role="status">{message}</p>}
      </div>}
      <small>Private · authenticated access only</small>
    </section>
  </main>;
}
