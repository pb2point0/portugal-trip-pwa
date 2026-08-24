'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RotateCcw, Send, Sparkles, UserRound } from 'lucide-react';
import './portugal-ai.css';

const quickQuestions = [
  'What should we double-check before PR1?',
  'Help us compare train and bus options for the Porto leg.',
  'Suggest a relaxed rainy-day plan in Madeira.',
];

const chatStorageKey='portugal-ai-chat-v2';
type ChatMessage = { id:string; role:'user'|'assistant'; content:string };
type AiResponse = { answer?: string; error?: string };
const messageId=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():Date.now()+'-'+Math.random();

export default function PortugalAi({ supabase }: { supabase: SupabaseClient }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('');
  const [asking, setAsking] = useState(false);
  const endRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    try {
      const saved=sessionStorage.getItem(chatStorageKey);
      if(!saved) return;
      const parsed=JSON.parse(saved) as ChatMessage[];
      if(Array.isArray(parsed)) queueMicrotask(()=>setMessages(parsed.filter((item)=>item&&(['user','assistant'] as string[]).includes(item.role)&&typeof item.content==='string').slice(-12)));
    } catch {}
  },[]);

  useEffect(()=>{
    sessionStorage.setItem(chatStorageKey,JSON.stringify(messages.slice(-12)));
    endRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});
  },[messages,asking]);

  async function ask(event?: FormEvent, suggestedQuestion?:string) {
    event?.preventDefault();
    const cleanQuestion=(suggestedQuestion??question).trim();
    if (!cleanQuestion || asking) return;
    const userMessage:ChatMessage={id:messageId(),role:'user',content:cleanQuestion};
    setMessages((current)=>[...current,userMessage]);
    setQuestion('');
    setAsking(true);
    setStatus('');

    const { data, error } = await supabase.functions.invoke<AiResponse>('portugal-ai', {body:{question:cleanQuestion}});
    if (error || !data?.answer) setStatus(data?.error || error?.message || 'The assistant could not answer right now.');
    else setMessages((current)=>[...current,{id:messageId(),role:'assistant',content:data.answer!}]);
    setAsking(false);
  }

  function resetChat(){
    setMessages([]);
    setQuestion('');
    setStatus('');
    sessionStorage.removeItem(chatStorageKey);
  }

  function handleKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
    if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void ask();}
  }

  return <section className="portugal-ai" id="portugal-ai">
    <header className="ai-header">
      <div className="ai-intro"><span className="ai-mark"><Sparkles size={20}/></span><div><p className="kicker">Trip assistant</p><h2>Ask about the trip.</h2><p>Questions stay together here. Include enough context in each follow-up for now.</p></div></div>
      {messages.length>0&&<button className="ai-reset" type="button" onClick={resetChat}><RotateCcw size={14}/>New chat</button>}
    </header>
    <div className="ai-conversation" aria-live="polite">
      {messages.length===0&&<div className="ai-empty"><strong>Start with a question.</strong><span>This chat stays in this browser tab. Only the current question is sent; trip data is not added automatically.</span></div>}
      {messages.map((item)=><article key={item.id} className={'ai-message '+item.role}><span className="ai-avatar">{item.role==='assistant'?<Sparkles size={15}/>:<UserRound size={15}/>}</span><div><small>{item.role==='assistant'?'Trip assistant':'You'}</small><p>{item.content}</p></div></article>)}
      {asking&&<article className="ai-message assistant typing"><span className="ai-avatar"><Sparkles size={15}/></span><div><small>Trip assistant</small><p><i/><i/><i/></p></div></article>}
      <div ref={endRef}/>
    </div>
    {messages.length===0&&<div className="ai-prompts" aria-label="Suggested questions">{quickQuestions.map((prompt)=><button key={prompt} type="button" onClick={()=>void ask(undefined,prompt)}>{prompt}</button>)}</div>}
    <form className="ai-composer" onSubmit={(event)=>void ask(event)}>
      <label className="sr-only" htmlFor="portugal-ai-question">Message the trip assistant</label>
      <textarea id="portugal-ai-question" value={question} onChange={(event)=>setQuestion(event.target.value)} onKeyDown={handleKeyDown} maxLength={800} rows={2} placeholder={messages.length?'Ask a follow-up…':'Ask about Portugal, bookings, transport, food, or plans…'}/>
      <button type="submit" disabled={asking||!question.trim()} aria-label="Send message"><Send size={18}/></button>
    </form>
    <div className="ai-meta"><span>{question.length}/800</span><span>Verify live schedules, reservations, weather, roads, and trails.</span></div>
    {status&&<p className="ai-status" role="status">{status}</p>}
  </section>;
}
