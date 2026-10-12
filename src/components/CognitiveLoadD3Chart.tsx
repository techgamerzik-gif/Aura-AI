import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ScheduleEvent, LanguageMode } from '../types/assistant.ts';
import {
  analyzeCognitiveLoadAndFocus,
  TimeSlotCognitiveData,
  DayBurnoutSummary,
} from '../utils/cognitiveLoadAnalysis.ts';
import {
  Brain,
  Clock,
  Sparkles,
  Zap,
  Info,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface CognitiveLoadD3ChartProps {
  events: ScheduleEvent[];
  language?: LanguageMode;
  onApplyBuffers?: () => void;
  isOptimizing?: boolean;
}

type ChartViewMode = 'burnout' | 'live' | 'comparison' | 'weekly';

export const CognitiveLoadD3Chart: React.FC<CognitiveLoadD3ChartProps> = ({
  events,
  language = 'en',
  onApplyBuffers,
  isOptimizing = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const multiDaySvgRef = useRef<SVGSVGElement>(null);

  const [viewMode, setViewMode] = useState<ChartViewMode>('burnout');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-24');
  const [activeHoverData, setActiveHoverData] = useState<TimeSlotCognitiveData | null>(null);
  const [hoveredDayData, setHoveredDayData] = useState<DayBurnoutSummary | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [multiDayTooltipPos, setMultiDayTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Filter events for the selected day timeline view
  const currentDayEvents = useMemo(() => {
    const dayFiltered = events.filter((e) => !e.date || e.date === selectedDate);
    // If no events on that date, fallback to all events if none match
    return dayFiltered.length > 0 ? dayFiltered : events;
  }, [events, selectedDate]);

  // Analyze schedule data for selected date (time-series)
  const analysis = useMemo(() => {
    return analyzeCognitiveLoadAndFocus(currentDayEvents);
  }, [currentDayEvents]);

  // Multi-day burnout overview across all events
  const daysSummary = useMemo(() => {
    return analysis.daysSummary;
  }, [analysis.daysSummary]);

  // Current day's burnout summary
  const currentDaySummary = useMemo(() => {
    return (
      daysSummary.find((d) => d.date === selectedDate) ||
      daysSummary.find((d) => d.date === '2026-09-24') ||
      daysSummary[0]
    );
  }, [daysSummary, selectedDate]);

  // Track container width for responsive D3 rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // =========================================================================
  // D3 MULTI-DAY BURNOUT RISK & BUFFER VIOLATION HORIZON CHART
  // =========================================================================
  useEffect(() => {
    if (!multiDaySvgRef.current || !daysSummary.length) return;

    const svg = d3.select(multiDaySvgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 24, right: 32, bottom: 48, left: 48 };
    const width = Math.max(320, containerWidth);
    const height = 180;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Defs & Gradients
    const defs = svg.append('defs');

    // Burnout Danger Bar Gradient (Violations)
    const dangerGradient = defs
      .append('linearGradient')
      .attr('id', 'burnout-danger-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    dangerGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.95);
    dangerGradient.append('stop').attr('offset', '100%').attr('stop-color', '#881337').attr('stop-opacity', 0.7);

    // Burnout Optimal Bar Gradient (Guarded)
    const optimalGradient = defs
      .append('linearGradient')
      .attr('id', 'burnout-optimal-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    optimalGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.85);
    optimalGradient.append('stop').attr('offset', '100%').attr('stop-color', '#064e3b').attr('stop-opacity', 0.5);

    // Scales
    const xScale = d3
      .scaleBand<string>()
      .domain(daysSummary.map((d) => d.date))
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Gridlines (Horizontal)
    const yGrid = d3
      .axisLeft(yScale)
      .tickValues([25, 50, 75, 100])
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'gridline')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-dasharray', '3 3');

    // 75% Critical Burnout Threshold Line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(75))
      .attr('y2', yScale(75))
      .attr('stroke', '#f43f5e')
      .attr('stroke-opacity', 0.75)
      .attr('stroke-dasharray', '4 3')
      .attr('stroke-width', 1.2);

    g.append('text')
      .attr('x', innerWidth - 6)
      .attr('y', yScale(75) - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#fb7185')
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, monospace')
      .text('75% Critical Threshold');

    // Background Highlight Area for Violations Days
    daysSummary.forEach((day) => {
      const x = xScale(day.date) || 0;
      const bWidth = xScale.bandwidth();

      if (day.hasBufferViolation) {
        // Red warning glow highlight behind the day column
        g.append('rect')
          .attr('x', x - 4)
          .attr('y', 0)
          .attr('width', bWidth + 8)
          .attr('height', innerHeight)
          .attr('rx', 6)
          .attr('fill', '#881337')
          .attr('fill-opacity', 0.18)
          .attr('stroke', '#f43f5e')
          .attr('stroke-opacity', 0.35)
          .attr('stroke-dasharray', '3 3');
      }

      // Selected Day ring
      if (day.date === selectedDate) {
        g.append('rect')
          .attr('x', x - 2)
          .attr('y', -4)
          .attr('width', bWidth + 4)
          .attr('height', innerHeight + 8)
          .attr('rx', 6)
          .attr('fill', 'transparent')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', 'none');
      }
    });

    // Bars: Predicted Burnout Risk (%)
    g.selectAll('.burnout-bar')
      .data(daysSummary)
      .enter()
      .append('rect')
      .attr('class', 'burnout-bar')
      .attr('x', (d) => xScale(d.date) || 0)
      .attr('y', (d) => yScale(d.predictedBurnoutRisk))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => Math.max(0, innerHeight - yScale(d.predictedBurnoutRisk)))
      .attr('rx', 4)
      .attr('fill', (d) =>
        d.hasBufferViolation
          ? 'url(#burnout-danger-gradient)'
          : d.predictedBurnoutRisk > 60
          ? '#f59e0b'
          : 'url(#burnout-optimal-gradient)'
      )
      .attr('stroke', (d) => (d.hasBufferViolation ? '#fda4af' : 'none'))
      .attr('stroke-width', (d) => (d.hasBufferViolation ? 1 : 0))
      .attr('cursor', 'pointer')
      .on('click', (_, d) => {
        setSelectedDate(d.date);
      })
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.85);
        setHoveredDayData(d);
        const [mx, my] = d3.pointer(event, multiDaySvgRef.current);
        setMultiDayTooltipPos({ x: mx, y: my });
      })
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event, multiDaySvgRef.current);
        setMultiDayTooltipPos({ x: mx, y: my });
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        setHoveredDayData(null);
        setMultiDayTooltipPos(null);
      });

    // Top badges / warning icons on bars
    daysSummary.forEach((day) => {
      const bx = (xScale(day.date) || 0) + xScale.bandwidth() / 2;
      const by = yScale(day.predictedBurnoutRisk);

      if (day.hasBufferViolation) {
        // Red Violation Alert Icon / Text
        g.append('text')
          .attr('x', bx)
          .attr('y', Math.max(12, by - 8))
          .attr('text-anchor', 'middle')
          .attr('fill', '#f43f5e')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'ui-monospace, monospace')
          .text(`! 0m Hazard`);
      } else if (day.bufferedSlotsCount > 0) {
        // Green Buffer Guarded Indicator
        g.append('text')
          .attr('x', bx)
          .attr('y', Math.max(12, by - 8))
          .attr('text-anchor', 'middle')
          .attr('fill', '#34d399')
          .attr('font-size', '9px')
          .attr('font-family', 'ui-monospace, monospace')
          .text(`✓ Guarded`);
      }

      // Value percentage inside / on top of bar
      g.append('text')
        .attr('x', bx)
        .attr('y', by + (innerHeight - by > 26 ? 15 : -4))
        .attr('text-anchor', 'middle')
        .attr('fill', innerHeight - by > 26 ? '#ffffff' : '#e2e8f0')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .text(`${day.predictedBurnoutRisk}%`);
    });

    // Sequential Meeting Density Connective Trend Line
    const densityLine = d3
      .line<DayBurnoutSummary>()
      .x((d) => (xScale(d.date) || 0) + xScale.bandwidth() / 2)
      .y((d) => yScale(d.meetingDensityScore))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(daysSummary)
      .attr('d', densityLine)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.85);

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => {
        const item = daysSummary.find((s) => s.date === d);
        return item ? item.shortDay : d;
      });

    const xAxisG = g.append('g').attr('transform', `translate(0, ${innerHeight})`).call(xAxis);
    xAxisG.select('.domain').attr('stroke', '#475569').attr('stroke-opacity', 0.4);
    xAxisG
      .selectAll('text')
      .attr('fill', (d) => {
        const item = daysSummary.find((s) => s.date === d);
        if (item?.hasBufferViolation) return '#f43f5e';
        if (d === selectedDate) return '#38bdf8';
        return '#94a3b8';
      })
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d === selectedDate ? 'bold' : 'normal'))
      .attr('font-family', 'ui-sans-serif, system-ui')
      .attr('dy', '1em');

    // Y Axis Left: Predicted Burnout Risk (%)
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues([0, 25, 50, 75, 100])
      .tickFormat((d) => `${d}%`);

    const yAxisG = g.append('g').call(yAxis);
    yAxisG.select('.domain').attr('stroke', '#475569').attr('stroke-opacity', 0.4);
    yAxisG
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace');

    // Left Y Axis Title
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -34)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fb7185')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .text('Burnout Risk (%)');
  }, [daysSummary, containerWidth, selectedDate]);

  // =========================================================================
  // D3 DAILY TIME-SERIES: COGNITIVE LOAD VS FOCUS TIME (WITH BURNOUT SPIKES)
  // =========================================================================
  useEffect(() => {
    if (!svgRef.current || !analysis.dataPoints.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 28, right: 54, bottom: 44, left: 48 };
    const width = Math.max(340, containerWidth);
    const height = 280;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Definitions (Gradients & Filters)
    const defs = svg.append('defs');

    // Burnout & Cognitive Load Gradient
    const loadGradient = defs
      .append('linearGradient')
      .attr('id', 'cognitive-load-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    loadGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444').attr('stop-opacity', 0.55);
    loadGradient.append('stop').attr('offset', '45%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.35);
    loadGradient.append('stop').attr('offset', '80%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.2);
    loadGradient.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.05);

    // Burnout Risk Trajectory Gradient
    const burnoutTrajectoryGradient = defs
      .append('linearGradient')
      .attr('id', 'burnout-trajectory-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    burnoutTrajectoryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#e11d48').attr('stop-opacity', 0.45);
    burnoutTrajectoryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#e11d48').attr('stop-opacity', 0.02);

    // Focus Bar Gradient
    const focusBarGradient = defs
      .append('linearGradient')
      .attr('id', 'focus-bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    focusBarGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.65);
    focusBarGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0e7490').attr('stop-opacity', 0.15);

    // X Scale: Minutes across day (e.g. 480m to 1200m)
    const minMinutes = d3.min(analysis.dataPoints, (d) => d.timeMinutes) || 480;
    const maxMinutes = d3.max(analysis.dataPoints, (d) => d.timeMinutes) || 1200;

    const xScale = d3.scaleLinear().domain([minMinutes, maxMinutes]).range([0, innerWidth]);

    // Y Scale Left: Cognitive Load & Burnout Risk (0% to 100%)
    const yScaleLoad = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Y Scale Right: Available Focus Time (0 to 30 mins per slot)
    const yScaleFocus = d3.scaleLinear().domain([0, 30]).range([innerHeight, 0]);

    // Gridlines (Horizontal)
    const yGrid = d3
      .axisLeft(yScaleLoad)
      .tickValues([25, 50, 75, 100])
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'gridline')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-dasharray', '3 3');

    // Danger Fatigue Threshold Line (75%)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScaleLoad(75))
      .attr('y2', yScaleLoad(75))
      .attr('stroke', '#f43f5e')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1.2);

    g.append('text')
      .attr('x', 6)
      .attr('y', yScaleLoad(75) - 6)
      .attr('fill', '#fb7185')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .text('75% Burnout Overload Threshold');

    // Draw Available Focus Time Bars
    const barWidth = Math.max(3, (innerWidth / analysis.dataPoints.length) * 0.65);
    g.selectAll('.focus-bar')
      .data(analysis.dataPoints)
      .enter()
      .append('rect')
      .attr('class', 'focus-bar')
      .attr('x', (d) => xScale(d.timeMinutes) - barWidth / 2)
      .attr('y', (d) => yScaleFocus(d.availableFocusMinutes))
      .attr('width', barWidth)
      .attr('height', (d) => Math.max(0, innerHeight - yScaleFocus(d.availableFocusMinutes)))
      .attr('rx', 2)
      .attr('fill', (d) => {
        if (d.isBufferSlot) return '#10b981'; // Emerald for buffer
        if (d.activeEventType === 'deep_work') return '#38bdf8'; // Sky blue for deep work
        return 'url(#focus-bar-gradient)';
      })
      .attr('opacity', (d) => (d.availableFocusMinutes > 0 ? 0.75 : 0.15));

    // Area & Line Generators for Cognitive Load
    const areaGenerator = d3
      .area<TimeSlotCognitiveData>()
      .x((d) => xScale(d.timeMinutes))
      .y0(innerHeight)
      .y1((d) => yScaleLoad(d.cognitiveLoad))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3
      .line<TimeSlotCognitiveData>()
      .x((d) => xScale(d.timeMinutes))
      .y((d) => yScaleLoad(d.cognitiveLoad))
      .curve(d3.curveMonotoneX);

    // Predicted Burnout Risk Area & Line
    const burnoutAreaGenerator = d3
      .area<TimeSlotCognitiveData>()
      .x((d) => xScale(d.timeMinutes))
      .y0(innerHeight)
      .y1((d) => yScaleLoad(d.predictedBurnoutRisk))
      .curve(d3.curveMonotoneX);

    const burnoutLineGenerator = d3
      .line<TimeSlotCognitiveData>()
      .x((d) => xScale(d.timeMinutes))
      .y((d) => yScaleLoad(d.predictedBurnoutRisk))
      .curve(d3.curveMonotoneX);

    if (viewMode === 'burnout') {
      // Burnout Area Fill
      g.append('path')
        .datum(analysis.dataPoints)
        .attr('d', burnoutAreaGenerator)
        .attr('fill', 'url(#burnout-trajectory-gradient)');

      // Predicted Burnout Trajectory Line (Bold Crimson)
      g.append('path')
        .datum(analysis.dataPoints)
        .attr('d', burnoutLineGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2.5);

      // Cognitive Load baseline comparison line
      g.append('path')
        .datum(analysis.dataPoints)
        .attr('d', lineGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#818cf8')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3')
        .attr('opacity', 0.85);
    } else {
      // Live Cognitive Load Area Fill
      g.append('path')
        .datum(analysis.dataPoints)
        .attr('d', areaGenerator)
        .attr('fill', 'url(#cognitive-load-gradient)');

      // Live Cognitive Load Line
      g.append('path')
        .datum(analysis.dataPoints)
        .attr('d', lineGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#6366f1')
        .attr('stroke-width', 2.5);
    }

    // Buffer Intervention Markers & Collision Highlights
    analysis.dataPoints.forEach((d) => {
      const cx = xScale(d.timeMinutes);
      const cy = yScaleLoad(viewMode === 'burnout' ? d.predictedBurnoutRisk : d.cognitiveLoad);

      if (d.isBufferSlot) {
        // 15-Minute Cognitive Reset Buffer Marker (Drop badge)
        const markerGroup = g.append('g').attr('transform', `translate(${cx}, ${cy})`);

        markerGroup
          .append('circle')
          .attr('r', 5)
          .attr('fill', '#10b981')
          .attr('stroke', '#064e3b')
          .attr('stroke-width', 2);

        // Vertical drop line to base
        g.append('line')
          .attr('x1', cx)
          .attr('x2', cx)
          .attr('y1', cy)
          .attr('y2', innerHeight)
          .attr('stroke', '#10b981')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2 2')
          .attr('opacity', 0.7);

        // Text indicator above
        markerGroup
          .append('text')
          .attr('x', 0)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#34d399')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'ui-monospace, monospace')
          .text('-35% Reset');
      } else if (d.hasZeroTransitionConflict || d.isBufferViolated) {
        // Zero-Transition Hazard Spike Marker (Violates 15m Buffer Rule)
        const hazardGroup = g.append('g').attr('transform', `translate(${cx}, ${cy})`);

        hazardGroup
          .append('circle')
          .attr('r', 6)
          .attr('fill', '#f43f5e')
          .attr('stroke', '#881337')
          .attr('stroke-width', 2.5);

        // Vertical warning line
        g.append('line')
          .attr('x1', cx)
          .attr('x2', cx)
          .attr('y1', cy)
          .attr('y2', innerHeight)
          .attr('stroke', '#f43f5e')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2 2')
          .attr('opacity', 0.8);

        hazardGroup
          .append('text')
          .attr('x', 0)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fb7185')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'ui-monospace, monospace')
          .text('Buffer Violated!');
      }
    });

    // X Axis: Time Formatter
    const xTicks = [480, 600, 720, 840, 960, 1080, 1200]; // 08:00 to 20:00 every 2 hours
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(xTicks)
      .tickFormat((d) => {
        const val = Number(d);
        const h = Math.floor(val / 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return `${displayH} ${ampm}`;
      });

    const xAxisG = g.append('g').attr('transform', `translate(0, ${innerHeight})`).call(xAxis);
    xAxisG.select('.domain').attr('stroke', '#475569').attr('stroke-opacity', 0.4);
    xAxisG
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'ui-sans-serif, system-ui')
      .attr('dy', '1em');

    // Y Axis Left: Cognitive Load / Burnout
    const yAxisLoad = d3
      .axisLeft(yScaleLoad)
      .tickValues([0, 25, 50, 75, 100])
      .tickFormat((d) => `${d}%`);

    const yAxisG = g.append('g').call(yAxisLoad);
    yAxisG.select('.domain').attr('stroke', '#475569').attr('stroke-opacity', 0.4);
    yAxisG
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace');

    // Left Y Axis Title
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -34)
      .attr('text-anchor', 'middle')
      .attr('fill', viewMode === 'burnout' ? '#fb7185' : '#a5b4fc')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .text(viewMode === 'burnout' ? 'Burnout Risk (%)' : 'Cognitive Load (%)');

    // Right Y Axis: Focus Time (mins)
    const yAxisFocus = d3
      .axisRight(yScaleFocus)
      .tickValues([0, 15, 30])
      .tickFormat((d) => `${d}m`);

    const yAxisRightG = g.append('g').attr('transform', `translate(${innerWidth}, 0)`).call(yAxisFocus);
    yAxisRightG.select('.domain').remove();
    yAxisRightG
      .selectAll('text')
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace');

    // Right Y Axis Title
    g.append('text')
      .attr('transform', 'rotate(90)')
      .attr('x', innerHeight / 2)
      .attr('y', -innerWidth - 38)
      .attr('text-anchor', 'middle')
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .text('Focus (min/30m)');

    // Interactive Overlay Layer for Crosshair and Tooltip
    const crosshair = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', 0);

    const loadFocusDot = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', viewMode === 'burnout' ? '#f43f5e' : '#818cf8')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0);

    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    overlay.on('mousemove', function (event) {
      const [mouseX] = d3.pointer(event, this);
      const hoveredMinutes = xScale.invert(mouseX);

      // Find nearest data point
      let nearest = analysis.dataPoints[0];
      let minDiff = Infinity;
      for (const d of analysis.dataPoints) {
        const diff = Math.abs(d.timeMinutes - hoveredMinutes);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = d;
        }
      }

      if (nearest) {
        const cx = xScale(nearest.timeMinutes);
        const targetValue = viewMode === 'burnout' ? nearest.predictedBurnoutRisk : nearest.cognitiveLoad;
        const cy = yScaleLoad(targetValue);

        crosshair.attr('x1', cx).attr('x2', cx).attr('opacity', 1);
        loadFocusDot.attr('cx', cx).attr('cy', cy).attr('opacity', 1);

        setActiveHoverData(nearest);

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setTooltipPos({
            x: cx + margin.left,
            y: cy + margin.top,
          });
        }
      }
    });

    overlay.on('mouseleave', () => {
      crosshair.attr('opacity', 0);
      loadFocusDot.attr('opacity', 0);
      setActiveHoverData(null);
      setTooltipPos(null);
    });
  }, [analysis, containerWidth, viewMode]);

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      {/* Chart Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                Predicted Burnout Risk & Cognitive Density
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/70 text-rose-300 font-bold">
                D3.js Predictive Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous monitoring of sequential meeting density and automated detection of 15-minute buffer rule violations.
            </p>
          </div>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('burnout')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'burnout'
                  ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Burnout Risk
            </button>
            <button
              onClick={() => setViewMode('live')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'live'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cognitive Load
            </button>
          </div>

          {analysis.zeroTransitionConflictsCount > 0 && onApplyBuffers && (
            <button
              onClick={onApplyBuffers}
              disabled={isOptimizing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isOptimizing ? 'Inserting...' : 'Resolve Violations (+15m)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* MULTI-DAY BURNOUT RISK STRIP: Highlights days violating the 15-minute buffer rule */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Weekly Sequential Meeting Density & Buffer Violations
            </h4>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Rule Violation Status:</span>
            {analysis.violatedDaysCount > 0 ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/90 border border-rose-800 text-rose-300 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                {analysis.violatedDaysCount} {analysis.violatedDaysCount === 1 ? 'Day' : 'Days'} Violated (15m Missing)
              </span>
            ) : (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                All Days Guarded
              </span>
            )}
          </div>
        </div>

        {/* Multi-Day D3 Chart Container */}
        <div className="relative w-full overflow-hidden">
          <svg ref={multiDaySvgRef} className="w-full block" />

          {/* Multi-Day Hover Tooltip */}
          {hoveredDayData && multiDayTooltipPos && (
            <div
              className="absolute z-30 pointer-events-none p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-1.5 max-w-xs transition-all"
              style={{
                left: Math.min(Math.max(16, multiDayTooltipPos.x - 90), containerWidth - 250),
                top: Math.max(10, multiDayTooltipPos.y - 120),
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                <span className="font-bold text-slate-100">{hoveredDayData.dayLabel}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    hoveredDayData.hasBufferViolation
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {hoveredDayData.hasBufferViolation ? 'RULE VIOLATED' : 'BUFFER COMPLIANT'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Burnout Risk:</span>
                  <span
                    className={`font-bold ${
                      hoveredDayData.predictedBurnoutRisk > 75
                        ? 'text-rose-400'
                        : hoveredDayData.predictedBurnoutRisk > 50
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {hoveredDayData.predictedBurnoutRisk}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Sequential Streak:</span>
                  <span className="font-bold text-amber-300">
                    {hoveredDayData.longestSequentialStreak} back-to-back
                  </span>
                </div>
              </div>
              {hoveredDayData.hasBufferViolation && (
                <div className="text-[10px] text-rose-300 pt-1 border-t border-slate-800">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" /> 15m Buffer Rule Violated:
                  </div>
                  <ul className="list-disc list-inside text-rose-200 mt-0.5 space-y-0.5">
                    {hoveredDayData.violationDetails.map((v, idx) => (
                      <li key={idx} className="truncate">{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Day Selector Buttons with Automatic Violation Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-800/60">
          {daysSummary.map((d) => {
            const isSelected = d.date === selectedDate;
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/80 ring-2 ring-cyan-500/20'
                    : d.hasBufferViolation
                    ? 'bg-rose-950/30 border-rose-800/60 hover:bg-rose-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={isSelected ? 'text-white' : 'text-slate-300'}>{d.dayLabel}</span>
                  {d.hasBufferViolation && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Buffer rule violated!" />
                  )}
                </div>
                <div className="flex items-baseline justify-between mt-1 text-[11px] font-mono">
                  <span className="text-slate-400">Burnout:</span>
                  <span
                    className={`font-bold ${
                      d.predictedBurnoutRisk > 75
                        ? 'text-rose-400'
                        : d.predictedBurnoutRisk > 50
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {d.predictedBurnoutRisk}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {d.hasBufferViolation ? (
                    <span className="text-rose-400 font-semibold">⚠️ 15m Buffer Violated</span>
                  ) : (
                    <span>{d.eventsCount} sessions</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Predicted Burnout Risk</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                currentDaySummary.predictedBurnoutRisk > 75
                  ? 'text-rose-400'
                  : currentDaySummary.predictedBurnoutRisk > 50
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {currentDaySummary.predictedBurnoutRisk}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              ({currentDaySummary.burnoutRiskLevel})
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {currentDaySummary.hasBufferViolation ? 'Elevated by sequential density' : 'Sustainable pacing'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Buffer Rule Governance</span>
            {currentDaySummary.hasBufferViolation ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                currentDaySummary.hasBufferViolation ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {currentDaySummary.hasBufferViolation
                ? `${currentDaySummary.bufferViolationsCount} Violated`
                : 'Enforced'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {currentDaySummary.hasBufferViolation
              ? 'Zero-transition gap detected'
              : '15m cognitive buffers guarded'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Peak Cognitive Load</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                analysis.peakCognitiveLoad > 75
                  ? 'text-rose-400'
                  : analysis.peakCognitiveLoad > 55
                  ? 'text-amber-400'
                  : 'text-indigo-400'
              }`}
            >
              {analysis.peakCognitiveLoad}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Max hourly executive strain</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Available Focus Time</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
              {Math.floor(analysis.totalFocusMinutes / 60)}h {analysis.totalFocusMinutes % 60}m
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Deep work & decompression</div>
        </div>
      </div>

      {/* D3 Time-Series Visual Container with relative Tooltip */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-slate-950/50 rounded-xl p-2 border border-slate-800/60"
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-900 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              Timeline Breakdown: {currentDaySummary.dayLabel}
            </span>
            {currentDaySummary.hasBufferViolation && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold">
                Buffer Rule Violated
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Sequential Streak: {currentDaySummary.longestSequentialStreak} meetings
          </div>
        </div>

        <svg ref={svgRef} className="w-full block" />

        {/* Dynamic Hover Tooltip */}
        {activeHoverData && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-1.5 max-w-xs transition-all duration-75"
            style={{
              left: Math.min(Math.max(16, tooltipPos.x - 100), containerWidth - 240),
              top: Math.max(10, tooltipPos.y - 120),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="font-mono font-semibold text-slate-200">{activeHoverData.timeLabel}</span>
              {activeHoverData.isBufferSlot ? (
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded">
                  15m RESET BUFFER
                </span>
              ) : activeHoverData.hasZeroTransitionConflict || activeHoverData.isBufferViolated ? (
                <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-950/80 px-1.5 py-0.5 rounded">
                  BUFFER VIOLATED
                </span>
              ) : activeHoverData.activeEventTitle ? (
                <span className="text-[10px] font-mono text-slate-400">ACTIVE SESSION</span>
              ) : (
                <span className="text-[10px] font-mono text-cyan-400">OPEN BLOCK</span>
              )}
            </div>

            {activeHoverData.activeEventTitle && (
              <div className="text-slate-100 font-medium truncate">
                {activeHoverData.activeEventTitle}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Predicted Burnout:</span>
                <span
                  className={`font-bold ${
                    activeHoverData.predictedBurnoutRisk > 75
                      ? 'text-rose-400'
                      : activeHoverData.predictedBurnoutRisk > 50
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {activeHoverData.predictedBurnoutRisk}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Cognitive Load:</span>
                <span className="font-bold text-indigo-300">
                  {activeHoverData.cognitiveLoad}%
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-1 leading-snug border-t border-slate-800">
              {activeHoverData.ruleImpactNotes}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Rule Impact Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full bg-rose-500" />
            <span className="text-[11px] text-rose-300">Predicted Burnout Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t border-dashed border-indigo-400" />
            <span className="text-[11px] text-indigo-300">Cognitive Load Curve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500 opacity-60" />
            <span className="text-[11px]">Focus Capacity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
            <span className="text-[11px] text-rose-300 font-semibold">15m Buffer Violated (Day Highlighted)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
            <span className="text-[11px] text-emerald-300">15m Buffer Guarded (-35% Reset)</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Executive Burnout Guardrail: Sequential Density + 15m Buffer Rules
        </div>
      </div>
    </div>
  );
};
