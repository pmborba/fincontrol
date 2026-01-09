'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '../utils/supabase/client';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, 
  CheckCircle2, Repeat, Wallet, Car, Utensils, 
  Home, ShoppingBag, TrendingUp, HeartPulse, 
  GraduationCap, Zap, Plane, Gift, MoreHorizontal,
  ChevronDown, ChevronUp, Trash2, X, Filter, BarChart3
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL DAS CATEGORIAS ---
// Adicionei uma propriedade 'hex' para usar nos gráficos
const CATEGORIES_UI = [
  { id: 1, name: 'Moradia', icon: <Home size={18} />, color: 'bg-purple-100 text-purple-600 border-purple-200', hex: '#9333ea' },
  { id: 2, name: 'Alimentação', icon: <Utensils size={18} />, color: 'bg-orange-100 text-orange-600 border-orange-200', hex: '#ea580c' },
  { id: 3, name: 'Transporte', icon: <Car size={18} />, color: 'bg-blue-100 text-blue-600 border-blue-200', hex: '#2563eb' },
  { id: 4, name: 'Compras', icon: <ShoppingBag size={18} />, color: 'bg-pink-100 text-pink-600 border-pink-200', hex: '#db2777' },
  { id: 5, name: 'Investimento', icon: <TrendingUp size={18} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', hex: '#059669' },
  { id: 6, name: 'Saúde', icon: <HeartPulse size={18} />, color: 'bg-red-100 text-red-600 border-red-200', hex: '#dc2626' },
  { id: 7, name: 'Educação', icon: <GraduationCap size={18} />, color: 'bg-yellow-100 text-yellow-600 border-yellow-200', hex: '#ca8a04' },
  { id: 8, name: 'Contas Fixas', icon: <Zap size={18} />, color: 'bg-gray-100 text-gray-600 border-gray-200', hex: '#4b5563' },
  { id: 9, name: 'Viagem', icon: <Plane size={18} />, color: 'bg-sky-100 text-sky-600 border-sky-200', hex: '#0284c7' },
  { id: 10, name: 'Lazer', icon: <Gift size={18} />, color: 'bg-indigo-100 text-indigo-600 border-indigo-200', hex: '#4f46e5' },
];

export default function Dashboard() {
  const supabase = createClient();

  // --- ESTADOS ---
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // UI States
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // ID do item sendo editado
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all'); // Filtro da lista

  // Formulário
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

    if (error) console.error("Erro ao buscar dados:", error);
    if (billsData) setBills(billsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  // --- MEMOS & CÁLCULOS ---
  
  // 1. KPIs
  const { totalPrevisto, totalPago, aPagar } = useMemo(() => {
    const previsto = bills.reduce((acc, bill) => acc + (bill.amount_estimated || 0), 0);
    const pago = bills.reduce((acc, bill) => bill.status === 'paid' ? acc + (bill.amount_paid || 0) : acc, 0);
    return { totalPrevisto: previsto, totalPago: pago, aPagar: previsto - pago };
  }, [bills]);

  // 2. Gráfico: Agrupamento por Categoria
  const categoryStats = useMemo(() => {
    const stats: Record<number, number> = {};
    bills.forEach(bill => {
        const amt = bill.status === 'paid' ? bill.amount_paid : bill.amount_estimated;
        stats[bill.category_id] = (stats[bill.category_id] || 0) + amt;
    });
    
    // Transformar em array e ordenar
    return Object.entries(stats)
        .map(([catId, total]) => {
            const catUI = CATEGORIES_UI.find(c => c.id === Number(catId)) || CATEGORIES_UI[0];
            return { ...catUI, total };
        })
        .sort((a, b) => b.total - a.total); // Maior para menor
  }, [bills]);

  // 3. Lista Filtrada
  const filteredBills = useMemo(() => {
    if (filterCategory === 'all') return bills;
    return bills.filter(b => b.category_id === filterCategory);
  }, [bills, filterCategory]);

  const monthLabel = useMemo(() => currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), [currentDate]);

  // --- AÇÕES CRUD ---

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Prepara o formulário para edição
  const startEditing = (bill: any) => {
    setEditingId(bill.id);
    setFormData({
        title: bill.title,
        amount: String(bill.amount_estimated), // Volta para string para o input
        date: bill.due_date.split('T')[0],
        categoryId: bill.category_id,
        status: bill.status
    });
    // Desativa recorrência na edição para simplificar
    setIsRecurrent(false);
    setIsFormOpen(true);
    // Rola para o topo suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({ title: '', amount: '', date: new Date().toISOString().split('T')[0], categoryId: 1, status: 'pending' });
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    // MODO EDIÇÃO
    if (editingId) {
        const { error } = await supabase
            .from('bills')
            .update({
                title: formData.title,
                amount_estimated: parseFloat(formData.amount),
                amount_paid: formData.status === 'paid' ? parseFloat(formData.amount) : 0,
                status: formData.status,
                due_date: formData.date, // Simplificado (sem ajuste de fuso na edição)
                category_id: formData.categoryId
            })
            .eq('id', editingId);

        if (error) alert('Erro ao atualizar.');
        else {
            await fetchData();
            cancelEditing(); // Limpa e fecha
        }
    } 
    // MODO CRIAÇÃO (Novo)
    else {
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
        if (error) alert('Erro ao salvar.');
        else {
            await fetchData();
            setFormData({ ...formData, title: '', amount: '' });
            setIsRecurrent(false);
        }
    }
    setLoading(false);
  };

  const payBill = async (id: number, amount: number) => {
    setBills(prev => prev.map(bill => bill.id === id ? { ...bill, status: 'paid', amount_paid: amount } : bill));
    await supabase.from('bills').update({ status: 'paid', amount_paid: amount }).eq('id', id);
  };

  const deleteBill = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    setBills(prev => prev.filter(bill => bill.id !== id));
    
    // Se estiver editando o item que foi excluído, cancela a edição
    if (editingId === id) cancelEditing();

    await supabase.from('bills').delete().eq('id', id);
    fetchData(); 
  };

  const visibleCategories = showAllCategories ? CATEGORIES_UI : CATEGORIES_UI.slice(0, 4);

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6">
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

      {/* GRÁFICO SIMPLES (BARRAS) */}
      {categoryStats.length > 0 && (
          <section className="mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                 <BarChart3 size={18} className="text-slate-400"/> Top Despesas
             </h3>
             <div className="space-y-3">
                 {categoryStats.slice(0, 4).map((cat) => {
                     const percent = Math.round((cat.total / totalPrevisto) * 100) || 0;
                     return (
                         <div key={cat.id}>
                             <div className="flex justify-between text-xs font-semibold mb-1 text-slate-600">
                                 <span className="flex items-center gap-1">{cat.icon} {cat.name}</span>
                                 <span>{percent}% (R$ {cat.total.toFixed(0)})</span>
                             </div>
                             <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                 <div 
                                    className="h-2.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${percent}%`, backgroundColor: cat.hex }}
                                 ></div>
                             </div>
                         </div>
                     )
                 })}
             </div>
          </section>
      )}

      {/* FORMULÁRIO COM TOGGLE E EDIÇÃO */}
      <div className={`bg-white rounded-2xl shadow-lg border mb-10 overflow-hidden transition-all duration-300 ${editingId ? 'ring-2 ring-orange-200 border-orange-200' : 'shadow-slate-200/50 border-slate-100'}`}>
        
        <div 
          onClick={() => !editingId && setIsFormOpen(!isFormOpen)} // Trava fechar se estiver editando
          className={`${editingId ? 'bg-orange-500' : 'bg-slate-900'} p-4 flex items-center justify-between cursor-pointer group transition-colors`}
        >
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg text-white">
                    {editingId ? <Filter size={20} strokeWidth={3}/> : <Plus size={20} strokeWidth={3} />}
                </div>
                <h3 className="font-bold text-white text-lg">
                    {editingId ? 'Editando Lançamento' : 'Novo Lançamento'}
                </h3>
            </div>
            <button className="text-white p-1">
                {isFormOpen ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
            </button>
        </div>
        
        {isFormOpen && (
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 animate-in slide-in-from-top-2 duration-200">
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

                {/* Seleção de Categoria */}
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
                        {!showAllCategories && (
                            <button 
                                type="button" onClick={() => setShowAllCategories(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 font-semibold text-sm hover:bg-slate-100 hover:border-slate-400 transition-all"
                            >
                                <MoreHorizontal size={18} /> Mais...
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

                {/* Recorrência (Esconde se estiver editando) */}
                {!editingId && (
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
                )}

                <div className="flex gap-3">
                    {editingId && (
                        <button type="button" onClick={cancelEditing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold transition-colors">
                            Cancelar
                        </button>
                    )}
                    <button type="submit" disabled={loading} className={`flex-1 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'} text-white py-4 rounded-xl font-bold text-lg shadow-xl transition-all active:scale-[0.98] flex justify-center items-center gap-2`}>
                        {loading ? 'Processando...' : <>{editingId ? 'Atualizar' : 'Confirmar'}</>}
                    </button>
                </div>
            </form>
        )}
      </div>

      {/* BARRA DE FILTROS */}
      <div className="mb-4 overflow-x-auto pb-2 flex gap-2 no-scrollbar">
          <button 
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-all ${filterCategory === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
              Todos
          </button>
          {CATEGORIES_UI.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-all flex items-center gap-2 ${filterCategory === cat.id ? `${cat.color} ring-1 ring-offset-1` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                 {cat.icon} {cat.name}
              </button>
          ))}
      </div>

      {/* LISTAGEM */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 px-1 flex items-center gap-2">
            <Wallet size={20} className="text-slate-400"/>
            Movimentações de {monthLabel}
        </h2>
        
        {loading && <div className="text-center p-8 text-slate-400 animate-pulse">Carregando dados...</div>}
        
        {!loading && filteredBills.length === 0 && (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-500 font-medium">Nenhum lançamento encontrado.</p>
            </div>
        )}

        <div className="flex flex-col gap-3">
            {filteredBills.map((bill) => {
                const catId = bill.category_id; 
                const catUI = CATEGORIES_UI.find(c => c.id === catId) || CATEGORIES_UI[0];
                const isEditingThis = editingId === bill.id;

                return (
                    <div 
                        key={bill.id} 
                        onClick={() => startEditing(bill)}
                        className={`group bg-white p-3 md:p-4 rounded-2xl border hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer ${isEditingThis ? 'border-orange-400 ring-1 ring-orange-200 bg-orange-50' : 'border-slate-100 hover:border-blue-200'}`}
                    >
                        
                        {/* LADO ESQUERDO: Ícone + Textos */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation(); // Não abrir edição
                                    if(bill.status !== 'paid') payBill(bill.id, bill.amount_estimated);
                                }}
                                className={`shrink-0 cursor-pointer w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500'}`}
                            >
                                {bill.status === 'paid' ? <CheckCircle2 size={20} /> : catUI.icon}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                                <h4 className={`font-bold text-sm md:text-base truncate ${bill.status === 'paid' ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                    {bill.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{new Date(bill.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                                    {bill.total_installments > 1 && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold flex items-center gap-1 whitespace-nowrap">
                                            <Repeat size={10} /> {bill.current_installment}/{bill.total_installments}
                                        </span>
                                    )}
                                     <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium truncate max-w-[100px] md:max-w-none">
                                        {bill.categories?.name || catUI.name}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* LADO DIREITO: Valor + Lixeira */}
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            <div className="text-right">
                                <div className={`text-base md:text-lg font-bold whitespace-nowrap ${bill.status === 'paid' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    - R$ {bill.status === 'paid' ? bill.amount_paid?.toFixed(2) : bill.amount_estimated?.toFixed(2)}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                                    {bill.status === 'paid' ? 'Pago' : 'Aberto'}
                                </span>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Não abrir edição ao excluir
                                    deleteBill(bill.id);
                                }}
                                className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all shrink-0"
                                title="Excluir lançamento"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </main>
  );
}