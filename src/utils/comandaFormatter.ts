import { Order, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

/**
 * Calcula a janela de horário de entrega estimada com base na hora do pedido.
 * Exemplo: Pedido às 23:07 -> Entrega prevista: 23:37 - 00:07
 */
export function getEstimatedTimeWindow(createdAtIso: string, _customEst?: string): string {
  try {
    const createdDate = new Date(createdAtIso);
    const startWindow = new Date(createdDate.getTime() + 30 * 60 * 1000);
    const endWindow = new Date(createdDate.getTime() + 60 * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${pad(startWindow.getHours())}:${pad(startWindow.getMinutes())}`;
    const endStr = `${pad(endWindow.getHours())}:${pad(endWindow.getMinutes())}`;

    return `${startStr} - ${endStr}`;
  } catch {
    return '30 - 50 min';
  }
}

/**
 * Formata o cabeçalho do tipo de entrega de forma idêntica ao papel térmico:
 * PARA ENTREGA | PARA RETIRADA | CONSUMO NO LOCAL (MESA 04)
 */
export function getDeliveryTypeLabel(order: Order): string {
  if (order.customer.deliveryType === 'delivery') {
    return 'PARA ENTREGA';
  }
  if (order.customer.deliveryType === 'retirada') {
    return 'PARA RETIRADA';
  }
  const table = order.customer.tableNumber ? `MESA ${order.customer.tableNumber}` : 'SALÃO';
  return `CONSUMO NO LOCAL - ${table}`;
}

/**
 * Gera o pedido digitado completo para envio no WhatsApp da loja,
 * com o pedido detalhado, 5 dígitos e informações do sistema.
 */
export function formatOrderWhatsAppComanda(order: Order, settings: StoreSettings): string {
  const deliveryHeader = getDeliveryTypeLabel(order);
  const estWindow = getEstimatedTimeWindow(order.createdAt, settings.estimatedDeliveryTime);

  const lines: string[] = [];

  lines.push('================================');
  lines.push(`*${deliveryHeader}*`);
  lines.push('================================');
  lines.push(`*PEDIDO ${order.displayId}*`);
  lines.push(`*Hora:* ${formatDateTime(order.createdAt).split(' ')[1]}`);
  lines.push(`*Loja:* ${settings.storeName}`);
  lines.push(`*Tempo médio de preparo:* ${estWindow}`);
  lines.push('================================');
  lines.push('');
  lines.push('*CLIENTE:*');
  lines.push(`• ${order.customer.name} (${order.customer.phone})`);

  if (order.customer.deliveryType === 'delivery' && order.customer.address) {
    const addr = order.customer.address;
    lines.push(`• Endereço: ${addr.street}, ${addr.number} - ${addr.neighborhood}`);
  } else if (order.customer.deliveryType === 'mesa') {
    lines.push(`• Atendimento: Consumir no local (${order.customer.tableNumber ? `Mesa ${order.customer.tableNumber}` : 'Salão'})`);
  } else {
    lines.push('• Retirada no Balcão');
  }

  lines.push('');
  lines.push('*PEDIDO:*');

  order.items.forEach((item) => {
    lines.push(`• (${item.quantity}) ${item.product.name} ${formatCurrency(item.totalPrice)}`);
    if (item.selectedComplements && item.selectedComplements.length > 0) {
      item.selectedComplements.forEach((c) => {
        lines.push(`   - ${c.name}${c.price > 0 ? ` (+${formatCurrency(c.price)})` : ''}`);
      });
    }
    if (item.notes) {
      lines.push(`   - Obs: ${item.notes}`);
    }
  });

  lines.push('--------------------------------');
  lines.push(`*TOTAL:* ${formatCurrency(order.total)}`);
  lines.push(`*PAGAMENTO:* ${order.customer.paymentMethod.replace('_', ' ').toUpperCase()}`);
  lines.push('================================');
  lines.push('PEDIDO VIA CARDÁPIO DIGITAL');
  lines.push('================================');

  return lines.join('\n');
}

/**
 * Cria a URL direta do WhatsApp com o pedido formatado
 */
export function getOrderWhatsAppUrl(order: Order, settings: StoreSettings): string {
  let cleanPhone = (settings.phoneWhatsapp || '').replace(/\D/g, '');
  if (cleanPhone && !cleanPhone.startsWith('55') && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
    cleanPhone = '55' + cleanPhone;
  }
  const comandaText = formatOrderWhatsAppComanda(order, settings);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(comandaText)}`;
  }
  return '';
}
