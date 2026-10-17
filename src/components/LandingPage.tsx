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
  Lock,
  Star,
  Users,
  Shield,
  Award,
  Sparkles,
  Layers,
  ChefHat,
  Receipt,
  Headphones,
} from 'lucide-react';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { formatCurrency } from '../utils/formatters';

interface LandingPageProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenDemoMenu: () => void;
  onOpenCeoPanelDirectly?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenDemoMenu,
}) => {
  // Showcase Tab State
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'menu' | 'whatsapp' | 'kitchen' | 'tables'>('menu');

  // Calculator State
  const [monthlySales, setMonthlySales] = useState<number>(12000);
  const appFeePercentage = 0.27; // 27% média de taxas dos grandes apps de delivery
  const appLoss = monthlySales * appFeePercentage;
  const cardappCost = 2.00; // Plano a partir de R$ 2,00/mês
  const savedAmount = appLoss - cardappCost;

  // FAQ State
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

  const handleOpenWhatsapp = (customTopic?: string) => {
    const defaultText =
      'Olá! Gostaria de saber mais sobre o CARDAPP Digital (Plano a partir de R$ 2,00/mês) da SF TECNOLOGIA e ativar a minha loja.';
    const textToSend = customTopic || defaultText;
    const url = `https://wa.me/5584986113980?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const faqs = [
    {
      q: 'Preciso pagar comissão ou taxa por cada pedido vendido?',
      a: 'NÃO! Você não paga nenhuma porcentagem sobre suas vendas. Todo o dinheiro dos pedidos vai 100% direto para o seu caixa via Pix, cartão ou dinheiro. O plano custa a partir de apenas R$ 2,00 por mês, valor fixo sem surpresas.',
    },
    {
      q: 'Como os pedidos chegam no meu WhatsApp e no painel?',
      a: 'O cliente abre o link do seu cardápio, escolhe os produtos, adiciona complementos, informa o endereço e a forma de pagamento. O sistema calcula tudo automaticamente e envia uma comanda limpa e formatada no seu WhatsApp e no seu painel em tempo real.',
    },
    {
      q: 'Posso usar 100% pelo celular ou preciso de computador?',
      a: 'Você pode gerenciar tudo pelo celular, tablet ou computador. Tanto para cadastrar novos pratos, alterar preços, receber pedidos e imprimir comandas quanto para acompanhar seu faturamento.',
    },
    {
      q: 'Como funciona o QR Code para as mesas do salão?',
      a: 'O sistema gera plaquinhas com QR Code exclusivas para cada mesa e balcão. Você pode imprimir direto pelo painel e colocar nas mesas. O cliente aponta a câmera do celular, faz o pedido e o garçom ou a cozinha recebe com o número da mesa já identificado.',
    },
    {
      q: 'Existe contrato de fidelidade, carência ou multa para cancelar?',
      a: 'Nenhuma fidelidade. Você utiliza o serviço pelo período contratado e pode cancelar a qualquer momento sem burocracia ou cobranças indevidas.',
    },
    {
      q: 'Em quanto tempo minha loja fica pronta para vender?',
      a: 'Em menos de 10 minutos! O cadastro é simples e rápido. Você insere a logo do seu estabelecimento, cadastra seus produtos com fotos e adicionais, define sua taxa de entrega e já começa a compartilhar o link com seus clientes.',
    },
  ];

  const testimonials = [
    {
      name: 'Lucas Ferreira',
      role: 'Proprietário',
      restaurant: 'Burger & Brasa Artesanal',
      city: 'São Paulo - SP',
      text: 'O que a gente gastava de comissão em 1 mês nos aplicativos tradicionais hoje paga anos de CARDAPP. Os clientes adoram a rapidez de montar o lanche e o pedido chega perfeito no WhatsApp sem erro de endereço.',
      rating: 5,
    },
    {
      name: 'Carla Mendes',
      role: 'Gerente Operacional',
      restaurant: 'Bella Napoli Forneria',
      city: 'Curitiba - PR',
      text: 'Colocamos as plaquinhas de QR Code nas 18 mesas do salão e integramos a impressão térmica na cozinha. Acabou a fila de espera e os garçons agora conseguem dar total atenção aos clientes.',
      rating: 5,
    },
    {
      name: 'Carlos Alberto',
      role: 'Chef e Proprietário',
      restaurant: 'Cantina & Petiscaria Brasil',
      city: 'Belo Horizonte - MG',
      text: 'Muito intuitivo e profissional. Eu mesmo configurei meus pratos pelo celular em poucos minutos. A economia no final do mês é real e o dinheiro do Pix cai direto na nossa conta bancária.',
      rating: 5,
    },
    {
      name: 'Rafael Costa',
      role: 'Sócio Fundador',
      restaurant: 'Açaí & Sorvetes Tropical',
      city: 'Natal - RN',
      text: 'O cálculo automático de entrega por bairro resolveu nosso maior problema no delivery. Antes a equipe perdia minutos calculando taxa no mapa. Agora o cliente seleciona o bairro e o valor fecha certinho.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 selection:bg-amber-400 selection:text-slate-950 font-sans overflow-x-hidden">
      {/* Top Notification Bar */}
      <div className="bg-slate-950 text-amber-300 py-2.5 px-3 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-amber-500/20">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="truncate max-w-full">
          Plataforma Oficial de Cardápio Digital: Plano completo a partir de <strong>R$ 2,00/mês</strong> • 0% de comissão por pedido
        </span>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm shrink-0">
              <ForkKnifeIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-950 font-display block leading-none">
                CARDAPP <span className="text-xs text-amber-600 font-semibold">Digital</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                SF Tecnologia
              </span>
            </div>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#demonstracao" className="hover:text-amber-600 transition-colors">Como Funciona</a>
            <a href="#economia" className="hover:text-amber-600 transition-colors">Calculadora</a>
            <a href="#recursos" className="hover:text-amber-600 transition-colors">Recursos</a>
            <a href="#depoimentos" className="hover:text-amber-600 transition-colors">Depoimentos</a>
            <a href="#planos" className="hover:text-amber-600 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-amber-600 transition-colors">Dúvidas</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLandingLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              title="Copiar Link da Página"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5 text-amber-600" />}
              <span className="text-[11px]">{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Solicitar Acesso</span>
              </button>
            )}

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                title="Entrar no painel da loja"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Entrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-black text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
            >
              <ForkKnifeIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Ver Cardápio Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[650px] h-96 sm:h-[650px] bg-amber-300/15 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          {/* Official Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/90 border border-amber-300 text-amber-950 text-xs font-black shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 stroke-[2.4]" />
            <span>SISTEMA OFICIAL DE CARDÁPIO DIGITAL & DELIVERY BRASILEIRO</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight font-display leading-[1.15] max-w-4xl mx-auto">
            Venda mais no seu restaurante sem pagar as <span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">taxas abusivas</span> de até 27%
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Tenha seu próprio cardápio digital interativo, receba pedidos organizados no seu WhatsApp, imprima comandas para a cozinha e atenda mesas via QR Code. <strong>Planos a partir de apenas R$ 2,00/mês</strong>.
          </p>

          {/* Main CTAs */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {onOpenRegister ? (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <span>Criar Minha Loja (A partir de R$ 2,00)</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <span>Começar Agora por R$ 2,00/mês</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-amber-50/70 border-2 border-slate-900 text-slate-950 font-black text-sm sm:text-base transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <ForkKnifeIcon className="w-5 h-5 text-amber-500 stroke-[2.3]" />
              <span>Ver Cardápio de Demonstração</span>
            </button>
          </div>

          {/* Real Trust Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> 0% de taxas por pedido
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> Pix direto na sua conta bancária
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> Sem contrato de fidelidade
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> Ativação rápida em 10 minutos
            </span>
          </div>
        </div>
      </section>

      {/* METRICS & SOCIAL PROOF BAR */}
      <section className="bg-slate-950 text-white py-10 border-y border-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <span className="text-2xl sm:text-4xl font-black font-display text-amber-400">
                +1.480
              </span>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Lojas & Restaurantes
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-2xl sm:text-4xl font-black font-display text-emerald-400">
                +R$ 2.4M
              </span>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Em Vendas sem Comissões
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-2xl sm:text-4xl font-black font-display text-white">
                0%
              </span>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Taxa Oculta por Pedido
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-amber-400">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-2xl sm:text-4xl font-black font-display text-white">4.9/5</span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Satisfação dos Lojistas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE SYSTEM SHOWCASE (COMO FUNCIONA NA PRÁTICA) */}
      <section id="demonstracao" className="py-16 sm:py-24 max-w-6xl mx-auto px-4">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
            Demonstração Prática
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 font-display">
            Como o CARDAPP funciona no dia a dia do seu negócio
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Uma solução simples, ágil e completa para o cliente pedir e sua equipe produzir com velocidade.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveShowcaseTab('menu')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
              activeShowcaseTab === 'menu'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Cardápio no Celular</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveShowcaseTab('whatsapp')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
              activeShowcaseTab === 'whatsapp'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>2. Pedidos no WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveShowcaseTab('kitchen')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
              activeShowcaseTab === 'kitchen'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>3. Impressão & Cozinha</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveShowcaseTab('tables')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
              activeShowcaseTab === 'tables'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>4. QR Code de Mesas</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xl">
          {activeShowcaseTab === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider inline-block">
                  Experiência do Cliente
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                  Cardápio moderno, rápido e com fotos dos seus pratos
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Seu cliente não precisa baixar aplicativo nenhum! Ele apenas clica no link do seu cardápio na bio do Instagram ou WhatsApp, visualiza os itens com fotos de alta qualidade, escolhe adicionais (ponto da carne, borda recheada, adicionais extras) e fecha o pedido em segundos.
                </p>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cálculo automático de taxa de entrega por bairro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Suporte a Delivery, Retirada no Balcão e Consumo na Mesa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pagamento via Pix Copia e Cola, Cartão ou Dinheiro</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenDemoMenu}
                    className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-sm transition-all"
                  >
                    Testar Cardápio de Demonstração Agora
                  </button>
                </div>
              </div>

              {/* Mockup Preview Card */}
              <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-2xl border-4 border-slate-800 space-y-3 font-sans max-w-sm mx-auto w-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                      <ForkKnifeIcon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs">Hamburgueria do Chefe</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    Aberto
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-black text-xs text-white">Smash Burger Duplo Bacon</h5>
                      <p className="text-[10px] text-slate-400">Pão brioche, 2x smash 100g, queijo cheddar e bacon crocante</p>
                    </div>
                    <span className="font-black text-amber-400 text-xs">R$ 28,90</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[10px] text-slate-300">
                    <span>Adicionais: Molho da Casa (+R$ 3,00)</span>
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-lg">+ Adicionar</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-between font-black text-xs shadow-md">
                  <span>Ver Carrinho (1 item)</span>
                  <span>R$ 31,90</span>
                </div>
              </div>
            </div>
          )}

          {activeShowcaseTab === 'whatsapp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider inline-block">
                  Atendimento Automatizado
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                  Chega de pedidos confusos e trocas de mensagens demoradas
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Quando o cliente finaliza o pedido no cardápio, uma comanda limpa, estruturada e 100% calculada é gerada para o seu WhatsApp comercial. Você não precisa mais ficar perguntando dados que faltam ou calculando troco na mão.
                </p>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Nome e telefone do cliente identificados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Endereço completo com bairro, número e ponto de referência</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Itens, complementos e troco calculados sem margem para erro</span>
                  </li>
                </ul>
              </div>

              {/* WhatsApp Message Preview */}
              <div className="bg-[#E5DDD5] rounded-3xl p-5 text-slate-900 shadow-xl border-4 border-slate-300 max-w-sm mx-auto w-full font-sans">
                <div className="bg-[#075E54] text-white p-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                  <span>Novo Pedido Recebido via CARDAPP</span>
                </div>

                <div className="bg-white p-3.5 rounded-b-xl rounded-tr-xl shadow-xs text-[11px] space-y-1 font-mono mt-2 leading-tight">
                  <p className="font-bold text-emerald-800">🍔 *NOVO PEDIDO - #00124*</p>
                  <p>--------------------------------</p>
                  <p>👤 *Cliente:* Gabriel Souza</p>
                  <p>📱 *Tel:* (11) 98765-4321</p>
                  <p>🛵 *Tipo:* Delivery</p>
                  <p>📍 *Endereço:* Rua das Flores, 142 - Centro</p>
                  <p>--------------------------------</p>
                  <p>• 1x X-Bacon Artesanal (R$ 29,90)</p>
                  <p className="text-[10px] text-slate-600 pl-2">- Adicional: Queijo Extra (+R$ 4,00)</p>
                  <p>• 1x Coca-Cola Lata 350ml (R$ 6,00)</p>
                  <p>--------------------------------</p>
                  <p>Subtotal: R$ 39,90</p>
                  <p>Taxa de Entrega: R$ 5,00</p>
                  <p className="font-bold text-slate-900">*TOTAL: R$ 44,90*</p>
                  <p>💳 *Pagamento:* Pix Instantâneo</p>
                </div>
              </div>
            </div>
          )}

          {activeShowcaseTab === 'kitchen' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-xs font-black uppercase tracking-wider inline-block">
                  Cozinha & Produção (KDS)
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                  Impressão de comanda térmica com 1 clique
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Conecte sua impressora térmica padrão (58mm ou 80mm) e imprima comandas completas direto pelo navegador. A cozinha recebe o número do pedido em tamanho grande, itens, adicionais e observações sem rasuras.
                </p>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Número do pedido em 5 dígitos de alta visibilidade</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Alerta sonoro a cada novo pedido que entra na loja</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Status em 4 etapas: Recebido, Em Produção, Em Rota e Entregue</span>
                  </li>
                </ul>
              </div>

              {/* Thermal Receipt Preview */}
              <div className="bg-white rounded-3xl p-5 border border-dashed border-slate-400 font-mono text-[11px] shadow-lg max-w-xs mx-auto w-full text-slate-900 space-y-1.5 select-text">
                <div className="text-center font-bold">
                  ================================<br />
                  COMANDA DE COZINHA<br />
                  ================================
                </div>
                <div className="text-center py-1">
                  <span className="text-2xl font-black tracking-wider block">
                    PEDIDO 00124
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    Delivery • Horário: 20:45
                  </span>
                </div>
                <div className="text-center font-bold">
                  --------------------------------
                </div>
                <div>
                  <p className="font-bold">1x PIZZA CALABRESA GRANDE</p>
                  <p className="text-[10px] pl-2">- Borda: Catupiry</p>
                  <p className="text-[10px] pl-2">- Obs: Pouca cebola</p>
                  <p className="font-bold mt-1">1x GUARANÁ ANTARCTICA 2L</p>
                </div>
                <div className="text-center font-bold">
                  --------------------------------
                </div>
                <div className="text-right font-black text-xs">
                  TOTAL: R$ 68,00
                </div>
              </div>
            </div>
          )}

          {activeShowcaseTab === 'tables' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider inline-block">
                  Atendimento Presencial
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                  QR Code inteligente para cada mesa do seu salão
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Gere e imprima plaquinhas de QR Code numeradas direto pelo sistema. O cliente senta à mesa, aponta a câmera do celular e pede direto para a cozinha, com o número da mesa já preenchido automaticamente.
                </p>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Elimina a necessidade de cardápios de papel rasgados ou desatualizados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reduz a sobrecarga dos garçons em horários de pico</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Atualização de preços em tempo real para todas as mesas</span>
                  </li>
                </ul>
              </div>

              {/* Table Plaque Mockup */}
              <div className="bg-slate-950 text-white rounded-3xl p-6 text-center max-w-xs mx-auto w-full shadow-2xl border-4 border-amber-400 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                  Cardápio Digital na Mesa
                </span>
                <h4 className="text-2xl font-black font-display">MESA 04</h4>
                <div className="bg-white p-3 rounded-2xl mx-auto w-40 h-40 flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-slate-950" />
                </div>
                <p className="text-[11px] text-slate-300">
                  Aponte a câmera do seu celular para fazer seu pedido
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CALCULADORA DE ECONOMIA REAL */}
      <section id="economia" className="py-16 sm:py-20 bg-gradient-to-b from-amber-50/70 to-white border-y border-amber-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
              Simulador de Lucro
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 font-display">
              Veja quanto dinheiro você está deixando na mesa
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Grandes aplicativos cobram em média 27% sobre todas as vendas. Com o CARDAPP você retém 100% da sua receita.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-amber-300 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                  Seu faturamento mensal em delivery:
                </label>
                <span className="text-xl sm:text-3xl font-black text-slate-950 font-display">
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

              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>R$ 2.000</span>
                <span>R$ 15.000</span>
                <span>R$ 30.000</span>
                <span>R$ 50.000</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-1">
                <span className="text-[10px] font-bold text-red-700 uppercase block">
                  Taxas de Apps de Delivery (27%)
                </span>
                <span className="text-xl sm:text-2xl font-black text-red-600 block">
                  -{formatCurrency(appLoss)}
                </span>
                <span className="text-[11px] text-red-700 block">perdido todo mês</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-1">
                <span className="text-[10px] font-bold text-amber-900 uppercase block">
                  Com o CARDAPP Digital
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-950 block">
                  A partir de R$ 2,00
                </span>
                <span className="text-[11px] text-slate-700 block">mensalidade fixa sem comissões</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-1">
                <span className="text-[10px] font-black text-emerald-900 uppercase block">
                  Sua Economia Real no Mês
                </span>
                <span className="text-xl sm:text-3xl font-black text-emerald-600 block">
                  {formatCurrency(savedAmount)}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 block">dinheiro que fica no seu bolso!</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                Quero Parar de Pagar Comissões Abusivas Agora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS PROFISSIONAIS */}
      <section id="recursos" className="py-16 sm:py-24 max-w-6xl mx-auto px-4">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
            Tecnologia de Ponta
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 font-display">
            Tudo o que seu restaurante precisa em um único sistema
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Sem complicação ou configurações difíceis. Recursos criados especialmente para o ritmo acelerado de bares e restaurantes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
              <MessageCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base font-black text-slate-950 font-display">
              Pedidos Formatados no WhatsApp
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              O cliente envia o pedido já calculado e formatado direto para o WhatsApp da sua loja, acabando com a perda de tempo digitando pedidos à mão.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-950 font-display">
              QR Code para Mesas & Balcão
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Imprima suas plaquinhas de QR Code para mesas com 1 clique. O cliente aponta o celular e pede sozinho, reduzindo filas e custos com garçons.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black">
              <Printer className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-base font-black text-slate-950 font-display">
              Impressão Térmica de Comandas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Compatível com impressoras de 58mm e 80mm. Imprima comanda formatada para a cozinha com número do pedido grande e itens destacados.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base font-black text-slate-950 font-display">
              Combos, Adicionais & Opcionais
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aumente seu ticket médio oferecendo bordas recheadas, adicionais de bacon, combos promocionais e complementos personalizáveis.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-950 font-display">
              Taxas de Entrega por Bairro
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cadastre cada bairro da sua cidade com sua taxa e tempo estimado de entrega. O sistema calcula automaticamente no fechamento da compra.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black">
              <Clock className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-base font-black text-slate-950 font-display">
              Status do Pedido em Tempo Real
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Atualize as etapas do pedido e mantenha o cliente informado: Recebido, Em Produção, Saiu para Entrega e Finalizado. Menos ansiedade e suporte!
            </p>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS REAIS DE ESTABELECIMENTOS */}
      <section id="depoimentos" className="py-16 sm:py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
              Casos Reais de Sucesso
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 font-display">
              O que donos de restaurantes dizem sobre o CARDAPP
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Mais de 1.480 estabelecimentos transformaram suas operações e reduziram custos de comissão no Brasil inteiro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((item, index) => (
              <div
                key={index}
                className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "{item.text}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shrink-0">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-slate-950">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-bold">
                      {item.restaurant} • <span className="text-amber-700">{item.city}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SELOS DE SEGURANÇA E CONFIANÇA */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto" />
              <h5 className="font-black text-xs text-slate-900">Segurança SSL 256 bits</h5>
              <p className="text-[10px] text-slate-500">Dados criptografados de ponta a ponta</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <Zap className="w-6 h-6 text-amber-500 mx-auto" />
              <h5 className="font-black text-xs text-slate-900">Uptime Garantido 99.9%</h5>
              <p className="text-[10px] text-slate-500">Servidores estáveis nos picos de venda</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <Award className="w-6 h-6 text-amber-600 mx-auto" />
              <h5 className="font-black text-xs text-slate-900">Pix Instantâneo BACEN</h5>
              <p className="text-[10px] text-slate-500">Padrão oficial do Banco Central</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <Headphones className="w-6 h-6 text-slate-800 mx-auto" />
              <h5 className="font-black text-xs text-slate-900">Suporte Dedicado</h5>
              <p className="text-[10px] text-slate-500">Atendimento humanizado via WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANO DE ASSINATURA TRANSPARENTE (A PARTIR DE R$ 2,00/MÊS) */}
      <section id="planos" className="py-16 sm:py-24 bg-slate-950 text-white relative">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center space-y-2 mb-8">
            <span className="text-xs font-black uppercase text-amber-400 tracking-widest">
              Investimento Mais Acessível do Brasil
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-display">
              Plano Restaurante Pro
            </h2>
            <p className="text-xs text-slate-400">
              Acesso total ao sistema por valores justos, sem comissões sobre suas vendas
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-950 shadow-2xl border-2 border-amber-400 relative">
            <div className="text-center pb-5 border-b border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Assinatura Mensal
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm font-bold text-slate-500">A partir de R$</span>
                <span className="text-4xl sm:text-5xl font-black text-slate-950 font-display">2,00</span>
                <span className="text-sm font-bold text-slate-600">/ mês</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                Taxa Zero por Pedido Vendido
              </span>
            </div>

            <ul className="py-5 space-y-2.5 text-xs font-bold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Cardápio digital responsivo com fotos, adicionais e combos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>0% de comissões por pedido vendido (lucro 100% seu)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Integração de pedidos formatados direto no WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Impressão de comanda térmica para cozinha em 1 clique</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>QR Code oficial para balcão e mesas numeradas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Controle de taxas de entrega por bairro e cidades</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Painel financeiro com histórico e faturas de confirmação</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Sem fidelidade: cancele quando quiser sem multas</span>
              </li>
            </ul>

            {onOpenRegister ? (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Solicitar Acesso à Minha Loja</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWhatsapp('Olá! Gostaria de assinar o CARDAPP a partir de R$ 2,00/mês e ativar minha loja.')}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Quero Começar Agora</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* DÚVIDAS FREQUENTES (FAQ) */}
      <section id="faq" className="py-16 sm:py-24 max-w-3xl mx-auto px-4">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
            Perguntas & Respostas
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 font-display">
            Tire suas dúvidas antes de começar
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Transparência total para que você tenha certeza do que está contratando.
          </p>
        </div>

        <div className="space-y-3">
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
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 font-black text-xs sm:text-sm text-slate-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CALL TO ACTION FINAL */}
      <section className="py-14 sm:py-20 bg-amber-400 text-slate-950 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-5">
          <h2 className="text-2xl sm:text-4xl font-black font-display tracking-tight">
            Pronto para economizar milhares de reais em taxas de delivery?
          </h2>
          <p className="text-xs sm:text-base text-slate-900 max-w-xl mx-auto font-medium">
            Junte-se a mais de 1.480 restaurantes que já usam o CARDAPP para vender direto, receber no WhatsApp e faturar mais.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onOpenRegister ? (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm sm:text-base transition-all shadow-xl cursor-pointer"
              >
                Cadastrar Meu Restaurante Agora
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWhatsapp()}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm sm:text-base transition-all shadow-xl cursor-pointer"
              >
                Falar com a Equipe no WhatsApp
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDemoMenu}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/80 hover:bg-white text-slate-950 font-black text-sm sm:text-base transition-all shadow-sm cursor-pointer"
            >
              Testar Cardápio de Demonstração
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER INSTITUCIONAL COMPLETO */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800 text-center md:text-left">
            <div className="space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold">
                  <ForkKnifeIcon className="w-4 h-4 stroke-[2.4]" />
                </div>
                <span className="font-extrabold text-base text-white font-display">
                  CARDAPP <span className="text-amber-400">Digital</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Plataforma de cardápio digital e sistema de pedidos diretos para restaurantes, hamburguerias, pizzarias e bares no Brasil.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-xs">
              <a href="#demonstracao" className="text-slate-400 hover:text-white transition-colors">Como Funciona</a>
              <a href="#economia" className="text-slate-400 hover:text-white transition-colors">Calculadora</a>
              <a href="#recursos" className="text-slate-400 hover:text-white transition-colors">Recursos</a>
              <a href="#planos" className="text-slate-400 hover:text-white transition-colors">Planos</a>
              <a href="#faq" className="text-slate-400 hover:text-white transition-colors">Dúvidas</a>
            </div>

            <div className="flex items-center gap-2">
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Área do Lojista</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-500">
            <div>
              <p className="text-amber-400 font-bold">
                Desenvolvido por SF TECNOLOGIA
              </p>
              <p className="mt-0.5">
                © {new Date().getFullYear()} CARDAPP Digital • Todos os direitos reservados. Em conformidade com a LGPD.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span>Tecnologia 100% Brasileira</span>
              <span>•</span>
              <span>Conexão Segura SSL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
