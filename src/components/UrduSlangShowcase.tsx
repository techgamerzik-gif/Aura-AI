import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Globe,
  Radio,
  CheckCircle,
} from 'lucide-react';
import { speakText, stopSpeaking } from '../utils/speech.ts';
import { LanguageMode } from '../types/assistant.ts';

interface UrduSlangShowcaseProps {
  onSelectPrompt: (prompt: string) => void;
  language: LanguageMode;
  onLanguageChange: (lang: LanguageMode) => void;
}

export const UrduSlangShowcase: React.FC<UrduSlangShowcaseProps> = ({
  onSelectPrompt,
  language,
  onLanguageChange,
}) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const slangExamples = [
    {
      phrase: 'Bhai, aaj ka scene kya hai? Schedule batao!',
      english: "Brother, what's today's landscape? Brief me on my master schedule!",
      urduScript: 'بھائی، آج کا سین کیا ہے؟ شیڈول بتاؤ!',
      auraResponse:
        'Arrey Janab! Scene 100% on hai. Subah 10:00 baje board meeting hai, 14:00 wali client call ko maine 15-minute buffer ke sath set kar diya hai, aur Tesla ka battery level 84% hai. Tension free ho kar kaam shuru karein!',
      category: 'Master Briefing',
    },
    {
      phrase: 'Meeting overlap ho gayi hai, iska jugaar nahi solid solution nikalo!',
      english: "Meetings are overlapping. Don't hack it—give me an airtight executive solution!",
      urduScript: 'میٹنگ اوورلیپ ہو گئی ہے، ٹھوس ایگزیکٹو حل نکالو!',
      auraResponse:
        'Boss! AURA ke hotay huway tension kesi? Maine overlaps detect kiye hain. 14:30 wali meeting ko 15:15 par shift kar diya hai, 15 minute ka coffee break lock ho chuka hai, aur sab attendees ko professional update auto-dispatch ho chuki hai.',
      category: 'Conflict Autopilot',
    },
    {
      phrase: 'Tesla ka AC 21°C pe chalao aur meeting location push karo!',
      english: "Pre-cool the Tesla to 21°C and dispatch meeting coordinates to the HUD!",
      urduScript: 'ٹیسلا کا اے سی ۲۱ ڈگری پر چلاؤ اور میٹنگ لوکیشن کار میں بھیجو!',
      auraResponse:
        'Hukum sar ankhon par boss! Tesla Model S ka cabin pre-conditioning 21°C par chalu hai aur Agla address car ke navigation screen par route ho chuka hai. 12 minute mein car bilkul chilled aur ready hogi!',
      category: 'Smart Car IoT',
    },
    {
      phrase: 'Board members ke liye AI Strategy ka deck banao fat-a-fat!',
      english: 'Generate an executive AI strategy presentation deck immediately for the board!',
      urduScript: 'بورڈ آف ڈائریکٹرز کے لیے فوری اے آئی اسٹریٹجی ڈیک تیار کرو!',
      auraResponse:
        'Done samjhein Janab! 5-slide McKinsey-standard deck ready hai — takeaways, financial ROI, aur speaker notes ke sath. Presentation tab mein check karein, export bhi ho sakti hai.',
      category: 'Decks & Memos',
    },
    {
      phrase: 'Weekend par cinema tickets ka kya scene hai? Sasta aur best batao!',
      english: "What's the cinema ticket plan for the weekend? Give me the cheapest and best options!",
      urduScript: 'ویک اینڈ پر سینما ٹکٹس کا کیا سین ہے؟ سستا اور بہترین آپشن بتاؤ!',
      auraResponse:
        'Boss, Cineplex Saver par $14.50 mein verified sasta option hai, aur Grand VIP Recliner par $26 mein best-value luxury lounge hai popcorn ke sath! Dono ready hain, bas ek tap karein aur ticket book ho jayegi.',
      category: 'Concierge Deals',
    },
    {
      phrase: 'AURA bhai, Coke Studio ka Pasoori chalao mood fresh karne ke liye!',
      english: "AURA brother, play Coke Studio's Pasoori to refresh the focus & mood!",
      urduScript: 'اورا بھائی، کوک اسٹوڈیو کا پسوڑی چلاؤ موڈ فریش کرنے کے لیے!',
      auraResponse:
        'Hukum sar ankhon par Boss! Coke Studio Season 14 ka Pasoori play kar diya hai. Floating Executive Player background mein chalu hai, aap sunte sunte baqi schedule aur kaam manage karein!',
      category: 'Media Lounge',
    },
    {
      phrase: 'Web research karo aur global AI tech trends par intelligence brief banao!',
      english: 'Conduct live web research and generate an executive intelligence brief on global AI tech trends!',
      urduScript: 'ویب ریسرچ کرو اور گلوبل اے آئی ٹیک رجحانات پر انٹیلیجنس بریف بناؤ!',
      auraResponse:
        'Boss, live web research initiate kar di hai! Market indicators, operational speedups, aur verified source citations ke sath complete strategic dossier tayyar hai. Research Hub mein check karein!',
      category: 'Web Intelligence',
    },
  ];

  const handlePlayVoice = (text: string, index: number) => {
    stopSpeaking();
    setPlayingIndex(index);
    speakText(text, 'ur_slang', () => {
      setPlayingIndex(null);
    });
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Native Urdu Slang Executive Neural Engine
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">
                PROVEN FLUENCY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              AURA natively understands and replies in authentic Pakistani corporate Urdu slang (Roman Urdu & Nastaliq).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onLanguageChange('ur_slang')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              language === 'ur_slang'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Roman Urdu Slang
          </button>
          <button
            onClick={() => onLanguageChange('ur_script')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              language === 'ur_script'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            اردو خط
          </button>
        </div>
      </div>

      {/* Grid of Slang Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slangExamples.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-600/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono text-[11px] text-emerald-400">{item.category}</span>
                <button
                  onClick={() => handlePlayVoice(item.auraResponse, idx)}
                  className="text-slate-400 hover:text-emerald-400 p-1 transition-colors"
                  title="Listen to Urdu Voice Response"
                >
                  <Volume2 className={`w-4 h-4 ${playingIndex === idx ? 'text-emerald-400 animate-bounce' : ''}`} />
                </button>
              </div>

              <div className="text-sm font-semibold text-slate-100 font-sans">
                "{item.phrase}"
              </div>
              <div className="text-xs text-slate-400 italic mt-0.5">
                {item.english}
              </div>
              <div className="text-xs text-slate-400 font-serif mt-0.5 text-right font-medium">
                {item.urduScript}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[11px] text-emerald-300 font-mono leading-relaxed bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
                <strong className="text-emerald-400">AURA: </strong>
                {item.auraResponse}
              </div>

              <div className="mt-2.5 flex justify-end">
                <button
                  onClick={() => onSelectPrompt(item.phrase)}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  <span>Use Voice Directive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
