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

describe('Reel ideas sheet', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('starts empty and adds a row', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);

    expect(screen.getByText(/No reel ideas yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add idea' }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(storedIdeas()).toHaveLength(1);
  });

  it('saves name, link and description, and restores them after a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));

    await user.type(screen.getByRole('textbox', { name: /^Name for/ }), 'Evan');
    await user.type(
      screen.getByRole('textbox', { name: /^Reel link for/ }),
      'https://example.com/reel'
    );
    await user.type(
      screen.getByRole('textbox', { name: /^Description for/ }),
      'Backstage b-roll'
    );
    // Commit the debounced edits.
    await user.click(document.body);

    expect(storedIdeas()[0]).toMatchObject({
      author: 'Evan',
      url: 'https://example.com/reel',
      description: 'Backstage b-roll',
    });

    unmount();
    const user2 = userEvent.setup();
    await openReelsTab(user2);
    expect(await screen.findByDisplayValue('Evan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/reel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Backstage b-roll')).toBeInTheDocument();
  });

  it('sets and clears a star rating', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));

    const stars = screen.getByRole('radiogroup', { name: /^Rating for/ });
    await user.click(within(stars).getByRole('radio', { name: '4 stars' }));

    expect(storedIdeas()[0].rating).toBe(4);
    expect(within(stars).getByRole('radio', { name: '4 stars' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    // Clicking the current rating again clears it.
    await user.click(within(stars).getByRole('radio', { name: '4 stars' }));
    expect(storedIdeas()[0].rating).toBe(0);
  });

  it('asks for confirmation before deleting a row', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));
    await user.type(screen.getByRole('textbox', { name: /^Name for/ }), 'Fran');
    await user.click(document.body);

    await user.click(screen.getByRole('button', { name: /^Delete/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(storedIdeas()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /^Delete/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(storedIdeas()).toHaveLength(0);
    expect(screen.getByText(/No reel ideas yet/)).toBeInTheDocument();
  });

  it('shows an Open link only once a URL is entered', async () => {
    const user = userEvent.setup();
    await openReelsTab(user);
    await user.click(screen.getByRole('button', { name: '+ Add idea' }));

    expect(screen.queryByRole('link', { name: /^Open reel link/ })).not.toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: /^Reel link for/ }),
      'https://example.com/r'
    );
    await user.click(document.body);

    const link = await screen.findByRole('link', { name: /^Open reel link/ });
    expect(link).toHaveAttribute('href', 'https://example.com/r');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
