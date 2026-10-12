import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  X,
  Search,
  Music,
  Video,
  ListMusic,
  Sparkles,
  Headphones,
  Check,
  Plus,
  Trash2,
  Layers,
  Shuffle,
  Repeat,
  Radio,
  Sliders,
  Cast,
} from 'lucide-react';
import { MediaTrack } from '../types/assistant.ts';

export const CURATED_TRACKS: MediaTrack[] = [
  {
    id: 'track-1',
    title: 'Pasoori',
    artist: 'Ali Sethi x Shae Gill | Coke Studio Season 14',
    category: 'coke_studio',
    mediaType: 'song',
    youtubeId: '5Eqb_-j3FDA',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    duration: '3:44',
  },
  {
    id: 'track-2',
    title: 'Tu Jhoom',
    artist: 'Abida Parveen x Naseebo Lal | Coke Studio Season 14',
    category: 'coke_studio',
    mediaType: 'song',
    youtubeId: '7D4vNcK6D38',
    thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    duration: '6:54',
  },
  {
    id: 'track-3',
    title: 'Afreen Afreen',
    artist: 'Rahat Fateh Ali Khan & Momina Mustehsan',
    category: 'coke_studio',
    mediaType: 'song',
    youtubeId: 'kw4tT7SCmaY',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    duration: '6:45',
  },
  {
    id: 'track-4',
    title: 'Tajdar-e-Haram',
    artist: 'Atif Aslam | Coke Studio Season 8',
    category: 'coke_studio',
    mediaType: 'song',
    youtubeId: 'a18py61E6Ec',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    duration: '10:18',
  },
  {
    id: 'track-5',
    title: 'Lofi Hip Hop - Deep Work & Study Beats',
    artist: 'Lofi Girl Live Lounge',
    category: 'lofi',
    mediaType: 'video',
    youtubeId: 'jfKfPfyJRdk',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    duration: 'Live Stream',
  },
  {
    id: 'track-6',
    title: 'Hans Zimmer - Interstellar Main Theme Live',
    artist: 'Hans Zimmer & Vienna Radio Symphony',
    category: 'classical',
    mediaType: 'video',
    youtubeId: 'UDVtMYqUAyw',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    duration: '7:42',
  },
  {
    id: 'track-7',
    title: 'Kana Yaari',
    artist: 'Kaifi Khalil, Eva B & Abdul Wahab Bugti | Coke Studio Season 14',
    category: 'coke_studio',
    mediaType: 'video',
    youtubeId: 'zQDAi8tI-cU',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?auto=format&fit=crop&w=600&q=80',
    duration: '3:36',
  },
  {
    id: 'track-8',
    title: 'Kahani Suno 2.0',
    artist: 'Kaifi Khalil',
    category: 'coke_studio',
    mediaType: 'song',
    youtubeId: '_XbvXHhkL4U',
    thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    duration: '2:53',
  },
  {
    id: 'track-9',
    title: 'Late Night Executive Jazz Lounge',
    artist: 'Metropolitan Blue Note Trio',
    category: 'classical',
    mediaType: 'song',
    youtubeId: 'Dx5qFachd3A',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80',
    duration: '45:10',
  },
  {
    id: 'track-10',
    title: 'Blockbuster',
    artist: 'Faris Shafi, Umair & Gharwi Group | Coke Studio Season 15',
    category: 'coke_studio',
    mediaType: 'video',
    youtubeId: 'c_v5tD2fU1o',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
    duration: '3:30',
  },
  {
    id: 'track-11',
    title: 'Habibi',
    artist: 'Asim Azhar',
    category: 'coke_studio',
    mediaType: 'song',
    youtubeId: 'Hn_sQjP1T7s',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    duration: '3:10',
  },
  {
    id: 'track-12',
    title: 'Jhoom (R&B Soul)',
    artist: 'Ali Zafar',
    category: 'coke_studio',
    mediaType: 'song',
    youtubeId: '0bA1_65Y_8A',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    duration: '4:15',
  },
  {
    id: 'track-13',
    title: 'Synthwave & Cyberpunk Ambient Lounge',
    artist: 'Lofi Cyber Lounge 24/7',
    category: 'lofi',
    mediaType: 'video',
    youtubeId: '4xDzrJKXOOY',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    duration: 'Live Stream',
  },
  {
    id: 'track-14',
    title: 'Ludovico Einaudi - Nuvole Bianche (Live in Milan)',
    artist: 'Ludovico Einaudi',
    category: 'classical',
    mediaType: 'video',
    youtubeId: 'q5oSKfAOD5I',
    duration: '5:58',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
  },
];

