/**
 * Cross-browser Speech Recognition, Speech Synthesis & Wake Word Utility
 * Supports voice commands in English, Roman Urdu Slang, and Nastaliq Urdu (ur-PK).
 */

import { getAcousticMicrophoneConstraints } from './noiseFilter.ts';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Check microphone permission and list available input devices
export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof navigator === 'undefined' || !navigator.permissions) {
    return 'prompt';
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as any });
    return status.state;
  } catch (e) {
    return 'prompt';
  }
}

export async function requestMicrophoneAccess(): Promise<{ granted: boolean; deviceName?: string; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { granted: false, error: 'MediaDevices API not supported in this browser' };
  }
  try {
    const constraints = getAcousticMicrophoneConstraints(true);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const tracks = stream.getAudioTracks();
    const deviceName = tracks[0]?.label || 'Default Laptop Microphone';
    // Release immediate test stream so SpeechRecognition can bind cleanly
    tracks.forEach((t) => t.stop());
    return { granted: true, deviceName };
  } catch (err: any) {
    return { granted: false, error: err?.name === 'NotAllowedError' ? 'Permission denied by user' : err?.message || 'Failed to access microphone' };
  }
}

// Global speaking & acoustic echo suppression state
let isCurrentlySpeaking = false;
let speechFinishedTimestamp = 0;
let lastSpokenTextCleaned = '';
const recentSpokenTexts: string[] = [];
const interruptionListeners: Array<() => void> = [];

export function isSpeaking(): boolean {
  return isCurrentlySpeaking;
}

export function registerInterruptionListener(callback: () => void): () => void {
  interruptionListeners.push(callback);
  return () => {
    const idx = interruptionListeners.indexOf(callback);
    if (idx >= 0) interruptionListeners.splice(idx, 1);
  };
}

export const onSpeechInterrupted = registerInterruptionListener;

export function getSpeechCooldownRemaining(): number {
  if (isCurrentlySpeaking) return 2000;
  const elapsed = Date.now() - speechFinishedTimestamp;
  const cooldownMs = 2000; // 2.0s buffer to clear speaker reverberation and browser recognizer buffer
  return Math.max(0, cooldownMs - elapsed);
}

export function setSpeakingState(speaking: boolean, textSpoken?: string) {
  isCurrentlySpeaking = speaking;
  if (!speaking) {
    speechFinishedTimestamp = Date.now();
  }
  if (textSpoken && textSpoken.trim().length > 0) {
    lastSpokenTextCleaned = textSpoken;
    recentSpokenTexts.push(textSpoken);
    if (recentSpokenTexts.length > 8) {
      recentSpokenTexts.shift();
    }
  }
}

// Check if incoming text is an acoustic echo of what AURA just spoke through the speakers
export function isAcousticEcho(transcript: string): boolean {
  if (!transcript || transcript.trim().length < 2) return false;

  // 1. Explicit wake words and interrupt directives MUST NEVER be discarded as echo!
  // If the user says "Hey AURA", "AURA", "Stop", "Chup", "Roko", that is an intentional user command.
  if (detectWakeWord(transcript).isWake) return false;
  for (const pat of INTERRUPT_PATTERNS) {
    if (pat.test(transcript)) return false;
  }

  // 2. If AURA is currently speaking:
  // Any speech detected by the microphone that is NOT an explicit interrupt or wake word
  // is AURA's own audio loopback coming out of the device's speakers.
  if (isCurrentlySpeaking) {
    return true;
  }

  // 3. Post-speech reverb window (maximum 1200ms after speech finished):
  const timeSinceSpeech = Date.now() - speechFinishedTimestamp;
  if (timeSinceSpeech < 1200) {
    // If within post-speech window, check against the immediate last spoken phrase
    if (matchesSpokenHistory(transcript)) {
      return true;
    }
  }

  // Outside the post-speech window, microphone input is genuine user speech
  return false;
}

