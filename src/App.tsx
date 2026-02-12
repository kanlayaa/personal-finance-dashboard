import { useMemo } from 'react';
import { Plus, Minus, Wallet, Calendar, SquarePen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

// Types 
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
}

// Mock Data 
const transactions: Transaction[] = [
  { id: "1", type: "expense", amount: 45, description: "Iced Coffee (Amazon)", date: "2024-01-15T08:30:00Z" },
  { id: "2", type: "expense", amount: 350, description: "Gasoline", date: "2024-01-15T12:00:00Z" },
  { id: "3", type: "income", amount: 25000, description: "Salary", date: "2024-01-01T00:00:00Z" },
  { id: "4", type: "expense", amount: 1500, description: "Electricity Bill", date: "2024-01-10T00:00:00Z" },
  { id: "5", type: "expense", amount: 200, description: "Netflix Subscription", date: "2024-01-05T00:00:00Z" },
  { id: "6", type: "expense", amount: 1200, description: "Uniqlo T-Shirt", date: "2024-01-03T15:45:00Z" },
  { id: "7", type: "expense", amount: 80, description: "Chicken Rice", date: "2024-01-14T12:30:00Z" },
  { id: "8", type: "income", amount: 500, description: "Sold Old Items", date: "2024-01-08T10:00:00Z" },
  { id: "9", type: "expense", amount: 890, description: "Medicine / Doctor", date: "2024-01-12T10:30:00Z" },
  { id: "10", type: "expense", amount: 65, description: "Street Food", date: "2024-01-11T18:00:00Z" }
];

// Helpers 
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateString: string) => 
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));

// Main Component
function App() {
  const { totalIncome, totalExpense, balance, sortedTransactions, chartData } = useMemo(() => {
    let inc = 0, exp = 0;
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sorted.forEach(t => {
      if (t.type === 'income') inc += t.amount; else exp += t.amount;
    });

    const chartData = [
      { name: 'Income', value: inc, color: '#10b981' }, 
      { name: 'Expense', value: exp, color: '#ef4444' }, 
    ];

    return { totalIncome: inc, totalExpense: exp, balance: inc - exp, sortedTransactions: sorted, chartData };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Overview of your finances</p>
          </div>
          <button 
            aria-label="Add Transaction"
            className="bg-[#d62f86] text-white p-3 rounded-xl hover:bg-gray-800 transition shadow-sm flex items-center justify-center shrink-0"
          >
            <SquarePen size={20} />
          </button>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <div className="col-span-2 md:col-span-1 bg-[#d62f86] text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between h-32 md:h-40 relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4"><Wallet size={120} /></div>
            <div className="flex items-center gap-2 opacity-90 z-10"><Wallet size={20} /> <span className="font-medium">Total Balance</span></div>
            <div className="text-3xl md:text-4xl font-bold z-10">{formatCurrency(balance)}</div>
          </div>
          <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 md:h-40">
            <div className="flex items-center gap-2 text-green-600 mb-1"><div className="bg-green-100 p-1.5 rounded-full"><Plus size={16} strokeWidth={3} /></div><span className="font-bold text-sm">Income</span></div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 md:h-40">
            <div className="flex items-center gap-2 text-red-500 mb-1"><div className="bg-red-100 p-1.5 rounded-full"><Minus size={16} strokeWidth={3} /></div><span className="font-bold text-sm">Expenses</span></div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(totalExpense)}</div>
          </div>
        </section>

        {/* Main Content Grid: Graph & List*/}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Dashboard</h2>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60} 
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="text-xs text-gray-400 block">Balance</span>
                  <span className="text-xl font-bold text-gray-800">{formatCurrency(balance)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* recent Transactions */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Recent Transactions</h2>
              <span className="text-sm text-gray-400">{sortedTransactions.length} transactions</span>
            </div>
            
            {/* Transactions List */}
            <div className="divide-y divide-gray-100">
              {sortedTransactions.map((t) => (
                <div key={t.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-gray-100 transition-colors group">
                  <div className="flex gap-4 items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border shrink-0 ${
                      t.type === 'income' 
                        ? 'bg-green-50 border-green-100 text-green-600' 
                        : 'bg-red-50 border-red-100 text-red-500'
                    }`}>
                      {t.type === 'income' ? <Plus size={24} strokeWidth={2.5} /> : <Minus size={24} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="font-medium text-base text-gray-900 group-hover:text-[#d62f86] transition-colors">{t.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                        <Calendar size={12} /> {formatDate(t.date)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    <div className="font-bold text-lg md:text-xl">
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

export default App;