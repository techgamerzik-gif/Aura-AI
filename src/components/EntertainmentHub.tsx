import React, { useState } from 'react';
import {
  Smile,
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Flame,
  Award,
  Coffee,
  Heart,
  Music,
  Play,
  Pause,
  MessageCircle,
} from 'lucide-react';
import { FunContentItem } from '../types/assistant.ts';
import { speakText, stopSpeaking } from '../utils/speech.ts';

export const CURATED_FUN_CONTENT: FunContentItem[] = [
  // Jokes / Lateefay
  {
    id: 'joke-1',
    type: 'joke',
    title: 'Lahori Biryani vs Karachi Tech Meeting',
    content:
      'Aik Lahori aur aik Karachite startup meeting mein baithe the. Karachite bola: "Bhai humare AI models sub-second latency dete hain!" Lahori muskura kar bola: "Pehle yeh batao, meeting ke baad Biryani aloo wali khilao ge ya baghair aloo ke? Agar aloo nahi tou deal cancel!" Board members ne foran aloo approve kar diya!',
    urduScript:
      'ایک لاہوری اور ایک کراچی والے اسٹارٹ اپ میٹنگ میں بیٹھے تھے۔ کراچی والے نے کہا: "ہمارے اے آئی ماڈلز زبردست اسپیڈ دیتے ہیں!" لاہوری مسکرا کر بولا: "پہلے یہ بتاؤ، میٹنگ کے بعد بریانی آلو والی کھلاؤ گے یا بغیر آلو کے؟ ورنہ ڈیل کینسل!" بورڈ نے فوراً آلو منظور کر لیا!',
    narrator: 'Tariq Hamza (Urdu Male)',
    category: 'Pakistani Banter & Satire',
    duration: '0:35',
  },
  {
    id: 'joke-2',
    type: 'jugat',
    title: 'Chaudhry Sahab di Tesla Jugat',
    content:
      'Chaudhry Sahab ne nai Tesla le li. Dost ne pucha: "Chaudhry Sahab, gaddi ch battery kinni der chaldi ae?" Chaudhry bola: "Oye jado tak meri call khatam nai hondi, odo tak jahaz rukda ee nai! Te jado battery mukdi ae, main do litre doodh patti pa daina aan!"',
    urduScript:
      'چوہدری صاحب نے نئی ٹیسلا لے لی۔ دوست نے پوچھا: "چوہدری صاحب، گڈی دی بیٹری کنی دیر چلدی اے؟" چوہدری بولا: "اوئے جدوں تک میری کال ختم نہیں ہوندی، اودوں تک جہاز رکدا ای نہیں!"',
    narrator: 'Chaudhry Sultan (Punjabi Male)',
    category: 'Desi Punjabi Jugtain',
    duration: '0:28',
  },
  {
    id: 'joke-3',
    type: 'joke',
    title: 'The Infinite Zoom Loop',
    content:
      'Executive ne apne copilot se pucha: "AURA, mere 4 ghante lagatar Zoom meetings ke baad dimagh ka battery level kitna hai?" AURA ne jawab diya: "Boss, dimagh -15% par hai aur brain cooling fan overdrive par chal raha hai. Immediate 2 cup Karak Chai aur Coke Studio ki prescription jari ki jaati hai!"',
    urduScript:
      'ایگزیکٹو نے اپنے کوپائلٹ سے پوچھا: "میری 4 گھنٹے مسلسل میٹنگز کے بعد دماغ کی بیٹری کتنی ہے؟" جواب ملا: "باس، دماغ مائنس 15 فیصد پر ہے، فوری کڑک چائے کی ضرورت ہے!"',
    narrator: 'Farhan (Lahori Slang)',
    category: 'Executive Tech Humor',
    duration: '0:30',
  },
  {
    id: 'joke-4',
    type: 'jugat',
    title: 'Faisalabadi Developer Witty Comeback',
    content:
      'Aik project manager ne developer nu keha: "Tussi code time te kyun nai dita?" Developer kehnda: "Bhai jaan, tussi requirements aisi diti si jiven shadi da card hove te date agle saal di likhi hove!"',
    urduScript:
      'پروجیکٹ مینیجر نے ڈویلپر نوں کیا: "تسی کوڈ ٹائم تے کیوں نئی دیتا؟" ڈویلپر کیندا: "بھائی جان تسی ریکوائرمنٹس ای شادیاں دے کارڈ وانگوں دتیاں سن!"',
    narrator: 'Chaudhry Sultan (Punjabi Male)',
    category: 'Desi Punjabi Jugtain',
    duration: '0:22',
  },

  // Stories / Dastangoi
  {
    id: 'story-1',
    type: 'story',
    title: 'Dastangoi: Tilism-e-AURA aur Wazir-e-Tadbeer',
    content:
      'Suno ae ahl-e-hosh aur arbab-e-hikmat! Dastan yeh hai ke aik azeem saltanat mein aik Ba-Kamaal Wazir tha jo subah-o-sham riyasat ke azeem mansoobon mein uljha rehta tha. Rozana so (100) paighamaat aur hazaron masail uske samne aate. Aik roz usne aik sunehri roshan chiragh jalaya jiska naam AURA tha. AURA ne na sirf dushmanon ke darmian mudabbirana faislay karwaye, balkay har mushkil ghari mein Wazir ko aisi hansi aur sukoon bakhsha ke uski thakan door ho gayi!',
    urduScript:
      'سنو اے اہل ہوش اور ارباب حکمت! داستان یہ ہے کہ ایک عظیم سلطنت میں ایک باکمال وزیر تھا جو صبح و شام ریاست کے عظیم منصوبوں میں الجھا رہتا تھا...',
    narrator: 'Noor (Classical Urdu)',
    category: 'Classical Dastangoi & Tales',
    duration: '1:15',
  },
  {
    id: 'story-2',
    type: 'story',
    title: 'Mullah Nasruddin aur Subah di Sair',
    content:
      'Aik din Mullah Nasruddin apne gadhay par ulta baith kar shahar ja rahe the. Logon ne pucha: "Mullah ji, ulta kyun baithe hain?" Mullah ne muskura kar farmaya: "Agar main seedha baithon tou tum mere peeche hoge aur main tumhein dekh na sakoon ga. Aur agar tum aagay chalo tou adab ke khilaf hoga. Is liye yeh automated strategy hai taake hum dono raabte mein rahein!" Sab log qehqahay maar kar hans pare.',
    urduScript:
      'ایک دن ملا نصر الدین اپنے گدھے پر الٹا بیٹھ کر شہر جا رہے تھے۔ لوگوں نے پوچھا: "ملا جی، الٹا کیوں بیٹھے ہیں؟"...',
    narrator: 'Tariq Hamza (Urdu Male)',
    category: 'Wisdom & Folk Humor',
    duration: '0:45',
  },
  {
    id: 'story-3',
    type: 'story',
    title: 'Executive Grit: The 1997 Apple Return',
    content:
      'In 1997, when Steve Jobs walked back into the boardroom of Apple, the company was 90 days away from complete bankruptcy. The whiteboard had 350 cluttered product lines. Jobs stood up, drew a simple 2x2 matrix: Consumer, Pro, Desktop, Portable. "We kill the rest. We focus." Within 18 months, Apple posted its first profitable quarter in decades. Focus is not saying yes to good things; it is having the courage to say no to a hundred other great ideas.',
    narrator: 'Marcus (British Executive Male)',
    category: 'Inspirational Executive Lessons',
    duration: '0:50',
  },
];

