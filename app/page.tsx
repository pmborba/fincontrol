'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react';

export default function Dashboard() {
  const supabase = createClient();
  const [bills, setBills] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar dados
  const fetchData = async () => {
    const { data: billsData } = await supabase
      .from('bills')
      .select('*, categories(name)')
      .order('due_date', { ascending: true });
    
    const { data: catData } = await supabase.from('categories').select('*');
    
    if (billsData) setBills(billsData);
    if (catData) setCategories(catData);
    setLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  // Pagar conta
  const payBill = async (id: number, estimated: number) => {
    const realValue = prompt("Valor pago (R$):", estimated.toString());
    if (realValue) {
      // Substitui vírgula por ponto para o banco aceitar
      const cleanValue = parseFloat(realValue.replace(',', '.'));
      await supabase.from('bills').update({ 
        status: 'paid', 
        amount_paid: cleanValue 
      }).eq('id', id);
      fetchData(); 
    }
  };

  // Adicionar conta
  const addBill = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const amountStr = formData.get('amount') as string;
    const amount = parseFloat(amountStr.replace(',', '.'));

    await supabase.from('bills').insert({
        title: formData.get('title'),
        amount_estimated: amount,
        due_date: formData.get('date'),
        category_id: formData.get('category'),
        status: 'pending'
    });
    e.target.reset(); // Limpa o formulário
    fetchData(); // Atualiza a lista
  };

  // Cálculos do Dashboard
  const totalPrevisto = bills.reduce((acc, b) => acc + (b.amount_estimated || 0), 0);
  // Se pagou, usa o valor pago. Se não, usa 0 na conta do "Já gasto"
  const totalPago = bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + (b.amount_paid || 0), 0);
  // O que falta pagar (apenas das pendentes)
  const aPagar = bills.filter(b => b.status === 'pending').reduce((acc, b) => acc + (b.amount_estimated || 0), 0);

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-500">Carregando Finanças...</div>;

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-slate-900">Minha Gestão</h1>
        <p className="text-slate-500">Controle mensal detalhado</p>
      </header>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-semibold">Total do Mês</div>
          <div className="text-2xl font-bold text-slate-800">R$ {totalPrevisto.toFixed(2)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-semibold">Já Pago</div>
          <div className="text-2xl font-bold text-emerald-600">R$ {totalPago.toFixed(2)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-semibold">Falta Pagar</div>
          <div className="text-2xl font-bold text-orange-600">R$ {aPagar.toFixed(2)}</div>
        </div>
      </div>

      {/* FORMULÁRIO RÁPIDO */}
      <div className="bg-slate-50 p-5 rounded-lg mb-8 border border-slate-200">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-700">
            <PlusCircle size={18} /> Novo Gasto
        </h3>
        <form onSubmit={addBill} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input name="title" placeholder="Descrição (ex: Mercado)" required className="p-2 rounded border border-slate-300 md:col-span-1" />
            <input name="amount" type="number" step="0.01" placeholder="Valor (R$)" required className="p-2 rounded border border-slate-300" />
            <input name="date" type="date" required className="p-2 rounded border border-slate-300" />
            <select name="category" className="p-2 rounded border border-slate-300 bg-white">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="bg-slate-900 text-white p-2 rounded hover:bg-slate-800 font-medium transition-colors">
                Adicionar
            </button>
        </form>
      </div>

      {/* LISTA DE CONTAS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {bills.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhuma conta cadastrada ainda.</div>
        ) : bills.map((bill) => (
          <div key={bill.id} className={`flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${bill.status === 'paid' ? 'bg-slate-50/50' : ''}`}>
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                    {bill.status === 'paid' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div>
                    <div className={`font-medium ${bill.status === 'paid' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{bill.title}</div>
                    <div className="text-xs text-slate-500 flex gap-2">
                        <span>{new Date(bill.due_date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="bg-slate-100 px-1 rounded">{bill.categories?.name}</span>
                    </div>
                </div>
            </div>
            <div className="text-right flex items-center gap-4">
                <div>
                    <div className="font-bold text-slate-700">R$ {bill.amount_estimated.toFixed(2)}</div>
                    {bill.status === 'paid' && <div className="text-xs text-emerald-600 font-medium">Pago: R$ {bill.amount_paid.toFixed(2)}</div>}
                </div>
                {bill.status !== 'paid' && (
                    <button onClick={() => payBill(bill.id, bill.amount_estimated)} className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                        Pagar
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}