import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Command,
  Play,
  Pause,
  Square,
  SkipForward,
  Maximize2,
  Minimize2,
  Tv,
  Wifi,
  Trash2,
  PlusCircle,
  FileText,
  Presentation,
  Volume2,
  VolumeX,
  Send,
  X,
  Cast,
} from 'lucide-react';
import { soundEffects } from '../utils/audioChime.ts';

interface CommandChip {
  id: string;
  label: string;
  command: string;
  icon: React.ReactNode;
  category: 'presentation' | 'media' | 'tv' | 'clean' | 'tasks';
  color: string;
}

interface UniversalCommandBarProps {
  onExecuteCommand: (commandText: string) => void;
  isMediaPlaying?: boolean;
  onOpenVideoPlayer?: () => void;
  onTogglePlay?: () => void;
  onStopMedia?: () => void;
  onNextMedia?: () => void;
  onMinimizePlayer?: () => void;
  onFullscreenPlayer?: () => void;
  onWipeSampleData?: () => void;
  onOpenTVRemote?: () => void;
  onCreatePresentationPrompt?: () => void;
  isSampleDataWiped?: boolean;
}

export const UniversalCommandBar: React.FC<UniversalCommandBarProps> = ({
  onExecuteCommand,
  isMediaPlaying,
  onOpenVideoPlayer,
  onTogglePlay,
  onStopMedia,
  onNextMedia,
  onMinimizePlayer,
  onFullscreenPlayer,
  onWipeSampleData,
  onOpenTVRemote,
  onCreatePresentationPrompt,
  isSampleDataWiped,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' or 'Ctrl+K' / 'Cmd+K' to focus command bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    soundEffects.playSuccessChime();
    onExecuteCommand(query.trim());
    setQuery('');
  };

  const handleChipClick = (cmd: string) => {
    soundEffects.playSuccessChime();
    onExecuteCommand(cmd);
  };

  const QUICK_COMMANDS: CommandChip[] = [
    {
      id: 'cmd-pres',
      label: 'Create Presentation',
      command: 'Create presentation on AI and Autonomous Strategy',
      icon: <Presentation className="w-3.5 h-3.5" />,
      category: 'presentation',
      color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20',
    },
    {
      id: 'cmd-audit-report',
      label: 'Testing Report',
      command: 'open practical implementation report',
      icon: <FileText className="w-3.5 h-3.5" />,
      category: 'presentation',
      color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20',
    },
    {
      id: 'cmd-video',
      label: 'Open Video Player',
      command: 'open video player',
      icon: <Play className="w-3.5 h-3.5" />,
      category: 'media',
      color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20',
    },
    {
      id: 'cmd-play-toggle',
      label: isMediaPlaying ? 'Pause Video/Audio' : 'Play Video/Audio',
      command: isMediaPlaying ? 'pause video' : 'play video',
      icon: isMediaPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />,
      category: 'media',
      color: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20',
    },
    {
      id: 'cmd-stop',
      label: 'Stop Media',
      command: 'stop video',
      icon: <Square className="w-3.5 h-3.5" />,
      category: 'media',
      color: 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20',
    },
    {
      id: 'cmd-next',
      label: 'Next Track/Video',
      command: 'next video',
      icon: <SkipForward className="w-3.5 h-3.5" />,
      category: 'media',
      color: 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20',
    },
    {
      id: 'cmd-min',
      label: 'Minimize Player',
      command: 'minimize video player',
      icon: <Minimize2 className="w-3.5 h-3.5" />,
      category: 'media',
      color: 'bg-slate-700/50 text-slate-300 border-slate-600/50 hover:bg-slate-700',
    },
    {
      id: 'cmd-full',
      label: 'Fullscreen Player',
      command: 'full screen video player',
      icon: <Maximize2 className="w-3.5 h-3.5" />,
      category: 'media',
      color: 'bg-cyan-600/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-600/30',
    },
    {
      id: 'cmd-tv',
      label: 'Living Room TV Remote',
      command: 'control tv',
      icon: <Tv className="w-3.5 h-3.5" />,
      category: 'tv',
      color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20',
    },
    {
      id: 'cmd-cast',
      label: 'Cast to TV',
      command: 'cast to living room tv',
      icon: <Cast className="w-3.5 h-3.5" />,
      category: 'tv',
      color: 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20',
    },
    {
      id: 'cmd-wifi',
      label: 'Scan WiFi Devices',
      command: 'scan wifi network devices',
      icon: <Wifi className="w-3.5 h-3.5" />,
      category: 'tv',
      color: 'bg-teal-500/10 text-teal-300 border-teal-500/30 hover:bg-teal-500/20',
    },
    {
      id: 'cmd-clean',
      label: isSampleDataWiped ? 'Data Cleaned (Add Own Things)' : 'Wipe All Sample Data',
      command: 'wipe all sample data',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      category: 'clean',
      color: isSampleDataWiped
        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/40'
        : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40',
    },
  ];

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-4 sm:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Search / Command Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center w-full gap-2">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center gap-1">
              <Search className="w-4 h-4 text-cyan-400" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Omni Command & Search: type 'create presentation...', 'play video', 'pause', 'stop', 'next', 'turn on TV', 'scan wifi'..."
              className="w-full bg-slate-950/80 text-slate-100 placeholder-slate-500 text-xs sm:text-sm pl-10 pr-24 py-2.5 rounded-xl border border-slate-700/80 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
            />

            <div className="absolute right-3 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono border border-slate-700">
                <Command className="w-2.5 h-2.5" />
                <span>/</span>
              </div>
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-cyan-500/20"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </form>

        {/* 1-Click Common Command Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <span className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Common Commands:</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            {QUICK_COMMANDS.slice(0, showAllChips ? QUICK_COMMANDS.length : 8).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip.command)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all shrink-0 cursor-pointer ${chip.color}`}
                title={`Execute: ${chip.command}`}
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowAllChips(!showAllChips)}
              className="text-[11px] text-slate-400 hover:text-cyan-400 font-mono px-1.5 py-0.5 transition-colors underline"
            >
              {showAllChips ? 'Show Less' : `+${QUICK_COMMANDS.length - 8} more`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
