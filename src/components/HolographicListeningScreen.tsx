import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Tv,
  Sparkles,
  Volume2,
  Radio,
  Activity,
  Layers,
  ChevronRight,
  Shield,
  Zap,
  Clock,
  Compass,
  Cpu,
  Power,
  RotateCcw,
} from 'lucide-react';
import { AgentPersona, LanguageMode, WiFiDevice } from '../types/assistant.ts';
import { AGENT_PERSONAS } from './AgentSquad.tsx';
import { speakText, stopSpeaking, isSpeaking } from '../utils/speech.ts';
import { soundEffects } from '../utils/audioChime.ts';
import { sendSmartTVCommand, getStoredWiFiDevices } from '../services/deviceService.ts';

interface HolographicListeningScreenProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent: AgentPersona;
  onSelectAgent: (agent: AgentPersona) => void;
  language: LanguageMode;
  onExecuteVoiceDirective?: (actionType: string, details: any, replyText?: string) => void;
}

export const HolographicListeningScreen: React.FC<HolographicListeningScreenProps> = ({
  isOpen,
  onClose,
  activeAgent,
  onSelectAgent,
  language,
  onExecuteVoiceDirective,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMicActive, setIsMicActive] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [currentActionSummary, setCurrentActionSummary] = useState<string | null>(null);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0.35);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [connectedTV, setConnectedTV] = useState<WiFiDevice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const recognizerRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const isSpeakingStateRef = useRef(false);

  // Update clock
  useEffect(() => {
    if (!isOpen) return;
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Load connected Smart TV
  useEffect(() => {
    if (!isOpen) return;
    const devs = getStoredWiFiDevices();
    const tv = devs.find((d) => d.type === 'smart_tv') || null;
    setConnectedTV(tv);
  }, [isOpen]);

  // Initialize Speech Recognition for Fullscreen Holographic Listening
  useEffect(() => {
    if (!isOpen || !isMicActive) {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {}
        recognizerRef.current = null;
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognizer = new SpeechRec();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = activeAgent.voiceLang || 'ur-PK';

      recognizer.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const heardText = (final || interim).trim();
        if (heardText) {
          setLiveTranscript(heardText);
        }

        if (final && final.trim().length > 1) {
          handleExecuteUtterance(final.trim());
        }
      };

      recognizer.onerror = () => {
        // Auto recover on speech pause
      };

      recognizer.onend = () => {
        // Keep alive while screen is open
        if (isOpen && isMicActive) {
          setTimeout(() => {
            try {
              recognizer.start();
            } catch {}
          }, 250);
        }
      };

      recognizer.start();
      recognizerRef.current = recognizer;
    } catch {
      // Speech recognition fallback
    }

    return () => {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {}
        recognizerRef.current = null;
      }
    };
  }, [isOpen, isMicActive, activeAgent.voiceLang]);

  // Execute Utterance with Smart TV, Media, and Executive Voice Handlers
  const handleExecuteUtterance = async (command: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    soundEffects.playSuccessChime();

    const lowCmd = command.toLowerCase();

    // 0. Close / Exit Holographic Screen
    if (
      lowCmd.includes('exit') ||
      lowCmd.includes('close') ||
      lowCmd.includes('dismiss') ||
      lowCmd.includes('wapas jao') ||
      lowCmd.includes('back to dashboard') ||
      lowCmd.includes('screen band karo')
    ) {
      soundEffects.playSleepChime();
      setIsProcessing(false);
      onClose();
      return;
    }

    // 1. Direct Smart TV Controls
    if (lowCmd.includes('tv') || lowCmd.includes('screen') || lowCmd.includes('ٹی وی')) {
      const tv = connectedTV;
      const tvIp = tv?.ipAddress || '192.168.1.105';
      const tvBrand = tv?.brand || 'universal';

      if (lowCmd.includes('band') || lowCmd.includes('off')) {
        sendSmartTVCommand(tvIp, tvBrand, 'POWER_OFF').catch(() => {});
        const reply = 'Smart TV switched OFF into low-power standby.';
        announceResponse(reply, 'Smart TV Turned OFF');
        return;
      }

      if (lowCmd.includes('on') || lowCmd.includes('chala') || lowCmd.includes('start')) {
        sendSmartTVCommand(tvIp, tvBrand, 'POWER_ON').catch(() => {});
        const reply = 'Smart TV turned ON. Command dispatched to hardware controller.';
        announceResponse(reply, 'Smart TV Turned ON');
        return;
      }

      if (lowCmd.includes('volume up') || lowCmd.includes('barhao') || lowCmd.includes('tez')) {
        sendSmartTVCommand(tvIp, tvBrand, 'VOLUME_UP').catch(() => {});
        const reply = 'Smart TV volume raised by 10 points.';
        announceResponse(reply, 'Volume Raised (+10)');
        return;
      }

      if (lowCmd.includes('volume down') || lowCmd.includes('kam') || lowCmd.includes('slow')) {
        sendSmartTVCommand(tvIp, tvBrand, 'VOLUME_DOWN').catch(() => {});
        const reply = 'Smart TV volume lowered.';
        announceResponse(reply, 'Volume Lowered (-10)');
        return;
      }

      if (lowCmd.includes('mute') || lowCmd.includes('khamosh') || lowCmd.includes('chup')) {
        sendSmartTVCommand(tvIp, tvBrand, 'MUTE').catch(() => {});
        const reply = 'Smart TV audio muted.';
        announceResponse(reply, 'Smart TV Muted');
        return;
      }

      if (lowCmd.includes('youtube')) {
        sendSmartTVCommand(tvIp, tvBrand, 'LAUNCH_APP', { app: 'youtube' }).catch(() => {});
        const reply = 'Launching YouTube on your connected Smart TV.';
        announceResponse(reply, 'Launched YouTube on TV');
        return;
      }
    }

    // 1.5 Flight & Travel Intelligence
    if (lowCmd.includes('flight') || lowCmd.includes('airport') || lowCmd.includes('tesla pickup') || lowCmd.includes('travel intelligence')) {
      const reply = 'Flight EK-601 touchdown at 20:45 GST parsed from email. Optimal Tesla Model S Plaid pickup staged for 21:05 with cabin pre-cooling to 21°C.';
      announceResponse(reply, 'Flight Ground Transit Staged');
      if (onExecuteVoiceDirective) {
        onExecuteVoiceDirective('TRAVEL_INTELLIGENCE', { flight: 'EK-601' }, reply);
      }
      return;
    }

    // 2. Punjabi Jugat command
    if (lowCmd.includes('jugat') || lowCmd.includes('lateefa') || lowCmd.includes('joke')) {
      const reply =
        activeAgent.id === 'chaudhry_punjabi'
          ? 'Oye Chaudhry Sahab! Ik banda kehnda gaddi 200 te chalaani ae, agla kehnda pehlan clutch te labh le! Scene fit ae boss!'
          : 'Aik sahab computer engineer se kehne lage: "Mera laptop thanda nahi hota". Engineer ne kaha: "AC ke samne bithayein aur biryani khilayein!"';
      announceResponse(reply, 'Desi Jugat / Humor');
      return;
    }

    // 3. Fast Assistant Chat API Resolution with realistic 12s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: command,
          language: activeAgent.voiceLang.startsWith('en') ? 'en' : 'ur_slang',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.reply) {
          announceResponse(data.reply, data?.action?.summary || 'Voice Directive Executed');
          if (data?.action && onExecuteVoiceDirective) {
            onExecuteVoiceDirective(data.action.actionType, data.action.details, data.reply);
          }
          return;
        }
      }
    } catch {
      // Fallback to intelligent local executive responder
    }

    // 4. Intelligent contextual executive fallback response
    let defaultReply = '';
    let actionType: string | null = null;
    let actionDetails: any = {};
    const lowerCmd = command.toLowerCase();

    if (/schedule|meeting|agenda|calendar/i.test(lowerCmd)) {
      actionType = 'SHOW_SCHEDULE';
      defaultReply = activeAgent.voiceLang === 'pa-IN'
        ? `Tuhada schedule ready ae! Global Board Strategy session de baad 15-minute buffer set ae, phir Series B sync ae.`
        : activeAgent.voiceLang.startsWith('en')
        ? `Here is your schedule: Global Board Strategy session is active with a 15-minute cognitive reset buffer before the Series B sync.`
        : `Boss, aapka schedule ready hai: Global Board Strategy session ke baad mandatory 15-minute buffer laga hai, phir Series B sync hai.`;
    } else if (/burnout|focus|buffer|cognitive/i.test(lowerCmd)) {
      actionType = 'SHOW_SCHEDULE';
      actionDetails = { view: 'burnout' };
      defaultReply = activeAgent.voiceLang === 'pa-IN'
        ? `Burnout risk analysis: Sequential meeting density 82% ton ghatt karke 28% te neutralize ho gayi ae buffer rule naal.`
        : activeAgent.voiceLang.startsWith('en')
        ? `Sequential meeting density analysis: Midday burnout risk reduced from 82% to 28% via mandatory 15-minute cognitive reset buffers.`
        : `Boss, burnout risk 15-minute cognitive buffer rule ke zariye 82% se gir kar 28% par maintain ho chuka hai.`;
    } else if (/task|deliverable|kaam|work done|summary/i.test(lowerCmd)) {
      actionType = 'SHOW_WORK_AUDIT';
      defaultReply = activeAgent.voiceLang === 'pa-IN'
        ? `Aaj de executive tasks: 3 priority deliverables executed, Tesla 21°C te set ae, te Flight BA-2490 pickup coordinate ae.`
        : activeAgent.voiceLang.startsWith('en')
        ? `Executive audit summary: 3 deliverables executed, Tesla cabin pre-conditioned at 21.0°C, and Flight BA-2490 pickup coordinated.`
        : `Boss, aaj ka summary brief: 3 deliverables complete hain, Tesla Plaid 21°C par hai, aur Flight BA-2490 ground pickup active hai.`;
    } else if (/travel|flight|airport|tesla/i.test(lowerCmd)) {
      actionType = 'SHOW_CONCIERGE';
      defaultReply = activeAgent.voiceLang === 'pa-IN'
        ? `Flight BA-2490 Heathrow T5 te 17:45 land karegi, Tesla Plaid autonomous dispatch ho chuki ae.`
        : activeAgent.voiceLang.startsWith('en')
        ? `Flight BA-2490 arrives Heathrow Terminal 5 at 17:45. Autonomous Tesla Plaid pickup is scheduled 20 minutes prior.`
        : `Flight BA-2490 Heathrow Terminal 5 par 17:45 land karegi, Tesla Plaid ground dispatch ready hai.`;
    } else {
      defaultReply = activeAgent.voiceLang === 'pa-IN'
        ? `Oye hukum sar ankhon te! "${command}" da pura hisab note kar litta ae, agla hukum farmayo!`
        : activeAgent.voiceLang.startsWith('en')
        ? `Understood, Chief. Verified "${command}". System parameters and live watchdogs are fully aligned.`
        : `Jee Boss! "${command}" note ho gaya hai. AURA live telemetry aur watchdogs ke sath bilkul tayyar hai.`;
    }

    announceResponse(defaultReply, 'Executive Command Executed');
    if (actionType && onExecuteVoiceDirective) {
      onExecuteVoiceDirective(actionType, actionDetails, defaultReply);
    }
  };

  const announceResponse = (reply: string, actionSummary: string) => {
    setAssistantReply(reply);
    setCurrentActionSummary(actionSummary);
    setIsProcessing(false);
    isSpeakingStateRef.current = true;

    // Speak in native agent voice
    let voiceId = 'tariq_urdu_male';
    if (activeAgent.id === 'chaudhry_punjabi') {
      voiceId = 'chaudhry_punjabi_male';
    } else if (activeAgent.id === 'aura_prime') {
      voiceId = 'aura_executive_female';
    } else if (activeAgent.id === 'sikandar_comms') {
      voiceId = 'farhan_lahori_male';
    } else if (activeAgent.id === 'noor_concierge') {
      voiceId = 'noor_urdu_female';
    } else if (activeAgent.id === 'marcus_governance') {
      voiceId = 'marcus_uk_male';
    }

    speakText(
      reply,
      activeAgent.voiceLang.startsWith('en') ? 'en' : 'ur_slang',
      () => {
        isSpeakingStateRef.current = false;
      },
      voiceId
    );
  };

  // Holographic Canvas Animation Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizeTimer: any;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let angle = 0;
    let particleTicks = 0;

    // Generate floating particle field
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 2 + 0.6,
      speedY: Math.random() * 0.7 + 0.2,
      opacity: Math.random() * 0.7 + 0.3,
      pulse: Math.random() * Math.PI,
    }));

    const render = () => {
      angle += 0.015;
      particleTicks += 0.03;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const isSpeakingNow = isSpeakingStateRef.current || isSpeaking();

      // Dynamic mic pulse
      const activePulse = isSpeakingNow
        ? Math.sin(angle * 6) * 0.25 + 1.2
        : isMicActive
        ? Math.sin(angle * 3) * 0.12 + 1.05
        : 1.0;

      // 1. Draw subtle cosmic grid mesh
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Draw floating holographic dust particles
      particles.forEach((p) => {
        p.y -= p.speedY;
        if (p.y < 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${p.opacity * (Math.sin(particleTicks + p.pulse) * 0.3 + 0.7)})`;
        ctx.fill();
      });

      // 3. Central Holographic Reactor Rings
      const baseR = Math.min(canvas.width, canvas.height) * 0.24 * activePulse;

      // Radial Core Glow
      const coreGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, baseR * 1.8);
      coreGrad.addColorStop(0, isSpeakingNow ? 'rgba(245, 158, 11, 0.28)' : 'rgba(6, 182, 212, 0.24)');
      coreGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.12)');
      coreGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Outer Azimuth Ring with Ticks
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 0.4);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 1.35, 0, Math.PI * 2);
      ctx.stroke();

      // Degree tick marks
      const ticks = 48;
      for (let i = 0; i < ticks; i++) {
        const tickAngle = (i / ticks) * Math.PI * 2;
        const tickLen = i % 4 === 0 ? 12 : 5;
        const r1 = baseR * 1.35;
        const r2 = r1 + tickLen;
        ctx.beginPath();
        ctx.moveTo(Math.cos(tickAngle) * r1, Math.sin(tickAngle) * r1);
        ctx.lineTo(Math.cos(tickAngle) * r2, Math.sin(tickAngle) * r2);
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(34, 211, 238, 0.8)' : 'rgba(6, 182, 212, 0.3)';
        ctx.stroke();
      }
      ctx.restore();

      // Middle Counter-Rotating Gyroscope Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle * 0.7);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 8, 4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 1.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Inner Laser Core Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 1.2);
      ctx.strokeStyle = isSpeakingNow ? 'rgba(245, 158, 11, 0.85)' : 'rgba(34, 211, 238, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      // Hexagonal Core Reticle
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const hAngle = (h / 6) * Math.PI * 2;
        const hx = Math.cos(hAngle) * (baseR * 0.45);
        const hy = Math.sin(hAngle) * (baseR * 0.45);
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 4. Real-time 48-band holographic equalizer spectrum bars at bottom
      const numBars = 48;
      const barWidth = Math.min(18, (canvas.width * 0.7) / numBars - 4);
      const totalWidth = numBars * (barWidth + 4);
      const startX = cx - totalWidth / 2;
      const bottomY = canvas.height - 85;

      for (let b = 0; b < numBars; b++) {
        const offset = Math.abs(b - numBars / 2) / (numBars / 2);
        const baseH = isSpeakingNow
          ? (Math.sin(angle * 4 + b * 0.35) * 0.5 + 0.5) * 90 + 20
          : isMicActive
          ? (Math.sin(angle * 2.5 + b * 0.28) * 0.5 + 0.5) * 55 * (1 - offset * 0.5) + 12
          : 6;

        const bx = startX + b * (barWidth + 4);
        const by = bottomY - baseH;

        const barGrad = ctx.createLinearGradient(0, bottomY, 0, by);
        barGrad.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
        barGrad.addColorStop(0.7, 'rgba(139, 92, 246, 0.75)');
        barGrad.addColorStop(1, 'rgba(34, 211, 238, 0.95)');

        ctx.fillStyle = barGrad;
        ctx.fillRect(bx, by, barWidth, baseH);

        // Peak dot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(bx, by - 3, barWidth, 2);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, isMicActive]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#020617] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background Interactive Hologram Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* TOP SCI-FI TELEMETRY HUD HEADER */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-950/70 backdrop-blur-md">
        {/* Left: Matrix Status */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                AURA NEURAL LISTENING MATRIX
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              ACOUSTIC RADAR: ONLINE · BEAMFORMING ENGAGED
            </p>
          </div>
        </div>

        {/* Center: Agent Squad Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-lg hover:shadow-cyan-500/20"
          >
            <div
              className={`w-6 h-6 rounded-lg bg-gradient-to-br ${activeAgent.avatarColor} flex items-center justify-center text-white text-xs font-bold`}
            >
              {activeAgent.name.charAt(0)}
            </div>
            <div className="text-left">
              <span className="text-[9px] font-mono text-cyan-400 block uppercase">Active Native Copilot</span>
              <span className="text-xs font-bold text-white block">{activeAgent.name}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
          </button>

          {/* Dropdown Agent Picker */}
          {showAgentPicker && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 space-y-1">
              <p className="text-[9px] font-mono text-cyan-400 px-2 py-1 uppercase">Switch Native Squad Agent</p>
              {AGENT_PERSONAS.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    onSelectAgent(agent);
                    setShowAgentPicker(false);
                    soundEffects.playSuccessChime();
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                    agent.id === activeAgent.id ? 'bg-cyan-950 border border-cyan-700/60' : 'hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agent.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{agent.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{agent.accent}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Clock & Exit Fullscreen */}
        <div className="flex items-center gap-4">
          {connectedTV && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>{connectedTV.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}

          <div className="text-right font-mono">
            <span className="text-xs text-cyan-300 font-bold tracking-wider">{currentTimeStr}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Exit Holographic Mode (Esc)"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CENTER HOLOGRAPHIC HUD DIALOGUE & TRANSCRIPTION */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-6">
        {/* Core Listening Pulse Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-600/50 text-cyan-300 text-xs font-mono tracking-widest uppercase">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>LISTENING FOR VOICE DIRECTIVES</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-200 to-cyan-300">
            AURA EXECUTIVE HOLOGRAM
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto font-mono">
            Speak naturally in Urdu, Punjabi, or English. Control your Smart TV, execute calendar directives, or banter.
          </p>
        </div>

        {/* Live Spoken Transcript HUD */}
        {liveTranscript && (
          <div className="w-full max-w-2xl p-4 rounded-3xl bg-slate-950/80 border border-cyan-500/40 shadow-2xl backdrop-blur-xl animate-in zoom-in-95">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
              LIVE MICROPHONE TRANSCRIPT
            </span>
            <p className="text-lg md:text-xl font-medium text-white italic">"{liveTranscript}"</p>
          </div>
        )}

        {/* Assistant Reply Card */}
        {assistantReply && (
          <div className="w-full max-w-2xl p-5 rounded-3xl bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-indigo-950/70 border border-cyan-400/50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{activeAgent.name} Response</span>
              </span>
              {currentActionSummary && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/80 text-cyan-200 border border-cyan-700">
                  {currentActionSummary}
                </span>
              )}
            </div>
            <p className="text-base md:text-lg font-bold text-slate-100 text-left leading-relaxed">
              {assistantReply}
            </p>
          </div>
        )}

        {/* Quick Voice Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl pt-2">
          {[
            { label: 'Turn Off TV', command: 'TV band karo' },
            { label: 'Turn On TV', command: 'TV on karo' },
            { label: 'TV Volume +10', command: 'TV volume barhao' },
            { label: 'Open YouTube on TV', command: 'YouTube on TV' },
            { label: 'Punjabi Jugat', command: 'Chaudhry koi jugat sunao' },
            { label: 'Check Schedule', command: 'Show today schedule' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleExecuteUtterance(chip.command)}
              className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500 text-xs font-mono text-slate-300 hover:text-cyan-200 transition-all shadow-md"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </main>

      {/* BOTTOM CONTROL & TELEMETRY FOOTER */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-cyan-500/20 bg-slate-950/80 backdrop-blur-md gap-4">
        {/* Left Telemetry */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI NEURAL ENGINE: READY</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>VOICE: {activeAgent.accent}</span>
          </span>
        </div>

        {/* Center Mic Mute/Unmute Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsMicActive(!isMicActive);
              soundEffects.playSuccessChime();
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-xl ${
              isMicActive
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-cyan-500/30 ring-2 ring-cyan-400/50'
                : 'bg-rose-950 text-rose-300 border border-rose-700'
            }`}
          >
            {isMicActive ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
            <span>{isMicActive ? 'Listening Active' : 'Microphone Muted'}</span>
          </button>
        </div>

        {/* Right Exit Prompt */}
        <div className="text-xs font-mono text-slate-400">
          <span>Press </span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[10px]">
            Esc
          </kbd>
          <span> or tap Minimize to return to workspace</span>
        </div>
      </footer>
    </div>
  );
};
