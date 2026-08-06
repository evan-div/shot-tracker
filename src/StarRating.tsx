interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

const STARS = [1, 2, 3, 4, 5];

/**
 * Radio-group star picker. Clicking the current rating clears it back to
 * unrated, which is the usual escape hatch for a "you can't unpick" control.
 */
export function StarRating({ value, onChange, label }: StarRatingProps) {
  return (
    <div className="star-rating" role="radiogroup" aria-label={label}>
      {STARS.map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            className={`star${filled ? ' filled' : ''}`}
            onClick={() => onChange(star === value ? 0 : star)}
          >
            <span aria-hidden="true">{filled ? '★' : '☆'}</span>
          </button>
        );
      })}
      <span className="visually-hidden">
        {value === 0 ? 'Not rated' : `Rated ${value} out of 5`}
      </span>
    </div>
  );
}
