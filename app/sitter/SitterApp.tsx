'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight, ChevronDown, CookingPot, Footprints, House, MapPin, Moon, PawPrint, Phone, Soup, Sun, Sunrise, Sunset } from 'lucide-react';
import SitterAi from './SitterAi';
import { rich } from './rich';
import {
  contactGroups,
  contactsFooter,
  crateSections,
  daycare,
  feedingExtras,
  feedingNote,
  homeSections,
  meals,
  quickReference,
  tripWindow,
  walkSections,
  welcome,
  type Contact,
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

const headings: Record<NavKey, ReactNode> = {
  home: <>For <em>Flynn.</em></>,
  feeding: <>Feeding.</>,
  walks: <>Walks &amp; <em>training.</em></>,
  crate: <>The <em>crate.</em></>,
  contacts: <>Contacts.</>,
};

const mealIcons = { am: Sunrise, mid: Sun, pm: Sunset };
const sectionIcons: Record<string, typeof House> = { snuffle: CookingPot };

const mapsUrl = (address: string) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);

function SectionCard({ section }: { section: Section }) {
  const Icon = sectionIcons[section.id];
  return <section className="sitter-card">
    <h2>{Icon && <Icon size={17} />}{section.title}</h2>
    {section.lines.map((line, index) => <p key={index}>{rich(line)}</p>)}
  </section>;
}

function ContactCard({ contact }: { contact: Contact }) {
  const tel = 'tel:' + contact.phone.replace(/\D/g, '');
  return <div className="sitter-contact">
    <div className="sitter-contact-copy">
      <b>{contact.name}</b>
      <span>{contact.note}</span>
      <a className="sitter-contact-num" href={tel}>{contact.phone}</a>
      {contact.address && <a className="sitter-contact-map" href={mapsUrl(contact.address)} target="_blank" rel="noopener noreferrer">
        <MapPin size={12} />{contact.address}
      </a>}
    </div>
    <a className="sitter-contact-call" href={tel} aria-label={'Call ' + contact.name}><Phone size={18} /></a>
  </div>;
}

export default function SitterApp({ supabase, passphrase, signedInAs }: { supabase: SupabaseClient; passphrase: string; signedInAs?: string }) {
  const [view, setView] = useState<NavKey>('home');
  const [closedMeals, setClosedMeals] = useState<string[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
  }, []);

  // Safari ignores user-scalable=no, so block its pinch gestures directly.
  useEffect(() => {
    const stop = (event: Event) => event.preventDefault();
    const events = ['gesturestart', 'gesturechange', 'gestureend'];
    events.forEach((name) => document.addEventListener(name, stop, { passive: false }));
    return () => events.forEach((name) => document.removeEventListener(name, stop));
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
        <span className="sitter-mark" aria-hidden="true"><PawPrint size={18} /></span>
        <span className="sitter-bar-copy">
          <small>For Flynn</small>
          <strong>Bengt &amp; Chloe</strong>
        </span>
      </header>

      <div className="sitter-page-head">
        <h1>{headings[view]}</h1>
        {view === 'home' && <p className="sitter-subhead">A guide to Bengt and Chloe.</p>}
        {view === 'feeding' && <p>{rich(feedingNote)}</p>}
      </div>

      {view === 'home' && <>
        <section className="sitter-card sitter-welcome">
          {signedInAs && <p className="sitter-hello">Hi {signedInAs}.</p>}
          {welcome.map((line, index) => <p key={index}>{rich(line)}</p>)}
          <span className="sitter-dates">{tripWindow.label}</span>
        </section>

        <section className="sitter-card">
          <h2>Quick reference</h2>
          <dl className="sitter-qr">
            {quickReference.map((row) => <div className="sitter-qr-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.blank ? <span className="sitter-writein" /> : rich(row.value)}</dd>
            </div>)}
          </dl>
        </section>

        {homeSections.map((section) => <SectionCard key={section.id} section={section} />)}

        <SitterAi supabase={supabase} passphrase={passphrase} />
      </>}

      {view === 'feeding' && <>
        {meals.map((meal) => {
          const Icon = mealIcons[meal.tone];
          const open = !closedMeals.includes(meal.id);
          return <article className="sitter-meal" data-tone={meal.tone} key={meal.id}>
            <button
              type="button"
              className="sitter-meal-head"
              aria-expanded={open}
              onClick={() => setClosedMeals((current) => open ? [...current, meal.id] : current.filter((id) => id !== meal.id))}
            >
              <span className="sitter-meal-icon" aria-hidden="true"><Icon size={17} /></span>
              <h2>{meal.label}</h2>
              <ChevronDown className="sitter-meal-chevron" size={19} aria-hidden="true" />
            </button>
            <div className="sitter-meal-body" hidden={!open}>
              {meal.before.map((step, index) => <p className="sitter-step" key={'b' + index}><ArrowRight size={15} />{rich(step)}</p>)}
              {meal.bowls.map((bowl) => <div className="sitter-bowl" key={bowl.dog}>
                <div className="sitter-bowl-dog"><b>{bowl.dog}</b><i>{bowl.amount}</i></div>
                <ul>{bowl.adds.map((add) => <li key={add} className={add.includes('allergy') ? 'flag' : undefined}>{add}</li>)}</ul>
              </div>)}
              {meal.after.map((step, index) => <p className="sitter-step" key={'a' + index}><ArrowRight size={15} />{rich(step)}</p>)}
            </div>
          </article>;
        })}

        {feedingExtras.map((section) => <SectionCard key={section.id} section={section} />)}
      </>}

      {view === 'walks' && walkSections.map((section) => <SectionCard key={section.id} section={section} />)}

      {view === 'crate' && crateSections.map((section) => <SectionCard key={section.id} section={section} />)}

      {view === 'contacts' && <>
        {contactGroups.map((group) => <div key={group.id}>
          <p className="sitter-group-title">{group.title}</p>
          {group.contacts.map((contact) => <ContactCard key={contact.name + contact.phone} contact={contact} />)}
        </div>)}
        <p className="sitter-group-title">Daycare</p>
        <ContactCard contact={daycare} />
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
