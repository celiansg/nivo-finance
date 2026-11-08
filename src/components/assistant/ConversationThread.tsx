import { useEffect, useRef, useState } from 'react';
import { FinanceInsightCard } from './FinanceInsightCard';
import type { ConversationMessage, InsightProps } from './types';
import { Icon } from '../ui';

export function ConversationThread({ messages, insights, money, currency }: InsightProps & { messages: ConversationMessage[] }) {
  const threadRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  useEffect(() => {
    const thread = threadRef.current;
    if (thread && atBottom) thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }, [messages, atBottom]);
  function handleScroll() {
    const thread = threadRef.current;
    if (!thread) return;
    setAtBottom(thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40);
  }
  return <div className="assistant-thread-wrap"><div className="assistant-thread" ref={threadRef} onScroll={handleScroll} aria-live="polite">{messages.map((message) => <article className={`assistant-message ${message.role}`} key={message.id}><div className="assistant-message-avatar" aria-hidden="true">{message.role === 'assistant' ? <Icon name="Sparkles" size={15} /> : <span>Vous</span>}</div><div className="assistant-message-body"><div className="assistant-message-meta"><strong>{message.role === 'assistant' ? 'Nivo' : 'Vous'}</strong><time>{message.role === 'assistant' ? (message.mode === 'ai' ? 'Assistant Nivo' : 'Calcul local') : 'À l’instant'}</time></div><div className="assistant-message-text">{message.text}</div>{message.role === 'assistant' && <button type="button" className="assistant-copy-button" onClick={() => { void navigator.clipboard?.writeText(message.text); setCopiedId(message.id); window.setTimeout(() => setCopiedId((current) => current === message.id ? null : current), 1400); }}><Icon name={copiedId === message.id ? 'CircleCheck' : 'Copy'} size={13} /> {copiedId === message.id ? 'Copié' : 'Copier'}</button>}{message.insightKind && <FinanceInsightCard kind={message.insightKind} insights={insights} money={money} currency={currency} />}{message.sources && <div className="assistant-sources"><Icon name="ShieldCheck" size={13} /> Sources : {message.sources.join(' · ')}</div>}</div></article>)}</div>{!atBottom && <button className="assistant-back-bottom" type="button" onClick={() => { const thread = threadRef.current; thread?.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' }); setAtBottom(true); }}><Icon name="ChevronDown" size={15} /> Revenir en bas</button>}</div>;
}
