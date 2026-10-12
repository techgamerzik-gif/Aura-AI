import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckSquare,
  Presentation,
  Compass,
  Car,
  Shield,
  Mic,
  Sparkles,
  Radio,
  Clock,
  BatteryCharging,
  Globe,
  Activity,
  AlertTriangle,
  ChevronRight,
  Bot,
  Zap,
  Headphones,
  Music,
  Phone,
  Smile,
  Users,
  Brain,
  Volume2,
  Tv,
  Trash2,
  Cast,
  Play,
  Pause,
  Minimize2,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { AuraOrb } from './components/AuraOrb.tsx';
import { VoiceModal } from './components/VoiceModal.tsx';
import { AmbientVoiceBar } from './components/AmbientVoiceBar.tsx';
import { UniversalCommandBar } from './components/UniversalCommandBar.tsx';
import { UniversalFileViewer } from './components/UniversalFileViewer.tsx';
import { soundEffects } from './utils/audioChime.ts';
import { speakText } from './utils/speech.ts';
import { ScheduleHub } from './components/ScheduleHub.tsx';
import { AutomationHub } from './components/AutomationHub.tsx';
import { DocumentsHub } from './components/DocumentsHub.tsx';
import { ConciergeHub } from './components/ConciergeHub.tsx';
import { ConnectedEcosystem } from './components/ConnectedEcosystem.tsx';
import { SmartHomeHub } from './components/SmartHomeHub.tsx';
import { SecurityVault } from './components/SecurityVault.tsx';
import { UrduSlangShowcase } from './components/UrduSlangShowcase.tsx';
import { MediaPlayer, CURATED_TRACKS } from './components/MediaPlayer.tsx';
import { WebResearchHub } from './components/WebResearchHub.tsx';
import { ContactsManager, INITIAL_CONTACTS } from './components/ContactsManager.tsx';
import { EntertainmentHub } from './components/EntertainmentHub.tsx';
import { AgentSquad, AGENT_PERSONAS } from './components/AgentSquad.tsx';
import { UserProfileMemory, INITIAL_USER_PROFILE } from './components/UserProfileMemory.tsx';
import { WorkAuditMonitor } from './components/WorkAuditMonitor.tsx';
import { CommandAuditModal } from './components/CommandAuditModal.tsx';
import { HolographicListeningScreen } from './components/HolographicListeningScreen.tsx';
import { PracticalAssistantHub } from './components/PracticalAssistantHub.tsx';
import { parseUserDirective, parseMultiUserDirectives, synthesizeMultiTaskReport } from './utils/intentParser.ts';
import { commandLearningEngine } from './utils/commandLearningEngine.ts';
import { useAuth } from './context/AuthContext.tsx';
import { saveTaskToFirestore, saveEventToFirestore } from './services/firestoreService.ts';
import { PRACTICAL_IMPLEMENTATION_REPORT_CONTENT } from './data/formalReport.ts';
import { executeDeviceDirective } from './services/deviceService.ts';

import {
  ScheduleEvent,
  TaskItem,
  EmailMessage,
  CarTelemetry,
  HomeAutomationState,
  WellnessMetrics,
  LanguageMode,
  MediaTrack,
  Contact,
  AgentPersona,
  UserPersonalProfile,
  PresentationDeck,
  SlideItem,
  UniversalFile,
} from './types/assistant.ts';

export const INITIAL_SAMPLE_DECKS: PresentationDeck[] = [
  {
    id: 'deck-sample-1',
    deckTitle: 'Autonomous Executive Operations & AI Strategy',
    audience: 'Board of Directors & C-Suite',
    createdAt: 'Today',
    slides: [
      {
        slideNumber: 1,
        title: 'Autonomous Executive Transformation',
        subtitle: 'From Cognitive Friction to Compounding Velocity',
        bullets: [
          'Enterprise decision cycles reduced from days to minutes via autonomous copilot orchestration',
          'Elimination of calendar collision and 0-minute scheduling fatigue across global executive teams',
          'Sovereign end-to-end encryption for executive correspondence and confidential board assets',
        ],
        takeaway: 'Autonomous executive orchestration converts administrative overhead into strategic momentum.',
        notes: 'Open by anchoring the committee on time reclaimed: 14+ hours per executive week.',
      },
      {
        slideNumber: 2,
        title: 'Core Directives & Calendar Governance',
        subtitle: 'Mandatory 15-Minute Transition Buffers',
        bullets: [
          'Algorithmic enforcement of minimum 15-minute buffers between consecutive high-stakes sessions',
          'Asynchronous status meetings replaced by autonomous 3-minute executive briefings',
          'Automated meeting rescheduling when zero-transition conflicts occur',
        ],
        takeaway: 'Cognitive rest intervals directly correlate with higher decision quality.',
        notes: 'Highlight our proactive conflict resolution model demonstrated this morning.',
      },
      {
        slideNumber: 3,
        title: 'Connected IoT & Real-Time Telemetry',
        subtitle: 'Tesla Fleet, Smart TV Displays & Biometrics',
        bullets: [
          'Seamless pre-departure climate synchronization (Tesla Model S Plaid cabin pre-cooled to 21°C)',
          'Smart TV and boardroom display casting with zero latency and multi-device discovery',
          'Continuous biometric monitoring alerting when screen time exceeds optimal focus duration',
        ],
        takeaway: 'The executive workspace now spans vehicle, boardroom, and home into a unified nervous system.',
        notes: 'Demonstrate one-tap casting to the Boardroom 4K laser projector.',
      },
      {
        slideNumber: 4,
        title: 'Financial Autopilot & Treasury Authority',
        subtitle: 'Autonomous Approvals with Sovereign Guardrails',
        bullets: [
          'Pre-authorized threshold for routine operational commitments under $500',
          'Multi-signature verification required for enterprise capital commitments over $50,000',
          'Real-time automated reconciliation with cloud ERP and banking vaults',
        ],
        takeaway: 'Frictionless financial velocity paired with zero-trust sovereign compliance.',
        notes: 'Conclude with Q3 ROI projections: 3.8x velocity increase.',
      },
    ],
  },
];

export const INITIAL_SAMPLE_EVENTS: ScheduleEvent[] = [
  // Thursday Sep 24 (Today) - Zero Transition Violation: 10:00-11:30 then 11:30-12:30 without 15m buffer
  {
    id: 'ev-1',
    title: 'Global Board of Directors Strategy Session',
    timeStart: '10:00',
    timeEnd: '11:30',
    date: '2026-09-24',
    location: 'Executive Boardroom & Encrypted Meet',
    category: 'board',
    priority: 'high',
    attendees: ['you@executive.ai', 'chair@board.com', 'cfo@corp.com'],
    notes: 'Final vote on Q3 Autonomous AI transformation and $42M budget allocation.',
  },
  {
    id: 'ev-2',
    title: 'Key Client Strategic Partnership Review',
    timeStart: '11:30',
    timeEnd: '12:30',
    date: '2026-09-24',
    location: 'Virtual VIP Bridge',
    category: 'client',
    priority: 'high',
    attendees: ['you@executive.ai', 'vp@enterpriseclient.com'],
    conflict: true,
    conflictReason: 'Zero transition buffer immediately following 90-minute high-stakes board session.',
    notes: 'Needs 15-minute buffer insertion for cognitive reset.',
  },
  {
    id: 'ev-3',
    title: 'Deep Work & Strategy Block (Asynchronous)',
    timeStart: '14:00',
    timeEnd: '15:30',
    date: '2026-09-24',
    location: 'Private Executive Suite',
    category: 'internal',
    priority: 'medium',
    attendees: ['you@executive.ai'],
    notes: 'AURA AI automatically holding deep-focus period.',
  },
  {
    id: 'ev-4',
    title: 'Evening Chauffeur & VIP Cinema Screening',
    timeStart: '19:45',
    timeEnd: '22:00',
    date: '2026-09-24',
    location: 'Grand Luxury Cinemas · Director Lounge',
    category: 'personal',
    priority: 'medium',
    attendees: ['you@executive.ai', 'family@guest.com'],
    notes: 'Tesla pre-conditioning scheduled 15m prior to departure.',
  },

  // Wednesday Sep 23 (Yesterday) - Dense Sequential Back-to-Back Violation (3 consecutive sessions, 0m buffer)
  {
    id: 'ev-w1',
    title: 'Enterprise Q4 Cloud Infrastructure Sync',
    timeStart: '09:00',
    timeEnd: '10:00',
    date: '2026-09-23',
    location: 'Conference Room Alpha',
    category: 'internal',
    priority: 'medium',
    attendees: ['you@executive.ai', 'cto@corp.com'],
    notes: 'Q4 server modernization.',
  },
  {
    id: 'ev-w2',
    title: 'Sovereign AI Security Architecture Review',
    timeStart: '10:00',
    timeEnd: '11:15',
    date: '2026-09-23',
    location: 'Secure Operations Center',
    category: 'board',
    priority: 'high',
    attendees: ['you@executive.ai', 'ciso@corp.com'],
    conflict: true,
    conflictReason: 'Zero transition between internal tech sync and high-stakes CISO review.',
    notes: 'Violates 15-minute cognitive reset buffer.',
  },
  {
    id: 'ev-w3',
    title: 'Investor Syndicate Capital Allocation',
    timeStart: '11:15',
    timeEnd: '12:30',
    date: '2026-09-23',
    location: 'Encrypted Video Bridge',
    category: 'board',
    priority: 'high',
    attendees: ['you@executive.ai', 'partners@syndicate.vc'],
    conflict: true,
    conflictReason: 'Triple consecutive high-stakes stack with zero recovery intervals.',
    notes: 'Violates 15-minute buffer rule.',
  },

  // Tuesday Sep 22 - Balanced Day with 15m buffers active
  {
    id: 'ev-t1',
    title: 'Product Design Council & UX Teardown',
    timeStart: '10:00',
    timeEnd: '11:15',
    date: '2026-09-22',
    location: 'Design Studio & Figma Live',
    category: 'internal',
    priority: 'medium',
    attendees: ['you@executive.ai', 'lead-designer@corp.com'],
    notes: 'Quarterly design review.',
  },
  {
    id: 'ev-t2-buf',
    title: '15m Cognitive Reset Buffer',
    timeStart: '11:15',
    timeEnd: '11:30',
    date: '2026-09-22',
    location: 'Executive Wellness Garden',
    category: 'buffer',
    priority: 'low',
    isBufferSlot: true,
    hasBuffer: true,
    attendees: ['you@executive.ai'],
    notes: 'Protected working memory decompression buffer.',
  },
  {
    id: 'ev-t3',
    title: 'Global Sales Pipeline & Enterprise Closed-Won',
    timeStart: '11:30',
    timeEnd: '12:30',
    date: '2026-09-22',
    location: 'Boardroom A',
    category: 'client',
    priority: 'high',
    hasBuffer: true,
    cognitiveResetApplied: true,
    attendees: ['you@executive.ai', 'cro@corp.com'],
    notes: 'Protected by preceding 15m buffer.',
  },

  // Friday Sep 25 - Optimal Deep Work Day with ample buffer
  {
    id: 'ev-f1',
    title: 'Executive Team 1-on-1 Strategy Sync',
    timeStart: '10:30',
    timeEnd: '11:30',
    date: '2026-09-25',
    location: 'Private Terrace',
    category: 'internal',
    priority: 'medium',
    attendees: ['you@executive.ai', 'cos@corp.com'],
    notes: 'Weekly wrap up.',
  },
  {
    id: 'ev-f2',
    title: 'Q3 Autonomous Financial Audit Signoff',
    timeStart: '14:00',
    timeEnd: '15:00',
    date: '2026-09-25',
    location: 'Treasury Desk',
    category: 'board',
    priority: 'high',
    hasBuffer: true,
    attendees: ['you@executive.ai', 'auditor@big4.com'],
    notes: 'Preceded by 2.5 hours of focus time. Low burnout risk.',
  },
];

