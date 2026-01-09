'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle2, AlertCircle, PlusCircle, ChevronLeft, ChevronRight, Calendar, Repeat } from 'lucide-react';

export default function Dashboard() {
  const supabase = createClient();
  const [bills, setBills] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Data (Mês Atual)
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- ESTADOS DO FORMULÁRIO ---
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [installments, setInstallments] = useState(2); 
  const [recurrenceType, setRecurrenceType] = useState('monthly'); // daily, weekly, monthly, yearly

  // Buscar dados
  const fetchData = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0).toISOString();

    const { data: billsData } = await supabase
      .from('bills')
      .select('*, categories(name)')
      .gte('due_date', startOfMonth)
      .lte('due_date', endOfMonth)
      .order('due_date', { ascending: true });
    
    const { data: catData } = await supabase.from('categories').select('*');
    
    if (billsData) setBills(billsData);
    if (catData) setCategories(catData);
    setLoading(false);
  };

  useEffect(() => { fetchData() }, [currentDate]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const payBill = async (id: number, estimated: number) => {
    const realValue = prompt("Valor pago (R$):", estimated.toString());
    if (realValue) {
      const cleanValue = parseFloat(realValue.replace(',', '.'));
      await supabase.from('bills').update({ status: 'paid', amount_paid: cleanValue }).eq('id', id);
      fetchData(); 
    }
  };

  // --- LÓGICA DE ENGENHARIA DE DATAS ---
  const addBill = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Captura dados brutos
    const title = formData.get('title') as string;
    const amountStr = formData.get('amount') as string;
    const amount = parseFloat(amountStr.replace(',', '.'));
    const initialDateStr = formData.get('date') as string; // YYYY-MM-DD
    const categoryId = formData.get('category');

    const billsToInsert = [];

    // Se NÃO for recorrente, loop roda 1 vez só. Se for, roda N vezes.
    const loops = isRecurrent ? installments : 1;

    for (let i = 0; i < loops; i++) {
        // Cria uma cópia fresca da data inicial para não acumular erros
        // O "T12:00:00" força o meio do dia para evitar problemas de fuso horário voltando 1 dia
        const dateObj = new Date(initialDateStr + 'T12:00:00');

        if (isRecurrent) {
            // Aplica a lógica dependendo do tipo
            if (recurrenceType === 'daily') {
                dateObj.setDate(dateObj.getDate() + i);
            } else if (recurrenceType === 'weekly') {
                dateObj.setDate(dateObj.getDate() + (i * 7));
            } else if (recurrenceType === 'monthly') {
                dateObj.setMonth(dateObj.getMonth() + i);
            } else if (recurrenceType === 'yearly') {
                dateObj.setFullYear(dateObj.getFullYear() + i);
            }
        }

        // Converte volta para String YYYY-MM-DD para o banco
        const dateIso = dateObj.toISOString().split('T')[0];

        billsToInsert.push({
            title: title,
            amount_estimated: amount,
            due_date: dateIso,
            category_id: categoryId,
            status: 'pending',
            recurrence_type: isRecurrent ? recurrenceType : null,
            current_installment: i + 1,
            total_installments: loops
        });
    }

    // Envia tudo para o banco numa tacada só (Bulk Insert)
    const { error } = await supabase.from('bills').insert(billsToInsert);
    
    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        // Reset do form
        e.target.reset();
        setIsRecurrent(false);
        setInstallments(2);
        fetchData();
    }
  };

  // Cálculos
  const totalPrevisto = bills.reduce((acc, b) => acc + (b.amount_estimated || 0), 0);
  const totalPago = bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + (b.amount_paid || 0), 0);
  const aPagar = bills.filter(b => b.status === 'pending').reduce((acc, b) => acc + (b.amount_estimated || 0), 0);
  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen bg-slate-50">
      
      {/* HEADER & NAV */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Minha Gestão 3.0</h1>
            <p className="text-slate-500">Engenharia Financeira Pessoal</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
            <div className="text-lg font-bold w-40 text-center capitalize">{monthLabel}</div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight /></button>
        </div>
      </header>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Previsão</div>
          <div className="text-2xl font-bold text-slate-800">R$ {totalPrevisto.toFixed(2)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Executado</div>
          <div className="text-2xl font-bold text-emerald-600">R$ {totalPago.toFixed(2)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Gap (A Pagar)</div>
          <div className="text-2xl font-bold text-orange-600">R$ {aPagar.toFixed(2)}</div>
        </div>
      </div>

      {/* FORMULÁRIO AVANÇADO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
            <PlusCircle size={20} className="text-blue-600" /> Novo Lançamento
        </h3>
        <form onSubmit={addBill} className="flex flex-col gap-5">
            {/* Linha 1: Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Descrição</label>
                    <input name="title" placeholder="Ex: Seguro do Carro" required className="p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Valor (R$)</label>
                    <input name="amount" type="number" step="0.01" placeholder="0,00" required className="p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            {/* Linha 2: Data e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Vencimento</label>
                    <input name="date" type="date" required className="p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Categoria</label>
                    <select name="category" className="p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            
            {/* Linha 3: Recorrência (Engine) */}
            <div className={`p-4 rounded-lg border transition-all ${isRecurrent ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input 
                        type="checkbox" 
                        checked={isRecurrent} 
                        onChange={(e) => setIsRecurrent(e.target.checked)} 
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Ativar Recorrência</span>
                </label>
                
                {isRecurrent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-blue-700 uppercase">Tipo de Frequência</label>
                            <select 
                                value={recurrenceType}
                                onChange={(e) => setRecurrenceType(e.target.value)}
                                className="p-2 rounded border border-blue-200 text-blue-900 focus:ring-blue-500"
                            >
                                <option value="daily">Diário (Todo dia)</option>
                                <option value="weekly">Semanal (Toda semana)</option>
                                <option value="monthly">Mensal (Todo mês)</option>
                                <option value="yearly">Anual (Todo ano)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-blue-700 uppercase">Quantas vezes?</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="2" 
                                    max="360" 
                                    value={installments} 
                                    onChange={(e) => setInstallments(parseInt(e.target.value))}
                                    className="p-2 w-full rounded border border-blue-200 text-blue-900 focus:ring-blue-500"
                                />
                                <span className="text-sm text-blue-600 font-medium">repetições</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <button type="submit" className="bg-slate-900 text-white py-3 px-6 rounded-lg hover:bg-slate-800 font-bold shadow-md transition-all active:scale-95 w-full md:w-auto md:self-end">
                Confirmar Lançamento
            </button>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
            <Calendar size={20} className="text-slate-500"/>
            Extrato: {monthLabel}
        </h2>
        
        {loading ? (
            <div className="text-center p-8 text-slate-400 animate-pulse">Sincronizando dados...</div>
        ) : bills.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                Nenhum lançamento encontrado neste período.
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {bills.map((bill) => (
                <div key={bill.id} className={`flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${bill.status === 'paid' ? 'bg-emerald-50/30' : ''}`}>
                    <div className="flex items-center gap-4">
                        <div onClick={() => bill.status !== 'paid' && payBill(bill.id, bill.amount_estimated)} className={`cursor-pointer p-2 rounded-full transition-all ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300 hover:bg-emerald-100 hover:text-emerald-500'}`}>
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`font-semibold text-base ${bill.status === 'paid' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{bill.title}</span>
                                {bill.total_installments > 1 && (
                                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold border border-blue-200 flex items-center gap-1">
                                        <Repeat size={8} /> {bill.current_installment}/{bill.total_installments}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                <span className="flex items-center gap-1 font-medium">{new Date(bill.due_date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-slate-300">|</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{bill.categories?.name}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                         <div className={`text-lg font-bold ${bill.status === 'paid' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            R$ {bill.status === 'paid' ? bill.amount_paid.toFixed(2) : bill.amount_estimated.toFixed(2)}
                         </div>
                         <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${bill.status === 'paid' ? 'text-emerald-600' : 'text-orange-500'}`}>
                            {bill.status === 'paid' ? 'Pago' : 'Pendente'}
                         </div>
                    </div>
                </div>
                ))}
            </div>
        )}
      </div>
    </main>
  );
}