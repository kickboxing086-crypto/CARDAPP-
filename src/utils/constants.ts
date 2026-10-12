export const OFFICIAL_APP_URL = 'https://cardapp-us.vercel.app';

export function getClientAppUrl(storeId?: string): string {
  const storeQuery = storeId && storeId !== 'default_store' && storeId !== 'master_admin' ? `&store=${encodeURIComponent(storeId)}` : '';
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('run.app')) {
      return `${origin}/?view=cliente${storeQuery}`;
    }
  }
  return `${OFFICIAL_APP_URL}/?view=cliente${storeQuery}`;
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

export function getLoginAppUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('run.app')) {
      return `${origin}/?view=login`;
    }
  }
  return `${OFFICIAL_APP_URL}/?view=login`;
}

export function getCurrentEnvUrl(view: 'cliente' | 'ceo' | 'login', storeId?: string): string {
  const storeQuery = storeId && storeId !== 'default_store' && storeId !== 'master_admin' ? `&store=${encodeURIComponent(storeId)}` : '';
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/?view=${view}${storeQuery}`;
  }
  return `${OFFICIAL_APP_URL}/?view=${view}${storeQuery}`;
}
