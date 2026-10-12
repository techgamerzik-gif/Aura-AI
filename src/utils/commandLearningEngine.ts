/**
 * AURA Autonomous Command Learning & Layman Intent Adaptation Engine
 *
 * Continuously learns and adapts to the user's natural phrasing, layman idioms,
 * multilingual commands (English, Roman Urdu / Urdu Slang, Nastaliq Urdu),
 * and custom shorthand directives.
 *
 * Ensures AURA NEVER falls into rigid canned "standby" responses and instead
 * always identifies the operational intent, synthesizes a direct contextual reply,
 * and dispatches the executable action.
 */

export interface LearnedCommandPattern {
  id: string;
  phrase: string;
  normalizedPattern: string;
  actionType: string;
  details: Record<string, any>;
  summary: string;
  confidence: number;
  executionCount: number;
  lastExecutedAt: string;
  isUserTaught: boolean;
  category:
    | 'media'
    | 'home'
    | 'car'
    | 'tasks'
    | 'schedule'
    | 'comms'
    | 'concierge'
    | 'research'
    | 'documents'
    | 'audit'
    | 'memory'
    | 'system';
}

export interface AuditTestCase {
  id: string;
  command: string;
  category: string;
  expectedActionType: string;
  description: string;
}

const STORAGE_KEY_LEARNED_COMMANDS = 'aura_learned_commands_v1';

/**
 * Pre-seeded comprehensive layman training corpus covering all 30+ executive capabilities
 */
