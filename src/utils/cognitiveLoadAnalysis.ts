import { ScheduleEvent } from '../types/assistant.ts';
import { timeToMinutes, minutesToTime, isHighStakesEvent } from './scheduleRules.ts';

export interface TimeSlotCognitiveData {
  timeMinutes: number;
  timeLabel: string;
  cognitiveLoad: number; // 0 to 100
  cognitiveLoadUnbuffered: number; // 0 to 100 (simulated if no 15m buffer was inserted)
  availableFocusMinutes: number; // 0 to 30 min per 30m slot
  predictedBurnoutRisk: number; // 0 to 100, dynamic risk score based on sequential density & buffer violations
  sequentialMeetingStreak: number; // Consecutive meetings without a 15m buffer
  activeEventTitle?: string;
  activeEventType?: 'meeting' | 'high_stakes' | 'buffer' | 'deep_work' | 'free';
  isBufferSlot?: boolean;
  hasZeroTransitionConflict?: boolean;
  isBufferViolated?: boolean;
  ruleImpactNotes?: string;
}

export interface DayBurnoutSummary {
  date: string;
  dayLabel: string; // e.g. "Mon Sep 22" or "Today (Sep 24)"
  shortDay: string; // e.g. "Thu 24"
  eventsCount: number;
  meetingMinutes: number;
  meetingDensityScore: number; // 0 to 100
  predictedBurnoutRisk: number; // 0 to 100
  burnoutRiskLevel: 'Optimal' | 'Moderate' | 'High Risk' | 'Critical Overload';
  bufferViolationsCount: number;
  hasBufferViolation: boolean;
  bufferedSlotsCount: number;
  longestSequentialStreak: number; // Max consecutive meetings without >=15m buffer
  peakCognitiveLoad: number;
  avgCognitiveLoad: number;
  availableFocusMinutes: number;
  violationDetails: string[];
}

export interface CognitiveAnalysisSummary {
  peakCognitiveLoad: number;
  peakCognitiveLoadUnbuffered: number;
  avgCognitiveLoad: number;
  totalFocusMinutes: number;
  bufferedSlotsCount: number;
  zeroTransitionConflictsCount: number;
  predictedBurnoutRisk: number; // Overall predicted burnout risk (0-100)
  burnoutRiskLevel: 'Optimal' | 'Moderate' | 'High Risk' | 'Critical Overload';
  fatigueRiskLevel: 'Optimal' | 'Elevated' | 'Critical Overload';
  bufferSavingsPct: number;
  dataPoints: TimeSlotCognitiveData[];
  daysSummary: DayBurnoutSummary[];
  violatedDaysCount: number;
}

/**
 * Evaluates whether consecutive events violate the 15-minute cognitive reset buffer rule.
 */
export function checkSequentialBufferViolation(
  ev1: ScheduleEvent,
  ev2: ScheduleEvent
): { isViolation: boolean; gapMinutes: number; reason?: string } {
  const ev1End = timeToMinutes(ev1.timeEnd);
  const ev2Start = timeToMinutes(ev2.timeStart);
  const gap = ev2Start - ev1End;

  // If ev1 or ev2 is a buffer slot itself, it does not violate the rule
  if (ev1.isBufferSlot || ev1.category === 'buffer' || ev2.isBufferSlot || ev2.category === 'buffer') {
    return { isViolation: false, gapMinutes: gap };
  }

  // If there's an explicit conflict flag, or the gap is strictly less than 15 minutes between meetings
  if (gap < 15) {
    const isHigh = isHighStakesEvent(ev1) || isHighStakesEvent(ev2);
    return {
      isViolation: true,
      gapMinutes: Math.max(0, gap),
      reason: isHigh
        ? `Zero-transition gap of ${gap}m between high-stakes sessions (${ev1.title} → ${ev2.title}). 15m cognitive buffer missing!`
        : `Meeting gap of ${gap}m violates the mandatory 15-minute cognitive reset rule.`,
    };
  }

  return { isViolation: false, gapMinutes: gap };
}

/**
 * Analyzes multi-day burnout risk, sequential meeting density, and buffer rule violations.
 */
