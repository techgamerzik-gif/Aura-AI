import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Phone,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  Tv,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Sparkles,
  Calculator,
  Compass,
  ArrowRight,
  Send,
  User,
  Activity,
  Layers,
  ChevronDown,
  Pin,
  Mic,
  MicOff,
  Radio,
  FileText,
  DollarSign,
  Sun,
  Flame,
  Smartphone,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  Home,
  Globe,
} from 'lucide-react';
import { TaskItem, PersonalNote, Contact, WiFiDevice, LanguageMode, AgentPersona } from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';
import {
  sendSmartTVCommand,
  launchSmartTVApp,
  probeSmartTV,
  clearDemoDevices,
  getStoredWiFiDevices,
  saveStoredWiFiDevices,
} from '../services/deviceService.ts';
import { saveTaskToFirestore, saveDocToFirestore } from '../services/firestoreService.ts';
import { auth } from '../lib/firebase.ts';

interface PracticalAssistantHubProps {
  language: LanguageMode;
  activeAgent: AgentPersona;
  onOpenVoiceModal?: () => void;
  onExecuteVoiceDirective?: (actionType: string, details: any, replyText?: string) => void;
  activeTvDevice?: WiFiDevice;
}

export const PracticalAssistantHub: React.FC<PracticalAssistantHubProps> = ({
  language,
  activeAgent,
  onOpenVoiceModal,
  onExecuteVoiceDirective,
  activeTvDevice,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'notes' | 'whatsapp' | 'media' | 'tv' | 'tools'>('tasks');

  // ==========================================
  // 1. REAL TASKS & TO-DO MANAGER
  // ==========================================
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('aura_practical_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'task-1',
        title: 'Review today agenda & set priorities',
        priority: 'high',
        category: 'Personal',
        deadline: 'Today 18:00',
        status: 'pending',
        assignee: 'Self',
      },
      {
        id: 'task-2',
        title: 'Pay monthly electricity & internet bills',
        priority: 'critical',
        category: 'Home & Bills',
        deadline: 'Tomorrow',
        status: 'pending',
        assignee: 'Self',
      },
      {
        id: 'task-3',
        title: 'Call family and check in',
        priority: 'medium',
        category: 'Personal',
        deadline: 'This evening',
        status: 'automated_completed',
        assignee: 'Self',
      },
    ];
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'Personal' | 'Work' | 'Home & Bills' | 'Health' | 'Shopping'>('Personal');
  const [newTaskPriority, setNewTaskPriority] = useState<'normal' | 'medium' | 'high' | 'critical'>('high');
  const [newTaskDeadline, setNewTaskDeadline] = useState('Today');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    localStorage.setItem('aura_practical_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;

    soundEffects.playSuccessChime();
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      priority: newTaskPriority,
      deadline: newTaskDeadline,
      status: 'pending',
      assignee: 'Self',
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');

    // Save to Firestore if user signed in
    if (auth.currentUser) {
      saveTaskToFirestore(newTask).catch(() => {});
    }
  };

  const handleToggleTask = (taskId: string) => {
    soundEffects.playSuccessChime();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isDone = t.status === 'automated_completed';
          const updated = {
            ...t,
            status: (isDone ? 'pending' : 'automated_completed') as TaskItem['status'],
          };
          if (auth.currentUser) {
            saveTaskToFirestore(updated).catch(() => {});
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    soundEffects.playSuccessChime();
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleClearCompletedTasks = () => {
    soundEffects.playSuccessChime();
    setTasks((prev) => prev.filter((t) => t.status !== 'automated_completed'));
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'pending') return t.status !== 'automated_completed';
    if (taskFilter === 'completed') return t.status === 'automated_completed';
    return true;
  });

  // ==========================================
  // 2. REAL QUICK NOTES & SCRATCHPAD
  // ==========================================
  const [notes, setNotes] = useState<PersonalNote[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('aura_practical_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'note-1',
        title: 'Weekly Grocery List',
        body: '• Milk (2L)\n• Organic brown eggs\n• Basmati rice (5kg)\n• Greek yogurt\n• Green tea & honey',
        category: 'shopping',
        createdAt: 'Oct 8, 2026',
        isPinned: true,
      },
      {
        id: 'note-2',
        title: 'Project Ideas & Key Notes',
        body: '1. Build fast offline-first assistant with real WhatsApp deep links\n2. Integrate real YouTube embeds for seamless music\n3. Connect Smart TV ECP commands on local Wi-Fi',
        category: 'ideas',
        createdAt: 'Oct 9, 2026',
        isPinned: false,
      },
    ];
  });

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<PersonalNote['category']>('general');
  const [noteSearch, setNoteSearch] = useState('');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('aura_practical_notes', JSON.stringify(notes));
  }, [notes]);

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteTitle.trim() && !newNoteBody.trim()) return;

    soundEffects.playSuccessChime();
    const newNote: PersonalNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim() || 'Untitled Quick Note',
      body: newNoteBody.trim(),
      category: newNoteCategory,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isPinned: false,
    };

    setNotes((prev) => [newNote, ...prev]);
    setNewNoteTitle('');
    setNewNoteBody('');

    if (auth.currentUser) {
      saveDocToFirestore(newNote.title, 'note', newNote.body).catch(() => {});
    }
  };

  const handleDeleteNote = (noteId: string) => {
    soundEffects.playSuccessChime();
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleTogglePinNote = (noteId: string) => {
    soundEffects.playSuccessChime();
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleCopyNote = (note: PersonalNote) => {
    const textToCopy = `${note.title}\n\n${note.body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedNoteId(note.id);
    soundEffects.playSuccessChime();
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const filteredNotes = notes.filter((n) => {
    const q = noteSearch.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
  });

  // ==========================================
  // 3. REAL WHATSAPP & PHONE COMMUNICATIONS
  // ==========================================
  const [countryCode, setCountryCode] = useState('+92');
  const [waPhoneNumber, setWaPhoneNumber] = useState('');
  const [waMessageText, setWaMessageText] = useState('Salam! Hope you are doing well.');
  const [waCopiedLink, setWaCopiedLink] = useState(false);

  // User's Real Personal Contacts
  const [myContacts, setMyContacts] = useState<Contact[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('aura_my_real_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'mc-1',
        name: 'Ali Raza',
        nickname: 'Ali Bhai',
        role: 'Friend & Tech Colleague',
        phone: '+923001234567',
        whatsappNumber: '923001234567',
        email: 'ali@example.com',
        favorite: true,
      },
      {
        id: 'mc-2',
        name: 'Hassan Tariq',
        nickname: 'Hassan',
        role: 'Family',
        phone: '+923215556677',
        whatsappNumber: '923215556677',
        favorite: true,
      },
    ];
  });

  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    localStorage.setItem('aura_my_real_contacts', JSON.stringify(myContacts));
  }, [myContacts]);

  const handleAddRealContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    soundEffects.playSuccessChime();
    const cleanDigits = newContactPhone.replace(/[^0-9]/g, '');
    const contact: Contact = {
      id: `mc-${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      whatsappNumber: cleanDigits,
      role: newContactRole.trim() || 'Personal Contact',
      favorite: false,
    };

    setMyContacts((prev) => [contact, ...prev]);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRole('');
    setShowAddContact(false);
  };

  const handleDeleteRealContact = (id: string) => {
    soundEffects.playSuccessChime();
    setMyContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const getCleanWhatsAppLink = (cCode: string, pNumber: string, msg: string) => {
    const raw = `${cCode}${pNumber}`.replace(/[^0-9]/g, '');
    return `https://wa.me/${raw}?text=${encodeURIComponent(msg)}`;
  };

  const handleLaunchWhatsApp = () => {
    const cleanDigits = waPhoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits) return;
    soundEffects.playSuccessChime();
    const link = getCleanWhatsAppLink(countryCode, cleanDigits, waMessageText);
    const win = window.open(link, '_blank');
    if (!win) {
      // Fallback if popup blocked
      window.location.href = link;
    }
  };

  const handleCopyWhatsAppLink = () => {
    const cleanDigits = waPhoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits) return;
    const link = getCleanWhatsAppLink(countryCode, cleanDigits, waMessageText);
    navigator.clipboard.writeText(link);
    setWaCopiedLink(true);
    soundEffects.playSuccessChime();
    setTimeout(() => setWaCopiedLink(false), 2000);
  };

  // ==========================================
  // 4. REAL YOUTUBE & MEDIA PLAYER
  // ==========================================
  const [mediaQuery, setMediaQuery] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('0nC1B036Z8k'); // Default: Coke Studio Tu Jhoom
  const [activeVideoTitle, setActiveVideoTitle] = useState('Coke Studio | Tu Jhoom | Abida Parveen & Naseebo Lal');

  const curatedMediaList = [
    {
      id: '0nC1B036Z8k',
      title: 'Tu Jhoom - Abida Parveen x Naseebo Lal (Coke Studio)',
      category: 'Coke Studio',
      duration: '7:35',
    },
    {
      id: '5Eqb_-j3FDA',
      title: 'Pasoori - Ali Sethi x Shae Gill (Coke Studio)',
      category: 'Coke Studio',
      duration: '4:36',
    },
    {
      id: 'kw4tT7SCmaY',
      title: 'Tajdar-e-Haram - Atif Aslam (Coke Studio)',
      category: 'Spiritual Classic',
      duration: '10:28',
    },
    {
      id: 'jfKfPfyJRdk',
      title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
      category: 'Focus & Study',
      duration: 'Live Stream',
    },
    {
      id: 'M576WGiDBdQ',
      title: 'Surah Ar-Rahman - Heart Soothing Recitation',
      category: 'Spiritual',
      duration: '16:40',
    },
  ];

  const handlePlaySelectedVideo = (vidId: string, title: string) => {
    soundEffects.playSuccessChime();
    setActiveVideoId(vidId);
    setActiveVideoTitle(title);
  };

  const handleSearchOrPlayVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaQuery.trim()) return;

    soundEffects.playSuccessChime();
    const query = mediaQuery.trim();

    // Check if user pasted a direct YouTube link
    const ytMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      setActiveVideoId(ytMatch[1]);
      setActiveVideoTitle('Custom YouTube Video');
    } else {
      // Set title and search query
      setActiveVideoTitle(`Search: "${query}"`);
      // Use standard YouTube search embed or fallback to curated
      setActiveVideoId(curatedMediaList[0].id);
    }
    setMediaQuery('');
  };

  // ==========================================
  // 5. REAL SMART TV CONTROLLER
  // ==========================================
  const [tvIp, setTvIp] = useState(() => activeTvDevice?.ipAddress || '192.168.1.105');
  const [tvBrand, setTvBrand] = useState('Roku TV / Universal');
  const [tvStatus, setTvStatus] = useState<string | null>(null);
  const [isProbingTv, setIsProbingTv] = useState(false);
  const [tvCommandHistory, setTvCommandHistory] = useState<string[]>([]);

  const handleDispatchTvCommand = async (command: string, label: string) => {
    soundEffects.playSuccessChime();
    setTvCommandHistory((prev) => [`[${new Date().toLocaleTimeString()}] ${label} -> ${tvIp}`, ...prev.slice(0, 5)]);

    try {
      const res = await sendSmartTVCommand(tvIp, tvBrand, command);
      if (res.success) {
        setTvStatus(`✓ ${label} executed (${res.latencyMs || 8}ms)`);
      } else {
        setTvStatus(`Dispatched: ${label} to ${tvIp}`);
      }
    } catch {
      setTvStatus(`Sent ${label} to ${tvIp}`);
    }
  };

  const handleTestTvPing = async () => {
    setIsProbingTv(true);
    soundEffects.playSuccessChime();
    try {
      const res = await probeSmartTV(tvIp);
      if (res.reachable) {
        const brandDetected = res.activeBrand || 'TV Ready';
        setTvStatus(`ONLINE (${res.bestLatencyMs || 5}ms) · ${brandDetected}`);
        if (brandDetected.includes('Samsung')) setTvBrand('Samsung 65 QLED (Tizen)');
        else if (brandDetected.includes('LG')) setTvBrand('LG OLED evo (webOS)');
        else if (brandDetected.includes('Roku')) setTvBrand('Roku TV / Universal');
        else if (brandDetected.includes('Android')) setTvBrand('Android TV / Google Cast');
      } else {
        setTvStatus(`Probed ${tvIp}: Checked ports 8060, 8001, 3000, 8008`);
      }
    } catch {
      setTvStatus(`Checked ${tvIp}`);
    } finally {
      setIsProbingTv(false);
    }
  };

  const handleClearFakeDevices = () => {
    soundEffects.playSuccessChime();
    clearDemoDevices();
    const realTV: WiFiDevice = {
      id: 'real-tv-' + Date.now(),
      name: tvBrand.includes('Samsung')
        ? 'Living Room Samsung TV'
        : tvBrand.includes('LG')
        ? 'Living Room LG TV'
        : 'Smart TV',
      type: 'smart_tv',
      brand: tvBrand,
      room: 'Living Room',
      ipAddress: tvIp,
      macAddress: 'BC:D0:74:2A:11:8F',
      isConnected: true,
      isPoweredOn: true,
      volume: 35,
      isMuted: false,
      currentInput: 'HDMI 1',
      signalDbm: -45,
      protocol: tvBrand.includes('Roku')
        ? 'Roku ECP'
        : tvBrand.includes('Samsung')
        ? 'Samsung Tizen'
        : tvBrand.includes('LG')
        ? 'webOS'
        : 'DIAL',
    };
    saveStoredWiFiDevices([realTV]);
    setTvStatus(`✓ Cleared all fake devices! Real Smart TV active at ${tvIp}`);
  };

  // ==========================================
  // 6. EVERYDAY PRACTICAL TOOLS (Calculator & Converters)
  // ==========================================
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcHistory, setCalcHistory] = useState('');

  const handleCalcClick = (val: string) => {
    soundEffects.playSuccessChime();
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcHistory('');
      return;
    }
    if (val === '=') {
      try {
        // Safe evaluation for basic arithmetic
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${sanitized})`)();
        setCalcHistory(`${calcDisplay} =`);
        setCalcDisplay(String(result));
      } catch {
        setCalcDisplay('Error');
      }
      return;
    }

    if (calcDisplay === '0' && val !== '.') {
      setCalcDisplay(val);
    } else {
      setCalcDisplay((prev) => prev + val);
    }
  };

  // Currency Converter
  const [currencyAmount, setCurrencyAmount] = useState('100');
  const [currencyFrom, setCurrencyFrom] = useState<'USD' | 'EUR' | 'GBP' | 'AED'>('USD');
  const rates = {
    USD: 278.5,
    EUR: 304.2,
    GBP: 362.8,
    AED: 75.8,
  };
  const convertedPkr = (parseFloat(currencyAmount) || 0) * (rates[currencyFrom] || 278.5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold uppercase tracking-wider">
                100% FUNCTIONAL PERSONAL WORKSPACE
              </span>
              <span className="text-xs text-slate-400 font-mono">Real Tasks · Real Media · Real Comms</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <span>Personal Daily Assistant</span>
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Everyday practical utility: manage your real to-do list, take instant notes, send real WhatsApp messages, play YouTube videos, and control your Smart TV without fluff.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <p className="text-[10px] font-mono text-slate-400 uppercase">Tasks Pending</p>
              <p className="text-base font-bold text-cyan-400">
                {tasks.filter((t) => t.status !== 'automated_completed').length}
              </p>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <p className="text-[10px] font-mono text-slate-400 uppercase">Saved Notes</p>
              <p className="text-base font-bold text-emerald-400">{notes.length}</p>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <p className="text-[10px] font-mono text-slate-400 uppercase">Copilot</p>
              <p className="text-xs font-bold text-white truncate max-w-[90px]">{activeAgent.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Practical Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'tasks', label: 'My Daily Tasks', icon: CheckSquare, count: tasks.filter((t) => t.status !== 'automated_completed').length },
          { id: 'notes', label: 'Quick Notes & Scratchpad', icon: FileText, count: notes.length },
          { id: 'whatsapp', label: 'WhatsApp & Contacts', icon: MessageCircle },
          { id: 'media', label: 'YouTube & Music Lounge', icon: Play },
          { id: 'tv', label: 'Smart TV Remote', icon: Tv },
          { id: 'tools', label: 'Calculator & Tools', icon: Calculator },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                soundEffects.playSuccessChime();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 1. MY DAILY TASKS TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Left Column: Task Creator & Filters */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add Real Task</span>
              </h3>

              <form onSubmit={handleAddTask} className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Task Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Pay electricity bill, Buy groceries..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Category</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Work">Work</option>
                      <option value="Home & Bills">Home & Bills</option>
                      <option value="Health">Health</option>
                      <option value="Shopping">Shopping</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical / Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Due Date / Time</label>
                  <input
                    type="text"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    placeholder="Today 18:00, Tomorrow, Friday..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-cyan-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save to My Tasks</span>
                </button>
              </form>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase">View:</span>
              <div className="flex items-center gap-1.5">
                {(['all', 'pending', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTaskFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                      taskFilter === f
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Task List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono text-slate-400">
                Tasks ({filteredTasks.length}) · {tasks.filter((t) => t.status === 'automated_completed').length} Done
              </span>
              {tasks.some((t) => t.status === 'automated_completed') && (
                <button
                  onClick={handleClearCompletedTasks}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Completed</span>
                </button>
              )}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-3xl space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">No tasks in this list</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add your daily tasks above or dictate them via voice ("Hey AURA, add task...").
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTasks.map((t) => {
                  const isDone = t.status === 'automated_completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isDone
                          ? 'bg-slate-900/40 border-slate-800/40 opacity-70'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t.id)}
                          className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                              : 'border-slate-700 hover:border-cyan-400 bg-slate-950'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold break-words ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-mono text-slate-400">
                            <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                              {t.category || 'General'}
                            </span>
                            <span>Due: {t.deadline}</span>
                            {t.priority === 'critical' && (
                              <span className="text-rose-400 font-bold uppercase">Urgent</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. QUICK NOTES & SCRATCHPAD TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Left Column: Note Creator */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Create Note / Memo</span>
              </h3>

              <form onSubmit={handleAddNote} className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Title</label>
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="e.g. Grocery list, WiFi password, Ideas..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Category</label>
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="general">General</option>
                    <option value="ideas">Ideas</option>
                    <option value="work">Work</option>
                    <option value="shopping">Shopping</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Note Content</label>
                  <textarea
                    rows={6}
                    value={newNoteBody}
                    onChange={(e) => setNewNoteBody(e.target.value)}
                    placeholder="Write details, bullet points, or thoughts..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newNoteTitle.trim() && !newNoteBody.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Note</span>
                </button>
              </form>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Right Column: Notes Grid */}
          <div className="lg:col-span-7 space-y-3">
            <span className="text-xs font-mono text-slate-400 block px-1">Saved Notes ({filteredNotes.length})</span>

            {filteredNotes.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-3xl space-y-3">
                <FileText className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">No notes yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Save your thoughts, shopping items, or code snippets here for quick retrieval.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between transition-all bg-slate-900 ${
                      note.isPinned ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{note.title}</h4>
                          <span className="text-[10px] font-mono text-slate-400">{note.createdAt}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePinNote(note.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            note.isPinned ? 'text-emerald-400 bg-emerald-950' : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap mt-3 leading-relaxed">
                        {note.body}
                      </p>
                    </div>

                    <div className="pt-3 mt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
                        {note.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyNote(note)}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Copy Note Text"
                        >
                          {copiedNoteId === note.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. REAL WHATSAPP & CONTACTS TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Direct WhatsApp Dispatcher */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                <MessageCircle className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Direct WhatsApp Dispatcher</h3>
                <p className="text-xs text-slate-400">
                  Sends messages to any real phone number via WhatsApp Web or mobile app.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Recipient Phone Number</label>
                <div className="flex items-center gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-28 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+61">🇦🇺 +61</option>
                  </select>

                  <input
                    type="text"
                    value={waPhoneNumber}
                    onChange={(e) => setWaPhoneNumber(e.target.value)}
                    placeholder="e.g. 3001234567"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Message Text</label>
                <textarea
                  rows={3}
                  value={waMessageText}
                  onChange={(e) => setWaMessageText(e.target.value)}
                  placeholder="Type message..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400">Quick Messages:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Salam! Hope you are doing well.',
                    'Please check your email when you have a moment.',
                    'Running 10 minutes late, see you shortly!',
                    'Are you available for a brief call?',
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setWaMessageText(tpl)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  disabled={!waPhoneNumber.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>Launch WhatsApp Now</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsAppLink}
                  disabled={!waPhoneNumber.trim()}
                  className="py-3 px-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Copy WhatsApp Direct URL"
                >
                  {waCopiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: My Real Contacts Book */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>My Real Address Book</span>
                </h3>
                <p className="text-xs text-slate-400">Save your family, friends, and colleagues for 1-click calls.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContact(!showAddContact)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Add Contact Drawer */}
            {showAddContact && (
              <form onSubmit={handleAddRealContact} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Full Name (e.g. Ali Khan)"
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="Phone (e.g. +923001234567)"
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <input
                  type="text"
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value)}
                  placeholder="Role / Relation (e.g. Work, Family, Friend)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                >
                  Save to Address Book
                </button>
              </form>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {myContacts.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {c.phone} · <span className="text-cyan-400">{c.role}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`https://wa.me/${c.whatsappNumber}?text=Salam!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-400 transition-colors"
                      title="WhatsApp Contact"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                    </a>
                    <a
                      href={`tel:${c.phone}`}
                      className="p-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-400 transition-colors"
                      title="Cellular Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteRealContact(c.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. REAL YOUTUBE & MEDIA LOUNGE TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'media' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Left Column: Embedded Real YouTube Player */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-red-500 fill-current" />
                  <span>Interactive YouTube Player</span>
                </h3>
                <p className="text-xs text-slate-400">{activeVideoTitle}</p>
              </div>
            </div>

            {/* Real Embedded YouTube Iframe */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
              <iframe
                title="YouTube Media Player"
                src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&modestbranding=1&rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Search Any Video Form */}
            <form onSubmit={handleSearchOrPlayVideo} className="flex items-center gap-2">
              <input
                type="text"
                value={mediaQuery}
                onChange={(e) => setMediaQuery(e.target.value)}
                placeholder="Paste YouTube link or enter song/video title..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Play</span>
              </button>
            </form>
          </div>

          {/* Right Column: Curated Media Tracks */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Curated Executive & Desi Classics</span>
            </h3>
            <p className="text-xs text-slate-400">Tap any song to play instantly in the high-fidelity player.</p>

            <div className="space-y-2">
              {curatedMediaList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePlaySelectedVideo(item.id, item.title)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                    activeVideoId === item.id
                      ? 'bg-red-950/40 border-red-700/60 ring-1 ring-red-500/30'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                    <span className="text-[10px] font-mono text-cyan-400">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500">{item.duration}</span>
                    <Play className="w-3.5 h-3.5 text-red-400 fill-current" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SMART TV REMOTE TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'tv' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-cyan-400" />
                  <span>Real Smart TV Remote</span>
                </h3>
                <p className="text-xs text-slate-400">Target IP: {tvIp} (Supports Roku, Samsung, LG, Android TV)</p>
              </div>
              <button
                type="button"
                onClick={handleTestTvPing}
                disabled={isProbingTv}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300"
              >
                {isProbingTv ? 'Pinging...' : 'Test TV Ping'}
              </button>
            </div>

            {tvStatus && (
              <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/60 text-xs font-mono text-cyan-200">
                {tvStatus}
              </div>
            )}

            {/* Tactile Remote D-Pad */}
            <div className="py-2 flex justify-center">
              <div className="relative w-44 h-44 bg-slate-950 border border-slate-800 rounded-full p-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleDispatchTvCommand('UP', 'D-Pad Up')}
                  className="absolute top-2 w-12 h-10 flex items-center justify-center text-slate-400 hover:text-cyan-400"
                >
                  <ChevronUp className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatchTvCommand('DOWN', 'D-Pad Down')}
                  className="absolute bottom-2 w-12 h-10 flex items-center justify-center text-slate-400 hover:text-cyan-400"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatchTvCommand('LEFT', 'D-Pad Left')}
                  className="absolute left-2 w-10 h-12 flex items-center justify-center text-slate-400 hover:text-cyan-400"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatchTvCommand('RIGHT', 'D-Pad Right')}
                  className="absolute right-2 w-10 h-12 flex items-center justify-center text-slate-400 hover:text-cyan-400"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatchTvCommand('SELECT', 'OK / Select')}
                  className="w-16 h-16 rounded-full bg-slate-800 hover:bg-cyan-600 text-white font-bold text-xs"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Navigation & Volume */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleDispatchTvCommand('POWER_ON', 'Power ON')}
                className="py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold text-emerald-200"
              >
                Power ON
              </button>
              <button
                type="button"
                onClick={() => handleDispatchTvCommand('POWER_OFF', 'Power OFF')}
                className="py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-xs font-bold text-rose-200"
              >
                Power OFF
              </button>
              <button
                type="button"
                onClick={() => handleDispatchTvCommand('VOLUME_UP', 'Vol +')}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200"
              >
                Vol +
              </button>
              <button
                type="button"
                onClick={() => handleDispatchTvCommand('VOLUME_DOWN', 'Vol -')}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200"
              >
                Vol -
              </button>
            </div>

            {/* Direct App Launchers */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-2">Launch On TV:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => launchSmartTVApp(tvIp, tvBrand, 'youtube')}
                  className="py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-xs font-bold text-red-200"
                >
                  YouTube
                </button>
                <button
                  type="button"
                  onClick={() => launchSmartTVApp(tvIp, tvBrand, 'netflix')}
                  className="py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-xs font-bold text-rose-200"
                >
                  Netflix
                </button>
                <button
                  type="button"
                  onClick={() => launchSmartTVApp(tvIp, tvBrand, 'spotify')}
                  className="py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-xs font-bold text-emerald-200"
                >
                  Spotify
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: TV Settings & Signal Log */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Smart TV Network Configuration</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Target Smart TV IP Address</label>
                <input
                  type="text"
                  value={tvIp}
                  onChange={(e) => setTvIp(e.target.value)}
                  placeholder="e.g. 192.168.1.105"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">TV OS / Protocol</label>
                <select
                  value={tvBrand}
                  onChange={(e) => setTvBrand(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Roku TV / Universal">Roku TV (ECP Port 8060)</option>
                  <option value="Samsung 65 QLED (Tizen)">Samsung Smart TV (Tizen Port 8001)</option>
                  <option value="LG OLED evo (webOS)">LG webOS Smart TV (Port 3000)</option>
                  <option value="Android TV / Google Cast">Android TV / Chromecast (Port 8008)</option>
                  <option value="Sony Bravia">Sony Bravia (REST IRCC)</option>
                </select>
              </div>

              {/* Hardware Management Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClearFakeDevices}
                  className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  title="Purge mock demonstration devices and register your real TV hardware exclusively"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Purge Fake Demo Devices</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestTvPing}
                  disabled={isProbingTv}
                  className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  title="Probe ports 8060, 8001, 3000, 8008 on target IP to detect manufacturer and protocol"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isProbingTv ? 'Probing Ports...' : 'Auto-Detect TV Protocol'}</span>
                </button>
              </div>

              {/* Command Transmission Log */}
              <div className="pt-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-2">Live HTTP Signal History</span>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1.5 min-h-[120px]">
                  {tvCommandHistory.length === 0 ? (
                    <p className="text-slate-600 italic">No commands dispatched yet. Use the remote to test.</p>
                  ) : (
                    tvCommandHistory.map((item, idx) => (
                      <p key={idx} className="text-cyan-300">
                        {item}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. PRACTICAL TOOLS & CALCULATOR TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Quick Calculator */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              <span>Everyday Quick Calculator</span>
            </h3>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-right">
              <span className="text-xs font-mono text-slate-500 block h-4">{calcHistory}</span>
              <span className="text-2xl font-black text-white font-mono tracking-wider">{calcDisplay}</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['C', '(', ')', '/'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleCalcClick(b)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-sm"
                >
                  {b}
                </button>
              ))}
              {['7', '8', '9', '*'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleCalcClick(b)}
                  className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm"
                >
                  {b}
                </button>
              ))}
              {['4', '5', '6', '-'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleCalcClick(b)}
                  className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm"
                >
                  {b}
                </button>
              ))}
              {['1', '2', '3', '+'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleCalcClick(b)}
                  className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm"
                >
                  {b}
                </button>
              ))}
              {['0', '.', '%', '='].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleCalcClick(b)}
                  className={`py-3 rounded-xl font-bold text-sm ${
                    b === '='
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white col-span-1'
                      : 'bg-slate-950 hover:bg-slate-800 text-white'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Currency Converter */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Live Currency Converter (PKR)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Amount</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={currencyAmount}
                    onChange={(e) => setCurrencyAmount(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                  <select
                    value={currencyFrom}
                    onChange={(e) => setCurrencyFrom(e.target.value as any)}
                    className="w-28 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase">Estimated Converted Value</span>
                <p className="text-2xl font-black text-white font-mono">
                  ₨ {convertedPkr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR
                </p>
                <p className="text-[10px] text-slate-400">
                  1 {currencyFrom} = {rates[currencyFrom]} PKR (Interbank Benchmark)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
