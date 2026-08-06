import { AFFILIATES, SHOT_TYPES } from './config';
import { ShotCell } from './ShotCell';
import { cellKey } from './types';
import { useShotState } from './useShotState';

export function ShotTracker() {
  const { state, loading, error, assignShot, clearShot } = useShotState();

  const total = AFFILIATES.length * SHOT_TYPES.length;
  const completed = Object.keys(state).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section aria-label="Shot tracker">
      <div className="progress" aria-label="Progress summary">
        <div className="progress-stats">
          <span className="progress-count">
            <strong>{completed}</strong> / {total} shots
          </span>
          <span className="progress-percent">{percent}% complete</span>
        </div>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent} percent of shots completed`}
        >
          <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {error && <p className="error-banner" role="status">{error}</p>}
      {loading && <p className="empty-state">Loading checklist…</p>}

      <div className="table-wrapper">
        <table className="shot-table">
          <caption className="visually-hidden">
            Shot checklist by affiliate and shot type
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky-col header-affiliate">
                Affiliate
              </th>
              {SHOT_TYPES.map((shot) => (
                <th scope="col" key={shot.id}>
                  {shot.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AFFILIATES.map((affiliate) => (
              <tr key={affiliate.id}>
                <th scope="row" className="sticky-col affiliate-name">
                  {affiliate.name}
                </th>
                {SHOT_TYPES.map((shot) => (
                  <td key={shot.id}>
                    <ShotCell
                      affiliateName={affiliate.name}
                      shotTypeName={shot.name}
                      assignment={state[cellKey(affiliate.id, shot.id)]}
                      onAssign={(photographerId) =>
                        assignShot(affiliate.id, shot.id, photographerId)
                      }
                      onClear={() => clearShot(affiliate.id, shot.id)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
