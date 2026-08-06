import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PHOTOGRAPHERS } from './config';
import type { ShotAssignment } from './types';

const POPOVER_WIDTH = 210;
const POPOVER_MARGIN = 8;

/**
 * Popovers live inside a horizontally scrolling container, so they are
 * positioned with `position: fixed` against the trigger's viewport rect to
 * avoid being clipped. Flips above the trigger when there is no room below.
 */
function usePopoverPosition(
  anchor: React.RefObject<HTMLElement | null>,
  open: boolean,
  contentHeight: number
) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const update = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const top =
      below < contentHeight + POPOVER_MARGIN && rect.top > contentHeight
        ? rect.top - contentHeight - 6
        : rect.bottom + 6;
    const rawLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    const left = Math.max(
      POPOVER_MARGIN,
      Math.min(rawLeft, window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN)
    );
    setPos({ top, left });
  }, [anchor, contentHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return pos;
}

interface ShotCellProps {
  affiliateName: string;
  shotTypeName: string;
  assignment: ShotAssignment | undefined;
  onAssign: (photographerId: string) => void;
  onClear: () => void;
}

export function ShotCell({
  affiliateName,
  shotTypeName,
  assignment,
  onAssign,
  onClear,
}: ShotCellProps) {
  const [open, setOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Roughly the rendered popover height; only used to decide flip direction.
  const estimatedHeight = confirmingClear ? 190 : assignment ? 260 : 210;
  const pos = usePopoverPosition(buttonRef, open, estimatedHeight);

  useEffect(() => {
    if (!open) return;
    // Move focus into the popover so keyboard users land on the first choice.
    popoverRef.current?.querySelector('button')?.focus();
  }, [open, confirmingClear]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmingClear(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setConfirmingClear(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const label = `${shotTypeName} for ${affiliateName}${
    assignment ? `, completed by ${assignment.photographerId}` : ', not completed'
  }`;

  const handleSelect = (photographerId: string) => {
    onAssign(photographerId);
    setOpen(false);
    setConfirmingClear(false);
  };

  const handleClearRequest = () => {
    setConfirmingClear(true);
  };

  const handleClearConfirm = () => {
    onClear();
    setOpen(false);
    setConfirmingClear(false);
  };

  return (
    <div className="shot-cell" ref={cellRef}>
      <button
        type="button"
        ref={buttonRef}
        className={`shot-cell-button${assignment ? ` assigned assigned-${assignment.photographerId}` : ''}`}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        {assignment ? (
          <span className="shot-cell-check">
            <span className="check-icon" aria-hidden="true">
              ✅
            </span>
            <span className="check-name">{capitalize(assignment.photographerId)}</span>
          </span>
        ) : (
          <span className="empty-box" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          className="popover"
          ref={popoverRef}
          role="dialog"
          aria-label={`Assign photographer for ${label}`}
          style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
        >
          {!confirmingClear ? (
            <>
              <p className="popover-title">
                {assignment ? 'Change photographer' : 'Who captured this shot?'}
              </p>
              <div className="popover-options">
                {PHOTOGRAPHERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`popover-option option-${p.id}`}
                    onClick={() => handleSelect(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {assignment && (
                <button type="button" className="popover-clear" onClick={handleClearRequest}>
                  Mark as incomplete
                </button>
              )}
            </>
          ) : (
            <div className="popover-confirm">
              <p className="popover-title">Clear this assignment?</p>
              <p className="popover-confirm-text">
                {capitalize(assignment!.photographerId)} will be removed from this shot.
              </p>
              <div className="popover-confirm-actions">
                <button
                  type="button"
                  className="popover-confirm-yes"
                  onClick={handleClearConfirm}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="popover-confirm-no"
                  onClick={() => setConfirmingClear(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
