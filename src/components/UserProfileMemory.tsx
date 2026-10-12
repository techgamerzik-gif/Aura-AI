import React, { useState } from 'react';
import {
  Brain,
  Heart,
  ThumbsDown,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Tag,
  Clock,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { UserPersonalProfile, MemoryFact } from '../types/assistant.ts';

export const INITIAL_USER_PROFILE: UserPersonalProfile = {
  name: 'Boss / Executive Chairman',
  title: 'Managing Director & Venture Partner',
  likes: [
    'Karak doodh patti chai with fresh cardamom (no sugar)',
    'Coke Studio Sufi tracks and Hans Zimmer live scores during deep work',
    'Morning focus time 08:30 - 10:30 AM without meetings',
    'Crisp, 3-bullet executive briefings over lengthy slide decks',
    'Tesla Model S Plaid Ludicrous acceleration on highway commutes',
  ],
  dislikes: [
    'Zero-minute back-to-back Zoom overlaps without decompression buffer',
    'Unsweetened cold black brew coffee',
    'Unsolicited late-night supplier calls after 9:30 PM',
    'Long-winded PowerPoint slides with more than 5 bullets per slide',
  ],
  customVocabulary: [
    {
      term: 'Cheetah',
      meaning: 'COO Zubair Khan (rapid operational problem solver)',
      context: '"Cheetah ko call milao" -> Automatically calls Zubair',
    },
    {
      term: 'Kaptaan',
      meaning: 'Board Chairman Kamran Siddiqui (lead investor & advisor)',
      context: '"WhatsApp Kaptaan: Status ready" -> Messages Kamran',
    },
    {
      term: 'Jahaz',
      meaning: 'Tesla Model S Plaid executive fleet vehicle',
      context: '"Jahaz ka AC chalao" -> Activates Tesla pre-conditioning',
    },
    {
      term: 'Akhara',
      meaning: 'Executive Gym & Morning High-Intensity Workout',
      context: '"Akhara time ho gaya" -> Sets wellness mode & pauses calls',
    },
    {
      term: 'Fuel',
      meaning: 'Hot freshly brewed Karak Cardamom Chai',
      context: '"Fuel chahiye" -> Prompts butler or schedules chai break',
    },
  ],
  learnedFacts: [
    {
      id: 'fact-1',
      type: 'habit',
      content: 'Consistently reschedules 3:00 PM meetings to include 15-minute bio buffer.',
      learnedAt: 'Yesterday 15:15',
      confidence: 0.98,
    },
    {
      id: 'fact-2',
      type: 'like',
      content: 'Loves Pasoori and Tu Jhoom when transitioning between intense strategy sessions.',
      learnedAt: '2 days ago',
      confidence: 0.95,
    },
    {
      id: 'fact-3',
      type: 'vocabulary',
      term: 'Cheetah',
      definition: 'Zubair Khan (Operations Chief)',
      content: 'Identified that "Cheetah" always refers to contact Zubair Khan (+923001234567).',
      learnedAt: '3 days ago',
      confidence: 1.0,
    },
  ],
  activeAgentId: 'aura_prime',
  selectedVoiceId: 'tariq_urdu_male',
};

interface UserProfileMemoryProps {
  profile: UserPersonalProfile;
  onUpdateProfile: (updated: UserPersonalProfile) => void;
}

export const UserProfileMemory: React.FC<UserProfileMemoryProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'likes' | 'dislikes' | 'slang' | 'log'>('likes');

  // Input states for adding new items
  const [newLike, setNewLike] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newContext, setNewContext] = useState('');

  const handleAddLike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLike.trim()) return;
    onUpdateProfile({
      ...profile,
      likes: [newLike.trim(), ...profile.likes],
    });
    setNewLike('');
  };

  const handleRemoveLike = (idx: number) => {
    const updated = [...profile.likes];
    updated.splice(idx, 1);
    onUpdateProfile({ ...profile, likes: updated });
  };

  const handleAddDislike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDislike.trim()) return;
    onUpdateProfile({
      ...profile,
      dislikes: [newDislike.trim(), ...profile.dislikes],
    });
    setNewDislike('');
  };

  const handleRemoveDislike = (idx: number) => {
    const updated = [...profile.dislikes];
    updated.splice(idx, 1);
    onUpdateProfile({ ...profile, dislikes: updated });
  };

  const handleAddVocab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newMeaning.trim()) return;
    onUpdateProfile({
      ...profile,
      customVocabulary: [
        {
          term: newTerm.trim(),
          meaning: newMeaning.trim(),
          context: newContext.trim() || `Refers to ${newMeaning.trim()}`,
        },
        ...profile.customVocabulary,
      ],
    });
    setNewTerm('');
    setNewMeaning('');
    setNewContext('');
  };

  const handleRemoveVocab = (idx: number) => {
    const updated = [...profile.customVocabulary];
    updated.splice(idx, 1);
    onUpdateProfile({ ...profile, customVocabulary: updated });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-orange-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-900/80 border border-amber-600 text-amber-300 uppercase tracking-wider">
                AUTONOMOUS MEMORY & INDIVIDUAL PROFILING
              </span>
              <span className="text-xs text-amber-400/80">Adaptive Executive Memory</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
              <span>Personal Memory & Custom Nicknames</span>
              <Brain className="w-6 h-6 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              AURA continuously auto-learns your specific preferences, habits, dislikes, and unique
              vocabulary (what you call your contacts, car, meetings, and habits).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950/70 border border-amber-500/40 rounded-2xl px-4 py-2 text-center">
              <span className="text-[10px] font-mono text-amber-400 uppercase">Total Memories</span>
              <p className="text-lg font-bold text-white">
                {profile.likes.length + profile.dislikes.length + profile.customVocabulary.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'likes', label: `Likes & Preferences (${profile.likes.length})`, icon: Heart },
          { id: 'dislikes', label: `Dislikes & Pet Peeves (${profile.dislikes.length})`, icon: ThumbsDown },
          { id: 'slang', label: `Custom Vocabulary & Nicknames (${profile.customVocabulary.length})`, icon: Tag },
          { id: 'log', label: `Auto-Learned Facts Log (${profile.learnedFacts.length})`, icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-950 border border-amber-500/60 text-amber-200 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Likes */}
      {activeTab === 'likes' && (
        <div className="space-y-4">
          <form onSubmit={handleAddLike} className="flex gap-2">
            <input
              type="text"
              value={newLike}
              onChange={(e) => setNewLike(e.target.value)}
              placeholder="Add personal preference (e.g. 'Prefers chai with cardamom', 'Early morning workouts')..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Like</span>
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.likes.map((like, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">{like}</p>
                    <span className="text-[10px] text-amber-400/80 font-mono mt-1 block">Active Executive Bias</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveLike(i)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Dislikes */}
      {activeTab === 'dislikes' && (
        <div className="space-y-4">
          <form onSubmit={handleAddDislike} className="flex gap-2">
            <input
              type="text"
              value={newDislike}
              onChange={(e) => setNewDislike(e.target.value)}
              placeholder="Add personal dislike (e.g. 'No meetings before 10 AM', 'Hates long email chains')..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dislike</span>
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.dislikes.map((dislike, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 mt-0.5">
                    <ThumbsDown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">{dislike}</p>
                    <span className="text-[10px] text-rose-400/80 font-mono mt-1 block">AURA Avoidance Rule</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveDislike(i)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Custom Slang & Vocabulary */}
      {activeTab === 'slang' && (
        <div className="space-y-4">
          <form onSubmit={handleAddVocab} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <span className="text-xs font-semibold text-white block">Teach AURA a New Custom Word / Nickname</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="What you call it (e.g. 'Cheetah', 'Jahaz')"
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <input
                type="text"
                required
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="Real meaning (e.g. 'Zubair Khan COO', 'Tesla Model S')"
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <input
                type="text"
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                placeholder="Voice usage context example"
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Vocabulary</span>
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.customVocabulary.map((item, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-cyan-300 font-mono">
                      "{item.term}"
                    </span>
                    <button
                      onClick={() => handleRemoveVocab(i)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1">Refers to: {item.meaning}</h4>
                  <p className="text-[11px] text-slate-400 mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 font-mono">
                    Example: {item.context}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Auto-Learned Memory Timeline */}
      {activeTab === 'log' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              AURA automatically detects and adds entries here as you speak directives or express preferences!
            </span>
          </div>

          <div className="space-y-2.5">
            {profile.learnedFacts.map((fact) => (
              <div
                key={fact.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 mt-0.5">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950 border border-purple-800 text-purple-300 uppercase">
                        {fact.type}
                      </span>
                      <span className="text-[10px] text-slate-500">{fact.learnedAt}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1.5 font-medium">{fact.content}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-emerald-400">
                    {Math.round(fact.confidence * 100)}% Confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
