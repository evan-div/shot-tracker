import { useEffect, useState } from 'react';
import { isSafeHttpUrl, linkLabel, relativeTime } from './relativeTime';
import { SheetInput } from './SheetInput';
import { StarRating } from './StarRating';
import type { ReelIdea, ReelIdeaPatch } from './types';
import { useReelIdeas } from './useReelIdeas';

/** A card with nothing filled in yet opens straight into edit mode. */
function isBlank(idea: ReelIdea): boolean {
  return !idea.author && !idea.url && !idea.description;
}

export function ReelIdeas() {
  const { ideas, loading, error, addIdea, updateIdea, removeIdea } = useReelIdeas();

  // One timer for the whole list keeps the "added 3m ago" labels honest on a
  // tab that stays open all day.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section aria-label="Reel ideas">
      <div className="sheet-summary">
        <span className="sheet-count">
          <strong>{ideas.length}</strong> {ideas.length === 1 ? 'idea' : 'ideas'}
        </span>
        <button type="button" className="add-row-button" onClick={() => addIdea()}>
          + Add idea
        </button>
      </div>

      {error && (
        <p className="error-banner" role="status">
          {error}
        </p>
      )}

      {loading ? (
        <p className="empty-state">Loading reel ideas…</p>
      ) : ideas.length === 0 ? (
        <p className="empty-state">
          No reel ideas yet. Use <strong>Add idea</strong> to start the list.
        </p>
      ) : (
        <ul className="reel-cards">
          {ideas.map((idea, index) => (
            <li key={idea.id}>
              <ReelCard
                idea={idea}
                index={index}
                now={now}
                onUpdate={(patch) => updateIdea(idea.id, patch)}
                onRemove={() => removeIdea(idea.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ReelCardProps {
  idea: ReelIdea;
  index: number;
  now: number;
  onUpdate: (patch: ReelIdeaPatch) => void;
  onRemove: () => void;
}

function ReelCard({ idea, index, now, onUpdate, onRemove }: ReelCardProps) {
  const [editing, setEditing] = useState(() => isBlank(idea));
  const [confirming, setConfirming] = useState(false);
  const label = idea.author || idea.description || `idea ${index + 1}`;

  if (editing) {
    return (
      <article className="reel-card editing" aria-label={`Editing ${label}`}>
        <div className="reel-field">
          <label className="reel-label" htmlFor={`author-${idea.id}`}>
            Name
          </label>
          <SheetInput
            id={`author-${idea.id}`}
            value={idea.author}
            onCommit={(author) => onUpdate({ author })}
            ariaLabel={`Name for ${label}`}
            placeholder="Who's idea?"
          />
        </div>

        <div className="reel-field">
          <label className="reel-label" htmlFor={`url-${idea.id}`}>
            Reel link
          </label>
          <SheetInput
            id={`url-${idea.id}`}
            value={idea.url}
            onCommit={(url) => onUpdate({ url })}
            ariaLabel={`Reel link for ${label}`}
            placeholder="https://…"
            type="url"
          />
        </div>

        <div className="reel-field">
          <label className="reel-label" htmlFor={`description-${idea.id}`}>
            Description
          </label>
          <SheetInput
            id={`description-${idea.id}`}
            value={idea.description}
            onCommit={(description) => onUpdate({ description })}
            ariaLabel={`Description for ${label}`}
            placeholder="What's the idea?"
            multiline
          />
        </div>

        <div className="reel-field">
          <span className="reel-label">Rating</span>
          <StarRating
            value={idea.rating}
            onChange={(rating) => onUpdate({ rating })}
            label={`Rating for ${label}`}
          />
        </div>

        <div className="reel-edit-actions">
          <button type="button" className="reel-done" onClick={() => setEditing(false)}>
            Done
          </button>
          <button type="button" className="reel-delete-text" onClick={onRemove}>
            Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="reel-card" aria-label={`Reel idea from ${label}`}>
      <header className="reel-card-header">
        <div>
          <h3 className="reel-author">{idea.author || 'Unnamed'}</h3>
          <p className="reel-added">added {relativeTime(idea.createdAt, now)}</p>
        </div>
        {idea.rating > 0 && (
          <p className="reel-rating" aria-label={`Rated ${idea.rating} out of 5`}>
            <span aria-hidden="true">{'★'.repeat(idea.rating)}</span>
          </p>
        )}
      </header>

      {idea.description && (
        <blockquote className="reel-quote">
          <p>{idea.description}</p>
        </blockquote>
      )}

      {isSafeHttpUrl(idea.url) && (
        <a
          className="reel-open"
          href={idea.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${linkLabel(idea.url)} — ${label}`}
        >
          {linkLabel(idea.url)}
        </a>
      )}

      <div className="reel-card-actions">
        <button type="button" className="reel-edit" onClick={() => setEditing(true)}>
          Edit
        </button>
        {confirming ? (
          <span className="row-confirm">
            <button type="button" className="row-delete-confirm" onClick={onRemove}>
              Delete
            </button>
            <button
              type="button"
              className="row-delete-cancel"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="reel-delete-text"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${label}`}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