function matchesSpokenHistory(transcript: string): boolean {
  if (!lastSpokenTextCleaned) return false;

  const cleanInput = transcript
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .replace(/\s+/g, ' ');

  if (cleanInput.length < 10) return false;

  const inputWords = cleanInput.split(' ').filter((w) => w.length >= 3);
  if (inputWords.length < 3) return false;

  const cleanSpoken = lastSpokenTextCleaned
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .replace(/\s+/g, ' ');

  // Exact long substring match of assistant's own sentence
  if (cleanSpoken.includes(cleanInput) && cleanInput.length >= 15) {
    return true;
  }

  // Word overlap match: only if >= 80% of words in the phrase are an exact duplicate of what was just spoken
  let matchCount = 0;
  for (const w of inputWords) {
    if (cleanSpoken.includes(w)) {
      matchCount++;
    }
  }
  if (inputWords.length >= 4 && matchCount / inputWords.length >= 0.8) {
    return true;
  }

  return false;
}

// Discard meaningless breath, filler syllables, or background mic artifacts
export function isValidSpeechInput(transcript: string): boolean {
  const trimmed = transcript.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return false;

  // Single filler syllables to ignore
  const fillerOnly = /^(?:um+|uh+|ah+|hmm+|er|shh)$/i;
  if (fillerOnly.test(trimmed)) {
    return false;
  }

  // Must contain at least one alphanumeric or language character (English, Urdu, Arabic, Hindi, etc.)
  const hasValidChar = /[a-z0-9\u0600-\u06FF\u0900-\u097F\u00C0-\u024F]/i.test(trimmed);
  if (!hasValidChar) {
    return false;
  }

  return true;
}

// Interrupt commands that immediately halt speech synthesis / audio playback
export const INTERRUPT_PATTERNS = [
  /\bstop\b/i,
  /\bcancel\b/i,
  /\bpause\b/i,
  /\bshut up\b/i,
  /\bquiet\b/i,
  /\bwait\b/i,
  /\bhold on\b/i,
  /\broko\b/i,
  /\bruk\b/i,
  /\bruko\b/i,
  /\bchup\b/i,
  /\bbas\b/i,
  /\bkhamosh\b/i,
  /\baura stop\b/i,
  /\bhey aura stop\b/i,
  /روکو/,
  /رک جاؤ/,
  /چپ/,
  /خاموش/,
  /بس/,
  /بند کرو/,
];

// Wake Word matcher with comprehensive English, Roman Urdu, and Nastaliq Urdu script patterns
const WAKE_WORD_PATTERNS = [
  /\bhey aura\b/i,
  /\bhey\s+ora\b/i,
  /\bhey\s+aora\b/i,
  /\bhey\s+aurora\b/i,
  /\bwake\s+up\s+aura\b/i,
  /\baura\s+wake\s+up\b/i,
  /\bhi aura\b/i,
  /\bhello aura\b/i,
  /\bokay aura\b/i,
  /\bok aura\b/i,
  /\baura bhai\b/i,
  /\bbhai aura\b/i,
  /\bsuno aura\b/i,
  /\baura suno\b/i,
  /\bsalam aura\b/i,
  /\bsalaam aura\b/i,
  /\blisten aura\b/i,
  /\baura listen\b/i,
  /\baura janab\b/i,
  /\bhey copilot\b/i,
  /\baura\b/i,
  /\bora\b/i,
  // Urdu Nastaliq & Phonetic Script patterns captured by ur-PK recognition:
  /ہائے\s+اورا/,
  /ہئے\s+اورا/,
  /ارے\s+اورا/,
  /ہیلو\s+اورا/,
  /اورا\s+بھائی/,
  /بھائی\s+اورا/,
  /اورا\s+سنو/,
  /سنو\s+اورا/,
  /سلام\s+اورا/,
  /اورا/,
  /عورا/,
];

export function detectWakeWord(transcript: string): { isWake: boolean; command: string; wasInterrupt?: boolean } {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized || normalized.length < 2) {
    return { isWake: false, command: '' };
  }

  // Check for direct interrupt commands while speaking
  if (isCurrentlySpeaking) {
    for (const pat of INTERRUPT_PATTERNS) {
      if (pat.test(normalized)) {
        stopSpeaking();
        return { isWake: true, command: 'stop', wasInterrupt: true };
      }
    }
  }

  for (const pattern of WAKE_WORD_PATTERNS) {
    const match = normalized.match(pattern);
    if (match && match.index !== undefined) {
      // If Aura was speaking, interrupt immediately!
      let wasInterrupt = false;
      if (isCurrentlySpeaking) {
        stopSpeaking();
        wasInterrupt = true;
      }
      const matchedText = match[0];
      const before = normalized.slice(0, match.index).trim();
      const after = normalized.slice(match.index + matchedText.length).trim();
      const remaining = (before + ' ' + after).trim().replace(/^[,.\-—:;?]+/, '').trim();
      return { isWake: true, command: remaining, wasInterrupt };
    }
  }

  return { isWake: false, command: transcript };
}

