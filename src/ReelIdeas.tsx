import { useState } from 'react';
import { SheetInput } from './SheetInput';
import { StarRating } from './StarRating';
import type { ReelIdea, ReelIdeaPatch } from './types';
import { useReelIdeas } from './useReelIdeas';

export function ReelIdeas() {
  const { ideas, loading, error, addIdea, updateIdea, removeIdea } = useReelIdeas();

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

      {error && <p className="error-banner" role="status">{error}</p>}

      {loading ? (
        <p className="empty-state">Loading reel ideas…</p>
      ) : ideas.length === 0 ? (
        <p className="empty-state">
          No reel ideas yet. Use <strong>Add idea</strong> to start the list.
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="reel-table">
            <caption className="visually-hidden">Reel ideas with author, link, description and rating</caption>
            <thead>
              <tr>
                <th scope="col" className="col-name">Name</th>
                <th scope="col" className="col-link">Reel Link</th>
                <th scope="col" className="col-description">Description</th>
                <th scope="col" className="col-rating">Rating</th>
                <th scope="col" className="col-actions">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea, index) => (
                <ReelRow
                  key={idea.id}
                  idea={idea}
                  index={index}
                  onUpdate={(patch) => updateIdea(idea.id, patch)}
                  onRemove={() => removeIdea(idea.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface ReelRowProps {
  idea: ReelIdea;
  index: number;
  onUpdate: (patch: ReelIdeaPatch) => void;
  onRemove: () => void;
}

function ReelRow({ idea, index, onUpdate, onRemove }: ReelRowProps) {
  const [confirming, setConfirming] = useState(false);
  const rowName = idea.author || idea.description || `row ${index + 1}`;

  return (
    <tr>
      <td className="col-name" data-label="Name">
        <SheetInput
          value={idea.author}
          onCommit={(author) => onUpdate({ author })}
          ariaLabel={`Name for ${rowName}`}
          placeholder="Who's idea?"
        />
      </td>
      <td className="col-link" data-label="Reel Link">
        <div className="link-cell">
          <SheetInput
            value={idea.url}
            onCommit={(url) => onUpdate({ url })}
            ariaLabel={`Reel link for ${rowName}`}
            placeholder="https://…"
            type="url"
          />
          {idea.url && (
            <a
              className="open-link"
              href={idea.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open reel link for ${rowName} in a new tab`}
            >
              Open
            </a>
          )}
        </div>
      </td>
      <td className="col-description" data-label="Description">
        <SheetInput
          value={idea.description}
          onCommit={(description) => onUpdate({ description })}
          ariaLabel={`Description for ${rowName}`}
          placeholder="What's the idea?"
          multiline
        />
      </td>
      <td className="col-rating" data-label="Rating">
        <StarRating
          value={idea.rating}
          onChange={(rating) => onUpdate({ rating })}
          label={`Rating for ${rowName}`}
        />
      </td>
      <td className="col-actions" data-label="">
        {confirming ? (
          <span className="row-confirm">
            <button type="button" className="row-delete-confirm" onClick={onRemove}>
              Delete
            </button>
            <button type="button" className="row-delete-cancel" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="row-delete"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${rowName}`}
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </td>
    </tr>
  );
}
