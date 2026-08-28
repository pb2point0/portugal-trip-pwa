'use client';

import type { ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LockKeyhole, PawPrint, TriangleAlert } from 'lucide-react';
import SitterAi from './SitterAi';
import { emergencyContacts, guideSections, houseNotes, quickReference, reachUs, tripWindow } from './sitter-data';
import './sitter.css';

function bold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
}

function ContactValue({ value }: { value: string }) {
  if (value.trim()) return <span className="sitter-contact-value">{bold(value)}</span>;
  return <span className="sitter-contact-value missing">not filled in yet — ask Patrik</span>;
}

export default function SitterApp({ supabase, passphrase, onLock }: { supabase: SupabaseClient; passphrase: string; onLock: () => void }) {
  return <main className="sitter-app">
    <div className="sitter-shell">
      <header className="sitter-header">
        <div className="sitter-header-top">
          <span className="sitter-mark" aria-hidden="true"><PawPrint size={22} /></span>
          <button className="sitter-lock" type="button" onClick={onLock}><LockKeyhole size={12} />Lock</button>
        </div>
        <h1>House &amp; dog guide<br /><em>for Flynn.</em></h1>
        <p>Thank you for doing this — it means we can actually relax. Everything you need for <strong>Chloe</strong> and <strong>Bengt</strong> is on this page, and you can ask the assistant below anything the guide doesn&apos;t answer clearly.</p>
        <span className="sitter-dates">{tripWindow.startLabel} – {tripWindow.endLabel}</span>
        <p style={{ marginTop: 10 }}>{bold(tripWindow.timezoneNote)}</p>
      </header>

      <section className="sitter-quickref">
        <h2>Quick reference</h2>
        <dl className="sitter-quickref-grid">
          {quickReference.map((row) => <div className="sitter-quickref-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value.trim() ? bold(row.value) : <span className="sitter-contact-value missing">not filled in yet — ask Patrik</span>}</dd>
          </div>)}
        </dl>
      </section>

      {guideSections.map((section) => <section className={'sitter-section' + (section.id === 'crate' ? ' crate' : '')} key={section.id}>
        <h2>{section.id === 'crate' ? <><TriangleAlert size={16} style={{ verticalAlign: -3, marginRight: 6, color: 'var(--coral)' }} />{section.title}</> : section.title}</h2>
        {section.paragraphs.map((paragraph, index) => paragraph.startsWith('- ') ? <li key={index} style={{ listStyle: 'none', paddingLeft: 0 }}>{bold(paragraph.slice(2))}</li> : <p key={index}>{bold(paragraph)}</p>)}
      </section>)}

      <section className="sitter-contacts">
        <h2>Emergencies</h2>
        {emergencyContacts.map((row) => <div className="sitter-contact-row" key={row.who}>
          <span><span className="sitter-contact-who">{row.who}</span><span className="sitter-contact-role">{row.role}</span></span>
          <ContactValue value={row.contact} />
        </div>)}
      </section>

      <section className="sitter-contacts">
        <h2>The house</h2>
        {houseNotes.map((row) => <div className="sitter-contact-row" key={row.label}>
          <span className="sitter-contact-who">{row.label}</span>
          <span className="sitter-contact-value" style={{ textAlign: 'right', fontWeight: 400, color: 'var(--ink)' }}>{bold(row.value)}</span>
        </div>)}
      </section>

      <section className="sitter-contacts">
        <h2>Reaching us</h2>
        {reachUs.map((row) => <div className="sitter-contact-row" key={row.who}>
          <span><span className="sitter-contact-who">{row.who}</span>{row.role && <span className="sitter-contact-role">{row.role}</span>}</span>
          <ContactValue value={row.contact} />
        </div>)}
      </section>

      <SitterAi supabase={supabase} passphrase={passphrase} />

      <p className="sitter-footer-note">This page is just for you, Flynn. If anything ever feels wrong with either dog, don&apos;t wait on us — call the vet, then call or WhatsApp us.</p>
    </div>
  </main>;
}