export function createSpeechRecognizer(
  language: string,
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (err: any) => void,
  onEnd: () => void
) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  // Language mapping:
  // For Nastaliq Urdu script, use ur-PK. For Roman Urdu Slang or English, en-US is optimal
  // as it transcribes both English commands and Roman Urdu phonetics without dropping English words.
  if (language === 'ur_script' || language === 'ur-PK') {
    recognition.lang = 'ur-PK';
  } else if (language === 'en-IN' || language === 'hi-IN') {
    recognition.lang = 'en-IN';
  } else if (language === 'ar' || language === 'ar-SA') {
    recognition.lang = 'ar-SA';
  } else if (language === 'fr' || language === 'fr-FR') {
    recognition.lang = 'fr-FR';
  } else {
    recognition.lang = 'en-US';
  }

  let settleTimer: any = null;
  let lastSeenTranscript = '';
  let lastDispatchedFinal = '';

  const clearSettleTimer = () => {
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
  };

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex || 0; i < event.results.length; ++i) {
      const item = event.results[i];
      if (item.isFinal) {
        finalTranscript += item[0].transcript + ' ';
      } else {
        interimTranscript += item[0].transcript + ' ';
      }
    }

    const currentFullText = (finalTranscript + ' ' + interimTranscript).trim().replace(/\s+/g, ' ');

    // If AURA is currently speaking:
    // Only interrupt if the user speaks an explicit interrupt command or calls the wake word!
    if (isCurrentlySpeaking) {
      const isWake = detectWakeWord(currentFullText).isWake;
      const isInterrupt = INTERRUPT_PATTERNS.some((pat) => pat.test(currentFullText));
      if (isWake || isInterrupt) {
        stopSpeaking(true);
      } else {
        // Echo of AURA's own voice coming through speakers — discard and allow AURA to finish!
        return;
      }
    }

    if (!isValidSpeechInput(currentFullText) || isAcousticEcho(currentFullText)) {
      return;
    }

    // 1. Immediate finalization if browser marked chunk as final
    if (finalTranscript.trim() && isValidSpeechInput(finalTranscript.trim())) {
      clearSettleTimer();
      const finalClean = finalTranscript.trim();
      if (finalClean !== lastDispatchedFinal) {
        lastDispatchedFinal = finalClean;
        lastSeenTranscript = '';
        onResult(finalClean, true);
        return;
      }
    }

    // 2. Live interim preview for real-time visual feedback: user sees their words immediately!
    onResult(currentFullText, false);

    // 3. Fast settle finalization:
    // If the spoken text hasn't gained new words for 500ms, the speaker has stopped talking!
    // Finalize and dispatch without making the user wait.
    if (currentFullText !== lastSeenTranscript) {
      lastSeenTranscript = currentFullText;
      clearSettleTimer();
      settleTimer = setTimeout(() => {
        if (currentFullText && isValidSpeechInput(currentFullText) && !isAcousticEcho(currentFullText)) {
          if (currentFullText !== lastDispatchedFinal) {
            lastDispatchedFinal = currentFullText;
            lastSeenTranscript = '';
            onResult(currentFullText, true);
          }
        }
      }, 500);
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }
    clearSettleTimer();
    console.warn('Speech recognition event:', event.error);
    onError(event);
  };

  recognition.onend = () => {
    clearSettleTimer();
    onEnd();
  };

  return recognition;
}

export interface VoicePersonaConfig {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
  rate: number;
  pitch: number;
  langCode: string;
}

