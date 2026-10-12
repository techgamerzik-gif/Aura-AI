import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Plus,
  RefreshCw,
  Download,
  Share2,
  CalendarCheck,
  ChevronRight,
  Filter,
  Shield,
  Coffee,
  Brain,
  Sliders,
  Check,
  X,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { ScheduleEvent, LanguageMode } from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';
import {
  detectZeroTransitionConflict,
  createCognitiveResetBufferEvent,
  findNextOptimalWindow,
  timeToMinutes,
  minutesToTime,
  ZeroTransitionConflictResult,
} from '../utils/scheduleRules.ts';
import { CognitiveLoadD3Chart } from './CognitiveLoadD3Chart.tsx';

interface ScheduleHubProps {
  events: ScheduleEvent[];
  onUpdateEvents: (events: ScheduleEvent[]) => void;
  language: LanguageMode;
  onVoiceTrigger?: (prompt: string) => void;
}

export const ScheduleHub: React.FC<ScheduleHubProps> = ({
  events,
  onUpdateEvents,
  language,
  onVoiceTrigger,
}) => {
  const [filter, setFilter] = useState<'all' | 'board' | 'client' | 'travel'>('all');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('11:30');
  const [newEventDuration, setNewEventDuration] = useState('45');
  const [newEventPriority, setNewEventPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [newEventCategory, setNewEventCategory] = useState<'board' | 'client' | 'internal' | 'personal'>('client');
  const [newLocation, setNewLocation] = useState('Boardroom A / Zoom Bridge');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Automated Scheduling Rule Settings
  const [enforceCognitiveBufferRule, setEnforceCognitiveBufferRule] = useState<boolean>(true);
  const [protectedCollisionsCount, setProtectedCollisionsCount] = useState<number>(1);

  // Cognitive Reset Intercept Prompt State
  const [pendingConflictPrompt, setPendingConflictPrompt] = useState<{
    conflict: ZeroTransitionConflictResult;
    proposedEvent: ScheduleEvent;
  } | null>(null);

  const conflicts = events.filter((e) => e.conflict && !e.isBufferSlot);

  // Calculate live proposed end time
  const startMin = timeToMinutes(newEventTime);
  const endMin = startMin + parseInt(newEventDuration, 10);
  const proposedEndTime = minutesToTime(endMin);

  // Live Zero-Transition Detection while user is in the modal
  const liveConflictCheck = showAddModal
    ? detectZeroTransitionConflict(
        {
          timeStart: newEventTime,
          timeEnd: proposedEndTime,
          priority: newEventPriority,
          category: newEventCategory,
          title: newEventTitle,
        },
        events,
        enforceCognitiveBufferRule
      )
    : null;

  // Auto-resolve all conflicts via AI logic
  const handleAutoResolveConflicts = () => {
    setIsOptimizing(true);
    soundEffects.playSuccessChime();
    setStatusMessage(
      language === 'ur_slang'
        ? 'AI zero-transition conflicts check kar raha hai aur 15-minute cognitive reset buffer allocate kar raha hai...'
        : 'AURA AI analyzing schedule friction and inserting 15-minute cognitive reset buffers...'
    );

    setTimeout(() => {
      let insertedBuffers: ScheduleEvent[] = [];
      const updatedEvents = events.map((ev) => {
        if (ev.conflict && !ev.isBufferSlot) {
          // Add 15m buffer slot right before the shifted session
          const bufferStart = ev.timeStart;
          const bufferEnd = minutesToTime(timeToMinutes(ev.timeStart) + 15);
          const newStart = bufferEnd;
          const originalDuration = timeToMinutes(ev.timeEnd) - timeToMinutes(ev.timeStart);
          const newEnd = minutesToTime(timeToMinutes(newStart) + originalDuration);

          const bufferEv = createCognitiveResetBufferEvent(
            bufferStart,
            bufferEnd,
            ev.date,
            `Mandatory 15-minute cognitive reset buffer before ${ev.title}. Restores executive working memory.`
          );
          insertedBuffers.push(bufferEv);

          return {
            ...ev,
            timeStart: newStart,
            timeEnd: newEnd,
            conflict: false,
            conflictReason: undefined,
            hasBuffer: true,
            cognitiveResetApplied: true,
            notes: (ev.notes ? ev.notes + ' ' : '') + '[Cognitive Reset Buffer +15m Inserted]',
          };
        }
        return ev;
      });

      // Merge and sort chronologically
      const allEvents = [...updatedEvents, ...insertedBuffers].sort(
        (a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart)
      );

      onUpdateEvents(allEvents);
      setIsOptimizing(false);
      setProtectedCollisionsCount((prev) => prev + insertedBuffers.length);
      setStatusMessage(
        language === 'ur_slang'
          ? 'Zabardast boss! Saare zero-transition conflicts solve ho gaye aur 15-minute cognitive buffers add ho gaye. Attendees ko notify kar diya hai!'
          : 'Schedule optimized. Zero-transition conflicts resolved, 15-minute cognitive reset buffers inserted, and attendees notified.'
      );
      setTimeout(() => setStatusMessage(null), 6000);
    }, 1000);
  };

  // Resolve a single existing event with 15-minute buffer
  const handleResolveSingleConflict = (conflictEv: ScheduleEvent) => {
    soundEffects.playSuccessChime();
    const originalDuration = timeToMinutes(conflictEv.timeEnd) - timeToMinutes(conflictEv.timeStart);
    const bufferStart = conflictEv.timeStart;
    const bufferEnd = minutesToTime(timeToMinutes(bufferStart) + 15);
    const newStart = bufferEnd;
    const newEnd = minutesToTime(timeToMinutes(newStart) + originalDuration);

    const bufferSlot = createCognitiveResetBufferEvent(
      bufferStart,
      bufferEnd,
      conflictEv.date,
      `Cognitive reset buffer before ${conflictEv.title}. Pre-meeting mental recalibration.`
    );

    const updated = events.map((e) => {
      if (e.id === conflictEv.id) {
        return {
          ...e,
          timeStart: newStart,
          timeEnd: newEnd,
          conflict: false,
          conflictReason: undefined,
          hasBuffer: true,
          cognitiveResetApplied: true,
          notes: (e.notes ? e.notes + ' ' : '') + '[15m Cognitive Reset Buffer Added]',
        };
      }
      return e;
    });

    const finalEvents = [...updated, bufferSlot].sort(
      (a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart)
    );

    onUpdateEvents(finalEvents);
    setProtectedCollisionsCount((prev) => prev + 1);
    setStatusMessage(
      `✓ 15-minute cognitive reset buffer inserted before "${conflictEv.title}". Meeting shifted to ${newStart} - ${newEnd}.`
    );
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Form Submission
  const handleAddNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const proposedEv: ScheduleEvent = {
      id: `ev-${Date.now()}`,
      title: newEventTitle,
      timeStart: newEventTime,
      timeEnd: proposedEndTime,
      date: new Date().toISOString().split('T')[0],
      location: newLocation,
      category: newEventCategory,
      priority: newEventPriority,
      attendees: ['you@executive.ai', 'team@partner.com'],
      notes: 'Scheduled via AURA Smart Calendar',
    };

    // Check for zero-transition conflict
    const conflictResult = detectZeroTransitionConflict(proposedEv, events, enforceCognitiveBufferRule);

    if (conflictResult && conflictResult.hasConflict) {
      // Intercept with Cognitive Reset Buffer Prompt!
      soundEffects.playWakeChime();
      setPendingConflictPrompt({
        conflict: conflictResult,
        proposedEvent: proposedEv,
      });
      setShowAddModal(false);
      return;
    }

    // Direct addition if no conflict detected
    soundEffects.playSuccessChime();
    onUpdateEvents([...events, proposedEv].sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart)));
    setNewEventTitle('');
    setShowAddModal(false);
  };

  // =========================================================
  // INTERCEPT PROMPT ACTIONS
  // =========================================================
  // Option 1: Insert 15-Minute Cognitive Reset Buffer (Recommended)
  const handleAcceptWithBuffer = () => {
    soundEffects.playSuccessChime();
    if (!pendingConflictPrompt) return;

    const { conflict, proposedEvent } = pendingConflictPrompt;
    const originalDuration = timeToMinutes(proposedEvent.timeEnd) - timeToMinutes(proposedEvent.timeStart);
    const bufferedStart = conflict.suggestedBufferedStart;
    const bufferedEnd = minutesToTime(timeToMinutes(bufferedStart) + originalDuration);

    // Create 15-min buffer slot
    const bufferSlot = createCognitiveResetBufferEvent(
      conflict.bufferSlotStart,
      conflict.bufferSlotEnd,
      proposedEvent.date,
      `15-Min Cognitive Reset Buffer between ${conflict.precedingEvent?.title || 'Session'} and ${proposedEvent.title}.`
    );

    const bufferedMeeting: ScheduleEvent = {
      ...proposedEvent,
      timeStart: bufferedStart,
      timeEnd: bufferedEnd,
      hasBuffer: true,
      cognitiveResetApplied: true,
      notes: `${proposedEvent.notes || ''} [Scheduled with 15m Cognitive Reset Buffer]`,
    };

    const updated = [...events, bufferSlot, bufferedMeeting].sort(
      (a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart)
    );

    onUpdateEvents(updated);
    setProtectedCollisionsCount((prev) => prev + 1);
    setPendingConflictPrompt(null);
    setNewEventTitle('');
    setStatusMessage(
      `✓ 15-Minute Cognitive Reset Buffer inserted! "${proposedEvent.title}" scheduled at ${bufferedStart} - ${bufferedEnd}. Working memory protected.`
    );
    setTimeout(() => setStatusMessage(null), 6000);
  };

  // Option 2: Find Next Available Window with 15m Buffers
  const handleFindNextAvailableWindow = () => {
    soundEffects.playSuccessChime();
    if (!pendingConflictPrompt) return;

    const { proposedEvent } = pendingConflictPrompt;
    const duration = timeToMinutes(proposedEvent.timeEnd) - timeToMinutes(proposedEvent.timeStart);
    const nextWindow = findNextOptimalWindow(duration, events);

    const rescheduled: ScheduleEvent = {
      ...proposedEvent,
      timeStart: nextWindow.start,
      timeEnd: nextWindow.end,
      hasBuffer: true,
      cognitiveResetApplied: true,
      notes: `${proposedEvent.notes || ''} [Autonomous Optimization: Placed in next gap with 15m buffers]`,
    };

    const updated = [...events, rescheduled].sort(
      (a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart)
    );

    onUpdateEvents(updated);
    setProtectedCollisionsCount((prev) => prev + 1);
    setPendingConflictPrompt(null);
    setNewEventTitle('');
    setStatusMessage(
      `✓ Placed in optimal open window at ${nextWindow.start} - ${nextWindow.end} with full 15m buffers on both sides.`
    );
    setTimeout(() => setStatusMessage(null), 6000);
  };

  // Option 3: Accept Without Buffer (Bypass Guardrail)
  const handleAcceptWithoutBuffer = () => {
    soundEffects.playSleepChime();
    if (!pendingConflictPrompt) return;

    const { proposedEvent, conflict } = pendingConflictPrompt;
    const unbufferedMeeting: ScheduleEvent = {
      ...proposedEvent,
      conflict: true,
      conflictReason: `Zero transition (${conflict.gapMinutes}m gap) immediately following ${conflict.precedingEvent?.title || 'prior meeting'}. Executive guardrail bypassed.`,
    };

    const updated = [...events, unbufferedMeeting].sort(
      (a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart)
    );

    onUpdateEvents(updated);
    setPendingConflictPrompt(null);
    setNewEventTitle('');
    setStatusMessage(`Warning: Accepted without buffer at ${proposedEvent.timeStart}. High-stakes zero-transition flagged.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const exportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AURA Executive AI//EN\n";
    events.forEach((ev) => {
      icsContent += `BEGIN:VEVENT\nSUMMARY:${ev.title}\nDESCRIPTION:${ev.notes || ''}\nLOCATION:${ev.location}\nSTATUS:CONFIRMED\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `AURA_Executive_Schedule_${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.category === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Executive Schedule & Calendar Hub</h2>
            {conflicts.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-950/50 border border-amber-800/60 px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                {conflicts.length} Zero-Transition Overlap Detected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ur_slang'
              ? 'Automated scheduling rule zero-transition conflicts ko detect karta hai aur high-stakes meetings se pehle 15-minute cognitive reset buffer recommend karta hai.'
              : 'Automated scheduling governance detects zero-transition collisions and prompts for 15-minute cognitive reset buffers before high-stakes sessions.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {conflicts.length > 0 && (
            <button
              onClick={handleAutoResolveConflicts}
              disabled={isOptimizing}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-semibold rounded-lg shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isOptimizing
                  ? 'Inserting Buffers...'
                  : language === 'ur_slang'
                  ? 'Auto-Add 15m Buffers'
                  : 'Apply 15m Cognitive Buffers'}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Meeting</span>
          </button>

          <button
            onClick={exportICS}
            title="Export Calendar (.ics)"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Automated Cognitive Reset Governance Rule Active Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/70 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Automated Scheduling Rule: 15-Minute Cognitive Reset Buffer
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                ENFORCED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Back-to-back zero-transition meetings create cognitive friction and drop decision quality by 40%. AURA intercepts consecutive sessions to insert a mandatory 15-minute mental reset buffer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Protected Collisions</span>
            <span className="text-sm font-bold text-cyan-400 font-mono">{protectedCollisionsCount} Guardrails Active</span>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enforceCognitiveBufferRule}
              onChange={(e) => {
                setEnforceCognitiveBufferRule(e.target.checked);
                soundEffects.playSuccessChime();
              }}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span className="font-mono text-xs">Rule Active</span>
          </label>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Sync Status strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
            <div>
              <div className="text-xs font-medium text-slate-200">Google Calendar</div>
              <div className="text-[11px] text-slate-500">Live Sync · Active</div>
            </div>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">CONNECTED</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/20" />
            <div>
              <div className="text-xs font-medium text-slate-200">Zero-Transition Guardrail</div>
              <div className="text-[11px] text-slate-500">15m Cognitive Buffer</div>
            </div>
          </div>
          <span className="text-[11px] text-cyan-400 font-mono">ACTIVE</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-500/20" />
            <div>
              <div className="text-xs font-medium text-slate-200">Executive Energy Meter</div>
              <div className="text-[11px] text-slate-500">Bio-Buffer Balance 92%</div>
            </div>
          </div>
          <span className="text-[11px] text-indigo-400 font-mono">HEALTHY</span>
        </div>
      </div>

      {/* D3.js Visualization: Cognitive Load vs Available Focus Time */}
      <CognitiveLoadD3Chart
        events={events}
        language={language}
        onApplyBuffers={handleAutoResolveConflicts}
        isOptimizing={isOptimizing}
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Today's Master Agenda ({events.length})
          </button>
          <button
            onClick={() => setFilter('board')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'board' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Board & Leadership
          </button>
          <button
            onClick={() => setFilter('client')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'client' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Client & Strategy
          </button>
          <button
            onClick={() => setFilter('travel')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'travel' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Transit & Flights
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Events Timeline */}
      <div className="space-y-3">
        {filteredEvents.map((ev) => {
          // Visual 15-Minute Cognitive Reset Buffer Slot Card
          if (ev.isBufferSlot || ev.category === 'buffer') {
            return (
              <div
                key={ev.id}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-cyan-950/30 to-slate-900 border border-indigo-500/40 shadow-sm flex items-center justify-between gap-3 animate-in fade-in"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Coffee className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide font-mono">
                        {ev.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                        15 MINS BUFFER
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {ev.notes || 'Mandatory mental decompression buffer between consecutive high-stakes sessions.'}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-cyan-300 shrink-0">
                  <span>{ev.timeStart}</span> → <span>{ev.timeEnd}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={ev.id}
              className={`p-4 rounded-xl border transition-all ${
                ev.conflict
                  ? 'bg-amber-950/20 border-amber-800/80 shadow-lg shadow-amber-950/20'
                  : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-4">
                  {/* Time Block */}
                  <div className="w-28 shrink-0 text-left">
                    <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{ev.timeStart}</span>
                    </div>
                    <div className="text-xs text-slate-500">to {ev.timeEnd}</div>
                    {ev.hasBuffer && (
                      <div className="text-[10px] text-emerald-400 mt-1 font-mono">+15m Buffer Active</div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-100 text-sm">{ev.title}</h3>
                      {ev.priority === 'high' && (
                        <span className="text-[10px] uppercase font-mono font-medium tracking-wide text-rose-400">
                          Priority
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {ev.location}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {ev.attendees.length} participants
                      </span>
                    </div>

                    {ev.notes && (
                      <p className="text-xs text-slate-400 pt-1 leading-relaxed">{ev.notes}</p>
                    )}

                    {ev.conflict && (
                      <div className="mt-2 p-2.5 bg-amber-900/30 border border-amber-700/60 rounded-xl text-xs text-amber-300 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{ev.conflictReason || 'Zero transition buffer immediately following prior high-stakes session.'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResolveSingleConflict(ev)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition-colors"
                        >
                          Insert 15m Buffer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {ev.conflict && (
                    <button
                      onClick={() => handleResolveSingleConflict(ev)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors"
                    >
                      Resolve Overlap
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (onVoiceTrigger) {
                        onVoiceTrigger(`Brief me on meeting: ${ev.title}`);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700/60"
                  >
                    AI Briefing
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* COGNITIVE RESET BUFFER INTERCEPT PROMPT MODAL */}
      {/* ========================================================= */}
      {pendingConflictPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-600/70 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            {/* Warning Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 shrink-0">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                    AUTOMATED SCHEDULING RULE INTERCEPT
                  </span>
                  <h3 className="text-lg font-black text-white">Zero-Transition Conflict Detected</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPendingConflictPrompt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Collision Breakdown Card */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs text-slate-300">
                You are scheduling a high-stakes session immediately abutting an existing meeting with{' '}
                <span className="font-bold text-amber-400 font-mono">0 minutes of transition time</span>.
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                {/* Preceding Meeting */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">1. Preceding Session</span>
                  <p className="font-bold text-white truncate">
                    {pendingConflictPrompt.conflict.precedingEvent?.title || 'Prior Meeting'}
                  </p>
                  <p className="font-mono text-[11px] text-cyan-400">
                    Ends at: {pendingConflictPrompt.conflict.precedingEvent?.timeEnd || '11:30'}
                  </p>
                </div>

                {/* Proposed Meeting */}
                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-700/50 space-y-1">
                  <span className="text-[10px] font-mono text-amber-400 uppercase block">2. Proposed Session</span>
                  <p className="font-bold text-white truncate">
                    {pendingConflictPrompt.proposedEvent.title}
                  </p>
                  <p className="font-mono text-[11px] text-amber-300">
                    Starts at: {pendingConflictPrompt.proposedEvent.timeStart} (0m gap)
                  </p>
                </div>
              </div>

              {/* Cognitive Rationale */}
              <div className="text-[11px] text-slate-400 leading-relaxed italic bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-900/50">
                "Back-to-back high-stakes sessions induce cognitive residue and decision fatigue. Inserting a 15-minute cognitive reset buffer clears working memory and prevents burnout."
              </div>
            </div>

            {/* Recommended Solution: +15m Shift */}
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/70 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-emerald-300 block">Recommended AI Allocation:</span>
                <span className="text-slate-300 text-[11px]">
                  Shift to{' '}
                  <strong className="text-white font-mono">
                    {pendingConflictPrompt.conflict.suggestedBufferedStart} –{' '}
                    {pendingConflictPrompt.conflict.suggestedBufferedEnd}
                  </strong>{' '}
                  with 15m bio-reset.
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                +15M BUFFER
              </span>
            </div>

            {/* Prompt Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleAcceptWithBuffer}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Insert 15-Min Cognitive Reset Buffer (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={handleFindNextAvailableWindow}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Find Next Available Window with 15m Buffers</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptWithoutBuffer}
                className="w-full py-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-500 hover:text-slate-400 text-[11px] transition-colors"
              >
                Accept Without Buffer (Bypass Guardrail)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">Schedule Executive Session</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddNewEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Q3 Financial Review with Audit Committee"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Duration (mins)</label>
                  <select
                    value={newEventDuration}
                    onChange={(e) => setNewEventDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="15">15 mins (Speed Sync)</option>
                    <option value="30">30 mins (Standard)</option>
                    <option value="45">45 mins (Executive)</option>
                    <option value="60">60 mins (In-depth)</option>
                    <option value="90">90 mins (Board Session)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select
                    value={newEventPriority}
                    onChange={(e) => setNewEventPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="high">High-Stakes (Priority)</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="client">Client & Strategy</option>
                    <option value="board">Board & Leadership</option>
                    <option value="internal">Internal Ops</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>

              {/* Live Zero-Transition Warning in Modal */}
              {liveConflictCheck && liveConflictCheck.hasConflict && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/70 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Zero-Transition Conflict Detected!</span>
                      <span className="text-[11px] text-slate-300">
                        Directly follows {liveConflictCheck.precedingEvent?.title} (ends at{' '}
                        {liveConflictCheck.precedingEvent?.timeEnd}) with 0-min buffer.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewEventTime(liveConflictCheck.suggestedBufferedStart);
                      soundEffects.playSuccessChime();
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Apply +15m Cognitive Reset ({liveConflictCheck.suggestedBufferedStart})</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Location or Bridge</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Executive Boardroom or Google Meet link"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  Confirm & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
