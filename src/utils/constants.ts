export const OFFICIAL_APP_URL = 'https://cardapp-us.vercel.app';

export const RESERVED_ROUTE_SLUGS = new Set([
  'login',
  'entrar',
  'cadastro',
  'registrar',
  'register',
  'ceo',
  'admin',
  'cliente',
  'cardapio',
  'menu',
  'landing',
  'api',
  'assets',
  'favicon.svg',
  'manifest.json',
  'sw.js',
]);

export function slugifyStoreName(storeName?: string): string {
  if (!storeName) return '';
  return storeName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function resolveBaseOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (
      origin.includes('vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('run.app')
    ) {
      return origin.replace(/\/+$/, '');
    }
  }
  return OFFICIAL_APP_URL;
}

export function getClientAppUrl(storeId?: string, storeName?: string): string {
  const baseUrl = resolveBaseOrigin();
  const slug = slugifyStoreName(storeName);

  const isDefaultStore =
    !storeId || storeId === 'default_store' || storeId === 'master_admin';

  if (isDefaultStore && (!slug || slug === 'cardapp-digital' || slug === 'minha-loja')) {
    return `${baseUrl}/?view=cardapio`;
  }

  if (
    slug &&
    slug.length >= 2 &&
    slug !== 'minha-loja' &&
    slug !== 'cardapp-digital' &&
    !RESERVED_ROUTE_SLUGS.has(slug)
  ) {
    return `${baseUrl}/${slug}`;
  }

  if (slug && slug.length >= 2 && slug !== 'minha-loja') {
    return `${baseUrl}/?loja=${encodeURIComponent(slug)}`;
  }

  if (storeId && !isDefaultStore) {
    return `${baseUrl}/?loja=${encodeURIComponent(storeId)}`;
  }

  return `${baseUrl}/?view=cardapio`;
}

export function getCeoAppUrl(): string {
  return `${resolveBaseOrigin()}/?view=ceo`;
}

export function getLoginAppUrl(): string {
  return `${resolveBaseOrigin()}/?view=login`;
}

export function getCurrentEnvUrl(
  view: 'cliente' | 'ceo' | 'login',
  storeId?: string,
  storeName?: string
): string {
  if (view === 'cliente') {
    return getClientAppUrl(storeId, storeName);
  }
  const slug = slugifyStoreName(storeName);
  const storeQuery =
    slug && slug !== 'minha-loja'
      ? `&loja=${encodeURIComponent(slug)}`
      : storeId && storeId !== 'default_store' && storeId !== 'master_admin'
      ? `&store=${encodeURIComponent(storeId)}`
      : '';
  return `${resolveBaseOrigin()}/?view=${view}${storeQuery}`;
}
