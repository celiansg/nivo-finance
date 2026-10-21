import { Icon } from '../ui';

export type Suggestion = {
  label: string;
  detail: string;
  icon: string;
};

export function SuggestionChips({ suggestions, onSelect }: { suggestions: Suggestion[]; onSelect: (value: string) => void }) {
  return (
    <div className="assistant-suggestions" aria-label="Suggestions de questions">
      {suggestions.map((suggestion) => (
        <button className="assistant-suggestion" key={suggestion.label} type="button" onClick={() => onSelect(suggestion.label)}>
          <span className="assistant-suggestion-icon"><Icon name={suggestion.icon} size={17} /></span>
          <span><strong>{suggestion.label}</strong><small>{suggestion.detail}</small></span>
          <Icon name="ArrowUpRight" size={15} />
        </button>
      ))}
    </div>
  );
}
