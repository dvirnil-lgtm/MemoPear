
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Lead, CommMethod, UserProfile, PaymentCycle } from './types';
import { QRScanner } from './components/QRScanner';
import { CommMethodToggle } from './components/CommMethodToggle';
import { PrivacyPolicy, TermsAndConditions, ContactUs } from './components/LegalPages';
import { parseScannedData, parseBusinessCard, generateLeadReport } from './services/geminiService';

// Constants for retention and session
const RETENTION_DAYS = 30;
const SESSION_DAYS = 7;
const STORAGE_KEY_LEADS = 'lcp_leads_v1';
const STORAGE_KEY_AUTH = 'lcp_auth_v1';
const STORAGE_KEY_PAID = 'lcp_paid_v1';
const STORAGE_KEY_NOTICE = 'lcp_notice_shown_v1';
const STORAGE_KEY_LINKEDIN = 'lcp_linkedin_connected_v1';
const STORAGE_KEY_TOUR_COMPLETE = 'lcp_tour_done_v1';

const TESTIMONIALS = [
  { quote: "NexusGather turned our trade show chaos into a streamlined pipeline. We captured 300% more context than ever before.", author: "Sarah Chen", role: "VP Field Marketing, HyperScale" },
  { quote: "The voice transcription is a game-changer. I don't have to type a single word between meetings.", author: "Mike Ross", role: "Field Event Lead, TechPulse" },
  { quote: "LinkedIn enrichment helps me personalize follow-ups immediately. It's the SDR's dream tool.", author: "Elena Vance", role: "Senior SDR, Zenith Cloud" },
  { quote: "Our data quality shot up instantly. No more messy spreadsheets or lost cards.", author: "David Wu", role: "Marketing Director, Nexus" },
  { quote: "Finally, a lead capture app that actually understands enterprise field marketing workflows.", author: "Jessica Lee", role: "Operations Lead, Cloud9" },
  { quote: "The Gemini AI extraction is scarily accurate. Even on messy handwritten notes.", author: "Tom Baker", role: "Event Strategist, GlobalOps" },
  { quote: "We closed our biggest deal of the quarter thanks to the instant LinkedIn context provided at the booth.", author: "Ray Holt", role: "Head of Sales, NineNine Tech" }
];

const TOUR_STEPS = [
  {
    title: "Welcome to MemoPear",
    description: "Your smart companion for field intelligence. Let's show you how to capture leads like a pro.",
    icon: "🍐"
  },
  {
    title: "AI Card Reader",
    description: "Snap a photo of any business card. Our AI extracts names, emails, and social profiles instantly.",
    icon: "📸"
  },
  {
    title: "Voice Intelligence",
    description: "Record meeting notes hands-free. Gemini transcribes and summarizes your conversations.",
    icon: "🎙️"
  },
  {
    title: "Profile & Conferences",
    description: "Set up your profile and track the conferences you're attending for better organization.",
    icon: "👤"
  }
];

const MemoPearLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="metal-teal-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#042f2e" />
        </linearGradient>
        <linearGradient id="metal-teal-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="50%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <radialGradient id="gold-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#a16207" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background Network Lines */}
      <g stroke="#134e4a" strokeWidth="1" opacity="0.4">
        <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" />
        <path d="M50 10 L50 90 M15 30 L85 70 M15 70 L85 30" />
        <circle cx="50" cy="10" r="2" fill="#134e4a" />
        <circle cx="85" cy="30" r="2" fill="#134e4a" />
        <circle cx="85" cy="70" r="2" fill="#134e4a" />
        <circle cx="50" cy="90" r="2" fill="#134e4a" />
        <circle cx="15" cy="70" r="2" fill="#134e4a" />
        <circle cx="15" cy="30" r="2" fill="#134e4a" />
      </g>
      
      {/* Outer Hexagonal Nodes (3D Effect) */}
      {[
        [50, 10], [85, 30], [85, 70], [50, 90], [15, 70], [15, 30]
      ].map(([cx, cy], i) => (
        <g key={i}>
          <path d={`M${cx} ${cy-6} L${cx+5} ${cy-3} L${cx+5} ${cy+3} L${cx} ${cy+6} L${cx-5} ${cy+3} L${cx-5} ${cy-3} Z`} fill="url(#metal-teal-dark)" stroke="#0d9488" strokeWidth="0.5" />
          <path d={`M${cx} ${cy-6} L${cx} ${cy} L${cx+5} ${cy-3} M${cx} ${cy} L${cx+5} ${cy+3} M${cx} ${cy} L${cx} ${cy+6} M${cx} ${cy} L${cx-5} ${cy+3} M${cx} ${cy} L${cx-5} ${cy-3}`} stroke="#0d9488" strokeWidth="0.2" opacity="0.5" />
        </g>
      ))}
      
      {/* Central Shield Structure */}
      <path d="M50 25 L72 38 L72 62 L50 75 L28 62 L28 38 Z" fill="url(#metal-teal-dark)" stroke="url(#metal-teal-light)" strokeWidth="1" />
      <path d="M50 30 L68 40 L68 60 L50 70 L32 60 L32 40 Z" fill="#022c22" opacity="0.8" />
      
      {/* Glowing "M" */}
      <g filter="url(#glow)">
        <path 
          d="M38 60 L38 40 L50 52 L62 40 L62 60" 
          stroke="url(#gold-glow)" 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none"
        />
        <path 
          d="M38 60 L38 40 L50 52 L62 40 L62 60" 
          stroke="#fff" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none"
          opacity="0.8"
        />
      </g>
      
      {/* Connecting Lines to Center */}
      <g stroke="url(#metal-teal-light)" strokeWidth="0.5" opacity="0.6">
        <line x1="50" y1="10" x2="50" y2="25" />
        <line x1="85" y1="30" x2="72" y2="38" />
        <line x1="85" y1="70" x2="72" y2="62" />
        <line x1="50" y1="90" x2="50" y2="75" />
        <line x1="15" y1="70" x2="28" y2="62" />
        <line x1="15" y1="30" x2="28" y2="38" />
      </g>
    </svg>
  </div>
);

// High-fidelity Mock UI components for the Showcase section
const MockFunnelDetails = () => (
  <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl scale-95 overflow-hidden w-full max-w-sm">
    <div className="flex justify-between items-center mb-4">
      <div className="h-3 w-16 bg-slate-300 dark:bg-white/10 rounded"></div>
      <div className="flex gap-1">
        <div className="w-8 h-4 bg-blue-600/20 rounded"></div>
        <div className="w-8 h-4 bg-orange-600/20 rounded"></div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-8 w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl flex items-center px-3">
        <div className="h-2 w-12 bg-slate-400 opacity-50 rounded"></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-8 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl flex items-center px-3">
          <div className="h-2 w-8 bg-slate-400 opacity-50 rounded"></div>
        </div>
        <div className="h-8 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl flex items-center px-3">
          <div className="h-2 w-8 bg-slate-400 opacity-50 rounded"></div>
        </div>
      </div>
      <div className="h-24 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl"></div>
    </div>
  </div>
);

const MockSyncEnrich = () => (
  <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl scale-95 relative overflow-hidden bg-blue-600/5 w-full max-w-sm">
    <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent"></div>
    <div className="flex flex-col items-center justify-center h-48 space-y-4">
      <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI Enrichment</p>
        <p className="text-[8px] text-slate-400 font-bold">Synchronizing with Gemini 3...</p>
      </div>
      <div className="flex gap-2">
        <div className="px-2 py-1 bg-white dark:bg-white/10 rounded text-[7px] font-bold">LinkedIn ✓</div>
        <div className="px-2 py-1 bg-white dark:bg-white/10 rounded text-[7px] font-bold">Company ✓</div>
      </div>
    </div>
  </div>
);

const MockPipelineView = () => (
  <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl scale-95 w-full max-w-sm">
    <div className="h-4 w-24 bg-slate-300 dark:bg-white/10 rounded mb-6"></div>
    <div className="space-y-4">
      <div className="p-4 bg-white dark:bg-white/5 border border-blue-500/20 rounded-2xl">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-slate-900 dark:bg-white rounded"></div>
            <div className="h-2 w-12 bg-blue-500/40 rounded"></div>
          </div>
          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/10"></div>
        </div>
        <div className="mt-4 h-12 w-full bg-blue-600/5 rounded-xl border border-blue-600/10"></div>
      </div>
      <div className="p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl opacity-40">
        <div className="h-3 w-24 bg-slate-300 rounded"></div>
      </div>
    </div>
  </div>
);

