import React from 'react';
import {
  Users,
  Shield,
  PhoneCall,
  Flame,
  BookOpen,
  Globe,
  CheckCircle,
  Volume2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AgentPersona } from '../types/assistant.ts';
import { speakText, stopSpeaking } from '../utils/speech.ts';

export const AGENT_PERSONAS: AgentPersona[] = [
  {
    id: 'aura_prime',
    name: 'AURA Prime',
    title: 'Chief of Staff & Strategic Executive Copilot',
    gender: 'female',
    accent: 'Executive Natural English',
    tagline: 'High-stakes boardroom decisions, calendar sovereignty & zero-overlap scheduling.',
    description:
      'The central operating brain of your executive life. Authoritative, highly structured, and ruthlessly protective of your time buffers.',
    avatarColor: 'from-cyan-500 to-blue-600',
    voicePitch: 1.04,
    voiceRate: 1.02,
    voiceLang: 'en-US',
    sampleGreeting:
      'Salam Boss. AURA Prime active. Tamam calendar metrics, executive priorities aur Smart TV status review ho chuke hain — ready for your instructions.',
    specialties: ['Calendar Sovereignty', 'Board Memos', 'Conflict Resolution', 'Security Vault'],
  },
  {
    id: 'sikandar_comms',
    name: 'Sikandar',
    title: 'The Dealmaker & Communications Dispatcher',
    gender: 'male',
    accent: 'Urdu Native Male (Lahori Cadence)',
    tagline: 'Rapid WhatsApp dispatches, phone call routing, negotiations & concierge logistics.',
    description:
      'Fast-talking, street-smart executive operator. Handles communications with your contacts, calls "Cheetah" and "Kaptaan" in seconds, and negotiates luxury travel.',
    avatarColor: 'from-emerald-500 to-teal-600',
    voicePitch: 0.88,
    voiceRate: 1.0,
    voiceLang: 'ur-PK',
    sampleGreeting:
      'Salam Janab! Sikandar hazir hai. Kisko call milani hai ya kisko WhatsApp paigham bhejna hai? Bas hukum karein, kaam done hai!',
    specialties: ['WhatsApp Automation', 'Cellular Calling', 'Executive Logistics', 'Negotiations'],
  },
  {
    id: 'chaudhry_punjabi',
    name: 'Chaudhry Sultan',
    title: 'Desi Punjabi Executive & Fleet Commander',
    gender: 'male',
    accent: 'Punjabi Desi Male (Authentic Majhi)',
    tagline: 'Pure Punjabi flair, witty desi jugtain, Tesla telemetry & hearty stress relief.',
    description:
      'Warm, boisterous, and fiercely loyal. Speaks with authentic Punjabi inflections, cracks hilarious jugtain, and takes immense pride in your Tesla "Jahaz" and daily fitness.',
    avatarColor: 'from-amber-500 to-orange-600',
    voicePitch: 0.78,
    voiceRate: 0.96,
    voiceLang: 'pa-IN',
    sampleGreeting:
      'Oye Salam Chaudhry Sahab! Tussi hukum karo — TV on karna ae, gaddi da AC chalana ae, kisse nu phone kharkana ae ya koi karari Punjabi jugat sunani ae? Scene poora fit ae!',
    specialties: ['Punjabi Jugtain & Banter', 'Smart TV & IoT Control', 'Wellness & Akhara', 'Desi Humor'],
  },
  {
    id: 'ghalib_entertainer',
    name: 'Mirza Ghalib / Jugnu',
    title: 'Culture, Dastangoi & Urdu Humor',
    gender: 'male',
    accent: 'Urdu Native Male (Literary Cultured)',
    tagline: 'Classical Urdu lateefay, Tilism dastangoi, poetic decompression & music curation.',
    description:
      'Cultured, poetic, and delightfully witty. Provides late-night relaxation, tells epic stories, cracks classic Lahori & Karachi tech jokes, and selects Coke Studio tracks.',
    avatarColor: 'from-purple-500 to-pink-600',
    voicePitch: 0.85,
    voiceRate: 0.96,
    voiceLang: 'ur-PK',
    sampleGreeting:
      'Adab Arz hai! Zehn ki thakan ko door karne aur mehfil ko roshan karne ke liye main hazir hoon. Aik khoobsurat kahani suniye ya TV par Coke Studio lagaiye?',
    specialties: ['Classical Dastangoi', 'Urdu Lateefay & Satire', 'Music Curation', 'Mood Refreshment'],
  },
  {
    id: 'noor_concierge',
    name: 'Noor Bano',
    title: 'Executive Concierge & Protocol Specialist',
    gender: 'female',
    accent: 'Urdu Native Female (Graceful & Refined)',
    tagline: 'Refined etiquette, VIP hospitality bookings, private dining & seamless lifestyle care.',
    description:
      'Elegantly composed executive hostess. Manages high-profile guest arrangements, fine dining reservations at Nobu and Monal, and orchestrates peaceful ambient surroundings.',
    avatarColor: 'from-rose-500 to-pink-600',
    voicePitch: 1.08,
    voiceRate: 0.96,
    voiceLang: 'ur-PK',
    sampleGreeting:
      'Assalam-o-Alaikum Janab. Main Noor hoon. Aapke VIP bookings, private dinner tables aur lifestyle arrangements mukammal dekhna meri zimedari hai.',
    specialties: ['VIP Hospitality', 'Fine Dining Reservations', 'Urdu Protocol', 'Ambient Curation'],
  },
  {
    id: 'marcus_governance',
    name: 'Marcus Vance',
    title: 'Global Governance & Board Strategist',
    gender: 'male',
    accent: 'British Natural Male (International Elite)',
    tagline: 'Board memos, cross-border M&A alignment, investor decks & strategic precision.',
    description:
      'Polished British executive advisor. Translates ambiguous business challenges into structured boardroom memos, financial metrics, and governance roadmaps.',
    avatarColor: 'from-blue-600 to-indigo-800',
    voicePitch: 0.92,
    voiceRate: 1.0,
    voiceLang: 'en-GB',
    sampleGreeting:
      'Good day, Chief. Marcus here. All international governance filings and board deliverables are primed for review.',
    specialties: ['Boardroom Strategy', 'Cross-Border M&A', 'Financial Briefings', 'Risk Governance'],
  },
];

