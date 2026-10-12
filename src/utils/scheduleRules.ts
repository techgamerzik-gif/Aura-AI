import { ScheduleEvent } from '../types/assistant.ts';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface ZeroTransitionConflictResult {
  hasConflict: boolean;
  precedingEvent?: ScheduleEvent;
  succeedingEvent?: ScheduleEvent;
  gapMinutes: number;
  isHighStakes: boolean;
  suggestedBufferedStart: string;
  suggestedBufferedEnd: string;
  bufferSlotStart: string;
  bufferSlotEnd: string;
  rationale: string;
}

/**
 * Checks if an event is considered a high-stakes or cognitively demanding session
 */
export function isHighStakesEvent(event: {
  priority?: string;
  category?: string;
  title?: string;
}): boolean {
  if (event.priority === 'high' || event.priority === 'critical') return true;
  if (event.category === 'board' || event.category === 'client') return true;
  if (/board|c-suite|investor|syndicate|contract|partnership|audit|review|merger|acquisition|quarterly|executive/i.test(event.title || '')) {
    return true;
  }
  return false;
}

/**
 * Detects zero-transition conflicts (gap < 15 minutes between consecutive meetings)
 */
export function detectZeroTransitionConflict(
  proposed: {
    timeStart: string;
    timeEnd: string;
    priority?: string;
    category?: string;
    title?: string;
    id?: string;
  },
  existingEvents: ScheduleEvent[],
  enforceRule = true
): ZeroTransitionConflictResult | null {
  if (!enforceRule) return null;

  const propStartM = timeToMinutes(proposed.timeStart);
  const propEndM = timeToMinutes(proposed.timeEnd);
  const proposedDuration = propEndM - propStartM;

  // Filter out any virtual buffer slots and the event itself
  const realEvents = existingEvents.filter(
    (ev) => !ev.isBufferSlot && ev.category !== 'buffer' && ev.id !== proposed.id
  );

  // 1. Check for Preceding Meeting: Does an existing meeting end within < 15 mins of proposed start?
  for (const prev of realEvents) {
    const prevEndM = timeToMinutes(prev.timeEnd);
    const prevStartM = timeToMinutes(prev.timeStart);

    // If proposed starts exactly when prev ends (0 min gap) or overlaps (prevEndM > propStartM) or gap < 15
    if (propStartM >= prevStartM && propStartM < prevEndM + 15) {
      const gap = Math.max(0, propStartM - prevEndM);
      const isHighStakes = isHighStakesEvent(proposed) || isHighStakesEvent(prev);

      // We flag if gap is 0 or less than 15 minutes
      if (gap < 15) {
        const bufferedStartM = prevEndM + 15;
        const bufferedEndM = bufferedStartM + proposedDuration;

        return {
          hasConflict: true,
          precedingEvent: prev,
          gapMinutes: gap,
          isHighStakes,
          bufferSlotStart: prev.timeEnd,
          bufferSlotEnd: minutesToTime(bufferedStartM),
          suggestedBufferedStart: minutesToTime(bufferedStartM),
          suggestedBufferedEnd: minutesToTime(bufferedEndM),
          rationale: `Zero transition (${gap}m gap) immediately following ${prev.title} (${prev.timeStart} - ${prev.timeEnd}). Cognitive load science mandates a 15-minute buffer before high-stakes decisions.`,
        };
      }
    }
  }

  // 2. Check for Succeeding Meeting: Does proposed meeting end within < 15 mins of a subsequent meeting?
  for (const next of realEvents) {
    const nextStartM = timeToMinutes(next.timeStart);
    if (propEndM <= nextStartM && nextStartM < propEndM + 15) {
      const gap = nextStartM - propEndM;
      const isHighStakes = isHighStakesEvent(proposed) || isHighStakesEvent(next);

      if (gap < 15) {
        return {
          hasConflict: true,
          succeedingEvent: next,
          gapMinutes: gap,
          isHighStakes,
          bufferSlotStart: proposed.timeEnd,
          bufferSlotEnd: next.timeStart,
          suggestedBufferedStart: proposed.timeStart,
          suggestedBufferedEnd: minutesToTime(propStartM + Math.max(15, proposedDuration - (15 - gap))),
          rationale: `Zero transition (${gap}m gap) directly preceding ${next.title} (${next.timeStart} - ${next.timeEnd}). Minimum 15-minute transition buffer recommended.`,
        };
      }
    }
  }

  return null;
}

/**
 * Creates a visual 15-minute cognitive reset buffer slot
 */
export function createCognitiveResetBufferEvent(
  timeStart: string,
  timeEnd: string,
  date = '2026-09-24',
  reason = 'Mandatory cognitive decompression & bio-break buffer'
): ScheduleEvent {
  return {
    id: `buffer-slot-${Date.now()}`,
    title: '15-Min Cognitive Reset & Bio-Buffer',
    timeStart,
    timeEnd,
    date,
    location: 'Executive Wellness Zone / Private Decompression',
    category: 'buffer',
    priority: 'low',
    attendees: ['you@executive.ai'],
    isBufferSlot: true,
    hasBuffer: true,
    notes: reason,
  };
}

/**
 * Finds next available open window in calendar with 15m buffers on both sides
 */
export function findNextOptimalWindow(
  durationMinutes: number,
  existingEvents: ScheduleEvent[],
  dayStartMinutes = 540, // 09:00 AM
  dayEndMinutes = 1080  // 18:00 PM
): { start: string; end: string; bufferBefore: string } {
  // Sort events chronologically
  const sorted = [...existingEvents]
    .filter((e) => !e.isBufferSlot)
    .sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart));

  let cursor = dayStartMinutes;

  for (const ev of sorted) {
    const evStart = timeToMinutes(ev.timeStart);
    const evEnd = timeToMinutes(ev.timeEnd);

    // Check if slot between cursor and evStart fits: 15m buffer + duration + 15m buffer
    if (evStart - cursor >= durationMinutes + 30) {
      const startM = cursor + 15;
      const endM = startM + durationMinutes;
      return {
        start: minutesToTime(startM),
        end: minutesToTime(endM),
        bufferBefore: minutesToTime(cursor),
      };
    }
    cursor = Math.max(cursor, evEnd + 15);
  }

  // After last event
  const lastStartM = cursor;
  const lastEndM = lastStartM + durationMinutes;
  return {
    start: minutesToTime(lastStartM),
    end: minutesToTime(lastEndM),
    bufferBefore: minutesToTime(lastStartM - 15),
  };
}