export const VOICE_PERSONAS: VoicePersonaConfig[] = [
  {
    id: 'tariq_urdu_male',
    name: 'Tariq Hamza (Urdu Native Male)',
    gender: 'male',
    accent: 'Native Urdu / Executive South Asian',
    description: 'Deep, natural, authoritative and polite male Urdu accent for executive briefings & commands.',
    rate: 0.98,
    pitch: 0.85,
    langCode: 'ur-PK',
  },
  {
    id: 'noor_urdu_female',
    name: 'Noor Bano (Urdu Native Female)',
    gender: 'female',
    accent: 'Graceful Urdu Literary',
    description: 'Gentle, refined, crystal clear Urdu female voice for executive concierge and dastangoi.',
    rate: 0.96,
    pitch: 1.08,
    langCode: 'ur-PK',
  },
  {
    id: 'chaudhry_punjabi_male',
    name: 'Chaudhry Sultan (Punjabi Desi Male)',
    gender: 'male',
    accent: 'Desi Punjabi / Warm & Boisterous',
    description: 'Authentic Punjabi male voice with lively inflection, desi jugtain, and warm humor.',
    rate: 0.96,
    pitch: 0.78,
    langCode: 'pa-IN',
  },
  {
    id: 'farhan_lahori_male',
    name: 'Farhan (Lahori Street Male Slang)',
    gender: 'male',
    accent: 'Urban Pakistani / Fast & Conversational',
    description: 'Colloquial fast-paced male voice fluent in Pakistani slang ("Scene on hai Boss!").',
    rate: 1.05,
    pitch: 0.92,
    langCode: 'ur-PK',
  },
  {
    id: 'aura_executive_female',
    name: 'AURA Prime (Natural English Female)',
    gender: 'female',
    accent: 'Executive Natural English',
    description: 'Crisp, crystal clear female executive voice with natural cadence and high authority.',
    rate: 1.02,
    pitch: 1.04,
    langCode: 'en-US',
  },
  {
    id: 'marcus_uk_male',
    name: 'Marcus Vance (British Natural Male)',
    gender: 'male',
    accent: 'British / Natural International Elite',
    description: 'Polished British male timbre for global governance, strategy briefings and operations.',
    rate: 1.0,
    pitch: 0.92,
    langCode: 'en-GB',
  },
];

// Track current active HTML5 audio element for native Gemini TTS playback
let currentAudioInstance: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

