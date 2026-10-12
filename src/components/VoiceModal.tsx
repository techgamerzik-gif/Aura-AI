import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ArrowRight,
  Radio,
  Globe,
  RefreshCw,
  Zap,
  CheckCircle,
  CheckSquare,
  Calendar,
  Mail,
  Car,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Sliders,
  Fingerprint,
  Trash2,
  Activity,
} from 'lucide-react';
import { AuraOrb } from './AuraOrb.tsx';
import { VoiceIdentityModal } from './VoiceIdentityModal.tsx';
import { CommandAuditModal } from './CommandAuditModal.tsx';
import { commandLearningEngine } from '../utils/commandLearningEngine.ts';
import {
  VoiceIdentityProfile,
  LiveSpeakerVerification,
  getStoredVoiceIdentity,
  isVoiceIdentityEnforced,
  setVoiceIdentityEnforced,
  extractAcousticFeatures,
  verifyVoiceIdentity,
} from '../utils/voiceIdentity.ts';
import {
  createSpeechRecognizer,
  speakText,
  stopSpeaking,
  isSpeechRecognitionSupported,
  requestMicrophoneAccess,
  VOICE_PERSONAS,
  testVoicePersona,
  isSpeaking,
  getSpeechCooldownRemaining,
  setSpeakingState,
  isAcousticEcho,
  isValidSpeechInput,
  onSpeechInterrupted,
  detectWakeWord,
  INTERRUPT_PATTERNS,
} from '../utils/speech.ts';
import {
  AdaptiveAcousticTracker,
  createVocalDSPFilterChain,
  createHumanVoiceNoiseSuppressionPipeline,
  getAcousticMicrophoneConstraints,
  isPassiveCrowdChatter,
  AcousticTelemetry,
  VocalSuppressionTelemetry,
  VoiceFingerprintTelemetry,
  voiceFingerprintEngine,
} from '../utils/noiseFilter.ts';
import {
  parseUserDirective,
  parseMultiUserDirectives,
  synthesizeMultiTaskReport,
} from '../utils/intentParser.ts';
import { soundEffects } from '../utils/audioChime.ts';
import { backgroundWakeEngine } from '../utils/backgroundWakeEngine.ts';
import { LanguageMode } from '../types/assistant.ts';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageMode;
  onLanguageChange: (lang: LanguageMode) => void;
  onExecuteAction?: (actionType: string, details: any) => void;
  initialCommand?: string;
  autoListenEnabled?: boolean;
  selectedVoiceId?: string;
  onVoiceChange?: (voiceId: string) => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  onExecuteAction,
  initialCommand,
  autoListenEnabled = true,
  selectedVoiceId = 'tariq_urdu_male',
  onVoiceChange,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [continuousMode, setContinuousMode] = useState(true);
  const [voiceSyncMode, setVoiceSyncMode] = useState<'smart_sync' | 'push_to_talk'>('smart_sync');
  const [voiceActivityDetected, setVoiceActivityDetected] = useState(false);

  // Acoustic recognition model selection: ur-PK captures authentic Nastaliq Urdu; en-US handles English & Roman Urdu commands
  const [acousticLang, setAcousticLang] = useState<'ur-PK' | 'en-US'>(
    language === 'ur_script' ? 'ur-PK' : 'en-US'
  );

  const [chatLog, setChatLog] = useState<
    Array<{ sender: 'user' | 'aura'; text: string; time: string; action?: any }>
  >([
    {
      sender: 'aura',
      text:
        language === 'ur_slang'
          ? 'Salam Boss! AURA voice system active hai. Main sun raha hoon — meeting schedule karni hai, presentation banani hai, ya Tesla ka climate chalana hai?'
          : 'AURA Executive Copilot is listening. Speak your instruction or command.',
      time: 'Just now',
    },
  ]);

  const [micPermissionBlocked, setMicPermissionBlocked] = useState(false);
  const [micDeviceName, setMicDeviceName] = useState<string>('Laptop Default Mic');
  const [crowdIsolationEnabled, setCrowdIsolationEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('aura_crowd_filter') !== 'false';
  });
  const [acousticData, setAcousticData] = useState<AcousticTelemetry>({
    audioEnergy: 0,
    ambientNoiseFloor: 12,
    snrDb: 0,
    isNearFieldVoice: false,
    isCrowdNoiseDetected: false,
    formantClarity: 0,
  });

  const [voiceIdentityProfile, setVoiceIdentityProfile] = useState<VoiceIdentityProfile | null>(getStoredVoiceIdentity);
  const [isVoiceIdentityEnforcedState, setIsVoiceIdentityEnforcedState] = useState<boolean>(isVoiceIdentityEnforced);
  const [showVoiceIdentityModal, setShowVoiceIdentityModal] = useState(false);
  const [showCommandAuditModal, setShowCommandAuditModal] = useState(false);
  const [liveVerification, setLiveVerification] = useState<LiveSpeakerVerification | null>(null);
  const [voiceMismatchNotice, setVoiceMismatchNotice] = useState<string | null>(null);

  // Web Audio API Human Voice Noise Suppression Filter (85Hz - 3400Hz Vocal Pass)
  const [vocalFilterEnabled, setVocalFilterEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('aura_vocal_filter') !== 'false';
  });
  const [vocalTelemetry, setVocalTelemetry] = useState<VocalSuppressionTelemetry>({
    vocalPurityPercent: 100,
    outOfBandNoisePercent: 0,
    isHumanVoiceActive: false,
    subBassRumbleEnergy: 0,
    highFreqHissEnergy: 0,
    vocalBandEnergy: 0,
    attenuationDb: 0,
  });

  // 5-Second Voice Fingerprint Buffer State
  const [fingerprintTelemetry, setFingerprintTelemetry] = useState<VoiceFingerprintTelemetry>(() =>
    voiceFingerprintEngine.getTelemetry()
  );
  const [isSamplingFingerprint, setIsSamplingFingerprint] = useState(false);
  const [fingerprintCountdownSeconds, setFingerprintCountdownSeconds] = useState(5.0);
  const [fingerprintFillPercent, setFingerprintFillPercent] = useState(0);

  const noiseFilterPipelineRef = useRef<any>(null);
  const rawAnalyserRef = useRef<AnalyserNode | null>(null);

  const toggleVocalFilter = () => {
    const next = !vocalFilterEnabled;
    setVocalFilterEnabled(next);
    localStorage.setItem('aura_vocal_filter', String(next));
    if (noiseFilterPipelineRef.current) {
      noiseFilterPipelineRef.current.setFilterEnabled(next);
    }
  };

  const handleStartFingerprintSampling = () => {
    if (!noiseFilterPipelineRef.current) {
      if (!isListening) {
        startListening();
      }
    }
    soundEffects.playWakeChime();
    setIsSamplingFingerprint(true);
    setFingerprintCountdownSeconds(5.0);
    setFingerprintFillPercent(0);

    voiceFingerprintEngine.startSampling(
      audioContextRef.current?.sampleRate || 48000,
      (seconds: number, percent: number) => {
        setFingerprintCountdownSeconds(Math.max(0, +(5.0 - seconds).toFixed(1)));
        setFingerprintFillPercent(percent);
        if (percent >= 100) {
          setIsSamplingFingerprint(false);
          soundEffects.playSuccessChime();
          setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());
        }
      }
    );
  };

  const handleCancelFingerprintSampling = () => {
    voiceFingerprintEngine.cancelSampling();
    setIsSamplingFingerprint(false);
  };

  const handleClearFingerprint = () => {
    if (noiseFilterPipelineRef.current) {
      noiseFilterPipelineRef.current.clearFingerprint();
    } else {
      voiceFingerprintEngine.clear();
    }
    setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());
  };

  const handleToggleFingerprintSuppression = () => {
    const next = !voiceFingerprintEngine.isSuppressionEnabled();
    voiceFingerprintEngine.setSuppressionEnabled(next);
    if (noiseFilterPipelineRef.current) {
      noiseFilterPipelineRef.current.setFingerprintSuppression(next);
    }
    setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());
  };

  const voiceIdentityProfileRef = useRef(voiceIdentityProfile);
  voiceIdentityProfileRef.current = voiceIdentityProfile;
  const voiceIdentityEnforcedRef = useRef(isVoiceIdentityEnforcedState);
  voiceIdentityEnforcedRef.current = isVoiceIdentityEnforcedState;
  const latestVerificationRef = useRef<LiveSpeakerVerification | null>(null);

  const recognizerRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);
  const isRestartingRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechPauseTimerRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const lastSentUserPromptRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);
  const recentRepliesRef = useRef<string[]>([]);
  const hasGreetedRef = useRef<boolean>(false);
  const consecutiveWakeOnlyCountRef = useRef<number>(0);
  const maxAudioEnergyDuringUtteranceRef = useRef<number>(0);
  const acousticTrackerRef = useRef(new AdaptiveAcousticTracker());
  const acousticDataRef = useRef(acousticData);
  acousticDataRef.current = acousticData;
  const orbStateRef = useRef(orbState);
  orbStateRef.current = orbState;
  const handleSendMessageRef = useRef<(text: string) => Promise<void>>((null as any));

  useEffect(() => {
    localStorage.setItem('aura_crowd_filter', String(crowdIsolationEnabled));
  }, [crowdIsolationEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Escape key handler to ensure modal can ALWAYS be closed via keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopSpeaking();
        stopListening();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Informative feedback when microphone permission is blocked
  useEffect(() => {
    if (micPermissionBlocked) {
      setChatLog((prev) => {
        if (prev.some((m) => m.text.includes('browser ne laptop microphone block'))) return prev;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return [
          ...prev,
          {
            sender: 'aura',
            text:
              language === 'ur_slang'
                ? 'Notice: Laptop mic browser settings mein block hai. Aap URL bar mein 🔒 lock icon par click karke microphone "Allow" kar saktay hain. Tab tak aap neechay kisi bhi directive par click karein ya type karein — main foran respond karoonga!'
                : 'Notice: Laptop microphone is blocked by browser settings. Click the 🔒 lock icon in your browser URL bar to Allow microphone, or click any suggested directive below to test.',
            time: now,
          },
        ];
      });
    }
  }, [micPermissionBlocked, language]);

  // Sync acoustic recognition model when language preference changes
  useEffect(() => {
    const target = language === 'ur_script' ? 'ur-PK' : 'en-US';
    setAcousticLang(target);
    if (shouldListenRef.current && isListening) {
      if (recognizerRef.current) {
        try { recognizerRef.current.stop(); } catch {}
      }
      setTimeout(() => {
        if (shouldListenRef.current) startListening();
      }, 150);
    }
  }, [language]);
  const handleRequestLaptopMic = async () => {
    const res = await requestMicrophoneAccess();
    if (res.granted) {
      setMicPermissionBlocked(false);
      if (res.deviceName) setMicDeviceName(res.deviceName);
      soundEffects.playSuccessChime();
      startListening();
    } else {
      setMicPermissionBlocked(true);
    }
  };

  // Audio level visualizer during modal session
  const startAudioMeter = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      const constraints = getAcousticMicrophoneConstraints(crowdIsolationEnabled);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const tracks = stream.getAudioTracks();
      if (tracks[0]?.label) {
        setMicDeviceName(tracks[0].label);
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      // Route through advanced 6-stage human vocal profile DSP noise suppression pipeline
      const pipeline = createHumanVoiceNoiseSuppressionPipeline(ctx, source);
      noiseFilterPipelineRef.current = pipeline;
      pipeline.setFilterEnabled(vocalFilterEnabled);

      analyserRef.current = pipeline.analyserNode;
      rawAnalyserRef.current = pipeline.rawAnalyserNode;

      const bufferLength = pipeline.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const rawDataArray = new Uint8Array(pipeline.rawAnalyserNode.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        rawAnalyserRef.current?.getByteFrequencyData(rawDataArray);

        // Compute real-time human vocal profile purity & out-of-band suppression telemetry
        if (noiseFilterPipelineRef.current) {
          const vTelemetry = noiseFilterPipelineRef.current.getTelemetry(dataArray, rawDataArray, ctx.sampleRate);
          setVocalTelemetry(vTelemetry);
          setFingerprintTelemetry(noiseFilterPipelineRef.current.getFingerprintTelemetry());
        }

        // Acoustic telemetry: real-time energy, ambient noise floor, and dynamic SNR
        const telemetry = acousticTrackerRef.current.analyze(dataArray);
        setAcousticData(telemetry);
        setAudioLevel(telemetry.audioEnergy);
        if (telemetry.audioEnergy > maxAudioEnergyDuringUtteranceRef.current) {
          maxAudioEnergyDuringUtteranceRef.current = telemetry.audioEnergy;
        }
        setVoiceActivityDetected(telemetry.isNearFieldVoice || telemetry.audioEnergy > 12);

        // Real-Time Voice Identity Biometric Analysis
        const currentProfile = voiceIdentityProfileRef.current;
        if (currentProfile && currentProfile.isEnrolled && telemetry.audioEnergy > 10) {
          const features = extractAcousticFeatures(dataArray, ctx.sampleRate);
          const verification = verifyVoiceIdentity(
            features,
            currentProfile,
            telemetry.snrDb,
            telemetry.isNearFieldVoice
          );
          latestVerificationRef.current = verification;
          setLiveVerification(verification);
        } else if (telemetry.audioEnergy <= 10) {
          setLiveVerification(null);
        }

        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch {
      // Audio level analyser is purely cosmetic — do NOT trigger blocked permission state
    }
  };

  const stopAudioMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    rawAnalyserRef.current = null;
    noiseFilterPipelineRef.current = null;
    setAudioLevel(0);
  };

  // Immediate Interruption Listener: When user speaks or calls Aura, halt ongoing speech/explanation immediately!
  useEffect(() => {
    const unsub = onSpeechInterrupted(() => {
      if (speechPauseTimerRef.current) {
        clearTimeout(speechPauseTimerRef.current);
        speechPauseTimerRef.current = null;
      }
      setOrbState('listening');
      setIsListening(true);
    });
    return unsub;
  }, []);

  // Start listening function with keep-alive & sub-second response
  const startListening = () => {
    stopSpeaking();
    setTranscript('');
    shouldListenRef.current = true;
    setMicPermissionBlocked(false);

    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
      recognizerRef.current = null;
    }

    const rec = createSpeechRecognizer(
      acousticLang,
      (text, isFinal) => {
        // 1. Immediately reject any acoustic echo of AURA speaking through speakers
        if (isAcousticEcho(text)) {
          return;
        }

        // 2. If Aura is currently speaking, only interrupt on explicit interrupt command or wake word!
        if (isSpeaking() || orbStateRef.current === 'speaking') {
          const isWake = detectWakeWord(text).isWake;
          const isInterrupt = INTERRUPT_PATTERNS.some((pat) => pat.test(text));
          if (isWake || isInterrupt) {
            stopSpeaking(true);
            soundEffects.playWakeChime();
            setOrbState('listening');
            setIsListening(true);
          } else {
            // Assistant's own voice loopback — ignore!
            return;
          }
        }

        if (!isValidSpeechInput(text)) return;

        // Immediately update live transcript so the user sees their words in real-time!
        transcriptRef.current = text;
        setTranscript(text);

        const dispatchUtterance = (candidateText: string) => {
          const trimmed = candidateText.trim();
          if (trimmed.length < 2) return;
          if (isAcousticEcho(trimmed)) return;

          // VOICE IDENTITY BIO-LOCK ENFORCEMENT:
          // Only reject if user explicitly enabled Voice Identity biometric lock AND enrollment profile exists AND confidence is an extreme mismatch (<35)
          if (
            voiceIdentityEnforcedRef.current &&
            voiceIdentityProfileRef.current?.isEnrolled
          ) {
            const ver = latestVerificationRef.current;
            if (ver && !ver.isMatch && ver.confidence < 35) {
              setVoiceMismatchNotice(
                `AURA Bio-Lock: Background voice ignored (${ver.confidence}% match). Only your calibrated voice is authorized.`
              );
              setTimeout(() => setVoiceMismatchNotice(null), 3500);
              return;
            }
          }

          if (speechPauseTimerRef.current) {
            clearTimeout(speechPauseTimerRef.current);
            speechPauseTimerRef.current = null;
          }
          if (lastSentUserPromptRef.current === trimmed && Date.now() - lastSentTimeRef.current < 2000) {
            return;
          }

          consecutiveWakeOnlyCountRef.current = 0;
          lastSentUserPromptRef.current = trimmed;
          lastSentTimeRef.current = Date.now();
          maxAudioEnergyDuringUtteranceRef.current = 0;
          transcriptRef.current = '';
          setTranscript('');
          const sendFn = handleSendMessageRef.current || handleSendMessage;
          sendFn(trimmed);
        };

        if (isFinal && text.trim().length > 1) {
          if (speechPauseTimerRef.current) {
            clearTimeout(speechPauseTimerRef.current);
            speechPauseTimerRef.current = null;
          }
          dispatchUtterance(text);
        } else if (text.trim().length > 1) {
          // If the user pauses for 550ms after speaking, auto-dispatch command immediately!
          if (speechPauseTimerRef.current) clearTimeout(speechPauseTimerRef.current);
          speechPauseTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current && orbStateRef.current !== 'speaking' && orbStateRef.current !== 'thinking') {
              dispatchUtterance(text);
            }
          }, 550);
        }
      },
      (err: any) => {
        if (err?.error === 'not-allowed') {
          setMicPermissionBlocked(true);
          shouldListenRef.current = false;
          setIsListening(false);
          setOrbState('idle');
        } else if (err?.error === 'no-speech' || err?.error === 'aborted') {
          // Non-fatal speech gap — keep listening active
        } else {
          console.warn('Voice recognition notice:', err);
        }
      },
      () => {
        if (speechPauseTimerRef.current) {
          clearTimeout(speechPauseTimerRef.current);
          speechPauseTimerRef.current = null;
        }
        if (
          transcriptRef.current &&
          transcriptRef.current.trim().length > 1 &&
          transcriptRef.current.trim() !== lastSentUserPromptRef.current &&
          !isAcousticEcho(transcriptRef.current)
        ) {
          const pending = transcriptRef.current.trim();
          transcriptRef.current = '';
          setTranscript('');
          lastSentUserPromptRef.current = pending;
          lastSentTimeRef.current = Date.now();
          const sendFn = handleSendMessageRef.current || handleSendMessage;
          sendFn(pending);
          return;
        }

        // Keep-alive: speech recognition stays primed and auto-restarts safely so barge-in and listening are ALWAYS ACTIVE!
        if (shouldListenRef.current && !micPermissionBlocked) {
          if (!isRestartingRef.current) {
            isRestartingRef.current = true;
            setTimeout(() => {
              isRestartingRef.current = false;
              if (shouldListenRef.current && recognizerRef.current) {
                try {
                  recognizerRef.current.start();
                  setIsListening(true);
                  if (orbStateRef.current !== 'speaking' && orbStateRef.current !== 'thinking') {
                    setOrbState('listening');
                  }
                } catch {
                  // already running
                }
              }
            }, 250);
          }
        } else {
          setIsListening(false);
          if (orbStateRef.current === 'listening') {
            setOrbState('idle');
          }
        }
      }
    );

    if (rec) {
      recognizerRef.current = rec;
      try {
        rec.start();
        setIsListening(true);
        setOrbState('listening');
      } catch (e) {
        console.warn('Speech recognition start notice:', e);
      }
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch (e) {}
      recognizerRef.current = null;
    }
    setIsListening(false);
    if (orbState === 'listening') {
      setOrbState('idle');
    }
  };

  // Auto-start listening when modal opens or initialCommand arrives
  useEffect(() => {
    let listenTimer: any = null;
    if (isOpen) {
      startAudioMeter();
      if (initialCommand && initialCommand.trim()) {
        handleSendMessage(initialCommand.trim());
      } else {
        // Automatically start listening after modal transition
        listenTimer = setTimeout(() => {
          startListening();
        }, 250);
      }
    } else {
      stopListening();
      stopSpeaking();
      stopAudioMeter();
      hasGreetedRef.current = false;
      consecutiveWakeOnlyCountRef.current = 0;
      lastSentUserPromptRef.current = '';
    }

    return () => {
      if (listenTimer) clearTimeout(listenTimer);
      stopListening();
      stopSpeaking();
      stopAudioMeter();
    };
  }, [isOpen, initialCommand]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const trimmedInput = textToSend.trim();
    setChatLog((prev) => [...prev, { sender: 'user', text: trimmedInput, time: now }]);
    setTranscript('');
    setOrbState('thinking');

    // Fast path: Pure greetings / wake words without an action directive
    const isGreetingOnly =
      /^(?:hey\s+)?aura(?:\s+bhai|\s+suno)?$/i.test(trimmedInput) ||
      /^(?:salam|salaam|hello|hi|suno|oye|boss)$/i.test(trimmedInput);

    if (isGreetingOnly) {
      if (hasGreetedRef.current) {
        consecutiveWakeOnlyCountRef.current++;
        if (consecutiveWakeOnlyCountRef.current > 1) {
          // Break the feedback loop: softly chime and wait for genuine directive
          soundEffects.playWakeChime();
          setOrbState('idle');
          if (continuousMode && !micPermissionBlocked && isOpen) {
            setTimeout(() => {
              if (!isSpeaking() && isOpen) startListening();
            }, 600);
          }
          return;
        }

        const briefFollowUp =
          language === 'ur_slang'
            ? 'Jee Boss, sun raha hoon! Hukum karein, kya task execute karoon?'
            : 'Listening, Chief. Ready for your specific task or directive.';

        setLastResponse(briefFollowUp);
        setChatLog((prev) => [...prev, { sender: 'aura', text: briefFollowUp, time: now }]);
        setOrbState('speaking');
        setSpeakingState(true, briefFollowUp);

        if (ttsEnabled) {
          speakText(
            briefFollowUp,
            language,
            () => {
              setSpeakingState(false);
              setOrbState('idle');
              if (continuousMode && !micPermissionBlocked && isOpen) {
                setTimeout(() => {
                  if (!isSpeaking() && isOpen) startListening();
                }, 150);
              }
            },
            selectedVoiceId
          );
        } else {
          setTimeout(() => {
            setOrbState('idle');
            if (continuousMode && !micPermissionBlocked && isOpen) startListening();
          }, 300);
        }
        return;
      }

      hasGreetedRef.current = true;
      const greetingReply =
        language === 'ur_slang'
          ? 'Jee Boss! AURA alert hai aur sun raha hai. Hukum farmayein — koi deliverable execute karna hai, meeting schedule karni hai, ya email triage dekhni hai?'
          : 'AURA Executive Copilot standing by. Ready for your directive — would you like to execute a task, review communications, or adjust your schedule?';

      setLastResponse(greetingReply);
      setChatLog((prev) => [...prev, { sender: 'aura', text: greetingReply, time: now }]);
      setOrbState('speaking');
      setSpeakingState(true, greetingReply);

      if (ttsEnabled) {
        speakText(
          greetingReply,
          language,
          () => {
            setSpeakingState(false);
            setOrbState('idle');
            if (continuousMode && !micPermissionBlocked && isOpen) {
              setTimeout(() => {
                if (!isSpeaking() && isOpen) startListening();
              }, 150);
            }
          },
          selectedVoiceId
        );
      } else {
        setTimeout(() => {
          setOrbState('idle');
          if (continuousMode && !micPermissionBlocked && isOpen) startListening();
        }, 300);
      }
      return;
    }

    // 1. Multi-Task Execution: decomposes long compound voice commands containing multiple tasks
    const multiDirectives = parseMultiUserDirectives(trimmedInput);
    if (multiDirectives.length > 1) {
      soundEffects.playSuccessChime();
      multiDirectives.forEach((dir) => {
        if (onExecuteAction) {
          onExecuteAction(dir.actionType, dir.details);
        }
      });

      const multiReport = synthesizeMultiTaskReport(multiDirectives, language);
      const isUrduLang = language === 'ur_slang' || language === 'ur_script';
      const reply =
        language === 'ur_script'
          ? multiReport.reply.ur_script
          : isUrduLang
          ? multiReport.reply.ur_slang
          : multiReport.reply.en;

      setLastResponse(reply);
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'aura',
          text: reply,
          time: now,
          action: {
            actionType: 'MULTI_ACTION',
            details: { count: multiDirectives.length, directives: multiDirectives },
            summary: multiReport.summary,
          },
        },
      ]);
      setOrbState('speaking');

      if (ttsEnabled) {
        setSpeakingState(true, reply);
        speakText(
          reply,
          language,
          () => {
            setSpeakingState(false);
            setOrbState('idle');
            if (continuousMode && !micPermissionBlocked && isOpen) {
              setTimeout(() => {
                if (!isSpeaking() && isOpen) startListening();
              }, 150);
            }
          },
          selectedVoiceId
        );
      } else {
        setTimeout(() => {
          setOrbState('idle');
          if (continuousMode && !micPermissionBlocked && isOpen) startListening();
        }, 800);
      }
      return;
    }

    // 2. Single Direct Actionable Directive
    const localDirective = multiDirectives.length === 1 ? multiDirectives[0] : parseUserDirective(trimmedInput);
    let actionExecutedLocally = false;
    if (localDirective) {
      actionExecutedLocally = true;
      soundEffects.playSuccessChime();
      if (localDirective.actionType === 'SHOW_COMMAND_AUDIT') {
        setShowCommandAuditModal(true);
      }
      if (onExecuteAction) {
        onExecuteAction(localDirective.actionType, localDirective.details);
      }
    }

    try {
      let data: any = null;

      // Ultra-low latency chat API call with reliable abort protection (14s max)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 14000);

        const response = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmedInput,
            language,
            context: {
              timestamp: new Date().toISOString(),
              agent: 'AURA Executive AI',
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response && response.ok) {
          data = await response.json();
        }
      } catch {
        // network or model timeout; immediately fallback to zero-latency executive engine
      }

      // Autonomous client-side executive fallback if network is slow, unreachable or rate-limited
      if (!data) {
        if (localDirective) {
          const isUrduLang = language === 'ur_slang' || language === 'ur_script';
          const defaultText =
            language === 'ur_script'
              ? localDirective.defaultReply.ur_script
              : isUrduLang
              ? localDirective.defaultReply.ur_slang
              : localDirective.defaultReply.en;
          data = {
            reply: defaultText,
            action: { actionType: localDirective.actionType, details: localDirective.details, summary: localDirective.summary },
          };
        } else {
        const isUrdu =
          language === 'ur_slang' ||
          language === 'ur_script' ||
          /kya|bhai|yaar|scene|hoga|karo|set|band|chala|sunao|milao|bhejo/i.test(trimmedInput);

        if (isUrdu) {
          // Practical Task Creation
          if (/(?:add|create|new|naya|daalo|shamil)\s+(?:task|todo|kaam|deliverable)|(?:task|todo|kaam)\s+(?:add|create|banao|likho)/i.test(trimmedInput)) {
            let taskTitle = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please|bhai|janab|ek|naya|new)\s+/gi, '')
              .replace(/(?:add|create|banao|likho|shamil karo|daalo|task|todo|kaam|deliverable|:)+/gi, ' ')
              .trim();
            if (!taskTitle || taskTitle.length < 3) taskTitle = 'Executive Strategic Task';
            else taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);

            data = {
              reply: `Zabardast Boss! Naya task "${taskTitle}" executive queue mein add ho gaya hai aur Firestore database par sync kar diya hai.`,
              action: { actionType: 'CREATE_TASK', details: { title: taskTitle, priority: 'high', deadline: 'Today 18:00' } },
            };
          }
          // Practical Task Execution / Completion
          else if (/(?:complete|execute|resolve|finish|approve|ratify|mark\s+done)\s+(?:task|todo|resolution|deliverable|sla)|(?:task|kaam)\s+(?:complete|execute|khatam|poora|done|approve)|approve.*(?:board|resolution|sla)|ratify.*board/i.test(trimmedInput)) {
            let title = 'Ratify Q3 Board Resolution & Treasury Disclosures';
            let targetId = 't-1';
            if (/sla|cloud|2|second|doosra/i.test(trimmedInput)) {
              title = 'Approve Cloud Infrastructure Enterprise SLA';
              targetId = 't-2';
            }
            data = {
              reply: `Hukum sar ankhon par Boss! Task "${title}" execute karke complete mark kar diya gaya hai.`,
              action: { actionType: 'COMPLETE_TASK', details: { title, taskId: targetId } },
            };
          }
          // Practical Task Deletion
          else if (/(?:delete|remove|hatao|nikalo|mitao)\s+(?:task|todo|deliverable)|(?:task|todo)\s+(?:delete|remove|hatao|nikalo)/i.test(trimmedInput)) {
            let title = 'Selected Task';
            let targetId = 't-1';
            if (/sla|cloud|2|second|doosra/i.test(trimmedInput)) {
              title = 'Approve Cloud Infrastructure Enterprise SLA';
              targetId = 't-2';
            }
            data = {
              reply: `Task "${title}" pipeline se successfully delete aur remove kar diya gaya hai.`,
              action: { actionType: 'DELETE_TASK', details: { title, taskId: targetId } },
            };
          }
          // Practical Meeting Scheduling
          else if (/(?:schedule|add|set|nayi|book)\s+(?:meeting|session|call|appointment)|(?:meeting|session)\s+(?:schedule|add|rakho|banao)/i.test(trimmedInput)) {
            let meetingTitle = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please|bhai|janab)\s+/gi, '')
              .replace(/(?:schedule|add|set|nayi|book|meeting|session|call|appointment|rakho|banao|:)+/gi, ' ')
              .trim();
            if (!meetingTitle || meetingTitle.length < 3) meetingTitle = 'Executive Strategy Session';
            else meetingTitle = meetingTitle.charAt(0).toUpperCase() + meetingTitle.slice(1);

            data = {
              reply: `Hukum Janab! Meeting "${meetingTitle}" (16:00 - 17:00) aapke schedule mein successfully add kar di gayi hai.`,
              action: { actionType: 'SCHEDULE_MEETING', details: { title: meetingTitle, timeStart: '16:00', timeEnd: '17:00' } },
            };
          }
          // Practical Email Dispatch
          else if (/(?:send|dispatch|bhejo)\s+(?:email|mail|reply)|(?:email|mail|reply)\s+(?:send|bhejo|dispatch)|reply\s+to\s+(?:marcus|tariq)/i.test(trimmedInput)) {
            const isTariq = /tariq/i.test(trimmedInput);
            const recipient = isTariq ? 'Dr. Tariq Al-Mansoor' : 'Marcus Vance';
            data = {
              reply: `${recipient} ko approved email reply encrypted SMTP bridge se dispatch kar diya hai!`,
              action: { actionType: 'SEND_EMAIL', details: { recipient, emailId: isTariq ? 'em-2' : 'em-1' } },
            };
          }
          // Explain Completed & Ongoing Work
          else if (/kya kya kiya|kya kaam kiya|explain.*work|ongoing work|done so far|kaam batao|update do|status report|audit|progress/i.test(trimmedInput)) {
            data = {
              reply:
                'Boss, main mukammal status report pesh karta hoon! Completed Work me: 1) Board Strategy ke baad meeting overlap buffer inject kiya, 2) 14 emails triage karke Series B draft tayyar kiya, 3) Tesla cabin 21°C par pre-condition kiya (Battery 84%), 4) Karak Chai aur custom vocabulary memory me add kiye. Ongoing work me: Calendar Watchdog har 60s monitor kar raha hai aur VIP WhatsApp triage active hai. Operations Audit Hub open kar raha hoon!',
              action: { actionType: 'SHOW_WORK_AUDIT', details: {} },
            };
          }
          // Media Control Directives: Stop / Off
          else if (/band karo|stop music|stop song|pause|gana roko|off karo|music off|chup karo|mute karo/i.test(trimmedInput)) {
            data = {
              reply: 'Gana foran band kar diya hai Boss! Silence restore ho gayi hai, streaming completely off hai.',
              action: { actionType: 'STOP_MEDIA', details: {} },
            };
          }
          // Media Control Directives: Next / Change
          else if (/next song|change music|gana badlo|agla gana|change song|kuch aur chalao/i.test(trimmedInput)) {
            data = {
              reply: 'Next song play kar diya hai Boss! Playlist queue se agla track active hai.',
              action: { actionType: 'NEXT_MEDIA', details: {} },
            };
          }
          // Media Control Directives: Add to playlist / queue
          else if (/add to (playlist|list|queue)|list mein daal|queue mein add/i.test(trimmedInput)) {
            data = {
              reply: 'Hukum Boss! Song aapki active playlist queue mein add ho gaya hai.',
              action: { actionType: 'ADD_TO_PLAYLIST', details: { query: trimmedInput } },
            };
          }
          // Calling contacts
          else if (/call|phone karo|phone milao/i.test(trimmedInput)) {
            let contact = 'Cheetah';
            if (/kamran|kaptaan/i.test(trimmedInput)) contact = 'Kaptaan';
            else if (/sara|cfo/i.test(trimmedInput)) contact = 'Sara CFO';
            else if (/doctor|daniyal/i.test(trimmedInput)) contact = 'Doctor Sahab';
            else if (/fatima|legal/i.test(trimmedInput)) contact = 'Fatima Legal';
            else if (/asad|driver|chote/i.test(trimmedInput)) contact = 'Chote / Driver';

            data = {
              reply: `Hukum sar ankhon par Boss! ${contact} ko cellular call mila raha hoon. Line connect ho rahi hai!`,
              action: { actionType: 'CALL_CONTACT', details: { contactName: contact } },
            };
          }
          // WhatsApp Messaging
          else if (/whatsapp|wa message|message bhejo/i.test(trimmedInput)) {
            let contact = 'Cheetah';
            if (/kamran|kaptaan/i.test(trimmedInput)) contact = 'Kaptaan';
            else if (/sara/i.test(trimmedInput)) contact = 'Sara CFO';

            data = {
              reply: `Boss, ${contact} ke liye WhatsApp message draft ready hai. Quick dispatch open kar raha hoon!`,
              action: { actionType: 'SEND_WHATSAPP', details: { contactName: contact, message: trimmedInput } },
            };
          }
          // Jokes & Jugtain
          else if (/joke|lateefa|jugat|funny/i.test(trimmedInput)) {
            data = {
              reply:
                'Chaudhry Sahab ne nai Tesla le li! Dost ne pucha: "Chaudhry Sahab, battery kinni der chaldi ae?" Chaudhry bola: "Oye jado tak meri call mukdi nai, odo tak jahaz rukda ee nai! Te jado battery mukdi ae, do litre doodh patti pa daina aan!"',
              action: { actionType: 'CRACK_JOKE', details: { type: 'jugat' } },
            };
          }
          // Stories & Dastangoi
          else if (/story|kahani|dastangoi|dastan/i.test(trimmedInput)) {
            data = {
              reply:
                'Suno ae ahl-e-hosh! Dastan yeh hai ke aik Ba-Kamaal Wazir ko hazaron masail mein aisi thakan hui ke usne AURA ko talab kiya. AURA ne na sirf hikmat-e-amli banayi balkay hansi aur sangeet se zehni sukoon bakhsha!',
              action: { actionType: 'TELL_STORY', details: { type: 'dastangoi' } },
            };
          }
          // Auto-learning preferences
          else if (/pasand hai|love|like|favourite|favorite/i.test(trimmedInput)) {
            data = {
              reply: 'Noted Boss! Maine aapki personal memory profile mein yeh liking save kar li hai.',
              action: { actionType: 'LEARN_PREFERENCE', details: { content: trimmedInput } },
            };
          } else if (/pasand nahi|hate|dislike/i.test(trimmedInput)) {
            data = {
              reply: 'Samajh gaya Boss! Yeh cheez aapke dislike avoidance rules mein add ho gayi hai.',
              action: { actionType: 'LEARN_DISLIKE', details: { content: trimmedInput } },
            };
          } else if (/bulata hoon|matlab hai|nickname/i.test(trimmedInput)) {
            data = {
              reply: 'Got it Boss! Custom vocabulary aur nickname profile mein add ho gaya hai.',
              action: { actionType: 'LEARN_VOCABULARY', details: { content: trimmedInput } },
            };
          }
          // Play Media
          else if (/play|chala|gana|song|music|video|coke studio|pasoori|lofi|lo-fi|jazz|youtube|suno/i.test(trimmedInput)) {
            let title = 'Pasoori - Coke Studio Season 14';
            let ytId = '5Eqb_-j3FDA';
            let mType: 'song' | 'video' = /video|youtube/i.test(trimmedInput) ? 'video' : 'song';

            if (/tu jhoom/i.test(trimmedInput)) {
              title = 'Tu Jhoom - Abida Parveen x Naseebo Lal';
              ytId = '7D4vNcK6D38';
            } else if (/afreen/i.test(trimmedInput)) {
              title = 'Afreen Afreen - Rahat Fateh Ali Khan & Momina Mustehsan';
              ytId = 'kw4tT7SCmaY';
            } else if (/tajdar/i.test(trimmedInput)) {
              title = 'Tajdar-e-Haram - Atif Aslam';
              ytId = 'a18py61E6Ec';
            } else if (/lofi|lo-fi|study|focus/i.test(trimmedInput)) {
              title = 'Lofi Hip Hop - Deep Work & Study Beats';
              ytId = 'jfKfPfyJRdk';
            } else if (/zimmer|interstellar/i.test(trimmedInput)) {
              title = 'Hans Zimmer - Interstellar Main Suite Live';
              ytId = 'UDVtMYqUAyw';
            } else if (/jazz/i.test(trimmedInput)) {
              title = 'Late Night Executive Jazz Lounge';
              ytId = 'Dx5qFachd3A';
            }

            data = {
              reply: `Hukum sar ankhon par Boss! "${title}" play kar diya hai. Executive Media Lounge background mein active hai!`,
              action: {
                actionType: 'PLAY_MEDIA',
                details: {
                  title,
                  query: trimmedInput,
                  mediaType: mType,
                  youtubeId: ytId,
                },
              },
            };
          } else if (/research|search website|web search|google|competitor|market analysis|website check|analyze url|look up/i.test(trimmedInput)) {
            const cleanQuery = trimmedInput.replace(/aura|research|search website|web search|google|karo|check|karain|bhai|janab/gi, '').trim() || 'Global Tech Market Intelligence';
            data = {
              reply: `Boss, "${cleanQuery}" par real-time web search aur deep intelligence dossier initiate kar di hai. AURA Web Research Hub check karein!`,
              action: {
                actionType: 'WEB_RESEARCH',
                details: {
                  query: cleanQuery,
                  depth: 'deep',
                },
              },
            };
          } else if (/overlap|conflict|meeting|reschedule|shift|میٹنگ|ری شیڈول/i.test(trimmedInput)) {
            data = {
              reply:
                'Arrey Boss tension na lo! Schedule check kar liya hai, 15-minute buffer daal kar meeting reschedule kar di hai.',
              action: {
                actionType: 'RESCHEDULE_EVENT',
                details: { reason: 'Resolved meeting overlap with 15m buffer' },
              },
            };
          } else if (/tesla|car|gari|ac|گاڑی|ٹیسلا/i.test(trimmedInput)) {
            data = {
              reply:
                'Hukum sar ankhon par boss! Tesla Model S ka AC 21°C par chalu kar diya hai!',
              action: { actionType: 'CAR_CONTROL', details: { targetTemp: 21, climateActive: true } },
            };
          } else if (/schedule|calendar|aaj kya hai|شیڈول|کیلنڈر/i.test(trimmedInput)) {
            data = {
              reply: 'Master Calendar aur Schedule Hub open kar diya hai. Overlap aur VIP sessions verify ho chukay hain.',
              action: { actionType: 'SHOW_SCHEDULE', details: {} },
            };
          } else if (/tasks|deliverable|kaam|todo|ٹاسک/i.test(trimmedInput)) {
            data = {
              reply: 'Executive Deliverables & Task Management Hub active hai. Aapke board resolutions ready hain!',
              action: { actionType: 'SHOW_TASKS', details: {} },
            };
          } else if (/wellness|health|sleep|water|sehat|صحت/i.test(trimmedInput)) {
            data = {
              reply: 'Executive Biometric Health telemetry open kar di hai. Sleep 91% aur HRV optimal hai!',
              action: { actionType: 'SHOW_WELLNESS', details: {} },
            };
          } else if (/create.*(?:presentation|deck|slides)|(?:presentation|deck|slides).*(?:create|banao|tayyar)|deck|presentation|slides|سلائیڈ/i.test(trimmedInput)) {
            const topic = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please|bhai|janab)\s+/gi, '')
              .replace(/(?:create|generate|make|build|banao|tayyar|karo|deck|presentation|slides|pitch|par|ki|کا|کی|کے لیے|سلائیڈ|پریزنٹیشن)+/gi, ' ')
              .trim() || 'Autonomous Operations Strategy';
            data = {
              reply: `Hukum Janab! "${topic}" par presentation deck create kar diya hai aur slides live viewer mein open ho gayi hain!`,
              action: { actionType: 'GENERATE_DECK', details: { topic } },
            };
          } else if (/wipe.*sample|delete.*sample|clear.*sample|clean slate|start clean|data.*delete|سارا ڈیٹا ڈیلیٹ|ڈیٹا ختم/i.test(trimmedInput)) {
            data = {
              reply: 'Tamam sample data delete aur wipe kar diya gaya hai Boss! Clean slate ready hai, ab aap apne mutabiq nayi cheezein create karein.',
              action: { actionType: 'WIPE_SAMPLE_DATA', details: {} },
            };
          } else if (/(?:turn\s+on|turn\s+off|switch\s+on|switch\s+off|jalao|band\s+karo|dim)\s+(?:lights?|lamp|batti)|(?:lights?|batti)\s+(?:on|off|jalao|band|dim)|روشن کرو|بتی جل/i.test(trimmedInput)) {
            const isOff = /off|band|bujhao|بند/i.test(trimmedInput);
            data = {
              reply: isOff
                ? 'Smart lights band kar di hain aur low power standby engage ho gaya hai.'
                : 'Hukum Boss! Smart lights on kar di hain aur executive ambiance adjust ho gaya hai.',
              action: { actionType: 'LIGHT_CONTROL', details: { power: !isOff, mode: 'focus' } },
            };
          } else if (/bluetooth|headphones?|airpods|speaker|connect.*device|بلوٹوتھ/i.test(trimmedInput)) {
            const isDisconnect = /disconnect|unpair|hatao/i.test(trimmedInput);
            data = {
              reply: isDisconnect
                ? 'Bluetooth device disconnect kar diya gaya hai.'
                : 'Bose Ultra Headphones Bluetooth LE se successfully pair aur connect ho gaye hain!',
              action: { actionType: isDisconnect ? 'BLUETOOTH_DISCONNECT' : 'BLUETOOTH_CONNECT', details: { deviceName: 'Bose QuietComfort Ultra Headphones' } },
            };
          } else if (/ac\b|air conditioner|thermostat|kamra thanda|اے سی/i.test(trimmedInput)) {
            data = {
              reply: 'Nest Learning Thermostat aur AC 21°C par set kar diya hai.',
              action: { actionType: 'AC_CONTROL', details: { targetTemp: 21, power: true } },
            };
          } else if (/scan.*(?:wifi|devices?|bluetooth)|نیٹ ورک اسکین/i.test(trimmedInput)) {
            data = {
              reply: 'WiFi subnet scan mukammal: 8 WiFi IoT nodes aur 4 Bluetooth LE devices verified hain.',
              action: { actionType: 'SCAN_DEVICES', details: {} },
            };
          } else if (/tv\s*remote|control\s*tv|smart\s*tv|tv on|tv off|mute\s*tv|ٹی وی/i.test(trimmedInput)) {
            data = {
              reply: 'Living Room Smart TV Remote aur WiFi network device controller active ho gaya hai!',
              action: { actionType: 'CONTROL_TV', details: {} },
            };
          } else if (/open.*video|video player|ویڈیو پلیئر/i.test(trimmedInput)) {
            data = {
              reply: 'Executive Video Player open ho gaya hai with Play, Pause, Stop, Next aur Minimize controls!',
              action: { actionType: 'OPEN_VIDEO', details: {} },
            };
          } else if (/minimize|pip/i.test(trimmedInput)) {
            data = {
              reply: 'Player ko floating Picture-in-Picture window mein minimize kar diya hai.',
              action: { actionType: 'MINIMIZE_PLAYER', details: {} },
            };
          } else if (/fullscreen|full screen|فل اسکرین/i.test(trimmedInput)) {
            data = {
              reply: 'Full screen mode engage ho gaya hai!',
              action: { actionType: 'FULLSCREEN_PLAYER', details: {} },
            };
          } else if (/kaisay ho|kaise ho|kya haal|kya chal raha|sab theek|sab kheriat/i.test(trimmedInput)) {
            data = {
              reply: 'Shukr Allah ka Boss, bilkul fit aur 100% alert hoon! Tamam executive systems, calendar watchdogs aur smart devices online hain. Aap sunayein, aaj kis project ya task par focus karein?',
              action: null,
            };
          } else if (/kaun ho|tum kaun ho|aap kaun hain|kya naam hai|introduce|apna taaruf/i.test(trimmedInput)) {
            data = {
              reply: 'Main AURA hoon — aapka Autonomous Executive AI Chief of Staff. Main aapke schedules, emails, smart car & home automation, documents, aur deep web research ko autonomously manage karta hoon. Hukum farmayein!',
              action: null,
            };
          } else if (/kya kar saktay ho|kya kar sakte ho|capabilities|features|madad|help|kya aata hai/i.test(trimmedInput)) {
            data = {
              reply: 'Boss, main yeh sab autonomously sambhal sakta hoon:\n1. Calendar scheduling aur meeting overlap resolution\n2. Smart Home, Tesla AC aur lighting controls\n3. Executive email triage aur WhatsApp drafts\n4. Pitch decks aur formal reports generate karna\n5. Real-time deep web research aur market intelligence\nHukum karein, abhi kya shuru karoon?',
              action: null,
            };
          } else if (/sun rahay ho|sun rahe ho|awaaz aa rahi|sunai de raha|listening|testing|test/i.test(trimmedInput)) {
            data = {
              reply: 'Jee Boss, bilkul saaf aur crystal-clear sun raha hoon! Microphone aur neural acoustic engine active hain. Hukum karein!',
              action: null,
            };
          } else if (/time kya hai|waqt kya hai|kitne baje|aaj kya date|tareekh kya hai/i.test(trimmedInput)) {
            const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
            data = {
              reply: `Boss, is waqt ${nowStr} ho rahay hain (${dateStr}). Aapka agla executive slot schedule hub mein update hai.`,
              action: null,
            };
          } else if (/shukriya|meherbani|jazakallah|thanks|thank you/i.test(trimmedInput)) {
            data = {
              reply: 'Koyi baat nahi Janab, yeh meri zimmedari hai! AURA hamesha aapki khidmat aur executive operations ke liye hazir hai.',
              action: null,
            };
          } else if (/subah bakhair|good morning|shab bakhair|good night/i.test(trimmedInput)) {
            data = {
              reply: 'Khush aamdeed Boss! Aapka din productive aur kamyab rahay. Main schedule aur priorities update karke bilkul tayyar hoon.',
              action: null,
            };
          } else {
            // Dynamic Intelligent Urdu Executive Parsing & Question Answering
            const cleanText = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please|kindly|bhai|janab|zara|foran)\s+/gi, '')
              .trim();

            // 1. Daily Executive Summary & Work Done
            if (/summary|aaj\s+ki\s+summary|kya\s+kaam\s+kiya|kaam\s+batao|daily\s+brief|aaj\s+ka\s+hisab|overview/i.test(cleanText)) {
              data = {
                reply: `Boss, yeh raha aaj ka executive operations brief:\n1. 3 priority deliverables executed, Board meeting ke baad 15-minute cognitive reset buffer active hai.\n2. Tesla Plaid 21°C par pre-conditioned hai aur Flight BA-2490 pickup coordinate ho chuki hai.\n3. Continuous Watchdogs schedule aur VIP communications actively monitor kar rahe hain.`,
                action: { actionType: 'SHOW_WORK_AUDIT', details: {} },
              };
            }
            // 2. Schedule & Agenda Check
            else if (/schedule|agenda|meetings?|calendar|aaj\s+kya\s+hai|slot/i.test(cleanText)) {
              data = {
                reply: `Boss, aaj Global Board Strategy session (10:00-11:30) protected buffer ke sath synchronized hai, phir Series B sync (11:45) scheduled hai. Schedule Hub open kar diya hai!`,
                action: { actionType: 'SHOW_SCHEDULE', details: {} },
              };
            }
            // 3. Burnout Risk & Focus Time Check
            else if (/burnout|cognitive|focus\s*time|buffer|thakan|mental\s+load|fatigue/i.test(cleanText)) {
              data = {
                reply: `Boss, sequential meeting density analysis ke mutabiq midday burnout risk (82%) ko 15-minute cognitive reset buffer rule ne neutralize karke focus time 3.5 hours maintain rakha hai.`,
                action: { actionType: 'SHOW_SCHEDULE', details: { view: 'burnout' } },
              };
            }
            // 4. Travel Intelligence & Airport Pickup
            else if (/travel|flight|airport|pickup|heathrow|terminal|tesla\s+pickup/i.test(cleanText)) {
              data = {
                reply: `Boss, Travel Intelligence monitor active hai: Flight BA-2490 Heathrow Terminal 5 par 17:45 land karegi. Autonomous Tesla Plaid pickup coordinate ho chuki hai. Concierge tab open kar diya hai!`,
                action: { actionType: 'SHOW_CONCIERGE', details: { category: 'travel' } },
              };
            }
            // 5. Tasks & Deliverables Check (Without creating false task)
            else if (/tasks?|deliverables?|todos?|pending\s+kaam|kya\s+baqi\s+hai/i.test(cleanText) && !/(?:add|create|banao|likho|daalo|shamil)/i.test(cleanText)) {
              data = {
                reply: `Boss, pipeline mein 2 critical deliverables hain: Ratify Q3 Board Resolution aur Approve Cloud Infrastructure Enterprise SLA.`,
                action: { actionType: 'SHOW_TASKS', details: {} },
              };
            }
            // 6. Explicit Task Creation ONLY
            else if (/(?:add|create|banao|likho|daalo|shamil)\s+(?:task|todo|deliverable|kaam)|(?:remind\s+me\s+to|yaad\s+dilao)/i.test(cleanText)) {
              const taskTitle = cleanText
                .replace(/(?:add|create|banao|likho|daalo|shamil|task|todo|deliverable|kaam|remind\s+me\s+to|yaad\s+dilao)+/gi, ' ')
                .trim() || 'Executive Strategic Priority';
              const formattedTask = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
              data = {
                reply: `Hukum Boss! Naya task "${formattedTask}" executive deliverables pipeline mein shamil kar diya hai aur Firestore par sync kar diya hai.`,
                action: { actionType: 'CREATE_TASK', details: { title: formattedTask, priority: 'high', deadline: 'Today 18:00' } },
              };
            }
            // 7. Deep Web Research Query
            else if (/research|google|search|investigate|market\s+data|competitor/i.test(cleanText)) {
              data = {
                reply: `Boss, "${cleanText}" par real-time research dossier compile kar raha hoon. Web Research Hub open kar diya hai!`,
                action: { actionType: 'WEB_RESEARCH', details: { query: cleanText } },
              };
            }
            // 8. General Conversational Variety
            else {
              const replies = [
                `Jee Janab! AURA alert hai aur aapke command ka muntazir hai. Bataiye agla operational step kya execute karoon?`,
                `Hukum karein Boss! Tamam executive watchdogs online hain — schedule, tasks ya automation mein kya madad karoon?`,
                `Samajh gaya Boss. System synchronized hai aur priorities align hain. Hukum farmayein!`,
                `AURA Chief of Staff hazir hai. Koi meeting schedule karni hai, email triage dekhni hai ya Tesla status check karni hai?`,
              ];
              const hash = cleanText.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
              data = {
                reply: replies[Math.abs(hash) % replies.length],
                action: null,
              };
            }
          }
        } else {
          // English Fallback Handlers
          if (/(?:add|create|new)\s+(?:task|todo|deliverable)|(?:task|todo)\s+(?:add|create)/i.test(trimmedInput)) {
            let taskTitle = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please)\s+/gi, '')
              .replace(/(?:add|create|task|todo|deliverable|:)+/gi, ' ')
              .trim();
            if (!taskTitle || taskTitle.length < 3) taskTitle = 'Executive Strategic Task';
            else taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);

            data = {
              reply: `Task "${taskTitle}" has been successfully created and queued in your executive deliverables.`,
              action: { actionType: 'CREATE_TASK', details: { title: taskTitle, priority: 'high', deadline: 'Today 18:00' } },
            };
          } else if (/(?:complete|execute|resolve|finish|approve|ratify)\s+(?:task|todo|resolution|deliverable|sla)/i.test(trimmedInput)) {
            let title = 'Ratify Q3 Board Resolution & Treasury Disclosures';
            let targetId = 't-1';
            if (/sla|cloud|2|second/i.test(trimmedInput)) {
              title = 'Approve Cloud Infrastructure Enterprise SLA';
              targetId = 't-2';
            }
            data = {
              reply: `Task "${title}" executed and marked as completed on your behalf.`,
              action: { actionType: 'COMPLETE_TASK', details: { title, taskId: targetId } },
            };
          } else if (/(?:delete|remove)\s+(?:task|todo|deliverable)/i.test(trimmedInput)) {
            let title = 'Ratify Q3 Board Resolution & Treasury Disclosures';
            let targetId = 't-1';
            if (/sla|cloud|2|second/i.test(trimmedInput)) {
              title = 'Approve Cloud Infrastructure Enterprise SLA';
              targetId = 't-2';
            }
            data = {
              reply: `Task "${title}" has been deleted and removed from your executive pipeline.`,
              action: { actionType: 'DELETE_TASK', details: { title, taskId: targetId } },
            };
          } else if (/(?:schedule|add|set|book)\s+(?:meeting|session|call|appointment)/i.test(trimmedInput)) {
            let meetingTitle = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please)\s+/gi, '')
              .replace(/(?:schedule|add|set|book|meeting|session|call|appointment|:)+/gi, ' ')
              .trim();
            if (!meetingTitle || meetingTitle.length < 3) meetingTitle = 'Executive Strategy Session';
            else meetingTitle = meetingTitle.charAt(0).toUpperCase() + meetingTitle.slice(1);

            data = {
              reply: `Meeting "${meetingTitle}" (16:00 - 17:00) has been added to your master calendar.`,
              action: { actionType: 'SCHEDULE_MEETING', details: { title: meetingTitle, timeStart: '16:00', timeEnd: '17:00' } },
            };
          } else if (/(?:send|dispatch)\s+(?:email|mail|reply)|reply\s+to\s+(?:marcus|tariq)/i.test(trimmedInput)) {
            const isTariq = /tariq/i.test(trimmedInput);
            const recipient = isTariq ? 'Dr. Tariq Al-Mansoor' : 'Marcus Vance';
            data = {
              reply: `Approved response dispatched to ${recipient} via executive mail bridge.`,
              action: { actionType: 'SEND_EMAIL', details: { recipient, emailId: isTariq ? 'em-2' : 'em-1' } },
            };
          } else if (/what have you done|what are you working on|ongoing work|explain.*work|status report|work audit|progress update|what did you do/i.test(trimmedInput)) {
            data = {
              reply:
                'Here is your executive operations audit: Completed operations include calendar overlap buffer injection, triage of 14 executive emails, Tesla cabin pre-conditioning to 21.0°C, and memory synchronization. Ongoing work in progress includes the Calendar Watchdog checking every 60s, VIP communication monitoring, and deep web intelligence scraping. Opening the Work Audit Hub now.',
              action: { actionType: 'SHOW_WORK_AUDIT', details: {} },
            };
          } else if (/stop music|stop song|pause music|turn off music|mute music|quiet/i.test(trimmedInput)) {
            data = {
              reply: 'Music playback stopped and turned off immediately.',
              action: { actionType: 'STOP_MEDIA', details: {} },
            };
          } else if (/next song|change song|change music|play next|skip song/i.test(trimmedInput)) {
            data = {
              reply: 'Switched to the next track in your executive playlist.',
              action: { actionType: 'NEXT_MEDIA', details: {} },
            };
          } else if (/add to (playlist|queue|list)|queue song/i.test(trimmedInput)) {
            data = {
              reply: 'Track has been successfully added to your active playlist queue.',
              action: { actionType: 'ADD_TO_PLAYLIST', details: { query: trimmedInput } },
            };
          } else if (/call|dial|phone/i.test(trimmedInput)) {
            let contact = 'Cheetah';
            if (/kamran|kaptaan/i.test(trimmedInput)) contact = 'Kaptaan';
            else if (/sara|cfo/i.test(trimmedInput)) contact = 'Sara CFO';
            else if (/doctor|daniyal/i.test(trimmedInput)) contact = 'Doctor Sahab';
            else if (/fatima|legal/i.test(trimmedInput)) contact = 'Fatima Legal';
            else if (/driver|asad/i.test(trimmedInput)) contact = 'Chote / Driver';

            data = {
              reply: `Initiating cellular call to ${contact}. Establishing secure line now.`,
              action: { actionType: 'CALL_CONTACT', details: { contactName: contact } },
            };
          } else if (/whatsapp|message|text/i.test(trimmedInput)) {
            let contact = 'Cheetah';
            if (/kamran|kaptaan/i.test(trimmedInput)) contact = 'Kaptaan';
            else if (/sara/i.test(trimmedInput)) contact = 'Sara CFO';

            data = {
              reply: `WhatsApp message drafted for ${contact}. Opening dispatch window.`,
              action: { actionType: 'SEND_WHATSAPP', details: { contactName: contact, message: trimmedInput } },
            };
          } else if (/joke|humor|laugh|crack a joke/i.test(trimmedInput)) {
            data = {
              reply:
                'An executive asked AURA: "How much battery is left in my brain after 5 consecutive back-to-back Zoom calls?" AURA replied: "-15% with emergency cooling active. Prescribing 2 cups of hot Karak Chai immediately!"',
              action: { actionType: 'CRACK_JOKE', details: { type: 'joke' } },
            };
          } else if (/story|tell a story|folklore|inspiration/i.test(trimmedInput)) {
            data = {
              reply:
                'In 1997, Steve Jobs walked back into Apple with only 90 days of cash remaining. He drew a 2x2 matrix: Consumer, Pro, Desktop, Portable. "We kill the rest. We focus." Within 18 months, Apple posted its first profit. Focus is having the courage to say no.',
              action: { actionType: 'TELL_STORY', details: { type: 'story' } },
            };
          } else if (/play|song|music|video|coke studio|pasoori|lofi|lo-fi|jazz|youtube|listen/i.test(trimmedInput)) {
            let title = 'Pasoori - Coke Studio Season 14';
            let ytId = '5Eqb_-j3FDA';
            let mType: 'song' | 'video' = /video|youtube/i.test(trimmedInput) ? 'video' : 'song';

            if (/lofi|lo-fi|study|focus/i.test(trimmedInput)) {
              title = 'Lofi Hip Hop - Deep Work & Study Beats';
              ytId = 'jfKfPfyJRdk';
            } else if (/zimmer|interstellar/i.test(trimmedInput)) {
              title = 'Hans Zimmer - Interstellar Main Suite Live';
              ytId = 'UDVtMYqUAyw';
            } else if (/jazz/i.test(trimmedInput)) {
              title = 'Late Night Executive Jazz Lounge';
              ytId = 'Dx5qFachd3A';
            }

            data = {
              reply: `Now playing "${title}" in the Executive Media Lounge. Full playback controls and Picture-in-Picture mode active.`,
              action: {
                actionType: 'PLAY_MEDIA',
                details: {
                  title,
                  query: trimmedInput,
                  mediaType: mType,
                  youtubeId: ytId,
                },
              },
            };
          } else if (/research|search website|web search|google|competitor|market analysis|website check|analyze url|look up/i.test(trimmedInput)) {
            const cleanQuery = trimmedInput.replace(/aura|research|search website|web search|google|please|analyze/gi, '').trim() || 'Enterprise Market Intelligence';
            data = {
              reply: `Deep web research initiated on "${cleanQuery}". Executive synthesis and verified source citations are now available in the Web Research Hub.`,
              action: {
                actionType: 'WEB_RESEARCH',
                details: {
                  query: cleanQuery,
                  depth: 'deep',
                },
              },
            };
          } else if (/reschedule|meeting|schedule|overlap/i.test(trimmedInput)) {
            data = {
              reply:
                'Schedule analyzed. 15-minute transition buffer inserted between conflicting executive meetings.',
              action: {
                actionType: 'RESCHEDULE_EVENT',
                details: { reason: 'Inserted 15-minute buffer' },
              },
            };
          } else if (/tesla|climate|car/i.test(trimmedInput)) {
            data = {
              reply: 'Tesla cabin pre-conditioning activated at 21°C. Route uploaded.',
              action: { actionType: 'CAR_CONTROL', details: { targetTemp: 21, climateActive: true } },
            };
          } else if (/show schedule|view calendar|agenda|itinerary/i.test(trimmedInput)) {
            data = {
              reply: 'Master Calendar opened. All executive meetings and conflict buffers are active.',
              action: { actionType: 'SHOW_SCHEDULE', details: {} },
            };
          } else if (/show tasks|view tasks|deliverables|action items/i.test(trimmedInput)) {
            data = {
              reply: 'Navigating to Executive Task and Deliverable management hub.',
              action: { actionType: 'SHOW_TASKS', details: {} },
            };
          } else if (/wellness|biometrics|health metrics|sleep score/i.test(trimmedInput)) {
            data = {
              reply: 'Executive Biometric Health telemetry opened. Vitals and HRV are optimal.',
              action: { actionType: 'SHOW_WELLNESS', details: {} },
            };
          } else if (/create.*(?:presentation|deck|slides)|(?:presentation|deck|slides).*(?:create|make|generate)|deck|presentation|slides/i.test(trimmedInput)) {
            const topic = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please)\s+/gi, '')
              .replace(/(?:create|generate|make|build|deck|presentation|slides|pitch|about|on|for)+/gi, ' ')
              .trim() || 'Autonomous Operations Strategy';
            data = {
              reply: `Understood, Chief! I have generated the presentation on "${topic}". All slides have been created on the ground and loaded into your viewer.`,
              action: { actionType: 'GENERATE_DECK', details: { topic } },
            };
          } else if (/wipe.*sample|delete.*sample|clear.*sample|clean slate|start clean/i.test(trimmedInput)) {
            data = {
              reply: 'All sample data has been wiped clean from the application. You now have a clean slate to create your own presentations, tasks, and documents.',
              action: { actionType: 'WIPE_SAMPLE_DATA', details: {} },
            };
          } else if (/(?:turn\s+on|turn\s+off|switch\s+on|switch\s+off|dim)\s+(?:lights?|lamp)|(?:lights?)\s+(?:on|off|dim)/i.test(trimmedInput)) {
            const isOff = /off/i.test(trimmedInput);
            data = {
              reply: isOff
                ? 'Smart lights turned off into low power standby.'
                : 'Smart lights turned on with executive focus illumination active.',
              action: { actionType: 'LIGHT_CONTROL', details: { power: !isOff, mode: 'focus' } },
            };
          } else if (/bluetooth|headphones?|airpods|speaker|pair|connect.*device/i.test(trimmedInput)) {
            const isDisconnect = /disconnect|unpair/i.test(trimmedInput);
            data = {
              reply: isDisconnect
                ? 'Bluetooth peripheral disconnected.'
                : 'Bose Ultra Headphones paired and connected over Bluetooth LE.',
              action: { actionType: isDisconnect ? 'BLUETOOTH_DISCONNECT' : 'BLUETOOTH_CONNECT', details: { deviceName: 'Bose QuietComfort Ultra Headphones' } },
            };
          } else if (/ac\b|air conditioner|thermostat|climate|temperature/i.test(trimmedInput)) {
            data = {
              reply: 'Nest Learning Thermostat set to 21°C in executive cooling mode.',
              action: { actionType: 'AC_CONTROL', details: { targetTemp: 21, power: true } },
            };
          } else if (/scan.*(?:wifi|devices?|bluetooth)/i.test(trimmedInput)) {
            data = {
              reply: 'Subnet scan complete: 8 WiFi IoT devices and 4 Bluetooth LE nodes verified.',
              action: { actionType: 'SCAN_DEVICES', details: {} },
            };
          } else if (/tv\s*remote|control\s*tv|smart\s*tv|turn.*tv|mute.*tv/i.test(trimmedInput)) {
            data = {
              reply: 'Smart TV remote and WiFi network device controller opened.',
              action: { actionType: 'CONTROL_TV', details: {} },
            };
          } else if (/open.*video|video player/i.test(trimmedInput)) {
            data = {
              reply: 'Executive Video Player launched with complete playback and picture-in-picture controls.',
              action: { actionType: 'OPEN_VIDEO', details: {} },
            };
          } else if (/minimize|pip/i.test(trimmedInput)) {
            data = {
              reply: 'Minimized media player to floating Picture-in-Picture dock.',
              action: { actionType: 'MINIMIZE_PLAYER', details: {} },
            };
          } else if (/full\s*screen/i.test(trimmedInput)) {
            data = {
              reply: 'Engaged full-screen mode.',
              action: { actionType: 'FULLSCREEN_PLAYER', details: {} },
            };
          } else if (/how are you|how do you feel|how's it going|how are things/i.test(trimmedInput)) {
            data = {
              reply: 'Operating at peak performance, Chief! All telemetry, calendar watchdogs, and executive automation pipelines are online. How may I direct our operational focus today?',
              action: null,
            };
          } else if (/who are you|what is your name|what are you|introduce yourself/i.test(trimmedInput)) {
            data = {
              reply: 'I am AURA — your Autonomous Universal Routine Administrator and AI Chief of Staff. I oversee your calendar, manage smart home and Tesla connectivity, triage communications, draft decks, and perform deep market research.',
              action: null,
            };
          } else if (/what can you do|capabilities|features|help me|what do you do/i.test(trimmedInput)) {
            data = {
              reply: 'Here is my executive mandate, Chief:\n1. Master calendar management & zero-minute overlap resolution\n2. Smart home ambiance, AC thermostat & vehicle climate control\n3. Executive email triage and VIP WhatsApp dispatch\n4. Real-time web intelligence dossier generation\n5. Strategic deck creation & confidential document drafting\nWhat directive would you like to execute?',
              action: null,
            };
          } else if (/can you hear me|are you listening|audio check|mic check|test|testing/i.test(trimmedInput)) {
            data = {
              reply: 'Loud and clear, Chief! Microphone sensitivity and neural transcription are fully locked in and primed for your directives.',
              action: null,
            };
          } else if (/what time is it|what's the time|current time|today's date|what date is it/i.test(trimmedInput)) {
            const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
            data = {
              reply: `The current time is ${nowStr} (${dateStr}). Your next executive agenda item is queued in the schedule hub.`,
              action: null,
            };
          } else if (/thank you|thanks a lot|much appreciated/i.test(trimmedInput)) {
            data = {
              reply: 'Always at your service, Chief. Maintaining operational velocity is my mandate.',
              action: null,
            };
          } else if (/good morning|good afternoon|good evening|good day/i.test(trimmedInput)) {
            data = {
              reply: 'Good day, Chief! Morning executive pulse is initialized, all priority briefings are ready, and systems are standing by for your directives.',
              action: null,
            };
          } else {
            // Dynamic Layman Directive Synthesis & Executive Intelligence
            const cleanTitle = trimmedInput
              .replace(/^(?:hey\s+)?(?:aura|please|kindly|foran|zara|can you|could you)\s+/gi, '')
              .trim();

            // 1. Daily Executive Summary & Work Audit
            if (/summary|today(?:'s)?\s+summary|daily\s+summary|what\s+have\s+you\s+done|what\s+are\s+you\s+working\s+on|ongoing\s+work|explain.*work|status\s+report|work\s+audit|progress\s+update|what\s+did\s+you\s+do|daily\s+brief/i.test(cleanTitle)) {
              data = {
                reply: 'Here is your executive operations audit & daily brief:\n• Completed Operations: 3 key deliverables executed, 15-minute cognitive reset buffer applied, and Tesla Plaid pre-conditioned at 21.0°C.\n• Travel Intelligence: Synced Flight BA-2490 airport arrival with autonomous Tesla ground pickup.\n• Live Watchdogs: Autonomous Calendar Watchdog and VIP Communications triage monitoring in real time.',
                action: { actionType: 'SHOW_WORK_AUDIT', details: {} },
              };
            }
            // 2. Schedule & Agenda Check
            else if (/schedule|agenda|meetings?|calendar|today(?:'s)?\s+agenda/i.test(cleanTitle)) {
              data = {
                reply: 'Opening your Executive Master Schedule: Global Board Strategy Session is protected with a 15-minute cognitive reset buffer before the Series B Sync.',
                action: { actionType: 'SHOW_SCHEDULE', details: {} },
              };
            }
            // 3. Burnout Risk & Focus Time Check
            else if (/burnout|cognitive|focus\s*time|buffer|fatigue|mental\s+load/i.test(cleanTitle)) {
              data = {
                reply: 'Sequential meeting density algorithm detected a peak burnout risk (82%) around midday. The 15-minute cognitive reset buffer rule is maintaining focus time at 3.5 hours.',
                action: { actionType: 'SHOW_SCHEDULE', details: { view: 'burnout' } },
              };
            }
            // 4. Travel Intelligence & Airport Pickup
            else if (/travel|flight|airport|pickup|heathrow|terminal|tesla\s+pickup/i.test(cleanTitle)) {
              data = {
                reply: 'Travel Intelligence confirmed: Flight BA-2490 is on schedule arriving at 17:45 (Heathrow Terminal 5). Autonomous Tesla Plaid ground dispatch scheduled 20 minutes prior to touchdown.',
                action: { actionType: 'SHOW_CONCIERGE', details: { category: 'travel' } },
              };
            }
            // 5. Tasks Check (Without false task creation)
            else if (/tasks?|deliverables?|todos?|pending/i.test(cleanTitle) && !/(?:add|create|new)/i.test(cleanTitle)) {
              data = {
                reply: 'You have 2 high-priority deliverables queued: Ratify Q3 Board Resolution & Treasury Disclosures and Approve Cloud Infrastructure Enterprise SLA.',
                action: { actionType: 'SHOW_TASKS', details: {} },
              };
            }
            // 6. Explicit Task Creation ONLY
            else if (/(?:add|create|new)\s+(?:task|todo|deliverable)|(?:remind\s+me\s+to|put\s+on\s+my\s+list)/i.test(cleanTitle)) {
              const taskTitle = cleanTitle
                .replace(/(?:add|create|new|task|todo|deliverable|remind\s+me\s+to|put\s+on\s+my\s+list)+/gi, ' ')
                .trim() || 'Executive Strategic Priority';
              const formattedTask = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
              data = {
                reply: `Task "${formattedTask}" has been created and logged into your executive pipeline.`,
                action: { actionType: 'CREATE_TASK', details: { title: formattedTask, priority: 'high', deadline: 'Today 18:00' } },
              };
            }
            // 7. Research Query
            else if (/research|google|search|investigate|market\s+data|competitor/i.test(cleanTitle)) {
              data = {
                reply: `Initiating real-time intelligence research dossier for: "${cleanTitle}".`,
                action: { actionType: 'WEB_RESEARCH', details: { query: cleanTitle } },
              };
            }
            // 8. General Conversational Variety
            else {
              const englishVariations = [
                `Understood, Chief. All executive parameters are optimal and aligned. What specific operational objective shall we tackle?`,
                `Acknowledged, sir. Schedule watchdogs, VIP communications, and connected systems are operating smoothly.`,
                `Standing by, Chief. Would you like to review today's deliverables, inspect travel intelligence, or adjust your schedule?`,
                `Confirmed, sir. Systems are standing by for your directive.`,
              ];
              const choiceIndex = Math.abs(cleanTitle.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % englishVariations.length;
              data = {
                reply: englishVariations[choiceIndex],
                action: null,
              };
            }
          }
        }
        }
      }

      let reply = data?.reply || 'Instruction received and executed.';

      const resolvedAction = localDirective
        ? { actionType: localDirective.actionType, details: localDirective.details, summary: localDirective.summary }
        : data?.action;

      // Check anti-repetition memory with dynamic contextual variations (only if data did not come from live server)
      if (!data?.reply && recentRepliesRef.current.includes(reply)) {
        if (resolvedAction) {
          reply = language === 'ur_slang'
            ? `Hukum Boss! ${resolvedAction.summary || resolvedAction.actionType.replace(/_/g, ' ')} mukammal kar diya gaya hai.`
            : `Confirmed Chief: ${resolvedAction.summary || resolvedAction.actionType.replace(/_/g, ' ')} executed immediately.`;
        } else {
          const freshReplies = language === 'ur_slang' ? [
            `Jee Boss! AURA active hai, hukum farmayein agla deliverable kya execute karoon?`,
            `Samajh gaya Janab. Main fully synchronized hoon, agla task bataiye.`,
            `Theek hai Boss, har cheez update hai. Ready for your directive.`,
          ] : [
            `Acknowledged Chief. Operations are synchronized. What shall we tackle next?`,
            `Understood, sir. Routine logged and active. Ready for your next move.`,
            `Confirmed. All executive systems are aligned and ready.`,
          ];
          const idx = Math.abs(trimmedInput.length) % freshReplies.length;
          reply = freshReplies[idx];
        }
      }
      recentRepliesRef.current = [...recentRepliesRef.current.slice(-5), reply];

      setLastResponse(reply);
      setChatLog((prev) => [...prev, { sender: 'aura', text: reply, time: now, action: resolvedAction }]);
      setOrbState('speaking');

      if (resolvedAction) {
        // Continuous Neural Learning: reinforce AURA's command memory with the user's natural phrasing
        commandLearningEngine.learnCommand(
          trimmedInput,
          resolvedAction.actionType,
          resolvedAction.details,
          resolvedAction.summary
        );

        if (!actionExecutedLocally) {
          soundEffects.playSuccessChime();
          if (onExecuteAction) {
            onExecuteAction(resolvedAction.actionType, resolvedAction.details);
          }
        }
      }

      if (ttsEnabled) {
        setSpeakingState(true, reply);
        speakText(
          reply,
          language,
          () => {
            setSpeakingState(false);
            setOrbState('idle');
            // Resume listening almost immediately (150ms) so user can give follow-up commands without delay
            if (continuousMode && !micPermissionBlocked && isOpen) {
              setTimeout(() => {
                if (!isSpeaking() && isOpen) {
                  startListening();
                }
              }, 150);
            }
          },
          selectedVoiceId
        );
      } else {
        setTimeout(() => {
          setOrbState('idle');
          if (continuousMode && !micPermissionBlocked && isOpen) {
            startListening();
          }
        }, 800);
      }
    } catch (err: any) {
      console.warn('Notice: Handled voice interaction gracefully:', err?.message || err);
      const errorMsg =
        language === 'ur_slang'
          ? 'Boss, request process karne me halka masla aya hai, dobara boliye.'
          : 'Unable to connect to AURA core. Please repeat instruction.';
      setChatLog((prev) => [...prev, { sender: 'aura', text: errorMsg, time: now }]);
      setOrbState('idle');
    }
  };
  handleSendMessageRef.current = handleSendMessage;

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      soundEffects.playWakeChime();
      if (micPermissionBlocked) {
        await handleRequestLaptopMic();
      } else {
        startListening();
      }
    }
  };

  // Quick prompt suggestions
  const urduSuggestions = [
    'Board resolution approve karo',
    'Cloud SLA ($420) approve karo',
    'Naya task add karo: Q4 Strategy Review',
    'Meeting conflict fix karo 15m buffer ke sath',
    'Marcus ko email reply bhej do',
    'Tesla ka AC 21°C par chalao',
    'Pasoori Coke Studio gana chalao',
    'AURA kya kya kaam kiya hai? Report do',
    'Cheetah ko call milao',
    'WhatsApp message bhejo',
    'Deep research karo AI market par',
  ];

  const englishSuggestions = [
    'Approve Q3 Board Resolution ($42M)',
    'Approve Cloud Infrastructure SLA ($420)',
    'Create task: Review Q4 Budget',
    'Resolve meeting overlap with 15m buffer',
    'Send approved email reply to Marcus Vance',
    'Pre-condition Tesla cabin to 21°C',
    'Explain all your work and ongoing tasks',
    'Play Pasoori Coke Studio track',
    'Stop music playback',
    'Initiate call to Cheetah',
    'Deep research enterprise AI market',
  ];

  const currentSuggestions = language === 'ur_slang' || language === 'ur_script' ? urduSuggestions : englishSuggestions;

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopSpeaking();
          stopListening();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl h-[94vh] max-h-[860px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header - Guaranteed visible controls and Close button */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-slate-800/80 bg-slate-900/95 shrink-0 gap-2">
          {/* Left: Brand & Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <AuraOrb state={orbState} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-100 text-xs sm:text-sm tracking-wide truncate">
                  AURA Voice
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 border ${
                    orbState === 'speaking' || getSpeechCooldownRemaining() > 0
                      ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300'
                      : orbState === 'thinking'
                      ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                      : isListening
                      ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                      : micPermissionBlocked
                      ? 'bg-rose-950/80 border-rose-600/60 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  {orbState === 'speaking' || getSpeechCooldownRemaining() > 0
                    ? 'ECHO SHIELD ACTIVE'
                    : orbState === 'thinking'
                    ? 'ANALYZING VOICE...'
                    : isListening
                    ? 'VOICE SYNC: LISTENING'
                    : micPermissionBlocked
                    ? 'MIC BLOCKED'
                    : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden sm:block">
                {language === 'ur_slang'
                  ? 'Urdu Slang & English Bilingual Copilot'
                  : 'Hands-Free Ambient Voice Assistant'}
              </p>
            </div>
          </div>

          {/* Right: Controls & Guaranteed Visible Close Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Voice Identity Bio-Lock Button */}
            <button
              onClick={() => setShowVoiceIdentityModal(true)}
              title={
                voiceIdentityProfile?.isEnrolled && isVoiceIdentityEnforcedState
                  ? `Voice Identity Bio-Lock Active (${liveVerification ? `${liveVerification.confidence}% match` : 'Calibrated'}). Click to manage.`
                  : voiceIdentityProfile?.isEnrolled
                  ? 'Voice Identity Enrolled (Lock Off). Click to enforce.'
                  : 'Calibrate Voice Identity to filter background voices'
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                voiceIdentityProfile?.isEnrolled && isVoiceIdentityEnforcedState
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-950/40'
                  : voiceIdentityProfile?.isEnrolled
                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className={`w-3 h-3 ${voiceIdentityProfile?.isEnrolled && isVoiceIdentityEnforcedState ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden lg:inline">
                {voiceIdentityProfile?.isEnrolled && isVoiceIdentityEnforcedState
                  ? liveVerification
                    ? `Bio-Lock (${liveVerification.confidence}%)`
                    : 'Bio-Lock: ON'
                  : voiceIdentityProfile?.isEnrolled
                  ? 'Voice ID'
                  : 'Calibrate Voice ID'}
              </span>
            </button>

            {/* Cocktail Party Crowd Isolation Filter Toggle */}
            <button
              onClick={() => {
                soundEffects.playSuccessChime();
                setCrowdIsolationEnabled((prev) => !prev);
              }}
              title={crowdIsolationEnabled ? 'Crowd Noise Filter is Active: Distant crowd chatter ignored' : 'Turn on Cocktail Party Crowd Filter'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                crowdIsolationEnabled
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className={`w-3 h-3 ${crowdIsolationEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="hidden md:inline">
                {crowdIsolationEnabled
                  ? acousticData.isNearFieldVoice
                    ? `Voice Isolated (+${acousticData.snrDb}dB)`
                    : 'Crowd Filter: ON'
                  : 'Crowd Filter: OFF'}
              </span>
            </button>

            {/* Human Vocal Band Noise Suppression Filter Toggle */}
            <button
              onClick={() => {
                soundEffects.playSuccessChime();
                toggleVocalFilter();
              }}
              title={
                vocalFilterEnabled
                  ? `Vocal Band Noise Filter Active (85Hz-3400Hz Vocal Pass): Purity ${vocalTelemetry.vocalPurityPercent}%, Out-of-band cut -${vocalTelemetry.attenuationDb}dB`
                  : 'Turn ON Vocal Band Noise Suppression (Filters frequencies outside human voice)'
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                vocalFilterEnabled
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-950/40'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className={`w-3 h-3 ${vocalFilterEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="hidden xl:inline">
                {vocalFilterEnabled
                  ? `Vocal Pass (${vocalTelemetry.vocalPurityPercent}%)`
                  : 'Vocal Pass: OFF'}
              </span>
            </button>

            {/* 5-Second Voice Fingerprint Buffer Quick Control */}
            <button
              onClick={() => {
                if (!fingerprintTelemetry.isReady) {
                  handleStartFingerprintSampling();
                } else {
                  handleToggleFingerprintSuppression();
                }
              }}
              title={
                fingerprintTelemetry.isReady
                  ? `Voice Fingerprint (5s Sample): ${voiceFingerprintEngine.isSuppressionEnabled() ? 'ACTIVE (Suppresses non-matching voice patterns)' : 'BYPASSED'}. Correlation: ${fingerprintTelemetry.liveMatchConfidence}%. Click to toggle.`
                  : 'Record a 5-second sample of your primary voice to ignore non-matching speech patterns'
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                fingerprintTelemetry.isReady && voiceFingerprintEngine.isSuppressionEnabled()
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-950/40'
                  : fingerprintTelemetry.isReady
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-slate-100'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              <Fingerprint className={`w-3 h-3 ${fingerprintTelemetry.isReady ? 'text-cyan-400' : 'text-amber-400'}`} />
              <span className="hidden xl:inline">
                {isSamplingFingerprint
                  ? `Sampling (${fingerprintCountdownSeconds}s)`
                  : fingerprintTelemetry.isReady
                  ? voiceFingerprintEngine.isSuppressionEnabled()
                    ? `FP (5s): ${fingerprintTelemetry.liveMatchConfidence}%`
                    : 'FP: Bypass'
                  : 'Sample 5s FP'}
              </span>
            </button>

            {/* Auto-Listen / Push-to-Talk Toggle */}
            <button
              onClick={() => {
                const next = !continuousMode;
                setContinuousMode(next);
                if (!next && isListening) {
                  stopListening();
                }
              }}
              title={continuousMode ? 'Switch to Push-to-Talk mode' : 'Switch to Continuous Auto-Listen mode'}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                continuousMode
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>{continuousMode ? 'Auto-Listen: ON' : 'Manual Mic'}</span>
            </button>

            {/* Autonomous Command Versatility & 35-Task Audit Lab */}
            <button
              onClick={() => {
                soundEffects.playWakeChime();
                setShowCommandAuditModal(true);
              }}
              title="Command Versatility & Capability Audit Lab (Live Execution Verification of 35 Tasks)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-indigo-950/80 border-indigo-500/60 text-indigo-300 hover:bg-indigo-900 shadow-sm transition-all"
            >
              <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
              <span className="hidden md:inline">Audit Lab (35 Tasks)</span>
              <span className="md:hidden">Audit</span>
            </button>
            {/* Language Selector */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700/60 rounded-lg p-0.5 text-xs shrink-0">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  language === 'en' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('ur_slang')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  language === 'ur_slang' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Pakistani Roman Urdu Slang"
              >
                Urdu Slang
              </button>
              <button
                onClick={() => onLanguageChange('ur_script')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors hidden xs:block ${
                  language === 'ur_script' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                اردو
              </button>
            </div>

            {/* Compact Voice Persona Selector */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700/60 rounded-lg px-2 py-1 text-xs shrink-0 max-w-[170px] sm:max-w-[220px]">
              <span className="text-[10px] text-slate-400 font-mono mr-1 hidden md:inline">Voice:</span>
              <select
                value={selectedVoiceId}
                onChange={(e) => onVoiceChange && onVoiceChange(e.target.value)}
                className="bg-transparent text-[11px] text-cyan-300 font-semibold focus:outline-none cursor-pointer w-full truncate"
                title="Select Native Voice & Accent Persona"
              >
                <optgroup label="Natural Native Male">
                  {VOICE_PERSONAS.filter((v) => v.gender === 'male').map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      ♂ {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Natural Female">
                  {VOICE_PERSONAS.filter((v) => v.gender === 'female').map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      ♀ {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                onClick={() => testVoicePersona(selectedVoiceId, language === 'ur_slang' ? 'ur' : 'en')}
                className="px-1.5 py-0.5 ml-1 rounded bg-slate-700 hover:bg-cyan-950 text-[10px] text-slate-200 shrink-0"
                title="Test Voice"
              >
                Test
              </button>
            </div>

            {/* TTS Mute Toggle */}
            <button
              onClick={() => {
                if (ttsEnabled) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              title={ttsEnabled ? 'Mute Speech Output' : 'Enable Speech Output'}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors shrink-0"
            >
              {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {/* Close Button - Guaranteed Visible and Highly Accessible */}
            <button
              onClick={() => {
                stopSpeaking();
                stopListening();
                onClose();
              }}
              title="Close Voice Assistant (Esc)"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold shrink-0 transition-all shadow cursor-pointer ml-1 active:scale-95"
            >
              <X className="w-4 h-4 text-rose-400" />
              <span className="hidden xs:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Voice Identity Bio-Lock Filtered Alert */}
        {voiceMismatchNotice && (
          <div className="bg-amber-950/90 border-b border-amber-500/50 px-4 py-2 text-xs font-semibold text-amber-200 flex items-center justify-between gap-2 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{voiceMismatchNotice}</span>
            </div>
            <button
              onClick={() => setShowVoiceIdentityModal(true)}
              className="text-[11px] font-mono underline text-cyan-300 hover:text-cyan-200 shrink-0"
            >
              Configure Bio-Lock
            </button>
          </div>
        )}

        {/* Center Holographic Stage */}
        <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Visualizer & Mic Core - Scrollable so controls and alerts never cut off */}
          <div className="w-full md:w-5/12 flex flex-col items-center justify-start py-5 px-4 sm:px-6 overflow-y-auto max-h-full border-b md:border-b-0 md:border-r border-slate-800 bg-radial from-slate-850 to-slate-900 scrollbar-thin">
            <div className="my-2 shrink-0">
              <AuraOrb state={orbState} size="hero" onClick={toggleListening} />
            </div>

            <div className="text-center space-y-1 mb-3 shrink-0">
              <h3 className="text-base sm:text-lg font-bold tracking-wide text-slate-100">
                {orbState === 'listening'
                  ? 'AURA is Listening...'
                  : orbState === 'thinking'
                  ? 'Processing Directive...'
                  : orbState === 'speaking'
                  ? 'AURA is Speaking...'
                  : 'AURA Standby'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                {isListening
                  ? language === 'ur_slang'
                    ? 'Boliye boss! Laptop mic active hai...'
                    : 'Speak naturally into your microphone...'
                  : 'Tap the orb or button below to resume voice input.'}
              </p>
            </div>

            {/* Live Audio Decibel Wave Visualizer */}
            {isListening && (
              <div className="w-full max-w-xs mb-2 flex flex-col items-center gap-1.5 shrink-0">
                <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        voiceActivityDetected ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                      }`}
                    />
                    {voiceActivityDetected ? (
                      <span className="text-emerald-400 font-bold">Voice Synced ({audioLevel}%)</span>
                    ) : (
                      <span>Ambient Filter ({audioLevel}%)</span>
                    )}
                  </span>
                  <span className="text-[10px] text-cyan-400">
                    {getSpeechCooldownRemaining() > 0 ? 'Echo Shield ON' : 'Acoustic Clean'}
                  </span>
                </div>
                <div className="w-full flex items-center justify-center gap-1.5 h-6">
                  {[20, 45, 75, 100, 60, 85, 30].map((h, i) => {
                    const dynamicHeight = Math.max(15, Math.min(100, audioLevel * (h / 60)));
                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-75 ${
                          voiceActivityDetected
                            ? 'bg-gradient-to-t from-emerald-500 to-cyan-400'
                            : 'bg-slate-700'
                        }`}
                        style={{ height: `${dynamicHeight}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Voice Sync Engine Mode: Smart Sync vs Push-to-Talk */}
            <div className="flex items-center justify-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] mb-2 shrink-0 w-full max-w-xs">
              <button
                onClick={() => setVoiceSyncMode('smart_sync')}
                className={`flex-1 py-1 rounded text-center font-semibold transition-all cursor-pointer ${
                  voiceSyncMode === 'smart_sync'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Continuous hands-free conversation with acoustic echo cancellation"
              >
                Hands-Free Sync
              </button>
              <button
                onClick={() => {
                  setVoiceSyncMode('push_to_talk');
                  stopSpeaking();
                }}
                className={`flex-1 py-1 rounded text-center font-semibold transition-all cursor-pointer ${
                  voiceSyncMode === 'push_to_talk'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Push-to-Talk: Tap orb to speak directives without background feedback"
              >
                Push-to-Talk
              </button>
            </div>

            {/* Listening Acoustic Model Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] mb-2 shrink-0">
              <span className="text-slate-400 px-1 font-medium">Model:</span>
              <button
                onClick={() => {
                  setAcousticLang('ur-PK');
                  if (isListening) {
                    stopListening();
                    setTimeout(startListening, 150);
                  }
                }}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  acousticLang === 'ur-PK' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Optimized for Pakistani Urdu native spoken accents (ur-PK)"
              >
                🇵🇰 Urdu (ur-PK)
              </button>
              <button
                onClick={() => {
                  setAcousticLang('en-US');
                  if (isListening) {
                    stopListening();
                    setTimeout(startListening, 150);
                  }
                }}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  acousticLang === 'en-US' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Optimized for English or Roman Urdu speech (en-US)"
              >
                🌐 English (en-US)
              </button>
            </div>

            {/* Mic Activation Button */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                onClick={toggleListening}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 shadow-cyan-500/20'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Pause Microphone</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>{language === 'ur_slang' ? 'Boliye (Start Listening)' : 'Resume Voice Listening'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className="truncate max-w-[180px]" title={micDeviceName}>
                  {micDeviceName}
                </span>
                <button
                  onClick={handleRequestLaptopMic}
                  className="text-cyan-400 hover:underline hover:text-cyan-300 ml-1 font-semibold cursor-pointer"
                  title="Test or switch laptop microphone"
                >
                  [Test Mic]
                </button>
              </div>
            </div>

            {/* 5-Second Voice Fingerprint Buffer Card */}
            <div className="w-full max-w-xs mt-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2 shrink-0 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Fingerprint className={`w-4 h-4 ${
                    fingerprintTelemetry.isReady ? 'text-cyan-400' : 'text-amber-400'
                  }`} />
                  <span className="font-bold text-slate-200 text-[11px]">Voice Fingerprint (5s)</span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                  isSamplingFingerprint
                    ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                    : fingerprintTelemetry.isReady && voiceFingerprintEngine.isSuppressionEnabled()
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : fingerprintTelemetry.isReady
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}>
                  {isSamplingFingerprint
                    ? `SAMPLING · ${fingerprintCountdownSeconds}s`
                    : fingerprintTelemetry.isReady && voiceFingerprintEngine.isSuppressionEnabled()
                    ? '5.0s BUFFER ACTIVE'
                    : fingerprintTelemetry.isReady
                    ? 'BUFFER LOADED'
                    : 'NOT SAMPLED'}
                </span>
              </div>

              {/* Sampling Active State */}
              {isSamplingFingerprint ? (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-rose-300 font-semibold animate-pulse">Speak continuously now...</span>
                    <span className="font-mono text-cyan-400 font-bold">{fingerprintCountdownSeconds}s left</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-cyan-400 transition-all duration-100"
                      style={{ width: `${fingerprintFillPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleCancelFingerprintSampling}
                      className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Telemetry row */}
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Pattern Correlation:</span>
                    {fingerprintTelemetry.isReady ? (
                      <span className={`font-bold ${
                        fingerprintTelemetry.liveMatchConfidence >= 55
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}>
                        {fingerprintTelemetry.liveMatchConfidence}% {fingerprintTelemetry.isSuppressed ? '(Suppressed)' : '(Matched)'}
                      </span>
                    ) : (
                      <span className="text-slate-500">Uncalibrated</span>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={handleStartFingerprintSampling}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition-all"
                    >
                      {fingerprintTelemetry.isReady ? 'Re-sample 5s' : 'Sample 5s Voice'}
                    </button>
                    {fingerprintTelemetry.isReady && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleToggleFingerprintSuppression}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
                            voiceFingerprintEngine.isSuppressionEnabled()
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {voiceFingerprintEngine.isSuppressionEnabled() ? 'Shield ON' : 'Shield OFF'}
                        </button>
                        <button
                          onClick={handleClearFingerprint}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Clear 5s fingerprint buffer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Microphone Permission Blocked Notice - Fully scrollable & actionable */}
            {micPermissionBlocked && (
              <div className="mt-3 p-3.5 bg-rose-950/90 border border-rose-600/80 rounded-xl text-center max-w-sm shadow-xl animate-in fade-in shrink-0">
                <div className="flex items-center justify-center gap-1.5 text-rose-300 font-bold text-xs mb-1">
                  <MicOff className="w-4 h-4 text-rose-400" />
                  <span>Laptop Microphone Blocked</span>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-snug mb-2">
                  Browser audio permission is not granted. To allow:
                  <span className="block mt-1 font-mono text-[10px] text-rose-300 bg-rose-900/50 p-1.5 rounded border border-rose-800/80">
                    Click 🔒 or 🎚️ in browser URL bar &gt; set Microphone to "Allow"
                  </span>
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleRequestLaptopMic}
                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-500/30 active:scale-95 cursor-pointer"
                  >
                    Grant Laptop Mic
                  </button>
                  <button
                    onClick={() => {
                      setMicPermissionBlocked(false);
                      soundEffects.playSuccessChime();
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                    title="Dismiss and type commands"
                  >
                    Dismiss & Type
                  </button>
                </div>
              </div>
            )}

            {/* Live Captured Transcript preview */}
            {transcript ? (
              <div className="mt-4 p-3.5 bg-cyan-950/70 border border-cyan-600/70 rounded-xl text-xs text-cyan-200 w-full max-w-xs text-center font-medium shadow-inner animate-in fade-in flex flex-col items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>AURA Heard:</span>
                </div>
                <div className="text-sm font-semibold text-white">"{transcript}"</div>
                <button
                  onClick={() => handleSendMessage(transcript.trim())}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-[11px] shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  Execute Directive Now ⚡
                </button>
              </div>
            ) : isListening ? (
              <div className="mt-4 text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-800/40 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Microphone Active · Speak your command anytime</span>
              </div>
            ) : null}

            {/* Practical Task Quick Execution Hub */}
            <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl w-full max-w-xs shrink-0 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>Execute Practical Tasks</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">1-TAP / VOICE</span>
              </div>
              <div className="grid grid-cols-1 gap-1 text-left">
                {[
                  {
                    label: language === 'ur_slang' ? '⚡ Board Resolution ($42M) Approve Karo' : '⚡ Approve Board Resolution ($42M)',
                    cmd: language === 'ur_slang' ? 'Board resolution approve karo' : 'Approve Q3 Board Resolution ($42M)',
                  },
                  {
                    label: language === 'ur_slang' ? '⚡ Cloud SLA ($420) Approve Karo' : '⚡ Approve Cloud SLA ($420)',
                    cmd: language === 'ur_slang' ? 'Cloud SLA approve karo' : 'Approve Cloud Infrastructure SLA ($420)',
                  },
                  {
                    label: language === 'ur_slang' ? '⚡ Naya Task Add Karo: Q4 Strategy' : '⚡ Add Task: Review Q4 Budget',
                    cmd: language === 'ur_slang' ? 'Naya task add karo: Q4 Strategy Review' : 'Create task: Review Q4 Budget',
                  },
                  {
                    label: language === 'ur_slang' ? '⚡ Tesla Climate 21°C On Karo' : '⚡ Pre-condition Tesla (21°C)',
                    cmd: language === 'ur_slang' ? 'Tesla ka AC 21°C par chalao' : 'Pre-condition Tesla cabin to 21°C',
                  },
                  {
                    label: language === 'ur_slang' ? '⚡ Meeting Overlap 15m Buffer Fix' : '⚡ Resolve Meeting Overlap',
                    cmd: language === 'ur_slang' ? 'Meeting conflict fix karo 15m buffer ke sath' : 'Resolve meeting overlap with 15m buffer',
                  },
                  {
                    label: language === 'ur_slang' ? '⚡ Marcus Vance Ko Email Bhej Do' : '⚡ Send Marcus Reply',
                    cmd: language === 'ur_slang' ? 'Marcus ko email reply bhej do' : 'Send approved email reply to Marcus Vance',
                  },
                ].map((act, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(act.cmd)}
                    className="p-1.5 text-[11px] bg-slate-800/80 hover:bg-cyan-950/80 hover:border-cyan-500/70 border border-slate-700/60 rounded-lg text-slate-200 hover:text-cyan-300 transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">{act.label}</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conversation Log & Command Hub */}
          <div className="w-full md:w-7/12 flex flex-col bg-slate-950/40">
            {/* Scrollable messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
              {chatLog.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] text-slate-500 mb-1 px-1">
                    {msg.sender === 'user' ? 'You' : 'AURA Sovereign AI'} · {msg.time}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div>{msg.text}</div>
                    {msg.action && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-900/90 border border-emerald-500/50 shadow-sm space-y-1.5 text-left">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold font-mono">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>TASK PRACTICALLY EXECUTED</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                            {typeof msg.action.actionType === 'string' ? msg.action.actionType : 'ACTION'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 leading-snug">
                          {msg.action.actionType === 'CREATE_TASK' && (
                            <span>Created deliverable: <strong>"{msg.action.details?.title}"</strong> in Task Queues & synced to Firestore.</span>
                          )}
                          {msg.action.actionType === 'COMPLETE_TASK' && (
                            <span>Executed & resolved: <strong>"{msg.action.details?.title}"</strong> via autonomous autopilot.</span>
                          )}
                          {msg.action.actionType === 'DELETE_TASK' && (
                            <span>Deleted & removed: <strong>"{msg.action.details?.title || 'Selected deliverable'}"</strong> from task queue.</span>
                          )}
                          {msg.action.actionType === 'SCHEDULE_MEETING' && (
                            <span>Added session: <strong>"{msg.action.details?.title}"</strong> ({msg.action.details?.timeStart || '16:00'} - {msg.action.details?.timeEnd || '17:00'}) to master calendar.</span>
                          )}
                          {msg.action.actionType === 'SEND_EMAIL' && (
                            <span>Dispatched approved email to <strong>{msg.action.details?.recipient || 'Marcus Vance'}</strong>.</span>
                          )}
                          {msg.action.actionType === 'CAR_CONTROL' && (
                            <span>Tesla pre-conditioning active at <strong>21.0°C</strong> with sentry mode.</span>
                          )}
                          {msg.action.actionType === 'PLAY_MEDIA' && (
                            <span>Playing track: <strong>"{msg.action.details?.title}"</strong> in Executive Media Lounge.</span>
                          )}
                          {msg.action.actionType === 'RESCHEDULE_EVENT' && (
                            <span>Meeting conflict resolved with <strong>15-minute transition buffer</strong>.</span>
                          )}
                          {!['CREATE_TASK', 'COMPLETE_TASK', 'SCHEDULE_MEETING', 'SEND_EMAIL', 'CAR_CONTROL', 'PLAY_MEDIA', 'RESCHEDULE_EVENT'].includes(msg.action.actionType) && (
                            <span>Directive parameters applied to executive workspace.</span>
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-end">
                          <button
                            onClick={() => {
                              stopSpeaking();
                              stopListening();
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-colors cursor-pointer"
                          >
                            <span>View in Workspace</span>
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Carousel */}
            <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {language === 'ur_slang' ? 'Quick Voice Directives (Bol kar try karein):' : 'Suggested Voice Directives:'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentSuggestions.slice(0, 4).map((sugg, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sugg)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white transition-colors text-left flex items-center gap-1.5"
                  >
                    <span>{sugg}</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Manual text input fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('command') as HTMLInputElement;
                if (input && input.value.trim()) {
                  handleSendMessage(input.value.trim());
                  input.value = '';
                }
              }}
              className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                name="command"
                placeholder={
                  language === 'ur_slang'
                    ? 'Type Roman Urdu or English command (e.g. "Bhai 3 baje meeting shift karo")...'
                    : 'Type an executive directive or speak above...'
                }
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Voice Identity Enrollment & Bio-Lock Modal */}
      <VoiceIdentityModal
        isOpen={showVoiceIdentityModal}
        onClose={() => setShowVoiceIdentityModal(false)}
        onProfileUpdated={(newProfile, enforced) => {
          setVoiceIdentityProfile(newProfile);
          setIsVoiceIdentityEnforcedState(enforced);
          voiceIdentityProfileRef.current = newProfile;
          voiceIdentityEnforcedRef.current = enforced;
          backgroundWakeEngine.refreshVoiceIdentity();
        }}
      />

      {/* Autonomous Command Versatility & 35-Task Capability Audit Modal */}
      <CommandAuditModal
        isOpen={showCommandAuditModal}
        onClose={() => setShowCommandAuditModal(false)}
        onExecuteDirective={(actionType, details) => {
          if (onExecuteAction) onExecuteAction(actionType, details);
        }}
      />
    </div>
  );
};
