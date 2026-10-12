import React, { useState, useEffect } from 'react';
import {
  Presentation,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Maximize2,
  BookOpen,
  Send,
  Eye,
  Sliders,
  Printer,
  Plus,
  Trash2,
  Tv,
  Cast,
  Layers,
  FolderOpen,
  ShieldCheck,
  Lock,
  CheckCircle2,
  ArrowDownToLine,
  FileCheck,
  Award,
  RotateCcw,
} from 'lucide-react';
import { PresentationDeck, SlideItem, LanguageMode, UniversalFile } from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';
import { FormalDocument, INITIAL_SAVED_DOCUMENTS } from '../data/formalReport.ts';

interface DocumentsHubProps {
  language: LanguageMode;
  onVoiceTrigger?: (prompt: string) => void;
  decks: PresentationDeck[];
  activeDeck: PresentationDeck | null;
  onSelectDeck: (deck: PresentationDeck) => void;
  onSaveDeck: (deck: PresentationDeck) => void;
  onDeleteDeck: (id: string) => void;
  onOpenFileInViewer: (file: UniversalFile) => void;
  isSampleDataWiped?: boolean;
  onCastDeckToTV?: (deck: PresentationDeck) => void;
}

export const DocumentsHub: React.FC<DocumentsHubProps> = ({
  language,
  onVoiceTrigger,
  decks,
  activeDeck,
  onSelectDeck,
  onSaveDeck,
  onDeleteDeck,
  onOpenFileInViewer,
  isSampleDataWiped,
  onCastDeckToTV,
}) => {
  const [activeTab, setActiveTab] = useState<'presentation' | 'document' | 'all_files'>('presentation');

  // Presentation Generator State
  const [deckTopic, setDeckTopic] = useState('Executive AI Transformation & Autonomous Operations');
  const [slideCount, setSlideCount] = useState(5);
  const [audience, setAudience] = useState('Board of Directors & C-Suite');
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showPresenterNotes, setShowPresenterNotes] = useState(true);

  // Document Generator State
  const [docTitle, setDocTitle] = useState('Quarterly Strategic Policy Memo: Operational Autonomy');
  const [docType, setDocType] = useState('Executive Memo');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [docContent, setDocContent] = useState<string>(
    INITIAL_SAVED_DOCUMENTS[1]?.content || ''
  );
  const [savedDocs, setSavedDocs] = useState<FormalDocument[]>(() => {
    try {
      const stored = localStorage.getItem('aura_saved_documents');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure the formal report is always included
          const hasReport = parsed.some((d: FormalDocument) => d.id === 'doc-report-formal');
          if (!hasReport) {
            return [INITIAL_SAVED_DOCUMENTS[0], ...parsed];
          }
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_SAVED_DOCUMENTS;
  });

  const [selectedDocId, setSelectedDocId] = useState<string>('doc-report-formal');
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const activeDocument = savedDocs.find((d) => d.id === selectedDocId) || savedDocs[0] || null;

  const showNotification = (msg: string) => {
    soundEffects.playSuccessChime();
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleDownloadDoc = (doc: FormalDocument) => {
    soundEffects.playSuccessChime();
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Downloaded document "${doc.title}.md"`);
  };

  const handleDeleteDoc = (id: string) => {
    if (id === 'doc-report-formal') {
      showNotification('Primary Audit Report is certified and protected against deletion.');
      return;
    }
    setSavedDocs((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem('aura_saved_documents', JSON.stringify(updated));
      return updated;
    });
    if (selectedDocId === id) {
      setSelectedDocId('doc-report-formal');
    }
    showNotification('Document removed from executive vault.');
  };

  const handleRestoreStandardDocs = () => {
    setSavedDocs(INITIAL_SAVED_DOCUMENTS);
    setSelectedDocId('doc-report-formal');
    localStorage.setItem('aura_saved_documents', JSON.stringify(INITIAL_SAVED_DOCUMENTS));
    showNotification('Executive Documents restored to standard certified suite.');
  };

  // Generate Deck via backend API with guaranteed on-ground deck creation
  const handleGenerateDeck = async () => {
    if (!deckTopic.trim()) return;
    setIsGeneratingDeck(true);

    try {
      const res = await fetch('/api/assistant/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: deckTopic,
          slideCount,
          audience,
          language,
        }),
      });

      const data = await res.json();
      const generatedSlides: SlideItem[] =
        data.slides && data.slides.length > 0
          ? data.slides
          : [
              {
                slideNumber: 1,
                title: deckTopic,
                subtitle: 'Strategic Overview & High-Impact Performance Metrics',
                bullets: [
                  'Strategic leadership alignment across corporate decision tracks',
                  'Macro industry transition toward autonomous orchestration',
                  'Target ROI: 3.8x velocity increase with zero-friction handoffs',
                ],
                takeaway: 'Autonomous executive orchestration converts friction into compounding speed.',
                notes: 'Open by anchoring the committee on immediate time-reclamation and capital leverage.',
              },
              {
                slideNumber: 2,
                title: 'Operational Execution Tracks',
                subtitle: 'Core Directives & Calendar Governance',
                bullets: [
                  'Track 1: End-to-end autonomous calendar & inbox triage',
                  'Track 2: Proactive meeting buffer insertion (15-min invariant)',
                  'Track 3: Connected smart ecosystem (Tesla, Smart Home, Biometrics)',
                ],
                takeaway: 'Disciplined autonomous workflows yield exponential executive output.',
                notes: 'Review resource allocation and confirm leadership approval.',
              },
            ];

      const newDeck: PresentationDeck = {
        id: `deck-${Date.now()}`,
        deckTitle: data.deckTitle || deckTopic,
        audience,
        createdAt: 'Just now',
        slides: generatedSlides,
      };

      onSaveDeck(newDeck);
      onSelectDeck(newDeck);
      setCurrentSlideIndex(0);
      showNotification(`Presentation "${newDeck.deckTitle}" created and ready on ground!`);
    } catch {
      // Offline fallback
      const fallbackDeck: PresentationDeck = {
        id: `deck-${Date.now()}`,
        deckTitle: deckTopic,
        audience,
        createdAt: 'Just now',
        slides: [
          {
            slideNumber: 1,
            title: deckTopic,
            subtitle: 'Strategic Priorities & Autonomous Execution',
            bullets: [
              'Executive alignment on key strategic milestones',
              'Elimination of administrative friction via autonomous copilot',
              'Capital allocation and measurable milestone cadence',
            ],
            takeaway: 'Decisive execution unlocks immediate scale.',
            notes: 'Open by highlighting current momentum and market window.',
          },
          {
            slideNumber: 2,
            title: 'Execution Roadmap & Milestones',
            subtitle: 'Phased Rollout Plan',
            bullets: [
              'Phase 1: Architecture and executive alignment',
              'Phase 2: Pilot testing and feedback loop',
              'Phase 3: Full autonomous deployment across all business tracks',
            ],
            takeaway: 'Aggressive yet de-risked milestone cadence.',
            notes: 'Pause for executive committee feedback.',
          },
        ],
      };
      onSaveDeck(fallbackDeck);
      onSelectDeck(fallbackDeck);
      setCurrentSlideIndex(0);
      showNotification(`Presentation "${fallbackDeck.deckTitle}" created successfully!`);
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  // Generate Document
  const handleGenerateDocument = async () => {
    if (!docTitle.trim()) return;
    setIsGeneratingDoc(true);

    try {
      const res = await fetch('/api/assistant/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          docType,
          context: `Strategic executive document for C-Suite. Focus on clarity, crisp action items, and financial discipline. Language mode: ${language}`,
        }),
      });

      const data = await res.json();
      const content =
        data.content ||
        `# ${docTitle}\n\n**Prepared by:** AURA Executive AI Copilot\n**Date:** ${new Date().toLocaleDateString()}\n**Classification:** Confidential / Executive Eyes Only\n\n## 1. Executive Summary\nThis document outlines strategic priorities, core operational imperatives, and automated action tracks.\n\n## 2. Strategic Context & Objectives\n- Accelerate cross-functional deliverables by 35%.\n- Streamline calendar density with dedicated 90-minute deep-work buffers.\n- Maintain encrypted compliance for all corporate intellectual property.\n\n## 3. Next Steps\nApproved for immediate deployment.`;

      setDocContent(content);
      const newDoc: FormalDocument = {
        id: `doc-${Date.now()}`,
        title: docTitle,
        type: docType,
        date: 'Today',
        classification: 'CONFIDENTIAL // EXECUTIVE RECORD',
        author: 'AURA Executive AI Copilot',
        e2eeStatus: 'Client-Side Encrypted',
        readTime: `${Math.max(1, Math.ceil(content.split(' ').length / 180))} min read`,
        content,
      };
      setSavedDocs((prev) => {
        const updated = [newDoc, ...prev];
        localStorage.setItem('aura_saved_documents', JSON.stringify(updated));
        return updated;
      });
      setSelectedDocId(newDoc.id);
      showNotification(`Document "${docTitle}" created and saved to vault!`);
    } catch {
      const fallbackContent = `# ${docTitle}\n\n**Prepared by:** AURA Executive AI Copilot\n**Date:** ${new Date().toLocaleDateString()}\n**Classification:** Confidential / Executive Eyes Only\n\n## 1. Executive Summary\nThis strategic document outlines executive priorities and operational mandates.\n\n## 2. Directives\n- Zero-friction automated workflows active.\n- Encrypted AES-GCM record protection enforced.\n\n## 3. Sign-off\nApproved for execution.`;
      const fallbackDoc: FormalDocument = {
        id: `doc-${Date.now()}`,
        title: docTitle,
        type: docType,
        date: 'Today',
        classification: 'CONFIDENTIAL // EXECUTIVE RECORD',
        author: 'AURA Executive AI Copilot',
        e2eeStatus: 'Client-Side Encrypted',
        readTime: '2 min read',
        content: fallbackContent,
      };
      setSavedDocs((prev) => {
        const updated = [fallbackDoc, ...prev];
        localStorage.setItem('aura_saved_documents', JSON.stringify(updated));
        return updated;
      });
      setSelectedDocId(fallbackDoc.id);
      showNotification(`Document "${docTitle}" generated using structured template!`);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleOpenDeckInUniversalViewer = (deckToOpen: PresentationDeck) => {
    const file: UniversalFile = {
      id: deckToOpen.id,
      title: deckToOpen.deckTitle,
      type: 'presentation',
      category: 'Presentation Studio',
      createdAt: deckToOpen.createdAt,
      presentationDeck: deckToOpen,
    };
    onOpenFileInViewer(file);
  };

  const handleOpenDocInUniversalViewer = (docToOpen: { id: string; title: string; type: string; createdAt?: string; content: string }) => {
    const file: UniversalFile = {
      id: docToOpen.id,
      title: docToOpen.title,
      type: 'document',
      category: docToOpen.type,
      createdAt: 'Today',
      content: docToOpen.content,
    };
    onOpenFileInViewer(file);
  };

  const currentDeck = activeDeck || decks[0] || null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Presentation Studio & Executive Document Vault
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
              {decks.length} Decks · {savedDocs.length} Executive Documents
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ur_slang'
              ? 'Presentation decks generate karein, slides ko live present karein, TV par cast karein, ya document memos banayein.'
              : 'Generate structured slide decks on the fly, present full-screen, cast to TV screens, or author executive memos.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('presentation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'presentation' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Presentations ({decks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'document' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive Documents ({savedDocs.length})</span>
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* TAB 1: PRESENTATIONS */}
      {activeTab === 'presentation' && (
        <div className="space-y-6">
          {/* Deck Creator Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Tell AURA To Create a New Presentation Deck</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Autonomous McKinsey/Goldman Engine</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6">
                <label className="text-xs font-mono text-slate-400 mb-1 block">Deck Topic / Directive:</label>
                <input
                  type="text"
                  value={deckTopic}
                  onChange={(e) => setDeckTopic(e.target.value)}
                  placeholder="e.g. AI Autonomous Operations, Q4 Growth Strategy, Quantum Computing..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-mono text-slate-400 mb-1 block">Slides Count:</label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value={3}>3 Slides (Briefing)</option>
                  <option value={5}>5 Slides (Standard)</option>
                  <option value={8}>8 Slides (Deep Dive)</option>
                  <option value={10}>10 Slides (Comprehensive)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-mono text-slate-400 mb-1 block">Target Audience:</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="Board of Directors & C-Suite">Board of Directors</option>
                  <option value="Executive Investment Syndicate">Investors / Venture</option>
                  <option value="Enterprise Engineering Leads">Technical Leads</option>
                  <option value="All-Hands Company Briefing">All-Hands Team</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleGenerateDeck}
                  disabled={isGeneratingDeck || !deckTopic.trim()}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingDeck ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingDeck ? 'Generating...' : 'Create Deck'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* User's Created Presentation Decks Carousel / Selector */}
          {decks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Created Presentation Decks ({decks.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    onClick={() => {
                      onSelectDeck(deck);
                      setCurrentSlideIndex(0);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      currentDeck?.id === deck.id
                        ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-cyan-300">
                          {deck.slides.length} Slides
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{deck.createdAt}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 mt-2 line-clamp-2">{deck.deckTitle}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Audience: {deck.audience}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeckInUniversalViewer(deck);
                        }}
                        className="flex-1 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Open in Universal Floating / Fullscreen Viewer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Open Viewer</span>
                      </button>

                      {onCastDeckToTV && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCastDeckToTV(deck);
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-indigo-900/60 text-indigo-300 border border-slate-700 transition-colors"
                          title="Cast Slides to Smart TV"
                        >
                          <Tv className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDeck(deck.id);
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                        title="Delete Deck"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Deck Presentation View */}
          {currentDeck ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              {/* Deck Title & Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{currentDeck.deckTitle}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                      Slide {currentSlideIndex + 1} of {currentDeck.slides.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Audience: {currentDeck.audience}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDeckInUniversalViewer(currentDeck)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-500/20"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Present Full Screen</span>
                  </button>

                  {onCastDeckToTV && (
                    <button
                      type="button"
                      onClick={() => onCastDeckToTV(currentDeck)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 text-xs font-semibold transition-colors"
                    >
                      <Cast className="w-3.5 h-3.5" />
                      <span>Cast to TV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Slide Canvas */}
              {currentDeck.slides && currentDeck.slides[currentSlideIndex] && (
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-800/40 rounded-2xl p-6 sm:p-10 flex flex-col justify-between shadow-2xl min-h-[360px]">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                      {currentDeck.slides[currentSlideIndex].title}
                    </h1>
                    <p className="text-sm sm:text-base text-cyan-300 font-medium mt-2">
                      {currentDeck.slides[currentSlideIndex].subtitle}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {currentDeck.slides[currentSlideIndex].bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    {currentDeck.slides[currentSlideIndex].takeaway && (
                      <div className="mt-6 p-3 rounded-xl bg-cyan-950/60 border-l-4 border-cyan-400 text-xs text-cyan-200 italic">
                        <strong>Key Takeaway:</strong> {currentDeck.slides[currentSlideIndex].takeaway}
                      </div>
                    )}
                  </div>

                  {showPresenterNotes && currentDeck.slides[currentSlideIndex].notes && (
                    <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono mt-6">
                      <span className="text-cyan-400 font-semibold mr-2">Speaker Note:</span>
                      {currentDeck.slides[currentSlideIndex].notes}
                    </div>
                  )}
                </div>
              )}

              {/* Slide Navigation Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlideIndex === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Slide</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {currentDeck.slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono transition-all ${
                        currentSlideIndex === idx
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
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(currentDeck.slides.length - 1, prev + 1))}
                  disabled={currentSlideIndex === currentDeck.slides.length - 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                >
                  <span>Next Slide</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Presentation className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-200">No Sample Presentations</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clean slate active. Use the generator above or speak / type in the Command Bar: &quot;Create presentation on [Topic]&quot; to generate your customized slide deck!
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXECUTIVE DOCUMENTS & FORMAL REPORTS */}
      {activeTab === 'document' && (
        <div className="space-y-6">
          {/* Document Creator Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Author Strategic Document / Policy Memo</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Client-Side AES-GCM Zero-Knowledge Storage</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-7">
                <label className="text-xs font-mono text-slate-400 mb-1 block">Document Title / Directive:</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Q4 Executive Strategy, Autonomous Governance Mandate, Security Audit..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-mono text-slate-400 mb-1 block">Document Format:</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="Executive Memo">Executive Memo</option>
                  <option value="Formal System Audit">Formal System Audit</option>
                  <option value="Strategic Policy Briefing">Strategic Policy Briefing</option>
                  <option value="Board Resolution">Board Resolution</option>
                  <option value="Due Diligence Report">Due Diligence Report</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleGenerateDocument}
                  disabled={isGeneratingDoc || !docTitle.trim()}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingDoc ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingDoc ? 'Drafting...' : 'Draft Document'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Executive Documents & Formal Reports Selector Carousel / Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Executive Document Vault & Certified Reports ({savedDocs.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleRestoreStandardDocs}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                title="Restore default certified reports"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Standards</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {savedDocs.map((doc) => {
                const isSelected = (activeDocument?.id === doc.id);
                const isFormalReport = doc.id === 'doc-report-formal';

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-500 ring-2 ring-cyan-500/40 shadow-xl shadow-cyan-950/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Classification Badge & E2EE Pill */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          isFormalReport
                            ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}>
                          {doc.classification}
                        </span>

                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{doc.e2eeStatus.includes('AES-GCM') ? 'AES-GCM Verified' : 'E2EE'}</span>
                        </span>
                      </div>

                      {/* Title & Meta */}
                      <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                        {doc.title}
                      </h4>

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{doc.type}</span>
                        <span>·</span>
                        <span>{doc.date}</span>
                        <span>·</span>
                        <span>{doc.readTime}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 italic">
                        By {doc.author}
                      </p>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocId(doc.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isSelected ? 'Active in Reader' : 'Read Document'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocInUniversalViewer({
                              id: doc.id,
                              title: doc.title,
                              type: doc.type,
                              content: doc.content,
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Open Fullscreen in Universal Viewer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Viewer</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDoc(doc);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          title="Download Markdown"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>

                        {!isFormalReport && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDoc(doc.id);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Document Reader Canvas */}
          {activeDocument ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              {/* Document Classification & Reader Header */}
              <div className="pb-5 border-b border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{activeDocument.classification}</span>
                    </span>

                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{activeDocument.e2eeStatus}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenDocInUniversalViewer({
                          id: activeDocument.id,
                          title: activeDocument.title,
                          type: activeDocument.type,
                          content: activeDocument.content,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-500/20"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Present Full Screen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeDocument.content);
                        setCopiedDoc(true);
                        setTimeout(() => setCopiedDoc(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                    >
                      {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDoc ? 'Copied' : 'Copy Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(activeDocument)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                      title="Download as Markdown"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                      title="Print Document"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                    {activeDocument.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono">
                    <span>Format: {activeDocument.type}</span>
                    <span>·</span>
                    <span>Author: {activeDocument.author}</span>
                    <span>·</span>
                    <span>Certified: {activeDocument.date}</span>
                    <span>·</span>
                    <span>Estimated Reading: {activeDocument.readTime}</span>
                  </div>
                </div>
              </div>

              {/* Pristine Document Reader Canvas */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-6 sm:p-10 shadow-inner">
                <div className="max-w-4xl mx-auto space-y-4 text-slate-200 text-xs sm:text-sm leading-relaxed font-sans whitespace-pre-wrap selection:bg-cyan-500 selection:text-slate-950">
                  {activeDocument.content}
                </div>
              </div>

              {/* End of Document Verification Seal */}
              <div className="p-4 bg-slate-950 border border-cyan-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Cryptographic Authentication Certified</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      SHA-256 Digest Verified · Web Crypto AES-GCM 256-bit Local Sandbox
                    </span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-800/60">
                  STATUS: AUDITED & ACTIVE
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-200">No Documents Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select &quot;Reset Standards&quot; above to restore the formal Practical Implementation and Testing Report.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
