import React, { useEffect } from 'react';
import { Bell, CheckCircle2, X, ChefHat, Bike, PackageCheck, UtensilsCrossed } from 'lucide-react';
import { OrderStatus } from '../types';

interface PushNotificationBannerProps {
  title: string;
  message: string;
  status: OrderStatus;
  deliveryType: 'delivery' | 'retirada' | 'mesa';
  displayId: string;
  onClose: () => void;
  onViewOrder?: () => void;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  title,
  message,
  status,
  deliveryType,
  displayId,
  onClose,
  onViewOrder,
}) => {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStatusIcon = () => {
    if (deliveryType === 'mesa') {
      if (status === 'em_rota') return <UtensilsCrossed className="w-5 h-5 text-amber-950 stroke-[2.4]" />;
      if (status === 'em_producao') return <ChefHat className="w-5 h-5 text-amber-950 stroke-[2.4]" />;
      if (status === 'finalizado') return <CheckCircle2 className="w-5 h-5 text-emerald-800 stroke-[2.4]" />;
      return <Bell className="w-5 h-5 text-amber-950 stroke-[2.4]" />;
    }

    switch (status) {
      case 'em_producao':
        return <ChefHat className="w-5 h-5 text-amber-950 stroke-[2.4]" />;
      case 'em_rota':
        return <Bike className="w-5 h-5 text-amber-950 stroke-[2.4]" />;
      case 'finalizado':
        return <PackageCheck className="w-5 h-5 text-emerald-800 stroke-[2.4]" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-amber-950 stroke-[2.4]" />;
    }
  };

  return (
    <aside
      aria-label="Notificação em tempo real"
      aria-live="polite"
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-top-4 fade-in duration-300"
    >
      <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-2xl border-2 border-amber-400 flex items-start gap-3 relative overflow-hidden ring-4 ring-amber-400/20">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 animate-pulse" />

        {/* Icon Circle */}
        <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
              Notificação de Pedido #{displayId}
            </span>
          </div>
          <h4 className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
            {title}
          </h4>
          <p className="text-[11px] text-slate-200 mt-1 leading-snug">
            {message}
          </p>

          {onViewOrder && (
            <button
              type="button"
              onClick={onViewOrder}
              className="mt-2 text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Ver acompanhamento completo →
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
          aria-label="Fechar notificação"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
