export type LanguageMode = 'en' | 'ur_slang' | 'ur_script' | 'ar' | 'fr';

export interface ScheduleEvent {
  id: string;
  title: string;
  timeStart: string; // e.g. "09:00"
  timeEnd: string;   // e.g. "10:00"
  date: string;      // YYYY-MM-DD
  location: string;
  category: 'board' | 'client' | 'internal' | 'personal' | 'travel' | 'buffer';
  priority: 'high' | 'medium' | 'low';
  attendees: string[];
  conflict?: boolean;
  conflictReason?: string;
  notes?: string;
  hasBuffer?: boolean;
  isBufferSlot?: boolean;
  cognitiveResetApplied?: boolean;
}

export interface SubTaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  priority: 'critical' | 'high' | 'medium' | 'normal';
  status: 'pending' | 'in_progress' | 'automated_completed' | 'blocked';
  automatedAction?: string;
  category: 'finance' | 'legal' | 'operations' | 'personal' | 'general' | 'Home & Bills' | 'Work' | 'Health' | 'Shopping' | string;
  parentTaskId?: string; // ID of the parent prerequisite task
  dependsOn?: string[]; // Array of parent task IDs that must be completed first
  isBlocked?: boolean; // Explicit or computed flag indicating task is currently blocked
  blockedReason?: string; // Human-readable explanation of why the task is blocked
  subtasks?: SubTaskItem[]; // Granular sub-tasks for complex initiatives
}

export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  receivedTime: string;
  priority: 'urgent' | 'normal' | 'low';
  status: 'unread' | 'replied' | 'delegated';
}

export interface SlideItem {
  slideNumber: number;
  title: string;
  subtitle: string;
  bullets: string[];
  takeaway: string;
  notes: string;
}

export interface PresentationDeck {
  id: string;
  deckTitle: string;
  audience: string;
  slides: SlideItem[];
  createdAt: string;
}

export interface ConciergeOption {
  tier: 'Cheapest Option' | 'Best Value (Recommended)' | 'Executive VIP Luxury';
  name: string;
  provider: string;
  price: string;
  originalPrice?: string;
  rating: number;
  highlights: string[];
  recommendedFor: string;
  bookingCode?: string;
}

export interface ConciergeResult {
  category: string;
  query: string;
  summary: string;
  options: ConciergeOption[];
}

export interface CarTelemetry {
  model: string;
  batteryPercent: number;
  rangeMiles: number;
  cabinTempCelsius: number;
  targetTempCelsius: number;
  climateActive: boolean;
  locked: boolean;
  sentryMode: boolean;
  valetMode: boolean;
  location: string;
}

export interface HomeAutomationState {
  officeLightingMode: 'focus' | 'ambient' | 'conference' | 'night';
  thermostatCelsius: number;
  airQualityIndex: number;
  privacyGlassFrosted: boolean;
  securityArmed: boolean;
  robotCleanerStatus: 'docked' | 'cleaning' | 'standby';
  lightsPower?: boolean;
  purifierActive?: boolean;
  purifierMode?: 'auto' | 'turbo' | 'eco';
  pm25?: number;
  humidityPercent?: number;
  alwaysOnVoiceControl?: boolean;
}

export interface WellnessMetrics {
  sleepScore: number;
  hrvMs: number;
  waterIntakeLiters: number;
  targetWaterLiters: number;
  screenTimeHours: number;
  stressLevel: 'low' | 'moderate' | 'elevated';
  lastBreakMinutesAgo: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  languageUsed?: LanguageMode;
  actionExecuted?: {
    actionType: string;
    details: any;
  };
}

export interface EncryptedVaultItem {
  id: string;
  title: string;
  category: 'credentials' | 'board_notes' | 'banking' | 'contract';
  ciphertext: string;
  iv: string;
  updatedAt: string;
  plaintextCache?: string; // only in memory while unlocked
}

export interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  category: 'coke_studio' | 'lofi' | 'classical' | 'talks' | 'custom';
  mediaType: 'song' | 'video' | 'podcast' | 'stream';
  youtubeId?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
}

export interface WebCitation {
  title: string;
  url: string;
  source: string;
  snippet?: string;
}

export interface WebResearchResult {
  query: string;
  urlAnalyzed?: string;
  timestamp: string;
  summary: string;
  keyFindings: {
    point: string;
    impact: 'High Strategic Impact' | 'Medium Priority' | 'Operational Note';
  }[];
  marketAnalysis: string;
  actionableTakeaways: string[];
  citations: WebCitation[];
}

export interface Contact {
  id: string;
  name: string;
  nickname?: string;
  role: string;
  phone: string;
  whatsappNumber: string;
  email?: string;
  avatar?: string;
  favorite?: boolean;
  notes?: string;
}

export interface MemoryFact {
  id: string;
  type: 'like' | 'dislike' | 'vocabulary' | 'habit';
  term?: string;
  definition?: string;
  content: string;
  learnedAt: string;
  confidence: number;
}

export interface UserPersonalProfile {
  name: string;
  title: string;
  likes: string[];
  dislikes: string[];
  customVocabulary: { term: string; meaning: string; context: string }[];
  learnedFacts: MemoryFact[];
  activeAgentId: string;
  selectedVoiceId: string;
}

export interface AgentPersona {
  id: string;
  name: string;
  title: string;
  gender: 'male' | 'female';
  accent: string;
  tagline: string;
  description: string;
  avatarColor: string;
  voicePitch: number;
  voiceRate: number;
  voiceLang: string;
  sampleGreeting: string;
  specialties: string[];
}

export interface FunContentItem {
  id: string;
  type: 'joke' | 'story' | 'jugat' | 'shayari';
  title: string;
  content: string;
  urduScript?: string;
  narrator: string;
  category: string;
  duration?: string;
}

export interface AutonomousWorkItem {
  id: string;
  title: string;
  category: 'calendar' | 'communications' | 'fleet' | 'intelligence' | 'memory' | 'security' | 'audio';
  status: 'completed' | 'in_progress' | 'scheduled';
  summary: string;
  timestamp: string;
  progressPercent?: number;
  agentAssigned: string;
  impact: 'High Sovereign Impact' | 'Autonomous Action' | 'Routine Guardrail';
  details?: string[];
}

export interface UniversalFile {
  id: string;
  title: string;
  type: 'presentation' | 'document' | 'video' | 'audio' | 'pdf' | 'notes';
  category: string;
  createdAt: string;
  content?: string;
  url?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  presentationDeck?: PresentationDeck;
  fileSize?: string;
}

export interface WiFiDevice {
  id: string;
  name: string;
  type: 'smart_tv' | 'speaker' | 'projector' | 'display' | 'light' | 'router' | 'generic';
  brand: string;
  room: string;
  ipAddress: string;
  macAddress: string;
  isConnected: boolean;
  isPoweredOn: boolean;
  volume: number;
  isMuted: boolean;
  currentInput: string;
  currentMediaPlaying?: string;
  signalDbm: number;
  protocol: 'DLNA / UPnP' | 'Google Cast' | 'Apple AirPlay' | 'WebSockets' | 'mDNS' | 'HTTP REST' | 'Roku ECP' | 'Samsung Tizen' | 'webOS' | 'DIAL';
  isCastingActive?: boolean;
  isRealDevice?: boolean;
  lastPingMs?: number;
  port?: number;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  type: 'headphones' | 'remote' | 'speaker' | 'wearable' | 'car_beacon' | 'generic';
  isConnected: boolean;
  batteryPercent?: number;
  signalStrength: 'Strong' | 'Good' | 'Fair';
  pairedAt: string;
  isRealDevice?: boolean;
  gattDeviceId?: string;
}

export interface PersonalNote {
  id: string;
  title: string;
  body: string;
  category: 'general' | 'ideas' | 'work' | 'shopping' | 'reminder';
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
}


