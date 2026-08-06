import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia. Default to the desktop (popover)
// layout; tests that need the mobile sheet can override the return value.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
