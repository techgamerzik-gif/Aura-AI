import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Presentation,
  FileText,
  Video,
  Music,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Tv,
  Cast,
  Sparkles,
  Layers,
} from 'lucide-react';
import { UniversalFile, PresentationDeck, SlideItem } from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';

export interface UniversalFileViewerProps {
  file: UniversalFile | null;
  isOpen: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
  isPlaying: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  onToggleFullscreen: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onCastToTV?: (targetDevice?: string) => void;
}

export const UniversalFileViewer: React.FC<UniversalFileViewerProps> = ({
  file,
  isOpen,
  isMinimized,
  isFullscreen,
  isPlaying,
  onClose,
  onToggleMinimize,
  onToggleFullscreen,
  onTogglePlay,
  onStop,
  onNext,
  onPrevious,
  onCastToTV,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const [castingNotification, setCastingNotification] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setCurrentSlide(0);
  }, [file?.id]);

  if (!isOpen && !isMinimized) return null;
  if (!file) return null;

  const handleCopyContent = () => {
    if (file.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCast = () => {
    soundEffects.playSuccessChime();
    setCastingNotification(`Streaming "${file.title}" to Living Room Smart TV`);
    if (onCastToTV) {
      onCastToTV('Living Room Smart TV (65" Samsung QLED)');
    }
    setTimeout(() => setCastingNotification(null), 4000);
  };

  const deck = file.presentationDeck;
  const isVideo = file.type === 'video';
  const isPresentation = file.type === 'presentation';
  const isDoc = file.type === 'document' || file.type === 'pdf' || file.type === 'notes';

  // 1. MINIMIZED / FLOATING PIP MODE (Bottom-Right Dock)
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-950/60 p-3.5 flex items-center gap-3.5 max-w-sm w-88 ring-1 ring-cyan-500/30">
          {/* File Type Icon / Mini Preview */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-700 flex items-center justify-center">
            {isVideo ? (
              <Video className="w-5 h-5 text-cyan-400 animate-pulse" />
            ) : isPresentation ? (
              <Presentation className="w-5 h-5 text-amber-400" />
            ) : (
              <FileText className="w-5 h-5 text-emerald-400" />
            )}
            {isPlaying && isVideo && (
              <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                {file.type}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">PiP Dock</span>
            </div>
            <p className="text-xs font-semibold text-slate-100 truncate mt-0.5">{file.title}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {isPresentation && deck ? `Slide ${currentSlide + 1} of ${deck.slides.length}` : file.category}
            </p>
          </div>

          {/* Quick Controls in Mini Window */}
          <div className="flex items-center gap-1">
            {isVideo && (
              <>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="p-1.5 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={onStop}
                  className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-slate-700 transition-colors"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onToggleMinimize}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Restore / Maximize"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL / STANDARD MODAL OR NATIVE FULLSCREEN MODE
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
              {isVideo ? (
                <Video className="w-5 h-5" />
              ) : isPresentation ? (
                <Presentation className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
                  {file.type}
                </span>
                <span className="text-xs text-slate-400 font-mono">{file.category}</span>
                {castingNotification && (
                  <span className="text-xs text-blue-400 font-mono animate-pulse flex items-center gap-1">
                    <Cast className="w-3 h-3" />
                    <span>{castingNotification}</span>
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate mt-0.5">
                {file.title}
              </h2>
            </div>
          </div>

          {/* Window & Media Action Buttons (Open, Minimize, Full Screen, Cast, Close) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Cast to Smart TV */}
            <button
              type="button"
              onClick={handleCast}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-xs font-medium transition-colors"
              title="Cast to Living Room TV / WiFi Display"
            >
              <Cast className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cast to TV</span>
            </button>

            {/* Minimize to PiP */}
            <button
              type="button"
              onClick={onToggleMinimize}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Minimize to Floating PiP Window"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Full Screen */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition-colors"
              title="Close File Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60">
          {/* A. VIDEO PLAYER SPECIFIC VIEW */}
          {isVideo && (
            <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto justify-center">
              {/* Responsive Video Container */}
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
                {file.youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${file.youtubeId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&rel=0`}
                    title={file.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : file.url ? (
                  <video
                    ref={videoRef}
                    src={file.url}
                    controls
                    autoPlay={isPlaying}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Video className="w-16 h-16 text-cyan-500/50 mx-auto mb-3 animate-pulse" />
                    <p className="text-base text-slate-200 font-semibold">{file.title}</p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">Stream Active · Video Decoded</p>
                  </div>
                )}
              </div>

              {/* Comprehensive Video Player Controls (Play, Pause, Stop, Next, Prev, Volume, Speed) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onPrevious}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Previous Video"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onTogglePlay}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2 transition-colors shadow-lg shadow-cyan-500/30"
                    title={isPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span className="text-xs uppercase font-mono">{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onStop}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-rose-400 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
                    title="Stop Video (Reset & Halt)"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">Stop</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNext}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Next Video"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Volume & Audio Controls */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-8">{isMuted ? '0%' : `${volume}%`}</span>
                </div>

                {/* Playback Speed selector */}
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 font-mono mr-1">Speed:</span>
                  {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        playbackSpeed === spd ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* B. PRESENTATION DECK SPECIFIC VIEW */}
          {isPresentation && deck && (
            <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto">
              {/* Slide Presentation Canvas */}
              {deck.slides && deck.slides[currentSlide] && (
                <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-800/40 rounded-2xl p-6 sm:p-10 flex flex-col justify-between shadow-2xl relative">
                  <div className="flex items-center justify-between text-xs text-cyan-400/80 font-mono pb-4 border-b border-slate-800">
                    <span className="flex items-center gap-2">
                      <Presentation className="w-4 h-4 text-cyan-400" />
                      <span>{deck.deckTitle}</span>
                    </span>
                    <span>
                      Slide {currentSlide + 1} of {deck.slides.length}
                    </span>
                  </div>

                  <div className="my-6">
                    <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                      {deck.slides[currentSlide].title}
                    </h1>
                    <p className="text-sm sm:text-base text-cyan-300 font-medium mt-2">
                      {deck.slides[currentSlide].subtitle}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {deck.slides[currentSlide].bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    {deck.slides[currentSlide].takeaway && (
                      <div className="mt-6 p-3 rounded-xl bg-cyan-950/60 border-l-4 border-cyan-400 text-xs text-cyan-200 italic">
                        <strong>Key Takeaway:</strong> {deck.slides[currentSlide].takeaway}
                      </div>
                    )}
                  </div>

                  {/* Speaker Notes */}
                  {deck.slides[currentSlide].notes && (
                    <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                      <span className="text-cyan-400 font-semibold mr-2">Presenter Note:</span>
                      {deck.slides[currentSlide].notes}
                    </div>
                  )}
                </div>
              )}

              {/* Slide Navigation Bar */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Slide</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {deck.slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono transition-all ${
                        currentSlide === idx
                          ? 'bg-cyan-500 text-slate-950 font-bold scale-110 shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => Math.min(deck.slides.length - 1, prev + 1))}
                  disabled={currentSlide === deck.slides.length - 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                >
                  <span>Next Slide</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* C. DOCUMENT & GENERAL TEXT VIEW */}
          {isDoc && (
            <div className="max-w-3xl mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div>
                  <h1 className="text-lg font-bold text-white">{file.title}</h1>
                  <p className="text-xs text-slate-400 font-mono mt-1">Generated: {file.createdAt}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
                {file.content || 'No text content available for this document.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