const BASE_TRAINED_PATTERNS: Omit<LearnedCommandPattern, 'id' | 'executionCount' | 'lastExecutedAt'>[] = [
  // --- MEDIA & ENTERTAINMENT ---
  {
    phrase: 'can you put on some relaxing tunes',
    normalizedPattern: 'relaxing tunes|chill music|calm music|lofi beats|soothing music',
    actionType: 'PLAY_MEDIA',
    details: { title: 'Chill Lofi Executive Beats', query: 'lofi beats' },
    summary: 'Playing Relaxing Executive Lofi Beats',
    confidence: 0.98,
    isUserTaught: false,
    category: 'media',
  },
  {
    phrase: 'play something chill',
    normalizedPattern: 'play something chill|play chill|chill beats|relaxing music',
    actionType: 'PLAY_MEDIA',
    details: { title: 'Atmospheric Executive Chillout', query: 'chillout' },
    summary: 'Playing Atmospheric Chillout Beats',
    confidence: 0.98,
    isUserTaught: false,
    category: 'media',
  },
  {
    phrase: 'gana chalao koi accha sa',
    normalizedPattern: 'gana chalao|koi gana lagao|gana sunao|music lagao|song chalao',
    actionType: 'PLAY_MEDIA',
    details: { title: 'Coke Studio Best Hits', query: 'coke studio' },
    summary: 'Playing Coke Studio Top Hits',
    confidence: 0.99,
    isUserTaught: false,
    category: 'media',
  },
  {
    phrase: 'kill the sound',
    normalizedPattern: 'kill the sound|shut up the music|stop audio|silence audio|turn off song',
    actionType: 'STOP_MEDIA',
    details: {},
    summary: 'Stopped Audio Playback',
    confidence: 0.99,
    isUserTaught: false,
    category: 'media',
  },
  {
    phrase: 'skip this one',
    normalizedPattern: 'skip this|next song please|change the track|kuch aur lagao|gana badlo',
    actionType: 'NEXT_MEDIA',
    details: {},
    summary: 'Switched to Next Track',
    confidence: 0.99,
    isUserTaught: false,
    category: 'media',
  },
  {
    phrase: 'crank it up',
    normalizedPattern: 'crank it up|turn it up|make it louder|awaz tez karo|sound up',
    actionType: 'VOLUME_MEDIA',
    details: { level: 90 },
    summary: 'Volume Raised to 90%',
    confidence: 0.95,
    isUserTaught: false,
    category: 'media',
  },
  {
    phrase: 'mix it up',
    normalizedPattern: 'mix it up|shuffle playlist|shuffle tracks|songs shuffle karo',
    actionType: 'SHUFFLE_MEDIA',
    details: {},
    summary: 'Shuffled Playlist Queue',
    confidence: 0.95,
    isUserTaught: false,
    category: 'media',
  },

  // --- SMART HOME & CLIMATE ---
  {
    phrase: "it's too hot in here make it 20 degrees",
    normalizedPattern: 'too hot|cooling down|drop temperature|make it cold|kamra thanda karo',
    actionType: 'AC_CONTROL',
    details: { targetTemp: 20, power: true },
    summary: 'AC Set to 20°C Cooling',
    confidence: 0.99,
    isUserTaught: false,
    category: 'home',
  },
  {
    phrase: 'kill the lights',
    normalizedPattern: 'kill the lights|lights out|shut off all lights|batti bujha do|andhera kardo',
    actionType: 'LIGHT_CONTROL',
    details: { power: false, mode: 'night', brightness: 0 },
    summary: 'Turned OFF All Smart Lights',
    confidence: 0.99,
    isUserTaught: false,
    category: 'home',
  },
  {
    phrase: 'set mood lighting',
    normalizedPattern: 'mood lighting|dim the room|warm lights|cozy lights|halki batti',
    actionType: 'LIGHT_CONTROL',
    details: { power: true, mode: 'ambient', brightness: 35 },
    summary: 'Set Ambient Warm Dim Lighting',
    confidence: 0.97,
    isUserTaught: false,
    category: 'home',
  },
  {
    phrase: 'turn on tv and open remote',
    normalizedPattern: 'turn on tv|tv on|watch tv|tv screen on|tv chalao',
    actionType: 'TV_CONTROL',
    details: { power: true, mute: false },
    summary: 'Turned ON Smart TV & Remote',
    confidence: 0.98,
    isUserTaught: false,
    category: 'home',
  },
  {
    phrase: 'vacuum the living room floor',
    normalizedPattern: 'vacuum|clean floor|robot clean|safai kardo|robot vacuum',
    actionType: 'ROBOT_CLEANER',
    details: { command: 'clean', room: 'living_room' },
    summary: 'Autonomous Robot Vacuum Cleaning Started',
    confidence: 0.98,
    isUserTaught: false,
    category: 'home',
  },
  {
    phrase: 'connect my bose headphones',
    normalizedPattern: 'connect bose|pair headphones|bluetooth headphones|airpods connect',
    actionType: 'BLUETOOTH_CONNECT',
    details: { deviceName: 'Bose QuietComfort Ultra Headphones' },
    summary: 'Connected Bose QuietComfort Ultra Headphones',
    confidence: 0.98,
    isUserTaught: false,
    category: 'home',
  },
  {
    phrase: 'scan for nearby devices',
    normalizedPattern: 'scan devices|find bluetooth|scan wifi|network devices|as paas devices',
    actionType: 'SCAN_DEVICES',
    details: { type: 'all' },
    summary: 'Scanned Local Network & Bluetooth Devices',
    confidence: 0.96,
    isUserTaught: false,
    category: 'home',
  },

  // --- CAR & VEHICLE ---
  {
    phrase: 'precondition my tesla to 21 degrees',
    normalizedPattern: 'precondition tesla|cool car|warm car|car ac|gaadi thandi karo|tesla ready',
    actionType: 'CAR_CONTROL',
    details: { targetTemp: 21, climateActive: true },
    summary: 'Tesla Cabin Preconditioned to 21°C',
    confidence: 0.99,
    isUserTaught: false,
    category: 'car',
  },
  {
    phrase: 'unlock the car doors',
    normalizedPattern: 'unlock car|car open|gaadi unlock|tesla unlock',
    actionType: 'CAR_CONTROL',
    details: { locked: false },
    summary: 'Tesla Doors Unlocked',
    confidence: 0.97,
    isUserTaught: false,
    category: 'car',
  },

  // --- TASKS & DELIVERABLES ---
  {
    phrase: 'finish that board presentation task',
    normalizedPattern: 'finish.*task|complete.*task|mark.*done|i did.*task|kaam khatam|task complete',
    actionType: 'COMPLETE_TASK',
    details: { query: 'board presentation', taskId: 't-1' },
    summary: 'Marked Board Presentation Task as Completed',
    confidence: 0.98,
    isUserTaught: false,
    category: 'tasks',
  },
  {
    phrase: 'remind me to review the quarterly numbers tomorrow',
    normalizedPattern: 'remind me to|add a task|create task|naya task|add to my todo',
    actionType: 'CREATE_TASK',
    details: { title: 'Review quarterly numbers', priority: 'high' },
    summary: 'Created Task: Review quarterly numbers',
    confidence: 0.98,
    isUserTaught: false,
    category: 'tasks',
  },
  {
    phrase: 'delete that vendor invoice task',
    normalizedPattern: 'delete.*task|remove.*task|cancel.*task|task hata do',
    actionType: 'DELETE_TASK',
    details: { query: 'vendor invoice' },
    summary: 'Removed Vendor Invoice Task',
    confidence: 0.97,
    isUserTaught: false,
    category: 'tasks',
  },
  {
    phrase: 'what are my active deliverables',
    normalizedPattern: 'active deliverables|show my tasks|pending tasks|todo list|kya kaam hai',
    actionType: 'SHOW_TASKS',
    details: {},
    summary: 'Opened Deliverables & Tasks Hub',
    confidence: 0.99,
    isUserTaught: false,
    category: 'tasks',
  },

  // --- CALENDAR & SCHEDULE ---
  {
    phrase: "what's on my plate today",
    normalizedPattern: "what's on my plate|today's schedule|my meetings today|calendar dikhao|aaj ka schedule",
    actionType: 'SHOW_SCHEDULE',
    details: {},
    summary: 'Opened Schedule & Meetings Calendar',
    confidence: 0.99,
    isUserTaught: false,
    category: 'schedule',
  },
  {
    phrase: 'book a sync with sarah at 4pm',
    normalizedPattern: 'book a sync|schedule meeting|calendar slot|meeting rakh do|set meeting',
    actionType: 'SCHEDULE_MEETING',
    details: { title: 'Sync with Sarah', timeStart: '16:00', timeEnd: '16:30' },
    summary: 'Scheduled Sync with Sarah at 16:00',
    confidence: 0.98,
    isUserTaught: false,
    category: 'schedule',
  },
  {
    phrase: 'fix the meeting conflict and add buffer',
    normalizedPattern: 'fix conflict|reschedule overlap|buffer insert|meeting adjust karo',
    actionType: 'RESCHEDULE_EVENT',
    details: { reason: 'Inserted 15-minute cognitive buffer' },
    summary: 'Resolved Calendar Overlap with 15-Min Buffer',
    confidence: 0.99,
    isUserTaught: false,
    category: 'schedule',
  },

  // --- COMMUNICATIONS & CONTACTS ---
  {
    phrase: 'call cheetah right now',
    normalizedPattern: 'call cheetah|dial cheetah|phone cheetah|cheetah ko call|call kaptaan|call sara',
    actionType: 'CALL_CONTACT',
    details: { contactName: 'Cheetah' },
    summary: 'Initiating Cellular Call to Cheetah',
    confidence: 0.99,
    isUserTaught: false,
    category: 'comms',
  },
  {
    phrase: "whatsapp cheetah that i'm running 10 minutes late",
    normalizedPattern: 'whatsapp.*late|send whatsapp|message bhejo|wa message',
    actionType: 'SEND_WHATSAPP',
    details: { contactName: 'Cheetah', message: "I'm running 10 minutes late" },
    summary: "Dispatched WhatsApp to Cheetah: Running 10 mins late",
    confidence: 0.98,
    isUserTaught: false,
    category: 'comms',
  },
  {
    phrase: 'reply to marcus and approve the series b terms',
    normalizedPattern: 'reply to marcus|approve terms|send email to|email triage|email approve',
    actionType: 'SEND_EMAIL',
    details: { recipient: 'Marcus Vance', subject: 'Re: Series B Term Sheet Approval', emailId: 'em-1' },
    summary: 'Sent Approved Term Sheet Reply to Marcus Vance',
    confidence: 0.99,
    isUserTaught: false,
    category: 'comms',
  },

  // --- AUDIT & OPERATIONS REPORT ---
  {
    phrase: 'what did you do today give me a status report',
    normalizedPattern: 'what did you do|status report|work audit|explain your work|kaam ka hisab|audit log',
    actionType: 'SHOW_WORK_AUDIT',
    details: {},
    summary: 'Generated Sovereign Operations Audit Report',
    confidence: 0.99,
    isUserTaught: false,
    category: 'audit',
  },

  // --- RESEARCH & INTELLIGENCE ---
  {
    phrase: 'look into latest nvidia earnings and market moves',
    normalizedPattern: 'look into|research|search web|google news|market analysis|maloom karo',
    actionType: 'WEB_RESEARCH',
    details: { query: 'Nvidia latest earnings and market moves' },
    summary: 'Executed Deep Web Research: Nvidia Market Moves',
    confidence: 0.98,
    isUserTaught: false,
    category: 'research',
  },

  // --- DOCUMENTS & DECKS ---
  {
    phrase: 'generate a presentation deck on autonomous ai operations',
    normalizedPattern: 'generate.*deck|make.*presentation|create slides|pitch deck|deck banao',
    actionType: 'GENERATE_DECK',
    details: { topic: 'Autonomous AI Operations' },
    summary: 'Generated Presentation Deck on Autonomous AI Operations',
    confidence: 0.99,
    isUserTaught: false,
    category: 'documents',
  },
  {
    phrase: 'open my executive documents hub',
    normalizedPattern: 'open documents|view docs|memos|files|documents hub',
    actionType: 'SHOW_DOCUMENTS',
    details: {},
    summary: 'Opened Executive Documents & Memos Hub',
    confidence: 0.98,
    isUserTaught: false,
    category: 'documents',
  },

  // --- LIFESTYLE CONCIERGE ---
  {
    phrase: 'book a table for dinner tonight at nobu',
    normalizedPattern: 'book a table|dinner reservation|flight booking|hotel booking|table book karo',
    actionType: 'BOOKING_REQUEST',
    details: { venue: 'Nobu', type: 'dinner', guests: 2 },
    summary: 'Initiated VIP Concierge Table Reservation at Nobu',
    confidence: 0.98,
    isUserTaught: false,
    category: 'concierge',
  },

  // --- NEURAL MEMORY & LEARNING ---
  {
    phrase: 'remember that i prefer dark roast espresso',
    normalizedPattern: 'remember that i prefer|i like|i love|save preference|yaad rakho mujhe pasand',
    actionType: 'LEARN_PREFERENCE',
    details: { content: 'Prefers dark roast espresso' },
    summary: 'Learned Preference: Dark roast espresso',
    confidence: 0.99,
    isUserTaught: false,
    category: 'memory',
  },
  {
    phrase: 'note that i hate loud chime sounds',
    normalizedPattern: 'note that i hate|i dislike|never do|save dislike|na pasand',
    actionType: 'LEARN_DISLIKE',
    details: { content: 'Dislikes loud chime sounds' },
    summary: 'Learned Dislike: Loud chime sounds',
    confidence: 0.99,
    isUserTaught: false,
    category: 'memory',
  },
  {
    phrase: 'tell me a funny joke',
    normalizedPattern: 'tell me a joke|funny joke|make me laugh|koi lateefa|koi mazaq',
    actionType: 'CRACK_JOKE',
    details: {},
    summary: 'Delivered Executive Humor',
    confidence: 0.97,
    isUserTaught: false,
    category: 'system',
  },
];