const MockLeadSelection = () => (
  <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl scale-95 w-full max-w-sm">
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-1">
        <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] text-white">✓</div>
        <div className="h-4 w-12 bg-slate-300 dark:bg-white/10 rounded"></div>
      </div>
      <div className="h-4 w-12 bg-slate-300 dark:bg-white/10 rounded"></div>
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className={`p-3 rounded-xl border ${i === 2 ? 'border-blue-600 bg-blue-600/5' : 'border-slate-100 dark:border-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded border-2 ${i === 2 ? 'bg-blue-600 border-blue-600 flex items-center justify-center text-[8px] text-white' : 'border-slate-200 dark:border-white/10'}`}>
              {i === 2 && '✓'}
            </div>
            <div className="h-2 w-24 bg-slate-300 dark:bg-white/10 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MockExportSheets = () => (
  <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl scale-95 flex flex-col items-center justify-center h-48 w-full max-w-sm">
    <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-4xl text-white shadow-2xl mb-4 animate-bounce">📊</div>
    <div className="text-center">
      <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Pipeline Dispatched</h4>
      <p className="text-[8px] text-slate-400 font-bold">Encrypted sync to Google Sheets complete.</p>
    </div>
  </div>
);

function encode(base64: Uint8Array) {
  let binary = '';
  const len = base64.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(base64[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lcp_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [hasPaid, setHasPaid] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [view, setView] = useState<'home' | 'login' | 'pricing' | 'billing' | 'form' | 'history' | 'payment' | 'profile' | 'privacy' | 'terms' | 'contact'>('home');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    conferences: [],
    socialLinks: {
      linkedin: '',
      facebook: '',
      instagram: '',
      reddit: '',
      twitch: '',
    }
  });
  const [suggestedConferences, setSuggestedConferences] = useState<string[]>(['MWC Barcelona', 'Web Summit', 'Dreamforce', 'CES 2025', 'GDC 2025', 'RSA Conference']);
  const [showConfDropdown, setShowConfDropdown] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem('memo_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setUserProfile(prev => ({
          ...prev,
          ...parsed,
          socialLinks: { ...prev.socialLinks, ...(parsed.socialLinks || {}) }
        }));
      } catch (e) { console.error("Profile load failed", e); }
    }
  }, []);
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>('monthly');
  const [showNotice, setShowNotice] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const [activeModal, setActiveModal] = useState<'sheets' | 'email' | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'google' | 'card' | 'paypal' | null>(null);
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [website, setWebsite] = useState('');
  const [conferenceName, setConferenceName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [notes, setNotes] = useState('');
  const [commMethods, setCommMethods] = useState<CommMethod[]>([]);
  const [contactValues, setContactValues] = useState<Partial<Record<CommMethod, string>>>({});
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showContactFields, setShowContactFields] = useState(false);
  const [showRetentionNotice, setShowRetentionNotice] = useState(false);

  const cardInputRef = useRef<HTMLInputElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('lcp_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('lcp_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    const savedPaid = localStorage.getItem(STORAGE_KEY_PAID);
    if (savedPaid === 'true') setHasPaid(true);

    const savedLinkedin = localStorage.getItem(STORAGE_KEY_LINKEDIN);
    if (savedLinkedin === 'true') setLinkedinConnected(true);

    const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH);
    if (savedAuth) {
      const { timestamp } = JSON.parse(savedAuth);
      if (Date.now() - timestamp < SESSION_DAYS * 24 * 60 * 60 * 1000) {
        setIsLoggedIn(true);
        if (savedPaid === 'true') setView('form');
        else setView('history');
      }
    }
    const savedLeads = localStorage.getItem(STORAGE_KEY_LEADS);
    if (savedLeads) {
      const parsedLeads: Lead[] = JSON.parse(savedLeads);
      const filteredLeads = parsedLeads.filter(lead => (Date.now() - lead.timestamp) < RETENTION_DAYS * 24 * 60 * 60 * 1000);
      setLeads(filteredLeads);
    }
    if (!localStorage.getItem(STORAGE_KEY_NOTICE)) setShowNotice(true);
    if (!localStorage.getItem(STORAGE_KEY_TOUR_COMPLETE) && isLoggedIn) setShowTour(true);
  }, [isLoggedIn]);

  // Scroll Progress Logic
  const handleScroll = useCallback(() => {
    if (mainRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    }
  }, []);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll);
      return () => mainEl.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, view]);

  // Carousel Logic
  const scrollTestimonials = useCallback((direction: 'left' | 'right') => {
    if (!testimonialRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = testimonialRef.current;
    const itemWidth = 350 + 32; // card width + gap
    
    let targetScroll = direction === 'right' ? scrollLeft + itemWidth : scrollLeft - itemWidth;
    
    // Infinity loop check
    if (direction === 'right' && scrollLeft + clientWidth >= scrollWidth - 10) {
      targetScroll = 0;
    } else if (direction === 'left' && scrollLeft <= 10) {
      targetScroll = scrollWidth - clientWidth;
    }

    testimonialRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    if (view !== 'home') return;
    const interval = setInterval(() => {
      scrollTestimonials('right');
    }, 5000);
    return () => clearInterval(interval);
  }, [view, scrollTestimonials]);

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const toggleLeadSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelectedLeads = () => {
    const remainingLeads = leads.filter(l => !selectedLeadIds.has(l.id));
    setLeads(remainingLeads);
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(remainingLeads));
    setSelectedLeadIds(new Set());
    setStatusMsg({ type: 'success', text: 'Pipeline purged locally.' });
  };

  const handleSyncAttempt = (modal: 'sheets' | 'email') => {
    if (!hasPaid) { setView('pricing'); return; }
    setActiveModal(modal);
  };

  const handleLinkedinLookup = (lead: Lead) => {
    if (!linkedinConnected) {
      setLinkedinConnected(true);
      localStorage.setItem(STORAGE_KEY_LINKEDIN, 'true');
      setStatusMsg({ type: 'success', text: 'LinkedIn Identity Linked.' });
    }
    const query = encodeURIComponent(`${lead.firstName} ${lead.lastName} ${lead.conferenceName || ''}`);
    window.open(`https://www.linkedin.com/search/results/all/?keywords=${query}`, '_blank');
  };

  useEffect(() => {
    const cleanupLeads = () => {
      const now = Date.now();
      const thirtyDaysMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
      setLeads(prev => {
        const filtered = prev.filter(lead => (now - lead.timestamp) < thirtyDaysMs);
        if (filtered.length !== prev.length) {
          localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(filtered));
        }
        return filtered;
      });
    };
    cleanupLeads();
  }, []);

  const handleAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const authData = { email, password, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authData));
    
    // Save to "internal database" (localStorage for this environment)
    const savedProfile = { ...userProfile, email, password };
    localStorage.setItem('memo_profile', JSON.stringify(savedProfile));
    
    setIsLoggedIn(true);
    setUserProfile(savedProfile);
    setStatusMsg({ type: 'success', text: 'Welcome to MemoPear!' });
    if (hasPaid) setView('form');
    else setView('history');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setIsLoggedIn(false);
    setView('home');
    setStatusMsg({ type: 'success', text: 'Session Terminated.' });
  };

  const deleteAllLeads = () => {
    if (window.confirm('Purge all intelligence records? This cannot be undone.')) {
      setLeads([]);
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify([]));
      setStatusMsg({ type: 'success', text: 'Pipeline Cleared.' });
    }
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setHasPaid(true);
      localStorage.setItem(STORAGE_KEY_PAID, 'true');
      setIsSubmitting(false);
      setStatusMsg({ type: 'success', text: 'Pro Command Activated.' });
      setView('form');
    }, 2000);
  };

  const toggleCommMethod = (method: CommMethod) => {
    setCommMethods(prev => 
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleContactValueChange = (method: CommMethod, value: string) => {
    setContactValues(prev => ({ ...prev, [method]: value }));
  };

  const stopTranscription = () => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    setIsTranscribing(false);
  };

  const startTranscription = async () => {
    try {
      setIsTranscribing(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            source.connect(processor);
            processor.connect(audioCtx.destination);
          },
          onmessage: (message) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setNotes(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + text);
            }
          },
          onerror: () => stopTranscription(),
          onclose: () => stopTranscription()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: `NexusGather Command.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Mic permissions required.' });
      stopTranscription();
    }
  };

  const handleQRScan = async (decodedText: string) => {
    if (!hasPaid) return;
    setIsScanning(false);
    setIsSubmitting(true);
    try {
      const data = await parseScannedData(decodedText);
      if (data.firstName) setFirstName(data.firstName);
      if (data.lastName) setLastName(data.lastName);
      if (data.company) setCompany(data.company);
      if (data.jobTitle) setJobTitle(data.jobTitle);
      if (data.website) setWebsite(data.website);
      if (data.email) setEmail(data.email);
      if (data.phone) setPhone(data.phone);
      if (data.linkedin) {
        setCommMethods(prev => prev.includes(CommMethod.LINKEDIN) ? prev : [...prev, CommMethod.LINKEDIN]);
        setContactValues(prev => ({ ...prev, [CommMethod.LINKEDIN]: data.linkedin }));
      }
      setStatusMsg({ type: 'success', text: 'Intel Extracted.' });
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Parsing Failed.' });
    } finally { setIsSubmitting(false); }
  };

  const handleCardCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasPaid) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const data = await parseBusinessCard(base64);
          if (data.firstName) setFirstName(data.firstName);
          if (data.lastName) setLastName(data.lastName);
          if (data.company) setCompany(data.company);
          if (data.jobTitle) setJobTitle(data.jobTitle);
          if (data.website) setWebsite(data.website);
          if (data.email) setEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.linkedin) {
            setCommMethods(prev => prev.includes(CommMethod.LINKEDIN) ? prev : [...prev, CommMethod.LINKEDIN]);
            setContactValues(prev => ({ ...prev, [CommMethod.LINKEDIN]: data.linkedin }));
          }
          setStatusMsg({ type: 'success', text: 'Card Extracted.' });
        } catch (err) {
          console.error(err);
          setStatusMsg({ type: 'error', text: 'Vision Parsing Failed.' });
        } finally {
          setIsSubmitting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) { 
      setStatusMsg({ type: 'error', text: 'File Read Failed.' }); 
      setIsSubmitting(false); 
    }
  };

  const handleScan = async (data: string) => {
    setIsSubmitting(true);
    try {
      const parsed = await parseScannedData(data);
      if (parsed.firstName) setFirstName(parsed.firstName);
      if (parsed.lastName) setLastName(parsed.lastName);
      if (parsed.company) setCompany(parsed.company);
      if (parsed.jobTitle) setJobTitle(parsed.jobTitle);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.website) setWebsite(parsed.website);
      if (parsed.linkedin) {
        setCommMethods(prev => prev.includes(CommMethod.LINKEDIN) ? prev : [...prev, CommMethod.LINKEDIN]);
        setContactValues(prev => ({ ...prev, [CommMethod.LINKEDIN]: parsed.linkedin }));
      }
      setStatusMsg({ type: 'success', text: 'Intel Extracted.' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Parsing Failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    const updatedLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
    setLeads(updatedLeads);
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(updatedLeads));
    setEditingLead(null);
    setStatusMsg({ type: 'success', text: 'Lead Intelligence Updated.' });
  };

  const generateEmailSuggestion = async (lead: Lead) => {
    setIsGeneratingEmail(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Generate a professional, high-conversion follow-up email for a lead met at a conference.
      Lead Name: ${lead.firstName} ${lead.lastName}
      Company: ${lead.company || 'Unknown'}
      Conference: ${lead.conferenceName}
      Notes: ${lead.notes}
      
      The email should be concise, startup-style, and mention a specific follow-up action.
      Return ONLY the email body text.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const emailBody = response.text;
      const updatedLead = { ...lead, aiSummary: emailBody };
      handleUpdateLead(updatedLead);
      setStatusMsg({ type: 'success', text: 'Email Protocol Generated.' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Email Generation Failed.' });
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPaid) { 
      setView('pricing'); 
      setStatusMsg({ type: 'error', text: 'Pro Command required to capture intelligence.' }); 
      return; 
    }
    if (!firstName || !lastName) { setStatusMsg({ type: 'error', text: 'Identity required.' }); return; }
    setIsSubmitting(true);
    const newLead: Lead = {
      id: crypto.randomUUID(), firstName, lastName, email, phone, company, jobTitle, website, conferenceName, commMethods, contactValues, notes, timestamp: Date.now(),
    };
    newLead.aiSummary = await generateLeadReport(newLead);
    const updated = [newLead, ...leads];
    setLeads(updated);
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(updated));
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setCompany(''); setJobTitle(''); setWebsite(''); setNotes(''); setCommMethods([]); setContactValues({});
    setShowContactFields(false);
    setIsSubmitting(false);
  };

  const navLinks = [
    { name: 'Home', view: 'home' as const },
    { name: 'Pricing', view: 'pricing' as const },
    { name: 'Pipeline', view: 'history' as const },
    { name: 'Profile', view: 'profile' as const },
  ];

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEY_TOUR_COMPLETE, 'true');
    setShowTour(false);
  };

  const nextTourStep = () => {
    if (tourStep < TOUR_STEPS.length - 1) setTourStep(tourStep + 1);
    else completeTour();
  };

  return (
    <div className={`h-screen w-full flex flex-col leading-relaxed overflow-hidden bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-50 relative transition-all duration-300 ${isMenuOpen ? 'overflow-hidden' : ''}`}>
      
      {/* Scroll Progress Indicator */}
      <div className="fixed right-0 top-0 bottom-0 w-1 bg-slate-200/20 dark:bg-white/5 z-[150] pointer-events-none">
        <div 
          className="w-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)] transition-all duration-150 ease-out"
          style={{ height: `${scrollProgress}%` }}
        ></div>
      </div>

      {/* Universal Navigation Header */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-[#020617]/80 backdrop-blur-lg transition-opacity duration-300 ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('home'); setIsMenuOpen(false); }}>
          <MemoPearLogo className="w-8 h-8" />
          <h1 className="text-xl font-black tracking-tight">MemoPear</h1>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map(link => (
            <button key={link.name} onClick={() => setView(link.view)} className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === link.view ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              {link.name}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-4 p-1 bg-slate-200/50 dark:bg-white/10 rounded-full">
            <button onClick={() => theme !== 'light' && toggleTheme()} className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </button>
            <button onClick={() => theme !== 'dark' && toggleTheme()} className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-blue-600 shadow-sm text-white' : 'text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            </button>
          </div>
          {isLoggedIn && (
            <button onClick={handleLogout} className="ml-4 p-2 text-slate-400 hover:text-rose-600 transition-colors" title="Logout">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2 text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Full-Screen Mobile Menu Overlay with Blur */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-slate-50/95 dark:bg-[#020617]/95 backdrop-blur-2xl z-[200] flex flex-col p-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-12">
             <div className="flex items-center gap-3">
                <MemoPearLogo className="w-8 h-8" />
                <h1 className="text-xl font-black tracking-tight">MemoPear</h1>
             </div>
             <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
          </div>
          <div className="flex flex-col gap-8 flex-grow justify-center pb-20 items-center">
            {navLinks.map(link => (
              <button 
                key={link.name} 
                onClick={() => { setView(link.view); setIsMenuOpen(false); }} 
                className={`w-full text-center py-6 text-3xl font-black uppercase tracking-[0.25em] transition-all duration-300 active:scale-95 ${view === link.view ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {link.name}
              </button>
            ))}
            <div className="flex items-center gap-2 p-1 bg-slate-200/50 dark:bg-white/10 rounded-full mt-4">
              <button onClick={() => theme !== 'light' && toggleTheme()} className={`flex-1 py-4 px-8 rounded-full transition-all flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest ${theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Light
              </button>
              <button onClick={() => theme !== 'dark' && toggleTheme()} className={`flex-1 py-4 px-8 rounded-full transition-all flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest ${theme === 'dark' ? 'bg-blue-600 shadow-sm text-white' : 'text-slate-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                Dark
              </button>
            </div>
            {isLoggedIn ? (
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full max-w-xs py-6 bg-rose-600 text-white font-black rounded-[2rem] text-sm uppercase tracking-widest shadow-2xl mt-8 active:scale-95 transition-all">Logout</button>
            ) : (
              <button onClick={() => { setView('login'); setIsMenuOpen(false); }} className="w-full max-w-xs py-6 bg-blue-600 text-white font-black rounded-[2rem] text-sm uppercase tracking-widest shadow-2xl mt-8 active:scale-95 transition-all">Login / Sign Up</button>
            )}
          </div>
        </div>
      )}

      <main ref={mainRef} className={`flex-grow relative overflow-y-auto overflow-x-hidden pt-20 pb-24 transition-all duration-500 ${isMenuOpen ? 'blur-2xl scale-110 opacity-30 grayscale' : 'blur-0 scale-100 opacity-100 grayscale-0'}`}>
        {statusMsg && (
          <div className="absolute top-4 left-6 right-6 z-[120] p-3 rounded-xl border glass shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="text-sm">{statusMsg.type === 'success' ? '🛡️' : '⚠️'}</span>
            <p className="text-xs font-bold">{statusMsg.text}</p>
          </div>
        )}

        {view === 'home' && (
          <div className="flex flex-col min-h-full">
            {/* Hero Section */}
            <section className="min-h-[80vh] flex flex-col items-center text-center justify-center px-6 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]"></div>
              <MemoPearLogo className="w-24 h-24 mb-10 animate-pulse" />
              <h1 className="text-7xl font-black mb-8 tracking-tighter leading-[0.85] text-slate-900 dark:text-white">
                MemoPear
              </h1>
              <p className="text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-lg font-medium leading-relaxed">
                Transform trade show encounters into high-velocity pipeline data. Integrated Identity, AI Enrichment, and Enterprise Sync.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md z-10">
                <button onClick={() => setView('login')} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-2xl hover:scale-105 transition-all">Login / Sign Up</button>
                <button onClick={() => setShowTour(true)} className="flex-1 py-5 glass font-bold rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all">Take Platform Tour</button>
              </div>
            </section>

            {/* Immersive Showcase Flow */}
            <section className="bg-slate-100 dark:bg-white/5 pt-64 pb-32 space-y-48 mt-48">
               <div className="max-w-6xl mx-auto px-6">
                  {/* Step 1 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 flex justify-center lg:justify-end">
                      <MockFunnelDetails />
                    </div>
                    <div className="order-1 lg:order-2 space-y-6">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg">1</div>
                      <h3 className="text-4xl font-black tracking-tight leading-none">Instant Lead Funneling</h3>
                      <p className="text-lg text-slate-500 font-medium leading-relaxed">Input prospect identities manually or trigger the AI scan engine. No detail is too small, everything is categorized.</p>
                      <ul className="space-y-4">
                         {['AI-OCR Scanning', 'Manual vCard Input', 'Meeting Identifier Tags'].map(item => (
                           <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                             <span className="w-4 h-0.5 bg-blue-600"></span> {item}
                           </li>
                         ))}
                      </ul>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-48">
                    <div className="space-y-6 text-left lg:text-right">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg lg:ml-auto">2</div>
                      <h3 className="text-4xl font-black tracking-tight leading-none">AI Enrichment Engine</h3>
                      <p className="text-lg text-slate-500 font-medium leading-relaxed">Gemini 3 analyzes meeting notes and card data to build a comprehensive profile. Automated identity lookup connects the dots.</p>
                      <ul className="space-y-4 lg:flex lg:flex-col lg:items-end">
                         {['Gemini Vision Extraction', 'Voice Intelligence Processing', 'LinkedIn Identity Matching'].map(item => (
                           <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                             {item} <span className="w-4 h-0.5 bg-blue-600"></span>
                           </li>
                         ))}
                      </ul>
                    </div>
                    <div className="flex justify-center lg:justify-start">
                      <MockSyncEnrich />
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-48">
                    <div className="order-2 lg:order-1 flex justify-center lg:justify-end">
                      <MockPipelineView />
                    </div>
                    <div className="order-1 lg:order-2 space-y-6">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg">3</div>
                      <h3 className="text-4xl font-black tracking-tight leading-none">Command Pipeline</h3>
                      <p className="text-lg text-slate-500 font-medium leading-relaxed">Your entire event intelligence localized. Review, edit, and expand on gathered intel within a unified interface.</p>
                      <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-600/10">
                         <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Live Status</p>
                         <p className="text-xs font-bold text-slate-600 dark:text-slate-400 italic">"Matches found for 94% of scanned badges."</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 & 5 - Combined into a final "Transmit" flow */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-48">
                    <div className="space-y-6 text-left lg:text-right">
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg lg:ml-auto">4</div>
                      <h3 className="text-4xl font-black tracking-tight leading-none">Enterprise Dispatch</h3>
                      <p className="text-lg text-slate-500 font-medium leading-relaxed">Batch select your high-value prospects and transmit encrypted payloads directly to your corporate records.</p>
                      <div className="flex gap-2 lg:justify-end">
                        <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-xl">📊</div>
                        <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-xl">✉️</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-8 justify-center lg:justify-start">
                      <MockLeadSelection />
                      <MockExportSheets />
                    </div>
                  </div>
               </div>
            </section>

            {/* Testimonials Carousel Section */}
            <section className="py-24 overflow-hidden relative bg-slate-50 dark:bg-[#020617]">
               <div className="max-w-6xl mx-auto px-6 mb-12 flex flex-col sm:flex-row justify-between items-end gap-6">
                  <div className="text-left">
                     <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em] mb-4">Field Intel</h2>
                     <h3 className="text-4xl font-black tracking-tight">Gathering Feedback</h3>
                  </div>
                  <div className="flex gap-4">
                     <button 
                        onClick={() => scrollTestimonials('left')}
                        className="w-12 h-12 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-400 active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                     </button>
                     <button 
                        onClick={() => scrollTestimonials('right')}
                        className="w-12 h-12 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-400 active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                     </button>
                  </div>
               </div>
               
               {/* Testimonial Track */}
               <div 
                  ref={testimonialRef}
                  className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-8 px-6 cursor-grab active:cursor-grabbing pb-4"
                >
                  {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                    <div 
                      key={i} 
                      className="flex-shrink-0 w-[300px] sm:w-[350px] snap-center glass p-10 rounded-[3rem] shadow-xl border-slate-200 dark:border-white/5 text-left flex flex-col justify-between transition-transform hover:scale-[1.02]"
                    >
                      <p className="text-base font-bold leading-relaxed mb-8 italic text-slate-700 dark:text-slate-300">"{t.quote}"</p>
                      <div className="flex items-center gap-4 mt-auto">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-xs font-black text-blue-600 border border-blue-600/20">{t.author[0]}</div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider">{t.author}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* Final CTA */}
            <section className="px-6 py-32 bg-blue-600 text-white text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
               <div className="relative z-10">
                  <h2 className="text-5xl font-black mb-6 tracking-tighter leading-none">Secure the Pipeline. <br/> Initialize Today.</h2>
                  <p className="text-lg font-medium mb-12 opacity-80 max-w-sm mx-auto">Join the elite field marketing teams dominating conferences with NexusGather.</p>
                  <button onClick={() => setView('login')} className="px-12 py-6 bg-white text-blue-600 font-black rounded-3xl shadow-2xl hover:scale-110 transition-transform uppercase text-xs tracking-widest active:scale-95">Login / Sign Up</button>
               </div>
            </section>
          </div>
        )}

        {view === 'pricing' && (
          <div className="p-4 md:p-8 text-center max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-pear-600 dark:text-pear-400">Command Plans</h2>
            <p className="text-sm md:text-lg text-slate-500 mb-8 font-medium">Enterprise-grade field intelligence for high-velocity teams.</p>
            
            <div className="flex justify-center gap-3 mb-8">
              <button 
                onClick={() => setPaymentCycle('monthly')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentCycle === 'monthly' ? 'bg-pear-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setPaymentCycle('annual')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${paymentCycle === 'annual' ? 'bg-pear-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}
              >
                Annual
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[7px] px-1.5 py-0.5 rounded-full">10% OFF</span>
              </button>
            </div>

            <div className="glass p-6 md:p-10 rounded-[2.5rem] border-2 border-pear-600 shadow-xl mb-8 text-left relative overflow-hidden bg-white dark:bg-white/5">
              <div className="absolute top-0 right-0 p-6">
                <div className="bg-pear-600 text-white px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">Most Popular</div>
              </div>
              
              <div className="flex items-end gap-2 mb-6">
                <div className="text-5xl md:text-6xl font-black tracking-tighter text-pear-700 dark:text-pear-300">
                  {paymentCycle === 'monthly' ? '$1.49' : '$16.09'}
                </div>
                <div className="text-sm text-slate-400 font-bold mb-2 uppercase tracking-widest">
                  / {paymentCycle === 'monthly' ? 'month' : 'year'}
                </div>
              </div>
              
              <p className="text-[10px] font-black text-pear-600 uppercase mb-6 tracking-[0.3em]">Professional Command</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-10">
                {[
                  { title: "AI OCR Scan", desc: "Extract data from any badge or card with 99.9% accuracy." },
                  { title: "Gemini Card Analysis", desc: "Deep intelligence extraction using Vision AI." },
                  { title: "Voice-to-Intel", desc: "Real-time transcription of meeting notes." },
                  { title: "LinkedIn Integrated Search", desc: "One-tap prospect enrichment." },
                  { title: "Google Sheets Sync", desc: "Direct synchronization to your cloud records." },
                  { title: "Encrypted Local Storage", desc: "Your data stays on your device. Privacy first." },
                  { title: "Follow-up Drafting", desc: "AI-generated personalized email drafts." },
                  { title: "Infinite Capacity", desc: "No limits on the number of leads you can gather." }
                ].map(item => (
                  <div key={item.title} className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-xl bg-pear-600 text-white flex items-center justify-center text-sm flex-shrink-0 shadow-lg">✓</div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => {
                const stripeLink = paymentCycle === 'annual' 
                  ? 'https://buy.stripe.com/eVq3cx7bNf8b2ON5UzfEk01' 
                  : 'https://buy.stripe.com/aFa28t67J8JNdtr3MrfEk00';
                window.open(stripeLink, '_blank');
              }} className="w-full py-4 bg-pear-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest">Initialize Pipeline</button>
            </div>
            
            <button onClick={() => setView('home')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-pear-600 transition-colors">Return to Base</button>
          </div>
        )}

        {view === 'payment' && (
          <div className="p-8 max-w-md mx-auto animate-in fade-in duration-500">
            <button onClick={() => setView('pricing')} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Go Back
            </button>
            <h2 className="text-4xl font-black mb-8 tracking-tighter">Complete Activation</h2>
            
            <div className="space-y-4">
              <button onClick={() => setPaymentMethod('google')} className={`w-full py-6 rounded-[2rem] border-2 flex items-center justify-center gap-3 transition-all ${paymentMethod === 'google' ? 'border-pear-600 bg-pear-600/5' : 'border-slate-200 dark:border-white/10'}`}><div className="bg-black text-white px-3 py-1 rounded-md text-sm font-bold flex items-center gap-1">Google <span className="font-black">Pay</span></div></button>
              <button onClick={() => setPaymentMethod('paypal')} className={`w-full py-6 rounded-[2rem] border-2 flex items-center justify-center gap-3 transition-all ${paymentMethod === 'paypal' ? 'border-pear-600 bg-pear-600/5' : 'border-slate-200 dark:border-white/10'}`}><div className="flex items-center italic"><span className="text-blue-900 font-black">Pay</span><span className="text-blue-500 font-black">Pal</span></div></button>
              <div className={`rounded-[2rem] border-2 transition-all overflow-hidden ${paymentMethod === 'card' ? 'border-pear-600 bg-pear-600/5' : 'border-slate-200 dark:border-white/10'}`}>
                <button onClick={() => setPaymentMethod('card')} className="w-full py-6 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>Credit Card</button>
                {paymentMethod === 'card' && (
                  <form onSubmit={handlePayment} className="p-8 pt-0 space-y-4 animate-in slide-in-from-top-4">
                    <input type="text" placeholder="Card Number" required className="w-full px-5 py-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="MM / YY" required className="px-5 py-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold" />
                      <input type="text" placeholder="CVV" required className="px-5 py-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold" />
                    </div>
                  </form>
                )}
              </div>
            </div>
            <div className="mt-12 text-center">
              <p className="text-2xl font-black mb-2">
                {paymentCycle === 'monthly' ? '$1.49' : '$16.09'} USD
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                {paymentCycle === 'monthly' ? 'Billed Monthly' : 'Billed Annually'} • Cancel Anytime
              </p>
              <button onClick={handlePayment} disabled={!paymentMethod || isSubmitting} className="w-full py-6 bg-pear-600 text-white font-black rounded-3xl shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:grayscale uppercase text-xs tracking-widest">
                {isSubmitting ? 'Verifying...' : 'Initialize Pipeline'}
              </button>
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div className="p-8 max-w-2xl mx-auto animate-in fade-in duration-500 pb-32">
            <h2 className="text-5xl font-black mb-8 tracking-tighter text-pear-600 dark:text-pear-400">Profile Settings</h2>
            
            <div className="space-y-12">
              {/* Picture Upload */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-pear-100 dark:bg-white/5 border-2 border-pear-200 dark:border-white/10 overflow-hidden flex items-center justify-center">
                    {userProfile.picture ? (
                      <img src={userProfile.picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">👤</span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setUserProfile(prev => ({ ...prev, picture: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-pear-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Profile Identity</p>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{userProfile.email}</p>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Personal Details</label>
                <div className="grid grid-cols-1 gap-4">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={userProfile.name}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold focus:border-pear-500/50 transition-all" 
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number" 
                    value={userProfile.phone || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold focus:border-pear-500/50 transition-all" 
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Social Intelligence Links</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['linkedin', 'facebook', 'instagram', 'reddit', 'twitch'].map(platform => (
                    <div key={platform} className="relative">
                      <input 
                        type="url" 
                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                        value={userProfile.socialLinks?.[platform] || ''}
                        onChange={(e) => setUserProfile(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, [platform]: e.target.value } 
                        }))}
                        className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold focus:border-pear-500/50 transition-all" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Conferences */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pl-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">My Conferences</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                          const response = await ai.models.generateContent({
                            model: 'gemini-3-flash-preview',
                            contents: "List 15 major upcoming global conferences from https://10times.com/conferences. Return ONLY a JSON array of strings containing the conference names.",
                            config: {
                              tools: [{ urlContext: {} }],
                              responseMimeType: "application/json",
                            }
                          });
                          const list = JSON.parse(response.text.trim());
                          if (Array.isArray(list)) {
                            setSuggestedConferences(list);
                            setStatusMsg({ type: 'success', text: 'Conferences Synced with 10Times.' });
                          }
                        } catch (err) {
                          console.error(err);
                          setStatusMsg({ type: 'error', text: 'Sync Failed.' });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="text-[10px] font-black uppercase text-blue-600 tracking-widest hover:underline"
                    >
                      Sync 10Times
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setShowConfDropdown(!showConfDropdown)}
                        className="text-[10px] font-black uppercase text-pear-600 tracking-widest hover:underline"
                      >
                        {showConfDropdown ? 'Close Dropdown' : '+ Add New'}
                      </button>
                      
                      {showConfDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-64 glass rounded-2xl border border-pear-100 dark:border-white/10 shadow-2xl z-[100] max-h-64 overflow-y-auto p-2 animate-in slide-in-from-top-2">
                          <div className="p-2 border-b border-slate-100 dark:border-white/5 mb-2">
                            <input 
                              type="text" 
                              placeholder="Search or Add Custom..."
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 text-[10px] font-bold outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value;
                                  if (val && !userProfile.conferences.includes(val)) {
                                    setUserProfile(prev => ({ ...prev, conferences: [...prev.conferences, val] }));
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                          </div>
                          {suggestedConferences.map((conf, i) => (
                            <button 
                              key={i}
                              onClick={() => {
                                if (userProfile.conferences.includes(conf)) {
                                  setUserProfile(prev => ({ ...prev, conferences: prev.conferences.filter(c => c !== conf) }));
                                } else {
                                  setUserProfile(prev => ({ ...prev, conferences: [...prev.conferences, conf] }));
                                }
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-between ${userProfile.conferences.includes(conf) ? 'bg-pear-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                            >
                              {conf}
                              {userProfile.conferences.includes(conf) && <span>✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {userProfile.conferences.length > 0 ? (
                    userProfile.conferences.map((conf, i) => (
                      <div key={i} className="flex items-center justify-between p-4 glass rounded-2xl border border-pear-100 dark:border-white/5">
                        <span className="text-sm font-bold">{conf}</span>
                        <button 
                          onClick={() => setUserProfile(prev => ({ ...prev, conferences: prev.conferences.filter((_, idx) => idx !== i) }))}
                          className="text-rose-500 hover:scale-110 transition-transform"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center glass rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                      <p className="text-xs font-bold text-slate-400">No conferences added yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing & Invoices */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Billing & Intelligence Ledger</label>
                <div className="glass p-6 rounded-3xl border border-slate-200 dark:border-white/10">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Active Protocol</p>
                      <p className="text-xs font-bold">{hasPaid ? 'Professional Command' : 'Standard Observer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Payment Method</p>
                      <p className="text-xs font-bold font-mono">**** **** **** 4242</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">Recent Invoices</p>
                    {[
                      { id: 'INV-2026-003', date: 'Mar 01, 2026', amount: '$1.49', status: 'Paid' },
                      { id: 'INV-2026-002', date: 'Feb 01, 2026', amount: '$1.49', status: 'Paid' },
                      { id: 'INV-2026-001', date: 'Jan 01, 2026', amount: '$1.49', status: 'Paid' },
                    ].map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
                        <div>
                          <p className="text-[10px] font-bold">{inv.id}</p>
                          <p className="text-[8px] text-slate-400">{inv.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black">{inv.amount}</p>
                          <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">{inv.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  localStorage.setItem('memo_profile', JSON.stringify(userProfile));
                  setStatusMsg({ type: 'success', text: 'Profile Synchronized.' });
                }}
                className="w-full py-6 bg-pear-600 text-white font-black rounded-3xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="p-6 md:p-12 flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#020617] transition-colors duration-500">
            <div className="w-full max-w-lg space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              
              {/* Auth Mode Toggle (Slider) */}
              <div className="flex justify-center mb-8">
                <div className="p-1 bg-slate-100 dark:bg-white/5 rounded-2xl flex relative w-64 shadow-inner">
                  <div 
                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white dark:bg-blue-600 rounded-xl shadow-sm transition-all duration-300 ease-out ${authMode === 'signup' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                  />
                  <button 
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${authMode === 'login' ? 'text-blue-600 dark:text-white' : 'text-slate-400'}`}
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => setAuthMode('signup')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${authMode === 'signup' ? 'text-blue-600 dark:text-white' : 'text-slate-400'}`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              {authMode === 'signup' ? (
                <div className="space-y-8">
                  <div className="text-left space-y-4">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[0.9] text-slate-900 dark:text-white">
                      Gather with us to unlock your business
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
                      Access thousands of network opportunities and enterprise-grade pipeline templates
                    </p>
                  </div>

                  <div className="space-y-6">
                    <button onClick={() => handleAuth()} className="w-full py-4 px-6 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center gap-3 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0"><path fill="#EA4335" d="M24 12.25c0-.85-.07-1.71-.22-2.54H12v4.81h6.72c-.29 1.57-1.18 2.9-2.5 3.79v3.15h4.05c2.37-2.18 3.73-5.39 3.73-8.71z"/><path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.92l-4.05-3.15c-1.12.75-2.56 1.19-3.91 1.19-3.02 0-5.58-2.04-6.5-4.79L1.31 17.44C3.25 21.31 7.29 24 12 24z"/><path fill="#FBBC05" d="M5.5 14.33c-.24-.71-.38-1.47-.38-2.33s.14-1.62.38-2.33L1.31 6.53C.47 8.21 0 10.05 0 12s.47 3.79 1.31 5.47l4.19-3.14z"/><path fill="#4285F4" d="M12 4.75c1.76 0 3.35.61 4.59 1.79l3.44-3.44C17.96 1.08 15.24 0 12 0 7.29 0 3.25 2.69 1.31 6.53l4.19 3.14c.92-2.75 3.48-4.79 6.5-4.79z"/></svg>
                      Sign up with your Google account
                    </button>

                    <div className="flex items-center gap-4 text-slate-300 dark:text-white/10">
                      <div className="h-px flex-1 bg-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OR</span>
                      <div className="h-px flex-1 bg-current" />
                    </div>

                    <form onSubmit={handleAuth} className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="email" 
                        placeholder="Email address" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="flex-1 px-5 py-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 outline-none text-sm font-medium focus:border-blue-500 transition-colors"
                      />
                      <button type="submit" className="sm:w-32 py-4 bg-[#545fc4] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm">
                        Sign up
                      </button>
                    </form>

                    <p className="text-[10px] text-slate-400 font-medium text-center">
                      By signing up, you agree to the <button onClick={() => setView('terms')} className="underline hover:text-slate-600 transition-colors">Terms of use</button> and <button onClick={() => setView('privacy')} className="underline hover:text-slate-600 transition-colors">Privacy Policy</button>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="text-center space-y-4">
                    <MemoPearLogo className="w-16 h-16 mx-auto mb-6" />
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
                    <p className="text-slate-500 font-medium">Strategic intelligence awaiting your command</p>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Work Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold focus:border-blue-500 transition-all" />
                    <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm font-bold focus:border-blue-500 transition-all" />
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase text-[10px] tracking-widest">Authorize Dashboard</button>
                  </form>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleAuth()} className="w-full py-4 px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center gap-3 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                      <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#EA4335" d="M24 12.25c0-.85-.07-1.71-.22-2.54H12v4.81h6.72c-.29 1.57-1.18 2.9-2.5 3.79v3.15h4.05c2.37-2.18 3.73-5.39 3.73-8.71z"/><path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.92l-4.05-3.15c-1.12.75-2.56 1.19-3.91 1.19-3.02 0-5.58-2.04-6.5-4.79L1.31 17.44C3.25 21.31 7.29 24 12 24z"/><path fill="#FBBC05" d="M5.5 14.33c-.24-.71-.38-1.47-.38-2.33s.14-1.62.38-2.33L1.31 6.53C.47 8.21 0 10.05 0 12s.47 3.79 1.31 5.47l4.19-3.14z"/><path fill="#4285F4" d="M12 4.75c1.76 0 3.35.61 4.59 1.79l3.44-3.44C17.96 1.08 15.24 0 12 0 7.29 0 3.25 2.69 1.31 6.53l4.19 3.14c.92-2.75 3.48-4.79 6.5-4.79z"/></svg>
                      Google
                    </button>
                    <button onClick={() => handleAuth()} className="w-full py-4 px-6 bg-[#0077b5] text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[9px] uppercase tracking-widest hover:bg-[#005c8c] transition-all shadow-md">
                      LinkedIn
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {isLoggedIn && (view === 'form' || view === 'history') && (
           <div className="p-3 md:p-6">
              {view === 'form' && (
                 <div className="relative max-w-2xl mx-auto pt-1 pb-10 md:pt-16 md:pb-24">
                    {!hasPaid && (
                       <div className="absolute inset-0 z-[60] glass p-10 flex flex-col items-center justify-center text-center rounded-[3rem]">
                          <div className="w-24 h-24 bg-pear-600/10 rounded-full flex items-center justify-center mb-8 text-4xl">🍐</div>
                          <h2 className="text-2xl font-black mb-4 text-pear-700 dark:text-pear-300">Pipeline Locked</h2>
                          <button onClick={() => setView('pricing')} className="w-full py-5 bg-pear-600 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all max-w-sm uppercase text-xs tracking-widest">Activate Pro ($1.49/mo)</button>
                       </div>
                    )}
                    
                     <div className="mb-1 md:mb-10 text-center">
                        <h2 className="text-xl md:text-4xl font-black tracking-tight mb-0 md:mb-2">Gather Intel</h2>
                        <p className="text-slate-400 font-bold uppercase text-[6px] md:text-[10px] tracking-[0.2em]">Live Session: {conferenceName || 'Global Field Gathering'}</p>
                     </div>

                     <form onSubmit={handleSubmit} className="space-y-2 md:space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                           <div className="space-y-0.5 md:space-y-2 relative group">
                              <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Event Scope</label>
                              <div className="relative">
                                 <div className="flex gap-2 mb-1">
                                    <input type="text" id="conference-field" value={conferenceName} onChange={(e) => setConferenceName(e.target.value)} placeholder="Search or Enter Conference" className="flex-1 px-4 md:px-6 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none focus:border-pear-500/50 transition-all" />
                                    <button 
                                      type="button"
                                      onClick={async () => {
                                        setIsSubmitting(true);
                                        try {
                                          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                                          const response = await ai.models.generateContent({
                                            model: 'gemini-3-flash-preview',
                                            contents: "List 15 major upcoming global conferences from https://10times.com/conferences. Return ONLY a JSON array of strings containing the conference names.",
                                            config: {
                                              tools: [{ urlContext: {} }],
                                              responseMimeType: "application/json",
                                            }
                                          });
                                          const list = JSON.parse(response.text.trim());
                                          if (Array.isArray(list)) {
                                            setUserProfile(prev => ({ ...prev, conferences: Array.from(new Set([...prev.conferences, ...list])) }));
                                            setStatusMsg({ type: 'success', text: 'Conferences Synced.' });
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          setStatusMsg({ type: 'error', text: 'Sync Failed.' });
                                        } finally {
                                          setIsSubmitting(false);
                                        }
                                      }}
                                      className="px-3 bg-blue-600/10 text-blue-600 rounded-xl border border-blue-600/20 text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                    >
                                      Sync
                                    </button>
                                 </div>
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 glass rounded-xl border border-pear-100 dark:border-white/10 shadow-2xl max-h-32 md:max-h-48 overflow-y-auto hidden group-focus-within:block">
                                  {userProfile.conferences.length > 0 ? (
                                    userProfile.conferences.map((c, i) => (
                                      <button key={i} type="button" onMouseDown={() => setConferenceName(c)} className="w-full text-left px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold hover:bg-pear-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0">{c}</button>
                                    ))
                                  ) : (
                                    <div className="px-4 md:px-6 py-2 md:py-4 text-[10px] md:text-xs font-bold text-slate-400 italic">No conferences in profile.</div>
                                  )}
                                  <div className="bg-slate-50 dark:bg-white/5 px-4 md:px-6 py-1.5 md:py-2 text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 dark:border-white/5">Suggested (10times)</div>
                                  {['MWC Barcelona', 'Web Summit', 'Dreamforce', 'CES 2025'].map((c, i) => (
                                    <button key={i} type="button" onMouseDown={() => setConferenceName(c)} className="w-full text-left px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold hover:bg-pear-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0">{c}</button>
                                  ))}
                                </div>
                             </div>
                          </div>
                          <div className={`flex items-end gap-2 transition-all duration-500 ${showTour && tourStep === 0 ? 'ring-4 ring-pear-500 ring-offset-4 dark:ring-offset-[#020617] rounded-2xl animate-pulse scale-105' : ''}`}>
                             <button type="button" onClick={() => setIsScanning(true)} className="flex-1 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-pear-600/10 text-pear-600 text-[9px] md:text-[10px] font-black uppercase border border-pear-600/20 active:scale-95 transition-all">QR Scanner</button>
                             <button type="button" onClick={() => cardInputRef.current?.click()} className="flex-1 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-stem-600/10 text-stem-600 text-[9px] md:text-[10px] font-black uppercase border border-stem-600/20 active:scale-95 transition-all">
                                <input type="file" ref={cardInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleCardCapture} /> AI Card Scan
                             </button>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div className="space-y-1 md:space-y-2">
                             <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Identity</label>
                             <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First" className="w-full px-4 md:px-5 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none" required />
                                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last" className="w-full px-4 md:px-5 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none" required />
                                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="w-full px-4 md:px-5 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none mt-0.5 md:mt-2 col-span-2" />
                                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job Title" className="w-full px-4 md:px-5 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none mt-0.5 md:mt-2 col-span-2" />
                             </div>
                             
                             <button type="button" onClick={() => setShowContactFields(!showContactFields)} className="text-[8px] md:text-[9px] font-black text-pear-600 uppercase tracking-widest pl-2 pt-1 md:pt-2 flex items-center gap-1">
                               {showContactFields ? 'Hide Contact Details' : 'Add Contact Details Manually'}
                               <svg className={`w-3 h-3 transition-transform ${showContactFields ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                             </button>

                             {(showContactFields || email || phone || website) && (
                               <div className="grid grid-cols-2 gap-2 mt-1 md:mt-2 animate-in slide-in-from-top-2 duration-300">
                                 <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 md:px-5 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none" />
                                 <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full px-4 md:px-5 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none" />
                                 <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className="w-full px-4 md:px-5 py-1.5 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-bold outline-none col-span-2" />
                               </div>
                             )}
                          </div>
                          <div className={`space-y-1 md:space-y-2 transition-all duration-500 ${showTour && tourStep === 1 ? 'ring-4 ring-pear-500 ring-offset-4 dark:ring-offset-[#020617] rounded-2xl animate-pulse scale-105' : ''}`}>
                             <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Follow-up Draft</label>
                             <button type="button" onClick={isTranscribing ? stopTranscription : startTranscription} className={`w-full py-1.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase border active:scale-95 transition-all ${isTranscribing ? 'bg-red-500 text-white recording-pulse' : 'bg-pear-600/10 text-pear-600'}`}>{isTranscribing ? 'Listening...' : 'Record Voice Intel'}</button>
                          </div>
                       </div>

                       <div className="space-y-2 md:space-y-4">
                          <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Intelligence Channels</label>
                          <div className="flex flex-wrap gap-1 md:gap-2">
                             {Object.values(CommMethod).map(method => (
                               <CommMethodToggle key={method} method={method} selected={commMethods.includes(method)} onToggle={toggleCommMethod} />
                             ))}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mt-2 md:mt-4">
                             {commMethods.map(method => (
                               <div key={method} className="animate-in slide-in-from-left-2 fade-in">
                                  <input 
                                    type="text" 
                                    value={contactValues[method] || ''} 
                                    onChange={(e) => handleContactValueChange(method, e.target.value)}
                                    placeholder={`${method.charAt(0).toUpperCase() + method.slice(1)} handle/address`}
                                    className="w-full px-4 md:px-5 py-2 md:py-3 rounded-lg md:rounded-xl bg-pear-600/5 border border-pear-600/10 text-[10px] md:text-xs font-bold outline-none"
                                  />
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Field Notes</label>
                          <textarea 
                              value={notes} 
                              onChange={(e) => setNotes(e.target.value)} 
                              rows={2} 
                              placeholder="Key discussion points, pain points..." 
                              className={`w-full p-3 md:p-6 rounded-xl md:rounded-[2rem] bg-white dark:bg-white/5 border outline-none text-xs md:text-sm leading-relaxed resize-none transition-all duration-500 ${showTour && tourStep === 1 ? 'border-pear-500 ring-4 ring-pear-500/20' : 'border-slate-200 dark:border-white/10 focus:border-pear-500/50'}`} 
                           />
                       </div>

                       <button type="submit" disabled={isSubmitting} className="w-full py-2.5 md:py-6 bg-pear-600 text-white font-black rounded-xl md:rounded-3xl text-xs md:text-sm shadow-2xl active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest">
                         {isSubmitting ? 'Syncing Intel...' : 'Commit to Pipeline'}
                       </button>
                       <p className="text-[7px] md:text-[8px] font-bold text-slate-400 text-center uppercase tracking-widest opacity-60 mt-2">
                         Records are purged automatically after 30 days for data privacy.
                       </p>
                    </form>
                 </div>
              )}
              
              {view === 'history' && (
                 <div className="space-y-12 animate-in slide-in-from-bottom-8 max-w-2xl mx-auto pt-10">
                    <div className={`sticky top-20 z-30 glass p-5 rounded-[2.5rem] border border-pear-600/20 shadow-2xl ${selectedLeadIds.size > 0 ? 'block' : 'hidden'} transition-all duration-500 ${showTour && tourStep === 2 ? 'ring-4 ring-pear-500 ring-offset-4 dark:ring-offset-[#020617] animate-pulse scale-105' : ''}`}>
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-sm">{selectedLeadIds.size}</div>
                             <button onClick={() => setSelectedLeadIds(new Set())} className="text-xs font-black text-slate-500 uppercase tracking-widest">Deselect All</button>
                          </div>
                          <button onClick={deleteSelectedLeads} className="px-6 py-3 bg-rose-600/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase border border-rose-600/20 active:scale-95 transition-all">Purge Selection</button>
                       </div>
                       <div className="flex gap-2 overflow-x-auto no-scrollbar">
                          <button onClick={() => handleSyncAttempt('sheets')} className="px-8 py-4 bg-emerald-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase shadow-lg hover:bg-emerald-700 transition-all">📊 Drive Sync</button>
                          <button onClick={() => handleSyncAttempt('email')} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase shadow-lg hover:bg-indigo-700 transition-all">✉️ Dispatch</button>
                          
                       </div>
                    </div>
                    <div className="mb-8">
                       <h2 className="text-5xl font-black tracking-tighter mb-2">Lead Intelligence</h2>
                        <div className="flex gap-2 mt-4">
                           <button onClick={() => setStatusMsg({type:'success', text:'Google Spreadsheet Linked.'})} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-slate-900 transition-all">🔗 Link Sheets</button>
                           <button onClick={() => setShowRetentionNotice(true)} className="px-4 py-2 bg-blue-600/10 text-blue-600 rounded-xl text-[9px] font-black uppercase border border-blue-600/20 active:scale-95 transition-all">Retention Policy</button>
                           {leads.length > 0 && (
                             <button onClick={deleteAllLeads} className="px-4 py-2 bg-rose-600/10 text-rose-500 rounded-xl text-[9px] font-black uppercase border border-rose-600/20 active:scale-95 transition-all">Purge All</button>
                           )}
                        </div>
                       <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{leads.length} Active Records In Pipeline</p>
                    </div>
                    <div className="space-y-6">
                       {leads.length === 0 ? (
                         <div className="py-24 text-center glass rounded-[4rem] border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-4xl mb-6 grayscale">🕵️</div>
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Pipeline Dormant</p>
                            <button onClick={() => setView('form')} className="mt-8 text-blue-600 font-black uppercase text-xs tracking-widest">Start Gathering</button>
                         </div>
                       ) : leads.map(lead => (
                          <div key={lead.id} onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)} className={`glass p-4 md:p-8 rounded-2xl md:rounded-[3rem] border relative cursor-pointer shadow-md transition-all duration-300 ${selectedLeadIds.has(lead.id) ? 'border-pear-500 bg-pear-500/5 ring-1 ring-pear-500' : 'border-slate-200 dark:border-white/5 hover:border-pear-500/30'}`}>
                             <button onClick={(e) => { e.stopPropagation(); toggleLeadSelection(lead.id, e); }} className={`absolute top-4 md:top-8 left-4 md:left-6 w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl border-2 flex items-center justify-center transition-all ${selectedLeadIds.has(lead.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-white/10 hover:border-blue-400'}`}>{selectedLeadIds.has(lead.id) && <span className="text-xs md:text-sm">✓</span>}</button>
                             <div className="pl-8 md:pl-12">
                                <div className="flex justify-between items-start mb-4">
                                   <div className="space-y-1">
                                      <h3 className="font-black text-lg md:text-2xl tracking-tight leading-tight">{lead.firstName} {lead.lastName}</h3>
                                      <p className="text-[9px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest">{lead.conferenceName || 'Nexus Gathering'}</p>
                                          {lead.company && <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">• {lead.company}</span>}
                                          {lead.jobTitle && <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">• {lead.jobTitle}</span>}
                                          {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="text-[9px] md:text-[10px] text-blue-500 font-bold hover:underline">• Website</a>}

                                   </div>
                                   <div className="flex flex-wrap gap-1 md:gap-2">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }} 
                                        className="px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-slate-200 dark:border-white/10 text-[8px] md:text-[9px] font-black uppercase hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                      >
                                        Edit
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); generateEmailSuggestion(lead); }} 
                                        disabled={isGeneratingEmail}
                                        className="px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl bg-blue-600 text-white text-[8px] md:text-[9px] font-black uppercase shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
                                      >
                                        {isGeneratingEmail ? 'Drafting...' : 'Email Suggestion'}
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleLinkedinLookup(lead); }} className={`px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border text-[8px] md:text-[9px] font-black uppercase transition-all ${linkedinConnected ? 'bg-[#0077b5] border-[#0077b5] text-white shadow-md' : 'border-slate-200 text-slate-400'}`}>Enrich</button>
                                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                         <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                      </div>
                                   </div>
                                </div>
                                
                                {lead.commMethods.length > 0 && (
                                   <div className="flex flex-wrap gap-1 md:gap-2 mt-2 md:mt-4">
                                      {lead.commMethods.map(m => (
                                        <span key={m} className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-600/10 text-blue-600 text-[7px] md:text-[8px] font-black uppercase rounded-md md:rounded-lg border border-blue-600/10">{m}</span>
                                      ))}
                                   </div>
                                )}

                                {expandedLeadId === lead.id && lead.aiSummary && (
                                   <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-slate-200 dark:border-white/5 animate-in fade-in slide-in-from-top-4">
                                      <div className="p-4 md:p-6 bg-blue-600/5 dark:bg-blue-600/10 rounded-2xl md:rounded-[2.5rem] text-[9px] md:text-[11px] font-medium leading-relaxed italic border border-blue-600/10 whitespace-pre-wrap">
                                         {lead.aiSummary}
                                      </div>
                                   </div>
                                )}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              )}
           </div>
        )}
        {view === 'privacy' && <PrivacyPolicy onBack={() => setView('home')} />}
        {view === 'terms' && <TermsAndConditions onBack={() => setView('home')} />}
        {view === 'contact' && <ContactUs onBack={() => setView('home')} />}
      </main>

      <footer className="py-12 border-t border-slate-200 dark:border-white/10 mt-20 pb-32">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <button onClick={() => setView('privacy')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors tracking-widest">Privacy Policy</button>
            <button onClick={() => setView('terms')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors tracking-widest">Terms & Conditions</button>
            <button onClick={() => setView('contact')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors tracking-widest">Contact Us</button>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60 leading-relaxed font-mono">
            © 2026 Memopear. All rights reserved.<br/>Strategic Intelligence for Field Operations.
          </p>
        </div>
      </footer>

      {/* Editing Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="max-w-2xl w-full glass p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-blue-600/20 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Edit Intelligence</h2>
                <button onClick={() => setEditingLead(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">First Name</label>
                    <input type="text" value={editingLead.firstName} onChange={(e) => setEditingLead({...editingLead, firstName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Last Name</label>
                    <input type="text" value={editingLead.lastName} onChange={(e) => setEditingLead({...editingLead, lastName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Company</label>
                  <input type="text" value={editingLead.company || ''} onChange={(e) => setEditingLead({...editingLead, company: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Notes</label>
                  <textarea value={editingLead.notes} onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})} rows={4} className="w-full p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none resize-none" />
                </div>

                <button onClick={() => handleUpdateLead(editingLead)} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest">Commit Changes</button>
              </div>
           </div>
        </div>
      )}

      {/* Navigation Switch */}
      {isScanning && (
        <QRScanner 
          onScan={(data) => {
            handleScan(data);
            setIsScanning(false);
          }} 
          onClose={() => setIsScanning(false)} 
        />
      )}

      {isLoggedIn && !['login', 'pricing', 'payment', 'privacy', 'terms', 'contact'].includes(view) && !isMenuOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-sm z-[60]">
          <div className="glass p-2 rounded-[3rem] border border-slate-200 dark:border-white/10 flex relative shadow-[0_30px_600px_rgba(0,0,0,0.5)]">
             <div className={`absolute top-2 bottom-2 w-[48%] bg-blue-600 rounded-[2.5rem] transition-all duration-300 ease-out shadow-xl ${view === 'history' ? 'translate-x-full left-[1.5%]' : 'translate-x-0 left-[1.5%]'}`} />
             <button onClick={() => { setView('form'); setExpandedLeadId(null); }} className={`flex-1 flex items-center justify-center py-5 rounded-3xl z-10 text-[11px] font-black uppercase tracking-[0.25em] transition-colors ${view === 'form' ? 'text-white' : 'text-slate-400'}`}>Gather</button>
             <button onClick={() => { setView('history'); setExpandedLeadId(null); }} className={`flex-1 flex items-center justify-center py-5 rounded-3xl z-10 text-[11px] font-black uppercase tracking-[0.25em] transition-colors ${view === 'history' ? 'text-white' : 'text-slate-400'}`}>Pipeline</button>
          </div>
        </div>
      )}

      {/* Platform Tour Modal */}
      {showTour && (
         <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="max-w-md w-full glass p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] text-center shadow-[0_0_100px_rgba(37,99,235,0.2)] border-blue-600/20">
               <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 text-3xl md:text-5xl shadow-2xl">
                  {TOUR_STEPS[tourStep].icon}
               </div>
               <div className="mb-6 md:mb-10">
                  <h2 className="text-2xl md:text-3xl font-black mb-2 md:mb-4 tracking-tight">{TOUR_STEPS[tourStep].title}</h2>
                  <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">{TOUR_STEPS[tourStep].description}</p>
               </div>
               
               <div className="flex gap-1.5 md:gap-2 justify-center mb-6 md:mb-10">
                  {TOUR_STEPS.map((_, i) => (
                    <div key={i} className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${i === tourStep ? 'w-6 md:w-8 bg-blue-600' : 'w-1.5 md:w-2 bg-slate-700'}`} />
                  ))}
               </div>

               <button 
                  onClick={nextTourStep}
                  className="w-full py-4 md:py-6 bg-blue-600 text-white font-black rounded-2xl md:rounded-3xl text-[10px] md:text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
               >
                  {tourStep === TOUR_STEPS.length - 1 ? 'Start Intelligence Gathering' : 'Next Protocol'}
               </button>
               
               <button onClick={completeTour} className="mt-6 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">Skip Tour</button>
            </div>
         </div>
      )}

      {/* Existing Modals and Scanners */}
      {activeModal === 'sheets' && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="max-w-xs w-full glass p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] text-center shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg md:text-xl font-black mb-1 tracking-tighter uppercase text-emerald-600">Spreadsheet Sync</h2>
            <input type="text" value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="Sheet Name" className="w-full px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] md:text-xs font-bold mb-4 md:mb-6 mt-3 md:mt-4 outline-none" />
            <button onClick={() => { setStatusMsg({type:'success', text:'Pipeline pushed to Sheets.'}); setActiveModal(null); setSelectedLeadIds(new Set()); }} className="w-full py-4 md:py-5 bg-emerald-600 text-white font-black rounded-xl md:rounded-2xl text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Commence Push</button>
            <button onClick={() => setActiveModal(null)} className="mt-3 md:mt-4 text-slate-400 font-black text-[8px] md:text-[9px] uppercase hover:text-slate-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {showNotice && !isMenuOpen && !showTour && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/50 backdrop-blur-xl">
           <div className="max-w-xs w-full glass p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] text-center shadow-2xl">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-600/10 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-8 text-3xl md:text-5xl">🛡️</div>
              <h2 className="text-2xl md:text-3xl font-black mb-4 md:mb-6">Nexus Shield</h2>
              <p className="text-[10px] md:text-xs text-slate-500 mb-8 md:mb-10 leading-relaxed">Intelligence gathered locally and encrypted on-device. Your pipeline is protected by Enterprise-grade security.</p>
              <button onClick={() => { localStorage.setItem(STORAGE_KEY_NOTICE, 'true'); setShowNotice(false); }} className="w-full py-4 md:py-6 bg-blue-600 text-white font-black rounded-2xl md:rounded-3xl text-[10px] md:text-xs uppercase tracking-widest active:scale-95">Activate Shield</button>
           </div>
        </div>
      )}

      {showRetentionNotice && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="max-w-xs w-full glass p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] text-center shadow-2xl border border-blue-600/20">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600/10 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-8 text-3xl md:text-4xl">⏱️</div>
              <h2 className="text-xl md:text-2xl font-black mb-3 md:mb-4">Data Retention</h2>
              <p className="text-[10px] md:text-xs text-slate-500 mb-8 md:mb-10 leading-relaxed">To maintain enterprise security and compliance, all gathered intelligence is automatically purged from our system after 30 days of inactivity.</p>
              <button onClick={() => setShowRetentionNotice(false)} className="w-full py-4 md:py-5 bg-blue-600 text-white font-black rounded-2xl md:rounded-3xl text-[10px] md:text-xs uppercase tracking-widest active:scale-95">Understood</button>
           </div>
        </div>
      )}
      
    </div>
  );
};

export default App;