function findBestVoiceForPersona(persona: VoicePersonaConfig, language: string): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length > 0 ? cachedVoices : (typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : []);
  if (!voices || voices.length === 0) return null;

  const isFemaleName = (name: string) => {
    const low = name.toLowerCase();
    return (
      low.includes('female') ||
      low.includes('woman') ||
      low.includes('samantha') ||
      low.includes('victoria') ||
      low.includes('karen') ||
      low.includes('zira') ||
      low.includes('susan') ||
      low.includes('jenny') ||
      low.includes('fiona') ||
      low.includes('tessa') ||
      low.includes('moira') ||
      low.includes('veena') ||
      low.includes('heera') ||
      low.includes('kalpana') ||
      low.includes('sangeeta') ||
      low.includes('priya') ||
      low.includes('neerja') ||
      low.includes('swara') ||
      low.includes('alice') ||
      low.includes('ava') ||
      low.includes('allison') ||
      low.includes('kate') ||
      low.includes('serena') ||
      low.includes('stephanie') ||
      low.includes('catherine') ||
      low.includes('linda') ||
      low.includes('hazel') ||
      low.includes('google us english') ||
      low.includes('google हिन्दी')
    );
  };

  const isMaleName = (name: string) => {
    const low = name.toLowerCase();
    return (
      low.includes('male') ||
      low.includes('man') ||
      low.includes('guy') ||
      low.includes('david') ||
      low.includes('mark') ||
      low.includes('george') ||
      low.includes('daniel') ||
      low.includes('oliver') ||
      low.includes('arthur') ||
      low.includes('ravi') ||
      low.includes('hemant') ||
      low.includes('alex') ||
      low.includes('fred') ||
      low.includes('rishi') ||
      low.includes('neil') ||
      low.includes('prabhat') ||
      low.includes('tarun') ||
      low.includes('ajay') ||
      low.includes('karan') ||
      low.includes('amit') ||
      low.includes('vikram') ||
      low.includes('tariq') ||
      low.includes('imran') ||
      low.includes('ali') ||
      low.includes('james') ||
      low.includes('richard') ||
      low.includes('thomas') ||
      low.includes('charles') ||
      low.includes('christopher') ||
      low.includes('matthew') ||
      low.includes('paul') ||
      low.includes('steven') ||
      low.includes('andrew') ||
      low.includes('ryan')
    );
  };

  if (persona.gender === 'male') {
    // 1. First priority: native/natural male voices
    const naturalMale = voices.find((v) => {
      const low = v.name.toLowerCase();
      return (
        !isFemaleName(v.name) &&
        (low.includes('natural') || low.includes('neural') || low.includes('google')) &&
        (isMaleName(v.name) || low.includes('uk english male') || low.includes('us english male'))
      );
    });
    if (naturalMale) return naturalMale;

    // 2. Specific persona matches
    if (persona.id === 'marcus_uk_male') {
      const ukMale = voices.find(
        (v) => v.lang.startsWith('en-GB') && !isFemaleName(v.name) && (isMaleName(v.name) || v.name.toLowerCase().includes('google'))
      ) || voices.find((v) => v.lang.startsWith('en-GB') && !isFemaleName(v.name));
      if (ukMale) return ukMale;
    }

    if (persona.id === 'alexander_us_male') {
      const usMale = voices.find(
        (v) => v.lang.startsWith('en-US') && !isFemaleName(v.name) && (isMaleName(v.name) || v.name.toLowerCase().includes('google'))
      ) || voices.find((v) => v.lang.startsWith('en') && !isFemaleName(v.name) && isMaleName(v.name));
      if (usMale) return usMale;
    }

    if (persona.id === 'tariq_urdu_male' || persona.id === 'farhan_lahori_male' || persona.id === 'chaudhry_punjabi_male') {
      const southAsianMale = voices.find(
        (v) =>
          (v.lang.startsWith('ur') || v.lang.startsWith('hi') || v.lang.startsWith('pa') || v.lang.startsWith('en-IN')) &&
          !isFemaleName(v.name) &&
          (isMaleName(v.name) || v.name.toLowerCase().includes('google'))
      ) || voices.find((v) => (v.lang.startsWith('ur') || v.lang.startsWith('hi') || v.lang.startsWith('pa')) && !isFemaleName(v.name));
      if (southAsianMale) return southAsianMale;
    }

    // 3. Any male voice in any English dialect
    const anyMale = voices.find((v) => !isFemaleName(v.name) && isMaleName(v.name));
    if (anyMale) return anyMale;

    // 4. Any voice that does NOT contain female indicators
    const nonFemale = voices.find((v) => !isFemaleName(v.name) && (v.lang.startsWith('en') || v.lang.startsWith('ur') || v.lang.startsWith('hi')));
    if (nonFemale) return nonFemale;
  } else {
    // Female persona matching
    if (persona.id === 'noor_urdu_female') {
      const urduFem = voices.find((v) => (v.lang.startsWith('ur') || v.lang.startsWith('hi')) && isFemaleName(v.name)) ||
        voices.find((v) => v.lang.startsWith('ur') || v.lang.startsWith('hi'));
      if (urduFem) return urduFem;
    }

    const naturalFem = voices.find(
      (v) => (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('google')) && isFemaleName(v.name)
    ) || voices.find((v) => isFemaleName(v.name) && v.lang.startsWith('en'));
    if (naturalFem) return naturalFem;
  }

  if (persona.gender === 'male') {
    const fallbackMale = voices.find((v) => isMaleName(v.name)) || voices.find((v) => !isFemaleName(v.name));
    return fallbackMale || voices[0] || null;
  }

  return voices[0] || null;
}

function fallbackBrowserSpeak(
  cleanText: string,
  language: string,
  onComplete?: () => void,
  personaId: string = 'tariq_urdu_male'
) {
  if (!isSpeechSynthesisSupported()) {
    onComplete?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const persona = VOICE_PERSONAS.find((p) => p.id === personaId) || VOICE_PERSONAS[0];
  const matchedVoice = findBestVoiceForPersona(persona, language);

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.rate = persona.rate;
  // If male persona, enforce deep resonant masculine pitch (0.65 - 0.80) so it never sounds like a female voice
  if (persona.gender === 'male') {
    utterance.pitch = 0.70;
  } else {
    utterance.pitch = persona.pitch;
  }

  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    isCurrentlySpeaking = false;
    speechFinishedTimestamp = Date.now();
    clearTimeout(safetyTimer);
    try {
      (window as any)._currentUtterance = null;
    } catch {
      // ignore
    }
    onComplete?.();
  };

  const maxSpeakDuration = Math.max(3000, Math.min(20000, (cleanText.length / 10) * 1000 + 2000));
  const safetyTimer = setTimeout(finish, maxSpeakDuration);

  utterance.onend = finish;
  utterance.onerror = finish;

  try {
    (window as any)._currentUtterance = utterance;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    isCurrentlySpeaking = true;
    lastSpokenTextCleaned = cleanText;
    window.speechSynthesis.speak(utterance);
  } catch {
    finish();
  }
}