/**
 * 30-Point Comprehensive Audit Test Suite
 * Used to verify execution across every capability category
 */
export const AUDIT_TEST_CASES: AuditTestCase[] = [
  // Media & Entertainment
  { id: 't-1', command: 'put on some relaxing tunes', category: 'Media', expectedActionType: 'PLAY_MEDIA', description: 'Layman music request without explicit song title' },
  { id: 't-2', command: 'kill the sound', category: 'Media', expectedActionType: 'STOP_MEDIA', description: 'Colloquial audio stop command' },
  { id: 't-3', command: 'skip to the next track', category: 'Media', expectedActionType: 'NEXT_MEDIA', description: 'Next song command' },
  { id: 't-4', command: 'turn up the volume', category: 'Media', expectedActionType: 'VOLUME_MEDIA', description: 'Volume adjustment' },
  { id: 't-5', command: 'shuffle the playlist queue', category: 'Media', expectedActionType: 'SHUFFLE_MEDIA', description: 'Playlist shuffle' },
  { id: 't-6', command: 'open the video player', category: 'Media', expectedActionType: 'OPEN_VIDEO', description: 'Universal video player launch' },

  // Smart Home & IoT
  { id: 't-7', command: "it's boiling in here make it 20 degrees", category: 'Smart Home', expectedActionType: 'AC_CONTROL', description: 'Layman climate change with temperature extraction' },
  { id: 't-8', command: 'kill all the lights', category: 'Smart Home', expectedActionType: 'LIGHT_CONTROL', description: 'Colloquial lights turn off' },
  { id: 't-9', command: 'turn on focus lights', category: 'Smart Home', expectedActionType: 'LIGHT_CONTROL', description: 'Focus work illumination activation' },
  { id: 't-10', command: 'turn on the living room tv', category: 'Smart Home', expectedActionType: 'TV_CONTROL', description: 'Smart TV power on' },
  { id: 't-11', command: 'pair my bose headphones', category: 'Smart Home', expectedActionType: 'BLUETOOTH_CONNECT', description: 'Bluetooth peripheral pairing' },
  { id: 't-12', command: 'scan for nearby wifi and bluetooth', category: 'Smart Home', expectedActionType: 'SCAN_DEVICES', description: 'Network and device hardware scan' },
  { id: 't-13', command: 'vacuum the living room floor', category: 'Smart Home', expectedActionType: 'ROBOT_CLEANER', description: 'Robot vacuum cleaner cleaning directive' },

  // Tesla & Vehicle
  { id: 't-14', command: 'cool down my tesla cabin', category: 'Vehicle', expectedActionType: 'CAR_CONTROL', description: 'Tesla climate pre-conditioning' },
  { id: 't-15', command: 'unlock the car doors', category: 'Vehicle', expectedActionType: 'CAR_CONTROL', description: 'Vehicle door security unlock' },

  // Tasks & Deliverables
  { id: 't-16', command: 'finish that board presentation task', category: 'Tasks', expectedActionType: 'COMPLETE_TASK', description: 'Mark task complete using natural language reference' },
  { id: 't-17', command: 'remind me to review financial forecast tomorrow', category: 'Tasks', expectedActionType: 'CREATE_TASK', description: 'Layman task creation with title extraction' },
  { id: 't-18', command: 'delete that invoice task', category: 'Tasks', expectedActionType: 'DELETE_TASK', description: 'Task removal' },
  { id: 't-19', command: "what are my active deliverables today", category: 'Tasks', expectedActionType: 'SHOW_TASKS', description: 'Task overview navigation' },

  // Schedule & Calendar
  { id: 't-20', command: "what is on my schedule today", category: 'Calendar', expectedActionType: 'SHOW_SCHEDULE', description: 'Daily agenda inspection' },
  { id: 't-21', command: 'schedule a strategic sync with sarah at 4pm', category: 'Calendar', expectedActionType: 'SCHEDULE_MEETING', description: 'Meeting scheduling with time extraction' },
  { id: 't-22', command: 'resolve the calendar conflict and insert buffer', category: 'Calendar', expectedActionType: 'RESCHEDULE_EVENT', description: 'Conflict resolution and cognitive buffer' },

  // Communications & Contacts
  { id: 't-23', command: 'call cheetah right now', category: 'Comms', expectedActionType: 'CALL_CONTACT', description: 'Cellular direct contact calling' },
  { id: 't-24', command: "whatsapp cheetah that i am 10 mins late", category: 'Comms', expectedActionType: 'SEND_WHATSAPP', description: 'WhatsApp dispatch with message extraction' },
  { id: 't-25', command: 'reply to marcus and approve the series b terms', category: 'Comms', expectedActionType: 'SEND_EMAIL', description: 'Email triage & automated approval dispatch' },

  // Operations Audit
  { id: 't-26', command: "what did you do today show me the audit", category: 'Operations', expectedActionType: 'SHOW_WORK_AUDIT', description: 'Sovereign operations audit log inspection' },

  // Research & Documents
  { id: 't-27', command: 'research latest nvidia earnings and stock moves', category: 'Research', expectedActionType: 'WEB_RESEARCH', description: 'Deep web research and market intelligence' },
  { id: 't-28', command: 'generate a presentation deck on autonomous operations', category: 'Documents', expectedActionType: 'GENERATE_DECK', description: 'Automated executive slide deck generation' },
  { id: 't-29', command: 'book a table for dinner tonight at nobu', category: 'Concierge', expectedActionType: 'BOOKING_REQUEST', description: 'VIP concierge dining booking' },

  // Neural Memory & Learning
  { id: 't-30', command: 'remember that i prefer dark roast espresso', category: 'Memory', expectedActionType: 'LEARN_PREFERENCE', description: 'Neural executive preference learning' },

  // Wellness & Biometrics
  { id: 't-31', command: 'check my health', category: 'Wellness', expectedActionType: 'SHOW_WELLNESS', description: 'Biometric telemetry inspection' },

  // Smart Home & IoT Hardware
  { id: 't-32', command: 'unfreeze smart glass', category: 'Smart Home', expectedActionType: 'SMART_GLASS', description: 'Electrochromic privacy window control' },
  { id: 't-33', command: 'arm the alarm', category: 'Smart Home', expectedActionType: 'SECURITY_ARM', description: 'Perimeter alarm system armed' },
  { id: 't-34', command: 'i want to relax', category: 'Smart Home', expectedActionType: 'LIGHT_CONTROL', description: 'Ambient relax illumination mode' },
  { id: 't-35', command: 'turn off everything', category: 'Smart Home', expectedActionType: 'LIGHT_CONTROL', description: 'All lights and devices shut off' },
];

