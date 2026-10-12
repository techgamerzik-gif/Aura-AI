import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Headphones,
  Shield,
  ShieldCheck,
  Zap,
  Bell,
  BellRing,
  BellOff,
  Laptop,
  Sliders,
  ExternalLink,
  X,
} from 'lucide-react';
import { VoiceIdentityModal } from './VoiceIdentityModal.tsx';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  detectWakeWord,
  isSpeaking,
  stopSpeaking,
  speakText,
  getSpeechCooldownRemaining,
  VOICE_PERSONAS,
  testVoicePersona,
  onSpeechInterrupted,
  isAcousticEcho,
  INTERRUPT_PATTERNS,
} from '../utils/speech.ts';
import {
  AdaptiveAcousticTracker,
  createVocalDSPFilterChain,
  getAcousticMicrophoneConstraints,
  isPassiveCrowdChatter,
  AcousticTelemetry,
} from '../utils/noiseFilter.ts';
import {
  parseUserDirective,
  parseMultiUserDirectives,
  synthesizeMultiTaskReport,
} from '../utils/intentParser.ts';
import { commandLearningEngine } from '../utils/commandLearningEngine.ts';
import { soundEffects } from '../utils/audioChime.ts';
import { LanguageMode } from '../types/assistant.ts';
import {
  backgroundWakeEngine,
  BackgroundWakeStatus,
} from '../utils/backgroundWakeEngine.ts';

interface AmbientVoiceBarProps {
  language: LanguageMode;
  onWakeWordDetected: (command: string) => void;
  onExecuteDirectAction?: (actionType: string, details: any, replyText?: string) => void;
  autoListenEnabled: boolean;
  onToggleAutoListen: (enabled: boolean) => void;
  isVoiceModalOpen: boolean;
  selectedVoiceId?: string;
  onVoiceChange?: (voiceId: string) => void;
}