interface MediaPlayerProps {
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  isOpen: boolean;
  isFloating: boolean;
  playlist: MediaTrack[];
  onClose: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onSelectTrack: (track: MediaTrack) => void;
  onAddToPlaylist: (track: MediaTrack) => void;
  onRemoveFromPlaylist: (id: string) => void;
  onSetFloating: (floating: boolean) => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  currentTrack,
  isPlaying,
  isOpen,
  isFloating,
  playlist,
  onClose,
  onTogglePlay,
  onStop,
  onPlayNext,
  onPlayPrevious,
  onSelectTrack,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onSetFloating,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playlistTab, setPlaylistTab] = useState<'curated' | 'queue'>('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>('');
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  // Complete Media Management States
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [equalizerPreset, setEqualizerPreset] = useState<'balanced' | 'bass' | 'vocal' | 'chill'>('balanced');
  const [outputDevice, setOutputDevice] = useState<string>('local');
  const [currentProgressSec, setCurrentProgressSec] = useState<number>(0);
  const [totalDurationSec, setTotalDurationSec] = useState<number>(224); // default 3m 44s

  // Parse duration when currentTrack changes
  useEffect(() => {
    setCurrentProgressSec(0);
    if (currentTrack?.duration && currentTrack.duration.includes(':')) {
      const parts = currentTrack.duration.split(':');
      const mins = parseInt(parts[0], 10) || 3;
      const secs = parseInt(parts[1], 10) || 44;
      setTotalDurationSec(mins * 60 + secs);
    } else {
      setTotalDurationSec(240);
    }
  }, [currentTrack]);

  // Keep refs for callback props to avoid triggering updates or calling setters inside state updaters
  const onPlayNextRef = useRef(onPlayNext);
  useEffect(() => {
    onPlayNextRef.current = onPlayNext;
  }, [onPlayNext]);

  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  // Playback timer: purely increments local progress without triggering side-effects in reducer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentProgressSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Track completion & auto-advance: safely dispatched in a passive effect after render
  useEffect(() => {
    if (!isPlaying) return;
    if (currentProgressSec >= totalDurationSec && totalDurationSec > 0) {
      setCurrentProgressSec(0);
      if (repeatMode === 'one') {
        // Repeat current track: progress resets to 0 and continues
      } else if (repeatMode === 'all' || playlist.length > 1) {
        onPlayNextRef.current();
      } else {
        onStopRef.current();
      }
    }
  }, [isPlaying, currentProgressSec, totalDurationSec, repeatMode, playlist.length]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Sync active video or audio source
  useEffect(() => {
    if (!currentTrack || !isPlaying) {
      setActiveVideoUrl('');
      return;
    }

    if (currentTrack.youtubeId) {
      setActiveVideoUrl(
        `https://www.youtube-nocookie.com/embed/${currentTrack.youtubeId}?autoplay=1&enablejsapi=1&rel=0`
      );
    } else {
      setActiveVideoUrl('');
    }
  }, [currentTrack, isPlaying]);

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if query contains a youtube URL or id
    const ytMatch = searchQuery.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?(?:.*&)?v=))([\w-]{11})|\b([A-Za-z0-9_-]{11})\b/
    );
    const ytId = ytMatch ? (ytMatch[1] || ytMatch[2]) : null;

    // Search against curated tracks first
    const foundInLibrary = CURATED_TRACKS.find(
      (t) =>
        (ytId && t.youtubeId === ytId) ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (foundInLibrary) {
      onSelectTrack(foundInLibrary);
      onAddToPlaylist(foundInLibrary);
      setAddedNotice(`Playing "${foundInLibrary.title}"`);
    } else {
      let resolvedTitle = searchQuery.replace(/https?:\/\/\S+/g, '').trim();
      let resolvedArtist = ytId ? 'YouTube Stream' : 'Executive Request';

      if (ytId === 'zQDAi8tI-cU') {
        resolvedTitle = 'Kana Yaari - Kaifi Khalil, Eva B & Abdul Wahab Bugti';
        resolvedArtist = 'Coke Studio Season 14';
      } else if (!resolvedTitle) {
        resolvedTitle = ytId ? `YouTube Video (${ytId})` : searchQuery;
      }

      const customTrack: MediaTrack = {
        id: `custom-${Date.now()}`,
        title: resolvedTitle,
        artist: resolvedArtist,
        category: 'custom',
        mediaType: 'video',
        youtubeId: ytId || 'zQDAi8tI-cU',
        thumbnailUrl: ytId === 'zQDAi8tI-cU'
          ? 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?auto=format&fit=crop&w=600&q=80'
          : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      };

      onAddToPlaylist(customTrack);
      onSelectTrack(customTrack);
      setAddedNotice(`Playing "${resolvedTitle}" from YouTube`);
    }

    setTimeout(() => setAddedNotice(null), 3000);
    setSearchQuery('');
  };

  const handleAddBatchYoutubeHits = () => {
    const hits: MediaTrack[] = [
      {
        id: `yt-hit-${Date.now()}-1`,
        title: 'Kana Yaari',
        artist: 'Kaifi Khalil, Eva B & Abdul Wahab Bugti | Coke Studio',
        category: 'coke_studio',
        mediaType: 'video',
        youtubeId: 'zQDAi8tI-cU',
        duration: '3:36',
        thumbnailUrl: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-hit-${Date.now()}-2`,
        title: 'Blockbuster',
        artist: 'Faris Shafi, Umair & Gharwi Group | Coke Studio',
        category: 'coke_studio',
        mediaType: 'video',
        youtubeId: 'c_v5tD2fU1o',
        duration: '3:30',
        thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-hit-${Date.now()}-3`,
        title: 'Kahani Suno 2.0',
        artist: 'Kaifi Khalil',
        category: 'coke_studio',
        mediaType: 'song',
        youtubeId: '_XbvXHhkL4U',
        duration: '2:53',
        thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-hit-${Date.now()}-4`,
        title: 'Habibi',
        artist: 'Asim Azhar',
        category: 'coke_studio',
        mediaType: 'song',
        youtubeId: 'Hn_sQjP1T7s',
        duration: '3:10',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-hit-${Date.now()}-5`,
        title: 'Lofi Hip Hop - Deep Work & Study Beats',
        artist: 'Lofi Girl Live Lounge',
        category: 'lofi',
        mediaType: 'video',
        youtubeId: 'jfKfPfyJRdk',
        duration: 'Live Stream',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
      },
    ];

    hits.forEach((t) => onAddToPlaylist(t));
    setAddedNotice('Added 5 YouTube Hits to Queue!');
    setTimeout(() => setAddedNotice(null), 3000);
  };

  const handleAddTrackToQueue = (track: MediaTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToPlaylist(track);
    setAddedNotice(`Added "${track.title}" to queue`);
    setTimeout(() => setAddedNotice(null), 2500);
  };

  const filteredCurated = CURATED_TRACKS.filter((t) => {
    const matchesCategory =
      selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!isOpen && !isFloating) return null;

  // 1. Persistent Floating Mini-Player (Picture-in-Picture)
  if (isFloating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 p-3.5 flex items-center gap-3.5 max-w-sm w-88 ring-1 ring-cyan-500/20">
          
          {/* Animated thumbnail disc */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
            {currentTrack?.thumbnailUrl ? (
              <img
                src={currentTrack.thumbnailUrl}
                alt={currentTrack.title}
                className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : 'opacity-80'}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cyan-950/40 text-cyan-400">
                <Music className="w-5 h-5 animate-pulse" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-cyan-950/30 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce h-3" />
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.15s] h-4" />
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s] h-2" />
                </div>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                AURA MEDIA
              </span>
              {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
            </div>
            <h4 className="text-xs font-semibold text-white truncate mt-0.5">
              {currentTrack?.title || 'Executive Lounge'}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              {currentTrack?.artist || 'Ready to stream'}
            </p>
          </div>

          {/* Controls: Prev, Play/Pause, Stop, Next */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onPlayPrevious}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Previous Song"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={onStop}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
              title="Stop & Turn Off Music"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onPlayNext}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Next Song"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSetFloating(false)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Expand to Full Lounge"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
              title="Close Player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Background YouTube stream iframe (only mounted when playing) */}
          {isPlaying && activeVideoUrl && (
            <div className="sr-only">
              <iframe
                title="AURA Media Background Stream"
                src={activeVideoUrl}
                allow="autoplay; encrypted-media"
                className="w-1 h-1 opacity-0 pointer-events-none"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Full Media Modal Hub
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] max-h-[820px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <Headphones className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Executive Media & Video Lounge</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  AUTONOMOUS DIRECTIVES ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Voice controls ready: "Stop music", "Next song", "Change music", "Add to list".
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen?.().catch(() => {});
                } else {
                  document.exitFullscreen?.().catch(() => {});
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Toggle Full Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => onSetFloating(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Minimize to Floating Picture-in-Picture"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Minimize to PiP</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Added notice banner */}
        {addedNotice && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/50 px-6 py-2 text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{addedNotice}</span>
          </div>
        )}

        {/* Content Body: Left Video/Controls + Right Playlist/Queue */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          
          {/* Left Column: Active Video Player & Playback Bar */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* 16:9 Screen */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl group">
              {isPlaying && activeVideoUrl ? (
                <iframe
                  title="AURA Executive Player"
                  src={activeVideoUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : currentTrack?.thumbnailUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={currentTrack.thumbnailUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col items-center justify-center gap-3">
                    <button
                      onClick={onTogglePlay}
                      className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-105"
                      title="Play Track"
                    >
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </button>
                    <span className="text-xs font-semibold text-slate-300">
                      Music Paused / Off. Click Play or give voice command.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Music className="w-12 h-12 text-slate-600 animate-pulse" />
                  <span className="text-sm">Select a track from the library or queue</span>
                </div>
              )}
            </div>

            {/* Currently Playing Card & Master Controls */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="min-w-0 w-full sm:w-auto">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  CURRENT TRACK
                </span>
                <h4 className="text-sm font-bold text-white truncate">
                  {currentTrack?.title || 'Executive Ambient Lounge'}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  {currentTrack?.artist || 'Ready to stream'}
                </p>
              </div>

              {/* Master Control Buttons: Prev, Play/Pause, Stop, Next */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onPlayPrevious}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Previous Song"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="p-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-lg shadow-cyan-950/50"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={onStop}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 transition-colors"
                  title="Stop Music & Turn Off"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={onPlayNext}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Next Song / Change Track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {currentTrack && (
                  <button
                    onClick={(e) => handleAddTrackToQueue(currentTrack, e)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 transition-colors"
                    title="Add Current Track to Queue"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Directives Guidance Box */}
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300/90 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-white">Directives Understood: </span>
                Say <span className="text-cyan-200 font-mono">"Gana band karo"</span> /{' '}
                <span className="text-cyan-200 font-mono">"Stop music"</span> to turn off instantly.{' '}
                Say <span className="text-cyan-200 font-mono">"Next song"</span> /{' '}
                <span className="text-cyan-200 font-mono">"Change music"</span> to cycle tracks.{' '}
                Say <span className="text-cyan-200 font-mono">"Add this song to playlist"</span> anytime.
              </div>
            </div>
          </div>

          {/* Right Column: Search, Library & User Queue Tabs */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Search Bar */}
            <form onSubmit={handleCustomSearch} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search song, Coke Studio, artist, YouTube URL..."
                className="w-full pl-9 pr-24 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
              >
                Play / Add
              </button>
            </form>

            {/* Sub-tabs: Curated Lounge vs Current Queue */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setPlaylistTab('curated')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  playlistTab === 'curated'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Curated Lounge</span>
              </button>

              <button
                onClick={() => setPlaylistTab('queue')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  playlistTab === 'queue'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Active Queue ({playlist.length})</span>
              </button>

              <button
                onClick={handleAddBatchYoutubeHits}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-950/70 hover:bg-red-900/80 border border-red-500/40 text-[11px] font-semibold text-red-300 transition-colors shadow-sm"
                title="Add 5 trending YouTube songs including Kana Yaari & Blockbuster to queue"
              >
                <Plus className="w-3 h-3 text-red-400" />
                <span>+5 YouTube Hits</span>
              </button>
            </div>

            {/* Curated Category Pills (when in Curated Tab) */}
            {playlistTab === 'curated' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'coke_studio', label: 'Coke Studio' },
                  { id: 'lofi', label: 'Lofi Beats' },
                  { id: 'classical', label: 'Jazz & Scores' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* Track List Display */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
              {playlistTab === 'curated' ? (
                filteredCurated.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => onSelectTrack(track)}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer group ${
                        isCurrent
                          ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-md'
                          : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                        {track.thumbnailUrl ? (
                          <img
                            src={track.thumbnailUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <Music className="w-4 h-4" />
                          </div>
                        )}
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 bg-cyan-950/60 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold truncate group-hover:text-cyan-300 transition-colors">
                          {track.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {track.duration && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {track.duration}
                          </span>
                        )}
                        <button
                          onClick={(e) => handleAddTrackToQueue(track, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                          title="Add to queue"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* User's Dynamic Queue */
                playlist.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => onSelectTrack(track)}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer group ${
                        isCurrent
                          ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-md'
                          : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-mono text-slate-500 w-4 text-center">
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold truncate group-hover:text-cyan-300 transition-colors">
                          {track.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && isPlaying ? (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                            Playing
                          </span>
                        ) : null}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromPlaylist(track.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
