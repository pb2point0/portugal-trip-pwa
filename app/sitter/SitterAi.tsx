'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RotateCcw, Send } from 'lucide-react';
import { rich } from './rich';
import '../portugal-ai.css';

const chatStorageKey = 'sitter-ai-chat-v1';
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
type AiResponse = { answer?: string; error?: string };
const messageId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now() + '-' + Math.random());

export default function SitterAi({ supabase, passphrase }: { supabase: SupabaseClient; passphrase: string }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('');
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(chatStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as ChatMessage[];
      if (Array.isArray(parsed)) queueMicrotask(() => setMessages(parsed.filter((item) => item && (['user', 'assistant'] as string[]).includes(item.role) && typeof item.content === 'string').slice(-12)));
    } catch {}
  }, []);

  useEffect(() => {
    sessionStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-12)));
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, asking]);

  async function ask(event?: FormEvent, suggestedQuestion?: string) {
    event?.preventDefault();
    const cleanQuestion = (suggestedQuestion ?? question).trim();
    if (!cleanQuestion || asking) return;
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    const userMessage: ChatMessage = { id: messageId(), role: 'user', content: cleanQuestion };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setAsking(true);
    setStatus('');

    const { data, error } = await supabase.functions.invoke<AiResponse>('sitter-ai', { body: { action: 'ask', passphrase, question: cleanQuestion, history } });
    if (error || !data?.answer) setStatus(data?.error || error?.message || 'The assistant could not answer right now.');
    else setMessages((current) => [...current, { id: messageId(), role: 'assistant', content: data.answer! }]);
    setAsking(false);
  }

  function resetChat() {
    setMessages([]);
    setQuestion('');
    setStatus('');
    sessionStorage.removeItem(chatStorageKey);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void ask();
    }
  }

  return <section className="portugal-ai" id="sitter-ai">
    <header className="ai-header">
      <p className="kicker">Ask anything</p>
      {messages.length > 0 && <button className="ai-reset" type="button" onClick={resetChat}><RotateCcw size={14} />New chat</button>}
    </header>

    {messages.length === 0 && <p className="ai-intro">Answers from the guide, and from the internet if the guide does not cover it.</p>}

    {messages.length > 0 && <div className="ai-conversation" aria-live="polite">
      {messages.map((item) => <article key={item.id} className={'ai-message ' + item.role}><small>{item.role === 'assistant' ? 'Guide assistant' : 'You'}</small><p>{item.role === 'assistant' ? rich(item.content) : item.content}</p></article>)}
      {asking && <article className="ai-message assistant typing"><small>Guide assistant</small><p><i /><i /><i /></p></article>}
      <div ref={endRef} />
    </div>}

    <form className="ai-composer" onSubmit={(event) => void ask(event)}>
      <label className="sr-only" htmlFor="sitter-ai-question">{messages.length ? 'Ask a follow-up' : 'Message the guide assistant'}</label>
      <textarea id="sitter-ai-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} maxLength={800} rows={2} placeholder={messages.length ? 'Ask a follow-up…' : 'Ask about anything at all…'} />
      <button type="submit" disabled={asking || !question.trim()} aria-label="Send message"><Send size={18} /></button>
    </form>
    <div className="ai-meta"><span>{question.length}/800</span><span>Call or WhatsApp us for anything urgent.</span></div>
    {status && <p className="ai-status" role="status">{status}</p>}
  </section>;
}
