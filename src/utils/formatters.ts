export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'recebido':
      return 'Recebido';
    case 'em_producao':
      return 'Em Produção';
    case 'em_rota':
      return 'Em Rota';
    case 'finalizado':
      return 'Finalizado';
    default:
      return status;
  }
}

export function getStatusBadgeClasses(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'recebido':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-900',
        border: 'border-amber-300',
      };
    case 'em_producao':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-900',
        border: 'border-blue-300',
      };
    case 'em_rota':
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-900',
        border: 'border-purple-300',
      };
    case 'finalizado':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-900',
        border: 'border-emerald-300',
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-300',
      };
  }
}
