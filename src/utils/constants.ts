export const OFFICIAL_APP_URL = 'https://cardapp-us.vercel.app';

export function getClientAppUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('run.app')) {
      return `${origin}/?view=cliente`;
    }
  }
  return `${OFFICIAL_APP_URL}/?view=cliente`;
}

export function getCeoAppUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('run.app')) {
      return `${origin}/?view=ceo`;
    }
  }
  return `${OFFICIAL_APP_URL}/?view=ceo`;
}

export function getCurrentEnvUrl(view: 'cliente' | 'ceo'): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/?view=${view}`;
  }
  return `${OFFICIAL_APP_URL}/?view=${view}`;
}