let clientTtsCooldownUntil = 0;

export function speakText(
  text: string,
  language: string = 'en',
  onComplete?: () => void,
  personaId: string = 'tariq_urdu_male'
) {
  // Cancel any ongoing playback across both native audio & web speech
  stopSpeaking();

  const cleanText = text
    .replace(/[#*`_~]/g, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();

  if (!cleanText) {
    onComplete?.();
    return;
  }

  setSpeakingState(true, cleanText);

  // If currently in quota cooldown period, immediately speak with browser synthesis without network delay
  if (Date.now() < clientTtsCooldownUntil) {
    fallbackBrowserSpeak(cleanText, language, onComplete, personaId);
    return;
  }

  // Attempt Studio Native Voice Generation via /api/tts with 3.0s abort protection
  const ttsController = new AbortController();
  const ttsTimeoutId = setTimeout(() => ttsController.abort(), 3000);

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanText,
      voiceName: personaId,
      language,
    }),
    signal: ttsController.signal,
  })
    .then((res) => {
      clearTimeout(ttsTimeoutId);
      if (!res.ok) return { useFallback: true };
      return res.json();
    })
    .then((data) => {
      if (data?.useFallback) {
        if (data.fallbackReason === 'quota_exceeded' || data.fallbackReason === 'quota_cooldown') {
          clientTtsCooldownUntil = Date.now() + 5 * 60 * 1000;
        }
        fallbackBrowserSpeak(cleanText, language, onComplete, personaId);
        return;
      }

      if (data?.audioBase64) {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
        currentAudioInstance = audio;

        let completed = false;
        const finish = () => {
          if (completed) return;
          completed = true;
          isCurrentlySpeaking = false;
          speechFinishedTimestamp = Date.now();
          currentAudioInstance = null;
          onComplete?.();
        };

        audio.onended = finish;
        audio.onerror = () => {
          currentAudioInstance = null;
          fallbackBrowserSpeak(cleanText, language, onComplete, personaId);
        };

        // Safety fallback timer for audio element
        const safetyTimer = setTimeout(finish, 25000);
        audio.addEventListener('ended', () => clearTimeout(safetyTimer));

        audio.play().catch(() => {
          clearTimeout(safetyTimer);
          currentAudioInstance = null;
          fallbackBrowserSpeak(cleanText, language, onComplete, personaId);
        });
      } else {
        fallbackBrowserSpeak(cleanText, language, onComplete, personaId);
      }
    })
    .catch(() => {
      clientTtsCooldownUntil = Date.now() + 60 * 1000;
      fallbackBrowserSpeak(cleanText, language, onComplete, personaId);
    });
}

export function stopSpeaking(wasInterrupted: boolean = false) {
  const hadActiveSpeech = isCurrentlySpeaking;
  isCurrentlySpeaking = false;
  speechFinishedTimestamp = Date.now();
  if (currentAudioInstance) {
    try {
      currentAudioInstance.pause();
      currentAudioInstance.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudioInstance = null;
  }
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  if (wasInterrupted || hadActiveSpeech) {
    interruptionListeners.forEach((fn) => {
      try { fn(); } catch {}
    });
  }
}

export function testVoicePersona(personaId: string, language: string = 'en') {
  stopSpeaking();
  const persona = VOICE_PERSONAS.find((p) => p.id === personaId) || VOICE_PERSONAS[0];
  const samplePhrase =
    persona.langCode === 'pa-IN'
      ? 'Oye Salam Chaudhry Sahab! Tussi hukum karo, Smart TV on karna ae ya koi jugat sunani ae? Scene poora fit ae!'
      : persona.langCode === 'ur-PK'
      ? 'Salam Boss! Main AURA hoon, aapka mukammal executive voice copilot. Main hazir hoon!'
      : persona.langCode === 'en-GB'
      ? 'Good day, Chief. Marcus here. All executive systems and connected devices are primed.'
      : 'Hello Chief. AURA executive copilot is online, listening, and ready for your directives.';

  speakText(samplePhrase, language, undefined, personaId);
}
