'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { KeyRound, LockKeyhole } from 'lucide-react';
import FullTripApp from './FullTripApp';
import TripMark from './TripMark';
import { getSupabase, isSupabaseConfigured } from './supabase';
import './auth.css';
import './auth-password.css';

const rememberKey = 'portugal-remember-device';
const sessionMarker = 'portugal-session-active';
type LoginResponse = { access_token?: string; refresh_token?: string; error?: string };

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [passphrase, setPassphrase] = useState('');
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
    const clean = passphrase.trim();
    if (!supabase || !clean) return;
    setSigningIn(true);
    setMessage('Checking…');
    window.localStorage.setItem(rememberKey, String(rememberDevice));
    if (rememberDevice) window.sessionStorage.removeItem(sessionMarker);
    else window.sessionStorage.setItem(sessionMarker, 'true');

    const { data, error } = await supabase.functions.invoke<LoginResponse>('trip-login', { body: { passphrase: clean } });
    if (error || !data?.access_token || !data.refresh_token) {
      setMessage(data?.error || 'That passphrase was not recognized.');
      setSigningIn(false);
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    setMessage(sessionError ? 'Could not open the trip. Try again.' : '');
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
      <p className="auth-kicker"><LockKeyhole size={13}/> Just the two of us</p>
      <h1>Our Portugal<br/><em>honeymoon.</em></h1>
      <p className="auth-lede">Enter the passphrase to open the itinerary, reservations, routes, and plans.</p>
      {!isSupabaseConfigured ? <div className="auth-setup"><KeyRound size={20}/><div><strong>Supabase setup needed</strong><p>Add the project URL and publishable key to the GitHub repository secrets before deployment.</p></div></div> : <form className="auth-form" autoComplete="off" onSubmit={(event) => void signIn(event)}>
        <label htmlFor="passphrase">Passphrase</label>
        <div><LockKeyhole size={18}/><input id="passphrase" name="passphrase" type="password" inputMode="numeric" autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go" value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="Passphrase"/></div>
        <label className="auth-remember"><input type="checkbox" checked={rememberDevice} onChange={(event)=>setRememberDevice(event.target.checked)}/><span>Remember this device</span></label>
        <button type="submit" disabled={signingIn || !passphrase.trim()}>{signingIn ? 'Opening…' : 'Open our honeymoon'}</button>
        {message&&<p role="status">{message}</p>}
        <small className="auth-session-note">The login session is stored only for access to this protected trip. No advertising or analytics cookies.</small>
      </form>}
      <small>Honeymoon · invited travelers only</small>
    </section>
  </main>;
}
