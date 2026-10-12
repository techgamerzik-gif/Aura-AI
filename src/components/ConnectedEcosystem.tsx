import React, { useState, useEffect } from 'react';
import {
  Car,
  Home,
  HeartPulse,
  BatteryCharging,
  Thermometer,
  Lock,
  Unlock,
  Shield,
  ShieldAlert,
  Wind,
  Sun,
  Eye,
  Bot,
  Zap,
  CheckCircle,
  Activity,
  Droplet,
  Moon,
  Sparkles,
  Navigation,
  Tv,
} from 'lucide-react';
import { CarTelemetry, HomeAutomationState, WellnessMetrics, LanguageMode } from '../types/assistant.ts';
import { SmartDeviceHub } from './SmartDeviceHub.tsx';

interface ConnectedEcosystemProps {
  carState: CarTelemetry;
  homeState: HomeAutomationState;
  wellness: WellnessMetrics;
  onUpdateCar: (car: CarTelemetry) => void;
  onUpdateHome: (home: HomeAutomationState) => void;
  onUpdateWellness: (wellness: WellnessMetrics) => void;
  language: LanguageMode;
  initialTab?: 'car' | 'home' | 'tv_wifi' | 'wellness';
}

export const ConnectedEcosystem: React.FC<ConnectedEcosystemProps> = ({
  carState,
  homeState,
  wellness,
  onUpdateCar,
  onUpdateHome,
  onUpdateWellness,
  language,
  initialTab = 'car',
}) => {
  const [activeTab, setActiveTab] = useState<'car' | 'home' | 'tv_wifi' | 'wellness'>(initialTab);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Car actions
  const toggleClimate = () => {
    const nextState = !carState.climateActive;
    onUpdateCar({ ...carState, climateActive: nextState });
    showFeedback(
      nextState
        ? language === 'ur_slang'
          ? 'Tesla ka cabin climate 21°C par chalu kar diya hai!'
          : 'Car climate pre-conditioning engaged at 21°C.'
        : 'Car climate turned off.'
    );
  };

  const toggleLock = () => {
    const nextLock = !carState.locked;
    onUpdateCar({ ...carState, locked: nextLock });
    showFeedback(
      nextLock
        ? 'Tesla doors securely locked & sentry armed.'
        : 'Tesla doors unlocked. Proximity beacon ready.'
    );
  };

  const pushNavigation = () => {
    showFeedback(
      language === 'ur_slang'
        ? 'Next meeting location car ke navigation screen par bhej di hai!'
        : 'Next itinerary coordinate dispatched to car navigation HUD.'
    );
  };

  // Home actions
  const setLightingMode = (mode: 'focus' | 'ambient' | 'conference' | 'night') => {
    onUpdateHome({ ...homeState, officeLightingMode: mode });
    showFeedback(`Executive Office lighting shifted to ${mode.toUpperCase()} profile.`);
  };

  const togglePrivacyGlass = () => {
    const nextVal = !homeState.privacyGlassFrosted;
    onUpdateHome({ ...homeState, privacyGlassFrosted: nextVal });
    showFeedback(nextVal ? 'Electrochromic smart glass frosted for board privacy.' : 'Smart glass switched to transparent.');
  };

  // Wellness actions
  const logWater = () => {
    const nextVal = Math.min(wellness.waterIntakeLiters + 0.25, 4.0);
    onUpdateWellness({ ...wellness, waterIntakeLiters: parseFloat(nextVal.toFixed(2)) });
    showFeedback(
      language === 'ur_slang'
        ? 'Shabash boss! 250ml water logged. Hydration 100% zaroori hai.'
        : 'Logged 250ml water. Maintaining optimal cognitive hydration.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Connected Ecosystem & Executive IoT</h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ur_slang'
              ? 'Tesla telemetry, smart home office control, aur health & wellness monitoring ek jagah.'
              : 'Real-time telemetry and bi-directional automation across connected vehicles, smart office, and biometric wearables.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('car')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'car' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Smart Car (EV Fleet)</span>
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'home' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Smart Office & Home</span>
          </button>

          <button
            onClick={() => setActiveTab('tv_wifi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'tv_wifi' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Smart TV & WiFi Network</span>
          </button>

          <button
            onClick={() => setActiveTab('wellness')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'wellness' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Health & Stamina</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-cyan-950/60 border border-cyan-800 rounded-xl text-xs text-cyan-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tab 1: Smart Car Telemetry */}
      {activeTab === 'car' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Battery Level</span>
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{carState.batteryPercent}%</div>
              <div className="text-xs text-emerald-400 mt-1 font-mono">{carState.rangeMiles} mi estimated range</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Cabin Climate</span>
                <Thermometer className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{carState.cabinTempCelsius}°C</div>
              <div className="text-xs text-slate-400 mt-1">Target: {carState.targetTempCelsius}°C</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Security / Sentry</span>
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{carState.locked ? 'LOCKED' : 'UNLOCKED'}</div>
              <div className="text-xs text-emerald-400 mt-1 font-mono">SENTRY GUARD ARMED</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Vehicle Fleet</span>
                <Car className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">{carState.model}</div>
              <div className="text-xs text-slate-400 mt-1 truncate">{carState.location}</div>
            </div>
          </div>

          {/* Quick Vehicle Controls */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Autonomous Vehicle Controls</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={toggleClimate}
                className={`p-4 rounded-xl border text-left transition-colors flex items-center justify-between ${
                  carState.climateActive
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Pre-condition Cabin (21°C)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {carState.climateActive ? 'Climate Cooling Active' : 'Off · Tap to start'}
                  </div>
                </div>
                <Zap className={`w-5 h-5 ${carState.climateActive ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`} />
              </button>

              <button
                onClick={toggleLock}
                className={`p-4 rounded-xl border text-left transition-colors flex items-center justify-between ${
                  carState.locked
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-amber-950/60 border-amber-500 text-amber-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{carState.locked ? 'Lock Doors & Trunk' : 'Unlock Doors'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {carState.locked ? 'Secure & Arm Sentry' : 'Doors currently unlocked'}
                  </div>
                </div>
                {carState.locked ? <Lock className="w-5 h-5 text-cyan-400" /> : <Unlock className="w-5 h-5 text-amber-400" />}
              </button>

              <button
                onClick={pushNavigation}
                className="p-4 rounded-xl border bg-slate-950 border-slate-800 hover:border-cyan-500 text-left transition-colors flex items-center justify-between text-slate-300 hover:text-white"
              >
                <div>
                  <div className="text-xs font-bold">Push Meeting Route to HUD</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Syncs with Executive Calendar</div>
                </div>
                <Navigation className="w-5 h-5 text-cyan-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Smart Office & Home */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Office Air Quality</span>
                <Wind className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">AQI {homeState.airQualityIndex}</div>
              <div className="text-xs text-emerald-400 mt-1 font-mono">PRISTINE HEPA-FILTERED</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Smart Thermostat</span>
                <Thermometer className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{homeState.thermostatCelsius}°C</div>
              <div className="text-xs text-slate-400 mt-1">Autonomous Climate Control</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Autonomous Cleaner</span>
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-lg font-bold text-slate-100 uppercase">{homeState.robotCleanerStatus}</div>
              <div className="text-xs text-slate-400 mt-1">Base station charged 100%</div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Executive Lighting Profiles</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { id: 'focus', label: 'Deep Focus (4500K)', icon: Sun },
                  { id: 'ambient', label: 'Warm Executive', icon: Sparkles },
                  { id: 'conference', label: 'Camera Studio', icon: Eye },
                  { id: 'night', label: 'Cyber Minimal', icon: Moon },
                ].map((l) => {
                  const Icon = l.icon;
                  const isSelected = homeState.officeLightingMode === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLightingMode(l.id as any)}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{l.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Electrochromic Privacy Smart Glass</div>
                <div className="text-xs text-slate-400">Frosts glass walls for board confidentiality</div>
              </div>
              <button
                onClick={togglePrivacyGlass}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  homeState.privacyGlassFrosted
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {homeState.privacyGlassFrosted ? 'FROSTED (ACTIVE)' : 'TRANSPARENT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Health, Wellness & Proactive Stamina */}
      {activeTab === 'wellness' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Sleep Recovery</span>
                <Moon className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{wellness.sleepScore} / 100</div>
              <div className="text-xs text-emerald-400 mt-1 font-mono">PEAK EXECUTIVE READINESS</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>HRV Baseline</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{wellness.hrvMs} ms</div>
              <div className="text-xs text-slate-400 mt-1">Sympathetic recovery optimal</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Hydration Intake</span>
                <Droplet className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{wellness.waterIntakeLiters} L</div>
              <div className="text-xs text-cyan-400 mt-1 font-mono">Target: {wellness.targetWaterLiters} L</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                <span>Screen Exposure</span>
                <Eye className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{wellness.screenTimeHours} hrs</div>
              <div className="text-xs text-amber-400 mt-1">Break recommended</div>
            </div>
          </div>

          {/* Proactive Coaching Card */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {language === 'ur_slang' ? 'AURA Proactive Wellness Alert' : 'AURA Executive Stamina Engine'}
                </span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                {language === 'ur_slang'
                  ? 'Boss, continuous screen work ho raha hai. Glass of water pi lein aur 2 minute ki deep breathing karein taake upcoming board presentation mein energy 100% ho!'
                  : 'Sustained cognitive focus detected over 2.4 hours. A 3-minute physiological reset and 250ml water intake will enhance alertness by 28% for your upcoming strategic call.'}
              </p>
            </div>

            <button
              onClick={logWater}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-2"
            >
              <Droplet className="w-4 h-4" />
              <span>Log +250ml Water</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Smart TV, WiFi Network & Bluetooth Devices */}
      {activeTab === 'tv_wifi' && (
        <SmartDeviceHub language={language} />
      )}
    </div>
  );
};