export function analyzeMultiDayBurnout(events: ScheduleEvent[]): DayBurnoutSummary[] {
  // Discover distinct dates or fallback to standard workweek around the events' dates
  const eventDates = Array.from(new Set(events.map((e) => e.date).filter(Boolean))) as string[];
  
  // Base anchor date
  const anchorDateStr = eventDates.length > 0 ? eventDates[0] : '2026-09-24';
  const anchorDate = new Date(anchorDateStr);

  // Generate 5-day executive week (Monday to Friday around anchor date)
  const weekDates: string[] = [];
  const dayOfWeek = anchorDate.getDay(); // 0 is Sunday, 4 is Thursday (for Sep 24, 2026)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  for (let i = 0; i < 5; i++) {
    const d = new Date(anchorDate);
    d.setDate(anchorDate.getDate() + mondayOffset + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  // Ensure any explicit date from events is included
  eventDates.forEach((d) => {
    if (!weekDates.includes(d)) weekDates.push(d);
  });
  weekDates.sort();

  return weekDates.map((dateStr) => {
    const dayEvents = events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart));

    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isToday = dateStr === '2026-09-24';
    const dayLabel = isToday ? `Today (${monthDay})` : `${dayName} ${monthDay}`;
    const shortDay = `${dayName} ${dateObj.getDate()}`;

    let meetingMinutes = 0;
    let bufferViolationsCount = 0;
    let bufferedSlotsCount = 0;
    const violationDetails: string[] = [];
    let currentStreak = 0;
    let longestSequentialStreak = 0;

    // Check meetings and gaps
    const meetings = dayEvents.filter((e) => !e.isBufferSlot && e.category !== 'buffer');

    meetings.forEach((m) => {
      const duration = Math.max(0, timeToMinutes(m.timeEnd) - timeToMinutes(m.timeStart));
      meetingMinutes += duration;
      if (m.conflict) {
        bufferViolationsCount++;
        violationDetails.push(m.conflictReason || `Zero-transition conflict on "${m.title}"`);
      }
    });

    dayEvents.forEach((e) => {
      if (e.isBufferSlot || e.category === 'buffer' || e.hasBuffer || e.cognitiveResetApplied) {
        bufferedSlotsCount++;
      }
    });

    // Detect sequential meetings without >= 15 min gap
    for (let i = 0; i < meetings.length; i++) {
      currentStreak++;
      if (currentStreak > longestSequentialStreak) {
        longestSequentialStreak = currentStreak;
      }

      if (i < meetings.length - 1) {
        const check = checkSequentialBufferViolation(meetings[i], meetings[i + 1]);
        if (check.isViolation) {
          if (!meetings[i + 1].conflict) {
            bufferViolationsCount++;
            if (check.reason) violationDetails.push(check.reason);
          }
        } else {
          // A valid buffer or gap resets streak
          currentStreak = 0;
        }
      }
    }

    // Meeting Density Score (0 to 100 based on standard 8-hour executive day = 480 mins)
    // 5+ hours of meetings = high density
    const meetingDensityScore = Math.min(100, Math.round((meetingMinutes / 360) * 100));

    // Predicted Burnout Risk calculation:
    // Base load from meeting density (0 to 45 pts)
    // Sequential streak compounding (+15 pts per consecutive meeting beyond 1)
    // Buffer violations penalty (+25 pts per violated 15m rule)
    // Mitigation: 15-minute buffers actively inserted (-18 pts per active buffer)
    let calculatedBurnoutRisk =
      meetingDensityScore * 0.45 +
      Math.max(0, longestSequentialStreak - 1) * 15 +
      bufferViolationsCount * 26 -
      bufferedSlotsCount * 18;

    // Clamp between 12% baseline and 98% critical
    if (dayEvents.length === 0) calculatedBurnoutRisk = 12;
    const predictedBurnoutRisk = Math.min(98, Math.max(12, Math.round(calculatedBurnoutRisk)));

    let burnoutRiskLevel: 'Optimal' | 'Moderate' | 'High Risk' | 'Critical Overload' = 'Optimal';
    if (predictedBurnoutRisk >= 75 || bufferViolationsCount > 0) {
      burnoutRiskLevel = predictedBurnoutRisk >= 85 || bufferViolationsCount >= 2 ? 'Critical Overload' : 'High Risk';
    } else if (predictedBurnoutRisk >= 50) {
      burnoutRiskLevel = 'Moderate';
    }

    // Single-day cognitive summary for this day
    const singleDayAnalysis = analyzeCognitiveLoadAndFocus(dayEvents);

    return {
      date: dateStr,
      dayLabel,
      shortDay,
      eventsCount: dayEvents.length,
      meetingMinutes,
      meetingDensityScore,
      predictedBurnoutRisk,
      burnoutRiskLevel,
      bufferViolationsCount,
      hasBufferViolation: bufferViolationsCount > 0,
      bufferedSlotsCount,
      longestSequentialStreak,
      peakCognitiveLoad: singleDayAnalysis.peakCognitiveLoad,
      avgCognitiveLoad: singleDayAnalysis.avgCognitiveLoad,
      availableFocusMinutes: singleDayAnalysis.totalFocusMinutes,
      violationDetails: Array.from(new Set(violationDetails)),
    };
  });
}

