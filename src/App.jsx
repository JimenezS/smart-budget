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
  Landmark,
  CalendarDays,
  Banknote,
  Phone,
  Wallet,
  Bell
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";

// --- Firebase Initialization ---
// Your specific configuration is now hardcoded as requested
const firebaseConfig = {
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
const callGemini = async (prompt, imageBase64 = null) => {
  // *** DEPLOYMENT STEP: UNCOMMENT THE LINE BELOW IN VS CODE ***
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  
  // Keep this empty string for the preview to load without errors
  //const apiKey = ""; 
  
  try {
    const parts = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64.split(',')[1] 
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
  // --- State ---
  const [user, setUser] = useState(null); 
  const [budgetId, setBudgetId] = useState(''); 
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
  const [budgetConfig, setBudgetConfig] = useState({ 
    startDate: new Date().toISOString().split('T')[0], 
    frequency: 'bi-weekly', 
    payDate: '' 
  });
  
  // AI State
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParseLoading, setAiParseLoading] = useState(false);
  
  // Inputs State
  const [parseText, setParseText] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const fileInputRef = useRef(null); 
  
  // Forms State
  const [newIncome, setNewIncome] = useState({ 
    source: '', 
    gross: '', 
    net: '', 
    date: '', 
    payPeriod: '', 
    isOneTime: false
  });
  const [isAutoCalc, setIsAutoCalc] = useState(true);
  
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
  
  const [manualBill, setManualBill] = useState({ 
    name: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    category: 'Uncategorized', 
    recurring: false 
  });
  
  const [newExpense, setNewExpense] = useState({ 
    name: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    paymentMethod: 'bank', 
    category: 'Food' 
  });

  const [entryMode, setEntryMode] = useState('manual');

  // Modal State
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState(null);
  const [newCharge, setNewCharge] = useState({ 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    description: '' 
  });
  const [paymentConfig, setPaymentConfig] = useState({
    type: 'custom', // 'statement', 'full', 'monthly', 'custom'
    amount: ''
  });

  // --- Profile Data ---
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState('');
  const [debugStats, setDebugStats] = useState({ loaded: 0, matched: 0 });

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
        if (collectionName === 'incomes') { 
            setDebugStats(prev => ({ ...prev, loaded: data.length }));
        }
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
    onSnapshot(configRef, (doc) => { 
        if (doc.exists()) setBudgetConfig(doc.data()); 
    });

    // Fetch Extra Profile Data (Phone, etc.)
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile_extra');
    onSnapshot(profileRef, (doc) => {
        if(doc.exists()) {
            const data = doc.data();
            setPhoneNumber(data.phoneNumber || '');
        }
    });

    if (user.displayName) setDisplayName(user.displayName);

    return () => { 
        unsubIncomes(); 
        unsubBills(); 
        unsubLiabilities(); 
        unsubHistory(); 
        unsubExpenses(); 
    };
  }, [user]);

  // --- Auth Handlers ---
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
    setIncomes([]); setBills([]); setLiabilities([]); setExpenses([]);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      // 1. Update Auth Profile (Name)
      await updateProfile(user, { displayName: tempName });
      setDisplayName(tempName);
      
      // 2. Update Firestore Profile (Phone, etc.)
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile_extra'), {
        phoneNumber: phoneNumber,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setIsEditingProfile(false);
      alert("Profile updated successfully!");
    } catch (e) { 
        console.error("Error saving profile", e); 
        alert("Error saving profile. Try again.");
    }
  };

  const handleChangePassword = async () => {
      if (!newPassword) return;
      try {
          await updatePassword(user, newPassword);
          setNewPassword('');
          alert("Password updated successfully!");
      } catch (e) {
          alert("Error: " + e.message + "\n(You may need to re-login to change password)");
      }
  };

  const handleUpdateProfileName = async (e) => {
     // Kept for compatibility if called directly, but handleSaveProfile is the main one now
    e.preventDefault();
    handleSaveProfile();
  };

  const handleSaveBudgetConfig = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'budget_config'), { 
        ...budgetConfig 
      });
      alert("Budget cycle settings saved!");
    } catch (e) { 
        alert("Error saving config"); 
    }
  };

  // --- Data Ops ---
  const addItem = async (collectionName, item) => {
    if (!user) throw new Error("User not authenticated");
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, collectionName), { 
        ...item, 
        paid: false, 
        createdAt: new Date().toISOString() 
    });
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
    if(totalGross === 0) return { rate: 0, label: '0%' };
    const rate = 1 - (totalNet / totalGross);
    return { rate, label: `${(rate * 100).toFixed(1)}%` };
  }, [historicalPaychecks]);

  // --- Helper for Date Display without Timezone Shift ---
  const formatLocalDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "Invalid Date";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // --- Intelligent Pay Cycle Logic ---
  const calculatedCycle = useMemo(() => {
    if (!budgetConfig.startDate) return { start: new Date(), end: new Date(), payDate: new Date() };

    const parts = budgetConfig.startDate.split('-');
    const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const freqDays = { 
        'weekly': 7, 
        'bi-weekly': 14, 
        'semi-monthly': 15, 
        'monthly': 30 
    }[budgetConfig.frequency] || 14;

    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cyclesPassed = Math.floor(diffDays / freqDays);
    
    let currentStart = new Date(start);
    currentStart.setDate(start.getDate() + (cyclesPassed * freqDays));
    
    if (currentStart > today) {
       currentStart.setDate(currentStart.getDate() - freqDays);
    }

    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + freqDays - 1);
    
    // Default pay date logic
    let predictedPayDate = new Date(currentEnd);
    if (budgetConfig.payDate) {
        const pParts = budgetConfig.payDate.split('-');
        const pAnchor = new Date(parseInt(pParts[0]), parseInt(pParts[1]) - 1, parseInt(pParts[2]));
        const pDiff = today.getTime() - pAnchor.getTime();
        const pCycles = Math.floor(Math.floor(pDiff / (1000 * 60 * 60 * 24)) / freqDays);
        predictedPayDate = new Date(pAnchor);
        predictedPayDate.setDate(pAnchor.getDate() + ((pCycles + 1) * freqDays));
    }

    return { 
        start: currentStart, 
        end: currentEnd, 
        payDate: predictedPayDate 
    };
  }, [budgetConfig]);

  // Auto-fill income form effect
  useEffect(() => {
    if (activeTab === 'income' && !newIncome.isOneTime && !newIncome.date) {
        const pStart = formatLocalDate(calculatedCycle.start);
        const pEnd = formatLocalDate(calculatedCycle.end);
        const pDate = formatLocalDate(calculatedCycle.payDate);
        
        setNewIncome(prev => ({
            ...prev,
            date: pDate,
            payPeriod: `${pStart} to ${pEnd}`
        }));
    }
  }, [activeTab, calculatedCycle, newIncome.isOneTime, budgetConfig.payDate]);


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
    const { start, end } = calculatedCycle;
    let overdue = [], current = [], future = [];
    
    const categorize = (item, dueDate, isPaid) => {
      const parts = dueDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const itemWithDate = { ...item, dueDateDisplay: dueDate };
      
      if (d < start && !isPaid) overdue.push(itemWithDate);
      else if (d >= start && d <= end) current.push(itemWithDate);
      else if (d > end) future.push(itemWithDate);
    };

    bills.forEach(b => { 
        if (b.date) categorize({ ...b, type: 'bill' }, b.date, b.paid); 
    });

    liabilities.forEach(l => {
      let d = l.dueDay ? getNextOccurrence(l.dueDay) : (l.dueDate ? new Date(l.dueDate) : null);
      if (d) {
        let isPaidForCycle = false;
        if (l.lastPaymentDate) { 
            const pd = new Date(l.lastPaymentDate); 
            if (pd >= start && pd <= end) isPaidForCycle = true; 
        }
        const dStr = formatLocalDate(d);
        categorize({ ...l, type: 'liability', amount: l.minPayment, paid: isPaidForCycle }, dStr, isPaidForCycle);
      }
    });

    const sorter = (a, b) => new Date(a.dueDateDisplay) - new Date(b.dueDateDisplay);
    return { 
        overdue: overdue.sort(sorter), 
        current: current.sort(sorter), 
        future: future.sort(sorter) 
    };
  }, [bills, liabilities, calculatedCycle]);

  // --- 3-Day Alerts Logic (New) ---
  const urgentAlerts = useMemo(() => {
     const today = new Date();
     const threeDaysOut = new Date();
     threeDaysOut.setDate(today.getDate() + 3);
     today.setHours(0,0,0,0);
     threeDaysOut.setHours(23,59,59,999);

     // Combine lists but filter closer
     return [...categorizedObligations.overdue, ...categorizedObligations.current].filter(item => {
        if(item.paid) return false; // Already handled
        
        // Parse date
        const parts = item.dueDateDisplay.split('-');
        const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        
        // Is overdue (already caught by overdue list but double check) OR within 3 days
        return due <= threeDaysOut;
     });
  }, [categorizedObligations]);

  // --- Handlers ---
  
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
    setNewIncome(prev => ({ 
        ...prev, 
        gross, 
        net: isAutoCalc ? (gross * (1 - deductionStats.rate)).toFixed(2) : prev.net 
    })); 
  };

  const handleAddIncome = async () => { 
    if (!newIncome.source || !newIncome.net) return; 
    await addItem('incomes', { 
        source: newIncome.source, 
        amount: parseFloat(newIncome.net), 
        date: newIncome.date, 
        payPeriod: newIncome.isOneTime ? 'One-Time' : newIncome.payPeriod, 
        type: newIncome.isOneTime ? 'bonus' : 'salary' 
    }); 
    setNewIncome(prev => ({ ...prev, source: '', gross: '', net: '' })); 
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setAiParseLoading(true);
      const prompt = `Analyze receipt. JSON: { "name": "Merchant", "amount": 0.00, "date": "YYYY-MM-DD", "category": "Food/Gas" }. Use today if missing.`;
      try {
        const jsonStr = await callGemini(prompt, base64String);
        const result = JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, '').trim());
        setNewExpense({ ...newExpense, name: result.name, amount: result.amount, date: result.date, category: result.category });
      } catch (err) { alert("Scan failed."); } finally { setAiParseLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount) return;
    try {
      await addItem('expenses', { ...newExpense, amount: parseFloat(newExpense.amount) });
      if (newExpense.paymentMethod !== 'bank') {
        const liability = liabilities.find(l => l.id === newExpense.paymentMethod);
        if (liability) {
          const newBal = parseFloat(liability.currentBal) + parseFloat(newExpense.amount);
          await updateItem('liabilities', liability.id, { currentBal: newBal });
        }
      }
      setNewExpense({ name: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'bank', category: 'Food' });
    } catch (e) { alert("Error: " + e.message); }
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
    } catch (e) { 
        alert("AI Parsing failed."); 
    } finally { 
        setAiParseLoading(false); 
    } 
  };

  const confirmParsedBill = async () => { 
    if (!parsedResult) return; 
    await addItem('bills', { ...parsedResult, amount: parseFloat(parsedResult.amount) }); 
    setParsedResult(null); 
    setParseText(''); 
    setEntryMode('manual'); 
    setActiveTab('bills'); 
  };

  const toggleBillPaid = async (b) => updateItem('bills', b.id, { paid: !b.paid });

  const toggleLiabilityPaid = async (l) => { 
    const now = new Date().toISOString(); 
    const { start, end } = calculatedCycle; 
    let isPaid = l.lastPaymentDate && new Date(l.lastPaymentDate) >= start && new Date(l.lastPaymentDate) <= end; 
    updateItem('liabilities', l.id, { lastPaymentDate: isPaid ? null : now }); 
  };

  const generateAiAdvice = async () => { 
    setAiLoading(true); 
    const prompt = `Financial Advisor check. Income: $${totalIncome}, Fixed Expenses: $${totalExpenses}, Debt: $${totalDebt}. Give 3 bullet points advice.`; 
    try { 
      const advice = await callGemini(prompt); 
      setAiAdvice(advice); 
    } catch (e) { 
        setAiAdvice("AI unavailable."); 
    } finally { 
        setAiLoading(false); 
    } 
  };

  const handleConfirmCharge = async () => { 
    if(!selectedLiability || !newCharge.amount) return; 
    const newBal = parseFloat(selectedLiability.currentBal) + parseFloat(newCharge.amount); 
    await updateItem('liabilities', selectedLiability.id, { currentBal: newBal }); 
    setChargeModalOpen(false); 
  };

  const handleCloseStatement = async (l) => { 
    const interest = (l.currentBal * (l.apr/100))/12; 
    const newBal = parseFloat(l.currentBal) + interest; 
    if(window.confirm(`Add Interest $${interest.toFixed(2)}?`)) 
        updateItem('liabilities', l.id, { currentBal: newBal, statementBal: newBal }); 
  };

  // --- Payment Modal Handlers ---
  const openPaymentModal = (liability) => {
    setSelectedLiability(liability);
    // Set default payment based on type
    if (liability.type === 'installment') {
        setPaymentConfig({ type: 'monthly', amount: liability.minPayment });
    } else {
        setPaymentConfig({ type: 'statement', amount: '' });
    }
    setPaymentModalOpen(true);
  };

  const handleMakePayment = async () => {
    if (!selectedLiability) return;
    
    let payAmount = 0;
    if (paymentConfig.type === 'statement') payAmount = parseFloat(selectedLiability.statementBal || 0);
    else if (paymentConfig.type === 'full') payAmount = parseFloat(selectedLiability.currentBal || 0);
    else if (paymentConfig.type === 'monthly') payAmount = parseFloat(selectedLiability.minPayment || 0);
    else payAmount = parseFloat(paymentConfig.amount || 0);

    if (payAmount <= 0) {
      alert("Invalid payment amount");
      return;
    }

    const newBal = Math.max(0, parseFloat(selectedLiability.currentBal) - payAmount);
    
    try {
      await updateItem('liabilities', selectedLiability.id, { 
        currentBal: newBal,
        lastPaymentDate: new Date().toISOString()
      });
      alert(`Payment of $${payAmount.toFixed(2)} recorded!`);
      setPaymentModalOpen(false);
    } catch (e) {
      console.error("Payment failed", e);
    }
  };

  // --- Helper Components ---
  const InfoIcon = ({size}) => <AlertCircle size={size} />;

  // --- Render Functions ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 3-Day Alert Banner */}
      {urgentAlerts.length > 0 && (
         <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-in slide-in-from-top-2">
            <h4 className="text-red-700 font-bold flex items-center gap-2 mb-2">
               <Bell className="animate-bounce" size={20}/> Urgent Alerts
            </h4>
            <div className="space-y-1">
               {urgentAlerts.map((item, idx) => (
                  <div key={idx} className="text-sm text-red-600">
                     • <b>{item.name}</b> is due {item.dueDateDisplay === new Date().toISOString().split('T')[0] ? 'TODAY' : `on ${item.dueDateDisplay}`}!
                  </div>
               ))}
            </div>
         </div>
      )}

      <Card className="p-6 border-l-4 border-l-purple-500 bg-purple-50">
        <div className="flex justify-between items-start">
           <div className="flex gap-4"><div className="p-3 bg-purple-200 rounded-full text-purple-700"><Sparkles size={24}/></div><div><h3 className="font-bold text-slate-800">AI Advisor</h3><p className="text-sm text-slate-600">{aiAdvice || "Get insights."}</p></div></div>
           <Button onClick={generateAiAdvice} variant="magic" disabled={aiLoading}>{aiLoading ? <Loader2 className="animate-spin"/> : "Analyze"}</Button>
        </div>
        {aiAdvice && <div className="mt-4 p-4 bg-white rounded text-sm whitespace-pre-line">{aiAdvice}</div>}
      </Card>

      <Card className="p-6 bg-slate-800 text-white">
        <div className="flex justify-between items-center mb-4">
           <div className="flex gap-2"><Clock className="text-yellow-400"/><h3 className="font-bold">Obligations</h3></div>
           <div className="text-xs bg-slate-700 px-2 py-1 rounded">{formatLocalDate(calculatedCycle.start)} - {formatLocalDate(calculatedCycle.end)}</div>
        </div>
        <div className="space-y-2">
           {categorizedObligations.overdue.map((i,x) => <div key={x} className="flex justify-between items-center py-1 border-b border-red-800/50"><span className="text-sm text-red-300">{i.name}</span><div className="flex gap-2"><span className="font-bold text-red-400">${i.amount}</span><button onClick={()=>i.type==='bill'?toggleBillPaid(i):toggleLiabilityPaid(i)}><Square size={16} className="text-red-400"/></button></div></div>)}
           {categorizedObligations.current.map((i,x) => <div key={x} className="flex justify-between items-center bg-slate-700/50 p-2 rounded"><div className="flex gap-2 items-center">{i.type==='bill'?<Receipt size={14}/>:<CreditCard size={14}/>}<span className="text-sm">{i.name}</span></div><div className="flex gap-2"><span className="font-bold">${i.amount}</span><button onClick={()=>i.type==='bill'?toggleBillPaid(i):toggleLiabilityPaid(i)}><Square size={18} className="text-slate-400 hover:text-green-400"/></button></div></div>)}
           <button onClick={()=>setShowFuture(!showFuture)} className="w-full flex justify-between text-xs text-slate-400 pt-2 hover:text-white"><span>Future ({categorizedObligations.future.length})</span>{showFuture?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
           {showFuture && <div className="pl-2 border-l border-slate-600">{categorizedObligations.future.map((i,x)=><div key={x} className="flex justify-between py-1 text-xs"><span className="text-slate-400">{i.name}</span><span>${i.amount}</span></div>)}</div>}
        </div>
      </Card>
      
      <div className="grid grid-cols-2 gap-4">
         <Card className="p-4"><p className="text-xs font-bold text-slate-500">INCOME</p><h3 className="text-xl font-bold text-green-600">${totalIncome.toLocaleString()}</h3></Card>
         <Card className="p-4"><p className="text-xs font-bold text-slate-500">REMAINING</p><h3 className={`text-xl font-bold ${remaining>=0?'text-blue-600':'text-orange-600'}`}>${remaining.toLocaleString()}</h3></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
           <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Receipt size={18}/> Recent Bills</h4>
           <div className="space-y-2">
             {bills.slice(0,3).map(b => (
               <div key={b.id} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                 <span>{b.name}</span>
                 <span className="font-bold">${b.amount}</span>
               </div>
             ))}
             {bills.length === 0 && <p className="text-xs text-slate-400 italic">No bills yet.</p>}
           </div>
        </Card>
        <Card className="p-6">
           <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><DollarSign size={18}/> Recent Expenses</h4>
           <div className="space-y-2">
             {expenses.slice(0,3).map(e => (
               <div key={e.id} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                 <span>{e.name}</span>
                 <span className="font-bold">${e.amount}</span>
               </div>
             ))}
             {expenses.length === 0 && <p className="text-xs text-slate-400 italic">No expenses yet.</p>}
           </div>
        </Card>
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
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Merchant / Description</label>
            <input 
              type="text" 
              placeholder="e.g. Starbucks, Shell Gas"
              value={newExpense.name}
              onChange={e => setNewExpense({...newExpense, name: e.target.value})}
              className="w-full p-3 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
              <input 
                type="date" 
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-lg"
              />
            </div>
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
           
           {/* Add Phone Number Field */}
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
              <div className="flex gap-2 mt-1">
                 {isEditingProfile ? (
                    <input className="flex-1 p-2 border rounded text-sm" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+1 555-0199" />
                 ) : (
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded border text-sm font-medium text-slate-600 w-full">
                       {phoneNumber || 'No Phone Set'}
                       <Phone size={14} className="text-slate-400"/>
                    </div>
                 )}
              </div>
           </div>
           
           {isEditingProfile && (
              <div className="pt-2">
                 <Button onClick={handleSaveProfile} className="w-full text-xs">Save Changes</Button>
              </div>
           )}

           <div className="pt-4 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-500 uppercase">Security</label>
              <div className="flex gap-2 mt-2">
                 <input 
                    type="password" 
                    className="flex-1 p-2 border rounded text-sm" 
                    placeholder="New Password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                 />
                 <Button onClick={handleChangePassword} className="text-xs">Update</Button>
              </div>
           </div>

           <div className="pt-4 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-500 uppercase">App Status</label>
              <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                 <div>
                    <span className="text-slate-500 block">Cloud Status</span>
                    <span className="text-green-600 font-bold flex items-center gap-1"><Wifi size={12}/> Online</span>
                 </div>
                 <div>
                    <span className="text-slate-500 block">Data Items</span>
                    <span className="text-slate-700 font-bold">{debugStats.loaded} records</span>
                 </div>
              </div>
           </div>
           
           <div className="pt-4 border-t border-slate-100">
             <Button onClick={handleLogout} variant="danger" className="w-full"><LogOut size={16} /> Logout / Switch Budget</Button>
           </div>
        </Card>
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
               
               {/* CONDITIONAL RENDERING FOR REVOLVING VS INSTALLMENT */}
               {newLiability.type === 'revolving' && (
                 <>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Statement Bal" className="w-full p-2 border rounded" value={newLiability.statementBal} onChange={e=>setNewLiability({...newLiability, statementBal:e.target.value})}/>
                        <input type="number" placeholder="APR %" className="w-full p-2 border rounded" value={newLiability.apr} onChange={e=>setNewLiability({...newLiability, apr:e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Closing Day (1-31)" className="w-full p-2 border rounded" value={newLiability.closingDay} onChange={e=>setNewLiability({...newLiability, closingDay:e.target.value})}/>
                        <input type="number" placeholder="Due Day (1-31)" className="w-full p-2 border rounded" value={newLiability.dueDay} onChange={e=>setNewLiability({...newLiability, dueDay:e.target.value})}/>
                    </div>
                 </>
               )}
               
               {newLiability.type === 'installment' && (
                 <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="APR %" className="w-full p-2 border rounded" value={newLiability.apr} onChange={e=>setNewLiability({...newLiability, apr:e.target.value})}/>
                    <input type="number" placeholder="Due Day (1-31)" className="w-full p-2 border rounded" value={newLiability.dueDay} onChange={e=>setNewLiability({...newLiability, dueDay:e.target.value})}/>
                 </div>
               )}

               <Button onClick={handleAddLiability} className="w-full">Add Liability</Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
           <div className="border rounded-xl overflow-hidden bg-white">
              <button onClick={() => setCollapsedSections(p => ({...p, revolving: !p.revolving}))} className="w-full p-4 bg-purple-50 flex justify-between font-bold text-purple-800">Revolving Credit {collapsedSections.revolving ? <ChevronDown/> : <ChevronUp/>}</button>
              {!collapsedSections.revolving && <div className="p-4 space-y-3">{liabilities.filter(l => l.type === 'revolving').map(l => {
                  const { start, end } = currentBudgetCycle;
                  let isPaid = false;
                  if (l.lastPaymentDate) {
                     const pd = new Date(l.lastPaymentDate);
                     if (pd >= start && pd <= end) isPaid = true;
                  }
                  return (
                    <Card key={l.id} className={`p-4 border-l-4 ${isPaid ? 'border-l-green-400 bg-slate-50' : 'border-l-purple-400'} transition-all`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                              {l.name}
                              {isPaid && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Paid</span>}
                            </h4>
                            <div className="flex gap-2 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Calendar size={10} /> Close Day: {l.closingDay || 'N/A'}</span>
                              <span className="flex items-center gap-1"><AlertCircle size={10} /> Due Day: {l.dueDay || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-800">${l.currentBal}</div>
                            <div className="text-xs text-slate-500">Current Balance</div>
                          </div>
                        </div>
                        {/* ... grid of details ... */}
                        <div className="grid grid-cols-3 gap-2 bg-white/50 p-3 rounded-lg text-xs">
                          <div><p className="text-slate-500">Statement</p><p className="font-semibold">${l.statementBal}</p></div>
                          <div><p className="text-slate-500">New Charges</p><p className="font-semibold text-orange-600">+${Math.max(0, l.currentBal - l.statementBal).toFixed(2)}</p></div>
                          <div><p className="text-slate-500">Min Pay</p><p className="font-semibold text-red-600">${l.minPayment}</p></div>
                        </div>
                        
                        <div className="mt-4 flex gap-2 justify-end items-center border-t border-slate-100 pt-3">
                          <Button onClick={() => openPaymentModal(l)} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white">
                             <Banknote size={14} /> Pay
                          </Button>
                          <div className="h-4 w-px bg-slate-200 mx-1"></div>
                          <Button onClick={() => openChargeModal(l)} variant="secondary" className="px-3 py-1.5 text-xs">
                             <Plus size={14} /> Charge
                          </Button>
                          <Button onClick={() => handleCloseStatement(l)} variant="outline" className="px-3 py-1.5 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100">
                             <RefreshCw size={14} /> Close Stmt
                          </Button>
                          <button onClick={() => deleteItem('liabilities', l.id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-2">
                            <Trash2 size={14} />
                          </button>
                        </div>
                    </Card>
                  );
              })}</div>}
           </div>
           <div className="border rounded-xl overflow-hidden bg-white">
              <button onClick={() => setCollapsedSections(p => ({...p, installment: !p.installment}))} className="w-full p-4 bg-blue-50 flex justify-between font-bold text-blue-800">Installment Loans {collapsedSections.installment ? <ChevronDown/> : <ChevronUp/>}</button>
              {!collapsedSections.installment && <div className="p-4 space-y-3">{liabilities.filter(l => l.type === 'installment').map(l => {
                  const { start, end } = currentBudgetCycle;
                  let isPaid = false;
                  if (l.lastPaymentDate) {
                     const pd = new Date(l.lastPaymentDate);
                     if (pd >= start && pd <= end) isPaid = true;
                  }
                  return (
                    <Card key={l.id} className={`p-4 border-l-4 border-l-blue-400 ${isPaid ? 'bg-slate-50 border-l-green-400' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                              {l.name}
                              {isPaid && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} /> In Good Standing</span>}
                            </h4>
                            <div className="flex gap-2 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><AlertCircle size={10}/> Due Day: {l.dueDay || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-slate-800">${l.currentBal}</div>
                            <div className="text-xs text-slate-500">Remaining Principal</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs">
                          <span className="text-slate-600">Monthly Payment: <span className="font-bold text-red-600">${l.minPayment}</span></span>
                        </div>
                          <div className="mt-2 flex justify-end items-center gap-2 border-t border-slate-100 pt-2">
                          <Button onClick={() => openPaymentModal(l)} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white">
                             <Banknote size={14} /> Pay
                          </Button>
                          <button onClick={() => deleteItem('liabilities', l.id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                    </Card>
                  );
              })}</div>}
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

      {/* Payment Modal */}
      {paymentModalOpen && selectedLiability && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
           <Card className="w-full max-w-sm p-6 relative">
              <button onClick={() => setPaymentModalOpen(false)} className="absolute top-4 right-4"><X/></button>
              <h3 className="font-bold mb-4 text-green-700 flex items-center gap-2"><Banknote/> Make Payment</h3>
              <p className="text-sm text-slate-500 mb-4">Paying: <b>{selectedLiability.name}</b></p>
              
              <div className="space-y-3">
                {selectedLiability.type === 'revolving' && (
                  <>
                    <button 
                      onClick={() => setPaymentConfig({ type: 'statement', amount: selectedLiability.statementBal })}
                      className={`w-full p-3 border rounded flex justify-between ${paymentConfig.type === 'statement' ? 'border-green-500 bg-green-50' : ''}`}
                    >
                      <span className="text-sm">Statement Balance</span>
                      <span className="font-bold">${selectedLiability.statementBal}</span>
                    </button>
                    <button 
                      onClick={() => setPaymentConfig({ type: 'full', amount: selectedLiability.currentBal })}
                      className={`w-full p-3 border rounded flex justify-between ${paymentConfig.type === 'full' ? 'border-green-500 bg-green-50' : ''}`}
                    >
                      <span className="text-sm">Full Balance</span>
                      <span className="font-bold">${selectedLiability.currentBal}</span>
                    </button>
                  </>
                )}
                
                {selectedLiability.type === 'installment' && (
                  <>
                    <button 
                      onClick={() => setPaymentConfig({ type: 'monthly', amount: selectedLiability.minPayment })}
                      className={`w-full p-3 border rounded flex justify-between ${paymentConfig.type === 'monthly' ? 'border-green-500 bg-green-50' : ''}`}
                    >
                      <span className="text-sm">Monthly Payment</span>
                      <span className="font-bold">${selectedLiability.minPayment}</span>
                    </button>
                  </>
                )}
                
                <div className={`w-full p-3 border rounded ${paymentConfig.type === 'custom' ? 'border-green-500 bg-green-50' : ''}`}>
                   <div className="flex items-center gap-2 mb-1">
                     <input 
                       type="radio" 
                       checked={paymentConfig.type === 'custom'} 
                       onChange={() => setPaymentConfig({ ...paymentConfig, type: 'custom' })}
                     />
                     <span className="text-sm">Custom Amount</span>
                   </div>
                   <input 
                     type="number" 
                     className="w-full p-2 border rounded" 
                     placeholder="0.00" 
                     value={paymentConfig.amount} 
                     onChange={(e) => setPaymentConfig({ type: 'custom', amount: e.target.value })}
                     onClick={() => setPaymentConfig({ ...paymentConfig, type: 'custom' })}
                   />
                </div>
                
                <Button onClick={handleMakePayment} className="w-full bg-green-600 hover:bg-green-700 text-white mt-4">
                  Confirm Payment
                </Button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Card className="w-full max-w-md p-8"><h1 className="text-2xl font-bold mb-4 text-center">SmartBudget</h1><Button onClick={handleGoogleLogin} className="w-full" variant="google">Sign in with Google</Button><div className="my-4 text-center text-xs text-slate-400">OR</div><form onSubmit={handleEmailAuth} className="space-y-2"><input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="w-full p-2 border rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><Button type="submit" className="w-full">{authMode === 'login' ? 'Sign In' : 'Sign Up'}</Button></form><div className="mt-4 text-center text-xs text-blue-500 cursor-pointer" onClick={() => setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Create Account':'Have an account?'}</div></Card></div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 hidden md:block">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Calculator size={20} /></div>
            <h1 className="font-bold text-xl hidden sm:block">SmartBudget</h1>
          </div>
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {['dashboard', 'income', 'bills', 'expenses', 'liabilities', 'profile'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab === 'profile' && <User size={14} />} {tab === 'bills' ? 'Add Bills' : tab}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'bills' && renderParser()}
        {activeTab === 'income' && renderIncome()}
        {activeTab === 'liabilities' && renderLiabilities()}
        {activeTab === 'expenses' && renderExpenses()}
        {activeTab === 'profile' && renderProfile()}
      </main>

      {/* --- BOTTOM MOBILE NAVIGATION (Restored!) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 z-50 md:hidden">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {[
            { id: 'dashboard', icon: <TrendingUp size={20} />, label: 'Dash' },
            { id: 'bills', icon: <Receipt size={20} />, label: 'Bills' },
            { id: 'expenses', icon: <DollarSign size={20} />, label: 'Spend' },
            { id: 'income', icon: <Landmark size={20} />, label: 'Income' },
            { id: 'liabilities', icon: <CreditCard size={20} />, label: 'Debt' },
            { id: 'profile', icon: <User size={20} />, label: 'Profile' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${activeTab === tab.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}