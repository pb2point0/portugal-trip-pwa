'use client';

import { FormEvent, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Send, Sparkles } from 'lucide-react';
import './portugal-ai.css';

const quickQuestions = [
  'Make a compact packing checklist for Portugal.',
  'Suggest a relaxed rainy-day plan in Portugal.',
  'Translate “We are traveling together” into European Portuguese.',
];

type AiResponse = { answer?: string; error?: string };

export default function PortugalAi({ supabase }: { supabase: SupabaseClient }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [asking, setAsking] = useState(false);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || asking) return;

    setAsking(true);
    setAnswer('');
    setMessage('Asking your private AI…');
    const { data, error } = await supabase.functions.invoke<AiResponse>('portugal-ai', {
      body: { question: cleanQuestion },
    });

    if (error || !data?.answer) setMessage(data?.error || error?.message || 'The assistant could not answer right now.');
    else {
      setAnswer(data.answer);
      setMessage('');
    }
    setAsking(false);
  }

  return (
    <section className="portugal-ai" id="portugal-ai">
      <div className="ai-intro">
        <span className="ai-mark"><Sparkles size={21}/></span>
        <div>
          <p className="kicker">Authenticated Portugal AI</p>
          <h2>Ask away.</h2>
          <p>Only the question you type is sent to OpenAI. Your Supabase itinerary stays private.</p>
        </div>
      </div>

      <div className="ai-prompts" aria-label="Suggested questions">
        {quickQuestions.map((prompt) => <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>{prompt}</button>)}
      </div>

      <form onSubmit={(event) => void ask(event)}>
        <label htmlFor="portugal-ai-question">What do you want to know?</label>
        <div className="ai-input">
          <textarea
            id="portugal-ai-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={800}
            placeholder="Ask about Portugal, packing, language, food, or planning…"
          />
          <button type="submit" disabled={asking || !question.trim()} aria-label="Ask Portugal AI">
            <Send size={18}/><span>{asking ? 'Thinking…' : 'Ask'}</span>
          </button>
        </div>
        <small>{question.length}/800 · AI can be wrong—verify reservations, opening hours, weather, roads, and trails.</small>
      </form>

      {message && <p className="ai-status" role="status">{message}</p>}
      {answer && <div className="ai-answer" aria-live="polite"><Sparkles size={18}/><p>{answer}</p></div>}
    </section>
  );
}
