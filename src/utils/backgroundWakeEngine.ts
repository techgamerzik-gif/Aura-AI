/**
 * Real-Time Background Wake-Word Detection Engine for AURA Executive Assistant.
 *
 * Keeps continuous microphone listening active even when the application tab is
 * minimized, blurred, or running in the background. Uses an active Web Audio DSP
 * pipeline with zero-gain destination binding to prevent Chrome/Chromium background
 * throttling, combined with native Desktop Notifications and audio chimes to alert
 * the user when "Hey AURA" or "AURA" is spoken.
 */

import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  detectWakeWord,
  isSpeaking,
  stopSpeaking,
  speakText,
  isAcousticEcho,
  INTERRUPT_PATTERNS,
} from './speech.ts';
import {
  parseUserDirective,
  parseMultiUserDirectives,
  synthesizeMultiTaskReport,
  type ParsedDirective,
} from './intentParser.ts';
import { commandLearningEngine } from './commandLearningEngine.ts';
import { soundEffects } from './audioChime.ts';
import {
  getAcousticMicrophoneConstraints,
  createVocalDSPFilterChain,
  isPassiveCrowdChatter,
  AdaptiveAcousticTracker,
  type AcousticTelemetry,
  voiceFingerprintEngine,
} from './noiseFilter.ts';
import {
  VoiceIdentityProfile,
  LiveSpeakerVerification,
  getStoredVoiceIdentity,
  isVoiceIdentityEnforced,
  extractAcousticFeatures,
  verifyVoiceIdentity,
} from './voiceIdentity.ts';

export interface BackgroundWakeStatus {
  isListening: boolean;
  isBackgrounded: boolean;
  backgroundListeningEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  notificationPermission: NotificationPermission;
  lastWakeTimestamp: number;
  lastWakePhrase: string;
  audioProcessCount: number;
  snrDb: number;
  isNearFieldVoice: boolean;
  isVoiceIdentityEnforced: boolean;
  isVoiceIdentityEnrolled: boolean;
  voiceMatchConfidence: number;
  speakerLabel: string;
}

export type WakeCallback = (
  command: string,
  wasBackground: boolean,
  directives?: ParsedDirective[]
) => void;

export type DirectActionCallback = (
  actionType: string,
  details: any,
  replyText?: string
) => void;

class BackgroundWakeEngine {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private recognizer: any = null;

  private isListening = false;
  private isBackgrounded = false;
  private backgroundListeningEnabled = true;
  private desktopNotificationsEnabled = true;
  private notificationPermission: NotificationPermission = 'default';

  private originalTitle = 'AURA | Autonomous Universal Routine Administrator';
  private titleBlinkInterval: any = null;
  private restartTimeout: any = null;
  private pauseTimer: any = null;

  private lastWakeTimestamp = 0;
  private lastWakePhrase = '';
  private audioProcessCount = 0;
  private tracker = new AdaptiveAcousticTracker();
  private telemetry: AcousticTelemetry = {
    audioEnergy: 0,
    ambientNoiseFloor: 12,
    snrDb: 0,
    isNearFieldVoice: false,
    isCrowdNoiseDetected: false,
    formantClarity: 0,
  };

  private wakeListeners: Set<WakeCallback> = new Set();
  private actionListeners: Set<DirectActionCallback> = new Set();
  private statusListeners: Set<(status: BackgroundWakeStatus) => void> = new Set();
  private interimListeners: Set<(text: string) => void> = new Set();
  private crowdIsolationEnabled = true;
  private language = 'en';

