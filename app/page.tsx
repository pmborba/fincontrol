"use client";

import React, { useState } from 'react';
import { 
  Home, Utensils, Car, ShoppingBag, TrendingUp, 
  Plus, ChevronDown, ChevronUp, Pill, HeartPulse, 
  GraduationCap, Zap, Plane, Gift, MoreHorizontal 
} from 'lucide-react';

// --- Configuração das Categorias ---
const categories = [
  // Principais (Aparecem primeiro)
  { id: 'moradia', label: 'Moradia', icon: <Home size={18} />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'alimentacao', label: 'Alimentação', icon: <Utensils size={18} />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'transporte', label: 'Transporte', icon: <Car size={18} />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'compras', label: 'Compras', icon: <ShoppingBag size={18} />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'investimento', label: 'Investimento', icon: <TrendingUp size={18} />, color: 'bg-green-100 text-green-700 border-green-200' },
  
  // Secundárias (Aparecem ao clicar em "Mais")
  { id: 'saude', label: 'Saúde', icon: <HeartPulse size={18} />, color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'educacao', label: 'Educação', icon: <GraduationCap size={18} />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'contas', label: 'Contas Fixas', icon: <Zap size={18} />, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'viagem', label: 'Viagem', icon: <Plane size={18} />, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'lazer', label: 'Lazer', icon: <Gift size={18} />, color: 'bg-pink-100 text-pink-700 border-pink-200' },
];

export default function FinanceApp() {
  // Estados
  const [isFormOpen, setIsFormOpen] = useState(false); // Começa fechado para priorizar a leitura
  const [showAllCategories, setShowAllCategories] = useState(false); // Controla o botão "Mais"
  const [selectedCategory, setSelectedCategory] = useState('moradia');

  // Dados fictícios para visualização
  const transactions = [
    { id: 1, desc: 'Supermercado Angeloni', val: -450.00, date: 'Hoje', cat: 'Alimentação' },
    { id: 2, desc: 'Posto Ipiranga', val: -200.00, date: 'Ontem', cat: 'Transporte' },
    { id: 3, desc: 'Freelance Projeto X', val: 1200.00, date: '02/01', cat: 'Investimento' },
    { id: 4, desc: 'Aluguel', val: -1800.00, date: '01/01', cat: 'Moradia' },
  ];

  // Lógica para exibir categorias: Se showAllCategories for false, mostra apenas as 5 primeiras
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 5);

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto font-sans">
      
      {/* --- Cabeçalho Simples --- */}
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Minhas Finanças</h1>
          <p className="text-sm text-gray-500">Saldo atual: <span className="text-green-600 font-bold">R$ 4.250,00</span></p>
        </div>
        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
          U
        </div>
      </header>

      {/* --- Seção Novo Lançamento (Expansível) --- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all duration-300">
        
        {/* Botão que controla a expansão */}
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="font-semibold text-gray-700 flex items-center gap-2">
            {isFormOpen ? <ChevronUp size={20}/> : <Plus size={20} className="text-blue-600"/>}
            {isFormOpen ? "Cancelar Lançamento" : "Novo Lançamento"}
          </span>
          {/* Indicador visual se está fechado ou aberto */}
          {!isFormOpen && <ChevronDown size={16} className="text-gray-400"/>}
        </button>

        {/* Área do Formulário (Só aparece se isFormOpen === true) */}
        {isFormOpen && (
          <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            
            {/* Input Valor */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase ml-1">Valor</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                <input 
                  type="number" 
                  placeholder="0,00" 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-300"
                />
              </div>
            </div>

            {/* Input Descrição */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase ml-1">Descrição</label>
              <input 
                type="text" 
                placeholder="Ex: Jantar, Gasolina..." 
                className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>

            {/* Seleção de Categorias */}
            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="text-xs text-gray-500 font-semibold uppercase">Categoria</label>
                {showAllCategories && (
                   <button onClick={() => setShowAllCategories(false)} className="text-xs text-blue-600 hover:underline">
                     Mostrar menos
                   </button>
                )}
              </div>

              {/* Container de Scroll ou Grid */}
              <div className={`flex gap-3 ${showAllCategories ? 'flex-wrap' : 'overflow-x-auto pb-2 snap-x'}`}>
                
                {visibleCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap snap-start
                      ${selectedCategory === cat.id 
                        ? `${cat.color} ring-2 ring-offset-1 ring-gray-200 font-bold shadow-sm` 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                    `}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}

                {/* Botão "Mais Categorias" (Só aparece se NÃO estiver mostrando tudo) */}
                {!showAllCategories && (
                  <button
                    onClick={() => setShowAllCategories(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 whitespace-nowrap"
                  >
                    <MoreHorizontal size={18} />
                    <span>Mais...</span>
                  </button>
                )}
              </div>
            </div>

            {/* Botão Salvar */}
            <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-transform active:scale-95 mt-2">
              Adicionar Lançamento
            </button>
          </div>
        )}
      </section>

      {/* --- Lista de Últimos Lançamentos (Extrato) --- */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Últimas Movimentações</h2>
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  {/* Ícone dinâmico simples baseado na primeira letra da categoria */}
                  <span className="text-lg font-bold">{t.cat.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{t.desc}</p>
                  <p className="text-xs text-gray-400">{t.cat} • {t.date}</p>
                </div>
              </div>
              <span className={`font-bold ${t.val < 0 ? 'text-gray-800' : 'text-green-600'}`}>
                {t.val < 0 ? `- R$ ${Math.abs(t.val).toFixed(2)}` : `+ R$ ${t.val.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}