import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calculator, 
  Receipt, 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Trash2, 
  History, 
  Brain,
  Save,
  CreditCard,
  AlertCircle,
  Calendar,
  User,
  LogOut,
  Wifi,
  Loader2,
  CheckCircle,
  Edit2,
  Key,
  ShieldAlert,
  Smartphone,
  Lightbulb,
  X,
  RefreshCw,
  Clock,
  Database,
  Sparkles,
  MessageSquare,
  Settings,
  CheckSquare,
  Square,
  Mail,
  Lock,
  ChevronDown,
  ChevronUp,
  Repeat,
  List,
  Camera,
  Image as ImageIcon,
  Landmark
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
  apiKey: "AIzaSyAoODPsPJagi0w9tqn9JL-pTL4BHCyrr38",
  authDomain: "smartbudgeting-44933.firebaseapp.com",
  projectId: "smartbudgeting-44933",
  storageBucket: "smartbudgeting-44933.firebasestorage.app",
  messagingSenderId: "38995285066",
  appId: "1:38995285066:web:540cfa83f44bbca6d202b3",
  measurementId: "G-2SHPJKS224"
}
;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- API Helper ---
const callGemini = async (prompt, imageBase64 = null) => {
  // NOTE: For local deployment, change this to: import.meta.env.VITE_GEMINI_KEY
  const apiKey = import.meta.env.VITE_GEMINI_KEY; 
  
  try {
    const parts = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64.split(',')[1] // Remove data:image/jpeg;base64, prefix
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: parts }] }),
      }
    );
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response from AI. Check API Key.");
    }
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
    outline: "border border-slate-200 text-slate-600 hover:bg-slate-50",
    magic: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md",
    success: "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300",
    google: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
  };
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default function SmartBudgetApp() {
  const [user, setUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Auth UI State
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');

  // UI State
  const [showFuture, setShowFuture] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({ revolving: false, installment: false });
  
  // Data State
  const [incomes, setIncomes] = useState([]);
  const [bills, setBills] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [expenses, setExpenses] = useState([]); 
  const [historicalPaychecks, setHistoricalPaychecks] = useState([]);
  const [budgetConfig, setBudgetConfig] = useState({ startDate: new Date().toISOString().split('T')[0], frequency: 'bi-weekly', payDate: '' });
  
  // AI State
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParseLoading, setAiParseLoading] = useState(false);
  
  // Inputs State
  const [parseText, setParseText] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const fileInputRef = useRef(null); 
  
  // Forms State
  const [newIncome, setNewIncome] = useState({ source: '', gross: '', net: '', date: new Date().toISOString().split('T')[0], payPeriod: '' });
  const [isAutoCalc, setIsAutoCalc] = useState(true);
  const [newLiability, setNewLiability] = useState({ name: '', type: 'revolving', statementBal: '', currentBal: '', minPayment: '', apr: '', closingDay: '', dueDay: '' });
  const [manualBill, setManualBill] = useState({ name: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Uncategorized', recurring: false });
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'bank', category: 'Food' });

  // Modal State
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState(null);
  const [newCharge, setNewCharge] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });

  // --- Auth & Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const createListener = (collectionName, setter) => {
      const q = collection(db, 'artifacts', appId, 'users', user.uid, collectionName);
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => {
           if (a.date && b.date) return new Date(b.date) - new Date(a.date);
           return 0;
        });
        setter(data);
      });
    };

    const unsubIncomes = createListener('incomes', setIncomes);
    const unsubBills = createListener('bills', setBills);
    const unsubLiabilities = createListener('liabilities', setLiabilities);
    const unsubExpenses = createListener('expenses', setExpenses);
    const unsubHistory = createListener('historicalPaychecks', setHistoricalPaychecks);

    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'budget_config');
    onSnapshot(configRef, (doc) => { if (doc.exists()) setBudgetConfig(doc.data()); });

    return () => { unsubIncomes(); unsubBills(); unsubLiabilities(); unsubHistory(); unsubExpenses(); };
  }, [user]);

  // --- Handlers ---
  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { setAuthError(error.message); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault(); setAuthError('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: fullName });
      }
    } catch (error) { setAuthError(error.message); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIncomes([]); setBills([]); setLiabilities([]);
  };

  const addItem = async (collectionName, item) => {
    if (!user) throw new Error("User not authenticated");
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, collectionName), { ...item, paid: false, createdAt: new Date().toISOString() });
  };

  const updateItem = async (collectionName, id, updates) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id), updates);
  };

  const deleteItem = async (collectionName, id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id));
  };

  // --- Logic & Calculations ---
  const deductionStats = useMemo(() => {
    if (historicalPaychecks.length === 0) return { rate: 0, label: '0%' };
    const totalGross = historicalPaychecks.reduce((acc, curr) => acc + Number(curr.gross), 0);
    const totalNet = historicalPaychecks.reduce((acc, curr) => acc + Number(curr.net), 0);
    return { rate: 1 - (totalNet / totalGross), label: `${((1 - (totalNet / totalGross)) * 100).toFixed(1)}%` };
  }, [historicalPaychecks]);

  const currentBudgetCycle = useMemo(() => {
    const start = new Date(budgetConfig.startDate);
    const today = new Date();
    const freqDays = { 'weekly': 7, 'bi-weekly': 14, 'semi-monthly': 15, 'monthly': 30 }[budgetConfig.frequency] || 14;
    const diffDays = Math.ceil(Math.abs(today - start) / (1000 * 60 * 60 * 24)); 
    const cyclesPassed = Math.floor(diffDays / freqDays);
    let cycleStart = new Date(start);
    if (start < today) { cycleStart.setDate(start.getDate() + (cyclesPassed * freqDays)); if (cycleStart > today) cycleStart.setDate(cycleStart.getDate() - freqDays); }
    const cycleEnd = new Date(cycleStart); cycleEnd.setDate(cycleStart.getDate() + freqDays - 1); 
    return { start: cycleStart, end: cycleEnd };
  }, [budgetConfig]);

  const totalIncome = incomes.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalBillExpenses = bills.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalMiscExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalDebt = liabilities.reduce((acc, curr) => acc + Number(curr.currentBal), 0);
  const totalMinPayments = liabilities.reduce((acc, curr) => acc + Number(curr.minPayment), 0);
  const totalExpenses = totalBillExpenses + totalMinPayments + totalMiscExpenses;
  const remaining = totalIncome - totalExpenses;

  const getNextOccurrence = (day) => {
    if (!day) return null;
    const today = new Date();
    const d = new Date();
    d.setDate(parseInt(day));
    if (d < today) d.setMonth(d.getMonth() + 1);
    return d;
  };

  const categorizedObligations = useMemo(() => {
    const { start, end } = currentBudgetCycle;
    let overdue = [], current = [], future = [];
    const categorize = (item, dueDate, isPaid) => {
      const d = new Date(dueDate); d.setHours(0,0,0,0);
      const itemWithDate = { ...item, dueDateDisplay: d.toISOString().split('T')[0] };
      if (d < start && !isPaid) overdue.push(itemWithDate);
      else if (d >= start && d <= end) current.push(itemWithDate);
      else if (d > end) future.push(itemWithDate);
    };
    bills.forEach(b => { if (b.date) categorize({ ...b, type: 'bill' }, b.date, b.paid); });
    liabilities.forEach(l => {
      let d = l.dueDay ? getNextOccurrence(l.dueDay) : (l.dueDate ? new Date(l.dueDate) : null);
      if (d) {
        let isPaidForCycle = false;
        if (l.lastPaymentDate) { const pd = new Date(l.lastPaymentDate); if (pd >= start && pd <= end) isPaidForCycle = true; }
        categorize({ ...l, type: 'liability', amount: l.minPayment, paid: isPaidForCycle }, d, isPaidForCycle);
      }
    });
    const sorter = (a, b) => new Date(a.dueDateDisplay) - new Date(b.dueDateDisplay);
    return { overdue: overdue.sort(sorter), current: current.sort(sorter), future: future.sort(sorter) };
  }, [bills, liabilities, currentBudgetCycle]);

  // --- Image & Expense Handlers ---

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setAiParseLoading(true);
      const prompt = `Analyze this receipt. Extract to JSON: { "name": "Merchant", "amount": 0.00, "date": "YYYY-MM-DD", "category": "Food/Gas/etc" }. Use today (${new Date().toISOString().split('T')[0]}) if no date found.`;
      try {
        const jsonStr = await callGemini(prompt, base64String);
        const result = JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, '').trim());
        setNewExpense({ ...newExpense, name: result.name, amount: result.amount, date: result.date, category: result.category });
        alert(`Scanned: ${result.name} - $${result.amount}`);
      } catch (err) { alert("Could not scan receipt."); } 
      finally { setAiParseLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount) return;
    try {
      await addItem('expenses', { ...newExpense, amount: parseFloat(newExpense.amount) });
      
      // Update liability balance if selected
      if (newExpense.paymentMethod !== 'bank') {
        const liability = liabilities.find(l => l.id === newExpense.paymentMethod);
        if (liability) {
          const newBal = parseFloat(liability.currentBal) + parseFloat(newExpense.amount);
          await updateItem('liabilities', liability.id, { currentBal: newBal });
          
          // Logic: Check if transaction date is after closing date. If so, it goes to next statement.
          // For now, simply adding to current balance is correct. Statement closing logic handles the "move to statement balance".
          alert(`Added to expenses and updated ${liability.name} balance.`);
        }
      } else {
        alert("Expense added.");
      }
      setNewExpense({ name: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'bank', category: 'Food' });
    } catch (e) { alert("Error adding expense: " + e.message); }
  };

  // --- Specific Handlers ---
  const handleSaveBudgetConfig = async () => { if (!user) return; await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'budget_config'), { ...budgetConfig }); alert("Saved!"); };
  
  const handleAddHistorical = (e) => { 
    e.preventDefault(); 
    const gross = parseFloat(e.target.gross.value); 
    const net = parseFloat(e.target.net.value); 
    if (gross && net) { 
      addItem('historicalPaychecks', { date: e.target.date.value, gross, net }); 
      e.target.reset(); 
    } 
  };

  const handleGrossChange = (e) => { 
    const gross = e.target.value; 
    setNewIncome(prev => ({ ...prev, gross, net: isAutoCalc ? (gross * (1 - deductionStats.rate)).toFixed(2) : prev.net })); 
  };

  const handleAddIncome = async () => { 
    if (!newIncome.source || !newIncome.net) return; 
    await addItem('incomes', { source: newIncome.source, amount: parseFloat(newIncome.net), date: newIncome.date, payPeriod: newIncome.payPeriod, type: 'variable' }); 
    setNewIncome({ source: '', gross: '', net: '', date: new Date().toISOString().split('T')[0], payPeriod: '' }); 
  };

  const handleAddLiability = async () => { 
    if (!newLiability.name || !newLiability.currentBal) return; 
    await addItem('liabilities', { 
      ...newLiability, 
      statementBal: parseFloat(newLiability.statementBal)||0, 
      currentBal: parseFloat(newLiability.currentBal)||0, 
      minPayment: parseFloat(newLiability.minPayment)||0, 
      apr: parseFloat(newLiability.apr)||0, 
      lastPaymentDate: null 
    }); 
    setNewLiability({ name: '', type: 'revolving', statementBal: '', currentBal: '', minPayment: '', apr: '', closingDay: '', dueDay: '' }); 
  };

  const handleAddManualBill = async () => { 
    if (!manualBill.name || !manualBill.amount) return; 
    await addItem('bills', { ...manualBill, amount: parseFloat(manualBill.amount) }); 
    setManualBill({ name: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Uncategorized', recurring: false }); 
    alert("Bill added"); 
  };

  const handleAiParse = async () => { 
    if (!parseText) return; 
    setAiParseLoading(true); 
    const prompt = `Extract transaction details from text to JSON: { "name": "string", "amount": number, "date": "YYYY-MM-DD", "category": "string", "recurring": boolean }. Text: "${parseText}"`; 
    try { 
      const jsonStr = await callGemini(prompt); 
      const result = JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, '').trim()); 
      setParsedResult(result); 
    } catch (e) { alert("AI Parsing failed."); } 
    finally { setAiParseLoading(false); } 
  };

  const confirmParsedBill = async () => { 
    if (!parsedResult) return; 
    await addItem('bills', { ...parsedResult, amount: parseFloat(parsedResult.amount) }); 
    setParsedResult(null); 
    setParseText(''); 
    setEntryMode('manual'); 
    setActiveTab('bills'); 
  };

  const toggleBillPaid = async (bill) => { 
    await updateItem('bills', bill.id, { paid: !bill.paid }); 
  };

  const toggleLiabilityPaid = async (liability) => { 
    const now = new Date().toISOString(); 
    const { start, end } = currentBudgetCycle; 
    let isPaid = false; 
    if (liability.lastPaymentDate) { 
      const pd = new Date(liability.lastPaymentDate); 
      if (pd >= start && pd <= end) isPaid = true; 
    } 
    if (isPaid) await updateItem('liabilities', liability.id, { lastPaymentDate: null }); 
    else await updateItem('liabilities', liability.id, { lastPaymentDate: now }); 
  };

  const generateAiAdvice = async () => { 
    setAiLoading(true); 
    const prompt = `Financial Advisor check. Income: $${totalIncome}, Fixed Expenses: $${totalExpenses}, Debt: $${totalDebt}. Give 3 bullet points advice.`; 
    try { 
      const advice = await callGemini(prompt); 
      setAiAdvice(advice); 
    } catch (e) { setAiAdvice("AI unavailable."); } 
    finally { setAiLoading(false); } 
  };

  const handleConfirmCharge = async () => {
    if (!selectedLiability || !newCharge.amount) return;
    const newBal = parseFloat(selectedLiability.currentBal) + parseFloat(newCharge.amount);
    try {
      const liabilityRef = doc(db, 'artifacts', appId, 'users', user.uid, 'liabilities', selectedLiability.id);
      await updateDoc(liabilityRef, { currentBal: newBal });
      setChargeModalOpen(false);
    } catch (e) { console.error("Error updating balance:", e); }
  };

  const handleCloseStatement = async (liability) => {
    const interest = (parseFloat(liability.currentBal) * (parseFloat(liability.apr) / 100)) / 12;
    const newBal = parseFloat(liability.currentBal) + interest;
    if (window.confirm(`Close statement? Interest: $${interest.toFixed(2)}`)) {
      try {
        const liabilityRef = doc(db, 'artifacts', appId, 'users', user.uid, 'liabilities', liability.id);
        await updateDoc(liabilityRef, { currentBal: newBal, statementBal: newBal });
      } catch (e) { console.error("Error closing statement:", e); }
    }
  };

  // --- Helper Components ---
  const InfoIcon = ({size}) => <AlertCircle size={size} />;

  // --- Render Functions ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
      <Card className="p-6 border-l-4 border-l-purple-500 bg-purple-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-purple-200 text-purple-700"><Sparkles size={24} /></div>
            <div><h3 className="text-lg font-bold text-slate-800">AI Financial Advisor</h3><p className="text-slate-600 mt-1 text-sm">{aiAdvice || "Get smart analysis of your budget."}</p></div>
          </div>
          <Button onClick={generateAiAdvice} variant="magic" disabled={aiLoading} className="shrink-0">{aiLoading ? <Loader2 className="animate-spin" /> : "Get Insights"}</Button>
        </div>
        {aiAdvice && <div className="mt-4 p-4 bg-white rounded-lg border border-purple-100 text-slate-700 text-sm">{aiAdvice}</div>}
      </Card>

      <Card className="p-6 bg-slate-800 text-white">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2"><Clock className="text-yellow-400" size={20} /><h3 className="text-lg font-bold">Obligations</h3></div>
           <div className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{currentBudgetCycle.start.toLocaleDateString()} - {currentBudgetCycle.end.toLocaleDateString()}</div>
        </div>
        <div className="space-y-4">
          {categorizedObligations.overdue.length > 0 && (
            <div className="bg-red-900/30 border border-red-700 p-3 rounded-lg">
              <h4 className="text-red-300 font-bold text-sm mb-2">Overdue</h4>
              {categorizedObligations.overdue.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex gap-2"><span className="text-red-400 font-bold">${Number(item.amount).toFixed(2)}</span><button onClick={() => item.type === 'bill' ? toggleBillPaid(item) : toggleLiabilityPaid(item)}><Square className="text-red-400" size={16} /></button></div>
                </div>
              ))}
            </div>
          )}
          {categorizedObligations.current.length === 0 ? <p className="text-slate-500 text-sm italic">No pending bills this cycle.</p> : categorizedObligations.current.filter(i => !i.paid).map((item, idx) => (
             <div key={idx} className="flex justify-between items-center bg-slate-700/50 p-2 rounded">
                <span className="text-sm">{item.name}</span>
                <div className="flex gap-2 items-center"><span className="font-bold text-white">${Number(item.amount).toFixed(2)}</span><button onClick={() => item.type === 'bill' ? toggleBillPaid(item) : toggleLiabilityPaid(item)}><Square className="text-slate-400 hover:text-green-400" size={18} /></button></div>
             </div>
          ))}
          <div className="pt-2 border-t border-slate-700">
             <button onClick={() => setShowFuture(!showFuture)} className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white p-2 rounded hover:bg-slate-700"><span>Future Obligations ({categorizedObligations.future.length})</span>{showFuture ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
             {showFuture && <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-600">{categorizedObligations.future.map((item, idx) => <div key={idx} className="flex justify-between py-1 text-xs"><span className="text-slate-300">{item.name} <span className="text-slate-500">({item.dueDateDisplay})</span></span><span className="text-slate-400">${Number(item.amount).toFixed(2)}</span></div>)}</div>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-green-500"><p className="text-xs font-bold text-slate-500 uppercase">Income</p><h3 className="text-xl font-bold text-slate-800">${totalIncome.toLocaleString()}</h3></Card>
        <Card className="p-4 border-l-4 border-l-red-500 relative">
          <button onClick={() => setExpandedExpenses(!expandedExpenses)} className="w-full text-left"><div className="flex justify-between"><div><p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">Expenses {expandedExpenses ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}</p><h3 className="text-xl font-bold text-slate-800">${totalExpenses.toLocaleString()}</h3></div></div></button>
          {expandedExpenses && <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1"><div className="flex justify-between"><span className="text-slate-500">Bills:</span><span className="font-medium">${totalBillExpenses.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-500">Misc:</span><span className="font-medium">${totalMiscExpenses.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-500">Debt Min:</span><span className="font-medium">${totalMinPayments.toFixed(2)}</span></div></div>}
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500"><p className="text-xs font-bold text-slate-500 uppercase">Total Debt</p><h3 className="text-xl font-bold text-purple-700">${totalDebt.toLocaleString()}</h3></Card>
        <Card className="p-4 border-l-4 border-l-blue-500"><p className="text-xs font-bold text-slate-500 uppercase">Remaining</p><h3 className={`text-xl font-bold ${remaining >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>${remaining.toLocaleString()}</h3></Card>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Daily Expenses</h2>
        <div>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          <Button onClick={() => fileInputRef.current?.click()} variant="magic" disabled={aiParseLoading}>
            {aiParseLoading ? <Loader2 className="animate-spin" size={18} /> : <><Camera size={18} /> Scan Receipt</>}
          </Button>
        </div>
      </div>

      <Card className="p-6 border-blue-100 shadow-md">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Add Expense</h3>
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Merchant / Description</label><input type="text" placeholder="e.g. Starbucks" value={newExpense.name} onChange={e => setNewExpense({...newExpense, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount</label><input type="number" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label><input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg" /></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 text-slate-400" size={18} />
              <select value={newExpense.paymentMethod} onChange={e => setNewExpense({...newExpense, paymentMethod: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-lg appearance-none bg-white">
                <option value="bank">🏦 Bank Account / Cash</option>
                {liabilities.filter(l => l.type === 'revolving').map(card => <option key={card.id} value={card.id}>💳 {card.name}</option>)}
              </select>
            </div>
            {newExpense.paymentMethod !== 'bank' && <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><InfoIcon size={12} /> Adds to credit card balance.</p>}
          </div>
          <Button onClick={handleAddExpense} className="w-full">Save Expense</Button>
        </div>
      </Card>

      <div className="space-y-2">
        <h4 className="font-semibold text-slate-700">Recent Transactions</h4>
        {expenses.slice(0, 5).map(exp => (
          <div key={exp.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div><p className="font-medium text-slate-800">{exp.name}</p><div className="flex gap-2 text-xs text-slate-500"><span>{exp.date}</span><span className="bg-slate-100 px-1 rounded">{exp.category}</span></div></div>
            <div className="text-right"><span className="font-bold text-slate-800">-${Number(exp.amount).toFixed(2)}</span><button onClick={() => deleteItem('expenses', exp.id)} className="ml-3 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></div>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-center text-slate-400 py-4">No expenses recorded yet.</p>}
      </div>
    </div>
  );

  const renderParser = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1 rounded-lg flex">
          <button onClick={() => setEntryMode('manual')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${entryMode === 'manual' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Manual Entry</button>
          <button onClick={() => setEntryMode('scan')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${entryMode === 'scan' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}>Scan with AI</button>
        </div>
      </div>
      {entryMode === 'scan' ? (
        <Card className="p-6">
          <textarea value={parseText} onChange={(e) => setParseText(e.target.value)} placeholder="Paste bill text..." className="w-full h-40 p-4 border rounded-lg mb-4 font-mono text-sm" />
          <div className="flex justify-end"><Button onClick={handleAiParse} variant="magic" disabled={aiParseLoading}>{aiParseLoading ? <Loader2 className="animate-spin" /> : "Parse"}</Button></div>
        </Card>
      ) : (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Add Bill Manually</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-bold uppercase text-slate-500">Name</label><input value={manualBill.name} onChange={e => setManualBill({...manualBill, name: e.target.value})} className="w-full p-3 border rounded" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold uppercase text-slate-500">Amount</label><input type="number" value={manualBill.amount} onChange={e => setManualBill({...manualBill, amount: e.target.value})} className="w-full p-3 border rounded" /></div>
              <div><label className="text-xs font-bold uppercase text-slate-500">Date</label><input type="date" value={manualBill.date} onChange={e => setManualBill({...manualBill, date: e.target.value})} className="w-full p-3 border rounded" /></div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded border"><input type="checkbox" checked={manualBill.recurring} onChange={e => setManualBill({...manualBill, recurring: e.target.checked})} /><label className="text-sm">Recurring Monthly</label></div>
            <Button onClick={handleAddManualBill} className="w-full">Save Bill</Button>
          </div>
        </Card>
      )}
      {parsedResult && entryMode === 'scan' && (
        <Card className="p-6 bg-purple-50 border-purple-100 mt-4">
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <input value={parsedResult.name} onChange={e => setParsedResult({...parsedResult, name: e.target.value})} className="p-2 border rounded" />
                <input type="number" value={parsedResult.amount} onChange={e => setParsedResult({...parsedResult, amount: e.target.value})} className="p-2 border rounded" />
             </div>
             <input type="date" value={parsedResult.date} onChange={e => setParsedResult({...parsedResult, date: e.target.value})} className="w-full p-2 border rounded" />
             <div className="flex gap-2"><Button onClick={confirmParsedBill} className="w-full">Add</Button><Button onClick={() => setParsedResult(null)} variant="secondary">Cancel</Button></div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderIncome = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-4"><Settings className="text-blue-600" size={20} /><h3 className="font-bold text-slate-800">Budget Cycle</h3></div>
            <div className="space-y-3">
              <div><label className="text-xs font-bold uppercase text-blue-700">Start Date</label><input type="date" value={budgetConfig.startDate} onChange={e => setBudgetConfig({...budgetConfig, startDate: e.target.value})} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold uppercase text-blue-700">Pay Date</label><input type="date" value={budgetConfig.payDate} onChange={e => setBudgetConfig({...budgetConfig, payDate: e.target.value})} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold uppercase text-blue-700">Frequency</label><select value={budgetConfig.frequency} onChange={e => setBudgetConfig({...budgetConfig, frequency: e.target.value})} className="w-full p-2 border rounded"><option value="weekly">Weekly</option><option value="bi-weekly">Bi-Weekly</option><option value="monthly">Monthly</option></select></div>
              <Button onClick={handleSaveBudgetConfig} className="w-full text-xs">Save Settings</Button>
            </div>
          </Card>
          <Card className="p-6 bg-slate-50 border-slate-200">
             <h3 className="font-bold mb-4">Calibration</h3>
             <form onSubmit={handleAddHistorical} className="space-y-2"><input name="gross" placeholder="Gross" className="w-full p-2 border rounded"/><input name="net" placeholder="Net" className="w-full p-2 border rounded"/><Button type="submit" className="w-full">Add History</Button></form>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
           <Card className="p-6 border-blue-100 shadow-md">
              <h3 className="text-xl font-bold mb-4">Add Income</h3>
              <div className="space-y-4">
                 <input placeholder="Source" value={newIncome.source} onChange={e => setNewIncome({...newIncome, source: e.target.value})} className="w-full p-3 border rounded"/>
                 <div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Gross" value={newIncome.gross} onChange={handleGrossChange} className="p-3 border rounded"/><input type="number" placeholder="Net" value={newIncome.net} onChange={e => setNewIncome({...newIncome, net: e.target.value})} className="p-3 border rounded"/></div>
                 <Button onClick={handleAddIncome} className="w-full">Add Income</Button>
              </div>
           </Card>
           <div className="space-y-2">{incomes.map(i => <div key={i.id} className="flex justify-between p-3 bg-white border rounded"><span>{i.source}</span><span>${i.amount}</span><button onClick={() => deleteItem('incomes', i.id)}><Trash2 size={16} /></button></div>)}</div>
        </div>
      </div>
    </div>
  );

  const renderLiabilities = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-5 bg-slate-50 border-slate-200 sticky top-4">
            <h3 className="font-bold text-slate-800 mb-4">Add Liability</h3>
            <div className="space-y-3">
               <div className="flex bg-white rounded p-1 border"><button onClick={() => setNewLiability({...newLiability, type: 'revolving'})} className={`flex-1 py-1 rounded ${newLiability.type === 'revolving' ? 'bg-purple-100' : ''}`}>Card</button><button onClick={() => setNewLiability({...newLiability, type: 'installment'})} className={`flex-1 py-1 rounded ${newLiability.type === 'installment' ? 'bg-blue-100' : ''}`}>Loan</button></div>
               <input placeholder="Name" value={newLiability.name} onChange={e => setNewLiability({...newLiability, name: e.target.value})} className="w-full p-2 border rounded"/>
               <input type="number" placeholder="Current Balance" value={newLiability.currentBal} onChange={e => setNewLiability({...newLiability, currentBal: e.target.value})} className="w-full p-2 border rounded"/>
               <input type="number" placeholder="Min Payment" value={newLiability.minPayment} onChange={e => setNewLiability({...newLiability, minPayment: e.target.value})} className="w-full p-2 border rounded"/>
               <Button onClick={handleAddLiability} className="w-full">Add Liability</Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
           <div className="border rounded-xl overflow-hidden bg-white">
              <button onClick={() => setCollapsedSections(p => ({...p, revolving: !p.revolving}))} className="w-full p-4 bg-purple-50 flex justify-between font-bold text-purple-800">Revolving Credit {collapsedSections.revolving ? <ChevronDown/> : <ChevronUp/>}</button>
              {!collapsedSections.revolving && <div className="p-4 space-y-3">{liabilities.filter(l => l.type === 'revolving').map(l => <div key={l.id} className="p-3 border rounded flex justify-between"><span>{l.name}</span><span>${l.currentBal}</span></div>)}</div>}
           </div>
           <div className="border rounded-xl overflow-hidden bg-white">
              <button onClick={() => setCollapsedSections(p => ({...p, installment: !p.installment}))} className="w-full p-4 bg-blue-50 flex justify-between font-bold text-blue-800">Installment Loans {collapsedSections.installment ? <ChevronDown/> : <ChevronUp/>}</button>
              {!collapsedSections.installment && <div className="p-4 space-y-3">{liabilities.filter(l => l.type === 'installment').map(l => <div key={l.id} className="p-3 border rounded flex justify-between"><span>{l.name}</span><span>${l.currentBal}</span></div>)}</div>}
           </div>
        </div>
      </div>
      {chargeModalOpen && selectedLiability && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
           <Card className="w-full max-w-sm p-6 relative">
              <button onClick={() => setChargeModalOpen(false)} className="absolute top-4 right-4"><X/></button>
              <h3 className="font-bold mb-4">Add Charge</h3>
              <input type="number" placeholder="Amount" value={newCharge.amount} onChange={e => setNewCharge({...newCharge, amount: e.target.value})} className="w-full p-2 border rounded mb-4"/>
              <Button onClick={handleConfirmCharge} className="w-full">Add</Button>
           </Card>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
     <div className="max-w-md mx-auto space-y-6 animate-in fade-in">
        <div className="text-center"><div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><User size={40} /></div><h2 className="text-2xl font-bold">Profile</h2><p>{user?.displayName}</p></div>
        <Card className="p-6"><Button onClick={handleLogout} variant="danger" className="w-full">Logout</Button></Card>
     </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Card className="w-full max-w-md p-8"><h1 className="text-2xl font-bold mb-4 text-center">SmartBudget</h1><Button onClick={handleGoogleLogin} className="w-full" variant="google">Sign in with Google</Button><div className="my-4 text-center text-xs text-slate-400">OR</div><form onSubmit={handleEmailAuth} className="space-y-2"><input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="w-full p-2 border rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><Button type="submit" className="w-full">{authMode === 'login' ? 'Sign In' : 'Sign Up'}</Button></form><div className="mt-4 text-center text-xs text-blue-500 cursor-pointer" onClick={() => setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Create Account':'Have an account?'}</div></Card></div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-24">
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'bills' && renderParser()}
        {activeTab === 'expenses' && renderExpenses()}
        {activeTab === 'income' && renderIncome()}
        {activeTab === 'liabilities' && renderLiabilities()}
        {activeTab === 'profile' && renderProfile()}
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {[{ id: 'dashboard', icon: <TrendingUp size={20} />, label: 'Dash' }, { id: 'bills', icon: <Receipt size={20} />, label: 'Bills' }, { id: 'expenses', icon: <DollarSign size={20} />, label: 'Spend' }, { id: 'income', icon: <Landmark size={20} />, label: 'Income' }, { id: 'liabilities', icon: <CreditCard size={20} />, label: 'Debt' }, { id: 'profile', icon: <User size={20} />, label: 'Profile' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${activeTab === tab.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>{tab.icon}<span className="text-[10px] font-medium">{tab.label}</span></button>
          ))}
        </div>
      </div>
    </div>
  );
}