  // Voice Identity & Biometric Verification
  private voiceIdentityProfile: VoiceIdentityProfile | null = getStoredVoiceIdentity();
  private voiceIdentityEnforced = isVoiceIdentityEnforced();
  private liveVerification: LiveSpeakerVerification = {
    isMatch: true,
    confidence: 100,
    speakerLabel: 'Verified Executive User',
    pitchHz: 120,
    snrDb: 0,
    isNearField: true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.originalTitle = document.title || this.originalTitle;
      this.isBackgrounded = document.hidden || !document.hasFocus();

      // Load persisted preferences
      const savedBg = localStorage.getItem('aura_bg_listening');
      this.backgroundListeningEnabled = savedBg !== null ? savedBg === 'true' : true;

      const savedNotif = localStorage.getItem('aura_bg_notifications');
      this.desktopNotificationsEnabled = savedNotif !== null ? savedNotif === 'true' : true;

      const savedCrowd = localStorage.getItem('aura_crowd_filter');
      this.crowdIsolationEnabled = savedCrowd !== 'false';

      this.voiceIdentityProfile = getStoredVoiceIdentity();
      this.voiceIdentityEnforced = isVoiceIdentityEnforced();

      if ('Notification' in window) {
        this.notificationPermission = Notification.permission;
      }

      // Bind visibility change and focus/blur handlers
      document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
      window.addEventListener('blur', () => this.handleFocusChange(false));
      window.addEventListener('focus', () => this.handleFocusChange(true));
    }
  }

  // -------------------------------------------------------------
  // Public Accessors & Controls
  // -------------------------------------------------------------

  public getStatus(): BackgroundWakeStatus {
    return {
      isListening: this.isListening,
      isBackgrounded: this.isBackgrounded,
      backgroundListeningEnabled: this.backgroundListeningEnabled,
      desktopNotificationsEnabled: this.desktopNotificationsEnabled,
      notificationPermission: this.notificationPermission,
      lastWakeTimestamp: this.lastWakeTimestamp,
      lastWakePhrase: this.lastWakePhrase,
      audioProcessCount: this.audioProcessCount,
      snrDb: this.telemetry.snrDb,
      isNearFieldVoice: this.telemetry.isNearFieldVoice,
      isVoiceIdentityEnforced: this.voiceIdentityEnforced,
      isVoiceIdentityEnrolled: !!this.voiceIdentityProfile?.isEnrolled,
      voiceMatchConfidence: this.liveVerification.confidence,
      speakerLabel: this.liveVerification.speakerLabel,
    };
  }

  public refreshVoiceIdentity() {
    this.voiceIdentityProfile = getStoredVoiceIdentity();
    this.voiceIdentityEnforced = isVoiceIdentityEnforced();
    this.notifyStatus();
  }

  public setBackgroundListeningEnabled(enabled: boolean) {
    this.backgroundListeningEnabled = enabled;
    localStorage.setItem('aura_bg_listening', String(enabled));
    this.notifyStatus();
  }

  public setDesktopNotificationsEnabled(enabled: boolean) {
    this.desktopNotificationsEnabled = enabled;
    localStorage.setItem('aura_bg_notifications', String(enabled));
    this.notifyStatus();
  }

  public setCrowdIsolation(enabled: boolean) {
    this.crowdIsolationEnabled = enabled;
    localStorage.setItem('aura_crowd_filter', String(enabled));
  }

  public setLanguage(lang: string) {
    this.language = lang;
    if (this.isListening) {
      this.restartRecognizer();
    }
  }

  public onWakeDetected(cb: WakeCallback): () => void {
    this.wakeListeners.add(cb);
    return () => this.wakeListeners.delete(cb);
  }

  public onDirectAction(cb: DirectActionCallback): () => void {
    this.actionListeners.add(cb);
    return () => this.actionListeners.delete(cb);
  }

  public onStatusChange(cb: (status: BackgroundWakeStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => this.statusListeners.delete(cb);
  }

  public onInterimTranscript(cb: (text: string) => void): () => void {
    this.interimListeners.add(cb);
    return () => this.interimListeners.delete(cb);
  }

  public getTelemetry(): AcousticTelemetry {
    return this.telemetry;
  }

  public testBackgroundWake() {
    const sampleDirectives = [
      {
        actionType: 'LIGHT_CONTROL',
        details: { power: true, mode: 'focus' },
        summary: 'Turned ON Smart Lights (focus mode)',
        defaultReply: {
          en: 'Smart lights turned ON.',
          ur_slang: 'Smart lights on ho gayi hain.',
          ur_script: 'اسمارٹ لائٹس آن کر دی گئی ہیں۔',
        },
      },
      {
        actionType: 'PLAY_MEDIA',
        details: { title: 'Late Night Executive Jazz Lounge' },
        summary: 'Playing "Late Night Executive Jazz Lounge"',
        defaultReply: {
          en: 'Now playing jazz stream.',
          ur_slang: 'Jazz music play ho gaya.',
          ur_script: 'جاز میوزک شروع کر دیا گیا ہے۔',
        },
      },
    ];
    this.handleWakeEvent('Turn on smart lights and play jazz music', sampleDirectives);
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const res = await Notification.requestPermission();
      this.notificationPermission = res;
      this.notifyStatus();
      return res;
    } catch {
      return 'denied';
    }
  }

  // -------------------------------------------------------------
  // Audio & Speech Pipeline
  // -------------------------------------------------------------

  public async start(): Promise<boolean> {
    if (typeof window === 'undefined' || !isSpeechRecognitionSupported()) {
      return false;
    }
    this.isListening = true;

    await this.startAudioKeepAlive();
    this.startSpeechRecognizer();
    this.notifyStatus();
    return true;
  }

  public stop() {
    this.isListening = false;
    this.cleanupAudioKeepAlive();
    this.cleanupSpeechRecognizer();
    this.stopTitleBlink();
    this.notifyStatus();
  }

  /**
   * Initializes Web Audio DSP pipeline and binds a ScriptProcessor through a GainNode
   * into audioContext.destination.
   *
   * Crucial browser behavior: Connecting an active media stream to destination
   * (even with gain=0) flags the tab as an active audio producer in Chromium.
   * This exempts the tab from background tab suspension, timer throttling, and
   * process freezing when the window is minimized or not in focus.
   */
  private async startAudioKeepAlive() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      this.cleanupAudioKeepAlive();

      const constraints = getAcousticMicrophoneConstraints(this.crowdIsolationEnabled);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.audioCtx = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const { analyserNode } = createVocalDSPFilterChain(ctx, source);
      this.analyser = analyserNode;

      // ScriptProcessorNode keeps audio thread churning continuously in background
      const scriptNode = ctx.createScriptProcessor(2048, 1, 1);
      this.scriptProcessor = scriptNode;

      // Connect to silent gain to prevent feedback loop while maintaining destination attachment
      const silentGain = ctx.createGain();
      silentGain.gain.setValueAtTime(0, ctx.currentTime);
      this.silentGain = silentGain;

      const freqData = new Uint8Array(analyserNode.frequencyBinCount);

      scriptNode.onaudioprocess = () => {
        if (!this.isListening) return;
        this.audioProcessCount++;

        // Analyze acoustic frequency & RMS energy on audio clock
        analyserNode.getByteFrequencyData(freqData);
        this.telemetry = this.tracker.analyze(freqData);

        // Real-Time Voice Identity Biometric Tracking
        if (this.audioCtx) {
          const features = extractAcousticFeatures(freqData, this.audioCtx.sampleRate);
          this.liveVerification = verifyVoiceIdentity(
            features,
            this.voiceIdentityProfile,
            this.telemetry.snrDb,
            this.telemetry.isNearFieldVoice
          );
          // Process 5-second voice fingerprint buffer
          voiceFingerprintEngine.processAudioFrame(freqData, this.audioCtx.sampleRate);
        }

        // Hardware Watchdog: Ensure speech recognizer has not died silently in the background
        if (this.audioProcessCount % 120 === 0 && this.isListening) {
          this.checkAndReviveRecognizer();
        }
      };

      source.connect(scriptNode);
      scriptNode.connect(silentGain);
      silentGain.connect(ctx.destination);

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Background wake audio keep-alive notice:', err?.message || err);
    }
  }

  private cleanupAudioKeepAlive() {
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
      } catch {}
      this.scriptProcessor = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch {}
      this.silentGain = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.mediaStream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close().catch(() => {});
      } catch {}
      this.audioCtx = null;
    }
    this.analyser = null;
  }

  private startSpeechRecognizer() {
    if (typeof window === 'undefined' || !isSpeechRecognitionSupported()) return;
    this.cleanupSpeechRecognizer();

    const rec = createSpeechRecognizer(
      this.language,
      (transcript, isFinal) => {
        if (!this.isListening) return;

        // Crowd isolation filtering
        if (
          this.crowdIsolationEnabled &&
          isPassiveCrowdChatter(transcript, true, this.telemetry.isNearFieldVoice)
        ) {
          return;
        }

        if (isAcousticEcho(transcript)) {
          return;
        }

        // Barge-in: only halt ongoing speech if user explicitly speaks an interrupt command or wake word
        if (isSpeaking()) {
          const isWake = detectWakeWord(transcript).isWake;
          const isInterrupt = INTERRUPT_PATTERNS.some((pat) => pat.test(transcript));
          if (isWake || isInterrupt) {
            stopSpeaking(true);
          } else {
            return;
          }
        }

        const handleProcess = (candidateText: string) => {
          if (!candidateText.trim()) return;
          const trimmed = candidateText.trim();
          const now = Date.now();
          if (now - this.lastWakeTimestamp < 1200) return;

          const { isWake, command } = detectWakeWord(trimmed);
          const cleanCommand = command?.trim() || trimmed;

          // VOICE IDENTITY BIO-LOCK:
          // If Voice Identity is enforced and a profile is enrolled,
          // ignore speech from unverified speakers or ambient background audio,
          // but allow if an explicit wake word was spoken!
          if (
            this.voiceIdentityEnforced &&
            this.voiceIdentityProfile?.isEnrolled &&
            !this.liveVerification.isMatch &&
            !isWake
          ) {
            console.log(
              `[VoiceIdentity] Background audio ignored: "${trimmed}". Confidence: ${this.liveVerification.confidence}%`
            );
            return;
          }

          // 5-SECOND VOICE FINGERPRINT BUFFER PATTERN SHIELD:
          // Reject speech patterns not matching the user's primary voice fingerprint unless wake word is present
          if (
            voiceFingerprintEngine.isReady() &&
            voiceFingerprintEngine.isSuppressionEnabled() &&
            !isWake
          ) {
            const fp = voiceFingerprintEngine.getTelemetry();
            if (fp.isSuppressed && fp.liveMatchConfidence < 45) {
              console.log(
                `[VoiceFingerprint] Background wake audio ignored: "${trimmed}". Correlation: ${fp.liveMatchConfidence}%`
              );
              return;
            }
          }

          const multiDirectives = parseMultiUserDirectives(cleanCommand).length > 0
            ? parseMultiUserDirectives(cleanCommand)
            : parseMultiUserDirectives(trimmed);

          // 1. Compound multi-task directive detected
          if (multiDirectives.length > 1) {
            this.lastWakeTimestamp = now;
            this.lastWakePhrase = trimmed;
            this.handleWakeEvent(cleanCommand || trimmed, multiDirectives);

            const multiReport = synthesizeMultiTaskReport(multiDirectives, this.language);
            const replyText =
              this.language === 'ur_script'
                ? multiReport.reply.ur_script
                : this.language === 'ur_slang'
                ? multiReport.reply.ur_slang
                : multiReport.reply.en;

            multiDirectives.forEach((dir, idx) => {
              this.actionListeners.forEach((fn) => {
                fn(
                  dir.actionType,
                  dir.details,
                  idx === multiDirectives.length - 1 ? replyText : undefined
                );
              });
            });
            return;
          }

          // 2. Single direct directive detected from multiDirectives
          if (multiDirectives.length === 1) {
            const parsed = multiDirectives[0];
            this.lastWakeTimestamp = now;
            this.lastWakePhrase = trimmed;
            this.handleWakeEvent(cleanCommand || trimmed, [parsed]);

            const replyText =
              this.language === 'ur_script'
                ? parsed.defaultReply.ur_script
                : this.language === 'ur_slang'
                ? parsed.defaultReply.ur_slang
                : parsed.defaultReply.en;

            this.actionListeners.forEach((fn) => {
              fn(parsed.actionType, parsed.details, replyText);
            });
            return;
          }

          // 3. Fallback: Check single directive on clean command or trimmed input
          const singleDirective = parseUserDirective(cleanCommand) || parseUserDirective(trimmed);
          if (singleDirective) {
            this.lastWakeTimestamp = now;
            this.lastWakePhrase = trimmed;
            this.handleWakeEvent(cleanCommand || trimmed, [singleDirective]);

            const replyText =
              this.language === 'ur_script'
                ? singleDirective.defaultReply.ur_script
                : this.language === 'ur_slang'
                ? singleDirective.defaultReply.ur_slang
                : singleDirective.defaultReply.en;

            this.actionListeners.forEach((fn) => {
              fn(singleDirective.actionType, singleDirective.details, replyText);
            });
            return;
          }

          // 4. Fallback: Command Learning Engine Semantic Matching
          const learnedDirective = (commandLearningEngine.matchInput(cleanCommand)?.matched
            ? commandLearningEngine.matchInput(cleanCommand)
            : commandLearningEngine.matchInput(trimmed)) || { matched: false };

          if (learnedDirective.matched && learnedDirective.pattern) {
            this.lastWakeTimestamp = now;
            this.lastWakePhrase = trimmed;
            const actionType = learnedDirective.pattern.actionType;
            const details = learnedDirective.extractedDetails || learnedDirective.pattern.details;
            const summary = learnedDirective.pattern.summary;
            const replyText =
              this.language === 'ur_script'
                ? `حکم کریں، ${summary} مکمل کر دیا گیا ہے۔`
                : this.language === 'ur_slang'
                ? `Hukum Boss! ${summary} execute kar diya hai.`
                : `Confirmed: ${summary}.`;

            const parsedDirective: ParsedDirective = {
              actionType,
              details,
              summary,
              defaultReply: {
                en: `Confirmed: ${summary}.`,
                ur_slang: `Hukum Boss! ${summary} execute kar diya hai.`,
                ur_script: `حکم کریں، ${summary} مکمل کر دیا گیا ہے۔`,
              },
            };

            this.handleWakeEvent(cleanCommand || trimmed, [parsedDirective]);

            this.actionListeners.forEach((fn) => {
              fn(actionType, details, replyText);
            });
            return;
          }

          // 5. Explicit request to open chat box / modal
          if (/^(?:open|show|launch)\s+(?:the\s+)?(?:chat\s*box|voice\s*modal|chat|voice\s*chat|assistant\s*modal)$/i.test(cleanCommand.trim())) {
            this.lastWakeTimestamp = now;
            this.lastWakePhrase = trimmed;
            this.handleWakeEvent(cleanCommand || '', []);
            return;
          }

          // 6. Wake word detected alone ("Hey AURA" / "AURA") without trailing command
          if (isWake && !command) {
            this.lastWakeTimestamp = now;
            this.lastWakePhrase = trimmed;
            soundEffects.playWakeChime();
            const promptReply =
              this.language === 'ur_script'
                ? 'حکم کریں، میں سن رہا ہوں۔'
                : this.language === 'ur_slang'
                ? 'Hukum Boss! AURA alert hai, hands-free sun raha hoon. Batayein kya execute karoon?'
                : 'Standing by hands-free, Chief. How can I assist you?';
            speakText(promptReply, this.language);
            return;
          }

          // 7. Hands-free general inquiry / assistant chat resolution (execute without opening chat box!)
          if (isWake || trimmed.length > 3) {
            this.lastWakeTimestamp = now;
            this.lastWakePhrase = trimmed;

            // Asynchronously resolve via /api/assistant/chat hands-free
            fetch('/api/assistant/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: cleanCommand || trimmed, language: this.language }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data?.action) {
                  this.actionListeners.forEach((fn) => {
                    fn(data.action.actionType, data.action.details, data.reply);
                  });
                } else if (data?.reply) {
                  this.actionListeners.forEach((fn) => {
                    fn('CONVERSATIONAL_REPLY', {}, data.reply);
                  });
                }
              })
              .catch(() => {});
          }
        };

        if (isFinal) {
          this.interimListeners.forEach((fn) => fn(''));
          if (this.pauseTimer) clearTimeout(this.pauseTimer);
          handleProcess(transcript);
        } else {
          this.interimListeners.forEach((fn) => fn(transcript));
          if (this.pauseTimer) clearTimeout(this.pauseTimer);
          this.pauseTimer = setTimeout(() => {
            if (this.isListening) handleProcess(transcript);
          }, 800);
        }
      },
      (err) => {
        if (!this.isListening) return;
        const errType = err?.error || '';
        if (
          errType === 'not-allowed' ||
          errType === 'service-not-allowed' ||
          errType === 'audio-capture'
        ) {
          this.stop();
          return;
        }

        // Restart with slight backoff in background
        this.restartTimeout = setTimeout(() => {
          if (this.isListening) {
            this.startSpeechRecognizer();
          }
        }, 1200);
      },
      () => {
        if (!this.isListening) return;
        // Speech cycle ended naturally; restart immediately to maintain continuous background coverage
        this.restartTimeout = setTimeout(() => {
          if (this.isListening) {
            this.startSpeechRecognizer();
          }
        }, 300);
      }
    );

    if (rec) {
      this.recognizer = rec;
      try {
        rec.start();
      } catch (e: any) {
        // already started or transitioning
      }
    }
  }

  private cleanupSpeechRecognizer() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (this.recognizer) {
      try {
        this.recognizer.onresult = null;
        this.recognizer.onerror = null;
        this.recognizer.onend = null;
        this.recognizer.stop();
      } catch {}
      this.recognizer = null;
    }
  }

  private restartRecognizer() {
    this.cleanupSpeechRecognizer();
    setTimeout(() => {
      if (this.isListening) {
        this.startSpeechRecognizer();
      }
    }, 200);
  }

  private checkAndReviveRecognizer() {
    if (!this.isListening) return;
    if (!this.recognizer) {
      this.startSpeechRecognizer();
    }
  }

  // -------------------------------------------------------------
  // Background Wake Alerting & System Notifications
  // -------------------------------------------------------------

  private handleWakeEvent(command: string, directives: ParsedDirective[]) {
    const wasBackground =
      this.isBackgrounded ||
      (typeof document !== 'undefined' ? document.hidden || !document.hasFocus() : false);

    // 1. Play audible Wake Chime via Web Audio (plays even in background)
    soundEffects.playWakeChime();

    // 2. Dispatch wake listeners
    this.wakeListeners.forEach((fn) => {
      try {
        fn(command, wasBackground, directives);
      } catch {}
    });

    // 3. If triggered while app is not in focus: alert user through desktop notifications and title flash
    if (wasBackground) {
      this.triggerBackgroundWakeNotification(command, directives);
      this.startTitleBlink();
      this.attemptWindowFocus();
    }

    this.notifyStatus();
  }

  private triggerBackgroundWakeNotification(command: string, directives: ParsedDirective[]) {
    if (!this.desktopNotificationsEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      let bodyText = '🎙️ AURA is awake and listening for your command.';
      if (directives && directives.length > 1) {
        bodyText = `⚡ Executing ${directives.length} tasks: ${directives.map((d) => d.summary).join(' · ')}`;
      } else if (directives && directives.length === 1) {
        bodyText = `⚡ Executing: ${directives[0].summary}`;
      } else if (command) {
        bodyText = `Directive: "${command}"`;
      }

      const notif = new Notification('AURA Voice Copilot Active', {
        body: bodyText,
        icon: '/favicon.ico',
        tag: 'aura-wake-notification',
        requireInteraction: false,
        silent: false,
      });

      notif.onclick = () => {
        window.focus();
        this.stopTitleBlink();
        notif.close();
      };

      // Auto close after 6 seconds
      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, 6000);
    } catch (e) {
      // Non-fatal notification error
    }
  }

  private startTitleBlink() {
    if (typeof window === 'undefined') return;
    this.stopTitleBlink();

    let toggle = false;
    this.titleBlinkInterval = setInterval(() => {
      toggle = !toggle;
      document.title = toggle
        ? '🔴 [AURA WAKE ACTIVE] AURA Executive AI'
        : '🎙️ [LISTENING...] AURA Chief of Staff';
    }, 700);

    // Stop title blinking after 20 seconds or upon window focus
    setTimeout(() => this.stopTitleBlink(), 20000);
  }

  private stopTitleBlink() {
    if (this.titleBlinkInterval) {
      clearInterval(this.titleBlinkInterval);
      this.titleBlinkInterval = null;
    }
    if (typeof window !== 'undefined') {
      document.title = this.originalTitle;
    }
  }

  private attemptWindowFocus() {
    if (typeof window !== 'undefined') {
      try {
        window.focus();
      } catch {}
    }
  }

  private handleVisibilityChange() {
    if (typeof document === 'undefined') return;
    const isHidden = document.hidden;
    this.isBackgrounded = isHidden;

    if (!isHidden) {
      this.stopTitleBlink();
      // Tab returned to focus; ensure audio context is active
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    }

    this.notifyStatus();
  }

  private handleFocusChange(focused: boolean) {
    this.isBackgrounded = !focused;
    if (focused) {
      this.stopTitleBlink();
    }
    this.notifyStatus();
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach((fn) => {
      try {
        fn(status);
      } catch {}
    });
  }
}

export const backgroundWakeEngine = new BackgroundWakeEngine();
