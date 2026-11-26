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

export function formatOrderDisplayId(displayId?: string): string {
  const raw = (displayId || '').trim();
  if (!raw) return '#00001';
  if (raw.startsWith('#')) return raw;
  return `#${raw}`;
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return 'Pix';
    case 'cartao_credito':
      return 'Cartão de Crédito';
    case 'cartao_debito':
      return 'Cartão de Débito';
    default:
      return method.replace('_', ' ');
  }
}

export function normalizeWhatsAppPhone(phone?: string): string {
  let clean = (phone || '').replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('0') && (clean.length === 11 || clean.length === 12)) {
    clean = clean.slice(1);
  }
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = '55' + clean;
  }
  return clean;
}

/**
 * Gera o pedido digitado completo para envio no WhatsApp da loja,
 * com o número da comanda do dia, itens, total e rodapé CARDAPP.
 */
export function formatOrderWhatsAppComanda(order: Order, settings: StoreSettings): string {
  const deliveryHeader = getDeliveryTypeLabel(order);
  const estWindow = getEstimatedTimeWindow(order.createdAt, settings.estimatedDeliveryTime);
  const formattedId = formatOrderDisplayId(order.displayId);
  const totalItemsQty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  const lines: string[] = [];

  lines.push('================================');
  lines.push(`*${deliveryHeader}*`);
  lines.push('================================');
  lines.push(`*COMANDA ${formattedId}*`);
  lines.push(`*Hora:* ${formatDateTime(order.createdAt).split(' ')[1] || formatDateTime(order.createdAt)}`);
  lines.push(`*Loja:* ${settings.storeName}`);
  lines.push(`*Previsão:* ${estWindow}`);
  lines.push('--------------------------------');
  lines.push('*CLIENTE:*');
  lines.push(`• ${order.customer.name} (${order.customer.phone})`);

  if (order.customer.deliveryType === 'delivery' && order.customer.address) {
    const addr = order.customer.address;
    lines.push(`• Endereço: ${addr.street}, ${addr.number} - ${addr.neighborhood}`);
    if (addr.complement) {
      lines.push(`• Complemento: ${addr.complement}`);
    }
  } else if (order.customer.deliveryType === 'mesa') {
    lines.push(`• Atendimento: Consumir no local (${order.customer.tableNumber ? `Mesa ${order.customer.tableNumber}` : 'Salão'})`);
  } else {
    lines.push('• Retirada no Balcão');
  }

  lines.push('--------------------------------');
  lines.push('*ITENS DO PEDIDO*');
  lines.push('--------------------------------');

  order.items.forEach((item) => {
    lines.push(`${item.quantity} ${item.product.name} — ${formatCurrency(item.totalPrice)}`);
    if (item.selectedComplements && item.selectedComplements.length > 0) {
      item.selectedComplements.forEach((c) => {
        lines.push(`  - ${c.name}${c.price > 0 ? ` (+${formatCurrency(c.price)})` : ''}`);
      });
    }
    if (item.notes) {
      lines.push(`  - Obs: ${item.notes}`);
    }
  });

  lines.push('--------------------------------');
  lines.push(`Quantidade de itens: ${totalItemsQty}`);
  lines.push('--------------------------------');
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);
  if (order.deliveryFee > 0) {
    lines.push(`Taxa de entrega: ${formatCurrency(order.deliveryFee)}`);
  }
  lines.push(`*Total: ${formatCurrency(order.total)}*`);
  lines.push('================================');
  lines.push('*FORMAS DE PAGAMENTO*');
  lines.push(`${getPaymentMethodLabel(order.customer.paymentMethod)}: ${formatCurrency(order.total)}`);
  if (order.customer.paymentMethod === 'dinheiro' && order.customer.cashGiven) {
    lines.push(`Valor entregue: ${formatCurrency(order.customer.cashGiven)}`);
    lines.push(`Troco: ${formatCurrency(order.customer.changeToReturn || 0)}`);
  }
  lines.push('================================');
  lines.push('Fornecido por CARDAPP');
  lines.push('NÃO É DOCUMENTO FISCAL');

  return lines.join('\n');
}

/**
 * Cria a URL direta do WhatsApp com a comanda formatada
 */
export function getOrderWhatsAppUrl(order: Order, settings: StoreSettings): string {
  const cleanPhone = normalizeWhatsAppPhone(settings.phoneWhatsapp);
  const comandaText = formatOrderWhatsAppComanda(order, settings);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(comandaText)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(comandaText)}`;
}