export const INITIAL_SAMPLE_TASKS: TaskItem[] = [
  {
    id: 't-1',
    title: 'Ratify Q3 Board Resolution & Treasury Disclosures',
    assignee: 'You (Approved via AURA)',
    deadline: 'Today 17:00',
    priority: 'critical',
    status: 'pending',
    category: 'legal',
    subtasks: [
      { id: 'st-1-1', title: 'Legal & audit committee disclosure sign-off', completed: true },
      { id: 'st-1-2', title: 'Dual-signature treasury allocation review', completed: true },
      { id: 'st-1-3', title: 'Chairman executive board seal ratification', completed: false },
    ],
  },
  {
    id: 't-2',
    title: 'Approve Cloud Infrastructure Enterprise SLA ($420.00)',
    assignee: 'AURA Autonomous Autopilot',
    deadline: 'Today 14:00',
    priority: 'high',
    status: 'blocked',
    parentTaskId: 't-1',
    dependsOn: ['t-1'],
    isBlocked: true,
    blockedReason: 'Requires Q3 Board Resolution ratification before enterprise SLA signoff',
    category: 'finance',
    subtasks: [
      { id: 'st-2-1', title: 'Multi-region 99.999% failover audit', completed: true },
      { id: 'st-2-2', title: 'SOC-2 Type II enterprise compliance addendum', completed: false },
      { id: 'st-2-3', title: 'Automated executive budget threshold authorization', completed: false },
    ],
  },
  {
    id: 't-3',
    title: 'Confirm Emirates First Class Lounge booking (DXB-LHR)',
    assignee: 'AURA Concierge Desk',
    deadline: 'Tomorrow',
    priority: 'medium',
    status: 'automated_completed',
    automatedAction: 'Verified cheapest executive rate & lounge access confirmed.',
    category: 'operations',
    subtasks: [
      { id: 'st-3-1', title: 'Seat selection (1A Private Suites verified)', completed: true },
      { id: 'st-3-2', title: 'DXB Chauffeur-drive VIP pickup reservation', completed: true },
    ],
  },
  {
    id: 't-4',
    title: 'Review AI Autonomous Transformation Presentation Deck',
    assignee: 'You & Chief of Staff',
    deadline: 'Tomorrow 09:00',
    priority: 'high',
    status: 'blocked',
    parentTaskId: 't-1',
    dependsOn: ['t-1'],
    isBlocked: true,
    blockedReason: 'Pending Board Strategy review and Q3 resolution signoff',
    category: 'operations',
    subtasks: [
      { id: 'st-4-1', title: 'Generate executive summary & ROI projections', completed: true },
      { id: 'st-4-2', title: 'Chief of Staff deck narrative alignment', completed: false },
    ],
  },
  {
    id: 't-5',
    title: 'Execute Series B Wire Transfer & Legal Escrow ($12.5M)',
    assignee: 'Corporate Treasury Escrow',
    deadline: 'Tomorrow 15:00',
    priority: 'critical',
    status: 'blocked',
    parentTaskId: 't-2',
    dependsOn: ['t-1', 't-2'],
    isBlocked: true,
    blockedReason: 'Requires both Board Resolution and Cloud SLA approvals before transfer release',
    category: 'finance',
    subtasks: [
      { id: 'st-5-1', title: 'Zurich escrow master agreement verified', completed: true },
      { id: 'st-5-2', title: 'Dual-key cryptographic token generation', completed: false },
      { id: 'st-5-3', title: 'Fedwire SWIFT MT103 confirmation receipt', completed: false },
      { id: 'st-5-4', title: 'Investor cap table ledger synchronization', completed: false },
    ],
  },
];

export const INITIAL_SAMPLE_EMAILS: EmailMessage[] = [
  {
    id: 'em-1',
    sender: 'Marcus Vance',
    senderEmail: 'm.vance@vanguardcapital.com',
    subject: 'URGENT: Board Approval for Series B Term Sheet',
    snippet: 'We have received the revised terms from the lead syndicate...',
    body: `Dear Executive,\n\nWe have received the revised terms from the lead syndicate. The pre-money valuation is set at $85M with 1x non-participating liquidation preference.\n\nCould you please confirm if we have your final blessing to sign by 16:00 today?\n\nRegards,\nMarcus Vance\nManaging Partner`,
    receivedTime: '08:42 AM',
    priority: 'urgent',
    status: 'unread',
  },
  {
    id: 'em-2',
    sender: 'Dr. Tariq Al-Mansoor',
    senderEmail: 't.mansoor@gulfenterprise.ae',
    subject: 'Rescheduling our Riyadh Infrastructure Review',
    snippet: 'Salam brother. My flight was delayed by 2 hours...',
    body: `Salam brother,\n\nHope all is well. My morning flight into Riyadh experienced a 2-hour delay. Can we push our 14:00 session to 16:30 or first thing tomorrow morning?\n\nLooking forward to catching up,\nTariq`,
    receivedTime: '09:15 AM',
    priority: 'normal',
    status: 'unread',
  },
  {
    id: 'em-3',
    sender: 'Emirates Airline Bookings',
    senderEmail: 'reservations@emirates.com',
    subject: 'Flight Confirmation: EK-601 Karachi (KHI) to Dubai (DXB) - Booking Ref #EK948X',
    snippet: 'Flight EK-601 arrives Dubai International (DXB) Terminal 3 at 20:45 GST...',
    body: `Dear Executive,\n\nYour flight booking is confirmed.\n\nFlight: EK-601\nAirline: Emirates\nRoute: Karachi (KHI) -> Dubai (DXB) Terminal 3\nDeparture: 18:25 PKT\nArrival Time: 20:45 GST\nSeat: 02A (First Class Private Suite)\nBooking Reference: EK948X\nAircraft: Boeing 777-300ER\n\nVIP Fast Track immigration and priority baggage tags attached. Chauffeur pickup bay #4 designated.`,
    receivedTime: '10:12 AM',
    priority: 'normal',
    status: 'unread',
  },
  {
    id: 'em-4',
    sender: 'Qatar Airways Privilege Club',
    senderEmail: 'confirmations@qatarairways.com',
    subject: 'E-Ticket & Itinerary: QR-611 Islamabad (ISB) to London Heathrow (LHR) - Booking Ref #QR7821P',
    snippet: 'Booking Confirmed: QR-611 ISB -> LHR Terminal 4. Arrival at London Heathrow at 13:30 BST...',
    body: `Dear Passenger,\n\nHere is your confirmed flight itinerary.\n\nFlight: QR-611\nAirline: Qatar Airways\nRoute: Islamabad (ISB) -> London Heathrow (LHR) Terminal 4\nArrival Time: 13:30 BST\nCabin: Qsuite Business Class\nSeat: 03E\nBooking Reference: QR7821P\nAircraft: Airbus A350-1000\n\nPriority baggage tags attached. LHR Terminal 4 VIP Curbside designated.`,
    receivedTime: 'Yesterday',
    priority: 'normal',
    status: 'unread',
  },
];