/**
 * Calculates hourly and sub-hourly cognitive load vs available focus time
 * based on calendar events and the 15-minute cognitive reset buffer rules,
 * incorporating sequential meeting density and predicted burnout risk.
 */
export function analyzeCognitiveLoadAndFocus(
  events: ScheduleEvent[],
  dayStartMinutes = 480, // 08:00
  dayEndMinutes = 1200,  // 20:00
  intervalMinutes = 30   // 30m sampling
): CognitiveAnalysisSummary {
  const dataPoints: TimeSlotCognitiveData[] = [];

  // Sort events chronologically
  const sortedEvents = [...events].sort(
    (a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart)
  );

  let totalFocusMinutes = 0;
  let bufferedSlotsCount = 0;
  let zeroTransitionConflictsCount = 0;
  let activeSequentialStreak = 0;

  for (let m = dayStartMinutes; m <= dayEndMinutes; m += intervalMinutes) {
    const slotStart = m;
    const slotEnd = m + intervalMinutes;
    const timeLabel = minutesToTime(m);

    // Find any event active in this time slice
    const activeEvent = sortedEvents.find((ev) => {
      const evStart = timeToMinutes(ev.timeStart);
      const evEnd = timeToMinutes(ev.timeEnd);
      return Math.max(slotStart, evStart) < Math.min(slotEnd, evEnd);
    });

    let cognitiveLoad = 18; // Resting baseline
    let cognitiveLoadUnbuffered = 18;
    let availableFocusMinutes = intervalMinutes; // default full slot
    let activeEventTitle: string | undefined = undefined;
    let activeEventType: 'meeting' | 'high_stakes' | 'buffer' | 'deep_work' | 'free' = 'free';
    let isBuffer = false;
    let hasConflict = false;
    let isBufferViolated = false;
    let ruleImpactNotes = 'Free operational bandwidth. Full cognitive capacity available.';

    if (activeEvent) {
      activeEventTitle = activeEvent.title;

      if (activeEvent.isBufferSlot || activeEvent.category === 'buffer') {
        // 15-Minute Cognitive Reset Buffer
        isBuffer = true;
        bufferedSlotsCount++;
        activeSequentialStreak = 0; // Buffer successfully breaks the sequential meeting density streak
        activeEventType = 'buffer';
        cognitiveLoad = 22; // Rapid decompression
        cognitiveLoadUnbuffered = 85; // Without buffer, user would carry continuous fatigue
        availableFocusMinutes = intervalMinutes * 0.5; // Restorative decompression time
        ruleImpactNotes = '15-min cognitive reset buffer active. Executive working memory recovering.';
      } else if (activeEvent.category === 'internal' && /deep work|strategy/i.test(activeEvent.title)) {
        // Asynchronous Deep Work
        activeEventType = 'deep_work';
        activeSequentialStreak = 0;
        cognitiveLoad = 38; // Focused flow state, moderate sustainable load
        cognitiveLoadUnbuffered = 42;
        availableFocusMinutes = intervalMinutes;
        ruleImpactNotes = 'Deep focus block protected from external meeting interruptions.';
      } else {
        // Standard or High-Stakes Meeting
        const isHighStakes = isHighStakesEvent(activeEvent);
        activeEventType = isHighStakes ? 'high_stakes' : 'meeting';
        activeSequentialStreak++;

        // Check if this meeting starts with 0 transition or overlap
        const prevEvent = sortedEvents.find(
          (prev) =>
            prev.id !== activeEvent.id &&
            !prev.isBufferSlot &&
            prev.category !== 'buffer' &&
            timeToMinutes(prev.timeEnd) === timeToMinutes(activeEvent.timeStart)
        );

        if (activeEvent.conflict || prevEvent) {
          hasConflict = true;
          isBufferViolated = true;
          zeroTransitionConflictsCount++;
        }

        const baseMeetingLoad = isHighStakes ? 75 : 52;

        if (hasConflict) {
          // Zero transition compounding penalty
          cognitiveLoad = Math.min(96, baseMeetingLoad + 25);
          cognitiveLoadUnbuffered = cognitiveLoad;
          ruleImpactNotes = 'Zero-transition conflict! Consecutive sessions compound burnout risk without 15m reset buffer.';
        } else if (activeEvent.hasBuffer || activeEvent.cognitiveResetApplied) {
          // Protected by 15m cognitive buffer
          cognitiveLoad = Math.max(45, baseMeetingLoad - 15);
          cognitiveLoadUnbuffered = baseMeetingLoad + 20;
          ruleImpactNotes = 'Protected by 15-minute buffer reset. Decision fatigue and burnout mitigated.';
        } else {
          cognitiveLoad = baseMeetingLoad;
          cognitiveLoadUnbuffered = baseMeetingLoad;
          ruleImpactNotes = isHighStakes
            ? 'High-stakes session requiring intense cognitive executive control.'
            : 'Operational coordination session.';
        }

        availableFocusMinutes = 0; // Focus unavailable during meeting
      }
    } else {
      // Free slot: calculate if it serves as deep focus or residual recovery
      activeSequentialStreak = 0;
      totalFocusMinutes += availableFocusMinutes;
    }

    if (activeEventType === 'deep_work') {
      totalFocusMinutes += availableFocusMinutes;
    }

    // Dynamic predicted burnout risk calculation per slot:
    // Driven by cognitive load, sequential meeting density streak, and buffer violations
    let slotBurnoutRisk =
      cognitiveLoad * 0.65 +
      activeSequentialStreak * 12 +
      (hasConflict ? 22 : 0) -
      (isBuffer ? 25 : 0);
    slotBurnoutRisk = Math.min(99, Math.max(10, Math.round(slotBurnoutRisk)));

    dataPoints.push({
      timeMinutes: m,
      timeLabel,
      cognitiveLoad: Math.round(cognitiveLoad),
      cognitiveLoadUnbuffered: Math.round(cognitiveLoadUnbuffered),
      availableFocusMinutes: Math.round(availableFocusMinutes),
      predictedBurnoutRisk: slotBurnoutRisk,
      sequentialMeetingStreak: activeSequentialStreak,
      activeEventTitle,
      activeEventType,
      isBufferSlot: isBuffer,
      hasZeroTransitionConflict: hasConflict,
      isBufferViolated,
      ruleImpactNotes,
    });
  }

  const peakCognitiveLoad = Math.max(...dataPoints.map((d) => d.cognitiveLoad), 20);
  const peakCognitiveLoadUnbuffered = Math.max(...dataPoints.map((d) => d.cognitiveLoadUnbuffered), peakCognitiveLoad);
  const avgCognitiveLoad = Math.round(
    dataPoints.reduce((acc, d) => acc + d.cognitiveLoad, 0) / (dataPoints.length || 1)
  );

  const bufferSavingsPct = Math.max(0, peakCognitiveLoadUnbuffered - peakCognitiveLoad);

  // Multi-day burnout breakdown
  const daysSummary = analyzeMultiDayBurnout(events);
  const violatedDaysCount = daysSummary.filter((d) => d.hasBufferViolation).length;

  // Overall predicted burnout risk for the viewed schedule
  const maxDayBurnout = Math.max(...daysSummary.map((d) => d.predictedBurnoutRisk), 25);
  const avgDayBurnout = Math.round(
    daysSummary.reduce((acc, d) => acc + d.predictedBurnoutRisk, 0) / (daysSummary.length || 1)
  );
  const predictedBurnoutRisk = Math.round(maxDayBurnout * 0.6 + avgDayBurnout * 0.4);

  let burnoutRiskLevel: 'Optimal' | 'Moderate' | 'High Risk' | 'Critical Overload' = 'Optimal';
  if (predictedBurnoutRisk >= 75 || zeroTransitionConflictsCount > 0 || violatedDaysCount > 0) {
    burnoutRiskLevel = predictedBurnoutRisk >= 85 || zeroTransitionConflictsCount >= 2 ? 'Critical Overload' : 'High Risk';
  } else if (predictedBurnoutRisk >= 50) {
    burnoutRiskLevel = 'Moderate';
  }

  let fatigueRiskLevel: 'Optimal' | 'Elevated' | 'Critical Overload' = 'Optimal';
  if (peakCognitiveLoad > 85 || zeroTransitionConflictsCount > 0) {
    fatigueRiskLevel = 'Critical Overload';
  } else if (peakCognitiveLoad > 68) {
    fatigueRiskLevel = 'Elevated';
  }

  return {
    peakCognitiveLoad,
    peakCognitiveLoadUnbuffered,
    avgCognitiveLoad,
    totalFocusMinutes,
    bufferedSlotsCount,
    zeroTransitionConflictsCount,
    predictedBurnoutRisk,
    burnoutRiskLevel,
    fatigueRiskLevel,
    bufferSavingsPct,
    dataPoints,
    daysSummary,
    violatedDaysCount,
  };
}
