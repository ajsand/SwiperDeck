import {
  normalizePathname,
  resolveAppNavSection,
  shouldShowAppBottomNav,
} from '@/lib/navigation/appShell';

describe('app shell navigation', () => {
  it('keeps the persistent bottom nav visible across normal deck drill-down routes', () => {
    expect(shouldShowAppBottomNav('/')).toBe(true);
    expect(shouldShowAppBottomNav('/deck/deck_movies_tv')).toBe(true);
    expect(shouldShowAppBottomNav('/deck/deck_movies_tv/profile')).toBe(true);
    expect(shouldShowAppBottomNav('/deck/deck_movies_tv/compare')).toBe(true);
    expect(shouldShowAppBottomNav('/deck/custom/new')).toBe(true);
    expect(shouldShowAppBottomNav('/deck/custom/import')).toBe(true);
    expect(shouldShowAppBottomNav('/compare/deck_movies_tv/consent')).toBe(
      true,
    );
    expect(shouldShowAppBottomNav('/compare/deck_movies_tv/report')).toBe(true);
  });

  it('hides the bottom nav only for focused live-session routes', () => {
    expect(shouldShowAppBottomNav('/deck/deck_movies_tv/play')).toBe(false);
    expect(shouldShowAppBottomNav('/modal')).toBe(false);
    expect(shouldShowAppBottomNav('/+not-found')).toBe(false);
  });

  it('maps paths to the expected top-level app section', () => {
    expect(resolveAppNavSection('/')).toBe('decks');
    expect(resolveAppNavSection('/deck/deck_movies_tv')).toBe('decks');
    expect(resolveAppNavSection('/profile')).toBe('profile');
    expect(resolveAppNavSection('/library')).toBe('history');
    expect(resolveAppNavSection('/settings')).toBe('settings');
  });

  it('normalizes empty or querystring paths safely', () => {
    expect(normalizePathname(undefined)).toBe('/');
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname('/deck/deck_movies_tv?from=history')).toBe(
      '/deck/deck_movies_tv',
    );
  });
});
