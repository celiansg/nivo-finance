import { useEffect, useRef } from 'react';
import { Icon } from '../ui';

export function ChatComposer({ value, onChange, onSubmit, onAttach, disabled, thinking, attachmentName }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: (file: File) => void;
  disabled?: boolean;
  thinking?: boolean;
  attachmentName?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [value]);
  function submitOnKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }
  return (
    <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      {attachmentName && <div className="assistant-attachment"><Icon name="Upload" size={14} /> <span>{attachmentName}</span></div>}
      <div className="assistant-composer-row">
        <button type="button" className="assistant-composer-action" aria-label="Joindre une capture bancaire" onClick={() => fileRef.current?.click()} disabled={disabled}>
          <Icon name="Plus" size={19} />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={submitOnKeyDown}
          placeholder="Posez une question sur vos finances…"
          aria-label="Question pour Nivo"
          disabled={disabled}
        />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onAttach(file); event.currentTarget.value = ''; }} />
        <button type="submit" className="assistant-send" aria-label={thinking ? 'Analyse en cours' : 'Envoyer'} disabled={disabled || !value.trim()}>
          {thinking ? <span className="assistant-send-dots" aria-hidden="true"><i /><i /><i /></span> : <Icon name="ArrowUp" size={18} />}
        </button>
      </div>
      <div className="assistant-composer-footer"><span><Icon name="CornerDownLeft" size={13} /> Entrée pour envoyer · Maj + Entrée pour aller à la ligne</span><span>Vos données restent dans Nivo</span></div>
    </form>
  );
}
