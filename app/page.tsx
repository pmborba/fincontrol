'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client'; // Seu import original
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, 
  CheckCircle2, Repeat, Wallet, Car, Utensils, 
  Home, ShoppingBag, TrendingUp
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL DAS CATEGORIAS ---
// Nota: O ID aqui deve bater com o ID da sua tabela 'categories' no Supabase se possível.
// Se não bater, o ícone pode não aparecer corretamente na listagem, mas o visual funciona.
const CATEGORIES_UI = [
  { id: 1, name: 'Moradia', icon: <Home size={18} />, color: 'bg-purple-100 text-purple-600 border-purple-200' },
  { id: 2, name: 'Alimentação', icon: <Utensils size={18} />, color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { id: 3, name: 'Transporte', icon: <Car size={18} />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { id: 4, name: 'Compras', icon: <ShoppingBag size={18} />, color: 'bg-pink-100 text-pink-600 border-pink-200' },
  { id: 5, name: 'Investimento', icon: <TrendingUp size={18} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
];

export default function Dashboard() {
  const supabase = createClient();

  // --- ESTADOS ---
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Estados do Formulário Novo
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: 1, // ID numérico padrão
    status: 'pending' 
  });

  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('monthly');
  const [installments, setInstallments] = useState(2);

  // --- BUSCAR DADOS (Manteve sua lógica original) ---
  const fetchData = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0).toISOString();

    const { data: billsData } = await supabase
      .from('bills')
      .select('*, categories(name)') // Trazendo o nome da categoria junto
      .gte('due_date', startOfMonth)
      .lte('due_date', endOfMonth)
      .order('due_date', { ascending: true });

    if (billsData) setBills(billsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  // --- CÁLCULOS (KPIs) ---
  const { totalPrevisto, totalPago, aPagar } = useMemo(() => {
    const previsto = bills.reduce((acc, bill) => acc + (bill.amount_estimated || 0), 0);
    const pago = bills.reduce((acc, bill) => bill.status === 'paid' ? acc + (bill.amount_paid || 0) : acc, 0);
    return { totalPrevisto: previsto, totalPago: pago, aPagar: previsto - pago };
  }, [bills]);

  const monthLabel = useMemo(() => currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), [currentDate]);

  // --- AÇÕES ---
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Função Atualizada para salvar no Supabase
  const addBill = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const loopCount = isRecurrent ? installments : 1;
    const billsToInsert = [];
    let baseDate = new Date(formData.date);
    // Ajuste fuso horário
    baseDate.setMinutes(baseDate.getMinutes() + baseDate.getTimezoneOffset());

    for (let i = 0; i < loopCount; i++) {
        const dueDate = new Date(baseDate);
        if (isRecurrent) {
            if (recurrenceType === 'monthly') dueDate.setMonth(baseDate.getMonth() + i);
            if (recurrenceType === 'weekly') dueDate.setDate(baseDate.getDate() + (i * 7));
        }

        billsToInsert.push({
            title: formData.title,
            amount_estimated: parseFloat(formData.amount),
            amount_paid: formData.status === 'paid' ? parseFloat(formData.amount) : 0,
            status: formData.status,
            due_date: dueDate.toISOString(),
            total_installments: loopCount,
            current_installment: i + 1,
            category_id: formData.categoryId,
            // Adicione user_id aqui se sua tabela exigir RLS (Row Level Security)
        });
    }

    const { error } = await supabase.from('bills').insert(billsToInsert);

    if (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar lançamento.');
    } else {
        await fetchData(); // Recarrega a lista do banco
        setFormData({ ...formData, title: '', amount: '' });
        setIsRecurrent(false);
    }
    setLoading(false);
  };

  // Função para Pagar/Atualizar no Supabase
  const payBill = async (id: number, amount: number) => {
    // Otimista: atualiza na tela antes do banco
    setBills(prev => prev.map(bill => bill.id === id ? { ...bill, status: 'paid', amount_paid: amount } : bill));

    const { error } = await supabase
        .from('bills')
        .update({ status: 'paid', amount_paid: amount })
        .eq('id', id);
        
    if (error) console.error("Erro ao atualizar", error);
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Borba Finanças</h1>
            <p className="text-slate-500 font-medium">Controle Inteligente</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600"><ChevronLeft size={20}/></button>
            <div className="text-sm font-bold w-32 text-center capitalize text-slate-800">{monthLabel}</div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600"><ChevronRight size={20}/></button>
        </div>
      </header>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Previsto</span>
          <span className="text-2xl font-bold text-slate-700">R$ {totalPrevisto.toFixed(2)}</span>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-between h-28">
          <span className="text-emerald-600/70 text-xs font-bold uppercase tracking-wider">Pago</span>
          <span className="text-2xl font-bold text-emerald-700">R$ {totalPago.toFixed(2)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-full bg-orange-500/5 skew-x-12"></div>
          <span className="text-orange-500 text-xs font-bold uppercase tracking-wider">A Pagar</span>
          <span className="text-2xl font-bold text-orange-600">R$ {aPagar.toFixed(2)}</span>
        </div>
      </div>

      {/* FORMULÁRIO (Conectado ao addBill do Supabase) */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 mb-10 overflow-hidden">
        <div className="bg-slate-900 p-4 flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg text-white">
                <Plus size={20} strokeWidth={3} />
            </div>
            <h3 className="font-bold text-white text-lg">Novo Lançamento</h3>
        </div>
        
        <form onSubmit={addBill} className="p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Descrição</label>
                    <input 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Mercado Semanal" 
                        required 
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700" 
                    />
                </div>
                <div className="md:col-span-5 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Valor</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">R$</span>
                        <input 
                            type="number" step="0.01"
                            value={formData.amount}
                            onChange={e => setFormData({...formData, amount: e.target.value})}
                            placeholder="0,00" required 
                            className="w-full p-3 pl-10 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 text-lg" 
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-