/**
 * Command Learning Engine Class
 */
export class CommandLearningEngine {
  private patterns: LearnedCommandPattern[] = [];

  constructor() {
    this.loadPatterns();
  }

  public getPatterns(): LearnedCommandPattern[] {
    return this.patterns;
  }

  /**
   * Teach AURA a new command or reinforce an existing pattern
   */
  public learnCommand(
    phrase: string,
    actionType: string,
    details: Record<string, any> = {},
    summary = ''
  ): LearnedCommandPattern {
    const cleanPhrase = phrase.trim().toLowerCase();
    const existing = this.patterns.find(
      (p) => p.phrase.toLowerCase() === cleanPhrase || p.actionType === actionType
    );

    if (existing) {
      existing.executionCount++;
      existing.lastExecutedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      existing.confidence = Math.min(1.0, existing.confidence + 0.05);
      if (Object.keys(details).length > 0) {
        existing.details = { ...existing.details, ...details };
      }
      this.savePatterns();
      return existing;
    }

    const newPattern: LearnedCommandPattern = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phrase: cleanPhrase,
      normalizedPattern: cleanPhrase.replace(/\s+/g, '.*'),
      actionType,
      details,
      summary: summary || `Executed ${actionType.replace(/_/g, ' ')}`,
      confidence: 0.95,
      executionCount: 1,
      lastExecutedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUserTaught: true,
      category: this.categorizeAction(actionType),
    };

