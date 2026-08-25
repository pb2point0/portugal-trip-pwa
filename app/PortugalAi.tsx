'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RotateCcw, Send } from 'lucide-react';
import './portugal-ai.css';

type TripPhase='before'|'during'|'after';

const suggestionBanks: Record<string,(place:string)=>string[]> = {
  porto:(place)=>[
    `What is worth doing near ${place} if we have two relaxed hours?`,
    `Give us a rainy-day backup around ${place}.`,
    `Best cellar or tasting near ${place} tonight?`,
  ],
  funchal:(place)=>[
    `What is worth doing near ${place} if we have two relaxed hours?`,
    `Give us a rainy-day backup around ${place}.`,
    `Where should we eat seafood near ${place}?`,
  ],
  'ponta do sol':(place)=>[
    `What's a good slow morning near ${place}?`,
    `Give us a rainy-day backup around ${place}.`,
    `Best sunset spot near ${place} tonight?`,
  ],
  setúbal:()=>[
    'What is worth doing near Setúbal if we have two relaxed hours?',
    'Give us a rainy-day backup around Setúbal.',
    'Quick local food recommendation near Setúbal?',
  ],
};
const beforeTripQuestions=[
  'What should we pack for this time of year in Portugal?',
  'Any must-book restaurants before we land?',
  'What’s the fastest way from the airport to our first stop?',
];
const afterTripQuestions=[
  'Recap: what were the trip’s highlights?',
  'What should we remember for next time?',
  'Any lingering to-dos from the trip?',
];

function quickQuestions(base:string,tripPhase:TripPhase){
  const place=base.trim()||'Portugal';
  if (tripPhase==='before') return beforeTripQuestions;
  if (tripPhase==='after') return afterTripQuestions;
  const bank=Object.entries(suggestionBanks).find(([key])=>place.toLowerCase().includes(key));
  if (bank) return bank[1](place);
  return [
    `What is worth doing near ${place} if we have two relaxed hours?`,
    `Give us a rainy-day backup around ${place}.`,
    `What should we eat or drink around ${place}?`,
  ];
}

const chatStorageKey='portugal-ai-chat-v2';
type ChatMessage={id:string;role:'user'|'assistant';content:string};
type AiResponse={answer?:string;error?:string};
const messageId=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():Date.now()+'-'+Math.random();

export default function PortugalAi({supabase,base,tripPhase}:{supabase:SupabaseClient;base:string;tripPhase:TripPhase}){
  const [question,setQuestion]=useState('');
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [status,setStatus]=useState('');
  const [asking,setAsking]=useState(false);
  const endRef=useRef<HTMLDivElement>(null);
  const suggestions=quickQuestions(base,tripPhase);

  useEffect(()=>{
    try{
      const saved=sessionStorage.getItem(chatStorageKey);
      if(!saved)return;
      const parsed=JSON.parse(saved) as ChatMessage[];
      if(Array.isArray(parsed))queueMicrotask(()=>setMessages(parsed.filter((item)=>item&&(['user','assistant'] as string[]).includes(item.role)&&typeof item.content==='string').slice(-12)));
    }catch{}
  },[]);

  useEffect(()=>{
    sessionStorage.setItem(chatStorageKey,JSON.stringify(messages.slice(-12)));
    endRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});
  },[messages,asking]);

  async function ask(event?:FormEvent,suggestedQuestion?:string){
    event?.preventDefault();
    const cleanQuestion=(suggestedQuestion??question).trim();
    if(!cleanQuestion||asking)return;
    const history=messages.slice(-8).map(({role,content})=>({role,content}));
    const userMessage:ChatMessage={id:messageId(),role:'user',content:cleanQuestion};
    setMessages((current)=>[...current,userMessage]);
    setQuestion('');
    setAsking(true);
    setStatus('');

    const{data,error}=await supabase.functions.invoke<AiResponse>('portugal-ai',{body:{question:cleanQuestion,history}});
    if(error||!data?.answer)setStatus(data?.error||error?.message||'The assistant could not answer right now.');
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
      <p className="kicker">Honeymoon copilot</p>
      {messages.length>0&&<button className="ai-reset" type="button" onClick={resetChat}><RotateCcw size={14}/>New chat</button>}
    </header>

    {messages.length===0&&<div className="ai-prompts" aria-label={'Suggested questions for '+base}>{suggestions.map((prompt)=><button key={prompt} type="button" onClick={()=>void ask(undefined,prompt)}>{prompt}</button>)}</div>}

    {messages.length>0&&<div className="ai-conversation" aria-live="polite">
      {messages.map((item)=><article key={item.id} className={'ai-message '+item.role}><small>{item.role==='assistant'?'Trip assistant':'You'}</small><p>{item.content}</p></article>)}
      {asking&&<article className="ai-message assistant typing"><small>Trip assistant</small><p><i/><i/><i/></p></article>}
      <div ref={endRef}/>
    </div>}

    <form className="ai-composer" onSubmit={(event)=>void ask(event)}>
      <label className="sr-only" htmlFor="portugal-ai-question">{messages.length?'Ask a follow-up':'Message the trip assistant'}</label>
      <textarea id="portugal-ai-question" value={question} onChange={(event)=>setQuestion(event.target.value)} onKeyDown={handleKeyDown} maxLength={800} rows={2} placeholder={messages.length?'Ask a follow-up…':`Ask about ${base}, food, transport, weather backups, or plans…`}/>
      <button type="submit" disabled={asking||!question.trim()} aria-label="Send message"><Send size={18}/></button>
    </form>
    <div className="ai-meta"><span>{question.length}/800</span><span>Verify live schedules, reservations, weather, roads, and trails.</span></div>
    {status&&<p className="ai-status" role="status">{status}</p>}
  </section>;
}