export default function App() {
  const { user, signInWithGoogle, signOut, idToken } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'practical'
    | 'briefing'
    | 'audit'
    | 'schedule'
    | 'contacts'
    | 'entertainment'
    | 'squad'
    | 'memory'
    | 'automation'
    | 'documents'
    | 'concierge'
    | 'ecosystem'
    | 'vault'
    | 'research'
  >('practical');
  const [ecosystemInitialTab, setEcosystemInitialTab] = useState<'car' | 'home' | 'tv_wifi' | 'wellness'>('car');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [showCommandAuditModal, setShowCommandAuditModal] = useState(false);
  const [autoListenEnabled, setAutoListenEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('aura_autolisten_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [initialVoiceCommand, setInitialVoiceCommand] = useState<string>('');
  const [language, setLanguage] = useState<LanguageMode>('ur_slang');
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  useEffect(() => {
    localStorage.setItem('aura_autolisten_enabled', String(autoListenEnabled));
  }, [autoListenEnabled]);

  // Multi-Agent & Voice Persona State
  const [activeAgent, setActiveAgent] = useState<AgentPersona>(AGENT_PERSONAS[0]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('tariq_urdu_male');

  // Full-Screen Holographic Listening Mode State
  const [isHolographicScreenOpen, setIsHolographicScreenOpen] = useState<boolean>(false);

  // Inactivity / Idle detection: "whenever not otherwise working it should have a full screen listening mode"
  const idleTimerRef = useRef<any>(null);
  useEffect(() => {
    const handleActivity = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      // Auto-engage holographic listening mode after 45 seconds of inactivity
      idleTimerRef.current = setTimeout(() => {
        if (!isHolographicScreenOpen && !isVoiceOpen && activeTab !== 'vault') {
          setIsHolographicScreenOpen(true);
        }
      }, 45000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);
    handleActivity();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [isHolographicScreenOpen, isVoiceOpen, activeTab]);

  // Keyboard shortcut H or F to toggle holographic listening mode
  useEffect(() => {
    const handleKeyShortcut = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHolographicScreenOpen(false);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsHolographicScreenOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyShortcut);
    return () => window.removeEventListener('keydown', handleKeyShortcut);
  }, []);

  // Clean Slate & Sample Data Wipe State
  const [isSampleDataWiped, setIsSampleDataWiped] = useState<boolean>(() => {
    return localStorage.getItem('aura_clean_slate_active') === 'true';
  });

  // Universal File Viewer State (for Videos, Presentations, Documents)
  const [activeViewerFile, setActiveViewerFile] = useState<UniversalFile | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [isViewerMinimized, setIsViewerMinimized] = useState<boolean>(false);
  const [isViewerFullscreen, setIsViewerFullscreen] = useState<boolean>(false);

  // Presentation Decks State
  const [decks, setDecks] = useState<PresentationDeck[]>(() => {
    const saved = localStorage.getItem('aura_custom_decks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    if (localStorage.getItem('aura_clean_slate_active') === 'true') {
      return [];
    }
    return INITIAL_SAMPLE_DECKS;
  });
  const [activeDeck, setActiveDeck] = useState<PresentationDeck | null>(() => decks[0] || null);

  // Sync custom decks to localStorage
  useEffect(() => {
    localStorage.setItem('aura_custom_decks', JSON.stringify(decks));
  }, [decks]);

  // Contacts & Telephony State
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('aura_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    if (localStorage.getItem('aura_clean_slate_active') === 'true') {
      return [];
    }
    return INITIAL_CONTACTS;
  });
  const [activeCall, setActiveCall] = useState<{ contact: Contact; startTime: number } | null>(null);

  // User Profile Memory (Auto-Learning Likes, Dislikes, Nicknames)
  const [userProfile, setUserProfile] = useState<UserPersonalProfile>(() => {
    const saved = localStorage.getItem('aura_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return INITIAL_USER_PROFILE;
  });

  // Media Player & Queue Playlist States
  const [isMediaPlayerOpen, setIsMediaPlayerOpen] = useState(false);
  const [isMediaFloating, setIsMediaFloating] = useState(false);
  const [currentMediaTrack, setCurrentMediaTrack] = useState<MediaTrack | null>(CURATED_TRACKS[0]);
  const [isMediaPlaying, setIsMediaPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<MediaTrack[]>(() => CURATED_TRACKS.slice(0, 4));

  // Sync contacts and profile to localStorage
  useEffect(() => {
    localStorage.setItem('aura_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('aura_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Hands-free wake word and voice command handler: executes commands without opening chat box
  const handleWakeWordDetected = (command: string) => {
    const trimmed = (command || '').trim();

    // 1. Explicit request to open chat box
    if (trimmed && /^(?:open|show|launch)\s+(?:the\s+)?(?:chat\s*box|voice\s*modal|chat|voice\s*chat|assistant\s*modal)$/i.test(trimmed)) {
      soundEffects.playWakeChime();
      setIsVoiceOpen(true);
      return;
    }

    // 2. Command provided with wake word hands-free
    if (trimmed) {
      const dirs = parseMultiUserDirectives(trimmed);
      if (dirs.length > 0) {
        soundEffects.playSuccessChime();
        if (dirs.length > 1) {
          const report = synthesizeMultiTaskReport(dirs, language);
          const reply = language === 'ur_script' ? report.reply.ur_script : language === 'ur_slang' ? report.reply.ur_slang : report.reply.en;
          dirs.forEach((dir, idx) => {
            handleExecuteDirectVoiceAction(dir.actionType, dir.details, idx === dirs.length - 1 ? reply : undefined);
          });
        } else {
          const parsed = dirs[0];
          const reply = language === 'ur_script' ? parsed.defaultReply.ur_script : language === 'ur_slang' ? parsed.defaultReply.ur_slang : parsed.defaultReply.en;
          handleExecuteDirectVoiceAction(parsed.actionType, parsed.details, reply);
        }
        return;
      }

      // Check direct single directive
      const single = parseUserDirective(trimmed);
      if (single) {
        soundEffects.playSuccessChime();
        const reply = language === 'ur_script' ? single.defaultReply.ur_script : language === 'ur_slang' ? single.defaultReply.ur_slang : single.defaultReply.en;
        handleExecuteDirectVoiceAction(single.actionType, single.details, reply);
        return;
      }

      // Check commandLearningEngine
      const learned = commandLearningEngine.matchInput(trimmed);
      if (learned.matched && learned.pattern) {
        soundEffects.playSuccessChime();
        const actionType = learned.pattern.actionType;
        const details = learned.extractedDetails || learned.pattern.details;
        const summary = learned.pattern.summary;
        const reply = language === 'ur_script' ? `حکم کریں، ${summary} مکمل کر دیا گیا ہے۔` : language === 'ur_slang' ? `Hukum Boss! ${summary} execute kar diya hai.` : `Confirmed: ${summary}.`;
        handleExecuteDirectVoiceAction(actionType, details, reply);
        return;
      }

      // Hands-free fallback via /api/assistant/chat
      fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, language }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.action) {
            handleExecuteDirectVoiceAction(data.action.actionType, data.action.details, data.reply);
          } else if (data?.reply) {
            speakText(data.reply, language, undefined, selectedVoiceId);
          }
        })
        .catch(() => {});
      return;
    }

    // 3. Wake word alone ("Hey AURA") without trailing command: chime and acknowledge hands-free without opening modal
    soundEffects.playWakeChime();
    const promptReply =
      language === 'ur_script'
        ? 'حکم کریں، میں سن رہا ہوں۔'
        : language === 'ur_slang'
        ? 'Hukum Boss! AURA alert hai, hands-free sun raha hoon. Batayein kya execute karoon?'
        : 'Standing by hands-free, Chief. How can I assist you?';
    speakText(promptReply, language, undefined, selectedVoiceId);
  };

  // Direct voice action handler for ambient auto-listening
  const handleExecuteDirectVoiceAction = (actionType: string, details: any, replyText?: string) => {
    soundEffects.playSuccessChime();
    handleExecuteAction(actionType, details);
    if (replyText) {
      speakText(replyText, language, undefined, selectedVoiceId);
    }
  };

  // Global hotkey 'V' to activate voice command if not inside an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'v' || e.key === 'V') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        soundEffects.playWakeChime();
        setIsVoiceOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Master Schedule Data
  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('aura_events');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    if (localStorage.getItem('aura_clean_slate_active') === 'true') {
      return [];
    }
    return INITIAL_SAMPLE_EVENTS;
  });

  useEffect(() => {
    localStorage.setItem('aura_events', JSON.stringify(events));
  }, [events]);

  // Master Tasks Data
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('aura_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    if (localStorage.getItem('aura_clean_slate_active') === 'true') {
      return [];
    }
    return INITIAL_SAMPLE_TASKS;
  });

  useEffect(() => {
    localStorage.setItem('aura_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Master Emails Data
  const [emails, setEmails] = useState<EmailMessage[]>(() => {
    const saved = localStorage.getItem('aura_emails');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    if (localStorage.getItem('aura_clean_slate_active') === 'true') {
      return [];
    }
    return INITIAL_SAMPLE_EMAILS;
  });

  useEffect(() => {
    localStorage.setItem('aura_emails', JSON.stringify(emails));
  }, [emails]);

  // Smart Car State
  const [carState, setCarState] = useState<CarTelemetry>({
    model: 'Tesla Model S Plaid (Executive Spec)',
    batteryPercent: 84,
    rangeMiles: 312,
    cabinTempCelsius: 24,
    targetTempCelsius: 21,
    climateActive: false,
    locked: true,
    sentryMode: true,
    valetMode: false,
    location: 'Corporate HQ VIP Parking Bay 01',
  });

  // Smart Home & Office State
  const [homeState, setHomeState] = useState<HomeAutomationState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aura_home_state');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      officeLightingMode: 'focus',
      thermostatCelsius: 21.5,
      airQualityIndex: 18,
      privacyGlassFrosted: true,
      securityArmed: true,
      robotCleanerStatus: 'docked',
      lightsPower: true,
      purifierActive: true,
      purifierMode: 'auto',
      pm25: 4.2,
      humidityPercent: 48,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('aura_home_state', JSON.stringify(homeState));
    } catch {}
  }, [homeState]);

  // Wellness Metrics
  const [wellness, setWellness] = useState<WellnessMetrics>({
    sleepScore: 91,
    hrvMs: 66,
    waterIntakeLiters: 1.75,
    targetWaterLiters: 2.5,
    screenTimeHours: 2.1,
    stressLevel: 'low',
    lastBreakMinutesAgo: 45,
  });

  // Media Playback Handlers & Interrupt Controls
  const handlePlayMedia = (details: any) => {
    soundEffects.playSuccessChime();
    const query = details?.query || details?.title || '';
    const targetYtId = details?.youtubeId;

    let matchedTrack = CURATED_TRACKS.find(
      (t) =>
        (targetYtId && t.youtubeId === targetYtId) ||
        (query && t.title.toLowerCase().includes(query.toLowerCase())) ||
        (query && t.artist.toLowerCase().includes(query.toLowerCase()))
    );

    if (!matchedTrack) {
      matchedTrack = {
        id: `track-${Date.now()}`,
        title: details?.title || query || 'Executive Streaming Lounge',
        artist: details?.artist || (targetYtId ? 'YouTube Stream' : 'AURA Autonomous Stream'),
        category: 'custom',
        mediaType: details?.mediaType === 'video' ? 'video' : 'song',
        youtubeId: targetYtId || 'zQDAi8tI-cU',
      };
    }

    setCurrentMediaTrack(matchedTrack);
    setIsMediaPlaying(true);
    setIsMediaFloating(true);

    // Also ensure this track and any batch tracks are in playlist queue
    setPlaylist((prev) => {
      let nextList = prev;
      if (details?.tracks && Array.isArray(details.tracks)) {
        const toAdd = details.tracks.filter(
          (dt: any) => !nextList.some((p) => (dt.youtubeId && p.youtubeId === dt.youtubeId) || p.id === dt.id)
        );
        nextList = [...nextList, ...toAdd];
      }
      if (!nextList.find((p) => p.id === matchedTrack!.id || (matchedTrack!.youtubeId && p.youtubeId === matchedTrack!.youtubeId))) {
        return [...nextList, matchedTrack!];
      }
      return nextList;
    });
  };

  const handleStopMedia = () => {
    setIsMediaPlaying(false);
  };

  const handlePlayNext = () => {
    if (!currentMediaTrack) return;
    const pool = playlist.length > 0 ? playlist : CURATED_TRACKS;
    const currentIndex = pool.findIndex((t) => t.id === currentMediaTrack.id);
    const nextIndex = (currentIndex + 1) % pool.length;
    setCurrentMediaTrack(pool[nextIndex]);
    setIsMediaPlaying(true);
  };

  const handlePlayPrevious = () => {
    if (!currentMediaTrack) return;
    const pool = playlist.length > 0 ? playlist : CURATED_TRACKS;
    const currentIndex = pool.findIndex((t) => t.id === currentMediaTrack.id);
    const prevIndex = (currentIndex - 1 + pool.length) % pool.length;
    setCurrentMediaTrack(pool[prevIndex]);
    setIsMediaPlaying(true);
  };

  const handleAddToPlaylist = (details: any) => {
    soundEffects.playSuccessChime();
    if (details?.tracks && Array.isArray(details.tracks)) {
      setPlaylist((prev) => {
        const existingYtIds = new Set(prev.map((t) => t.youtubeId).filter(Boolean));
        const newTracks = details.tracks.filter((t: any) => !existingYtIds.has(t.youtubeId));
        return [...prev, ...(newTracks.length > 0 ? newTracks : details.tracks)];
      });
      return;
    }

    const query = details?.query || details?.title || '';
    const track: MediaTrack = details?.id
      ? details
      : {
          id: `custom-${Date.now()}`,
          title: details?.title || query || 'Executive Added Song',
          artist: details?.artist || 'YouTube Stream',
          category: 'custom',
          mediaType: details?.mediaType || 'video',
          youtubeId: details?.youtubeId || 'zQDAi8tI-cU',
        };
    setPlaylist((prev) => {
      if (track.youtubeId && prev.some((t) => t.youtubeId === track.youtubeId)) {
        return prev;
      }
      return [...prev, track];
    });
  };

  const handleRemoveFromPlaylist = (id: string) => {
    setPlaylist((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTogglePlay = () => {
    setIsMediaPlaying((prev) => !prev);
  };

  const handleSelectTrack = (track: MediaTrack) => {
    setCurrentMediaTrack(track);
    setIsMediaPlaying(true);
  };

  // 1. Wipe all sample data for user clean slate
  const handleWipeSampleData = () => {
    soundEffects.playSuccessChime();
    setEvents([]);
    setTasks([]);
    setEmails([]);
    setDecks([]);
    setActiveDeck(null);
    setContacts([]);
    setIsSampleDataWiped(true);
    localStorage.setItem('aura_clean_slate_active', 'true');
    localStorage.removeItem('aura_events');
    localStorage.removeItem('aura_tasks');
    localStorage.removeItem('aura_emails');
    localStorage.removeItem('aura_custom_decks');
    localStorage.removeItem('aura_contacts');
  };

  // Restore sample demo data
  const handleRestoreSampleData = () => {
    soundEffects.playSuccessChime();
    setEvents(INITIAL_SAMPLE_EVENTS);
    setTasks(INITIAL_SAMPLE_TASKS);
    setEmails(INITIAL_SAMPLE_EMAILS);
    setDecks(INITIAL_SAMPLE_DECKS);
    setActiveDeck(INITIAL_SAMPLE_DECKS[0]);
    setContacts(INITIAL_CONTACTS);
    setIsSampleDataWiped(false);
    localStorage.removeItem('aura_clean_slate_active');
    localStorage.setItem('aura_events', JSON.stringify(INITIAL_SAMPLE_EVENTS));
    localStorage.setItem('aura_tasks', JSON.stringify(INITIAL_SAMPLE_TASKS));
    localStorage.setItem('aura_emails', JSON.stringify(INITIAL_SAMPLE_EMAILS));
    localStorage.setItem('aura_custom_decks', JSON.stringify(INITIAL_SAMPLE_DECKS));
    localStorage.setItem('aura_contacts', JSON.stringify(INITIAL_CONTACTS));
  };

  // 2. Guaranteed On-Ground Presentation Generation
  const generatePresentationOnGround = (topic: string, count = 4, audience = 'Executive Board & C-Suite') => {
    soundEffects.playSuccessChime();
    const cleanTopic = topic.trim() || 'Autonomous Operations & AI Transformation Strategy';

    const generatedSlides: SlideItem[] = [
      {
        slideNumber: 1,
        title: cleanTopic,
        subtitle: 'Strategic Overview, Autonomous Directives & High-Impact Outcomes',
        bullets: [
          `Executive roadmap for implementing ${cleanTopic} across corporate business tracks`,
          'Autonomous copilot orchestration replacing high-friction administrative overhead',
          'Target outcome: 3.8x velocity expansion with zero-delay operational handoffs',
        ],
        takeaway: 'Decisive autonomous alignment delivers immediate competitive leverage.',
        notes: 'Open by addressing executive committee on immediate efficiency gains.',
      },
      {
        slideNumber: 2,
        title: 'Operational Execution Tracks',
        subtitle: 'Core Milestones & Resource Allocations',
        bullets: [
          'Track 1: End-to-end autonomous calendar and communication triage',
          'Track 2: Proactive meeting buffer enforcement (15-min cognitive reset)',
          'Track 3: Connected smart ecosystem (Tesla EV fleet, Smart Office, Biometrics)',
        ],
        takeaway: 'Disciplined autonomous workflows yield compounding returns.',
        notes: 'Walk the board through Phase 1 implementation cadence.',
      },
      {
        slideNumber: 3,
        title: 'Connected IoT & Real-Time Telemetry',
        subtitle: 'Smart TV, WiFi Devices & Device Telemetry',
        bullets: [
          'Multi-device WiFi network discovery linking Smart TVs, displays, and audio soundbars',
          'Low-latency presentation casting directly to Boardroom Projectors and TV screens',
          'Local and cloud bi-directional telemetry with AES-GCM 256-bit encryption',
        ],
        takeaway: 'One unified nervous system spanning mobile, vehicles, and boardroom displays.',
        notes: 'Demonstrate real-time casting capability.',
      },
      {
        slideNumber: 4,
        title: 'Financial Projections & Governance Guardrails',
        subtitle: 'Capital Efficiency & Zero-Trust Verification',
        bullets: [
          'Autonomous settlement threshold authorized for transactions under $500',
          'Strict multi-signature approval required for capital expenditures over $50,000',
          'Projected 42% cost reduction across administrative operations in Q4',
        ],
        takeaway: 'Frictionless velocity secured by rigorous sovereign guardrails.',
        notes: 'Invite board questions and call for final ratification.',
      },
    ];

    const newDeck: PresentationDeck = {
      id: `deck-${Date.now()}`,
      deckTitle: cleanTopic,
      audience,
      createdAt: 'Just now',
      slides: generatedSlides,
    };

    setDecks((prev) => {
      const updated = [newDeck, ...prev.filter((d) => d.id !== newDeck.id)];
      localStorage.setItem('aura_custom_decks', JSON.stringify(updated));
      return updated;
    });
    setActiveDeck(newDeck);

    // Prepare UniversalFile representation and open in viewer
    const file: UniversalFile = {
      id: newDeck.id,
      title: newDeck.deckTitle,
      type: 'presentation',
      category: 'Decks & Presentations',
      createdAt: 'Just now',
      presentationDeck: newDeck,
      fileSize: `${newDeck.slides.length} Slides · Interactive`,
    };

    setActiveViewerFile(file);
    setIsViewerOpen(true);
    setIsViewerMinimized(false);
    setActiveTab('documents');
    return newDeck;
  };

  // 3. Open Any File in Universal Viewer
  const handleOpenFileInViewer = (file: UniversalFile) => {
    soundEffects.playSuccessChime();
    setActiveViewerFile(file);
    setIsViewerOpen(true);
    setIsViewerMinimized(false);
  };

  // 4. Open Video Player with Full Controls
  const handleOpenVideoPlayer = (customTitle?: string, ytId?: string) => {
    soundEffects.playSuccessChime();
    const videoFile: UniversalFile = {
      id: `video-${Date.now()}`,
      title: customTitle || currentMediaTrack?.title || 'Executive Strategy & Innovation Stream',
      type: 'video',
      category: 'Executive Media',
      createdAt: 'Live Stream',
      youtubeId: ytId || currentMediaTrack?.youtubeId || 'jfKfPfyJRdk',
      fileSize: '1080p 60fps HD',
    };
    setActiveViewerFile(videoFile);
    setIsViewerOpen(true);
    setIsViewerMinimized(false);
    setIsMediaPlaying(true);
  };

  // 5. Cast active media or deck to TV
  const handleCastToTV = (targetDevice = 'Living Room Smart TV (65" Samsung QLED)') => {
    soundEffects.playSuccessChime();
    setEcosystemInitialTab('tv_wifi');
  };

  // 6. Universal Command Bar Dispatcher (Handles Typed or Clicked Commands Anywhere)
  const handleExecuteUniversalCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;
    soundEffects.playSuccessChime();

    // Presentation generation commands
    if (/create.*(?:presentation|deck|slides)|(?:presentation|deck|slides).*(?:create|make|generate)|make.*presentation|new deck/i.test(trimmed)) {
      const topic = trimmed
        .replace(/^(?:create|generate|make|build|open|show|a|an|the|new|presentation|deck|slides|about|on|for)+/gi, ' ')
        .trim() || 'AI Transformation & Autonomous Operations';
      generatePresentationOnGround(topic);
      return;
    }

    // Open existing presentation
    if (/open.*(?:presentation|deck|slides)|view.*(?:presentation|deck|slides)|show.*(?:presentation|deck)/i.test(trimmed)) {
      if (activeDeck) {
        const file: UniversalFile = {
          id: activeDeck.id,
          title: activeDeck.deckTitle,
          type: 'presentation',
          category: 'Decks',
          createdAt: activeDeck.createdAt,
          presentationDeck: activeDeck,
        };
        handleOpenFileInViewer(file);
      } else {
        generatePresentationOnGround('Executive AI Strategy');
      }
      return;
    }

    // Formal Practical Implementation and Testing Report commands
    if (/report|implementation report|testing report|audit report|system report|formal report/i.test(trimmed)) {
      setActiveTab('documents');
      const reportFile: UniversalFile = {
        id: 'doc-report-formal',
        title: 'Practical Implementation and Testing Report',
        type: 'document',
        category: 'Formal Engineering Audit',
        createdAt: 'September 2026',
        content: PRACTICAL_IMPLEMENTATION_REPORT_CONTENT,
        fileSize: 'Verified AES-GCM 256-bit',
      };
      handleOpenFileInViewer(reportFile);
      return;
    }

    // Video Player & Media Commands
    if (/open.*video|video player|watch video|play video/i.test(trimmed)) {
      handleOpenVideoPlayer();
      return;
    }
    if (/^play$|^resume$|play video|play audio|start playback/i.test(trimmed)) {
      setIsMediaPlaying(true);
      return;
    }
    if (/^pause$|pause video|pause audio|pause playback/i.test(trimmed)) {
      setIsMediaPlaying(false);
      return;
    }
    if (/^stop$|stop video|stop music|stop playback/i.test(trimmed)) {
      handleStopMedia();
      return;
    }
    if (/^next$|next video|next track|next song|skip/i.test(trimmed)) {
      handlePlayNext();
      return;
    }
    if (/^previous$|^prev$|previous video|previous song/i.test(trimmed)) {
      handlePlayPrevious();
      return;
    }
    if (/minimize|pip|picture in picture|floating/i.test(trimmed)) {
      setIsViewerMinimized(true);
      return;
    }
    if (/full\s*screen|maximize|expand/i.test(trimmed)) {
      setIsViewerFullscreen(true);
      setIsViewerMinimized(false);
      return;
    }

    // Clean Slate / Wipe Sample Data
    if (/wipe.*sample|delete.*sample|clear.*sample|clean slate|start clean|delete all data/i.test(trimmed)) {
      handleWipeSampleData();
      return;
    }
    if (/restore.*sample|reset.*sample/i.test(trimmed)) {
      handleRestoreSampleData();
      return;
    }

    // TV & WiFi Devices
    if (/tv|remote|television|smart tv/i.test(trimmed)) {
      setEcosystemInitialTab('tv_wifi');
      setActiveTab('ecosystem');
      return;
    }
    if (/wifi|network|connected devices|scan network|scanner/i.test(trimmed)) {
      setEcosystemInitialTab('tv_wifi');
      setActiveTab('ecosystem');
      return;
    }
    if (/bluetooth|pair/i.test(trimmed)) {
      setEcosystemInitialTab('tv_wifi');
      setActiveTab('ecosystem');
      return;
    }
    if (/cast|mirror/i.test(trimmed)) {
      handleCastToTV();
      return;
    }

    // Core Pages & Hub Navigation
    if (/audit|work audit|operations/i.test(trimmed)) {
      setActiveTab('audit');
      return;
    }
    if (/schedule|calendar|meeting/i.test(trimmed)) {
      if (/create|add|new|schedule meeting/i.test(trimmed)) {
        const title = trimmed.replace(/create|add|new|schedule|meeting/gi, '').trim() || 'Executive Strategy Session';
        const newEv: ScheduleEvent = {
          id: `ev-${Date.now()}`,
          title,
          timeStart: '15:00',
          timeEnd: '16:00',
          date: '2026-09-24',
          location: 'Virtual VIP Bridge',
          category: 'board',
          priority: 'high',
          attendees: ['you@executive.ai'],
        };
        setEvents((prev) => [...prev, newEv]);
      }
      setActiveTab('schedule');
      return;
    }
    if (/task|deliverable/i.test(trimmed)) {
      if (/create|add|new/i.test(trimmed)) {
        const title = trimmed.replace(/create|add|new|task|deliverable/gi, '').trim() || 'Custom Strategic Task';
        const newTask: TaskItem = {
          id: `t-${Date.now()}`,
          title,
          assignee: 'You (Approved via AURA)',
          deadline: 'Today 18:00',
          priority: 'high',
          status: 'pending',
          category: 'operations',
        };
        setTasks((prev) => [newTask, ...prev]);
      }
      setActiveTab('automation');
      return;
    }
    if (/email|inbox|messages/i.test(trimmed)) {
      setActiveTab('automation');
      return;
    }
    if (/documents|memos|notes/i.test(trimmed)) {
      setActiveTab('documents');
      return;
    }
    if (/concierge|travel|booking|hotel/i.test(trimmed)) {
      setActiveTab('concierge');
      return;
    }
    if (/research|web search|market/i.test(trimmed)) {
      setActiveTab('research');
      return;
    }
    if (/contacts|calls|phone|whatsapp/i.test(trimmed)) {
      setActiveTab('contacts');
      return;
    }
    if (/vault|security|encryption/i.test(trimmed)) {
      setActiveTab('vault');
      return;
    }
    if (/car|tesla|climate/i.test(trimmed)) {
      setEcosystemInitialTab('car');
      setActiveTab('ecosystem');
      return;
    }
    if (/home|office|lights/i.test(trimmed)) {
      setEcosystemInitialTab('home');
      setActiveTab('ecosystem');
      return;
    }
    if (/health|wellness|stamina/i.test(trimmed)) {
      setEcosystemInitialTab('wellness');
      setActiveTab('ecosystem');
      return;
    }

    if (/audit|test\s*commands?|versatility|capability/i.test(trimmed)) {
      soundEffects.playWakeChime();
      setShowCommandAuditModal(true);
      return;
    }

    const directDirective = parseUserDirective(trimmed);
    if (directDirective) {
      handleExecuteAction(directDirective.actionType, directDirective.details);
      return;
    }

    // Default: Open Voice Modal with pre-filled query
    setInitialVoiceCommand(trimmed);
    setIsVoiceOpen(true);
  };

  // Action Dispatcher from Voice or AI
  const handleExecuteAction = (actionType: string, details: any) => {
    if (actionType === 'MULTI_ACTION') {
      soundEffects.playSuccessChime();
      const directives: any[] = details?.directives || [];
      directives.forEach((dir) => {
        if (dir && dir.actionType && dir.actionType !== 'MULTI_ACTION') {
          handleExecuteAction(dir.actionType, dir.details);
        }
      });
      return;
    }

    if (actionType === 'CREATE_TASK' || actionType === 'ADD_TASK') {
      soundEffects.playSuccessChime();
      const title = details?.title || 'Executive Strategic Deliverable';
      const newTask: TaskItem = {
        id: `t-${Date.now()}`,
        title,
        assignee: details?.assignee || 'AURA Autonomous Copilot',
        deadline: details?.deadline || 'Today 18:00',
        priority: details?.priority || 'high',
        status: 'pending',
        category: details?.category || 'operations',
      };
      setTasks((prev) => [newTask, ...prev]);
      saveTaskToFirestore(newTask);
      setActiveTab('automation');
    } else if (actionType === 'COMPLETE_TASK' || actionType === 'EXECUTE_TASK') {
      soundEffects.playSuccessChime();
      const targetId = details?.taskId;
      const query = (details?.query || details?.title || '').toLowerCase();
      let matched = false;
      const updated = tasks.map((t) => {
        if (!matched) {
          if (
            (targetId && targetId !== 'first_pending' && t.id === targetId) ||
            (query && (t.title.toLowerCase().includes(query) || (query.includes('board') && t.id === 't-1') || (query.includes('sla') && t.id === 't-2'))) ||
            (targetId === 'first_pending' && t.status !== 'automated_completed')
          ) {
            matched = true;
            const updatedTask: TaskItem = {
              ...t,
              status: 'automated_completed' as const,
              automatedAction: `Autonomous completion confirmed via AURA Voice Autopilot at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            };
            saveTaskToFirestore(updatedTask);
            return updatedTask;
          }
        }
        return t;
      });
      if (!matched) {
        const firstPendingIdx = updated.findIndex((t) => t.status !== 'automated_completed');
        if (firstPendingIdx >= 0) {
          updated[firstPendingIdx] = {
            ...updated[firstPendingIdx],
            status: 'automated_completed',
            automatedAction: `Autonomous completion confirmed via AURA Voice Autopilot at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          };
          saveTaskToFirestore(updated[firstPendingIdx]);
        }
      }
      setTasks(updated);
      setActiveTab('automation');
    } else if (actionType === 'DELETE_TASK' || actionType === 'REMOVE_TASK') {
      soundEffects.playSuccessChime();
      const targetId = details?.taskId;
      const query = (details?.query || details?.title || '').toLowerCase();
      setTasks((prev) =>
        prev.filter((t) => {
          if (targetId && t.id === targetId) return false;
          if (query && (t.title.toLowerCase().includes(query) || (query.includes('board') && t.id === 't-1') || (query.includes('sla') && t.id === 't-2'))) {
            return false;
          }
          return true;
        })
      );
      setActiveTab('automation');
    } else if (actionType === 'SCHEDULE_MEETING' || actionType === 'ADD_MEETING') {
      soundEffects.playSuccessChime();
      const title = details?.title || 'Executive Review Session';
      const newEv: ScheduleEvent = {
        id: `ev-${Date.now()}`,
        title,
        timeStart: details?.timeStart || '16:00',
        timeEnd: details?.timeEnd || '17:00',
        date: details?.date || '2026-09-24',
        location: details?.location || 'Virtual VIP Bridge',
        category: 'board',
        priority: 'high',
        attendees: ['you@executive.ai'],
        notes: 'Autonomous booking via AURA Voice Directive.',
      };
      setEvents((prev) => [...prev, newEv]);
      saveEventToFirestore(newEv);
      setActiveTab('schedule');
    } else if (actionType === 'SEND_EMAIL' || actionType === 'EMAIL_REPLY') {
      soundEffects.playSuccessChime();
      const emailId = details?.emailId || 'em-1';
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId || e.sender.toLowerCase().includes((details?.recipient || '').toLowerCase())
            ? { ...e, status: 'replied' as const }
            : e
        )
      );
      setActiveTab('automation');
    } else if (actionType === 'PLAY_MEDIA') {
      handlePlayMedia(details);
    } else if (actionType === 'STOP_MEDIA' || actionType === 'PAUSE_MEDIA') {
      handleStopMedia();
    } else if (actionType === 'NEXT_MEDIA' || actionType === 'CHANGE_MEDIA') {
      handlePlayNext();
    } else if (actionType === 'PREVIOUS_MEDIA') {
      handlePlayPrevious();
    } else if (actionType === 'ADD_TO_PLAYLIST') {
      handleAddToPlaylist(details);
    } else if (actionType === 'CALL_CONTACT') {
      soundEffects.playSuccessChime();
      const targetName = (details?.contactName || 'Cheetah').toLowerCase();
      const matched =
        contacts.find(
          (c) =>
            c.name.toLowerCase().includes(targetName) ||
            (c.nickname && c.nickname.toLowerCase().includes(targetName))
        ) || contacts[0];
      setActiveCall({ contact: matched, startTime: Date.now() });
      setActiveTab('contacts');
    } else if (actionType === 'SEND_WHATSAPP' || actionType === 'SEND_SMS') {
      setActiveTab('contacts');
    } else if (actionType === 'CRACK_JOKE' || actionType === 'TELL_STORY') {
      setActiveTab('entertainment');
    } else if (actionType === 'SWITCH_AGENT') {
      const agentId = details?.agentId;
      const found = AGENT_PERSONAS.find((a) => a.id === agentId);
      if (found) {
        setActiveAgent(found);
      }
      setActiveTab('squad');
    } else if (actionType === 'LEARN_PREFERENCE') {
      const content = details?.content || '';
      setUserProfile((prev) => ({
        ...prev,
        likes: [content, ...prev.likes],
        learnedFacts: [
          {
            id: `fact-${Date.now()}`,
            type: 'like',
            content,
            learnedAt: 'Just now',
            confidence: 0.99,
          },
          ...prev.learnedFacts,
        ],
      }));
    } else if (actionType === 'LEARN_DISLIKE') {
      const content = details?.content || '';
      setUserProfile((prev) => ({
        ...prev,
        dislikes: [content, ...prev.dislikes],
        learnedFacts: [
          {
            id: `fact-${Date.now()}`,
            type: 'dislike',
            content,
            learnedAt: 'Just now',
            confidence: 0.99,
          },
          ...prev.learnedFacts,
        ],
      }));
    } else if (actionType === 'LEARN_VOCABULARY') {
      const term = details?.term || 'Custom Term';
      const meaning = details?.meaning || details?.content || '';
      setUserProfile((prev) => ({
        ...prev,
        customVocabulary: [
          { term, meaning, context: 'Auto-learned via conversation' },
          ...prev.customVocabulary,
        ],
      }));
    } else if (actionType === 'SHOW_WORK_AUDIT') {
      soundEffects.playSuccessChime();
      setActiveTab('audit');
    } else if (actionType === 'WEB_RESEARCH') {
      setActiveTab('research');
    } else if (actionType === 'RESCHEDULE_EVENT' || actionType === 'CONFLICT_RESOLVE') {
      const bufferSlot: ScheduleEvent = {
        id: `buffer-slot-${Date.now()}`,
        title: '15-Min Cognitive Reset & Bio-Buffer',
        timeStart: '11:30',
        timeEnd: '11:45',
        date: '2026-09-24',
        location: 'Executive Wellness Zone',
        category: 'buffer',
        priority: 'low',
        attendees: ['you@executive.ai'],
        isBufferSlot: true,
        hasBuffer: true,
        notes: 'Mandatory 15-minute cognitive reset buffer before high-stakes partnership review.',
      };
      const updated = events.map((ev) => {
        if (ev.conflict) {
          return {
            ...ev,
            timeStart: '11:45',
            timeEnd: '12:45',
            conflict: false,
            hasBuffer: true,
            cognitiveResetApplied: true,
            notes: (ev.notes ? ev.notes + ' ' : '') + '[15m Cognitive Reset Buffer Added]',
          };
        }
        return ev;
      });
      setEvents([...updated, bufferSlot]);
      setActiveTab('schedule');
    } else if (actionType === 'CAR_CONTROL') {
      const isUnlock = details?.unlock || details?.command === 'unlock';
      const isLock = details?.lock || details?.locked || details?.command === 'lock';
      setCarState((prev) => ({
        ...prev,
        climateActive: details?.climateActive !== undefined ? details.climateActive : true,
        locked: isUnlock ? false : isLock ? true : (details?.locked !== undefined ? details.locked : prev.locked),
        targetTempCelsius: details?.targetTemp || prev.targetTempCelsius,
      }));
      setEcosystemInitialTab('car');
      setActiveTab('ecosystem');
    } else if (actionType === 'GENERATE_DECK') {
      const topic = details?.topic || details?.prompt || 'Autonomous Operations Strategy';
      generatePresentationOnGround(topic);
    } else if (actionType === 'WIPE_SAMPLE_DATA') {
      handleWipeSampleData();
    } else if (actionType === 'LIGHT_CONTROL') {
      executeDeviceDirective('LIGHT_CONTROL', details);
      setEcosystemInitialTab('home');
      setActiveTab('ecosystem');
    } else if (actionType === 'TV_CONTROL' || actionType === 'OPEN_TV_REMOTE' || actionType === 'CONTROL_TV') {
      executeDeviceDirective('TV_CONTROL', details);
      setEcosystemInitialTab('tv_wifi');
      setActiveTab('ecosystem');
    } else if (actionType === 'BLUETOOTH_CONNECT' || actionType === 'BLUETOOTH_DISCONNECT') {
      executeDeviceDirective(actionType, details);
      setEcosystemInitialTab('tv_wifi');
      setActiveTab('ecosystem');
    } else if (actionType === 'AC_CONTROL') {
      executeDeviceDirective('AC_CONTROL', details);
      setEcosystemInitialTab('home');
      setActiveTab('ecosystem');
    } else if (actionType === 'SCAN_DEVICES' || actionType === 'SCAN_WIFI') {
      executeDeviceDirective('SCAN_DEVICES', details);
      setEcosystemInitialTab('tv_wifi');
      setActiveTab('ecosystem');
    } else if (actionType === 'ROBOT_CLEANER') {
      soundEffects.playSuccessChime();
      const isDock = details?.command === 'dock';
      setHomeState((prev) => ({
        ...prev,
        robotCleanerStatus: isDock ? 'docked' : 'cleaning',
      }));
      setEcosystemInitialTab('home');
      setActiveTab('ecosystem');
    } else if (actionType === 'CHANGE_VOICE') {
      if (details?.voiceId) {
        setSelectedVoiceId(details.voiceId);
      }
    } else if (actionType === 'RESUME_MEDIA') {
      setIsMediaPlaying(true);
    } else if (actionType === 'VOLUME_MEDIA') {
      soundEffects.playSuccessChime();
    } else if (actionType === 'SHUFFLE_MEDIA') {
      soundEffects.playSuccessChime();
      setPlaylist((prev) => [...prev].sort(() => Math.random() - 0.5));
    } else if (actionType === 'OPEN_VIDEO') {
      handleOpenVideoPlayer(details?.title, details?.youtubeId);
    } else if (actionType === 'MINIMIZE_PLAYER') {
      setIsViewerMinimized(true);
    } else if (actionType === 'FULLSCREEN_LISTENING') {
      setIsHolographicScreenOpen(true);
    } else if (actionType === 'FULLSCREEN_PLAYER') {
      setIsViewerFullscreen(true);
      setIsViewerMinimized(false);
    } else if (actionType === 'CAST_TO_TV') {
      handleCastToTV(details?.targetDevice);
    } else if (actionType === 'EMAIL_REPLY') {
      setActiveTab('automation');
    } else if (actionType === 'BOOKING_REQUEST' || actionType === 'SHOW_CONCIERGE' || actionType === 'TRAVEL_INTELLIGENCE') {
      setActiveTab('concierge');
    } else if (actionType === 'SHOW_SCHEDULE') {
      setActiveTab('schedule');
    } else if (actionType === 'SHOW_TASKS') {
      setActiveTab('automation');
    } else if (actionType === 'SHOW_WELLNESS') {
      setActiveTab('briefing');
    } else if (actionType === 'SHOW_DOCUMENTS') {
      setActiveTab('documents');
    } else if (actionType === 'SHOW_AUTOMATION') {
      setActiveTab('automation');
    } else if (actionType === 'SHOW_ENTERTAINMENT') {
      setActiveTab('entertainment');
    } else if (actionType === 'SHOW_CONTACTS') {
      setActiveTab('contacts');
    } else if (actionType === 'SHOW_ECOSYSTEM') {
      setEcosystemInitialTab('car');
      setActiveTab('ecosystem');
    } else if (actionType === 'SHOW_SECURITY') {
      setActiveTab('vault');
    } else if (actionType === 'SHOW_COMMAND_AUDIT') {
      soundEffects.playWakeChime();
      setShowCommandAuditModal(true);
    } else if (actionType === 'SMART_GLASS') {
      soundEffects.playSuccessChime();
      setHomeState((prev) => ({
        ...prev,
        privacyGlassFrosted: details?.frosted !== undefined ? details.frosted : !prev.privacyGlassFrosted,
      }));
      setEcosystemInitialTab('home');
      setActiveTab('ecosystem');
    } else if (actionType === 'SECURITY_ARM') {
      soundEffects.playSuccessChime();
      setHomeState((prev) => ({
        ...prev,
        securityArmed: details?.armed !== undefined ? details.armed : !prev.securityArmed,
      }));
      setEcosystemInitialTab('home');
      setActiveTab('ecosystem');
    } else if (actionType === 'SECURITY_CHECK') {
      soundEffects.playSuccessChime();
      setActiveTab('briefing');
    } else if (actionType === 'AIR_QUALITY_CHECK') {
      soundEffects.playSuccessChime();
      setActiveTab('briefing');
    } else if (actionType === 'AIR_PURIFIER') {
      soundEffects.playSuccessChime();
      setHomeState((prev) => ({
        ...prev,
        purifierActive: details?.active !== undefined ? details.active : true,
        purifierMode: details?.mode || prev.purifierMode,
      }));
      setActiveTab('briefing');
    } else if (actionType === 'SHOW_SMART_HOME') {
      soundEffects.playSuccessChime();
      setActiveTab('briefing');
    } else if (actionType === 'ALWAYS_ON_VOICE') {
      soundEffects.playSuccessChime();
      const next = details?.enabled !== undefined ? details.enabled : !autoListenEnabled;
      setAutoListenEnabled(next);
      setHomeState((prev) => ({ ...prev, alwaysOnVoiceControl: next }));
      setActiveTab('briefing');
    } else if (actionType === 'OPEN_CHAT_BOX') {
      soundEffects.playWakeChime();
      setIsVoiceOpen(true);
    }
  };

  const conflictsCount = events.filter((e) => e.conflict).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Sovereign Status Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand & Live Orb */}
          <div className="flex items-center gap-3.5">
            <AuraOrb
              state={orbState}
              size="sm"
              onClick={() => setIsVoiceOpen(true)}
              className="ring-1 ring-cyan-500/20 rounded-full"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  AURA <span className="text-cyan-400 font-light">EXECUTIVE</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  AUTONOMOUS v4.9
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Executive Chief of Staff</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  E2EE ENCRYPTED
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="hidden lg:flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Next: Board Strategy (10:00)</span>
            </div>
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tesla: {carState.batteryPercent}% (312 mi)</span>
            </div>
            {conflictsCount > 0 ? (
              <button
                onClick={() => setActiveTab('schedule')}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{conflictsCount} Schedule Overlap</span>
              </button>
            ) : (
              <span className="text-emerald-400 font-mono">0 Conflicts</span>
            )}
          </div>

          {/* Controls: Language & Voice Button */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              <button
                onClick={() => setLanguage('ur_slang')}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  language === 'ur_slang' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Pakistani Native Urdu Slang"
              >
                Urdu Slang
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  language === 'en' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('ur_script')}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  language === 'ur_script' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                اردو
              </button>
            </div>

            {/* Google Sign In / Profile */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                    {user.displayName?.charAt(0) || 'E'}
                  </div>
                )}
                <span className="text-xs text-slate-200 font-medium max-w-[90px] truncate hidden md:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={signOut}
                  className="text-[10px] text-slate-400 hover:text-rose-400 font-medium ml-1"
                  title="Sign Out"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
                title="Sign in with Google"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}

            {/* Media Lounge Quick Launcher / Now Playing Pill */}
            <button
              onClick={() => {
                if (isMediaFloating) {
                  setIsMediaFloating(false);
                  setIsMediaPlayerOpen(true);
                } else {
                  setIsMediaPlayerOpen(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isMediaPlaying
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="Open Executive Media & Video Lounge"
            >
              <Headphones className={`w-3.5 h-3.5 ${isMediaPlaying ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {isMediaPlaying ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-white truncate max-w-[100px]">{currentMediaTrack?.title}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </span>
                ) : (
                  'Media Lounge'
                )}
              </span>
            </button>

            {/* Autonomous Command Versatility & 35-Point Audit Lab */}
            <button
              onClick={() => {
                soundEffects.playWakeChime();
                setShowCommandAuditModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/60 rounded-xl text-xs font-semibold text-indigo-300 transition-all shadow-md shadow-indigo-950/40"
              title="Autonomous Command Versatility & Capability Audit Lab (Test 35 Executive Tasks Live)"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="hidden md:inline">Command Audit Lab</span>
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">35/35</span>
            </button>

            {/* Full-Screen Holographic Listening Matrix Trigger Button */}
            <button
              onClick={() => {
                soundEffects.playWakeChime();
                setIsHolographicScreenOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 rounded-xl text-xs font-semibold text-cyan-300 transition-all shadow-md shadow-cyan-950/40"
              title="Full-Screen Holographic Listening Mode (Shortcut: H)"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden md:inline">Holographic HUD</span>
            </button>

            {/* Voice Console Trigger Button */}
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {language === 'ur_slang' ? 'AURA Voice Se Bolain' : 'Voice Assistant'}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* Universal Search & Command Bar: Accessible across all pages */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-8 py-2.5 backdrop-blur-md sticky top-[61px] z-35 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <UniversalCommandBar
            onExecuteCommand={handleExecuteUniversalCommand}
            isMediaPlaying={isMediaPlaying}
            onOpenVideoPlayer={() => handleOpenVideoPlayer()}
            onTogglePlay={handleTogglePlay}
            onStopMedia={handleStopMedia}
            onNextMedia={handlePlayNext}
            onMinimizePlayer={() => setIsViewerMinimized((prev) => !prev)}
            onFullscreenPlayer={() => setIsViewerFullscreen((prev) => !prev)}
            onWipeSampleData={handleWipeSampleData}
            onOpenTVRemote={() => {
              setEcosystemInitialTab('tv_wifi');
              setActiveTab('ecosystem');
            }}
            onCreatePresentationPrompt={() => {
              generatePresentationOnGround('Autonomous AI Strategy & Operations');
            }}
            isSampleDataWiped={isSampleDataWiped}
          />
        </div>
      </div>

      {/* Clean Slate Mode Active Alert Banner */}
      {isSampleDataWiped && (
        <div className="bg-emerald-950/50 border-b border-emerald-800/70 px-4 sm:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-white">Clean Slate Mode Active:</span>
            <span className="text-slate-300">
              All sample data has been deleted. Tell AURA to create presentations, schedule events, or add tasks via the command bar above or by voice.
            </span>
          </div>
          <button
            onClick={handleRestoreSampleData}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Restore Demo Samples</span>
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <nav className="border-b border-slate-800 bg-slate-900/60 sticky top-[115px] z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-1 py-1.5">
          {[
            { id: 'practical', label: 'Daily Practical Hub', icon: Zap, badge: 'Flagship' },
            { id: 'briefing', label: 'Executive Pulse', icon: Sparkles },
            { id: 'audit', label: 'Operations & Work Audit', icon: Activity, badge: 'Live' },
            { id: 'schedule', label: 'Calendar & Autopilot', icon: Calendar, badge: conflictsCount > 0 ? conflictsCount : undefined },
            { id: 'contacts', label: 'Calls & WhatsApp', icon: Phone },
            { id: 'entertainment', label: 'Jokes & Stories', icon: Smile },
            { id: 'squad', label: 'Agent Squad', icon: Users },
            { id: 'memory', label: 'Auto-Learned Memory', icon: Brain },
            { id: 'automation', label: 'Tasks & Email Triage', icon: CheckSquare },
            { id: 'documents', label: 'Decks & Memos Studio', icon: Presentation },
            { id: 'concierge', label: 'Lifestyle Concierge', icon: Compass },
            { id: 'research', label: 'Web Intelligence', icon: Globe },
            { id: 'ecosystem', label: 'Car, Home & Health', icon: Car },
            { id: 'vault', label: 'Security & E2EE Vault', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors relative ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Primary Workspace View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Ambient Auto-Listen & Wake Command Persistent HUD */}
        <AmbientVoiceBar
          language={language}
          onWakeWordDetected={handleWakeWordDetected}
          onExecuteDirectAction={handleExecuteDirectVoiceAction}
          autoListenEnabled={autoListenEnabled}
          onToggleAutoListen={setAutoListenEnabled}
          isVoiceModalOpen={isVoiceOpen}
          selectedVoiceId={selectedVoiceId}
          onVoiceChange={setSelectedVoiceId}
        />
        
        {/* Tab 0: Daily Practical Assistant Hub (Tasks, Notes, WhatsApp, Real Smart TV, Media, Tools) */}
        {activeTab === 'practical' && (
          <PracticalAssistantHub
            language={language}
            activeAgent={activeAgent}
            onOpenVoiceModal={() => setIsVoiceOpen(true)}
            onExecuteVoiceDirective={(actionType, details, replyText) => {
              handleExecuteDirectVoiceAction(actionType, details, replyText);
            }}
          />
        )}

        {/* Tab 1: Executive Pulse & Morning Briefing */}
        {activeTab === 'briefing' && (
          <div className="space-y-6">
            
            {/* Executive Greeting Hero Banner */}
            <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                  <span>AUTONOMOUS COPILOT ONLINE · MORNING PULSE</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {language === 'ur_slang'
                    ? 'Salam Janab! Aaj ka scene bilkul 100% on hai.'
                    : 'Good morning, Chief. Your executive itinerary is aligned.'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {language === 'ur_slang'
                    ? 'Calendar mein 4 events hain, board deck ready hai, aur Tesla ka battery level 84% hai. Ek 0-minute meeting conflict detect hua hai jisko One-Tap AI se foran fix kiya ja sakta hai.'
                    : 'Today comprises 4 synchronized sessions, 1 consecutive conflict requiring a 15-minute buffer, 2 critical financial approvals, and pre-conditioned luxury travel for the evening.'}
                </p>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors border border-emerald-500/40"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                    <span>Explain Done & Ongoing Work</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Review Master Agenda</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('documents')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <Presentation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Open AI Presentation Deck</span>
                  </button>

                  <button
                    onClick={() => setIsVoiceOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Voice Directive</span>
                  </button>
                </div>
              </div>

              {/* Holographic Orb in Hero */}
              <div className="flex flex-col items-center justify-center shrink-0 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                <AuraOrb state={orbState} size="lg" onClick={() => setIsVoiceOpen(true)} />
                <div className="text-[11px] text-slate-400 mt-2 font-mono">TAP ORB TO TALK</div>
              </div>
            </div>

            {/* Quick Pulse Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('schedule')}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div className="text-xs text-slate-500 mb-1">Today's Sessions</div>
                <div className="text-xl font-bold text-white">{events.length} Meetings</div>
                <div className="text-[11px] text-cyan-400 mt-1">First session 10:00</div>
              </div>

              <div
                onClick={() => setActiveTab('automation')}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div className="text-xs text-slate-500 mb-1">Priority Inbox</div>
                <div className="text-xl font-bold text-white">{emails.filter(e => e.status === 'unread').length} Pending</div>
                <div className="text-[11px] text-emerald-400 mt-1">AI Drafts Ready</div>
              </div>

              <div
                onClick={() => setActiveTab('ecosystem')}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div className="text-xs text-slate-500 mb-1">Tesla Fleet & Home</div>
                <div className="text-xl font-bold text-white">{carState.batteryPercent}% / 312 mi</div>
                <div className="text-[11px] text-slate-400 mt-1">Cabin: 24°C (Pre-cool ready)</div>
              </div>

              <div
                onClick={() => setActiveTab('vault')}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div className="text-xs text-slate-500 mb-1">Sovereign Encryption</div>
                <div className="text-xl font-bold text-emerald-400 font-mono">AES-GCM 256</div>
                <div className="text-[11px] text-emerald-400 mt-1">Zero-Knowledge Cloud Sync</div>
              </div>
            </div>

            {/* Smart Home Hub Component: Live Security, Lighting & Air Quality Metrics with Quick-Toggles */}
            <SmartHomeHub
              homeState={homeState}
              onUpdateHome={(updated) => setHomeState(updated)}
              onNavigateToEcosystem={() => {
                setEcosystemInitialTab('home');
                setActiveTab('ecosystem');
              }}
              language={language}
              alwaysOnVoiceEnabled={autoListenEnabled}
              onToggleAlwaysOnVoice={(enabled) => {
                setAutoListenEnabled(enabled);
                setHomeState((prev) => ({ ...prev, alwaysOnVoiceControl: enabled }));
              }}
              onExecuteVoiceDirective={handleExecuteDirectVoiceAction}
            />

            {/* Native Urdu Slang Neural Showcase */}
            <UrduSlangShowcase
              language={language}
              onLanguageChange={setLanguage}
              onSelectPrompt={(prompt) => {
                setIsVoiceOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 2: Calendar & Scheduling Autopilot */}
        {activeTab === 'schedule' && (
          <ScheduleHub
            events={events}
            onUpdateEvents={setEvents}
            language={language}
            onVoiceTrigger={(prompt) => setIsVoiceOpen(true)}
          />
        )}

        {/* Tab 3: Autonomous Tasks & Email Triage */}
        {activeTab === 'automation' && (
          <AutomationHub
            tasks={tasks}
            emails={emails}
            onUpdateTasks={setTasks}
            onUpdateEmails={setEmails}
            language={language}
          />
        )}

        {/* Tab 4: Decks & Executive Documents Studio */}
        {activeTab === 'documents' && (
          <DocumentsHub
            language={language}
            onVoiceTrigger={(prompt) => setIsVoiceOpen(true)}
            decks={decks}
            activeDeck={activeDeck}
            onSelectDeck={(deck) => setActiveDeck(deck)}
            onSaveDeck={(deck) => {
              setDecks((prev) => {
                const updated = [deck, ...prev.filter((d) => d.id !== deck.id)];
                localStorage.setItem('aura_custom_decks', JSON.stringify(updated));
                return updated;
              });
              setActiveDeck(deck);
            }}
            onDeleteDeck={(id) => {
              setDecks((prev) => {
                const updated = prev.filter((d) => d.id !== id);
                localStorage.setItem('aura_custom_decks', JSON.stringify(updated));
                if (activeDeck?.id === id) {
                  setActiveDeck(updated[0] || null);
                }
                return updated;
              });
            }}
            onOpenFileInViewer={handleOpenFileInViewer}
            isSampleDataWiped={isSampleDataWiped}
            onCastDeckToTV={(deck) => {
              handleCastToTV(`Smart TV · ${deck.deckTitle}`);
            }}
          />
        )}

        {/* Tab 5: Lifestyle Concierge & Market Comparison */}
        {activeTab === 'concierge' && (
          <ConciergeHub
            language={language}
            emails={emails}
            carState={carState}
            onUpdateCar={setCarState}
            onAddEvent={(ev) => setEvents((prev) => [ev, ...prev])}
            onBookItem={(item) => {
              // Automatically append booked item to agenda!
              const bookedEv: ScheduleEvent = {
                id: `ev-booked-${Date.now()}`,
                title: item.name,
                timeStart: '20:00',
                timeEnd: '22:30',
                date: '2026-09-24',
                location: item.provider,
                category: 'personal',
                priority: 'medium',
                attendees: ['you@executive.ai'],
                notes: `Voucher: ${item.bookingCode || 'AURA-CONF-77'}. Rate: ${item.price}. ${item.highlights.join(', ')}`,
              };
              setEvents((prev) => [...prev, bookedEv]);
            }}
          />
        )}

        {/* Tab 6: Connected Ecosystem (Car, Home, Wearable, TV & WiFi) */}
        {activeTab === 'ecosystem' && (
          <ConnectedEcosystem
            carState={carState}
            homeState={homeState}
            wellness={wellness}
            onUpdateCar={setCarState}
            onUpdateHome={setHomeState}
            onUpdateWellness={setWellness}
            language={language}
            initialTab={ecosystemInitialTab}
          />
        )}

        {/* Tab 7: Security & E2EE Vault */}
        {activeTab === 'vault' && (
          <SecurityVault language={language} />
        )}

        {/* Tab 8: Web Intelligence & Research */}
        {activeTab === 'research' && (
          <WebResearchHub
            language={language}
            onDraftDeckFromResearch={(_topic) => {
              setActiveTab('documents');
            }}
          />
        )}

        {/* Tab: Contacts & Mobile Calling / WhatsApp */}
        {activeTab === 'contacts' && (
          <ContactsManager
            contacts={contacts}
            activeCall={activeCall}
            onInitiateCall={(c) => {
              soundEffects.playSuccessChime();
              setActiveCall({ contact: c, startTime: Date.now() });
            }}
            onEndCall={() => setActiveCall(null)}
            onAddContact={(c) => setContacts((prev) => [c, ...prev])}
          />
        )}

        {/* Tab: Entertainment & Fun Hub (Jokes, Jugtain, Dastangoi) */}
        {activeTab === 'entertainment' && (
          <EntertainmentHub
            selectedVoiceId={selectedVoiceId}
            onPlaySong={(title) => handlePlayMedia({ title })}
          />
        )}

        {/* Tab: Multi-Agent Squad */}
        {activeTab === 'squad' && (
          <AgentSquad
            activeAgentId={activeAgent.id}
            selectedVoiceId={selectedVoiceId}
            onSelectAgent={(agent) => {
              setActiveAgent(agent);
              if (agent.id === 'chaudhry_punjabi') {
                setSelectedVoiceId('chaudhry_punjabi_male');
              } else if (agent.id === 'sikandar_comms') {
                setSelectedVoiceId('farhan_lahori_male');
              } else if (agent.id === 'aura_prime' || agent.id === 'athena_research') {
                setSelectedVoiceId('aura_executive_female');
              } else {
                setSelectedVoiceId('tariq_urdu_male');
              }
            }}
          />
        )}

        {/* Tab: Autonomous Memory & User Profile */}
        {activeTab === 'memory' && (
          <UserProfileMemory
            profile={userProfile}
            onUpdateProfile={setUserProfile}
          />
        )}

        {/* Tab: Operations & Autonomous Work Audit */}
        {activeTab === 'audit' && (
          <WorkAuditMonitor
            selectedVoiceId={selectedVoiceId}
            language={language}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
            onOpenCommandAudit={() => setShowCommandAuditModal(true)}
          />
        )}

      </main>

      {/* Executive Media Lounge & Video Hub (Modal or Floating PiP) */}
      <MediaPlayer
        currentTrack={currentMediaTrack}
        isPlaying={isMediaPlaying}
        isOpen={isMediaPlayerOpen}
        isFloating={isMediaFloating}
        playlist={playlist}
        onClose={() => {
          setIsMediaPlayerOpen(false);
          setIsMediaFloating(false);
          setIsMediaPlaying(false);
        }}
        onTogglePlay={handleTogglePlay}
        onStop={handleStopMedia}
        onPlayNext={handlePlayNext}
        onPlayPrevious={handlePlayPrevious}
        onSelectTrack={handleSelectTrack}
        onAddToPlaylist={handleAddToPlaylist}
        onRemoveFromPlaylist={handleRemoveFromPlaylist}
        onSetFloating={(floating) => {
          setIsMediaFloating(floating);
          if (floating) {
            setIsMediaPlayerOpen(false);
          } else {
            setIsMediaPlayerOpen(true);
          }
        }}
      />

      {/* Universal File Viewer: Opens Presentations, Videos, Documents, Audio in Standard, Minimized PiP, or Fullscreen */}
      <UniversalFileViewer
        file={activeViewerFile}
        isOpen={isViewerOpen}
        isMinimized={isViewerMinimized}
        isFullscreen={isViewerFullscreen}
        isPlaying={isMediaPlaying}
        onClose={() => {
          setIsViewerOpen(false);
          setIsViewerMinimized(false);
          setIsViewerFullscreen(false);
        }}
        onToggleMinimize={() => setIsViewerMinimized((prev) => !prev)}
        onToggleFullscreen={() => setIsViewerFullscreen((prev) => !prev)}
        onTogglePlay={handleTogglePlay}
        onStop={handleStopMedia}
        onNext={handlePlayNext}
        onPrevious={handlePlayPrevious}
        onCastToTV={(targetDevice) => handleCastToTV(targetDevice)}
      />

      {/* Floating Quick Voice Orb Trigger */}
      <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 backdrop-blur shadow-lg">
          <span className="text-cyan-400 font-mono font-bold">Say "Hey AURA"</span>
          <span className="text-slate-500">or press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-cyan-300">V</kbd>
        </div>
        <button
          onClick={() => {
            soundEffects.playWakeChime();
            setIsVoiceOpen(true);
          }}
          title="Activate Voice Assistant (HotKey: V)"
          className="relative group p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-cyan-400 to-emerald-400 text-slate-950 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all"
        >
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
          <Mic className="w-5 h-5 font-bold" />
        </button>
      </div>

      {/* Voice Assistant Modal Overlay */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => {
          setIsVoiceOpen(false);
          setInitialVoiceCommand('');
        }}
        language={language}
        onLanguageChange={setLanguage}
        onExecuteAction={handleExecuteAction}
        initialCommand={initialVoiceCommand}
        autoListenEnabled={autoListenEnabled}
        selectedVoiceId={selectedVoiceId}
        onVoiceChange={setSelectedVoiceId}
      />

      {/* Autonomous Command Versatility & 35-Point Capability Audit Modal */}
      <CommandAuditModal
        isOpen={showCommandAuditModal}
        onClose={() => setShowCommandAuditModal(false)}
        onExecuteDirective={(actionType, details) => {
          handleExecuteAction(actionType, details);
        }}
      />

      {/* State-of-the-Art Full-Screen Holographic Listening Matrix Screen */}
      <HolographicListeningScreen
        isOpen={isHolographicScreenOpen}
        onClose={() => setIsHolographicScreenOpen(false)}
        activeAgent={activeAgent}
        onSelectAgent={(agent) => {
          setActiveAgent(agent);
          let vId = 'tariq_urdu_male';
          if (agent.id === 'chaudhry_punjabi') vId = 'chaudhry_punjabi_male';
          else if (agent.id === 'aura_prime') vId = 'aura_executive_female';
          else if (agent.id === 'sikandar_comms') vId = 'farhan_lahori_male';
          else if (agent.id === 'noor_concierge') vId = 'noor_urdu_female';
          else if (agent.id === 'marcus_governance') vId = 'marcus_uk_male';
          setSelectedVoiceId(vId);
        }}
        language={language}
        onExecuteVoiceDirective={(actionType, details, replyText) => {
          handleExecuteDirectVoiceAction(actionType, details, replyText);
        }}
      />

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-4 px-4 sm:px-8 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AURA Sovereign AI Executive Assistant · AES-GCM 256-Bit Zero-Knowledge Governance
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Pakistani Native Urdu Slang Engine Active</span>
            <span aria-hidden="true">·</span>
            <span>Multi-LLM Gemini 3.8 Flash Core</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
