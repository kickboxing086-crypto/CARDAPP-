import React from 'react';
import { Instagram, MessageCircle, MapPin, Store, ExternalLink } from 'lucide-react';
import { StoreSettings } from '../types';
import { ForkKnifeIcon } from './ForkKnifeIcon';

interface InstagramStoreProfileProps {
  settings: StoreSettings;
  activeOrdersCount?: number;
}

export const InstagramStoreProfile: React.FC<InstagramStoreProfileProps> = ({
  settings,
}) => {
  const cleanInstagram = settings.instagramHandle
    ? settings.instagramHandle.replace('@', '').trim()
    : '';

  const cleanWhatsapp = settings.phoneWhatsapp.replace(/\D/g, '');

  return (
    <section className="bg-white border-b border-amber-200/80 pt-8 pb-6 px-4">
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
        {/* Instagram-Style Profile Avatar Centered with Yellow Ring */}
        <div className="relative mb-3.5 group">
          {/* Yellow/Amber Story Gradient Ring */}
          <div className="p-1 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 shadow-md">
            <div className="p-0.5 bg-white rounded-full">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-amber-50 flex items-center justify-center border border-amber-200">
                {settings.logoBase64 ? (
                  <img
                    src={settings.logoBase64}
                    alt={settings.storeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ForkKnifeIcon className="w-12 h-12 sm:w-14 sm:h-14 text-amber-500 stroke-[2.2]" />
                )}
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black border-2 border-white shadow-xs">
            ✓
          </span>
        </div>

        {/* Store Title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-display">
            {settings.storeName}
          </h1>
        </div>

        {/* Instagram Handle Badge if present */}
        {cleanInstagram && (
          <a
            href={`https://instagram.com/${cleanInstagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-amber-800 transition-colors mb-2 bg-amber-50/70 px-3 py-1 rounded-full border border-amber-200/60"
          >
            <Instagram className="w-3.5 h-3.5 text-pink-600" />
            <span>@{cleanInstagram}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}

        {/* Store Bio / Tagline */}
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-4">
          {settings.tagline}
        </p>

        {/* Address and Store Status */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 mb-5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                settings.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="font-bold text-slate-800">
              {settings.isOpen ? 'Loja Aberta Agora' : 'Fechada Temporariamente'}
            </span>
          </div>

          {settings.address && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1 truncate max-w-xs">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{settings.address}</span>
              </div>
            </>
          )}
        </div>

        {/* Social CTAs: Instagram & WhatsApp */}
        <div className="flex items-center justify-center gap-2.5 w-full max-w-sm">
          {cleanInstagram && (
            <a
              href={`https://instagram.com/${cleanInstagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-pink-300 bg-white hover:bg-pink-50/30 text-slate-800 text-xs font-bold transition-all shadow-2xs"
            >
              <Instagram className="w-4 h-4 text-pink-600" />
              <span>Ver Instagram</span>
            </a>
          )}

          {cleanWhatsapp && (
            <a
              href={`https://wa.me/${cleanWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all shadow-2xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp da Loja</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