interface EntertainmentHubProps {
  onPlaySong?: (title: string) => void;
  selectedVoiceId: string;
}

export const EntertainmentHub: React.FC<EntertainmentHubProps> = ({
  onPlaySong,
  selectedVoiceId,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'joke' | 'jugat' | 'story'>('all');
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);
  const [customJokePrompt, setCustomJokePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<FunContentItem[]>(CURATED_FUN_CONTENT);

  const filteredItems = items.filter(
    (item) => activeTab === 'all' || item.type === activeTab
  );

  const handleToggleAudio = (item: FunContentItem) => {
    if (speakingItemId === item.id) {
      stopSpeaking();
      setSpeakingItemId(null);
    } else {
      stopSpeaking();
      setSpeakingItemId(item.id);

      // Determine persona based on item narrator
      let persona = selectedVoiceId;
      if (item.narrator.includes('Punjabi') || item.type === 'jugat') {
        persona = 'chaudhry_punjabi_male';
      } else if (item.narrator.includes('Urdu Male')) {
        persona = 'tariq_urdu_male';
      } else if (item.narrator.includes('Lahori')) {
        persona = 'farhan_lahori_male';
      } else if (item.narrator.includes('Classical')) {
        persona = 'noor_urdu_female';
      } else if (item.narrator.includes('British')) {
        persona = 'marcus_uk_male';
      }

      speakText(
        item.content,
        item.type === 'jugat' ? 'ur_slang' : 'ur_slang',
        () => setSpeakingItemId(null),
        persona
      );
    }
  };

  const handleGenerateFreshFun = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:
            customJokePrompt ||
            'AURA bhai, koi zabardast witty Pakistani corporate lateefa ya Punjabi jugat sunao jo mood fresh kar de!',
          language: 'ur_slang',
        }),
      });
      const data = await res.json();
      if (data.reply) {
        const newItem: FunContentItem = {
          id: `custom-fun-${Date.now()}`,
          type: customJokePrompt.toLowerCase().includes('story') ? 'story' : 'joke',
          title: customJokePrompt || 'Fresh AURA Executive Banter',
          content: data.reply,
          narrator: 'Tariq Hamza (Urdu Male)',
          category: 'Live AI Generated',
          duration: '0:35',
        };
        setItems([newItem, ...items]);
        setCustomJokePrompt('');
        handleToggleAudio(newItem);
      }
    } catch {
      // Fallback
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-900/80 border border-purple-600 text-purple-300 uppercase tracking-wider">
                ENTERTAINMENT & CULTURE LOUNGE
              </span>
              <span className="text-xs text-purple-300/80">Jokes, Jugtain & Dastangoi</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
              <span>Executive Fun, Lateefay & Stories</span>
              <Smile className="w-6 h-6 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Decompress from heavy boardrooms. Enjoy witty Pakistani banter, authentic Punjabi jugtain,
              classical Dastangoi tales, and inspirational executive folklore narrated in native accents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPlaySong?.('Pasoori')}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-purple-500/40 text-purple-200 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Music className="w-4 h-4 text-purple-400" />
              <span>Play Music Lounge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generator Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={customJokePrompt}
            onChange={(e) => setCustomJokePrompt(e.target.value)}
            placeholder="Ask AURA for a custom joke, Punjabi jugat, or story topic (e.g. 'Lahori startup joke', 'Mullah Nasruddin')..."
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          onClick={handleGenerateFreshFun}
          disabled={isGenerating}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition-all shrink-0"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isGenerating ? 'Generating...' : 'Crack Fresh Joke / Story'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'all', label: 'All Entertainment', icon: Sparkles },
          { id: 'joke', label: 'Urdu Lateefay & Satire', icon: Smile },
          { id: 'jugat', label: 'Punjabi Jugtain', icon: Flame },
          { id: 'story', label: 'Dastangoi & Stories', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-purple-950 border border-purple-500/60 text-purple-200 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Fun Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const isPlaying = speakingItemId === item.id;
          return (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-3xl p-5 shadow-lg flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300">
                      {item.category}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{item.title}</h3>
                  </div>

                  <button
                    onClick={() => handleToggleAudio(item)}
                    className={`p-3 rounded-2xl border transition-all ${
                      isPlaying
                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/50'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title={isPlaying ? 'Stop Voice Narration' : 'Listen with Native Accent'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>

                <p className="text-xs text-slate-200 mt-3.5 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                  {item.content}
                </p>

                {item.urduScript && (
                  <p
                    dir="rtl"
                    className="text-xs text-purple-200/90 font-serif mt-2.5 p-3 rounded-2xl bg-purple-950/20 border border-purple-900/30 leading-loose"
                  >
                    {item.urduScript}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Voice: {item.narrator}</span>
                </div>
                {item.duration && <span className="font-mono text-slate-500">{item.duration}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
