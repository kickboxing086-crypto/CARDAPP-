import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega a configuração do Firebase Applet
let firebaseConfig: {
  projectId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
} = {};

try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('[Server] Could not load firebase-applet-config.json:', e);
}

// Inicializa Firebase Admin de forma segura
let db: Firestore | null = null;
try {
  admin.initializeApp({
    credential: admin.applicationDefault(),
    projectId: firebaseConfig.projectId
  });
  db = firebaseConfig.firestoreDatabaseId
    ? getFirestore(firebaseConfig.firestoreDatabaseId)
    : getFirestore();
} catch (e) {
  console.warn('[Server] Firebase Admin init notice:', e);
}

const app = express();
app.set('trust proxy', true);
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===============================================================
// Banco de Dados Local Seguro do Servidor para Sincronização Cross-Device
// ===============================================================
const DATA_DIR = path.resolve(__dirname, 'data');
const STORES_FILE = path.join(DATA_DIR, 'stores-db.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders-db.json');
const SYSTEM_CONFIG_FILE = path.join(DATA_DIR, 'system-config.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[Server DB] Could not ensure data dir:', e);
}

interface ServerSystemConfig {
  supportWhatsapp: string;
  updatedAt: string;
}

const memorySystemConfig: ServerSystemConfig = {
  supportWhatsapp: '',
  updatedAt: '',
};

function loadSystemConfigFromDisk() {
  try {
    if (fs.existsSync(SYSTEM_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(SYSTEM_CONFIG_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        memorySystemConfig.supportWhatsapp = String(data.supportWhatsapp || '').replace(/\D/g, '');
        memorySystemConfig.updatedAt = String(data.updatedAt || '');
      }
    }
  } catch (e) {
    console.warn('[Server DB] Error reading system-config file:', e);
  }
}

function saveSystemConfigToDisk() {
  try {
    fs.writeFileSync(SYSTEM_CONFIG_FILE, JSON.stringify(memorySystemConfig, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Server DB] Error writing system-config file:', e);
  }
}

loadSystemConfigFromDisk();

app.get('/api/system-config', async (_req, res) => {
  try {
    if (!memorySystemConfig.supportWhatsapp && db) {
      try {
        const snap = await db.collection('systemConfig').doc('platformSettings').get();
        if (snap.exists) {
          const data = snap.data() as any;
          if (data?.supportWhatsapp) {
            memorySystemConfig.supportWhatsapp = String(data.supportWhatsapp).replace(/\D/g, '');
            memorySystemConfig.updatedAt = String(data.updatedAt || new Date().toISOString());
            saveSystemConfigToDisk();
          }
        }
      } catch {
        // ignore
      }
    }
    return res.json({
      success: true,
      supportWhatsapp: memorySystemConfig.supportWhatsapp || '',
      updatedAt: memorySystemConfig.updatedAt || '',
    });
  } catch {
    return res.status(500).json({ success: false, supportWhatsapp: '' });
  }
});

app.post('/api/system-config', async (req, res) => {
  try {
    const rawPhone = String(req.body?.supportWhatsapp || '').replace(/\D/g, '');
    let normalized = rawPhone;
    if (normalized.startsWith('0') && (normalized.length === 11 || normalized.length === 12)) {
      normalized = normalized.slice(1);
    }
    if (normalized && !normalized.startsWith('55') && (normalized.length === 10 || normalized.length === 11)) {
      normalized = `55${normalized}`;
    }

    memorySystemConfig.supportWhatsapp = normalized;
    memorySystemConfig.updatedAt = new Date().toISOString();
    saveSystemConfigToDisk();

    if (db) {
      try {
        await db.collection('systemConfig').doc('platformSettings').set(
          {
            supportWhatsapp: memorySystemConfig.supportWhatsapp,
            updatedAt: memorySystemConfig.updatedAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('[Server DB] Firestore systemConfig sync notice:', e);
      }
    }

    return res.json({
      success: true,
      supportWhatsapp: memorySystemConfig.supportWhatsapp,
      updatedAt: memorySystemConfig.updatedAt,
    });
  } catch (err) {
    console.error('[Server DB] Error updating system config:', err);
    return res.status(500).json({ success: false, message: 'Erro ao salvar configuração do sistema.' });
  }
});

interface ServerStoreData {
  storeId: string;
  storeName: string;
  slug: string;
  previousSlugs?: string[];
  settings?: any;
  categories?: any[];
  products?: any[];
  updatedAt: string;
}

const memoryStores: Record<string, ServerStoreData> = {};
const memoryOrders: Record<string, any[]> = {};

function loadStoresFromDisk() {
  try {
    if (fs.existsSync(STORES_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORES_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        Object.assign(memoryStores, data);
      }
    }
  } catch (e) {
    console.warn('[Server DB] Error reading stores file:', e);
  }
}

function saveStoresToDisk() {
  try {
    fs.writeFileSync(STORES_FILE, JSON.stringify(memoryStores, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Server DB] Error writing stores file:', e);
  }
}

function loadOrdersFromDisk() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        Object.assign(memoryOrders, data);
      }
    }
  } catch (e) {
    console.warn('[Server DB] Error reading orders file:', e);
  }
}

function saveOrdersToDisk() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(memoryOrders, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Server DB] Error writing orders file:', e);
  }
}

