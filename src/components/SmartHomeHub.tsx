import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon,
  Wind,
  Thermometer,
  Power,
  Sparkles,
  Lock,
  Unlock,
  Sliders,
  ArrowUpRight,
  Home,
  Fan,
  Lightbulb,
  CheckCircle2,
  Droplets,
  Eye,
  Activity,
  Mic,
  MicOff,
  Radio,
  Zap,
} from 'lucide-react';
import { HomeAutomationState } from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';
import { parseMultiUserDirectives, parseUserDirective } from '../utils/intentParser.ts';

interface SmartHomeHubProps {
  homeState: HomeAutomationState;
  onUpdateHome: (updated: HomeAutomationState) => void;
  onNavigateToEcosystem?: () => void;
  language?: string;
  alwaysOnVoiceEnabled?: boolean;
  onToggleAlwaysOnVoice?: (enabled: boolean) => void;
  onExecuteVoiceDirective?: (actionType: string, details: any, replyText?: string) => void;
}

export const SmartHomeHub: React.FC<SmartHomeHubProps> = ({
  homeState,
  onUpdateHome,
  onNavigateToEcosystem,
  language = 'en',
  alwaysOnVoiceEnabled,
  onToggleAlwaysOnVoice,
  onExecuteVoiceDirective,
}) => {
  // Ensure default fallback values for optional telemetry
  const isLightsOn = homeState.lightsPower !== false;
  const isSecurityArmed = homeState.securityArmed;
  const isGlassFrosted = homeState.privacyGlassFrosted;
  const aqi = homeState.airQualityIndex || 18;
  const pm25 = homeState.pm25 || 4.2;
  const humidity = homeState.humidityPercent || 48;
  const tempCelsius = homeState.thermostatCelsius || 21.5;
  const purifierMode = homeState.purifierMode || 'auto';
  const purifierActive = homeState.purifierActive !== false;

  // Always-On Voice Control state: defaults to true if not explicitly disabled
  const isAlwaysOnVoice = alwaysOnVoiceEnabled !== undefined
    ? alwaysOnVoiceEnabled
    : (homeState.alwaysOnVoiceControl !== false);

  // Toggle Always-On Voice Control
  const handleToggleAlwaysOnVoice = () => {
    const nextState = !isAlwaysOnVoice;
    if (nextState) {
      soundEffects.playWakeChime();
    } else {
      soundEffects.playSuccessChime();
    }
    if (onToggleAlwaysOnVoice) {
      onToggleAlwaysOnVoice(nextState);
    }
    onUpdateHome({
      ...homeState,
      alwaysOnVoiceControl: nextState,
    });
  };

  // Execute quick voice directive prompt without opening modal
  const handleExecuteQuickPrompt = (phrase: string) => {
    soundEffects.playSuccessChime();
    const directives = parseMultiUserDirectives(phrase);
    if (directives.length > 0 && onExecuteVoiceDirective) {
      directives.forEach((dir) => {
        onExecuteVoiceDirective(dir.actionType, dir.details, dir.defaultReply?.en || dir.summary);
      });
      return;
    }
    const single = parseUserDirective(phrase);
    if (single && onExecuteVoiceDirective) {
      onExecuteVoiceDirective(single.actionType, single.details, single.defaultReply?.en || single.summary);
      return;
    }
    // Local fallback execution if directive handler not bound
    if (/light/i.test(phrase)) {
      onUpdateHome({ ...homeState, lightsPower: true, officeLightingMode: 'focus' });
    } else if (/lock|arm/i.test(phrase)) {
      onUpdateHome({ ...homeState, securityArmed: true });
    } else if (/purifier|turbo/i.test(phrase)) {
      onUpdateHome({ ...homeState, purifierActive: true, purifierMode: 'turbo' });
    } else if (/frost|glass/i.test(phrase)) {
      onUpdateHome({ ...homeState, privacyGlassFrosted: true });
    }
  };

  // Toggle Security State
  const handleToggleSecurity = () => {
    const nextState = !isSecurityArmed;
    if (nextState) {
      soundEffects.playWakeChime();
    } else {
      soundEffects.playSuccessChime();
    }
    onUpdateHome({
      ...homeState,
      securityArmed: nextState,
    });
  };

  // Toggle Privacy Smart Glass
  const handleTogglePrivacyGlass = () => {
    soundEffects.playSuccessChime();
    onUpdateHome({
      ...homeState,
      privacyGlassFrosted: !isGlassFrosted,
    });
  };

  // Toggle Master Lighting Power
  const handleToggleLightsPower = () => {
    soundEffects.playSuccessChime();
    onUpdateHome({
      ...homeState,
      lightsPower: !isLightsOn,
    });
  };

  // Change Lighting Mode
  const handleSetLightingMode = (mode: 'focus' | 'ambient' | 'conference' | 'night') => {
    soundEffects.playSuccessChime();
    onUpdateHome({
      ...homeState,
      officeLightingMode: mode,
      lightsPower: true,
    });
  };

  // Toggle Purifier Mode (Auto -> Turbo -> Eco -> Auto)
  const handleCyclePurifierMode = () => {
    soundEffects.playSuccessChime();
    const modes: ('auto' | 'turbo' | 'eco')[] = ['auto', 'turbo', 'eco'];
    const currentIndex = modes.indexOf(purifierMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    onUpdateHome({
      ...homeState,
      purifierActive: true,
      purifierMode: nextMode,
    });
  };

  // Quick Thermostat Boost
  const handleToggleTempBoost = () => {
    soundEffects.playSuccessChime();
    const isBoosted = tempCelsius <= 20;
    const nextTemp = isBoosted ? 21.5 : 20.0;
    onUpdateHome({
      ...homeState,
      thermostatCelsius: nextTemp,
    });
  };

  const getLightingModeLabel = () => {
    switch (homeState.officeLightingMode) {
      case 'focus':
        return { name: 'Deep Focus', temp: '4500K Daylight', icon: Sun, color: 'text-cyan-400' };
      case 'ambient':
        return { name: 'Warm Executive', temp: '2700K Cozy', icon: Sparkles, color: 'text-amber-400' };
      case 'conference':
        return { name: 'Camera Studio', temp: '5200K High-CRI', icon: Eye, color: 'text-indigo-400' };
      case 'night':
        return { name: 'Cyber Minimal', temp: '1800K Subdued', icon: Moon, color: 'text-violet-400' };
      default:
        return { name: 'Deep Focus', temp: '4500K Daylight', icon: Sun, color: 'text-cyan-400' };
    }
  };

  const activeLight = getLightingModeLabel();
  const ActiveLightIcon = activeLight.icon;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 transition-all">
      {/* Header with Title and Quick Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-sm">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Smart Home Hub</h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Current security perimeter, automated executive lighting, and HEPA air quality
            </p>
          </div>
        </div>

        {onNavigateToEcosystem && (
          <button
            onClick={onNavigateToEcosystem}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white text-xs font-semibold transition-all group"
          >
            <span>Full Ecosystem</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Always-On Voice Control Sovereign Banner */}
      <div className={`p-4 rounded-xl border transition-all ${
        isAlwaysOnVoice
          ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
          : 'bg-slate-950/60 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl border transition-all ${
              isAlwaysOnVoice
                ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-sm animate-pulse'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              {isAlwaysOnVoice ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">Always-On Voice Control</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border flex items-center gap-1.5 ${
                  isAlwaysOnVoice
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAlwaysOnVoice ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  {isAlwaysOnVoice ? 'HANDS-FREE ACTIVE' : 'MUTED / STANDBY'}
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono">
                  Zero Chat Modal
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Directly execute lighting, security, and air quality commands hands-free without opening the chat modal.
              </p>
            </div>
          </div>

          {/* Toggle Switch Control */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={handleToggleAlwaysOnVoice}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAlwaysOnVoice ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
              role="switch"
              aria-checked={isAlwaysOnVoice}
              title={isAlwaysOnVoice ? 'Disable Always-On Voice Control' : 'Enable Always-On Voice Control'}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  isAlwaysOnVoice ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {isAlwaysOnVoice ? (
                  <Radio className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
                ) : (
                  <MicOff className="w-3 h-3 text-slate-400" />
                )}
              </span>
            </button>
            <span className="text-xs font-semibold text-slate-200 hidden md:inline">
              {isAlwaysOnVoice ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Quick Voice Directive Inspiration Chips */}
        {isAlwaysOnVoice && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 mr-1">
              <Zap className="w-3 h-3" />
              <span>Try Hands-Free:</span>
            </span>
            <button
              onClick={() => handleExecuteQuickPrompt('Turn on focus lights')}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Lightbulb className="w-3 h-3 text-cyan-400" />
              <span>"Turn on focus lights"</span>
            </button>
            <button
              onClick={() => handleExecuteQuickPrompt('Lock the doors and arm security')}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>"Lock doors & arm security"</span>
            </button>
            <button
              onClick={() => handleExecuteQuickPrompt('Set air purifier to turbo')}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Wind className="w-3 h-3 text-cyan-400" />
              <span>"Purifier to turbo"</span>
            </button>
            <button
              onClick={() => handleExecuteQuickPrompt('Frost the privacy glass')}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>"Frost privacy glass"</span>
            </button>
          </div>
        )}
      </div>

      {/* 3 Core Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: SECURITY PERIMETER */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          isSecurityArmed
            ? 'bg-slate-950/70 border-emerald-500/30 hover:border-emerald-500/50'
            : 'bg-slate-950/70 border-amber-500/30 hover:border-amber-500/50'
        }`}>
          <div>
            {/* Title & Status Beacon */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isSecurityArmed ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-xs font-bold text-slate-200">Security Perimeter</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider ${
                  isSecurityArmed
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                }`}
              >
                {isSecurityArmed ? 'ARMED' : 'DISARMED'}
              </span>
            </div>

            {/* Sub-status details */}
            <div className="space-y-1.5 text-xs py-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">LiDAR Perimeter:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  3 Nodes Active
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Privacy Smart Glass:</span>
                <span className={`font-semibold ${isGlassFrosted ? 'text-cyan-300' : 'text-slate-400'}`}>
                  {isGlassFrosted ? 'Frosted (Private)' : 'Transparent'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Biometric Bio-Lock:</span>
                <span className="font-mono text-emerald-400">ENFORCED</span>
              </div>
            </div>
          </div>

          {/* Quick Toggle Buttons */}
          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center gap-2">
            <button
              onClick={handleToggleSecurity}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSecurityArmed
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
              }`}
              title={isSecurityArmed ? 'Disarm security perimeter' : 'Arm security perimeter'}
            >
              {isSecurityArmed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isSecurityArmed ? 'Disarm' : 'Arm System'}</span>
            </button>

            <button
              onClick={handleTogglePrivacyGlass}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                isGlassFrosted
                  ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Electrochromic Privacy Smart Glass"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isGlassFrosted ? 'Clear' : 'Frost'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: LIGHTING SYSTEM */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          isLightsOn
            ? 'bg-slate-950/70 border-cyan-500/30 hover:border-cyan-500/50'
            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
        }`}>
          <div>
            {/* Title & Status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className={`w-4 h-4 ${isLightsOn ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-200">Executive Lighting</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider ${
                  isLightsOn
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isLightsOn ? 'ON · 85%' : 'OFF'}
              </span>
            </div>

            {/* Profile status details */}
            <div className="space-y-1.5 text-xs py-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Current Ambiance:</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <ActiveLightIcon className={`w-3.5 h-3.5 ${activeLight.color}`} />
                  {isLightsOn ? activeLight.name : 'Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Spectrum / Temp:</span>
                <span className="font-mono text-cyan-300">{isLightsOn ? activeLight.temp : '0K'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Hue Bridge:</span>
                <span className="text-slate-300">12 Lamps Linked</span>
              </div>
            </div>
          </div>

          {/* Quick Toggle Controls */}
          <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleLightsPower}
                className={`py-1 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                  isLightsOn
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Toggle Master Lights Power"
              >
                <Power className="w-3 h-3" />
                <span>{isLightsOn ? 'On' : 'Off'}</span>
              </button>

              <div className="grid grid-cols-4 gap-1 flex-1">
                {[
                  { id: 'focus', label: 'Focus' },
                  { id: 'ambient', label: 'Warm' },
                  { id: 'conference', label: 'Studio' },
                  { id: 'night', label: 'Night' },
                ].map((mode) => {
                  const isSelected = isLightsOn && homeState.officeLightingMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleSetLightingMode(mode.id as any)}
                      className={`py-1 rounded text-[10px] font-semibold border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950 border-cyan-500/70 text-cyan-200 font-bold shadow-xs'
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: AIR QUALITY & ATMOSPHERE */}
        <div className="p-4 rounded-xl border bg-slate-950/70 border-emerald-500/30 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
          <div>
            {/* Title & AQI Score */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Air Quality & HEPA</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                AQI {aqi} · PRISTINE
              </span>
            </div>

            {/* Visual Air Quality Gauge Bar */}
            <div className="space-y-1 py-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono text-[10px]">PURITY INDEX</span>
                <span className="font-bold text-emerald-400 font-mono text-[10px]">98.2% Clean</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                  style={{ width: `${Math.max(15, 100 - aqi)}%` }}
                />
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">PM2.5</div>
                <div className="text-xs font-bold text-white font-mono">{pm25} µg</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Humidity</div>
                <div className="text-xs font-bold text-cyan-300 font-mono">{humidity}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Climate</div>
                <div className="text-xs font-bold text-emerald-300 font-mono">{tempCelsius}°C</div>
              </div>
            </div>
          </div>

          {/* Quick Toggle Controls */}
          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center gap-2">
            <button
              onClick={handleCyclePurifierMode}
              className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 transition-all cursor-pointer shadow-xs"
              title={`HEPA Purifier Mode: ${purifierMode.toUpperCase()}. Click to cycle.`}
            >
              <Fan className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: purifierMode === 'turbo' ? '1s' : '4s' }} />
              <span className="capitalize">{purifierMode} Purge</span>
            </button>

            <button
              onClick={handleToggleTempBoost}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                tempCelsius <= 20
                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Quick Thermostat Cool Boost (20°C)"
            >
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
              <span>{tempCelsius <= 20 ? '20°C Boost' : 'Boost Cool'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
