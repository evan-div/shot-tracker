import { useEffect, useRef, useState } from 'react';

interface SheetInputProps {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  type?: 'text' | 'url';
  multiline?: boolean;
}

const DEBOUNCE_MS = 600;

/**
 * Text cell for the reel sheet. Keeps what you type in local state and
 * commits on a debounce (plus immediately on blur), so a realtime update
 * from another device can't yank the text out from under you mid-sentence.
 */
export function SheetInput({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  type = 'text',
  multiline = false,
}: SheetInputProps) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accept remote changes only while this cell is not being edited.
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const scheduleCommit = (next: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(next), DEBOUNCE_MS);
  };

  const handleChange = (next: string) => {
    setDraft(next);
    scheduleCommit(next);
  };

  const handleBlur = () => {
    focused.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (draft !== value) onCommit(draft);
  };

  const shared = {
    className: 'sheet-input',
    value: draft,
    placeholder,
    'aria-label': ariaLabel,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: handleBlur,
  };

  return multiline ? (
    <textarea {...shared} rows={2} onChange={(e) => handleChange(e.target.value)} />
  ) : (
    <input {...shared} type={type} onChange={(e) => handleChange(e.target.value)} />
  );
}
