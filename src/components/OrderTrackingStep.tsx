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
  UtensilsCrossed,
  Bell,
  BellRing,
} from 'lucide-react';
import { Order, OrderStatus, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { getOrderWhatsAppUrl } from '../utils/comandaFormatter';
import { requestPushPermission, playNotificationSound } from '../utils/notificationService';

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
  const [notificationsActive, setNotificationsActive] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const handleEnableNotifications = async () => {
    const perm = await requestPushPermission();
    if (perm === 'granted') {
      setNotificationsActive(true);
      playNotificationSound();
    }
  };

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

  const isTable = order.customer.deliveryType === 'mesa';
  const isPickup = order.customer.deliveryType === 'retirada';
  const tableLabel = order.customer.tableNumber ? `Mesa ${order.customer.tableNumber}` : 'sua Mesa';

  const openWhatsApp = () => {
    const url = getOrderWhatsAppUrl(order, settings);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const statusSteps: {
    key: OrderStatus;
    title: string;
    description: string;
    icon: React.ElementType;
  }[] = isTable
    ? [
        {
          key: 'recebido',
          title: '1. Na Cozinha',
          description: `Pedido anotado para a ${tableLabel} e enviado diretamente para a cozinha`,
          icon: CheckCircle2,
        },
        {
          key: 'em_producao',
          title: '2. Em Preparo',
          description: 'Ingredientes frescos selecionados e preparo em andamento pelo chef',
          icon: ChefHat,
        },
        {
          key: 'em_rota',
          title: '3. Saindo para sua Mesa!',
          description: 'Prato pronto! O atendente/garçom já está levando o pedido até a sua mesa.',
          icon: UtensilsCrossed,
        },
        {
          key: 'finalizado',
          title: '4. Servido na Mesa',
          description: 'Pedido servido na sua mesa com sucesso! Tenha um excelente apetite!',
          icon: PackageCheck,
        },
      ]
    : isPickup
    ? [
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
          title: '3. Pronto para Retirada',
          description: 'Pedido embalado e pronto para você retirar no balcão',
          icon: PackageCheck,
        },
        {
          key: 'finalizado',
          title: '4. Retirado no Balcão',
          description: 'Pedido entregue com sucesso! Bom apetite!',
          icon: CheckCircle2,
        },
      ]
    : [
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
          title: '3. Em Rota de Entrega',
          description: 'Entregador em deslocamento com seu pacote aquecido até seu endereço',
          icon: Bike,
        },
        {
          key: 'finalizado',
          title: '4. Entregue',
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
      {/* Table Special Live Notification Banner */}
      {isTable && order.status === 'em_rota' && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-amber-400 text-slate-950 border-2 border-amber-500 shadow-lg flex items-center gap-3.5 sm:gap-4 animate-in slide-in-from-top-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            <UtensilsCrossed className="w-6 h-6 stroke-[2.4]" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-950 text-amber-300 inline-block mb-1">
              Prato Pronto • Saindo Agora!
            </span>
            <h3 className="font-black text-sm sm:text-base leading-tight">
              O seu pedido já está saindo para ser entregue na sua mesa!
            </h3>
            <p className="text-xs font-semibold text-slate-900 mt-0.5">
              Nossa equipe já está a caminho com o seu pedido para a <strong>{tableLabel}</strong>. Fique à vontade!
            </p>
          </div>
        </div>
      )}

      {isTable && order.status === 'em_producao' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-slate-900 flex items-center gap-3 text-xs sm:text-sm">
          <ChefHat className="w-5 h-5 text-amber-700 shrink-0" />
          <span>
            <strong>Atendimento na {tableLabel}:</strong> Seus pratos estão sendo preparados fresquinhos na cozinha!
          </span>
        </div>
      )}

      {/* BANNER DE ENVIO / CONFIRMAÇÃO DO WHATSAPP DA LOJA */}
      <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-emerald-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-emerald-400 animate-in slide-in-from-top-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-7 h-7 fill-white text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-emerald-950 inline-block mb-1">
              Envio Imediato para a Loja
            </span>
            <h3 className="font-black text-sm sm:text-base leading-tight">
              Pedido Gerado com Sucesso! Envie agora no WhatsApp da Loja
            </h3>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              Clique no botão ao lado para enviar a comanda completa com todos os itens diretamente para o atendimento do restaurante.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openWhatsApp}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <MessageCircle className="w-4 h-4 fill-emerald-700 text-emerald-700" />
          <span>Enviar no WhatsApp da Loja</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-amber-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                {isTable
                  ? `Etapa 04 de 04 • Atendimento na ${tableLabel}`
                  : 'Etapa 04 de 04 • Rastreamento ao Vivo'}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                notificationsActive
                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-300/50'
              }`}
              title="Receber alertas sonoros e notificação push quando o status mudar"
            >
              <BellRing className={`w-4 h-4 ${notificationsActive ? 'text-amber-700' : 'text-slate-950 animate-bounce'}`} />
              <span>{notificationsActive ? 'Alertas Push Ativos' : 'Ativar Alertas na Tela'}</span>
            </button>

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

        {/* Live Status Analysis Stepper */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              {isTable
                ? `Status do Pedido na ${tableLabel}:`
                : 'Status da Análise do Pedido:'}
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
            <span>
              {isTable
                ? 'Taxa de Serviço no Salão'
                : isPickup
                ? 'Taxa de Retirada no Balcão'
                : 'Taxa de Entrega (Delivery)'}
            </span>
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
                ? `${order.customer.address.street}, ${order.customer.address.number} - ${order.customer.address.neighborhood}${order.customer.address.complement ? ` (${order.customer.address.complement})` : ''} • ${order.customer.address.city}${order.customer.address.cep ? ` [CEP: ${order.customer.address.cep}]` : ''}`
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
