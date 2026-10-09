import React, { useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  Copy,
  Check,
  MessageCircle,
  RotateCcw,
  MapPin,
  Calendar,
  Banknote,
  Tag,
} from 'lucide-react';
import { Order, OrderStatus, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface OrderTrackingStepProps {
  order: Order | null;
  settings: StoreSettings;
  onNewOrder: () => void;
  onRefresh?: () => void;
}

export const OrderTrackingStep: React.FC<OrderTrackingStepProps> = ({
  order,
  settings,
  onNewOrder,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-amber-100 text-amber-800 rounded-3xl mx-auto flex items-center justify-center mb-5">
          <PackageCheck className="w-10 h-10 stroke-[1.8]" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Nenhum pedido ativo no momento</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
          Você ainda não realizou um pedido nesta sessão. Volte ao cardápio para montar sua comanda!
        </p>
        <button
          type="button"
          onClick={onNewOrder}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Iniciar Novo Pedido</span>
        </button>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.displayId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const openWhatsApp = () => {
    const cleanPhone = settings.phoneWhatsapp.replace(/\D/g, '');
    const itemsText = order.items
      .map((i) => {
        let line = `• ${i.quantity}x ${i.product.name}`;
        if (i.selectedComplements && i.selectedComplements.length > 0) {
          line += ` (+ ${i.selectedComplements.map((c) => c.name).join(', ')})`;
        }
        return line;
      })
      .join('\n');
    const msg = `Olá! Gostaria de acompanhar meu pedido ${order.displayId} realizado no CARDAPP.\n\nCliente: ${order.customer.name}\nTotal: ${formatCurrency(order.total)}\nItens:\n${itemsText}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const statusSteps: {
    key: OrderStatus;
    title: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      key: 'recebido',
      title: '1. Recebido',
      description: 'Pedido confirmado e enviado para o terminal da cozinha',
      icon: CheckCircle2,
    },
    {
      key: 'em_producao',
      title: '2. Em Produção',
      description: 'Ingredientes frescos selecionados e preparo em andamento',
      icon: ChefHat,
    },
    {
      key: 'em_rota',
      title: order.customer.deliveryType === 'delivery' ? '3. Em Rota' : '3. Pronto para Retirada',
      description: order.customer.deliveryType === 'delivery'
        ? 'Entregador em deslocamento com seu pacote aquecido'
        : 'Pedido embalado e pronto para você retirar no balcão',
      icon: Bike,
    },
    {
      key: 'finalizado',
      title: '4. Finalizado',
      description: 'Pedido entregue com sucesso! Bom apetite!',
      icon: PackageCheck,
    },
  ];

  const getStatusIndex = (st: OrderStatus): number => {
    switch (st) {
      case 'recebido':
        return 0;
      case 'em_producao':
        return 1;
      case 'em_rota':
        return 2;
      case 'finalizado':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStatusIndex(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-amber-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Etapa 04 de 04 • Rastreamento ao Vivo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
              <span>Pedido</span>
              <span className="text-amber-600 font-mono">{order.displayId}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Copiar código do pedido"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Realizado às {formatDateTime(order.createdAt)}</span>
              <span>•</span>
              <span>Cliente: {order.customer.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Avisar no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Live Status Analysis Stepper (as requested: recebido, em produção, em rota, finalizado) */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Status da Análise do Pedido:
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400 text-slate-950 animate-pulse">
              ● Atualizado em tempo real
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const Icon = step.icon;

              return (
                <div
                  key={step.key}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-300 shadow-sm'
                      : isPast
                      ? 'bg-amber-50/60 border-amber-200 text-slate-700'
                      : 'bg-slate-50/50 border-slate-200 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : isPast
                          ? 'bg-amber-400 text-amber-950 font-extrabold'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4 stroke-[2.5]" />
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                        Agora
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3 stroke-[3]" /> Concluído
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 mb-0.5">
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Itemized Summary Card */}
      <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-sm mb-6">
        <h2 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-4">
          Detalhes da Comanda
        </h2>

        <div className="divide-y divide-slate-100 mb-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-3 flex items-start justify-between gap-3 text-sm">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-amber-600 font-mono">
                    {item.quantity}x
                  </span>
                  <span className="font-bold text-slate-900">{item.product.name}</span>
                </div>

                {/* Complements */}
                {item.selectedComplements && item.selectedComplements.length > 0 && (
                  <div className="text-xs text-slate-600 ml-6 mt-1">
                    <span className="font-semibold text-amber-900">Complementos: </span>
                    {item.selectedComplements.map((c) => c.name).join(', ')}
                  </div>
                )}

                {/* Promotion badge */}
                {item.appliedPromotion && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded ml-6 mt-1">
                    <Tag className="w-3 h-3" />
                    <span>Promoção aplicada ({item.appliedPromotion.promoQuantity} un)</span>
                  </div>
                )}

                {item.notes && (
                  <p className="text-xs text-slate-500 italic ml-6 mt-1">
                    Obs: {item.notes}
                  </p>
                )}
              </div>

              <span className="font-mono tabular-nums font-bold text-slate-900">
                {formatCurrency(item.totalPrice)}
              </span>
            </div>
          ))}
        </div>

        {/* Breakdown */}
        <div className="pt-3 border-t border-amber-100 space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxa de Entrega ({order.customer.deliveryType})</span>
            <span className="font-mono tabular-nums">
              {order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : 'Grátis'}
            </span>
          </div>
          <div className="pt-2 border-t border-amber-200 flex justify-between text-base font-black text-slate-950">
            <span>Total da Comanda</span>
            <span className="font-mono tabular-nums text-lg text-slate-950">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        {/* Customer & Address Details + Change info */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-bold">Destino:</span>
            <span>
              {order.customer.deliveryType === 'delivery' && order.customer.address
                ? `${order.customer.address.street}, ${order.customer.address.number} - ${order.customer.address.neighborhood} (${order.customer.address.complement || ''})`
                : order.customer.deliveryType === 'mesa'
                ? `Consumo no local - ${order.customer.tableNumber || 'Mesa não informada'}`
                : 'Retirada no Balcão'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-bold">Forma de Pagamento:</span>
            <span className="capitalize">{order.customer.paymentMethod.replace('_', ' ')}</span>
          </div>

          {order.customer.paymentMethod === 'dinheiro' && order.customer.cashGiven && (
            <div className="p-2.5 rounded-xl bg-white border border-amber-300 text-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Pago em dinheiro: {formatCurrency(order.customer.cashGiven)}</span>
              </div>
              <span className="font-black text-emerald-700">
                Troco a levar: {formatCurrency(order.customer.changeToReturn || 0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Button to Start New Order */}
      <div className="text-center space-y-3">
        <button
          type="button"
          onClick={onNewOrder}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Fazer Outro Pedido no Cardápio</span>
        </button>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Desenvolvido por SF TECNOLOGIA
        </p>
      </div>
    </div>
  );
};
