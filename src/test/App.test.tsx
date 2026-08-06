import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AFFILIATES, SHOT_TYPES } from '../config';

const FIRST_CELL_LABEL = /Reveal Reaction for Amy Porterfield/;

function firstCellButton() {
  return screen.getByRole('button', { name: FIRST_CELL_LABEL });
}

describe('Shot tracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders every affiliate/shot cell as an unchecked box', () => {
    render(<App />);
    const cells = screen.getAllByRole('button', { name: /not completed$/ });
    expect(cells).toHaveLength(AFFILIATES.length * SHOT_TYPES.length);
  });

  it('assigns a photographer to an empty cell', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(firstCellButton());
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Serrano' }));

    const cell = firstCellButton();
    expect(cell).toHaveTextContent('Serrano');
    expect(cell).toHaveAccessibleName(/completed by serrano/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('changes the assigned photographer on a completed cell', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(firstCellButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Evan' }));
    expect(firstCellButton()).toHaveTextContent('Evan');

    await user.click(firstCellButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fran' }));
    expect(firstCellButton()).toHaveTextContent('Fran');
    expect(firstCellButton()).not.toHaveTextContent('Evan');
  });

  it('asks for confirmation before clearing, and cancel keeps the assignment', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(firstCellButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Evan' }));

    await user.click(firstCellButton());
    await user.click(screen.getByRole('button', { name: 'Mark as incomplete' }));
    expect(screen.getByText('Clear this assignment?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(firstCellButton()).toHaveTextContent('Evan');
  });

  it('clears the assignment after confirming', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(firstCellButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Evan' }));

    await user.click(firstCellButton());
    await user.click(screen.getByRole('button', { name: 'Mark as incomplete' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(firstCellButton()).toHaveAccessibleName(/not completed/);
    expect(firstCellButton()).not.toHaveTextContent('Evan');
  });

  it('saves to storage and restores state after a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(firstCellButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fran' }));

    const raw = window.localStorage.getItem('shot-tracker:state:v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    const entry = parsed['amy-porterfield::reveal-reaction'];
    expect(entry).toMatchObject({
      affiliateId: 'amy-porterfield',
      shotTypeId: 'reveal-reaction',
      photographerId: 'fran',
    });
    expect(new Date(entry.completedAt).toString()).not.toBe('Invalid Date');

    unmount();
    render(<App />);
    expect(firstCellButton()).toHaveTextContent('Fran');
  });

  it('updates the progress summary as shots are completed', async () => {
    const user = userEvent.setup();
    render(<App />);

    const total = AFFILIATES.length * SHOT_TYPES.length;
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    await user.click(firstCellButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Evan' }));

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(Math.round((1 / total) * 100))
    );
  });
});
