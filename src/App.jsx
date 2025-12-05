import React, { useState, useEffect, useMemo } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";

// --- Firebase Initialization ---
// NOTE: You must replace these values with your actual Firebase config keys
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
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- API Helper ---
const callGemini = async (prompt) => {
  // NOTE FOR DEPLOYMENT: 
  // In your local VS Code project, CHANGE this line to: 
  // const apiKey = import.meta.env.VITE_GEMINI_KEY;
  const apiKey = import.meta.env.VITE_GEMINI_KEY; 
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
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
    magic: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md"
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
  // --- State ---
  const [user, setUser] = useState(null); 
  const [budgetId, setBudgetId] = useState(''); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Auth/Login UI State
  const [inputBudgetId, setInputBudgetId] = useState('');
  const [showLogin, setShowLogin] = useState(true);

  // Profile Data
  const [displayName, setDisplayName] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Data State
  const [incomes, setIncomes] = useState([]);
  const [bills, setBills] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [historicalPaychecks, setHistoricalPaychecks] = useState([]);
  
  // AI State
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParseLoading, setAiParseLoading] = useState(false);
  
  // Debug State
  const [debugStats, setDebugStats] = useState({ loaded: 0, matched: 0 });

  // Inputs State
  const [parseText, setParseText] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  
  // Income Input
  const [newIncome, setNewIncome] = useState({ 
    source: '', 
    gross: '', 
    net: '', 
    date: new Date().toISOString().split('T')[0],
    payPeriod: '' 
  });
  const [isAutoCalc, setIsAutoCalc] = useState(true);
  
  // Liability Input
  const [newLiability, setNewLiability] = useState({
    name: '',
    type: 'revolving', 
    statementBal: '',
    currentBal: '',
    minPayment: '',
    apr: '',
    closingDay: '', 
    dueDay: ''      
  });

  // Modal State for Charges
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState(null);
  const [newCharge, setNewCharge] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });

  // --- 1. Authentication & Initialization ---
  
  useEffect(() => {
    const initApp = async () => {
      const storedId = localStorage.getItem('smart_budget_id');
      if (storedId) {
        setBudgetId(storedId);
        setShowLogin(false);
      }
      // Authenticate to Firebase
      // Check for environment variable token first (for preview), else anonymous
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
          await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
    };
    initApp();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Data Syncing ---
  
  useEffect(() => {
    if (!user || !budgetId) return;

    const createListener = (collectionName, setter) => {
      const q = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
      return onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter strictly by Budget ID
        const myData = allData.filter(item => item.budgetId && item.budgetId === budgetId);
        
        // Debugging Stats (Count strictly what we found vs what we filtered)
        if (collectionName === 'incomes') { 
             setDebugStats(prev => ({ ...prev, loaded: allData.length, matched: myData.length }));
        }

        myData.sort((a, b) => {
           if (a.date && b.date) return new Date(b.date) - new Date(a.date);
           return 0;
        });
        setter(myData);
      }, (error) => console.error(`Error syncing ${collectionName}:`, error));
    };

    const unsubIncomes = createListener('incomes', setIncomes);
    const unsubBills = createListener('bills', setBills);
    const unsubLiabilities = createListener('liabilities', setLiabilities);
    const unsubHistory = createListener('historicalPaychecks', setHistoricalPaychecks);

    // Profile Fetch
    const fetchProfile = async () => {
       try {
         const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', budgetId);
         onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
              setDisplayName(doc.data().displayName);
            }
         });
       } catch (e) { console.error("Profile fetch error", e); }
    };
    fetchProfile();

    return () => {
      unsubIncomes();
      unsubBills();
      unsubLiabilities();
      unsubHistory();
    };
  }, [user, budgetId]);

  // --- Handlers ---

  const handleLogin = (e) => {
    e.preventDefault();
    if (!inputBudgetId.trim()) return;
    const cleanId = inputBudgetId.trim(); 
    localStorage.setItem('smart_budget_id', cleanId);
    setBudgetId(cleanId);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('smart_budget_id');
    setBudgetId('');
    setIncomes([]);
    setBills([]);
    setLiabilities([]);
    setDisplayName('');
    setInputBudgetId('');
    setShowLogin(true);
  };

  const handleUpdateProfileName = async (e) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    if (!user) { alert("Error: User not authenticated. Check Firebase Auth settings."); return; }
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', budgetId), {
        displayName: tempName,
        budgetId: budgetId
      });
      setDisplayName(tempName);
      setIsEditingProfile(false);
    } catch (e) { 
      console.error("Error saving profile", e); 
      alert("Failed to save profile. Check Firestore Rules or Network.");
    }
  };

  const addItem = async (collectionName, item) => {
    if (!user) throw new Error("User not authenticated");
    if (!budgetId) throw new Error("Budget ID missing");
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), {
        ...item,
        budgetId: budgetId 
      });
    } catch (e) { 
      console.error("Error adding item:", e);
      throw e; 
    }
  };

  const deleteItem = async (collectionName, id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
    } catch (e) { console.error("Error deleting:", e); }
  };

  // --- Logic & Calculations ---
  
  const deductionStats = useMemo(() => {
    if (historicalPaychecks.length === 0) return { rate: 0, label: '0%' };
    const totalGross = historicalPaychecks.reduce((acc, curr) => acc + Number(curr.gross), 0);
    const totalNet = historicalPaychecks.reduce((acc, curr) => acc + Number(curr.net), 0);
    const deductionRate = 1 - (totalNet / totalGross);
    return {
      rate: deductionRate,
      label: `${(deductionRate * 100).toFixed(1)}%`
    };
  }, [historicalPaychecks]);

  const totalIncome = incomes.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalBillExpenses = bills.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalDebt = liabilities.reduce((acc, curr) => acc + Number(curr.currentBal), 0);
  const totalMinPayments = liabilities.reduce((acc, curr) => acc + Number(curr.minPayment), 0);
  const totalExpenses = totalBillExpenses + totalMinPayments;
  const remaining = totalIncome - totalExpenses;

  const getNextOccurrence = (day) => {
    if (!day) return null;
    const today = new Date();
    const d = new Date();
    d.setDate(parseInt(day));
    if (d < today) d.setMonth(d.getMonth() + 1);
    return d;
  };

  const dueSoonItems = useMemo(() => {
    const today = new Date();
    const endWindow = new Date(today);
    endWindow.setDate(today.getDate() + 14);

    const dueBills = bills.filter(b => {
      if (!b.date) return false;
      const d = new Date(b.date);
      return d >= today && d <= endWindow;
    }).map(b => ({ ...b, type: 'bill', due: b.date }));

    const dueLiabilities = liabilities.filter(l => {
      let d = null;
      if (l.dueDay) {
        d = getNextOccurrence(l.dueDay);
      } else if (l.dueDate) {
        d = new Date(l.dueDate); 
      }
      return d && d >= today && d <= endWindow;
    }).map(l => ({ 
      ...l, 
      type: 'liability', 
      due: l.dueDay ? getNextOccurrence(l.dueDay).toISOString().split('T')[0] : l.dueDate, 
      amount: l.minPayment 
    }));

    return [...dueBills, ...dueLiabilities].sort((a,b) => new Date(a.due) - new Date(b.due));
  }, [bills, liabilities]);

  // --- AI Features ---

  const generateAiAdvice = async () => {
    setAiLoading(true);
    const snapshot = `
      Total Monthly Income: $${totalIncome}
      Total Monthly Fixed Expenses (Bills + Min Payments): $${totalExpenses}
      Remaining Cash Flow: $${remaining}
      
      Debts:
      ${liabilities.map(l => `- ${l.name}: Balance $${l.currentBal}, APR ${l.apr}%, Min Payment $${l.minPayment}`).join('\n')}
      
      Bills Due Soon:
      ${dueSoonItems.map(i => `- ${i.name} due on ${i.due} ($${i.amount})`).join('\n')}
    `;

    const prompt = `You are a helpful financial advisor. Analyze this budget snapshot:\n${snapshot}\n\nProvide 3 short, actionable bullet points. 1. Cash flow health check. 2. A specific debt payoff or savings strategy based on the highest APR or dates. 3. A warning or tip for the next 14 days. Keep it encouraging and under 150 words.`;

    try {
      const advice = await callGemini(prompt);
      setAiAdvice(advice);
    } catch (e) {
      setAiAdvice("Could not generate insights at this moment.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiParse = async () => {
    if (!parseText) return;
    setAiParseLoading(true);
    const prompt = `Extract transaction details from this text into a JSON object with keys: "name" (merchant name), "amount" (number only), "date" (YYYY-MM-DD), and "category" (choose from Utilities, Rent, Food, Insurance, Entertainment, Uncategorized). If date is missing use today's date. Text: "${parseText}"`;
    
    try {
      const jsonStr = await callGemini(prompt);
      const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);
      setParsedResult(result);
    } catch (e) {
      alert("AI Parsing failed. Please try standard parsing or check text.");
    } finally {
      setAiParseLoading(false);
    }
  };

  // --- Liability Interactions ---
  const openChargeModal = (liability) => {
    setSelectedLiability(liability);
    setNewCharge({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });
    setChargeModalOpen(true);
  };

  const handleConfirmCharge = async () => {
    if (!selectedLiability || !newCharge.amount) return;
    const newBal = parseFloat(selectedLiability.currentBal) + parseFloat(newCharge.amount);
    try {
      const liabilityRef = doc(db, 'artifacts', appId, 'public', 'data', 'liabilities', selectedLiability.id);
      await updateDoc(liabilityRef, { currentBal: newBal });
      setChargeModalOpen(false);
    } catch (e) { console.error("Error updating balance:", e); }
  };

  const handleCloseStatement = async (liability) => {
    const interest = (parseFloat(liability.currentBal) * (parseFloat(liability.apr) / 100)) / 12;
    const newBal = parseFloat(liability.currentBal) + interest;
    
    if (window.confirm(`Close statement for ${liability.name}?\n\nInterest Added: $${interest.toFixed(2)}\nNew Balance: $${newBal.toFixed(2)}`)) {
      try {
        const liabilityRef = doc(db, 'artifacts', appId, 'public', 'data', 'liabilities', liability.id);
        await updateDoc(liabilityRef, { 
          currentBal: newBal,
          statementBal: newBal 
        });
      } catch (e) { console.error("Error closing statement:", e); }
    }
  };

  const getStatementEstimate = () => {
    if (!selectedLiability?.closingDay && !selectedLiability?.closingDate) return "Unknown";
    const closingDay = parseInt(selectedLiability.closingDay || selectedLiability.closingDate.split('-')[2]);
    const chargeDay = parseInt(newCharge.date.split('-')[2]);
    return chargeDay <= closingDay ? "Current Statement (Due soon)" : "Next Statement (Due next cycle)";
  };

  // --- Add Handlers ---
  const handleAddHistorical = (e) => {
    e.preventDefault();
    const gross = parseFloat(e.target.gross.value);
    const net = parseFloat(e.target.net.value);
    if (gross && net) {
      try {
        addItem('historicalPaychecks', { date: e.target.date.value, gross, net });
        e.target.reset();
      } catch (err) { alert("Failed to add record. Check console/auth."); }
    }
  };

  const handleCalculateNet = (grossVal) => {
    if (!grossVal) return '';
    const gross = parseFloat(grossVal);
    const estimatedNet = gross * (1 - deductionStats.rate);
    return estimatedNet.toFixed(2);
  };

  const handleGrossChange = (e) => {
    const gross = e.target.value;
    setNewIncome(prev => ({
      ...prev, 
      gross,
      net: isAutoCalc ? handleCalculateNet(gross) : prev.net
    }));
  };

  const handleAddIncome = async () => {
    if (!newIncome.source || !newIncome.net) return;
    try {
      await addItem('incomes', {
        source: newIncome.source,
        amount: parseFloat(newIncome.net),
        date: newIncome.date,
        payPeriod: newIncome.payPeriod,
        type: 'variable'
      });
      setNewIncome({ source: '', gross: '', net: '', date: new Date().toISOString().split('T')[0], payPeriod: '' });
    } catch (e) {
      alert("Failed to add income: " + e.message);
    }
  };

  const handleAddLiability = async () => {
    if (!newLiability.name || !newLiability.currentBal) return;
    try {
      await addItem('liabilities', {
        ...newLiability,
        statementBal: parseFloat(newLiability.statementBal) || 0,
        currentBal: parseFloat(newLiability.currentBal) || 0,
        minPayment: parseFloat(newLiability.minPayment) || 0,
        apr: parseFloat(newLiability.apr) || 0
      });
      setNewLiability({
        name: '', type: 'revolving', statementBal: '', currentBal: '', 
        minPayment: '', apr: '', closingDay: '', dueDay: ''
      });
    } catch (e) {
      alert("Failed to add liability: " + e.message);
    }
  };

  const parseBillText = () => {
    const amountPattern = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
    const datePattern = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}/i;
    const lines = parseText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let foundAmount = null;
    let foundDate = null;
    let foundName = "Unknown Vendor";
    const amountMatch = parseText.match(amountPattern);
    if (amountMatch) foundAmount = amountMatch[1].replace(',', '');
    const dateMatch = parseText.match(datePattern);
    if (dateMatch) foundDate = dateMatch[0];
    if (lines.length > 0) {
      const potentialName = lines.find(l => !l.match(amountPattern) && !l.match(datePattern) && l.length > 3);
      if (potentialName) foundName = potentialName.substring(0, 20);
    }
    setParsedResult({
      name: foundName,
      amount: foundAmount || '',
      date: foundDate || new Date().toISOString().split('T')[0],
      category: 'Uncategorized'
    });
  };

  const confirmParsedBill = async () => {
    if (!parsedResult) return;
    try {
      await addItem('bills', { ...parsedResult, amount: parseFloat(parsedResult.amount) });
      setParsedResult(null);
      setParseText('');
      setActiveTab('bills');
    } catch (e) {
      alert("Failed to add bill: " + e.message);
    }
  };

  // --- Render Functions ---

  const renderLogin = () => (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 rotate-3">
            <Key size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SmartBudget Login</h1>
          <p className="text-slate-500 mt-2">Enter your Personal Budget ID</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Budget ID (Passphrase)</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                required
                value={inputBudgetId}
                onChange={(e) => setInputBudgetId(e.target.value)}
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono text-center text-lg tracking-wide"
                placeholder="e.g. alex-2025"
              />
            </div>
          </div>
          <Button type="submit" className="w-full py-3">Access Budget</Button>
        </form>
      </Card>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
      <Card className="p-6 border-l-4 border-l-purple-500 bg-purple-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-purple-200 text-purple-700">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">AI Financial Advisor</h3>
              <p className="text-slate-600 mt-1 text-sm">
                {aiAdvice ? "Here is your personalized report:" : "Get a smart analysis of your budget, debts, and cash flow."}
              </p>
            </div>
          </div>
          <Button onClick={generateAiAdvice} variant="magic" disabled={aiLoading} className="shrink-0">
            {aiLoading ? <Loader2 className="animate-spin" /> : <><Sparkles size={16} /> Get AI Insights</>}
          </Button>
        </div>
        
        {aiAdvice && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-purple-100 text-slate-700 text-sm leading-relaxed whitespace-pre-line animate-in fade-in slide-in-from-top-2">
            {aiAdvice}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-slate-800 text-white">
        <div className="flex items-center gap-2 mb-4">
           <Clock className="text-yellow-400" size={20} />
           <h3 className="text-lg font-bold">Due Soon (Next 14 Days)</h3>
        </div>
        <div className="space-y-2">
          {dueSoonItems.length === 0 ? (
            <p className="text-slate-400 text-sm italic">No obligations due in this pay period.</p>
          ) : (
            dueSoonItems.map((item, idx) => (
               <div key={idx} className="flex justify-between items-center bg-slate-700/50 p-2 rounded">
                  <div className="flex items-center gap-2">
                     {item.type === 'bill' ? <Receipt size={14} className="text-blue-300" /> : <CreditCard size={14} className="text-purple-300" />}
                     <div>
                       <p className="text-sm font-medium">{item.name}</p>
                       <p className="text-xs text-slate-400">Due: {item.due}</p>
                     </div>
                  </div>
                  <span className="font-bold text-yellow-300">
                    ${item.type === 'bill' ? item.amount.toFixed(2) : item.minPayment.toFixed(2)}
                  </span>
               </div>
            ))
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Income</p>
          <h3 className="text-xl font-bold text-slate-800">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Expenses</p>
          <h3 className="text-xl font-bold text-slate-800">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-400 mt-1">Bills + Min Payments</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Debt</p>
          <h3 className="text-xl font-bold text-purple-700">${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </Card>
        <Card className={`p-4 border-l-4 ${remaining >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <p className="text-xs font-bold text-slate-500 uppercase">Remaining</p>
          <h3 className={`text-xl font-bold ${remaining >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-purple-600" /> Active Liabilities
          </h4>
          <div className="space-y-3">
             {liabilities.length === 0 && <p className="text-slate-400 text-sm italic">No liabilities tracked.</p>}
             {liabilities.slice(0, 4).map(l => (
               <div key={l.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div>
                   <p className="font-medium text-slate-700">{l.name}</p>
                   <p className="text-xs text-slate-500">
                      {l.type === 'revolving' ? 
                       `Due Day: ${l.dueDay || 'N/A'}` : 
                       `APR: ${l.apr}%`}
                   </p>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-purple-700">${l.currentBal.toFixed(2)}</p>
                   <p className="text-xs text-slate-400">Min: ${l.minPayment}</p>
                 </div>
               </div>
             ))}
             {liabilities.length > 4 && (
               <button onClick={() => setActiveTab('liabilities')} className="w-full text-center text-sm text-blue-600 hover:underline mt-2">
                 View all {liabilities.length} liabilities
               </button>
             )}
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-red-600" /> Recent Bills
          </h4>
          <div className="space-y-3">
            {bills.slice(0, 3).map(bill => (
              <div key={bill.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-700">{bill.name}</p>
                  <p className="text-xs text-slate-500">{bill.date}</p>
                </div>
                <span className="font-bold text-slate-700">-${bill.amount.toFixed(2)}</span>
              </div>
            ))}
            {bills.length === 0 && <p className="text-slate-400 text-sm italic">No bills recorded.</p>}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderLiabilities = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-5 bg-slate-50 border-slate-200 sticky top-4">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-purple-600" /> Add Liability
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 mt-1">
                  <button onClick={() => setNewLiability({...newLiability, type: 'revolving'})} className={`flex-1 py-1.5 text-xs font-medium rounded ${newLiability.type === 'revolving' ? 'bg-purple-100 text-purple-700' : 'text-slate-500'}`}>Revolving (CC)</button>
                  <button onClick={() => setNewLiability({...newLiability, type: 'installment'})} className={`flex-1 py-1.5 text-xs font-medium rounded ${newLiability.type === 'installment' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}>Installment</button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Creditor Name</label>
                <input type="text" placeholder="e.g. Chase Visa" value={newLiability.name} onChange={e => setNewLiability({...newLiability, name: e.target.value})} className="w-full p-2 text-sm border rounded" />
              </div>

              {/* Dynamic Fields */}
              {newLiability.type === 'revolving' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Statement Bal</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-slate-400">$</span>
                        <input type="number" placeholder="0.00" value={newLiability.statementBal} onChange={e => setNewLiability({...newLiability, statementBal: e.target.value})} className="w-full pl-6 p-2 text-sm border rounded" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Bal</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-slate-400">$</span>
                        <input type="number" placeholder="0.00" value={newLiability.currentBal} onChange={e => setNewLiability({...newLiability, currentBal: e.target.value})} className="w-full pl-6 p-2 text-sm border rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Min Pay</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-slate-400">$</span>
                        <input type="number" placeholder="0.00" value={newLiability.minPayment} onChange={e => setNewLiability({...newLiability, minPayment: e.target.value})} className="w-full pl-6 p-2 text-sm border rounded" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">APR %</label>
                      <input type="number" placeholder="24.99" value={newLiability.apr} onChange={e => setNewLiability({...newLiability, apr: e.target.value})} className="w-full p-2 text-sm border rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Closing Day (1-31)</label>
                      <input type="number" min="1" max="31" placeholder="DD" value={newLiability.closingDay} onChange={e => setNewLiability({...newLiability, closingDay: e.target.value})} className="w-full p-2 text-sm border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Due Day (1-31)</label>
                      <input type="number" min="1" max="31" placeholder="DD" value={newLiability.dueDay} onChange={e => setNewLiability({...newLiability, dueDay: e.target.value})} className="w-full p-2 text-sm border rounded" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remaining Principal</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-slate-400">$</span>
                      <input type="number" placeholder="Total Loan Amount" value={newLiability.currentBal} onChange={e => setNewLiability({...newLiability, currentBal: e.target.value})} className="w-full pl-6 p-2 text-sm border rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Monthly Pay</label>
                      <div className="relative">
                         <span className="absolute left-2 top-2 text-slate-400">$</span>
                         <input type="number" placeholder="0.00" value={newLiability.minPayment} onChange={e => setNewLiability({...newLiability, minPayment: e.target.value})} className="w-full pl-6 p-2 text-sm border rounded" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">APR %</label>
                      <input type="number" placeholder="5.0" value={newLiability.apr} onChange={e => setNewLiability({...newLiability, apr: e.target.value})} className="w-full p-2 text-sm border rounded" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Due Day (1-31)</label>
                    <input type="number" min="1" max="31" placeholder="Day of Month" value={newLiability.dueDay} onChange={e => setNewLiability({...newLiability, dueDay: e.target.value})} className="w-full p-2 text-sm border rounded" />
                  </div>
                </>
              )}
              
              <Button onClick={handleAddLiability} className="w-full mt-2 text-sm">Add Liability</Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Revolving */}
          <div>
            <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              <CreditCard size={20} /> Revolving Credit
            </h3>
            <div className="space-y-3">
              {liabilities.filter(l => l.type === 'revolving').map(debt => {
                const newCharges = Math.max(0, debt.currentBal - debt.statementBal);
                return (
                  <Card key={debt.id} className="p-4 border-l-4 border-l-purple-400">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-800">{debt.name}</h4>
                        <div className="flex gap-2 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Calendar size={10} /> Close Day: {debt.closingDay || 'N/A'}</span>
                          <span className="flex items-center gap-1"><AlertCircle size={10} /> Due Day: {debt.dueDay || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-800">${debt.currentBal.toFixed(2)}</div>
                        <div className="text-xs text-slate-500">Current Balance</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                      <div>
                        <p className="text-slate-500">Statement Bal</p>
                        <p className="font-semibold text-slate-700">${debt.statementBal.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">New Charges</p>
                        <p className="font-semibold text-orange-600">+${newCharges.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Min Payment</p>
                        <p className="font-semibold text-red-600">${debt.minPayment.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 justify-end items-center border-t border-slate-100 pt-3">
                      <Button onClick={() => openChargeModal(debt)} variant="secondary" className="px-3 py-1.5 text-xs">
                         <Plus size={14} /> Add Charge
                      </Button>
                      <Button onClick={() => handleCloseStatement(debt)} variant="outline" className="px-3 py-1.5 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100">
                         <RefreshCw size={14} /> Close Stmt
                      </Button>
                      <button onClick={() => deleteItem('liabilities', debt.id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-2">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                );
              })}
              {liabilities.filter(l => l.type === 'revolving').length === 0 && <p className="text-sm text-slate-400 italic">No revolving accounts.</p>}
            </div>
          </div>

          {/* Installment */}
          <div>
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              <History size={20} /> Installment Loans
            </h3>
            <div className="space-y-3">
              {liabilities.filter(l => l.type === 'installment').map(debt => (
                <Card key={debt.id} className="p-4 border-l-4 border-l-blue-400">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{debt.name}</h4>
                        <span className="text-xs text-slate-500">APR: {debt.apr}%</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-slate-800">${debt.currentBal.toFixed(2)}</div>
                        <div className="text-xs text-slate-500">Remaining Principal</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs">
                      <span className="text-slate-600">Monthly Payment: <span className="font-bold text-red-600">${debt.minPayment.toFixed(2)}</span></span>
                      <span className="text-slate-600">Due Day: {debt.dueDay || 'N/A'}</span>
                    </div>
                     <div className="mt-2 flex justify-end">
                      <button onClick={() => deleteItem('liabilities', debt.id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                </Card>
              ))}
               {liabilities.filter(l => l.type === 'installment').length === 0 && <p className="text-sm text-slate-400 italic">No installment loans.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Charge Modal */}
      {chargeModalOpen && selectedLiability && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-sm p-6 relative">
            <button onClick={() => setChargeModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add Charge to {selectedLiability.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
                <input 
                  type="date"
                  value={newCharge.date}
                  onChange={e => setNewCharge({...newCharge, date: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={newCharge.amount}
                  onChange={e => setNewCharge({...newCharge, amount: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 flex gap-2 items-start">
                 <Lightbulb size={16} className="shrink-0 mt-0.5" />
                 <div>
                   <span className="font-bold">Statement Estimate:</span><br/>
                   Based on closing day ({selectedLiability.closingDay}), this charge will appear on your: <br/>
                   <span className="font-bold underline">{getStatementEstimate()}</span>
                 </div>
              </div>
              <Button onClick={handleConfirmCharge} className="w-full">Add to Balance</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  const renderIncome = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calibration Section */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-blue-600" size={20} />
              <h3 className="font-bold text-slate-800">1. Calibration</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Input past paychecks to determine your tax/deduction rate.</p>
            <form onSubmit={handleAddHistorical} className="space-y-3 mb-6">
              <input name="date" type="date" required className="w-full p-2 text-sm border rounded" />
              <div className="grid grid-cols-2 gap-2">
                <input name="gross" type="number" step="0.01" placeholder="Gross Pay" required className="w-full p-2 text-sm border rounded" />
                <input name="net" type="number" step="0.01" placeholder="Net Pay" required className="w-full p-2 text-sm border rounded" />
              </div>
              <Button className="w-full text-sm" type="submit" variant="secondary">Add Past Record</Button>
            </form>
            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-600">Avg. Deduction:</span>
                <span className="text-lg font-bold text-blue-600">{deductionStats.label}</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {historicalPaychecks.map(item => (
                  <div key={item.id} className="flex justify-between text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
                    <span>{item.date}</span>
                    <span>Gr: ${item.gross}</span>
                    <button onClick={() => deleteItem('historicalPaychecks', item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Add Income Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-blue-100 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="text-green-600" size={24} />
              <h3 className="text-xl font-bold text-slate-800">2. Add Income</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tips, Uber, Shift A" 
                    value={newIncome.source} 
                    onChange={e => setNewIncome({...newIncome, source: e.target.value})} 
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
                      <input 
                        type="date" 
                        value={newIncome.date} 
                        onChange={e => setNewIncome({...newIncome, date: e.target.value})} 
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pay Period</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Oct 1-15" 
                        value={newIncome.payPeriod} 
                        onChange={e => setNewIncome({...newIncome, payPeriod: e.target.value})} 
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      />
                   </div>
                </div>
              </div>
              <div className="space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-blue-800">Amounts</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="autoCalc" 
                      checked={isAutoCalc} 
                      onChange={e => setIsAutoCalc(e.target.checked)} 
                      className="rounded text-blue-600 focus:ring-blue-500" 
                    />
                    <label htmlFor="autoCalc" className="text-xs text-blue-600 cursor-pointer select-none">Auto-calculate Net</label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Gross Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">$</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newIncome.gross} 
                      onChange={handleGrossChange} 
                      className="w-full pl-8 p-2 border border-slate-200 rounded-lg" 
                    />
                  </div>
                </div>
                <div className="relative">
                  {isAutoCalc && (
                    <div className="absolute right-0 -top-6 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Brain size={10} />
                      -{deductionStats.label}
                    </div>
                  )}
                  <label className="block text-xs text-slate-500 mb-1">Net Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-green-600 font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newIncome.net} 
                      onChange={e => setNewIncome({...newIncome, net: e.target.value})} 
                      className="w-full pl-8 p-2 border-2 border-green-500/30 rounded-lg font-bold text-slate-800" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleAddIncome} className="w-full md:w-auto">
                <Plus size={18} /> Add to Budget
              </Button>
            </div>
          </Card>

          {/* Income Log */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700">Income Log</h4>
            {incomes.map(inc => (
              <div key={inc.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div>
                  <p className="font-medium text-slate-800">{inc.source}</p>
                  <div className="flex gap-2 text-xs text-slate-500">
                    <span>{inc.date}</span>
                    {inc.payPeriod && <span className="bg-slate-100 px-1 rounded">Pd: {inc.payPeriod}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-green-600">+${inc.amount.toFixed(2)}</span>
                  <button onClick={() => deleteItem('incomes', inc.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderParser = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Smart Bill Parser</h2>
        <p className="text-slate-500">Paste text from an email, SMS, or digital receipt.</p>
      </div>
      <Card className="p-6">
        <textarea
          value={parseText}
          onChange={(e) => setParseText(e.target.value)}
          placeholder="Paste bill text here...&#10;Example:&#10;Payment to Comcast&#10;Amount: $89.99&#10;Date: Oct 24, 2023"
          className="w-full h-40 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm bg-slate-50"
        />
        <div className="mt-4 flex gap-3 justify-end">
          <Button onClick={parseBillText} variant="secondary">
            Standard Parse
          </Button>
          <Button onClick={handleAiParse} variant="magic" disabled={aiParseLoading}>
            {aiParseLoading ? <Loader2 className="animate-spin" /> : <><Sparkles size={16} /> Deep Parse with AI</>}
          </Button>
        </div>
      </Card>
      {parsedResult && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
            <TrendingUp size={18} className="text-purple-600" />
            <span>Extracted Details</span>
          </div>
          <Card className="p-6 bg-purple-50 border-purple-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-purple-700 uppercase mb-1">Merchant</label>
                <input type="text" value={parsedResult.name} onChange={(e) => setParsedResult({...parsedResult, name: e.target.value})} className="w-full p-2 border border-purple-200 rounded bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-700 uppercase mb-1">Amount</label>
                <input type="number" value={parsedResult.amount} onChange={(e) => setParsedResult({...parsedResult, amount: e.target.value})} className="w-full p-2 border border-purple-200 rounded bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-700 uppercase mb-1">Date</label>
                <input type="date" value={parsedResult.date} onChange={(e) => setParsedResult({...parsedResult, date: e.target.value})} className="w-full p-2 border border-purple-200 rounded bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-700 uppercase mb-1">Category</label>
                <select value={parsedResult.category} onChange={(e) => setParsedResult({...parsedResult, category: e.target.value})} className="w-full p-2 border border-purple-200 rounded bg-white">
                  <option>Utilities</option>
                  <option>Rent/Mortgage</option>
                  <option>Food</option>
                  <option>Insurance</option>
                  <option>Entertainment</option>
                  <option>Uncategorized</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={confirmParsedBill} className="w-full bg-purple-600 hover:bg-purple-700"><Save size={18} /> Add to Budget</Button>
              <Button onClick={() => setParsedResult(null)} variant="secondary">Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
     <div className="max-w-md mx-auto space-y-6 animate-in fade-in">
        <div className="text-center">
           <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <User size={40} />
           </div>
           <h2 className="text-2xl font-bold text-slate-800">User Profile</h2>
           <p className="text-slate-500 mt-2">Managing Budget: <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">{budgetId}</span></p>
        </div>
        <Card className="p-6 space-y-4">
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Display Name</label>
              <div className="flex gap-2">
                 {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfileName} className="flex-1 flex gap-2">
                      <input className="flex-1 p-2 border rounded text-sm" value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Your Name" />
                      <Button type="submit" className="text-xs">Save</Button>
                      <Button variant="ghost" onClick={() => setIsEditingProfile(false)} className="text-xs">Cancel</Button>
                    </form>
                 ) : (
                    <div className="flex-1 p-3 bg-slate-50 rounded border border-slate-200 text-sm font-medium text-slate-800 flex justify-between items-center">
                      {displayName || 'Budget Owner'}
                      <button onClick={() => { setTempName(displayName || ''); setIsEditingProfile(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={14} /></button>
                    </div>
                 )}
              </div>
           </div>
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Data Debugger</label>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-1">
                 <div className="flex items-center gap-2"><Database size={12} /> Cloud Items Found: <span className="font-bold">{debugStats.loaded}</span></div>
                 <div className="flex items-center gap-2 text-green-600"><CheckCircle size={12} /> Matching Your ID: <span className="font-bold">{debugStats.matched}</span></div>
                 <p className="pt-2 text-slate-400 italic">If 'Matched' is 0, check your Budget ID for typos/spaces.</p>
              </div>
           </div>
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Device Sync</label>
              <div className="flex items-center gap-2 mt-1 text-green-600"><Smartphone size={16} /><span className="text-sm font-medium">Portable</span></div>
              <p className="text-xs text-slate-400 mt-1">Data is stored in public cloud securely tagged with your ID.</p>
           </div>
           <div className="pt-4 border-t border-slate-100">
             <Button onClick={handleLogout} variant="danger" className="w-full"><LogOut size={16} /> Logout / Switch Budget</Button>
           </div>
        </Card>
     </div>
  );

  if (loading) {
     return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
           <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-blue-200 rounded-full"></div>
              <div className="text-slate-400 font-medium">Loading SmartBudget...</div>
           </div>
        </div>
     );
  }

  if (showLogin) return renderLogin();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Calculator size={20} /></div>
            <h1 className="font-bold text-xl hidden sm:block">SmartBudget</h1>
          </div>
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {['dashboard', 'income', 'bills', 'liabilities', 'parser', 'profile'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab === 'profile' && <User size={14} />} {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'parser' && renderParser()}
        {activeTab === 'income' && renderIncome()}
        {activeTab === 'liabilities' && renderLiabilities()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'bills' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Bills & Expenses</h2>
              <Button onClick={() => setActiveTab('parser')} variant="secondary" className="text-sm"><Plus size={16} /> Add Bill</Button>
            </div>
            {bills.map(bill => (
              <Card key={bill.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">{bill.date.split('-')[2]}</div>
                  <div><h4 className="font-bold text-slate-800">{bill.name}</h4><p className="text-sm text-slate-500">{bill.category}</p></div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">-${bill.amount.toFixed(2)}</p>
                  <button onClick={() => deleteItem('bills', bill.id)} className="text-xs text-red-500 hover:underline mt-1">Remove</button>
                </div>
              </Card>
            ))}
            {bills.length === 0 && <p className="text-center text-slate-500 py-10">No bills tracked yet.</p>}
          </div>
        )}
      </main>
    </div>
  );
}