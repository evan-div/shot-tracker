import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const STORAGE_KEY = 'shot-tracker:reels:v1';

async function openReelsTab(user: ReturnType<typeof userEvent.setup>) {
  const view = render(<App />);
  await user.click(screen.getByRole('tab', { name: 'Reel Ideas' }));
  return view;
}

function storedIdeas() {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
}

describe('Tabs', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('shows the shot tracker first and switches to reel ideas', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('tab', { name: 'Shot Tracker' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Reel Ideas' }));

    expect(screen.getByRole('tab', { name: 'Reel Ideas' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add idea' })).toBeInTheDocument();
  });

  it('moves between tabs with arrow keys', async () => {
    const user = userEvent.setup();
    render(<App />);

    screen.getByRole('tab', { name: 'Shot Tracker' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Reel Ideas' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});

describe('Reel ideas cards', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('starts empty and adds a card that opens in edit mode', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);

    expect(screen.getByText(/No reel ideas yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add idea' }));

    // A blank card goes straight to the fields, with nothing to read yet.
    expect(screen.getByRole('textbox', { name: /^Name for/ })).toBeInTheDocument();
    expect(storedIdeas()).toHaveLength(1);
  });

  it('turns a filled-in idea into a card with the author, quote and link', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));

    await user.type(screen.getByRole('textbox', { name: /^Name for/ }), 'Evan');
    await user.type(
      screen.getByRole('textbox', { name: /^Reel link for/ }),
      'https://instagram.com/reel/abc123'
    );
    await user.type(
      screen.getByRole('textbox', { name: /^Description for/ }),
      'Backstage b-roll of the reveal'
    );
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('heading', { name: 'Evan' })).toBeInTheDocument();
    expect(screen.getByText('Backstage b-roll of the reveal')).toBeInTheDocument();
    expect(screen.getByText(/^added /)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Open in Instagram/ });
    expect(link).toHaveAttribute('href', 'https://instagram.com/reel/abc123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    // The fields are gone until you choose to edit again.
    expect(screen.queryByRole('textbox', { name: /^Name for/ })).not.toBeInTheDocument();
  });

  it('labels the button by where the link points, and hides it without one', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));
    await user.type(screen.getByRole('textbox', { name: /^Name for/ }), 'Fran');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(
      screen.getByRole('textbox', { name: /^Reel link for/ }),
      'https://www.tiktok.com/@x/video/1'
    );
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('link', { name: /Open in TikTok/ })).toBeInTheDocument();
  });

  it('goes back to edit mode and saves changes', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));
    await user.type(screen.getByRole('textbox', { name: /^Name for/ }), 'Serrano');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('heading', { name: 'Serrano' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const nameField = screen.getByRole('textbox', { name: /^Name for/ });
    await user.clear(nameField);
    await user.type(nameField, 'Serrano B');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('heading', { name: 'Serrano B' })).toBeInTheDocument();
    expect(storedIdeas()[0].author).toBe('Serrano B');
  });

  it('sets and clears a star rating', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));

    const stars = screen.getByRole('radiogroup', { name: /^Rating for/ });
    await user.click(within(stars).getByRole('radio', { name: '4 stars' }));
    expect(storedIdeas()[0].rating).toBe(4);

    await user.click(within(stars).getByRole('radio', { name: '4 stars' }));
    expect(storedIdeas()[0].rating).toBe(0);
  });

  it('asks for confirmation before deleting a card', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));
    await user.type(screen.getByRole('textbox', { name: /^Name for/ }), 'Fran');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(screen.getByRole('button', { name: /^Delete Fran/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(storedIdeas()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /^Delete Fran/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(storedIdeas()).toHaveLength(0);
    expect(screen.getByText(/No reel ideas yet/)).toBeInTheDocument();
  });

  it('restores saved cards after a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));
    await user.type(screen.getByRole('textbox', { name: /^Name for/ }), 'Evan');
    await user.type(
      screen.getByRole('textbox', { name: /^Description for/ }),
      'Reveal moment, fast cut'
    );
    await user.click(screen.getByRole('button', { name: 'Done' }));

    unmount();
    const user2 = userEvent.setup();
    await openReelsTab(user2);

    // Restored cards render as cards, not as forms.
    expect(await screen.findByRole('heading', { name: 'Evan' })).toBeInTheDocument();
    expect(screen.getByText('Reveal moment, fast cut')).toBeInTheDocument();
  });
});
