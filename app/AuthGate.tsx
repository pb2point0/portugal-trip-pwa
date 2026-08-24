'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { KeyRound, LockKeyhole, Mail } from 'lucide-react';
import FullTripApp from './FullTripApp';
import TripMark from './TripMark';
import { getSupabase, isSupabaseConfigured } from './supabase';
import './auth.css';
import './auth-password.css';

const rememberKey = 'portugal-remember-device';
const sessionMarker = 'portugal-session-active';

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;
    const remembered = window.localStorage.getItem(rememberKey) !== 'false';
    void supabase.auth.getSession().then(async ({ data }) => {
      setRememberDevice(remembered);
      if (data.session && !remembered && window.sessionStorage.getItem(sessionMarker) !== 'true') {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!next) {
        localStorage.removeItem('trip-weather-v1');
        sessionStorage.removeItem(sessionMarker);
      }
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !email || !password) return;
    setSigningIn(true);
    setMessage('Signing in…');
    window.localStorage.setItem(rememberKey, String(rememberDevice));
    if (rememberDevice) window.sessionStorage.removeItem(sessionMarker);
    else window.sessionStorage.setItem(sessionMarker, 'true');

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setMessage(error ? 'That email and password combination was not recognized.' : '');
    setSigningIn(false);
  }

  async function signOut() {
    localStorage.removeItem('trip-weather-v1');
    sessionStorage.removeItem(sessionMarker);
    await supabase?.auth.signOut();
  }

  if (loading) return <main className="auth-shell"><div className="auth-loader" aria-label="Loading"/></main>;
  if (session && supabase) return <FullTripApp supabase={supabase} userEmail={session.user.email ?? 'Traveler'} onSignOut={signOut}/>;

  return <main className="auth-shell">
    <section className="auth-card">
      <TripMark className="auth-trip-mark"/>
      <p className="auth-kicker"><LockKeyhole size={13}/> Authorized travelers only</p>
      <h1>Private Portugal<br/><em>trip.</em></h1>
      <p className="auth-lede">Sign in to open the itinerary, reservations, routes, and plans.</p>
      {!isSupabaseConfigured ? <div className="auth-setup"><KeyRound size={20}/><div><strong>Supabase setup needed</strong><p>Add the project URL and publishable key to the GitHub repository secrets before deployment.</p></div></div> : <form className="auth-form" autoComplete="on" onSubmit={(event) => void signIn(event)}>
        <label htmlFor="email">Email</label>
        <div><Mail size={18}/><input id="email" name="username" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} enterKeyHint="next" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
        <label htmlFor="password">Trip password</label>
        <div><LockKeyhole size={18}/><input id="password" name="password" type="password" autoComplete="current-password" enterKeyHint="go" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your private password"/></div>
        <label className="auth-remember"><input type="checkbox" checked={rememberDevice} onChange={(event)=>setRememberDevice(event.target.checked)}/><span>Remember this device</span></label>
        <button type="submit" disabled={signingIn || !email || !password}>{signingIn ? 'Signing in…' : 'Open private trip'}</button>
        {message&&<p role="status">{message}</p>}
        <small className="auth-session-note">The login session is stored only for access to this private trip. No advertising or analytics cookies.</small>
      </form>}
      <small>Private · authenticated access only</small>
    </section>
  </main>;
}
