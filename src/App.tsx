import { useState, useMemo, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, getDocs, writeBatch, query, orderBy
} from "firebase/firestore";
import { Plus, Wallet, Calendar, X, TrendingUp, TrendingDown, Search, SlidersHorizontal } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryKey = keyof typeof CATEGORIES;
type TransactionType = "income" | "expense";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
}

interface FormState {
  type: TransactionType;
  amount: string;
  description: string;
  category: string;
  date: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = {
  food:          { label: "Food & Drink",    color: "#f97316", bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200",  emoji: "🍜" },
  transport:     { label: "Transport",        color: "#3b82f6", bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200",    emoji: "🚗" },
  shopping:      { label: "Shopping",         color: "#8b5cf6", bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200",  emoji: "🛍️" },
  bills:         { label: "Bills & Utilities",color: "#ef4444", bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200",     emoji: "💡" },
  health:        { label: "Health",           color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", emoji: "🏥" },
  entertainment: { label: "Entertainment",    color: "#ec4899", bg: "bg-pink-50",    text: "text-pink-600",    border: "border-pink-200",    emoji: "🎬" },
  salary:        { label: "Salary",           color: "#14b8a6", bg: "bg-teal-50",    text: "text-teal-600",    border: "border-teal-200",    emoji: "💼" },
  other_income:  { label: "Other Income",     color: "#22c55e", bg: "bg-green-50",   text: "text-green-600",   border: "border-green-200",   emoji: "💰" },
  other:         { label: "Other",            color: "#6b7280", bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200",    emoji: "📦" },
} as const;

const COLLECTION = "transactions";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number): string =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string): string =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(s));

const fmtMonth = (s: string): string =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(s));

const uid = (): string => Math.random().toString(36).slice(2, 10);

const getCat = (key: string) =>
  CATEGORIES[key as CategoryKey] ?? CATEGORIES.other;

const getDateRange = (filter: string): DateRange | null => {
  const now = new Date();
  const start = new Date();
  if (filter === "7d") start.setDate(now.getDate() - 7);
  else if (filter === "30d") start.setDate(now.getDate() - 30);
  else if (filter === "3m") start.setMonth(now.getMonth() - 3);
  else if (filter === "thisMonth") { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else if (filter === "lastMonth") {
    start.setMonth(now.getMonth() - 1); start.setDate(1); start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start, end };
  }
  else if (filter === "year") start.setFullYear(now.getFullYear(), 0, 1);
  else return null;
  return { start, end: now };
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
interface TooltipPayloadItem { name: string; value: number; }
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-3 text-sm">
      <p className="font-bold text-gray-800">{payload[0].name}</p>
      <p className="text-gray-500">{fmt(payload[0].value)}</p>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Transaction) => void }) {
  const [form, setForm] = useState<FormState>({
    type: "expense",
    amount: "",
    description: "",
    category: "food",
    date: new Date().toISOString().slice(0, 16),
  });
  const [error, setError] = useState<string>("");

  const incomeCategories = ["salary", "other_income"];
  const expenseCategories = Object.keys(CATEGORIES).filter((k) => !incomeCategories.includes(k));
  const cats = form.type === "income" ? incomeCategories : expenseCategories;

  const setField = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleTypeChange = (t: TransactionType) => {
    setForm((p) => ({ ...p, type: t, category: t === "income" ? "salary" : "food" }));
  };

  const submit = () => {
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) { setError("Please enter a valid amount."); return; }
    if (!form.description.trim()) { setError("Please enter a description."); return; }
    onAdd({ ...form, amount: +form.amount, id: uid(), date: new Date(form.date).toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "90dvh" }}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Add Transaction</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Type toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button key={t} onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all
                  ${form.type === t
                    ? t === "income" ? "bg-emerald-500 text-white shadow" : "bg-[#d62f86] text-white shadow"
                    : "text-gray-500"}`}>
                {t === "income" ? "💰 Income" : "💸 Expense"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (THB)</label>
            <input type="number" placeholder="0" value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-2xl font-bold focus:outline-none focus:border-[#d62f86] focus:ring-2 focus:ring-pink-100 transition" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <input type="text" placeholder="What was this for?" value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#d62f86] focus:ring-2 focus:ring-pink-100 transition" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {cats.map((c) => {
                const cat = getCat(c);
                const selected = form.category === c;
                return (
                  <button key={c} onClick={() => setField("category", c)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all text-xs font-semibold
                      ${selected ? `${cat.bg} ${cat.border} ${cat.text}` : "border-gray-100 text-gray-400 hover:border-gray-200"}`}>
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="text-center leading-tight">{cat.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date & Time</label>
            <input type="datetime-local" value={form.date}
              onChange={(e) => setField("date", e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#d62f86] focus:ring-2 focus:ring-pink-100 transition" />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button onClick={submit}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all shadow-lg active:scale-95"
            style={{ background: "linear-gradient(135deg, #d62f86 0%, #f97316 100%)" }}>
            Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [showModal, setShowModal]       = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [timeFilter, setTimeFilter]     = useState("all");
  const [catFilter, setCatFilter]       = useState("all");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [search, setSearch]             = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [activeTab, setActiveTab]       = useState<"list" | "dashboard">("list");

  // ── Realtime listener from Firestore ──
  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(data);
    });
    return () => unsub(); // cleanup when component unmount
  }, []);

  // ── CRUD ──
  const addTransaction = async (t: Transaction) => {
    const { id: _id, ...data } = t; // Firestore build id 
    await addDoc(collection(db, COLLECTION), data);
  };

  const deleteTransaction = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  };

  const clearAll = async () => {
    const snapshot = await getDocs(collection(db, COLLECTION));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    setShowConfirm(false);
  };

  // ── Filtered list ──
  const filtered = useMemo<Transaction[]>(() => {
    let list = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const range = getDateRange(timeFilter);
    if (range) list = list.filter((t) => { const d = new Date(t.date); return d >= range.start && d <= range.end; });
    if (catFilter !== "all")  list = list.filter((t) => t.category === catFilter);
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (search) list = list.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [transactions, timeFilter, catFilter, typeFilter, search]);

  // ── Aggregates ──
  const { income, expense, balance, catExpenseData, monthlyData } = useMemo(() => {
    let inc = 0, exp = 0;
    filtered.forEach((t) => (t.type === "income" ? (inc += t.amount) : (exp += t.amount)));

    const catMap: Record<string, number> = {};
    filtered.filter((t) => t.type === "expense").forEach((t) => {
      catMap[t.category] = (catMap[t.category] ?? 0) + t.amount;
    });
    const catExpenseData = Object.entries(catMap)
      .map(([k, v]) => ({ name: getCat(k).label, value: v, color: getCat(k).color, emoji: getCat(k).emoji }))
      .sort((a, b) => b.value - a.value);

    const monthMap: Record<string, { month: string; income: number; expense: number }> = {};
    filtered.forEach((t) => {
      const m = fmtMonth(t.date);
      if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expense: 0 };
      if (t.type === "income") monthMap[m].income += t.amount;
      else monthMap[m].expense += t.amount;
    });
    const monthlyData = Object.values(monthMap).reverse();

    return { income: inc, expense: exp, balance: inc - exp, catExpenseData, monthlyData };
  }, [filtered]);

  const TIME_FILTERS = [
    { k: "all", l: "All Time" }, { k: "thisMonth", l: "This Month" }, { k: "lastMonth", l: "Last Month" },
    { k: "7d", l: "7 Days" }, { k: "30d", l: "30 Days" }, { k: "3m", l: "3 Months" }, { k: "year", l: "This Year" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        .del-btn { opacity: 0; transition: opacity 0.2s; }
        .tx-row:hover .del-btn { opacity: 1; }
      `}</style>



      {showModal && <Modal onClose={() => setShowModal(false)} onAdd={addTransaction} />}

      {/* Confirm clear dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Delete all data??</h3>
            <p className="text-gray-400 text-sm mb-6">This cannot be recovered after deletion</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                Cancel
              </button>
              <button onClick={clearAll}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 transition">
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">

        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: "'DM Sans', sans-serif" }} className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-none">
              Financial<br />Dashboard
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Track every baht, every day.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowConfirm(true)}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-red-400 text-sm border border-red-100 bg-red-50 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
              <X size={16} strokeWidth={2.5} /> Delete All
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-white text-sm shadow-lg transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #d62f86 0%, #f97316 100%)" }}>
              <Plus size={18} strokeWidth={3} /> Add
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="col-span-3 md:col-span-1 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg"
            style={{ background: "linear-gradient(135deg, #d62f86 0%, #b5266e 100%)" }}>
            <div className="absolute -right-6 -top-6 opacity-10"><Wallet size={120} /></div>
            <Wallet size={20} className="opacity-80 mb-3" />
            <p className="text-sm font-medium opacity-80">Net Balance</p>
            <p className="text-3xl font-extrabold mt-1">{fmt(balance)}</p>
          </div>
          <div className="col-span-3 md:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center"><TrendingUp size={16} /></div>
                <span className="text-xs font-bold uppercase tracking-wide">Income</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{fmt(income)}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center"><TrendingDown size={16} /></div>
                <span className="text-xs font-bold uppercase tracking-wide">Expense</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{fmt(expense)}</p>
            </div>
          </div>
        </div>

        {/* Time filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          {TIME_FILTERS.map((f) => (
            <button key={f.k} onClick={() => setTimeFilter(f.k)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all
                ${timeFilter === f.k ? "bg-gray-900 text-white shadow" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["list", "dashboard"] as const).map((k) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all capitalize
                ${activeTab === k ? "bg-gray-900 text-white" : "bg-white text-gray-400 border border-gray-200"}`}>
              {k === "list" ? "Transactions" : "Dashboard"}
            </button>
          ))}
          <button onClick={() => setShowFilters((p) => !p)}
            className={`ml-auto px-4 py-2.5 rounded-2xl font-bold text-sm border transition-all flex items-center gap-2
              ${showFilters ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"}`}>
            <SlidersHorizontal size={15} /> Filter
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#d62f86] focus:ring-2 focus:ring-pink-100 transition" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Type</p>
                <div className="flex gap-2 flex-wrap">
                  {["all", "income", "expense"].map((t) => (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                        ${typeFilter === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setCatFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${catFilter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                    All
                  </button>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <button key={k} onClick={() => setCatFilter(k)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                        ${catFilter === k ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {v.emoji} {v.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Transactions ── */}
        {activeTab === "list" && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Transactions</h2>
              <span className="text-sm text-gray-400 font-medium">{filtered.length} records</span>
            </div>
            {filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p className="font-semibold">No transactions found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((t) => {
                  const cat = getCat(t.category);
                  return (
                    <div key={t.id} className="tx-row px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${cat.bg}`}>
                        <span className="text-lg">{cat.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{t.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={10} />{fmtDate(t.date)}
                          </span>
                        </div>
                      </div>
                      <div className={`text-right shrink-0 ${t.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        <p className="font-extrabold text-base">{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</p>
                      </div>
                      <button onClick={() => deleteTransaction(t.id)}
                        className="del-btn w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Dashboard ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Donut */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Income vs Expense</h3>
                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ name: "Income", value: income }, { name: "Expense", value: expense }]}
                        cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                        <Cell fill="#10b981" strokeWidth={0} />
                        <Cell fill="#d62f86" strokeWidth={0} />
                      </Pie>
                      <Legend iconType="circle" iconSize={8} />
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <span className="text-xs text-gray-400 block">Balance</span>
                      <span className="text-lg font-extrabold text-gray-800">{fmt(balance)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              {monthlyData.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Monthly Overview</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                          tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill="#d62f86" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Category progress bars */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-5">Expense by Category</h3>
              {catExpenseData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No expense data</p>
              ) : (
                <div className="space-y-3">
                  {catExpenseData.map((c) => {
                    const pct = expense > 0 ? ((c.value / expense) * 100).toFixed(1) : "0";
                    return (
                      <div key={c.name} className="flex items-center gap-4">
                        <span className="text-xl w-8 text-center shrink-0">{c.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold text-gray-700">{c.name}</span>
                            <span className="text-sm font-bold text-gray-900">{fmt(c.value)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.color }} />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 font-semibold w-12 text-right shrink-0">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category donut */}
            {catExpenseData.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Category Distribution</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={catExpenseData} cx="50%" cy="45%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {catExpenseData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8}
                        formatter={(_v: string) => <span style={{ fontSize: 12, color: "#6b7280" }}>{_v}</span>} />
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}