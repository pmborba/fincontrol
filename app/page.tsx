'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '../utils/supabase/client';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, 
  CheckCircle2, Repeat, Wallet, Car, Utensils, 
  Home, ShoppingBag, TrendingUp, HeartPulse, 
  GraduationCap, Zap, Plane, Gift, MoreHorizontal 
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL DAS CATEGORIAS ---
const CATEGORIES_UI = [
  // Principais
  { id: 1, name: 'Moradia', icon: <Home size={18} />, color: 'bg-purple-100 text-purple-600 border-purple-200' },
  { id: 2, name: 'Alimentação', icon: <Utensils size={18} />, color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { id: 3, name: 'Transporte', icon: <Car size={18} />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { id: 4, name: 'Compras', icon: <ShoppingBag size={18} />, color: 'bg-pink-100 text-pink-600 border-pink-200' },
  
  // Secundárias (Inicialmente Ocultas)
  { id: 5, name: 'Investimento', icon: <TrendingUp size={18} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
  { id: 6, name: 'Saúde', icon: <HeartPulse size={18} />, color: 'bg-red-100 text-red-600 border-red-200' },
  { id: 7, name: 'Educação', icon: <GraduationCap size={18} />, color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
  { id: 8, name: 'Contas Fixas', icon: <Zap size={18} />, color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { id: 9, name: 'Viagem', icon: <Plane size={18} />, color: 'bg-sky-100 text-sky-600 border-sky-200' },
  { id: 10, name: 'Lazer', icon: <Gift size={18} />, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
];

export default function Dashboard() {
  const supabase = createClient();

  // --- ESTADOS ---
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Estado para controlar expansão das categorias
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Estados do Formulário Novo
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: 1,
    status: 'pending' 
  });

  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('monthly');
  const [installments, setInstallments] = useState(2);

  // --- BUSCAR DADOS ---
  const fetchData = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0).toISOString();

    const { data: billsData, error } = await supabase
      .from('bills')
      .select('*, categories(name)')
      .gte('due_date', startOfMonth)
      .lte('due_date', endOfMonth)
      .order('due_date', { ascending: true });

    if (error) {
        console.error("Erro ao buscar dados:", error);
    }

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

  const addBill = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const loopCount = isRecurrent ? installments : 1;
    const billsToInsert = [];
    let baseDate = new Date(formData.date);
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
        });
    }

    const { error } = await supabase.from('bills').insert(billsToInsert);

    if (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar lançamento.');
    } else {
        await fetchData();
        setFormData({ ...formData, title: '', amount: '' });
        setIsRecurrent(false);
    }
    setLoading(false);
  };

  const payBill = async (id: number, amount: number) => {
    setBills(prev => prev.map(bill => bill.id === id ? { ...bill, status: 'paid', amount_paid: amount } : bill));

    const { error } = await supabase
        .from('bills')
        .update({ status: 'paid', amount_paid: amount })
        .eq('id', id);
        
    if (error) console.error("Erro ao atualizar", error);
  };

  // --- LÓGICA DE EXIBIÇÃO DAS CATEGORIAS ---
  // Se estiver fechado, mostra só as 4 primeiras. Se aberto, mostra tudo.
  const visibleCategories = showAllCategories ? CATEGORIES_UI : CATEGORIES_UI.slice(0, 4);

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

      {/* FORMULÁRIO */}
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
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Categoria</label>
                    {showAllCategories && (
                         <button type="button" onClick={() => setShowAllCategories(false)} className="text-xs font-bold text-blue-600 hover:underline">
                            Mostrar menos
                         </button>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2 transition-all">
                    {visibleCategories.map(cat => (
                        <button
                            key={cat.id} type="button"
                            onClick={() => setFormData({...formData, categoryId: cat.id})}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                                formData.categoryId === cat.id 
                                ? `${cat.color} ring-2 ring-offset-1 ring-slate-200 scale-105` 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {cat.icon} {cat.name}
                        </button>
                    ))}

                    {/* BOTÃO MAIS CATEGORIAS */}
                    {!showAllCategories && (
                        <button 
                            type="button"
                            onClick={() => setShowAllCategories(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 font-semibold text-sm hover:bg-slate-100 hover:border-slate-400 transition-all"
                        >
                            <MoreHorizontal size={18} />
                            Mais...
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Vencimento</label>
                    <input 
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        required 
                        className="p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 font-medium" 
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status Inicial</label>
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                        <button 
                            type="button" onClick={() => setFormData({...formData, status: 'pending'})}
                            className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${formData.status === 'pending' ? 'bg-orange-100 text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Pendente
                        </button>
                        <button 
                            type="button" onClick={() => setFormData({...formData, status: 'paid'})}
                            className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${formData.status === 'paid' ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Pago
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-3">
                <input 
                    type="checkbox" id="rec" checked={isRecurrent} 
                    onChange={(e) => setIsRecurrent(e.target.checked)} 
                    className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                    <label htmlFor="rec" className="font-bold text-slate-700 cursor-pointer select-none">Repetir lançamento</label>
                    <p className="text-xs text-slate-400">Criar parcelas automaticamente</p>
                    
                    {isRecurrent && (
                        <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                            <select 
                                value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}
                                className="p-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 focus:outline-none focus:border-blue-400"
                            >
                                <option value="monthly">Mensal</option>
                                <option value="weekly">Semanal</option>
                            </select>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2">
                                <input 
                                    type="number" min="2" max="360" value={installments} 
                                    onChange={(e) => setInstallments(parseInt(e.target.value))}
                                    className="w-full p-2 text-sm font-bold text-slate-700 outline-none"
                                />
                                <span className="text-xs text-slate-400 font-bold pr-1">x</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" disabled={loading} className="mt-2 bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98] flex justify-center items-center gap-2">
                {loading ? 'Salvando...' : <><CheckCircle2 size={20}/> Confirmar Lançamento</>}
            </button>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 px-1 flex items-center gap-2">
            <Wallet size={20} className="text-slate-400"/>
            Movimentações de {monthLabel}
        </h2>
        
        {loading && <div className="text-center p-8 text-slate-400 animate-pulse">Carregando dados...</div>}
        
        {!loading && bills.length === 0 && (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-500 font-medium">Nenhum lançamento neste mês.</p>
            </div>
        )}

        <div className="flex flex-col gap-3">
            {bills.map((bill) => {
                const catId = bill.category_id; 
                const catUI = CATEGORIES_UI.find(c => c.id === catId) || CATEGORIES_UI[0];

                return (
                    <div key={bill.id} className="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div 
                                onClick={() => bill.status !== 'paid' && payBill(bill.id, bill.amount_estimated)}
                                className={`cursor-pointer w-12 h-12 rounded-full flex items-center justify-center transition-all ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500'}`}
                            >
                                {bill.status === 'paid' ? <CheckCircle2 size={24} /> : catUI.icon}
                            </div>
                            <div>
                                <h4 className={`font-bold text-base ${bill.status === 'paid' ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                    {bill.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-slate-400">{new Date(bill.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                                    {bill.total_installments > 1 && (
                                        <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold flex items-center gap-1">
                                            <Repeat size={10} /> {bill.current_installment}/{bill.total_installments}
                                        </span>
                                    )}
                                     <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                                        {bill.categories?.name || catUI.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className={`text-lg font-bold ${bill.status === 'paid' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                - R$ {bill.status === 'paid' ? bill.amount_paid?.toFixed(2) : bill.amount_estimated?.toFixed(2)}
                             </div>
                             <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                                {bill.status === 'paid' ? 'Pago' : 'Aberto'}
                             </span>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </main>
  );
}