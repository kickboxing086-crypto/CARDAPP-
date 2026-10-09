import React from 'react';
import { Instagram, MessageCircle, MapPin, ExternalLink, Clock, Bike, ShieldCheck, Check } from 'lucide-react';
import { StoreSettings } from '../types';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { formatCurrency } from '../utils/formatters';

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
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-100/40 via-white to-transparent pt-6 pb-5 px-4 border-b border-amber-200/60">
      {/* Subtle Ambient Golden Glow in the background center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-300/20 blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
        {/* Story Gradient Ring & Centered Store Avatar */}
        <div className="relative mb-3.5 group cursor-pointer">
          <div className="p-1 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 shadow-md group-hover:scale-105 transition-transform duration-300">
            <div className="p-0.5 bg-white rounded-full">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-amber-50 flex items-center justify-center border border-amber-200 shadow-inner">
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

          {/* Golden Verified Badge */}
          <span
            className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black border-2 border-white shadow-sm"
            title="Loja Oficial Verificada"
          >
            ✓
          </span>
        </div>

        {/* Small Top Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-950 text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-2xs mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
          <span>Cardápio Digital Oficial</span>
        </div>

        {/* Store Title Centered */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-display mb-1.5">
          {settings.storeName}
        </h1>

        {/* Instagram Handle Badge if configured */}
        {cleanInstagram && (
          <a
            href={`https://instagram.com/${cleanInstagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-amber-800 transition-colors mb-2 bg-white/90 hover:bg-amber-50 px-3 py-1 rounded-full border border-amber-200 shadow-2xs group"
          >
            <Instagram className="w-3.5 h-3.5 text-pink-600 group-hover:scale-110 transition-transform" />
            <span>@{cleanInstagram}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}

        {/* Store Bio / Tagline Centered */}
        {settings.tagline && (
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-3.5 font-medium">
            {settings.tagline}
          </p>
        )}

        {/* Status Pills: Aberto/Fechado, Tempo de Entrega, Taxa, Endereço */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 mb-4">
          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              settings.isOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span>{settings.isOpen ? 'Aberto Agora' : 'Fechado Temporariamente'}</span>
          </div>

          {/* Tempo Estimado */}
          {settings.estimatedDeliveryTime && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-amber-200 text-slate-700 font-bold shadow-2xs text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{settings.estimatedDeliveryTime}</span>
            </div>
          )}

          {/* Taxa de Entrega base */}
          {settings.serviceModes.allowDelivery && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-amber-200 text-slate-700 font-bold shadow-2xs text-xs">
              <Bike className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {settings.deliveryFee > 0
                  ? `Taxa a partir de ${formatCurrency(settings.deliveryFee)}`
                  : 'Entrega Grátis'}
              </span>
            </div>
          )}

          {/* Endereço */}
          {settings.address && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-amber-200 text-slate-700 font-medium shadow-2xs text-xs max-w-xs truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">{settings.address}</span>
            </div>
          )}
        </div>

        {/* Social / Direct Action Buttons Centered */}
        <div className="flex items-center justify-center gap-2.5 w-full max-w-sm">
          {cleanInstagram && (
            <a
              href={`https://instagram.com/${cleanInstagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 hover:border-pink-300 bg-white hover:bg-pink-50/40 text-slate-800 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Instagram className="w-4 h-4 text-pink-600" />
              <span>Instagram</span>
            </a>
          )}

          {cleanWhatsapp && (
            <a
              href={`https://wa.me/${cleanWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
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