export const AmbientVoiceBar: React.FC<AmbientVoiceBarProps> = ({
  language,
  onWakeWordDetected,
  onExecuteDirectAction,
  autoListenEnabled,
  onToggleAutoListen,
  isVoiceModalOpen,
  selectedVoiceId = 'tariq_urdu_male',
  onVoiceChange,
}) => {
  const [micActive, setMicActive] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'speaking' | 'interrupted' | 'error' | 'unsupported'>('idle');
  const [detectedPhrase, setDetectedPhrase] = useState<string>('');
  const [lastActionExecution, setLastActionExecution] = useState<{ summary: string; timestamp: number } | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
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

  const [bgStatus, setBgStatus] = useState<BackgroundWakeStatus>(backgroundWakeEngine.getStatus());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showVoiceIdentityModal, setShowVoiceIdentityModal] = useState(false);

  const recognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const pauseTimerRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const lastWakeTriggerTimeRef = useRef<number>(0);
  const trackerRef = useRef(new AdaptiveAcousticTracker());
  const acousticDataRef = useRef(acousticData);
  acousticDataRef.current = acousticData;

  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  onWakeWordDetectedRef.current = onWakeWordDetected;

  const onExecuteDirectActionRef = useRef(onExecuteDirectAction);
  onExecuteDirectActionRef.current = onExecuteDirectAction;

  useEffect(() => {
    localStorage.setItem('aura_crowd_filter', String(crowdIsolationEnabled));
  }, [crowdIsolationEnabled]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isSpeechRecognitionSupported()) {
      setMicStatus('unsupported');
    }
    return () => {
      isMountedRef.current = false;
      cleanupAll();
    };
  }, []);

  // Synchronize status with BackgroundWakeEngine
  useEffect(() => {
    const unsub = backgroundWakeEngine.onStatusChange((status) => {
      if (isMountedRef.current) {
        setBgStatus(status);
        if (status.isListening && autoListenEnabled) {
          setMicActive(true);
        }
      }
    });
    return unsub;
  }, [autoListenEnabled]);

  // Stream live interim transcript from background wake engine
  useEffect(() => {
    const unsub = backgroundWakeEngine.onInterimTranscript((text) => {
      if (isMountedRef.current) {
        setDetectedPhrase(text);
      }
    });
    return unsub;
  }, []);

  // Handle wake events detected in foreground or background
  useEffect(() => {
    const unsub = backgroundWakeEngine.onWakeDetected((command, wasBackground, directives) => {
      if (!isMountedRef.current) return;
      if (directives && directives.length > 1) {
        soundEffects.playSuccessChime();
        setDetectedPhrase('');
        const multiReport = synthesizeMultiTaskReport(directives, language);
        setLastActionExecution({ summary: multiReport.summary, timestamp: Date.now() });
        setTimeout(() => {
          if (isMountedRef.current) setLastActionExecution(null);
        }, 7000);
      } else if (directives && directives.length === 1) {
        soundEffects.playSuccessChime();
        setDetectedPhrase('');
        setLastActionExecution({ summary: directives[0].summary, timestamp: Date.now() });
        setTimeout(() => {
          if (isMountedRef.current) setLastActionExecution(null);
        }, 5000);
      } else {
        onWakeWordDetectedRef.current(command || '');
      }
    });
    return unsub;
  }, [language]);

  // Handle direct actions detected in foreground or background
  useEffect(() => {
    const unsub = backgroundWakeEngine.onDirectAction((actionType, details, replyText) => {
      if (onExecuteDirectActionRef.current) {
        onExecuteDirectActionRef.current(actionType, details, replyText);
      }
      if (isMountedRef.current && (replyText || actionType)) {
        setDetectedPhrase('');
        setLastActionExecution({ summary: replyText || `Executed: ${actionType}`, timestamp: Date.now() });
        setTimeout(() => {
          if (isMountedRef.current) setLastActionExecution(null);
        }, 6000);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSpeechInterrupted(() => {
      if (!isMountedRef.current) return;
      setMicStatus('interrupted');
      setDetectedPhrase('');
      setTimeout(() => {
        if (isMountedRef.current) setMicStatus('listening');
      }, 600);
    });
    return unsub;
  }, []);

  const cleanupAudioMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const cleanupRecognizer = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (recognizerRef.current) {
      try {
        recognizerRef.current.onresult = null;
        recognizerRef.current.onerror = null;
        recognizerRef.current.onend = null;
        recognizerRef.current.stop();
      } catch (e) {}
      recognizerRef.current = null;
    }
    setMicActive(false);
  };

  const cleanupAll = () => {
    cleanupRecognizer();
    cleanupAudioMeter();
  };

  // Safe audio meter initialization after explicit user gesture
  const startAudioMeter = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const constraints = getAcousticMicrophoneConstraints(crowdIsolationEnabled);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      // Route through 3-stage vocal formant DSP filter chain (120Hz highpass, 1800Hz boost, 3800Hz lowpass)
      const { analyserNode } = createVocalDSPFilterChain(ctx, source);
      analyserRef.current = analyserNode;

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkLevel = () => {
        if (!isMountedRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Acoustic telemetry: real-time energy, ambient noise floor, and dynamic SNR
        const telemetry = trackerRef.current.analyze(dataArray);
        setAcousticData(telemetry);
        setAudioLevel(telemetry.audioEnergy);

        animFrameRef.current = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (err: any) {
      console.warn('Microphone audio meter notice:', err?.message || err);
      // Non-fatal, speech recognition can still work
    }
  };

  // Start background wake-word listener loop
  const startWakeListener = () => {
    if (!isSpeechRecognitionSupported() || isVoiceModalOpen) return;
    cleanupRecognizer();

    const rec = createSpeechRecognizer(
      language,
      (transcript, isFinal) => {
        if (!isMountedRef.current || isVoiceModalOpen) return;

        // In Crowd Isolation Mode: discard ambient third-party chatter
        if (crowdIsolationEnabled && isPassiveCrowdChatter(transcript, true, acousticDataRef.current.isNearFieldVoice)) {
          return;
        }

        setDetectedPhrase(transcript);

        if (isAcousticEcho(transcript)) {
          return;
        }

        // Barge-in: only halt ongoing speech if the user speaks an explicit interrupt word or wake word
        if (isSpeaking()) {
          const isWake = detectWakeWord(transcript).isWake;
          const isInterrupt = INTERRUPT_PATTERNS.some((pat) => pat.test(transcript));
          if (isWake || isInterrupt) {
            stopSpeaking();
            setMicStatus('interrupted');
            setTimeout(() => {
              if (isMountedRef.current) setMicStatus('listening');
            }, 600);
          } else {
            return;
          }
        }

        const handleProcessCandidate = (textToProcess: string) => {
          if (!textToProcess.trim()) return;
          const now = Date.now();
          const { isWake, command } = detectWakeWord(textToProcess);
          const multiDirectives = parseMultiUserDirectives(textToProcess);

          // 1. Multi-Task Execution: decomposes long compound voice commands containing multiple tasks
          if (multiDirectives.length > 1) {
            if (now - lastWakeTriggerTimeRef.current < 1200) return;
            lastWakeTriggerTimeRef.current = now;

            soundEffects.playSuccessChime();
            setDetectedPhrase('');
            const multiReport = synthesizeMultiTaskReport(multiDirectives, language);
            setLastActionExecution({ summary: multiReport.summary, timestamp: now });
            setTimeout(() => {
              if (isMountedRef.current) setLastActionExecution(null);
            }, 7000);

            const replyText =
              language === 'ur_script'
                ? multiReport.reply.ur_script
                : language === 'ur_slang'
                ? multiReport.reply.ur_slang
                : multiReport.reply.en;

            // Execute all directives sequentially across the applet
            multiDirectives.forEach((dir, idx) => {
              if (onExecuteDirectAction) {
                // Pass replyText on the final directive so TTS speaks the synthesized report once
                onExecuteDirectAction(dir.actionType, dir.details, idx === multiDirectives.length - 1 ? replyText : undefined);
              }
            });
            return;
          }

          // 2. Single Direct Actionable Directive
          if (multiDirectives.length === 1) {
            const parsed = multiDirectives[0];
            if (now - lastWakeTriggerTimeRef.current < 1200) return;
            lastWakeTriggerTimeRef.current = now;

            soundEffects.playSuccessChime();
            setDetectedPhrase('');
            setLastActionExecution({ summary: parsed.summary, timestamp: now });
            setTimeout(() => {
              if (isMountedRef.current) setLastActionExecution(null);
            }, 5000);

            const replyText =
              language === 'ur_script'
                ? parsed.defaultReply.ur_script
                : language === 'ur_slang'
                ? parsed.defaultReply.ur_slang
                : parsed.defaultReply.en;

            if (onExecuteDirectAction) {
              onExecuteDirectAction(parsed.actionType, parsed.details, replyText);
            } else {
              onWakeWordDetected(command || textToProcess);
            }
            return;
          }

          // 3. Fallback: Check single directive on clean command or full transcript
          const singleDirective = parseUserDirective(command || textToProcess) || parseUserDirective(textToProcess);
          if (singleDirective) {
            if (now - lastWakeTriggerTimeRef.current < 1200) return;
            lastWakeTriggerTimeRef.current = now;

            soundEffects.playSuccessChime();
            setDetectedPhrase('');
            setLastActionExecution({ summary: singleDirective.summary, timestamp: now });
            setTimeout(() => {
              if (isMountedRef.current) setLastActionExecution(null);
            }, 5000);

            const replyText =
              language === 'ur_script'
                ? singleDirective.defaultReply.ur_script
                : language === 'ur_slang'
                ? singleDirective.defaultReply.ur_slang
                : singleDirective.defaultReply.en;

            if (onExecuteDirectAction) {
              onExecuteDirectAction(singleDirective.actionType, singleDirective.details, replyText);
            } else {
              onWakeWordDetected(command || textToProcess);
            }
            return;
          }

          // 4. Command Learning Engine Fallback
          const learned = commandLearningEngine.matchInput(command || textToProcess);
          if (learned.matched && learned.pattern) {
            if (now - lastWakeTriggerTimeRef.current < 1200) return;
            lastWakeTriggerTimeRef.current = now;

            soundEffects.playSuccessChime();
            setDetectedPhrase('');
            const summary = learned.pattern.summary;
            setLastActionExecution({ summary, timestamp: now });
            setTimeout(() => {
              if (isMountedRef.current) setLastActionExecution(null);
            }, 5000);

            const replyText =
              language === 'ur_script'
                ? `حکم کریں، ${summary} مکمل کر دیا گیا ہے۔`
                : language === 'ur_slang'
                ? `Hukum Boss! ${summary} execute kar diya hai.`
                : `Confirmed: ${summary}.`;

            if (onExecuteDirectAction) {
              onExecuteDirectAction(learned.pattern.actionType, learned.extractedDetails || learned.pattern.details, replyText);
            }
            return;
          }

          // 5. Explicit user command to open the chat / voice modal
          const isExplicitOpenModal = /^(?:open|show|launch)\s+(?:the\s+)?(?:chat\s*box|voice\s*modal|chat|voice\s*chat|assistant\s*modal)$/i.test((command || textToProcess).trim());
          if (isExplicitOpenModal) {
            if (now - lastWakeTriggerTimeRef.current < 1200) return;
            lastWakeTriggerTimeRef.current = now;
            soundEffects.playWakeChime();
            onWakeWordDetected(command || textToProcess);
            setDetectedPhrase('');
            return;
          }

          // 6. Wake word detected alone ("Hey AURA") without trailing command
          if (isWake && !command) {
            if (now - lastWakeTriggerTimeRef.current < 1200) return;
            lastWakeTriggerTimeRef.current = now;

            soundEffects.playWakeChime();
            setDetectedPhrase('');
            const promptReply =
              language === 'ur_script'
                ? 'حکم کریں، میں سن رہا ہوں۔'
                : language === 'ur_slang'
                ? 'Hukum Boss! AURA alert hai, hands-free sun raha hoon. Batayein kya execute karoon?'
                : 'Standing by hands-free, Chief. How can I assist you?';
            speakText(promptReply, language, undefined, selectedVoiceId);
            return;
          }

          // 7. General Dynamic Query or Question: resolve hands-free without opening modal!
          if (isWake || textToProcess.trim().length > 3) {
            if (now - lastWakeTriggerTimeRef.current < 1200) return;
            lastWakeTriggerTimeRef.current = now;
            setDetectedPhrase('');

            fetch('/api/assistant/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: command || textToProcess, language }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data?.action && onExecuteDirectAction) {
                  onExecuteDirectAction(data.action.actionType, data.action.details, data.reply);
                  if (data?.reply) {
                    setLastActionExecution({ summary: data.reply, timestamp: Date.now() });
                    setTimeout(() => {
                      if (isMountedRef.current) setLastActionExecution(null);
                    }, 6000);
                  }
                } else if (data?.reply) {
                  speakText(data.reply, language, undefined, selectedVoiceId);
                  setLastActionExecution({ summary: data.reply, timestamp: Date.now() });
                  setTimeout(() => {
                    if (isMountedRef.current) setLastActionExecution(null);
                  }, 6000);
                }
              })
              .catch(() => {});
          }
        };

        if (isFinal) {
          if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
          }
          handleProcessCandidate(transcript);
        } else {
          // If the user paused speaking for 550ms on a recognized phrase, auto-process it immediately!
          if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
          pauseTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && !isVoiceModalOpen) {
              handleProcessCandidate(transcript);
            }
          }, 550);
        }
      },
      (err) => {
        if (!isMountedRef.current) return;
        const errType = err?.error || '';
        
        // Critical permission or hardware errors: do not loop!
        if (errType === 'not-allowed' || errType === 'service-not-allowed' || errType === 'audio-capture') {
          setMicStatus('error');
          setStatusMessage('Microphone permission blocked. Please enable mic access in your browser.');
          setMicActive(false);
          onToggleAutoListen(false);
          cleanupAudioMeter();
          return;
        }

        // Transient silence / network: restart once safely after delay if still enabled
        if (autoListenEnabled && !isVoiceModalOpen) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && autoListenEnabled && !isVoiceModalOpen) {
              startWakeListener();
            }
          }, 1200);
        } else {
          setMicActive(false);
        }
      },
      () => {
        if (!isMountedRef.current) return;
        // Recognition cycle ended normally: keep listening loop running
        if (autoListenEnabled && !isVoiceModalOpen) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && autoListenEnabled && !isVoiceModalOpen) {
              startWakeListener();
            }
          }, 400);
        } else {
          setMicActive(false);
        }
      }
    );

    if (rec) {
      recognizerRef.current = rec;
      try {
        rec.start();
        setMicActive(true);
        setMicStatus('listening');
        setStatusMessage('');
      } catch (e: any) {
        console.warn('Speech recognition start notice:', e?.message || e);
        setMicActive(false);
      }
    }
  };

  // React to autoListenEnabled or voice modal open changes
  useEffect(() => {
    if (autoListenEnabled && !isVoiceModalOpen) {
      backgroundWakeEngine.setLanguage(language);
      backgroundWakeEngine.setCrowdIsolation(crowdIsolationEnabled);
      backgroundWakeEngine.start();
      startAudioMeter();
      setMicActive(true);
      setMicStatus('listening');
    } else {
      backgroundWakeEngine.stop();
      cleanupAll();
      setMicStatus('idle');
    }

    return () => {
      backgroundWakeEngine.stop();
      cleanupAll();
    };
  }, [autoListenEnabled, isVoiceModalOpen, language, crowdIsolationEnabled]);

  const handleToggle = () => {
    if (autoListenEnabled) {
      backgroundWakeEngine.stop();
      cleanupAll();
      onToggleAutoListen(false);
      setMicStatus('idle');
    } else {
      soundEffects.playWakeChime();
      onToggleAutoListen(true);
    }
  };

  const currentPersona = VOICE_PERSONAS.find((p) => p.id === selectedVoiceId) || VOICE_PERSONAS[0];

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md relative overflow-hidden">
      {/* Persistent subtle top accent line indicating active background acoustic listening */}
      {autoListenEnabled && bgStatus.backgroundListeningEnabled && (
        <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
      )}
      
      {/* Left: Status & Wake Word details */}
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg border transition-all ${
            micStatus === 'interrupted'
              ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-md animate-pulse'
              : autoListenEnabled && micActive
              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950/40'
              : micStatus === 'error'
              ? 'bg-rose-950/70 border-rose-600 text-rose-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {autoListenEnabled && micActive ? (
            <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-100 tracking-tight">
              Auto-Listen & Wake Command Engine
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                micStatus === 'interrupted'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                  : autoListenEnabled && micActive
                  ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-400'
                  : micStatus === 'error'
                  ? 'bg-rose-950/80 border-rose-600/60 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {micStatus === 'interrupted'
                ? 'BARGE-IN: INTERRUPTED & LISTENING'
                : autoListenEnabled && micActive
                ? 'LISTENING LIVE · SAY "HEY AURA"'
                : micStatus === 'error'
                ? 'MIC ACCESS NEEDED'
                : 'STANDBY'}
            </span>

            {/* Persistent Subtle Visual Status Indicator for Background Wake Engine */}
            {autoListenEnabled && bgStatus.backgroundListeningEnabled ? (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1.5 shadow-sm group cursor-pointer ${
                  bgStatus.isBackgrounded
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-cyan-950/50'
                    : 'bg-slate-950/90 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-950/40'
                }`}
                title="Continuous background wake-word engine is active. Microphone listens for 'Hey AURA' or 'AURA' even when this tab is minimized, in the background, or blurred. Click to view engine telemetry."
              >
                {/* Subtle pulsing concentric beacon */}
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                </span>

                {/* 3 micro soundwave bars reflecting live acoustic buffer */}
                <span className="inline-flex items-center gap-0.5 h-2.5 opacity-80 group-hover:opacity-100">
                  <span
                    className="w-0.5 rounded-full bg-cyan-400 transition-all duration-150"
                    style={{
                      height: `${Math.min(10, Math.max(3, (audioLevel / 100) * 10))}px`,
                    }}
                  />
                  <span
                    className="w-0.5 rounded-full bg-cyan-300 transition-all duration-150"
                    style={{
                      height: `${Math.min(10, Math.max(5, (audioLevel / 100) * 12 + 2))}px`,
                    }}
                  />
                  <span
                    className="w-0.5 rounded-full bg-cyan-400 transition-all duration-150"
                    style={{
                      height: `${Math.min(10, Math.max(3, (audioLevel / 100) * 8 + 1))}px`,
                    }}
                  />
                </span>

                <span className="font-semibold tracking-tight">
                  {bgStatus.isBackgrounded
                    ? 'HEY AURA: ACTIVE (IN BACKGROUND)'
                    : 'HEY AURA: BACKGROUND ARMED'}
                </span>
              </button>
            ) : autoListenEnabled && !bgStatus.backgroundListeningEnabled ? (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-slate-950/70 border-slate-700 text-slate-400 flex items-center gap-1.5 hover:text-slate-200 transition-colors"
                title="Background listening is disabled. Click to enable in settings."
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                <span>HEY AURA: FOREGROUND ONLY</span>
              </button>
            ) : null}

            {/* Voice Identity Bio-Lock Indicator & Calibration Trigger */}
            <button
              type="button"
              onClick={() => setShowVoiceIdentityModal(true)}
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1.5 shadow-sm group cursor-pointer ${
                bgStatus.isVoiceIdentityEnrolled && bgStatus.isVoiceIdentityEnforced
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-emerald-950/40 hover:border-emerald-400'
                  : bgStatus.isVoiceIdentityEnrolled
                  ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300 hover:border-cyan-400'
                  : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
              title="Voice Identity Biometrics: Distinguishes your unique vocal profile from background noise and ambient chatter. Click to configure or calibrate."
            >
              <ShieldCheck className={`w-3 h-3 ${bgStatus.isVoiceIdentityEnforced ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>
                {bgStatus.isVoiceIdentityEnrolled && bgStatus.isVoiceIdentityEnforced
                  ? `VOICE LOCK: ACTIVE (${bgStatus.voiceMatchConfidence}%)`
                  : bgStatus.isVoiceIdentityEnrolled
                  ? 'VOICE ID: ENROLLED'
                  : 'CALIBRATE VOICE IDENTITY'}
              </span>
            </button>

            {lastActionExecution ? (
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>EXECUTED: {lastActionExecution.summary}</span>
              </span>
            ) : detectedPhrase ? (
              <span className="text-[10px] text-cyan-200 font-mono font-medium max-w-sm truncate bg-cyan-950/80 border border-cyan-500/60 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span className="text-cyan-400 font-bold text-[9px] uppercase tracking-wider">Hearing:</span>
                <span className="truncate italic">"{detectedPhrase}"</span>
              </span>
            ) : null}
          </div>

          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Wake words:</span>
            <strong className="text-cyan-300 font-mono">"Hey AURA"</strong>
            <span aria-hidden="true">·</span>
            <strong className="text-cyan-300 font-mono">"AURA"</strong>
            <span aria-hidden="true">·</span>
            <strong className="text-cyan-300 font-mono">"Suno AURA"</strong>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-300/90 font-medium text-[10px] flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" />
              <span>Background Wake Ready</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-semibold text-[10px] bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/40">1st Priority: Always Listens</span>
          </div>

          {statusMessage && (
            <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Natural Voice Selector & Controls */}
      <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
        
        {/* Real-time Voice Isolation & Decibel Bar when active */}
        {autoListenEnabled && micActive && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">MIC</span>
              <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden flex items-center">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    acousticData.isNearFieldVoice
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                      : 'bg-gradient-to-r from-cyan-500 to-slate-500'
                  }`}
                  style={{ width: `${Math.max(10, audioLevel)}%` }}
                />
              </div>
            </div>

            {/* Acoustic Isolation Status */}
            {crowdIsolationEnabled && (
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  acousticData.isNearFieldVoice
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                    : acousticData.isCrowdNoiseDetected
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title={`Ambient Noise Floor: ${acousticData.ambientNoiseFloor}% | Signal-to-Noise: ${acousticData.snrDb} dB`}
              >
                {acousticData.isNearFieldVoice
                  ? `VOICE ISOLATED (+${acousticData.snrDb}dB)`
                  : acousticData.isCrowdNoiseDetected
                  ? `CROWD BABBLE FILTERED (${acousticData.ambientNoiseFloor}%)`
                  : 'CROWD FILTER ARMED'}
              </span>
            )}
          </div>
        )}

        {/* Crowd Noise Isolation Filter Toggle */}
        <button
          onClick={() => {
            soundEffects.playSuccessChime();
            setCrowdIsolationEnabled((prev) => !prev);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
            crowdIsolationEnabled
              ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-sm'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Cocktail Party Effect / Crowd Noise Rejection Filter"
        >
          <Shield className={`w-3 h-3 ${crowdIsolationEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">
            {crowdIsolationEnabled ? 'Crowd Filter: Active' : 'Crowd Filter: Off'}
          </span>
        </button>

        {/* Desktop Notification Arming Button */}
        {bgStatus.notificationPermission === 'granted' ? (
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors border bg-emerald-950/70 border-emerald-500/60 text-emerald-300"
            title="Desktop alerts armed: AURA notifies you when Hey AURA is spoken in other tabs or apps"
          >
            <BellRing className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="hidden xl:inline">Alerts: ON</span>
          </button>
        ) : (
          <button
            onClick={async () => {
              const res = await backgroundWakeEngine.requestNotificationPermission();
              if (res === 'granted') {
                soundEffects.playSuccessChime();
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors border bg-cyan-950/80 border-cyan-500/70 text-cyan-300 animate-pulse hover:bg-cyan-900/80"
            title="Enable system desktop alerts so AURA alerts you even when app is minimized or in another tab"
          >
            <Bell className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Enable Alerts</span>
          </button>
        )}

        {/* Engine Settings Modal Trigger */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
          title="Configure Background Listening & Wake-Word Engine"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Engine Settings</span>
        </button>

        {/* Natural Voice Selector */}
        {onVoiceChange && (
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedVoiceId}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-slate-200 outline-none cursor-pointer pr-1"
              title="Select Natural Voice Timbre"
            >
              <optgroup label="Natural Native Male Voices">
                {VOICE_PERSONAS.filter((v) => v.gender === 'male').map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Natural Female Voices">
                {VOICE_PERSONAS.filter((v) => v.gender === 'female').map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={() => testVoicePersona(selectedVoiceId, language === 'ur_slang' ? 'ur' : 'en')}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-[10px] text-slate-300 transition-colors"
              title="Test Voice Audio"
            >
              Test
            </button>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            autoListenEnabled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          {autoListenEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          <span>{autoListenEnabled ? 'Listening: ON' : 'Turn ON Auto-Listen'}</span>
        </button>
      </div>

      {/* Background Wake-Word & Engine Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/60 text-cyan-400 shadow-md">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Real-Time Background Wake-Word Engine
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Continuous acoustic listening for "Hey AURA" / "AURA" even when this tab is minimized or in the background.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Telemetry Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current App Focus Status:</span>
                <span className={`font-mono font-bold ${bgStatus.isBackgrounded ? 'text-cyan-400 flex items-center gap-1' : 'text-emerald-400'}`}>
                  {bgStatus.isBackgrounded ? 'RUNNING IN BACKGROUND / BLURRED' : 'FOCUSED IN FOREGROUND'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Desktop Notification Permission:</span>
                <span className={`font-mono font-bold ${bgStatus.notificationPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {bgStatus.notificationPermission.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Acoustic Audio Keep-Alive Cycles:</span>
                <span className="font-mono text-cyan-300">
                  {bgStatus.audioProcessCount} Web Audio buffers processed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Signal-to-Noise Ratio (SNR):</span>
                <span className="font-mono text-cyan-300">+{bgStatus.snrDb} dB</span>
              </div>
            </div>

            {/* Settings Toggles */}
            <div className="space-y-3">
              {/* Toggle 1: Background Listening */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="pr-4">
                  <div className="text-sm font-semibold text-slate-200">
                    Background Listening (App Not In Focus)
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Keeps microphone stream alive through zero-gain Web Audio destination to bypass browser tab sleep.
                  </div>
                </div>
                <button
                  onClick={() => backgroundWakeEngine.setBackgroundListeningEnabled(!bgStatus.backgroundListeningEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${bgStatus.backgroundListeningEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${bgStatus.backgroundListeningEnabled ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Toggle 2: Desktop Push Notifications */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="pr-4">
                  <div className="text-sm font-semibold text-slate-200">
                    Desktop Notification on Wake-Word
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Fires a native desktop notification when "Hey AURA" or "AURA" is heard while working in another app.
                  </div>
                </div>
                {bgStatus.notificationPermission === 'granted' ? (
                  <button
                    onClick={() => backgroundWakeEngine.setDesktopNotificationsEnabled(!bgStatus.desktopNotificationsEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${bgStatus.desktopNotificationsEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${bgStatus.desktopNotificationsEnabled ? 'left-6.5' : 'left-0.5'}`} />
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await backgroundWakeEngine.requestNotificationPermission();
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    Grant Permission
                  </button>
                )}
              </div>
            </div>

            {/* Test Background Wake Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
              <button
                onClick={() => {
                  backgroundWakeEngine.testBackgroundWake();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-300 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate "Hey AURA" Alert (Test Chime & Notification)</span>
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Identity Enrollment & Bio-Lock Modal */}
      <VoiceIdentityModal
        isOpen={showVoiceIdentityModal}
        onClose={() => setShowVoiceIdentityModal(false)}
        onProfileUpdated={() => {
          backgroundWakeEngine.refreshVoiceIdentity();
        }}
      />
    </div>
  );
};