loadStoresFromDisk();
loadOrdersFromDisk();

function slugify(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanTargetParam(rawTarget: string): string {
  let rawParam = String(rawTarget || '');
  try {
    rawParam = decodeURIComponent(rawParam);
  } catch {}
  rawParam = rawParam.replace(/^https?:\/\//i, '');
  rawParam = rawParam.replace(/^(?:www\.)?cardapp[^\/]*\//i, '');
  return rawParam.trim().replace(/^\/+|[\s/.,;!?)"']+$/g, '');
}

// API: Sincronizar dados completos da loja do CEO para o servidor
app.post('/api/stores/sync', async (req, res) => {
  try {
    const { storeId, storeName, settings, categories, products, slug: customSlug } = req.body;
    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ success: false, message: 'storeId inválido.' });
    }

    const existing = memoryStores[storeId] || ({} as Partial<ServerStoreData>);
    const incomingName = (storeName || settings?.storeName || '').trim();
    const existingName = (existing.storeName || '').trim();
    const cleanName =
      (incomingName && incomingName !== 'Minha Loja' ? incomingName : '') ||
      (existingName && existingName !== 'Minha Loja' ? existingName : '') ||
      incomingName ||
      existingName ||
      'Minha Loja';

    const nameSlug = slugify(cleanName);
    const customSlugClean = slugify(customSlug || '');
    const resolvedSlug =
      (customSlugClean && customSlugClean !== 'minha-loja' ? customSlugClean : '') ||
      (nameSlug && nameSlug !== 'minha-loja' ? nameSlug : '') ||
      existing.slug ||
      slugify(storeId);

    const slugHistorySet = new Set<string>(
      [
        ...(Array.isArray(existing.previousSlugs) ? existing.previousSlugs : []),
        existing.slug || '',
        resolvedSlug,
        nameSlug,
        customSlugClean,
      ]
        .map((s) => (s || '').trim().toLowerCase())
        .filter((s) => s.length >= 2 && s !== 'minha-loja')
    );

    const mergedSettings =
      settings !== undefined
        ? {
            ...(existing.settings || {}),
            ...settings,
            storeName:
              settings?.storeName && settings.storeName.trim() !== 'Minha Loja'
                ? settings.storeName.trim()
                : cleanName,
          }
        : existing.settings;

    const updatedStore: ServerStoreData = {
      storeId,
      storeName: cleanName,
      slug: resolvedSlug,
      previousSlugs: Array.from(slugHistorySet),
      settings: mergedSettings,
      categories: Array.isArray(categories) ? categories : existing.categories || [],
      products: Array.isArray(products) ? products : existing.products || [],
      updatedAt: new Date().toISOString(),
    };

    memoryStores[storeId] = updatedStore;
    saveStoresToDisk();

    // Persistir permanentemente no Firestore Admin SDK (acessível entre múltiplos dispositivos e instâncias)
    if (db) {
      try {
        await db.collection('stores').doc(storeId).set({
          id: storeId,
          storeName: cleanName,
          slug: resolvedSlug,
          updatedAt: updatedStore.updatedAt,
          settings: mergedSettings || {},
          categories: updatedStore.categories,
          products: updatedStore.products,
        }, { merge: true });

        if (resolvedSlug) {
          await db.collection('storeSlugs').doc(resolvedSlug).set({
            slug: resolvedSlug,
            storeId,
            storeName: cleanName,
            updatedAt: updatedStore.updatedAt,
          }, { merge: true });
        }

        for (const ps of slugHistorySet) {
          if (ps && ps !== resolvedSlug) {
            await db.collection('storeSlugs').doc(ps).set({
              slug: ps,
              storeId,
              storeName: cleanName,
              updatedAt: updatedStore.updatedAt,
            }, { merge: true });
          }
        }
      } catch (cloudErr) {
        console.warn('[Server DB] Error persisting store to cloud Firestore:', cloudErr);
      }
    }

    return res.json({ success: true, store: updatedStore });
  } catch (err) {
    console.error('[Server DB] Error syncing store:', err);
    return res.status(500).json({ success: false, message: 'Erro ao salvar loja no servidor.' });
  }
});

const RESERVED_SERVER_ROUTE_SLUGS = new Set([
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

function findServerStoreByTarget(rawTarget: string): ServerStoreData | null {
  const target = cleanTargetParam(rawTarget);
  if (!target || target === 'default_store' || target === 'master_admin') {
    return null;
  }

  const targetLower = target.toLowerCase();
  const targetSlug = slugify(target);

  if (memoryStores[target]) {
    return memoryStores[target];
  }

  for (const s of Object.values(memoryStores)) {
    const storeSlug = (s.slug || '').toLowerCase();
    const nameSlug = slugify(s.storeName);
    const prevSlugs = Array.isArray(s.previousSlugs) ? s.previousSlugs : [];

    if (
      s.storeId === target ||
      s.storeId.toLowerCase() === targetLower ||
      storeSlug === targetLower ||
      (targetSlug.length >= 2 && storeSlug === targetSlug) ||
      (targetSlug.length >= 2 && nameSlug === targetSlug) ||
      prevSlugs.some((ps) => ps === targetLower || (targetSlug.length >= 2 && ps === targetSlug))
    ) {
      return s;
    }
  }

  return null;
}

// Resolução com fallback no Firestore Admin SDK quando a loja não está na memória do processo
async function findServerStoreByTargetAsync(rawTarget: string): Promise<ServerStoreData | null> {
  const inMem = findServerStoreByTarget(rawTarget);
  if (inMem) return inMem;

  const target = cleanTargetParam(rawTarget);
  if (!target || target === 'default_store' || target === 'master_admin') {
    return null;
  }

  const targetLower = target.toLowerCase();
  const targetSlug = slugify(target);

  if (db) {
    try {
      // 1. Tentar carregar pelo slug registrado
      if (targetSlug && targetSlug.length >= 2) {
        const slugDoc = await db.collection('storeSlugs').doc(targetSlug).get();
        if (slugDoc.exists) {
          const sData = slugDoc.data();
          if (sData?.storeId) {
            const storeDoc = await db.collection('stores').doc(sData.storeId).get();
            if (storeDoc.exists) {
              const fullData = storeDoc.data() as any;
              const loaded: ServerStoreData = {
                storeId: sData.storeId,
                storeName: fullData?.storeName || sData?.storeName || 'Minha Loja',
                slug: targetSlug,
                previousSlugs: [targetSlug],
                settings: fullData?.settings || { storeName: fullData?.storeName || sData?.storeName },
                categories: Array.isArray(fullData?.categories) ? fullData.categories : [],
                products: Array.isArray(fullData?.products) ? fullData.products : [],
                updatedAt: fullData?.updatedAt || new Date().toISOString(),
              };
              memoryStores[sData.storeId] = loaded;
              saveStoresToDisk();
              return loaded;
            }
          }
        }
      }

      // 2. Tentar carregar diretamente pelo storeId
      const directDoc = await db.collection('stores').doc(target).get();
      if (directDoc.exists) {
        const fullData = directDoc.data() as any;
        const sName = fullData?.storeName || 'Minha Loja';
        const sSlug = fullData?.slug || slugify(sName);
        const loaded: ServerStoreData = {
          storeId: target,
          storeName: sName,
          slug: sSlug,
          previousSlugs: [sSlug],
          settings: fullData?.settings || { storeName: sName },
          categories: Array.isArray(fullData?.categories) ? fullData.categories : [],
          products: Array.isArray(fullData?.products) ? fullData.products : [],
          updatedAt: fullData?.updatedAt || new Date().toISOString(),
        };
        memoryStores[target] = loaded;
        saveStoresToDisk();
        return loaded;
      }

      // 3. Scan em lojas no Firestore
      const snap = await db.collection('stores').limit(60).get();
      for (const d of snap.docs) {
        const full = d.data() as any;
        const sName = full?.storeName || '';
        const sSlug = full?.slug || slugify(sName);
        if (
          d.id === target ||
          d.id.toLowerCase() === targetLower ||
          sSlug === targetLower ||
          (targetSlug.length >= 2 && sSlug === targetSlug) ||
          (targetSlug.length >= 2 && slugify(sName) === targetSlug)
        ) {
          const loaded: ServerStoreData = {
            storeId: d.id,
            storeName: sName || 'Minha Loja',
            slug: sSlug,
            previousSlugs: [sSlug],
            settings: full?.settings || { storeName: sName },
            categories: Array.isArray(full?.categories) ? full.categories : [],
            products: Array.isArray(full?.products) ? full.products : [],
            updatedAt: full?.updatedAt || new Date().toISOString(),
          };
          memoryStores[d.id] = loaded;
          saveStoresToDisk();
          return loaded;
        }
      }
    } catch (e) {
      console.warn('[Server DB] Error querying Firestore fallback:', e);
    }
  }

  return null;
}

function resolveStoreImageSource(store: ServerStoreData): string {
  const logo = store.settings?.logoBase64;
  if (typeof logo === 'string' && (logo.startsWith('data:image/') || logo.startsWith('http://') || logo.startsWith('https://'))) {
    return logo;
  }
  if (Array.isArray(store.products)) {
    const prodWithImg = store.products.find(
      (p: any) =>
        typeof p?.image === 'string' &&
        (p.image.startsWith('data:image/') || p.image.startsWith('http://') || p.image.startsWith('https://'))
    );
    if (prodWithImg?.image) return prodWithImg.image;
  }
  return '';
}

function escapeHtmlAttr(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractStoreTargetFromExpressReq(req: express.Request): string {
  const qStore = typeof req.query?.store === 'string' ? req.query.store : '';
  const qLoja = typeof req.query?.loja === 'string' ? req.query.loja : '';
  const fromQuery = (qStore || qLoja).trim();
  if (fromQuery) return fromQuery;

  const cleanPath = (req.path || '').replace(/^\/+|\/+$/g, '');
  const firstSegment = cleanPath.split('/')[0] || '';
  if (
    firstSegment &&
    !firstSegment.includes('.') &&
    !RESERVED_SERVER_ROUTE_SLUGS.has(firstSegment.toLowerCase())
  ) {
    return firstSegment;
  }
  return '';
}

function resolveRequestBaseUrl(req: express.Request): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'https';
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.get('host') || '';
  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  return String(process.env.APP_URL || '').replace(/\/+$/, '');
}

function injectStoreOpenGraphHtml(
  html: string,
  store: ServerStoreData,
  req: express.Request
): string {
  const baseUrl = resolveRequestBaseUrl(req);
  const storeName = (store.storeName || store.settings?.storeName || 'Cardápio Digital').trim();
  const safeStoreName = escapeHtmlAttr(storeName);
  const pageTitle = escapeHtmlAttr(`${storeName} – Cardápio Digital`);
  const rawDesc =
    (store.settings?.tagline || '').trim() ||
    `Confira o cardápio digital de ${storeName} e faça seu pedido online com praticidade.`;
  const safeDesc = escapeHtmlAttr(rawDesc.slice(0, 160));
  const canonicalUrl = escapeHtmlAttr(baseUrl ? `${baseUrl}${req.originalUrl}` : req.originalUrl);

  const imageSrc = resolveStoreImageSource(store);
  const versionToken = encodeURIComponent(
    crypto
      .createHash('md5')
      .update(`${store.updatedAt || ''}_${imageSrc.slice(0, 64)}`)
      .digest('hex')
      .slice(0, 10)
  );
  const slugOrId = encodeURIComponent(store.slug || store.storeId);
  const ogImageUrl = imageSrc
    ? escapeHtmlAttr(
        baseUrl
          ? `${baseUrl}/api/stores/${slugOrId}/logo?v=${versionToken}`
          : `/api/stores/${slugOrId}/logo?v=${versionToken}`
      )
    : '';

  let nextHtml = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${pageTitle}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${pageTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:site_name" content="${safeStoreName}" />`
    )
    .replace(
      /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:card" content="${ogImageUrl ? 'summary_large_image' : 'summary'}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${pageTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${safeDesc}" />`
    )
    .replace('>CARDAPP</h1>', `>${safeStoreName}</h1>`);

  const extraTags = [
    ogImageUrl
      ? `<meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:secure_url" content="${ogImageUrl}" />
    <meta property="og:image:alt" content="${safeStoreName}" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta name="twitter:image" content="${ogImageUrl}" />`
      : '',
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: storeName,
      description: rawDesc,
      url: baseUrl ? `${baseUrl}${req.originalUrl}` : req.originalUrl,
      ...(imageSrc && baseUrl ? { image: `${baseUrl}/api/stores/${slugOrId}/logo?v=${versionToken}` } : {}),
    })}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  if (extraTags) {
    nextHtml = nextHtml.replace('</head>', `    ${extraTags}\n  </head>`);
  }

  return nextHtml;
}

// API: Servir a logo da loja como arquivo de imagem HTTP real para prévias do WhatsApp e redes sociais
app.get('/api/stores/:target/logo', async (req, res) => {
  try {
    const store = await findServerStoreByTargetAsync(req.params.target);
    if (!store) {
      return res.status(404).send('Not found');
    }

    const imageSrc = resolveStoreImageSource(store);
    if (!imageSrc) {
      return res.status(404).send('Logo not found');
    }

    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      return res.redirect(302, imageSrc);
    }

    const match = imageSrc.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    if (!match) {
      return res.status(404).send('Unsupported image format');
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[Server DB] Error serving store logo:', err);
    return res.status(500).send('Error loading logo');
  }
});

// API: Obter dados da loja pelo slug ou storeId (acesso imediato para clientes cross-device)
app.get('/api/stores/:target', async (req, res) => {
  try {
    const store = await findServerStoreByTargetAsync(req.params.target);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Loja não encontrada.' });
    }
    return res.json({ success: true, store });
  } catch (err) {
    console.error('[Server DB] Error fetching store:', err);
    return res.status(500).json({ success: false, message: 'Erro ao consultar loja.' });
  }
});

// API: Sincronizar Pedidos da Loja
app.post('/api/stores/:storeId/orders', (req, res) => {
  try {
    const { storeId } = req.params;
    const { order } = req.body;
    if (!storeId || !order?.id) {
      return res.status(400).json({ success: false, message: 'Dados do pedido inválidos.' });
    }

    if (!Array.isArray(memoryOrders[storeId])) {
      memoryOrders[storeId] = [];
    }

    const existingIdx = memoryOrders[storeId].findIndex((o: any) => o.id === order.id);
    if (existingIdx > -1) {
      memoryOrders[storeId][existingIdx] = order;
    } else {
      memoryOrders[storeId].unshift(order);
    }
    saveOrdersToDisk();

    return res.json({ success: true, order });
  } catch (err) {
    console.error('[Server DB] Error saving order:', err);
    return res.status(500).json({ success: false, message: 'Erro ao salvar pedido.' });
  }
});

// API: Listar Pedidos da Loja
app.get('/api/stores/:storeId/orders', (req, res) => {
  try {
    const { storeId } = req.params;
    const orders = memoryOrders[storeId] || [];
    return res.json({ success: true, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao listar pedidos.' });
  }
});

// API: Rastreio de Pedido para o Cliente
app.get('/api/stores/:storeId/orders/:orderId', (req, res) => {
  try {
    const { storeId, orderId } = req.params;
    const orders = memoryOrders[storeId] || [];
    const found = orders.find((o: any) => o.id === orderId);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }
    return res.json({ success: true, order: found });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao consultar pedido.' });
  }
});

async function startServer() {
  const isPageNavigationCandidate = (req: express.Request): boolean => {
    const p = req.path || '/';
    if (
      p.startsWith('/api/') ||
      p.startsWith('/@') ||
      p.startsWith('/src/') ||
      p.startsWith('/node_modules/') ||
      p.startsWith('/assets/')
    ) {
      return false;
    }
    const lastSeg = p.split('/').pop() || '';
    if (lastSeg.includes('.')) {
      return false;
    }
    return true;
  };

  // Pré-aquecer lojas salvas no Firestore para a memória do servidor
  if (db) {
    try {
      const snap = await db.collection('stores').limit(100).get();
      for (const d of snap.docs) {
        const full = d.data() as any;
        if (d.id && !memoryStores[d.id]) {
          const sName = full?.storeName || 'Minha Loja';
          const sSlug = full?.slug || slugify(sName);
          memoryStores[d.id] = {
            storeId: d.id,
            storeName: sName,
            slug: sSlug,
            previousSlugs: [sSlug],
            settings: full?.settings || { storeName: sName },
            categories: Array.isArray(full?.categories) ? full.categories : [],
            products: Array.isArray(full?.products) ? full.products : [],
            updatedAt: full?.updatedAt || new Date().toISOString(),
          };
        }
      }
      saveStoresToDisk();
      console.log(`[Server DB] Hydrated ${Object.keys(memoryStores).length} stores into memory.`);
    } catch (e) {
      console.warn('[Server DB] Startup Firestore hydration notice:', e);
    }
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.get('*', async (req, res, next) => {
      if (!isPageNavigationCandidate(req)) {
        return next();
      }
      try {
        const target = extractStoreTargetFromExpressReq(req);
        const store = target ? await findServerStoreByTargetAsync(target) : null;
        if (!store) {
          return next();
        }
        const indexPath = path.resolve(__dirname, 'index.html');
        const rawHtml = fs.readFileSync(indexPath, 'utf8');
        const ogHtml = injectStoreOpenGraphHtml(rawHtml, store, req);
        const transformedHtml = await vite.transformIndexHtml(req.originalUrl, ogHtml);
        return res.status(200).set({ 'Content-Type': 'text/html' }).end(transformedHtml);
      } catch (err) {
        console.warn('[OG Dev Middleware] fallback:', err);
        return next();
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res) => {
      try {
        const distIndex = path.join(distPath, 'index.html');
        const rawHtml = fs.readFileSync(distIndex, 'utf8');
        const target = isPageNavigationCandidate(req)
          ? extractStoreTargetFromExpressReq(req)
          : '';
        const store = target ? await findServerStoreByTargetAsync(target) : null;
        if (store) {
          const ogHtml = injectStoreOpenGraphHtml(rawHtml, store, req);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(ogHtml);
        }
        return res.status(200).set({ 'Content-Type': 'text/html' }).end(rawHtml);
      } catch {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CARDAPP server running on http://0.0.0.0:${port}`);
  });
}

startServer();