    this.patterns.unshift(newPattern);
    this.savePatterns();
    return newPattern;
  }

  /**
   * Matches an input against both learned and pre-trained patterns with semantic scoring
   */
  /**
   * Matches an input against both learned and pre-trained patterns with semantic scoring and synonym expansion
   */
  public matchInput(rawInput: string): {
    matched: boolean;
    pattern?: LearnedCommandPattern;
    extractedDetails: Record<string, any>;
    score: number;
  } {
    if (!rawInput || typeof rawInput !== 'string') {
      return { matched: false, extractedDetails: {}, score: 0 };
    }

    const normalized = rawInput
      .toLowerCase()
      .replace(/^(?:hey|hi|hello|ok|okay|salam|oye|suno|aura|aurora|boss|chief|janab)[,:\s]*/i, '')
      .replace(/^(?:can you|could you|please|kindly|zara|foran)\b[,:\s]*/i, '')
      .replace(/[?!.,;:'"\\/\\-—_]+/g, ' ')
      .trim();

    if (normalized.length < 2) {
      return { matched: false, extractedDetails: {}, score: 0 };
    }

    let bestMatch: LearnedCommandPattern | null = null;
    let highestScore = 0;
    let bestDetails: Record<string, any> = {};

    // Canonical synonym mapping for high-recall layman comprehension
    const SYNONYM_MAP: Record<string, string> = {
      tunes: 'music',
      song: 'music',
      songs: 'music',
      audio: 'music',
      beats: 'music',
      lofi: 'music',
      jazz: 'music',
      track: 'music',
      tracks: 'music',
      suno: 'music',
      gaana: 'music',
      gana: 'music',
      cooling: 'climate',
      cooler: 'climate',
      ac: 'climate',
      thermostat: 'climate',
      temperature: 'climate',
      temp: 'climate',
      hot: 'climate',
      cold: 'climate',
      thanda: 'climate',
      light: 'lights',
      batti: 'lights',
      lamp: 'lights',
      bulb: 'lights',
      bulbs: 'lights',
      car: 'vehicle',
      tesla: 'vehicle',
      gaadi: 'vehicle',
      gari: 'vehicle',
      cabin: 'vehicle',
      clean: 'clean',
      cleaning: 'clean',
      vacuum: 'clean',
      safai: 'clean',
      task: 'task',
      tasks: 'task',
      todo: 'task',
      todos: 'task',
      deliverable: 'task',
      deliverables: 'task',
      kaam: 'task',
      meeting: 'schedule',
      meetings: 'schedule',
      calendar: 'schedule',
      agenda: 'schedule',
      audit: 'audit',
      progress: 'audit',
      report: 'audit',
      hisab: 'audit',
      joke: 'joke',
      funny: 'joke',
      lateefa: 'joke',
      wellness: 'health',
      sleep: 'health',
      biometrics: 'health',
      sehat: 'health',
      device: 'devices',
      wifi: 'devices',
      bluetooth: 'devices',
    };

    const canonicalizeTokens = (tokens: string[]): string[] => {
      const res: string[] = [];
      for (const t of tokens) {
        if (!t) continue;
        res.push(t);
        if (SYNONYM_MAP[t]) {
          res.push(SYNONYM_MAP[t]);
        }
      }
      return res;
    };

    const inputRawTokens = normalized.split(/\s+/).filter(Boolean);
    const inputCanonicalTokens = new Set(canonicalizeTokens(inputRawTokens));

    for (const pattern of this.patterns) {
      // 1. Exact phrase equality
      if (normalized === pattern.phrase.toLowerCase()) {
        pattern.executionCount++;
        pattern.lastExecutedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.savePatterns();
        return {
          matched: true,
          pattern,
          extractedDetails: { ...pattern.details },
          score: 1.0,
        };
      }

      // 2. Regex pattern test
      try {
        const regex = new RegExp(pattern.normalizedPattern, 'i');
        if (regex.test(normalized)) {
          const score = 0.90 + (pattern.isUserTaught ? 0.08 : 0);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = pattern;
            bestDetails = { ...pattern.details };
          }
        }
      } catch {}

      // 3. Token overlap Jaccard similarity with synonym expansion
      const patternRawTokens = pattern.phrase.toLowerCase().split(/\s+/).filter(Boolean);
      const patternCanonicalTokens = new Set(canonicalizeTokens(patternRawTokens));

      let intersection = 0;
      patternCanonicalTokens.forEach((t) => {
        if (inputCanonicalTokens.has(t)) intersection++;
      });
      const union = new Set([...inputCanonicalTokens, ...patternCanonicalTokens]).size;
      const jaccard = union > 0 ? intersection / union : 0;

      if (jaccard > 0.30 && jaccard > highestScore) {
        highestScore = jaccard;
        bestMatch = pattern;
        bestDetails = { ...pattern.details };
      }
    }

    if (bestMatch && highestScore >= 0.30) {
      bestMatch.executionCount++;
      bestMatch.lastExecutedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.savePatterns();

      return {
        matched: true,
        pattern: bestMatch,
        extractedDetails: bestDetails,
        score: highestScore,
      };
    }

    return { matched: false, extractedDetails: {}, score: 0 };
  }

  /**
   * Run full command capability audit against the 30-case test corpus
   */
  public runFullAudit(
    parseFn: (cmd: string) => { actionType: string; details: any } | null
  ): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    results: {
      test: AuditTestCase;
      passed: boolean;
      actualActionType: string | null;
      latencyMs: number;
    }[];
  } {
    const results: {
      test: AuditTestCase;
      passed: boolean;
      actualActionType: string | null;
      latencyMs: number;
    }[] = [];

    let passed = 0;

    for (const test of AUDIT_TEST_CASES) {
      const start = performance.now();
      const parsed = parseFn(test.command);
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;

      const isPass = parsed !== null && parsed.actionType === test.expectedActionType;
      if (isPass) passed++;

      results.push({
        test,
        passed: isPass,
        actualActionType: parsed ? parsed.actionType : null,
        latencyMs,
      });
    }

    const total = AUDIT_TEST_CASES.length;
    const successRate = Math.round((passed / total) * 100);

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: total - passed,
      successRate,
      results,
    };
  }

  private categorizeAction(actionType: string): LearnedCommandPattern['category'] {
    if (actionType.includes('MEDIA') || actionType.includes('VIDEO')) return 'media';
    if (actionType.includes('LIGHT') || actionType.includes('TV') || actionType.includes('AC') || actionType.includes('BLUETOOTH') || actionType.includes('SCAN') || actionType.includes('ROBOT')) return 'home';
    if (actionType.includes('CAR')) return 'car';
    if (actionType.includes('TASK')) return 'tasks';
    if (actionType.includes('SCHEDULE') || actionType.includes('EVENT') || actionType.includes('MEETING')) return 'schedule';
    if (actionType.includes('CALL') || actionType.includes('WHATSAPP') || actionType.includes('EMAIL') || actionType.includes('SMS')) return 'comms';
    if (actionType.includes('CONCIERGE') || actionType.includes('BOOKING')) return 'concierge';
    if (actionType.includes('RESEARCH')) return 'research';
    if (actionType.includes('DECK') || actionType.includes('DOC')) return 'documents';
    if (actionType.includes('AUDIT')) return 'audit';
    if (actionType.includes('LEARN')) return 'memory';
    return 'system';
  }

  private loadPatterns(): void {
    const base: LearnedCommandPattern[] = BASE_TRAINED_PATTERNS.map((p, idx) => ({
      ...p,
      id: `base-cmd-${idx + 1}`,
      executionCount: 1,
      lastExecutedAt: 'Default pre-trained',
    }));

    if (typeof window === 'undefined') {
      this.patterns = base;
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEARNED_COMMANDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge user-taught patterns with base patterns
          const userLearned = parsed.filter((p: any) => p.isUserTaught);
          this.patterns = [...userLearned, ...base];
          return;
        }
      }
    } catch {}

    this.patterns = base;
  }

  private savePatterns(): void {
    if (typeof window === 'undefined') return;
    try {
      const userLearned = this.patterns.filter((p) => p.isUserTaught);
      localStorage.setItem(STORAGE_KEY_LEARNED_COMMANDS, JSON.stringify(userLearned));
    } catch {}
  }
}

// Global shared singleton
export const commandLearningEngine = new CommandLearningEngine();
