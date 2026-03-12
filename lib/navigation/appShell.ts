export const APP_NAV_SECTIONS = [
  'decks',
  'profile',
  'history',
  'settings',
] as const;

export type AppNavSection = (typeof APP_NAV_SECTIONS)[number];

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname || pathname.trim().length === 0) {
    return '/';
  }

  return pathname.split('?')[0] ?? '/';
}

export function shouldShowAppBottomNav(
  pathname: string | null | undefined,
): boolean {
  const normalizedPathname = normalizePathname(pathname);

  if (/^\/deck\/[^/]+\/play$/.test(normalizedPathname)) {
    return false;
  }

  if (normalizedPathname === '/modal' || normalizedPathname === '/+not-found') {
    return false;
  }

  return true;
}

export function resolveAppNavSection(
  pathname: string | null | undefined,
): AppNavSection {
  const normalizedPathname = normalizePathname(pathname);

  if (
    normalizedPathname === '/profile' ||
    normalizedPathname.startsWith('/profile/')
  ) {
    return 'profile';
  }

  if (
    normalizedPathname === '/library' ||
    normalizedPathname.startsWith('/library/')
  ) {
    return 'history';
  }

  if (
    normalizedPathname === '/settings' ||
    normalizedPathname.startsWith('/settings/')
  ) {
    return 'settings';
  }

  return 'decks';
}
