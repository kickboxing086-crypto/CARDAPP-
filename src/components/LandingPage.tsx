import React, { useState } from 'react';
import {
  CheckCircle2,
  TrendingUp,
  DollarSign,
  QrCode,
  Printer,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
  Clock,
  Zap,
  Store,
  ChevronDown,
  ChevronUp,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { formatCurrency } from '../utils/formatters';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenDemoMenu: () => void;
  onOpenCeoPanelDirectly?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenDemoMenu,
}) => {
  // Calculator state
  const [monthlySales, setMonthlySales] = useState<number>(10000);
  const appFeePercentage = 0.27; // 27% average fees on delivery apps
  const appLoss = monthlySales * appFeePercentage;
  const cardappCost = 24.99;
  const savedAmount = appLoss - cardappCost;

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLandingLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/?view=landing`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const faqs = [
    {
      q: 'Preciso pagar comissão por cada pedido vendido?',
      a: 'NÃO! Zero porcento de taxa. Todo o dinheiro dos pedidos vai 100% direto para você via Pix, dinheiro ou sua própria maquininha. Você paga apenas R$ 24,99 fixos por mês.',
    },
    {
      q: 'Preciso de computador ou posso usar no celular?',
      a: 'Você pode usar tudo 100% pelo celular, tablet ou computador. Tanto para cadastrar produtos quanto para receber e atualizar os pedidos em tempo real.',
    },
    {
      q: 'Como os clientes fazem os pedidos?',
      a: 'O cliente clica no link do seu cardápio (na bio do Instagram, WhatsApp ou lendo o QR Code da mesa), escolhe os produtos, adiciona complementos e o pedido chega organizado diretamente no seu WhatsApp e no seu painel.',
    },
    {
      q: 'Existe contrato de fidelidade ou multa de cancelamento?',
      a: 'Nenhuma fidelidade. Você pode cancelar a qualquer momento sem burocracia.',
    },
    {
      q: 'Quanto tempo leva para colocar minha loja no ar?',
      a: 'Menos de 10 minutos! Assim que sua conta for ativada pela SF TECNOLOGIA, você cadastra seus pratos, coloca sua logo e já pode compartilhar o link.',
    },
  ];

  // Official direct WhatsApp integration without displaying the raw phone number to visitors
  const handleOpenWhatsapp = (customTopic?: string) => {
    const defaultText =
      'Olá! Tenho interesse no cardápio digital CARDAPP (R$ 24,99/mês) da SF TECNOLOGIA. Gostaria de mais informações e de ativar a minha loja agora mesmo.';
    const textToSend = customTopic || defaultText;
    const url = `https://wa.me/5584986113980?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-slate-900 selection:bg-amber-400 selection:text-slate-950 font-sans overflow-x-hidden">
      {/* Top Banner */}
      <div className="bg-slate-950 text-amber-300 py-2.5 px-3 text-xs font-bold text-center flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="truncate max-w-full">
          Plano Especial: Cardápio Digital Completo por apenas <strong>R$ 24,99/mês</strong>. Sem comissão por pedido!
        </span>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm shrink-0">
              <ForkKnifeIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.3]" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-950 font-display">
                CARD<span className="text-amber-500">APP</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 ml-1.5">
                Oficial
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleCopyLandingLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 border border-slate-200 transition-all cursor-pointer"
              title="Copiar Link da Página"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5 text-amber-600" />}
              <span className="text-[11px]">{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-slate-800 hover:bg-amber-50 border border-slate-200 transition-all cursor-pointer"
            >
              <ForkKnifeIcon className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden xs:inline">Ver Cardápio</span>
            </button>

            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs transition-all cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-slate-800" />
              <span>Entrar</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenWhatsapp()}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="hidden sm:inline">Assinar</span>
              <span className="text-[11px] sm:text-xs">R$ 24,99</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-amber-300/20 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 text-center space-y-5 sm:space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300/80 text-amber-950 text-[11px] sm:text-xs font-black shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>CARDÁPIO DIGITAL COM TAXA ZERO POR PEDIDO</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight font-display leading-tight max-w-3xl mx-auto">
            Venda mais no seu restaurante sem pagar <span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">comissões abusivas</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xs sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Tenha seu próprio cardápio digital interativo, receba pedidos organizados no WhatsApp, imprima comandas para a cozinha e acompanhe seu lucro em tempo real. Por apenas <strong>R$ 24,99/mês</strong>.
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenWhatsapp()}
              className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <span>Quero Meu Cardápio por R$ 24,99/mês</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-2xl bg-white hover:bg-amber-50 border-2 border-amber-400 text-slate-950 font-black text-sm sm:text-base transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ForkKnifeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 stroke-[2.2]" />
              <span>Ver Cardápio de Demonstração</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLandingLink}
              className="w-full sm:w-auto px-5 py-3.5 sm:py-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-slate-900 font-black text-sm sm:text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              title="Copiar Link da Página para Divulgação"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span className="text-emerald-700">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-700" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>

          {/* Trust points */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sem taxas por pedido
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sem fidelidade
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ativação rápida
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> R$ 24,99/mês fixo
            </span>
          </div>
        </div>
      </section>

      {/* CALCULADORA DE ECONOMIA */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-amber-50/70 to-white border-y border-amber-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center space-y-1.5 mb-8">
            <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider">
              Simulador de Economia
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-950 font-display">
              Veja quanto dinheiro você economiza por mês
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Grandes aplicativos cobram até 27% sobre todas as vendas. Com o CARDAPP você retém 100% da sua receita.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-amber-300 p-5 sm:p-7 shadow-xl space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                  Faturamento mensal em delivery:
                </label>
                <span className="text-lg sm:text-2xl font-black text-slate-950 font-display">
                  {formatCurrency(monthlySales)}
                </span>
              </div>

              <input
                type="range"
                min="2000"
                max="50000"
                step="1000"
                value={monthlySales}
                onChange={(e) => setMonthlySales(Number(e.target.value))}
                className="w-full h-3 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500">
                <span>R$ 2.000</span>
                <span>R$ 15.000</span>
                <span>R$ 30.000</span>
                <span>R$ 50.000</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-center">
                <span className="text-[10px] font-bold text-red-700 uppercase block mb-0.5">
                  Taxas de Apps (27%)
                </span>
                <span className="text-lg sm:text-xl font-black text-red-600">
                  -{formatCurrency(appLoss)}
                </span>
                <span className="text-[10px] text-red-600 block mt-0.5">perdido todo mês</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-center">
                <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">
                  Com o CARDAPP
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-950">
                  R$ 24,99
                </span>
                <span className="text-[10px] text-slate-700 block mt-0.5">mensalidade fixa</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center">
                <span className="text-[10px] font-black text-emerald-800 uppercase block mb-0.5">
                  Sua Economia no Mês
                </span>
                <span className="text-lg sm:text-2xl font-black text-emerald-600">
                  {formatCurrency(savedAmount)}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">dinheiro no seu bolso!</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                Garantir Minha Loja por R$ 24,99/mês
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="py-14 sm:py-20 max-w-5xl mx-auto px-4">
        <div className="text-center space-y-1.5 mb-10">
          <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider">
            Funcionalidades Profissionais
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 font-display">
            Tudo o que seu negócio precisa para vender mais
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-white border border-amber-300 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-950 font-display">
              Pedidos Formatados no WhatsApp
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              O cliente monta o pedido completo e a comanda chega 100% calculada no seu WhatsApp, eliminando erros e demora no atendimento.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-300 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-950 font-display">
              QR Code para Mesas e Balcão
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Imprima seu QR Code direto do sistema para as mesas. O cliente aponta a câmera e faz o pedido com rapidez.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-300 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-950 font-display">
              Promoções e Complementos
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Crie combos promocionais (ex: 2 unidades por R$ 8,00) e adicione complementos e adicionais para aumentar seu ticket médio.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-300 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-950 font-display">
              Impressão de Comandas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Imprima comandas de cozinha com 1 clique contendo itens, adicionais, troco e endereço formatados.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-300 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-950 font-display">
              Painel Financeiro & Entradas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitore sua receita por data de entrada, ticket médio e métodos de pagamento com controle total.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-300 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-950 font-display">
              Status do Pedido em 4 Etapas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Recebido, Em produção, Em rota e Finalizado. Acompanhamento em tempo real para o cliente.
            </p>
          </div>
        </div>
      </section>

      {/* PLANO R$ 24,99 */}
      <section className="py-14 sm:py-20 bg-slate-950 text-white relative">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center space-y-2 mb-8">
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-widest">
              Investimento Acessível
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-display">
              Plano Restaurante Pro
            </h2>
            <p className="text-xs text-slate-400">
              Acesso total ao sistema por apenas R$ 24,99 por mês
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-950 shadow-2xl border-2 border-amber-400 relative">
            <div className="text-center pb-5 border-b border-amber-200 space-y-1">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm font-bold text-slate-500">R$</span>
                <span className="text-4xl sm:text-5xl font-black text-slate-950 font-display">24,99</span>
                <span className="text-sm font-bold text-slate-600">/ mês</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
                Menos de R$ 0,85 por dia
              </span>
            </div>

            <ul className="py-5 space-y-2.5 text-xs font-bold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cardápio digital responsivo com fotos e complementos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero comissões e zero taxas por pedido</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Painel administrativo com controle em tempo real</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>QR Code oficial para balcão e mesas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Impressão de comandas formatadas com 1 clique</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Painel financeiro de controle de entradas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Suporte direto com a SF TECNOLOGIA</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => handleOpenWhatsapp('Olá! Quero assinar o CARDAPP por R$ 24,99/mês. Gostaria de ativar a minha loja!')}
              className="w-full py-3.5 sm:py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-sm sm:text-base transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Quero Assinar por R$ 24,99/mês</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </section>

      {/* DÚVIDAS / FAQ */}
      <section className="py-14 sm:py-20 max-w-2xl mx-auto px-4">
        <div className="text-center space-y-1.5 mb-8">
          <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider">
            Tire suas dúvidas
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 font-display">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 font-black text-xs sm:text-sm text-slate-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-900 text-xs">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold">
              <ForkKnifeIcon className="w-4 h-4 stroke-[2.3]" />
            </div>
            <span className="font-extrabold text-sm text-white font-display">
              CARD<span className="text-amber-400">APP</span>
            </span>
          </div>

          <div className="text-center">
            <p className="text-amber-400 font-bold text-xs">
              Desenvolvido por SF TECNOLOGIA
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              © {new Date().getFullYear()} • Todos os direitos reservados
            </p>
          </div>

          <div className="flex items-center gap-3 font-bold text-[11px]">
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              Área do Lojista
            </button>
            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Cardápio Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