interface AgentSquadProps {
  activeAgentId: string;
  onSelectAgent: (agent: AgentPersona) => void;
  selectedVoiceId: string;
}

export const AgentSquad: React.FC<AgentSquadProps> = ({
  activeAgentId,
  onSelectAgent,
  selectedVoiceId,
}) => {
  const activeAgent = AGENT_PERSONAS.find((a) => a.id === activeAgentId) || AGENT_PERSONAS[0];

  const handleTestVoice = (agent: AgentPersona) => {
    stopSpeaking();
    let voiceId = 'tariq_urdu_male';
    if (agent.id === 'chaudhry_punjabi') {
      voiceId = 'chaudhry_punjabi_male';
    } else if (agent.id === 'aura_prime') {
      voiceId = 'aura_executive_female';
    } else if (agent.id === 'sikandar_comms') {
      voiceId = 'farhan_lahori_male';
    } else if (agent.id === 'ghalib_entertainer') {
      voiceId = 'tariq_urdu_male';
    } else if (agent.id === 'noor_concierge') {
      voiceId = 'noor_urdu_female';
    } else if (agent.id === 'marcus_governance') {
      voiceId = 'marcus_uk_male';
    }

    speakText(agent.sampleGreeting, agent.voiceLang.startsWith('en') ? 'en' : 'ur_slang', undefined, voiceId);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-900/80 border border-blue-600 text-blue-300 uppercase tracking-wider">
                AUTONOMOUS MULTI-AGENT SQUAD
              </span>
              <span className="text-xs text-blue-300/80">Specialized Executive Agents</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
              <span>Executive Squad & Native Accents</span>
              <Users className="w-6 h-6 text-blue-400" />
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Switch between specialized agents for different taskings: scheduling, WhatsApp & phone calling,
              Punjabi banter & car telemetry, classical storytelling & jokes, and deep web intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 p-3 rounded-2xl border border-blue-500/40">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeAgent.avatarColor} flex items-center justify-center text-white font-bold text-base shadow-md`}>
              {activeAgent.name.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] font-mono text-blue-400 uppercase">Active Copilot</span>
              <p className="text-xs font-bold text-white">{activeAgent.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_PERSONAS.map((agent) => {
          const isActive = agent.id === activeAgentId;
          return (
            <div
              key={agent.id}
              className={`bg-slate-900 border rounded-3xl p-5 shadow-lg flex flex-col justify-between transition-all relative ${
                isActive
                  ? 'border-blue-500 ring-2 ring-blue-500/30 bg-gradient-to-b from-blue-950/40 to-slate-900'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${agent.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0`}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <span>{agent.name}</span>
                        {isActive && <CheckCircle className="w-4 h-4 text-blue-400 fill-current" />}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{agent.title}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                    {agent.gender === 'male' ? '♂ Male' : '♀ Female'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-800 text-blue-300">
                    Accent: {agent.accent}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  {agent.description}
                </p>

                {/* Specialties */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {agent.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Greeting sample */}
                <div className="mt-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-300 italic">
                  "{agent.sampleGreeting}"
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestVoice(agent)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Hear Native Voice Greeting"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hear Voice</span>
                </button>

                <button
                  onClick={() => onSelectAgent(agent)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white cursor-default shadow-md shadow-blue-900/40'
                      : 'bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-200'
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <span>Switch to Agent</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
