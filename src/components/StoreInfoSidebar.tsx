import React from 'react';
import {
  X,
  Store,
  MapPin,
  Instagram,
  MessageCircle,
  Clock,
  Bike,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { StoreSettings } from '../types';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { formatCurrency } from '../utils/formatters';

interface StoreInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
}

export const StoreInfoSidebar: React.FC<StoreInfoSidebarProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [copiedPix, setCopiedPix] = React.useState(false);

  if (!isOpen) return null;

  const cleanInstagram = settings.instagramHandle
    ? settings.instagramHandle.replace('@', '').trim()
    : '';
  const cleanWhatsapp = settings.phoneWhatsapp.replace(/\D/g, '');

  const handleCopyPix = () => {
    navigator.clipboard.writeText(settings.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer on the LEFT side */}
      <div className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col border-r border-amber-300 animate-in slide-in-from-left duration-250 overflow-hidden">
        {/* Top Header of Sidebar */}
        <div className="bg-amber-400 p-5 flex items-center justify-between text-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base leading-tight">Informações da Loja</h2>
              <span className="text-[11px] font-bold text-slate-800">Sobre o estabelecimento</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-950 text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar Informações"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FFFDF7]">
          {/* Logo & Store Identity */}
          <div className="text-center pb-4 border-b border-amber-200/80">
            <div className="w-20 h-20 rounded-full border-2 border-amber-400 bg-white mx-auto overflow-hidden flex items-center justify-center shadow-md mb-3">
              {settings.logoBase64 ? (
                <img
                  src={settings.logoBase64}
                  alt={settings.storeName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ForkKnifeIcon className="w-10 h-10 text-amber-500 stroke-[2.2]" />
              )}
            </div>

            <h3 className="font-black text-xl text-slate-950 tracking-tight font-display mb-1">
              {settings.storeName}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {settings.tagline}
            </p>

            {/* Status indicator */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span>{settings.isOpen ? 'Aberto para Pedidos' : 'Fechado no Momento'}</span>
            </div>
          </div>

          {/* Social Links: Instagram & WhatsApp */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-slate-900 tracking-wider block">
              Redes Sociais & Contato
            </span>

            {cleanInstagram && (
              <a
                href={`https://instagram.com/${cleanInstagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 hover:border-pink-300 text-slate-800 hover:bg-pink-50/40 text-xs font-bold transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  <span>Instagram Oficial: @{cleanInstagram}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}

            {cleanWhatsapp && (
              <a
                href={`https://wa.me/${cleanWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 hover:bg-emerald-50/40 text-xs font-bold transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp de Atendimento</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}
          </div>

          {/* Address & Delivery */}
          <div className="p-4 rounded-2xl bg-white border border-amber-200 space-y-2.5 text-xs text-slate-700 shadow-2xs">
            <span className="font-black uppercase tracking-wider text-slate-900 text-xs block mb-1">
              Localização & Entrega
            </span>

            {settings.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Estimativa: {settings.estimatedDeliveryTime}</span>
            </div>

            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Taxa de Entrega: {formatCurrency(settings.deliveryFee)}</span>
            </div>
          </div>

          {/* Modalidades de Atendimento */}
          <div className="p-4 rounded-2xl bg-white border border-amber-200 space-y-2 text-xs text-slate-700 shadow-2xs">
            <span className="font-black uppercase tracking-wider text-slate-900 text-xs block mb-1">
              Como Funciona o Atendimento
            </span>
            <div className="space-y-1.5 font-medium">
              {settings.serviceModes.allowDelivery && (
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Entrega Delivery no seu endereço</span>
                </div>
              )}
              {settings.serviceModes.allowRetirada && (
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Retirada rápida no balcão da loja</span>
                </div>
              )}
              {settings.serviceModes.allowMesa && (
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Consumo no local (serviço na mesa)</span>
                </div>
              )}
            </div>
          </div>

          {/* Formas de Pagamento Aceitas */}
          <div className="p-4 rounded-2xl bg-white border border-amber-200 space-y-2 text-xs text-slate-700 shadow-2xs">
            <span className="font-black uppercase tracking-wider text-slate-900 text-xs block mb-1">
              Formas de Pagamento Aceitas
            </span>
            <div className="grid grid-cols-2 gap-2 font-bold text-slate-800">
              {settings.paymentMethods.allowPix && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200/80">
                  <QrCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pix</span>
                </div>
              )}
              {settings.paymentMethods.allowCreditCard && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200/80">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  <span>Crédito</span>
                </div>
              )}
              {settings.paymentMethods.allowDebitCard && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200/80">
                  <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                  <span>Débito</span>
                </div>
              )}
              {settings.paymentMethods.allowCash && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200/80">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dinheiro (c/ troco)</span>
                </div>
              )}
            </div>

            {/* Pix Key copy */}
            {settings.pixKey && (
              <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 truncate mr-2">
                  Chave: {settings.pixKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[10px] cursor-pointer"
                >
                  {copiedPix ? 'Copiada!' : 'Copiar'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-amber-200 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-colors cursor-pointer"
          >
            Fechar e Voltar ao Cardápio
          </button>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
            Desenvolvido por SF TECNOLOGIA
          </p>
        </div>
      </div>
    </div>
  );
};
