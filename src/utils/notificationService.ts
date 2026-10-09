import { Order, OrderStatus } from '../types';

/**
 * Audio Chime Synthesizer using Web Audio API
 * Plays a pleasant modern two-tone chime without external audio files.
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // First tone (higher pleasant bell)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Second tone (harmonious chord)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.6);
  } catch {
    // AudioContext blocked by browser policy until user gesture
  }
}

/**
 * Solicita permissão nativa para notificações push no navegador
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

export interface PushNotificationPayload {
  title: string;
  message: string;
  orderId: string;
  displayId: string;
  status: OrderStatus;
  deliveryType: 'delivery' | 'retirada' | 'mesa';
}

/**
 * Obtém texto humanizado para notificação com base no tipo de entrega e novo status
 */
export function getStatusNotificationMessage(
  order: Order,
  newStatus: OrderStatus
): { title: string; message: string } {
  const isTable = order.customer.deliveryType === 'mesa';
  const isPickup = order.customer.deliveryType === 'retirada';
  const tableNumber = order.customer.tableNumber || 'sua mesa';
  const idStr = `#${order.displayId}`;

  if (isTable) {
    switch (newStatus) {
      case 'recebido':
        return {
          title: `Pedido ${idStr} Na Cozinha!`,
          message: `Sua comanda da ${tableNumber} foi confirmada e está sendo processada na cozinha.`,
        };
      case 'em_producao':
        return {
          title: `👨‍🍳 Pedido ${idStr} Em Preparo!`,
          message: `O chef está preparando seu pedido com todo o carinho para a ${tableNumber}.`,
        };
      case 'em_rota':
        return {
          title: `🍽️ Saindo para sua Mesa!`,
          message: `Seu pedido ${idStr} acabou de sair e está a caminho da ${tableNumber}!`,
        };
      case 'finalizado':
        return {
          title: `✅ Pedido ${idStr} Servido!`,
          message: `Pedido entregue na ${tableNumber}. Bom apetite e tenha uma excelente refeição!`,
        };
      default:
        return {
          title: `Atualização no Pedido ${idStr}`,
          message: `O status do seu pedido mudou para ${newStatus}.`,
        };
    }
  }

  if (isPickup) {
    switch (newStatus) {
      case 'recebido':
        return {
          title: `Pedido ${idStr} Recebido!`,
          message: 'Seu pedido de retirada no balcão foi confirmado pela loja.',
        };
      case 'em_producao':
        return {
          title: `👨‍🍳 Pedido ${idStr} Em Preparo!`,
          message: 'Estamos preparando seu pedido para retirada no balcão.',
        };
      case 'em_rota':
        return {
          title: `🛍️ Pronto para Retirada!`,
          message: `Seu pedido ${idStr} está pronto no balcão da loja. Pode retirar!`,
        };
      case 'finalizado':
        return {
          title: `✅ Pedido ${idStr} Retirado!`,
          message: 'Pedido retirado com sucesso. Muito obrigado pela preferência!',
        };
      default:
        return {
          title: `Atualização no Pedido ${idStr}`,
          message: `O status do seu pedido mudou para ${newStatus}.`,
        };
    }
  }

  // Delivery
  switch (newStatus) {
    case 'recebido':
      return {
        title: `Pedido ${idStr} Confirmado!`,
        message: 'Recebemos seu pedido e ele já foi enviado para a produção.',
      };
    case 'em_producao':
      return {
        title: `👨‍🍳 Pedido ${idStr} Na Cozinha!`,
        message: 'Seu prato está sendo preparado com ingredientes frescos.',
      };
    case 'em_rota':
      return {
        title: `🛵 Saiu para Entrega!`,
        message: `O entregador já está a caminho com seu pedido ${idStr}!`,
      };
    case 'finalizado':
      return {
        title: `✅ Pedido ${idStr} Entregue!`,
        message: 'Pedido entregue com sucesso. Bom apetite e volte sempre!',
      };
    default:
      return {
        title: `Atualização no Pedido ${idStr}`,
        message: `O status do seu pedido mudou para ${newStatus}.`,
      };
  }
}

/**
 * Dispara notificação push nativa do navegador e toca som
 */
export function triggerOrderStatusNotification(order: Order, newStatus: OrderStatus) {
  const { title, message } = getStatusNotificationMessage(order, newStatus);

  // Toca o alerta sonoro
  playNotificationSound();

  // Se permitido, dispara push nativo do navegador
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `order-${order.id}-${newStatus}`,
      });
    } catch {
      // ignore
    }
  }

  return { title, message };
}
