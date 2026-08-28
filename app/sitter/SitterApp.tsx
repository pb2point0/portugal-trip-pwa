'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight, Footprints, House, LockKeyhole, Moon, PawPrint, Phone, Soup } from 'lucide-react';
import SitterAi from './SitterAi';
import {
  contactGroups,
  contactsFooter,
  crateSections,
  feedingNote,
  homeSections,
  meals,
  quickReference,
  tripWindow,
  walkSections,
  welcome,
  type NavKey,
  type Section,
} from './sitter-data';
import './sitter.css';

const tabs: { key: NavKey; label: string; icon: typeof House }[] = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'feeding', label: 'Feeding', icon: Soup },
  { key: 'walks', label: 'Walks', icon: Footprints },
  { key: 'crate', label: 'Crate', icon: Moon },
  { key: 'contacts', label: 'Contacts', icon: Phone },
];

const headings: Record<NavKey, { title: ReactNode; lede?: string }> = {
  home: { title: <>House &amp; dog guide<br /><em>for Flynn.</em></> },
  feeding: { title: <>Feeding.</>, lede: undefined },
  walks: { title: <>Walks &amp; <em>training.</em></> },
  crate: { title: <>The <em>crate.</em></> },
  contacts: { title: <>Contacts.</> },
};

function bold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
}

function SectionCard({ section }: { section: Section }) {
  return <section className="sitter-card">
    <h2>{section.title}</h2>
    {section.lines.map((line, index) => <p key={index}>{bold(line)}</p>)}
  </section>;
}

export default function SitterApp({ supabase, passphrase, onLock }: { supabase: SupabaseClient; passphrase: string; onLock: () => void }) {
  const [view, setView] = useState<NavKey>('home');
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
  }, []);

  function go(next: NavKey) {
    setView(next);
    topRef.current?.scrollIntoView({ block: 'start' });
    window.scrollTo({ top: 0 });
  }

  return <main className="sitter-app">
    <div className="sitter-shell">
      <div ref={topRef} />
      <header className="sitter-bar">
        <span className="sitter-mark" aria-hidden="true"><PawPrint size={19} /></span>
        <span className="sitter-bar-copy">
          <small>Sitter guide</small>
          <strong>Chloe &amp; Bengt</strong>
        </span>
        <button className="sitter-lock" type="button" onClick={onLock} aria-label="Lock the guide"><LockKeyhole size={15} /></button>
      </header>

      <div className="sitter-page-head">
        <h1>{headings[view].title}</h1>
        {view === 'feeding' && <p>{bold(feedingNote)}</p>}
      </div>

      {view === 'home' && <>
        <section className="sitter-card sitter-welcome">
          {welcome.map((line, index) => <p key={index}>{bold(line)}</p>)}
          <span className="sitter-dates">{tripWindow.label}</span>
        </section>

        <section className="sitter-card">
          <h2>Quick reference</h2>
          <dl className="sitter-qr">
            {quickReference.map((row) => <div className="sitter-qr-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value.trim() ? bold(row.value) : <span className="sitter-missing">Patrik will write this in</span>}</dd>
            </div>)}
          </dl>
        </section>

        {homeSections.map((section) => <SectionCard key={section.id} section={section} />)}

        <SitterAi supabase={supabase} passphrase={passphrase} />
      </>}

      {view === 'feeding' && <>
        {meals.map((meal) => <article className="sitter-meal" key={meal.id}>
          <div className="sitter-meal-head">
            <h2>{meal.label}</h2>
            <span>{meal.when}</span>
          </div>
          <div className="sitter-meal-body">
            {meal.before.map((step, index) => <p className="sitter-step" key={'b' + index}><ArrowRight size={15} />{bold(step)}</p>)}
            {meal.bowls.map((bowl) => <div className="sitter-bowl" key={bowl.dog}>
              <div className="sitter-bowl-dog"><b>{bowl.dog}</b><i>{bowl.amount}</i></div>
              <ul>{bowl.adds.map((add) => <li key={add} className={add.includes('allergy') ? 'flag' : undefined}>{add}</li>)}</ul>
            </div>)}
            {meal.after.map((step, index) => <p className="sitter-step" key={'a' + index}><ArrowRight size={15} />{bold(step)}</p>)}
          </div>
        </article>)}
      </>}

      {view === 'walks' && walkSections.map((section) => <SectionCard key={section.id} section={section} />)}

      {view === 'crate' && crateSections.map((section) => <SectionCard key={section.id} section={section} />)}

      {view === 'contacts' && <>
        {contactGroups.map((group) => <div key={group.id}>
          <p className="sitter-group-title">{group.title}</p>
          {group.contacts.map((contact) => contact.phone
            ? <a className="sitter-contact" key={contact.name + contact.phone} href={'tel:' + contact.phone.replace(/\D/g, '')}>
                <span className="sitter-contact-copy">
                  <b>{contact.name}</b>
                  <span>{contact.note}</span>
                  <span className="sitter-contact-num">{contact.phone}</span>
                </span>
                <span className="sitter-contact-call" aria-hidden="true"><Phone size={17} /></span>
              </a>
            : <div className="sitter-contact pending" key={contact.name}>
                <span className="sitter-contact-copy">
                  <b>{contact.name}</b>
                  <span>{contact.note}</span>
                  <span className="sitter-missing">Patrik will write this in</span>
                </span>
                <span className="sitter-contact-call" aria-hidden="true"><Phone size={17} /></span>
              </div>)}
        </div>)}
        <p className="sitter-foot">{contactsFooter}</p>
      </>}
    </div>

    <nav className="sitter-nav" aria-label="Guide sections">
      <div className="sitter-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <button key={tab.key} type="button" className={view === tab.key ? 'active' : undefined} aria-current={view === tab.key ? 'page' : undefined} onClick={() => go(tab.key)}>
            <Icon size={18} />
            {tab.label}
          </button>;
        })}
      </div>
    </nav>
  </main>;
}
