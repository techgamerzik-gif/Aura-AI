import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  Clock,
  Sparkles,
  Bot,
  MessageSquare,
  ArrowUpRight,
  Shield,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Lock,
  Unlock,
  GitFork,
  Link2,
  Plus,
  Filter,
  Layers,
  ArrowRight,
  AlertTriangle,
  X,
  Zap,
  CheckCircle2,
  Workflow,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ListTodo,
  CornerDownRight,
} from 'lucide-react';
import { TaskItem, SubTaskItem, EmailMessage, LanguageMode } from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';

interface AutomationHubProps {
  tasks: TaskItem[];
  emails: EmailMessage[];
  onUpdateTasks: (tasks: TaskItem[]) => void;
  onUpdateEmails: (emails: EmailMessage[]) => void;
  language: LanguageMode;
}

// Helper to determine the DAG hierarchy depth of a task (0 = root prerequisite)
export const getTaskDepth = (
  task: TaskItem,
  allTasks: TaskItem[],
  visited = new Set<string>()
): number => {
  if (visited.has(task.id)) return 0;
  const nextVisited = new Set(visited);
  nextVisited.add(task.id);

  const parentIds = new Set<string>();
  if (task.parentTaskId) parentIds.add(task.parentTaskId);
  if (task.dependsOn) task.dependsOn.forEach((id) => parentIds.add(id));
  if (parentIds.size === 0) return 0;

  let maxDepth = 0;
  allTasks.forEach((other) => {
    if (parentIds.has(other.id)) {
      maxDepth = Math.max(maxDepth, getTaskDepth(other, allTasks, nextVisited));
    }
  });
  return maxDepth + 1;
};

// Helper to determine the dependency state of a task
export const getTaskDependencyState = (
  task: TaskItem,
  allTasks: TaskItem[]
): {
  isBlocked: boolean;
  blockingParentTasks: TaskItem[];
  completedParentTasks: TaskItem[];
  allParentTasks: TaskItem[];
  downstreamTasks: TaskItem[];
  dependencyPercentage: number;
  reason: string;
} => {
  // Collect all parent IDs
  const parentIds = new Set<string>();
  if (task.parentTaskId) parentIds.add(task.parentTaskId);
  if (task.dependsOn) {
    task.dependsOn.forEach((id) => parentIds.add(id));
  }

  const allParentTasks = allTasks.filter((t) => parentIds.has(t.id));
  const uncompletedParents = allParentTasks.filter(
    (t) => t.status !== 'automated_completed'
  );
  const completedParents = allParentTasks.filter(
    (t) => t.status === 'automated_completed'
  );

  // Identify downstream tasks that depend on this task
  const downstreamTasks = allTasks.filter(
    (t) => t.parentTaskId === task.id || (t.dependsOn && t.dependsOn.includes(task.id))
  );

  const totalDeps = allParentTasks.length;
  const dependencyPercentage =
    totalDeps > 0 ? Math.round((completedParents.length / totalDeps) * 100) : 100;

  if (task.status === 'automated_completed') {
    return {
      isBlocked: false,
      blockingParentTasks: [],
      completedParentTasks: completedParents,
      allParentTasks,
      downstreamTasks,
      dependencyPercentage: 100,
      reason: 'Task is completed.',
    };
  }

  const isBlocked = uncompletedParents.length > 0;
  const reason = isBlocked
    ? uncompletedParents.length === 1
      ? `Blocked until parent task "${uncompletedParents[0].title}" (#${uncompletedParents[0].id}) is completed.`
      : `Blocked until ${uncompletedParents.length} prerequisite tasks (${uncompletedParents.map((p) => `"${p.title}" #${p.id}`).join(', ')}) are completed.`
    : 'All prerequisite dependencies resolved. Ready for execution.';

  return {
    isBlocked,
    blockingParentTasks: uncompletedParents,
    completedParentTasks: completedParents,
    allParentTasks,
    downstreamTasks,
    dependencyPercentage,
    reason,
  };
};

// Task Card Component with grouping border, hierarchy links, and sub-task progress
interface TaskCardItemProps {
  task: TaskItem;
  depState: ReturnType<typeof getTaskDependencyState>;
  tasks: TaskItem[];
  language: LanguageMode;
  hoveredTaskId: string | null;
  expandedSubtasks: Record<string, boolean>;
  inlineSubtaskInputs: Record<string, string>;
  setHoveredTaskId: (id: string | null) => void;
  setInlineSubtaskInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  scrollToTask: (id: string) => void;
  toggleSubtasksExpanded: (id: string) => void;
  handleToggleSubtask: (taskId: string, subtaskId: string) => void;
  handleAddInlineSubtask: (taskId: string) => void;
  handleToggleTaskStatus: (task: TaskItem) => void;
  handleAutoExecuteTask: (taskId: string) => void;
  handleUpdateTaskParent: (taskId: string, parentId: string) => void;
  isInHierarchyTree?: boolean;
}

export const TaskCardItem: React.FC<TaskCardItemProps> = ({
  task,
  depState,
  tasks,
  language,
  hoveredTaskId,
  expandedSubtasks,
  inlineSubtaskInputs,
  setHoveredTaskId,
  setInlineSubtaskInputs,
  scrollToTask,
  toggleSubtasksExpanded,
  handleToggleSubtask,
  handleAddInlineSubtask,
  handleToggleTaskStatus,
  handleAutoExecuteTask,
  handleUpdateTaskParent,
  isInHierarchyTree = false,
}) => {
  const isCompleted = task.status === 'automated_completed';
  const isBlocked = depState.isBlocked && !isCompleted;

  // Sub-task calculations
  const subtasks = task.subtasks || [];
  const subCount = subtasks.length;
  const subDone = subtasks.filter((s) => s.completed).length;
  const subPercentage = subCount > 0 ? Math.round((subDone / subCount) * 100) : 0;
  const isSubtasksOpen = !!expandedSubtasks[task.id];

  // Prerequisite dependency calculations
  const hasMultipleDependencies = (task.dependsOn && task.dependsOn.length > 1) || depState.allParentTasks.length > 1;
  const prereqDone = depState.completedParentTasks.length;
  const prereqTotal = depState.allParentTasks.length;
  const prereqPercentage = depState.dependencyPercentage;

  // Interactive Hover Highlight Links
  const isHoveredSelf = hoveredTaskId === task.id;
  const isChildOfHovered =
    hoveredTaskId !== null &&
    (task.parentTaskId === hoveredTaskId || (task.dependsOn && task.dependsOn.includes(hoveredTaskId)));
  const isParentOfHovered =
    hoveredTaskId !== null && depState.downstreamTasks.some((d) => d.id === hoveredTaskId);
  const isHighlightLinked = isHoveredSelf || isChildOfHovered || isParentOfHovered;

  return (
    <div
      id={`task-card-${task.id}`}
      data-task-card-id={task.id}
      onMouseEnter={() => setHoveredTaskId(task.id)}
      onMouseLeave={() => setHoveredTaskId(null)}
      className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
        isCompleted
          ? 'bg-slate-900/40 border-slate-800/40 border-l-[5px] border-l-emerald-600/50 opacity-80'
          : isBlocked
          ? 'bg-slate-900/95 border-amber-800/80 border-l-[5px] border-l-amber-500 hover:border-amber-700 shadow-md shadow-amber-950/20'
          : depState.downstreamTasks.length > 0
          ? 'bg-slate-900/95 border-cyan-800/80 border-l-[5px] border-l-cyan-500 hover:border-cyan-700 shadow-md shadow-cyan-950/10'
          : 'bg-slate-900/90 border-slate-800/90 border-l-[5px] border-l-slate-700 hover:border-slate-700 shadow-sm'
      } ${
        isHighlightLinked
          ? isBlocked || isChildOfHovered
            ? 'ring-2 ring-amber-400 border-amber-400 shadow-xl shadow-amber-950/40 scale-[1.01]'
            : 'ring-2 ring-cyan-400 border-cyan-400 shadow-xl shadow-cyan-950/30 scale-[1.01]'
          : ''
      }`}
    >
      {/* Visual Hierarchy Link & Grouping Border Top Banner */}
      {isBlocked && depState.blockingParentTasks.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 -mx-4 -mt-4 mb-3 bg-amber-950/80 border-b border-amber-800/70 text-[11px] font-mono text-amber-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-200 shrink-0">HIERARCHY LINK:</span>
            <span className="text-amber-300/90 truncate">
              Blocked by parent {depState.blockingParentTasks.map((p) => `#${p.id}`).join(' & ')}
            </span>
          </div>
          {depState.blockingParentTasks[0] && (
            <button
              type="button"
              onClick={() => scrollToTask(depState.blockingParentTasks[0].id)}
              className="text-[10px] bg-amber-900 hover:bg-amber-800 px-2 py-0.5 rounded text-amber-200 font-bold border border-amber-700/60 transition-colors shrink-0 flex items-center gap-1 ml-2"
              title={`Jump to parent task #${depState.blockingParentTasks[0].id}`}
            >
              <span>View Parent #{depState.blockingParentTasks[0].id}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {!isBlocked && depState.downstreamTasks.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 -mx-4 -mt-4 mb-3 bg-cyan-950/70 border-b border-cyan-800/60 text-[11px] font-mono text-cyan-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <GitFork className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-bold text-cyan-200 shrink-0">PREREQUISITE ROOT:</span>
            <span className="text-cyan-300/90 truncate">
              Blocks {depState.downstreamTasks.length} child task{depState.downstreamTasks.length > 1 ? 's' : ''} ({depState.downstreamTasks.map((d) => `#${d.id}`).join(', ')})
            </span>
          </div>
          <span className="text-[10px] bg-cyan-900/60 px-2 py-0.5 rounded text-cyan-200 font-bold border border-cyan-700/60 shrink-0 ml-2">
            Root Prerequisite
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] text-slate-500 font-mono font-bold">#{task.id}</span>
            <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-800 px-2 py-0.5 rounded">
              {task.category}
            </span>

            {/* Blocked vs Ready Status Badges */}
            {isCompleted ? (
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>COMPLETED</span>
              </span>
            ) : isBlocked ? (
              <span className="text-[10px] text-amber-300 font-mono bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded flex items-center gap-1 font-semibold animate-pulse">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>BLOCKED BY PARENT</span>
              </span>
            ) : (
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>READY TO EXECUTE</span>
              </span>
            )}

            {task.priority === 'critical' && (
              <span className="text-[10px] text-rose-400 font-mono uppercase font-bold">CRITICAL</span>
            )}

            {hasMultipleDependencies && (
              <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/70 border border-indigo-700/60 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                <Workflow className="w-3 h-3 text-indigo-400" />
                <span>MULTI-DEPENDENCY ({depState.allParentTasks.length})</span>
              </span>
            )}
          </div>

          <h4
            className={`text-xs font-semibold ${
              isCompleted ? 'text-slate-400 line-through' : 'text-slate-100'
            }`}
          >
            {task.title}
          </h4>

          <div className="text-[11px] text-slate-500 mt-1">
            Assignee: {task.assignee} · Due: {task.deadline}
          </div>

          {/* VISUAL INDICATOR: Lock Icon & Explicit Blocking Parent Dependency Breadcrumbs */}
          {isBlocked && depState.blockingParentTasks.length > 0 && (
            <div className="mt-2.5 p-2.5 bg-amber-950/70 border border-amber-600/70 rounded-xl space-y-1.5 shadow-sm shadow-amber-950/30">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Blocked By {depState.blockingParentTasks.length} Prerequisite Task{depState.blockingParentTasks.length > 1 ? 's' : ''}:
                  </span>
                </span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/60 font-semibold">
                  EXECUTION LOCKED
                </span>
              </div>

              {/* Clickable Dependency Breadcrumbs explicitly listing which parents are blocking */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {depState.blockingParentTasks.map((parent) => (
                  <button
                    key={`lock-crumb-${parent.id}`}
                    type="button"
                    onClick={() => scrollToTask(parent.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-900/80 hover:bg-amber-800 border border-amber-500/70 text-amber-100 text-xs font-medium transition-all hover:scale-[1.02] shadow-sm group"
                    title={`Click to view prerequisite parent task #${parent.id}: ${parent.title}`}
                  >
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="font-mono font-bold text-amber-300">#{parent.id}</span>
                    <span className="max-w-[190px] truncate font-semibold">{parent.title}</span>
                    <ArrowRight className="w-3 h-3 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Complete Dependency Breadcrumb Trail showing full lineage */}
          {depState.allParentTasks.length > 0 && (
            <div className="mt-2 p-2 bg-slate-950/90 border border-slate-800/80 rounded-lg flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1 shrink-0 font-sans font-semibold">
                <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dependency Path:</span>
              </span>

              {depState.allParentTasks.map((parent) => {
                const isParentDone = parent.status === 'automated_completed';
                return (
                  <React.Fragment key={`dep-trail-${parent.id}`}>
                    <button
                      type="button"
                      onClick={() => scrollToTask(parent.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all ${
                        isParentDone
                          ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                          : 'bg-amber-950/80 border-amber-700 text-amber-300 hover:bg-amber-900/60 font-bold'
                      }`}
                      title={`Prerequisite #${parent.id}: ${parent.title} (${isParentDone ? 'Resolved' : 'Blocking'})`}
                    >
                      {isParentDone ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                      )}
                      <span>#{parent.id}</span>
                      <span className="max-w-[120px] truncate font-sans">{parent.title}</span>
                      <span className="text-[9px] px-1 rounded bg-black/40">
                        {isParentDone ? 'RESOLVED' : 'BLOCKING'}
                      </span>
                    </button>
                    <span className="text-slate-600 font-bold">➔</span>
                  </React.Fragment>
                );
              })}

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 text-slate-200 font-semibold">
                <span>#{task.id} (This Task)</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Progress Bar for Prerequisite Dependencies */}
      {hasMultipleDependencies && !isCompleted && (
        <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <GitFork className="w-3.5 h-3.5 text-amber-400" />
              <span>Prerequisite Dependencies Readiness</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-amber-400">
              {prereqDone} / {prereqTotal} Prerequisites Met ({prereqPercentage}%)
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${prereqPercentage}%` }}
            />
          </div>

          {/* Prerequisite Task Status Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {depState.allParentTasks.map((parent) => {
              const isParentDone = parent.status === 'automated_completed';
              return (
                <span
                  key={`prereq-${parent.id}`}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 border ${
                    isParentDone
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-800 text-amber-300'
                  }`}
                >
                  {isParentDone ? <Check className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  <span>#{parent.id}: {parent.title.slice(0, 20)}...</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Progress Bar for Sub-Tasks (Complex Initiative Breakdown) */}
      {(subCount > 0 || hasMultipleDependencies) && (
        <div
          className={`mt-3 p-3 rounded-xl border space-y-2.5 transition-all ${
            hasMultipleDependencies
              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border-indigo-700/50 shadow-sm shadow-indigo-950/20'
              : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-200 font-semibold">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {hasMultipleDependencies
                  ? 'Complex Task Sub-Tasks Progress'
                  : 'Sub-Tasks Execution Progress'}
              </span>
              {hasMultipleDependencies && (
                <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/80 border border-indigo-700/60 px-2 py-0.5 rounded-full font-medium">
                  {depState.allParentTasks.length} Dependencies Linked
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-[11px] font-bold ${
                  subPercentage === 100
                    ? 'text-emerald-400'
                    : subPercentage >= 50
                    ? 'text-cyan-300'
                    : 'text-amber-400'
                }`}
              >
                {subDone} / {subCount} Sub-tasks ({subPercentage}%)
              </span>

              {subCount > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSubtasksExpanded(task.id)}
                  className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
                  title={isSubtasksOpen ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
                >
                  {isSubtasksOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Visual Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                subPercentage === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                  : subPercentage >= 50
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  : 'bg-gradient-to-r from-amber-500 to-cyan-500'
              }`}
              style={{ width: `${subPercentage}%` }}
            />
          </div>

          {subCount === 0 && (
            <div className="text-[11px] text-slate-400 italic">
              No granular sub-tasks defined yet. Add sub-tasks below to track completion progress.
            </div>
          )}

          {/* Sub-Tasks Checklist Section */}
          {(isSubtasksOpen || subCount === 0) && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-900 animate-in fade-in duration-200">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleToggleSubtask(task.id, st.id)}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer text-[11px] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {st.completed ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                    )}
                    <span
                      className={
                        st.completed
                          ? 'text-slate-400 line-through'
                          : 'text-slate-200 group-hover:text-cyan-200'
                      }
                    >
                      {st.title}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      st.completed
                        ? 'bg-emerald-950/60 text-emerald-400'
                        : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    {st.completed ? 'RESOLVED' : 'PENDING'}
                  </span>
                </div>
              ))}

              {/* Inline Add Subtask Input */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={inlineSubtaskInputs[task.id] || ''}
                  onChange={(e) =>
                    setInlineSubtaskInputs((prev) => ({
                      ...prev,
                      [task.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInlineSubtask(task.id);
                    }
                  }}
                  placeholder="Add granular sub-task..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddInlineSubtask(task.id)}
                  className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded text-[10px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dependency Details & Explicit Blocking Parent Tasks List */}
      {isBlocked && (
        <div className="mt-3 p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-[11px] text-amber-200 space-y-2.5 shadow-sm shadow-amber-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-amber-900/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Prerequisite Tasks Blocking Execution ({depState.blockingParentTasks.length}):
              </span>
            </div>
            <span className="font-mono text-[10px] text-amber-400/80 uppercase">
              Resolve Prerequisites First
            </span>
          </div>

          {/* Explicit breakdown of each blocking parent task with direct execution button */}
          <div className="space-y-1.5">
            {depState.blockingParentTasks.map((parent) => (
              <div
                key={`block-item-${parent.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-amber-800/50"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span className="font-mono text-amber-400 text-[10px]">#{parent.id}</span>
                      <span>{parent.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Assignee: {parent.assignee} · Due: {parent.deadline}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAutoExecuteTask(parent.id)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded text-[11px] font-semibold transition-all shrink-0 shadow-sm"
                  title={`Complete #${parent.id} now to unlock downstream tasks`}
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>Execute #{parent.id} First</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Prerequisite Note */}
      {!isBlocked && depState.completedParentTasks.length > 0 && !isCompleted && (
        <div className="mt-2.5 text-[11px] text-emerald-400/90 font-mono flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Prerequisites fulfilled ({depState.completedParentTasks.map((p) => `#${p.id}`).join(', ')}) · Unlocked for execution</span>
        </div>
      )}

      {/* Downstream Blocker Tag */}
      {depState.downstreamTasks.length > 0 && (
        <div className="mt-2 text-[10px] text-cyan-400 font-mono flex items-center gap-1">
          <Workflow className="w-3 h-3" />
          <span>
            {isCompleted ? 'Unlocked' : 'Blocks'} {depState.downstreamTasks.length} downstream task(s):{' '}
            {depState.downstreamTasks.map((t) => `#${t.id}`).join(', ')}
          </span>
        </div>
      )}

      {task.automatedAction && (
        <div className="mt-2.5 text-[11px] text-emerald-400 font-mono flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{task.automatedAction}</span>
        </div>
      )}

      {/* Bottom Action Strip & Dependency Re-assignment */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        {/* Parent Selector / Dependency Editor */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <GitFork className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">Parent:</span>
          <select
            value={task.parentTaskId || ''}
            onChange={(e) => handleUpdateTaskParent(task.id, e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-0.5 text-[10px] focus:outline-none focus:border-cyan-500"
          >
            <option value="">None (Independent)</option>
            {tasks
              .filter((other) => other.id !== task.id)
              .map((other) => (
                <option key={other.id} value={other.id}>
                  #{other.id} - {other.title.slice(0, 24)}...
                </option>
              ))}
          </select>
        </div>

        {/* Execution Action Button */}
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <button
              onClick={() => handleToggleTaskStatus(task)}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline font-mono"
            >
              Revert to Pending
            </button>
          ) : isBlocked ? (
            <button
              onClick={() => handleAutoExecuteTask(task.id)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-700/80 text-amber-200 text-xs font-semibold rounded-lg cursor-not-allowed opacity-90 transition-colors shadow-sm"
              title={`Blocked by: ${depState.blockingParentTasks.map((p) => `#${p.id} ${p.title}`).join(', ')}`}
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>
                Blocked by {depState.blockingParentTasks.map((p) => `#${p.id}`).join(', ')}
              </span>
            </button>
          ) : (
            <button
              onClick={() => handleAutoExecuteTask(task.id)}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Sparkles className="w-3 h-3 text-cyan-200" />
              <span>{language === 'ur_slang' ? 'Auto-Execute Karo' : 'Auto-Execute'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const AutomationHub: React.FC<AutomationHubProps> = ({
  tasks,
  emails,
  onUpdateTasks,
  onUpdateEmails,
  language,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(emails[0] || null);
  const defaultDraftsFor = (email: EmailMessage) => [
    {
      label: 'Affirmative & Approved',
      subject: `Re: ${email.subject}`,
      body: `Hi ${email.sender},\n\nThank you for the update. I have reviewed the details and give full executive approval to proceed. Please coordinate with the team on implementation.\n\nBest regards,\nExecutive Office`,
    },
    {
      label: 'Strategic Reschedule & Counter',
      subject: `Re: ${email.subject} - Follow-up`,
      body: `Hi ${email.sender},\n\nDue to back-to-back board sessions today, I have asked AURA to hold a dedicated 30-minute block for us tomorrow morning at 10:30 AM. Let me know if that works on your calendar.\n\nRegards,\nExecutive Office`,
    },
    {
      label: 'Roman Urdu / Cultural Warmth',
      subject: `Re: ${email.subject}`,
      body: `Salam ${email.sender},\n\nPoints dekh liye hain, sab theek lag raha hai. Main details confirm karwa raha hoon taake kaam smoothly complete ho jaye. Shukriya!\n\nRegards,\nExecutive Office`,
    },
  ];

  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [replyOptions, setReplyOptions] = useState<Array<{ label: string; subject: string; body: string }>>(
    emails[0] ? defaultDraftsFor(emails[0]) : []
  );
  const [activeReply, setActiveReply] = useState<string>(
    emails[0] ? defaultDraftsFor(emails[0])[0].body : ''
  );
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Task Dependencies UI State
  const [taskFilter, setTaskFilter] = useState<'all' | 'ready' | 'blocked' | 'completed'>('all');
  const [taskViewMode, setTaskViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');
  const [showDependencyGraph, setShowDependencyGraph] = useState(true);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [blockedAlertMessage, setBlockedAlertMessage] = useState<string | null>(null);
  const [unblockedBannerMessage, setUnblockedBannerMessage] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // DAG Node-Link SVG Container & Computed Connector Lines
  const dagContainerRef = useRef<HTMLDivElement>(null);
  const [connectorLines, setConnectorLines] = useState<
    Array<{
      id: string;
      fromId: string;
      toId: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isBlocked: boolean;
      isCompleted: boolean;
      fromTitle: string;
      toTitle: string;
    }>
  >([]);

  // Measure and update SVG connector paths between DAG nodes
  const updateConnectors = useCallback(() => {
    if (!dagContainerRef.current) return;
    const container = dagContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const lines: Array<{
      id: string;
      fromId: string;
      toId: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isBlocked: boolean;
      isCompleted: boolean;
      fromTitle: string;
      toTitle: string;
    }> = [];

    tasks.forEach((child) => {
      const parentIds = new Set<string>();
      if (child.parentTaskId) parentIds.add(child.parentTaskId);
      if (child.dependsOn) child.dependsOn.forEach((id) => parentIds.add(id));

      parentIds.forEach((pid) => {
        const parent = tasks.find((t) => t.id === pid);
        if (!parent) return;

        const parentEl = container.querySelector<HTMLElement>(`[data-dag-node="${parent.id}"]`);
        const childEl = container.querySelector<HTMLElement>(`[data-dag-node="${child.id}"]`);

        if (parentEl && childEl) {
          const pRect = parentEl.getBoundingClientRect();
          const cRect = childEl.getBoundingClientRect();

          const isHorizontal = cRect.left > pRect.right - 20;

          let x1: number, y1: number, x2: number, y2: number;
          if (isHorizontal) {
            x1 = pRect.right - containerRect.left;
            y1 = pRect.top + pRect.height / 2 - containerRect.top;
            x2 = cRect.left - containerRect.left;
            y2 = cRect.top + cRect.height / 2 - containerRect.top;
          } else {
            x1 = pRect.left + pRect.width / 2 - containerRect.left;
            y1 = pRect.bottom - containerRect.top;
            x2 = cRect.left + cRect.width / 2 - containerRect.left;
            y2 = cRect.top - containerRect.top;
          }

          const isParentDone = parent.status === 'automated_completed';
          const isChildBlocked = !isParentDone && child.status !== 'automated_completed';

          lines.push({
            id: `${parent.id}->${child.id}`,
            fromId: parent.id,
            toId: child.id,
            x1,
            y1,
            x2,
            y2,
            isBlocked: isChildBlocked,
            isCompleted: isParentDone,
            fromTitle: parent.title,
            toTitle: child.title,
          });
        }
      });
    });

    setConnectorLines(lines);
  }, [tasks]);

  useEffect(() => {
    if (!showDependencyGraph) return;

    const timer = setTimeout(updateConnectors, 80);

    const container = dagContainerRef.current;
    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateConnectors();
      });
      ro.observe(container);
    }

    window.addEventListener('resize', updateConnectors);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateConnectors);
      if (ro) ro.disconnect();
    };
  }, [showDependencyGraph, updateConnectors, tasks]);

  // Expanded sub-tasks map (defaults all complex tasks to expanded for visibility)
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({
    't-1': true,
    't-2': true,
    't-5': true,
  });

  // Inline new subtask input state per task
  const [inlineSubtaskInputs, setInlineSubtaskInputs] = useState<Record<string, string>>({});

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'legal' | 'finance' | 'operations' | 'personal'>('operations');
  const [newTaskPriority, setNewTaskPriority] = useState<'critical' | 'high' | 'medium' | 'normal'>('high');
  const [newTaskDeadline, setNewTaskDeadline] = useState('Today 18:00');
  const [newTaskAssignee, setNewTaskAssignee] = useState('You (Approved via AURA)');
  const [newTaskParentId, setNewTaskParentId] = useState<string>('');
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<string[]>(['Milestone 1: Preliminary Analysis', 'Milestone 2: Final Ratification']);
  const [tempSubtaskInput, setTempSubtaskInput] = useState('');

  // Toggle subtasks expansion
  const toggleSubtasksExpanded = (taskId: string) => {
    setExpandedSubtasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Trigger Gemini API for smart auto-reply
  const handleGenerateReplies = async (email: EmailMessage) => {
    const defaults = defaultDraftsFor(email);
    setReplyOptions(defaults);
    setActiveReply(defaults[0].body);

    setIsGeneratingReply(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/assistant/auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailSubject: email.subject,
          emailBody: email.body,
          sender: email.sender,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.options && data.options.length > 0) {
        setReplyOptions(data.options);
        setActiveReply(data.options[0].body);
      }
    } catch (err) {
      console.warn('Auto-reply using default executive drafts:', err);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendEmailReply = () => {
    if (!selectedEmail) return;

    setSentNotice(`Reply dispatched to ${selectedEmail.senderEmail} via encrypted SMTP bridge.`);
    const updated = emails.map((m) =>
      m.id === selectedEmail.id ? { ...m, status: 'replied' as const } : m
    );
    onUpdateEmails(updated);
    setTimeout(() => setSentNotice(null), 4000);
  };

  // Scroll and highlight a specific task by ID
  const scrollToTask = (taskId: string) => {
    const el = document.getElementById(`task-card-${taskId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-cyan-400', 'border-cyan-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-cyan-400', 'border-cyan-400');
      }, 2000);
    }
  };

  // Auto-Execute task with cascading dependency unblocking
  const handleAutoExecuteTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    // Check if task is blocked
    const depState = getTaskDependencyState(targetTask, tasks);
    if (depState.isBlocked) {
      soundEffects.playWakeChime();
      const parentName = depState.blockingParentTasks[0]?.title || 'Parent Task';
      setBlockedAlertMessage(
        language === 'ur_slang'
          ? `Yeh task blocked hai! Pehle parent task "${parentName}" execute karein.`
          : `Task Blocked: Cannot execute until prerequisite "${parentName}" is completed first.`
      );
      setTimeout(() => setBlockedAlertMessage(null), 5000);
      return;
    }

    soundEffects.playSuccessChime();

    // Mark task and all its subtasks as completed
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const completedSubtasks = t.subtasks?.map((st) => ({ ...st, completed: true }));
        return {
          ...t,
          status: 'automated_completed' as const,
          isBlocked: false,
          subtasks: completedSubtasks,
          automatedAction: `Autonomous completion executed at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        };
      }
      return t;
    });

    // Detect downstream tasks that are now unblocked by this completion
    const newlyUnblockedTasks: TaskItem[] = [];
    const finalTasks = updatedTasks.map((t) => {
      if (t.status === 'automated_completed') return t;

      // Re-evaluate dependencies with the updated state
      const newDepState = getTaskDependencyState(t, updatedTasks);
      if (!newDepState.isBlocked && (t.status === 'blocked' || t.isBlocked)) {
        newlyUnblockedTasks.push(t);
        return {
          ...t,
          status: 'pending' as const,
          isBlocked: false,
          blockedReason: undefined,
        };
      }
      return t;
    });

    onUpdateTasks(finalTasks);

    if (newlyUnblockedTasks.length > 0) {
      const names = newlyUnblockedTasks.map((t) => `"${t.title}"`).join(', ');
      setUnblockedBannerMessage(
        language === 'ur_slang'
          ? `Prerequisite complete! Child tasks ${names} ab unlock ho gaye hain aur execution ke liye tayyar hain!`
          : `Prerequisite resolved! Downstream task(s) ${names} are now unblocked and ready for execution!`
      );
      setTimeout(() => setUnblockedBannerMessage(null), 6000);
    }
  };

  // Toggle individual sub-task checkbox
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    soundEffects.playSuccessChime();
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId && t.subtasks) {
        const updatedSubtasks = t.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        const allCompleted = updatedSubtasks.every((st) => st.completed);
        return {
          ...t,
          subtasks: updatedSubtasks,
          // If all subtasks are checked and task wasn't completed, prompt readiness
          status: allCompleted && t.status !== 'blocked' ? ('pending' as const) : t.status,
        };
      }
      return t;
    });
    onUpdateTasks(updatedTasks);
  };

  // Add a new sub-task inline
  const handleAddInlineSubtask = (taskId: string) => {
    const text = inlineSubtaskInputs[taskId]?.trim();
    if (!text) return;

    soundEffects.playSuccessChime();
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const newSub: SubTaskItem = {
          id: `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: text,
          completed: false,
        };
        return {
          ...t,
          subtasks: [...(t.subtasks || []), newSub],
        };
      }
      return t;
    });
    onUpdateTasks(updatedTasks);
    setInlineSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  // Toggle or revert a completed task back to pending
  const handleToggleTaskStatus = (task: TaskItem) => {
    const isCompleted = task.status === 'automated_completed';
    if (!isCompleted) {
      handleAutoExecuteTask(task.id);
      return;
    }

    // Reverting completed task to pending re-evaluates and re-blocks downstream tasks
    soundEffects.playWakeChime();
    const updatedTasks = tasks.map((t) => {
      if (t.id === task.id) {
        return {
          ...t,
          status: 'pending' as const,
          automatedAction: undefined,
        };
      }
      return t;
    });

    // Re-block downstream tasks
    const finalTasks = updatedTasks.map((t) => {
      if (t.status === 'automated_completed') return t;
      const depState = getTaskDependencyState(t, updatedTasks);
      if (depState.isBlocked) {
        return {
          ...t,
          status: 'blocked' as const,
          isBlocked: true,
          blockedReason: depState.reason,
        };
      }
      return t;
    });

    onUpdateTasks(finalTasks);
  };

  // Change parent dependency for an existing task
  const handleUpdateTaskParent = (taskId: string, newParentId: string) => {
    soundEffects.playSuccessChime();
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const parentId = newParentId ? newParentId : undefined;
        const dependsOn = newParentId ? [newParentId] : [];
        return {
          ...t,
          parentTaskId: parentId,
          dependsOn,
        };
      }
      return t;
    });

    // Re-evaluate blocked states across all tasks
    const finalTasks = updatedTasks.map((t) => {
      if (t.status === 'automated_completed') return t;
      const depState = getTaskDependencyState(t, updatedTasks);
      return {
        ...t,
        status: depState.isBlocked ? ('blocked' as const) : ('pending' as const),
        isBlocked: depState.isBlocked,
        blockedReason: depState.isBlocked ? depState.reason : undefined,
      };
    });

    onUpdateTasks(finalTasks);
  };

  // Create new task with optional parent dependency and sub-tasks
  const handleCreateTaskWithDependency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    soundEffects.playSuccessChime();
    const parentId = newTaskParentId.trim() ? newTaskParentId.trim() : undefined;
    const parentTask = parentId ? tasks.find((t) => t.id === parentId) : null;
    const isParentUncompleted = parentTask && parentTask.status !== 'automated_completed';

    const subtasksList: SubTaskItem[] = newTaskSubtasks
      .filter((st) => st.trim().length > 0)
      .map((st, idx) => ({
        id: `st-${Date.now()}-${idx}`,
        title: st.trim(),
        completed: false,
      }));

    const newTask: TaskItem = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      priority: newTaskPriority,
      deadline: newTaskDeadline,
      assignee: newTaskAssignee,
      status: isParentUncompleted ? 'blocked' : 'pending',
      parentTaskId: parentId,
      dependsOn: parentId ? [parentId] : [],
      isBlocked: !!isParentUncompleted,
      blockedReason: isParentUncompleted
        ? `Blocked until parent task "${parentTask?.title}" (#${parentTask?.id}) is completed.`
        : undefined,
      subtasks: subtasksList.length > 0 ? subtasksList : undefined,
    };

    onUpdateTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskParentId('');
    setNewTaskSubtasks(['Milestone 1: Preliminary Analysis', 'Milestone 2: Final Ratification']);
    setShowCreateTaskModal(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute task dependency metrics
  const evaluatedTasks = tasks.map((t) => ({
    task: t,
    depState: getTaskDependencyState(t, tasks),
  }));

  const readyTasks = evaluatedTasks.filter((e) => !e.depState.isBlocked && e.task.status !== 'automated_completed');
  const blockedTasks = evaluatedTasks.filter((e) => e.depState.isBlocked && e.task.status !== 'automated_completed');
  const completedTasks = evaluatedTasks.filter((e) => e.task.status === 'automated_completed');

  // Filter tasks based on active filter
  const filteredTasks = evaluatedTasks.filter(({ task, depState }) => {
    if (taskFilter === 'ready') return !depState.isBlocked && task.status !== 'automated_completed';
    if (taskFilter === 'blocked') return depState.isBlocked && task.status !== 'automated_completed';
    if (taskFilter === 'completed') return task.status === 'automated_completed';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Executive Task Automation & Dependencies</h2>
            <span className="text-[11px] text-cyan-400 font-mono bg-cyan-950/50 border border-cyan-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-cyan-400" />
              DAG Hierarchy & Sub-tasks
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ur_slang'
              ? 'Parent task dependencies aur sub-tasks execution engine. Visual progress bar complex tasks ki sub-tasks completion percentage live track karta hai.'
              : 'Autonomous execution engine with task dependencies and visual sub-task progress bars. Tasks remain blocked until prerequisites and sub-tasks are satisfied.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dependent Task</span>
          </button>

          <button
            onClick={() => setShowDependencyGraph(!showDependencyGraph)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showDependencyGraph
                ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showDependencyGraph ? 'Hide Hierarchy' : 'Show Hierarchy'}</span>
          </button>
        </div>
      </div>

      {/* Blocked Alert Banner */}
      {blockedAlertMessage && (
        <div className="p-3 bg-amber-950/80 border border-amber-700/80 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-2 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{blockedAlertMessage}</span>
          </div>
          <button onClick={() => setBlockedAlertMessage(null)} className="text-amber-400 hover:text-amber-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unblocked Success Banner */}
      {unblockedBannerMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-xs text-emerald-200 flex items-center justify-between gap-2 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{unblockedBannerMessage}</span>
          </div>
          <button onClick={() => setUnblockedBannerMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sent Email Notice */}
      {sentNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{sentNotice}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">DISPATCHED</span>
        </div>
      )}

      {/* Task Dependency Overview & Visual Flow Diagram */}
      {showDependencyGraph && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Executive Task Dependency Chain & Flow
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>{readyTasks.length} Ready</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{blockedTasks.length} Blocked</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{completedTasks.length} Completed</span>
              </span>
            </div>
          </div>

          {/* Visual Node-Link DAG Diagram with SVG Link Connectors & Level Tiers */}
          <div ref={dagContainerRef} className="relative pt-2 pb-1 overflow-hidden min-h-[220px]">
            {/* SVG Node-Link Connectors Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker
                  id="arrow-amber"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
                </marker>
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#06b6d4" />
                </marker>
              </defs>

              {connectorLines.map((line) => {
                const isHovered = hoveredTaskId === line.fromId || hoveredTaskId === line.toId;
                const isDimmed = hoveredTaskId !== null && !isHovered;
                const dx = line.x2 - line.x1;
                const dy = line.y2 - line.y1;

                const pathD =
                  dx > 20
                    ? `M ${line.x1} ${line.y1} C ${line.x1 + dx * 0.45} ${line.y1}, ${line.x2 - dx * 0.45} ${line.y2}, ${line.x2} ${line.y2}`
                    : `M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + dy * 0.5}, ${line.x2} ${line.y2 - dy * 0.5}, ${line.x2} ${line.y2}`;

                const strokeColor = line.isBlocked
                  ? '#f59e0b'
                  : line.isCompleted
                  ? '#10b981'
                  : '#06b6d4';

                return (
                  <g
                    key={line.id}
                    className="transition-opacity duration-200"
                    opacity={isDimmed ? 0.2 : isHovered ? 1 : 0.8}
                  >
                    {/* Hover Glow Path */}
                    {isHovered && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={7}
                        strokeOpacity={0.25}
                      />
                    )}

                    {/* Main Node-Link Connecting Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isHovered ? 2.5 : 1.75}
                      strokeDasharray={line.isBlocked ? '5 4' : 'none'}
                      markerEnd={
                        line.isBlocked
                          ? 'url(#arrow-amber)'
                          : line.isCompleted
                          ? 'url(#arrow-emerald)'
                          : 'url(#arrow-cyan)'
                      }
                    />

                    {/* Midpoint glowing node indicator */}
                    {line.isBlocked && (
                      <circle
                        cx={(line.x1 + line.x2) / 2}
                        cy={(line.y1 + line.y2) / 2}
                        r={isHovered ? 4.5 : 3.5}
                        fill="#f59e0b"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hierarchical Level Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              {/* Level 1: Prerequisite Roots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Level 1 · Root Prerequisites
                  </span>
                  <span>{evaluatedTasks.filter((e) => getTaskDepth(e.task, tasks) === 0 && e.depState.downstreamTasks.length > 0).length}</span>
                </div>

                <div className="space-y-2.5">
                  {evaluatedTasks
                    .filter((e) => getTaskDepth(e.task, tasks) === 0 && e.depState.downstreamTasks.length > 0)
                    .map(({ task, depState }) => {
                      const isHovered = hoveredTaskId === task.id;
                      const isConnectedToHovered =
                        hoveredTaskId !== null &&
                        depState.downstreamTasks.some((d) => d.id === hoveredTaskId);

                      return (
                        <div
                          key={`flow-${task.id}`}
                          data-dag-node={task.id}
                          onClick={() => scrollToTask(task.id)}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all bg-slate-950/90 shadow-sm ${
                            task.status === 'automated_completed'
                              ? 'border-emerald-800/60 text-slate-300'
                              : 'border-cyan-700/70 text-slate-100 hover:border-cyan-500'
                          } ${
                            isHovered || isConnectedToHovered
                              ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-md shadow-cyan-950/40 scale-[1.02]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-[10px] text-cyan-400 font-bold">#{task.id}</span>
                            <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/60 font-semibold">
                              ROOT
                            </span>
                          </div>
                          <div className="font-semibold text-slate-200 truncate">{task.title}</div>
                          <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-cyan-400 font-mono flex items-center justify-between">
                            <span>Blocks {depState.downstreamTasks.length} child tasks</span>
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Level 2: Direct Dependent / Blocked Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Level 2 · Dependent Tasks
                  </span>
                  <span>{evaluatedTasks.filter((e) => getTaskDepth(e.task, tasks) === 1).length}</span>
                </div>

                <div className="space-y-2.5">
                  {evaluatedTasks
                    .filter((e) => getTaskDepth(e.task, tasks) === 1)
                    .map(({ task, depState }) => {
                      const isHovered = hoveredTaskId === task.id;
                      const isChildOfHovered =
                        hoveredTaskId !== null &&
                        (task.parentTaskId === hoveredTaskId || task.dependsOn?.includes(hoveredTaskId));
                      const isParentOfHovered =
                        hoveredTaskId !== null &&
                        depState.downstreamTasks.some((d) => d.id === hoveredTaskId);

                      return (
                        <div
                          key={`flow-${task.id}`}
                          data-dag-node={task.id}
                          onClick={() => scrollToTask(task.id)}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all bg-slate-950/90 shadow-sm ${
                            task.status === 'automated_completed'
                              ? 'border-emerald-800/60 text-slate-300'
                              : depState.isBlocked
                              ? 'border-amber-700/80 text-slate-100 hover:border-amber-500'
                              : 'border-cyan-800/60 text-slate-100 hover:border-cyan-500'
                          } ${
                            isHovered || isChildOfHovered || isParentOfHovered
                              ? depState.isBlocked
                                ? 'ring-2 ring-amber-400 border-amber-400 shadow-md shadow-amber-950/40 scale-[1.02]'
                                : 'ring-2 ring-cyan-400 border-cyan-400 shadow-md shadow-cyan-950/30 scale-[1.02]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-[10px] text-slate-400 font-bold">#{task.id}</span>
                            {task.status === 'automated_completed' ? (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-semibold">
                                DONE
                              </span>
                            ) : depState.isBlocked ? (
                              <span className="text-[9px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                BLOCKED
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded font-semibold">
                                READY
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-slate-200 truncate">{task.title}</div>
                          <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-amber-300 font-mono flex items-center justify-between">
                            <span className="truncate">
                              Blocked by {depState.allParentTasks.map((p) => `#${p.id}`).join(', ')}
                            </span>
                            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Level 3: Deep / Multi-Dependency Downstream */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    Level 3 · Multi-Dependency
                  </span>
                  <span>{evaluatedTasks.filter((e) => getTaskDepth(e.task, tasks) >= 2).length}</span>
                </div>

                <div className="space-y-2.5">
                  {evaluatedTasks
                    .filter((e) => getTaskDepth(e.task, tasks) >= 2)
                    .map(({ task, depState }) => {
                      const isHovered = hoveredTaskId === task.id;
                      const isChildOfHovered =
                        hoveredTaskId !== null &&
                        (task.parentTaskId === hoveredTaskId || task.dependsOn?.includes(hoveredTaskId));

                      return (
                        <div
                          key={`flow-${task.id}`}
                          data-dag-node={task.id}
                          onClick={() => scrollToTask(task.id)}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all bg-slate-950/90 shadow-sm ${
                            task.status === 'automated_completed'
                              ? 'border-emerald-800/60 text-slate-300'
                              : 'border-indigo-700/80 text-slate-100 hover:border-indigo-500'
                          } ${
                            isHovered || isChildOfHovered
                              ? 'ring-2 ring-indigo-400 border-indigo-400 shadow-md shadow-indigo-950/40 scale-[1.02]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-[10px] text-indigo-300 font-bold">#{task.id}</span>
                            <span className="text-[9px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-700/60 font-semibold">
                              MULTI-DEP ({depState.allParentTasks.length})
                            </span>
                          </div>
                          <div className="font-semibold text-slate-200 truncate">{task.title}</div>
                          <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-indigo-300 font-mono truncate">
                            Prereqs: {depState.allParentTasks.map((p) => `#${p.id}`).join(', ')}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Independent Directives Strip (Tasks with 0 parents and 0 downstream) */}
            {evaluatedTasks.filter((e) => getTaskDepth(e.task, tasks) === 0 && e.depState.downstreamTasks.length === 0).length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 relative z-10">
                <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Independent Directives (Unconstrained · No Prerequisite Blockers):</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {evaluatedTasks
                    .filter((e) => getTaskDepth(e.task, tasks) === 0 && e.depState.downstreamTasks.length === 0)
                    .map(({ task }) => (
                      <div
                        key={`flow-${task.id}`}
                        data-dag-node={task.id}
                        onClick={() => scrollToTask(task.id)}
                        className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs flex items-center justify-between gap-2 hover:border-slate-700 cursor-pointer"
                      >
                        <div className="truncate flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500 font-bold">#{task.id}</span>
                          <span className="text-slate-300 truncate font-medium">{task.title}</span>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded font-semibold shrink-0">
                          INDEPENDENT
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Split Inbox vs Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Email Triage & Auto-Reply (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>Priority Executive Inbox</span>
              <span className="text-xs text-slate-500 font-normal">({emails.filter((e) => e.status === 'unread').length} pending)</span>
            </h3>
          </div>

          {/* Email Item Cards */}
          <div className="space-y-2">
            {emails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              return (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    handleGenerateReplies(email);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/70 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200">{email.sender}</span>
                    <span className="text-slate-500 text-[11px]">{email.receivedTime}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-300 mb-1">{email.subject}</div>
                  <div className="text-xs text-slate-400 line-clamp-1">{email.snippet}</div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">{email.senderEmail}</span>
                    {email.status === 'replied' ? (
                      <span className="text-emerald-400 font-mono">REPLIED</span>
                    ) : (
                      <span className="text-amber-400 font-mono">NEEDS ACTION</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Email Detail & AI Reply Studio */}
          {selectedEmail && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{selectedEmail.subject}</h4>
                  <div className="text-xs text-slate-400">From: {selectedEmail.sender} &lt;{selectedEmail.senderEmail}&gt;</div>
                </div>
                <button
                  onClick={() => handleGenerateReplies(selectedEmail)}
                  disabled={isGeneratingReply}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingReply ? 'Generating AI Options...' : 'Regenerate Drafts'}</span>
                </button>
              </div>

              {/* Full Email Body */}
              <div className="p-3 bg-slate-950/60 rounded-lg text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-line border border-slate-800/60">
                {selectedEmail.body}
              </div>

              {/* Reply options selector */}
              {replyOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400">Select Auto-Reply Persona:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {replyOptions.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveReply(opt.body)}
                        className={`p-2 rounded-lg text-left text-xs transition-colors border ${
                          activeReply === opt.body
                            ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-semibold truncate">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable reply box */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Drafted Executive Response (Editable)
                </label>
                <textarea
                  rows={5}
                  value={activeReply}
                  onChange={(e) => setActiveReply(e.target.value)}
                  placeholder="Click 'Regenerate Drafts' or select an option above..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleCopy(activeReply)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Draft'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendEmailReply}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Approved Reply</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Automated Tasks Pipeline with Dependencies & Sub-Tasks (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Automated Task Queues</span>
              <span className="text-xs text-slate-500 font-mono">({tasks.length} total)</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {/* Hierarchy Tree vs Flat View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTaskViewMode('hierarchy')}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    taskViewMode === 'hierarchy'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Group tasks by tree hierarchy with node-link branch rails"
                >
                  <Workflow className="w-3 h-3 text-cyan-400" />
                  <span>Tree Hierarchy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskViewMode('flat')}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    taskViewMode === 'flat'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="View flat sequential task queue"
                >
                  <ListTodo className="w-3 h-3 text-slate-400" />
                  <span>Flat List</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    taskFilter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  onClick={() => setTaskFilter('ready')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    taskFilter === 'ready' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ready ({readyTasks.length})
                </button>
                <button
                  onClick={() => setTaskFilter('blocked')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    taskFilter === 'blocked' ? 'bg-amber-950 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Blocked ({blockedTasks.length})
                </button>
                <button
                  onClick={() => setTaskFilter('completed')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    taskFilter === 'completed' ? 'bg-emerald-950 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Done ({completedTasks.length})
                </button>
              </div>
            </div>
          </div>

          {/* Task Pipeline List (Supports Tree Hierarchy with Node-Link Rails or Flat List) */}
          <div>
            {(() => {
              // Flat View Mode
              if (taskViewMode === 'flat') {
                return (
                  <div className="space-y-3">
                    {filteredTasks.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-xl">
                        No tasks match the selected filter.
                      </div>
                    ) : (
                      filteredTasks.map(({ task, depState }) => (
                        <TaskCardItem
                          key={task.id}
                          task={task}
                          depState={depState}
                          tasks={tasks}
                          language={language}
                          hoveredTaskId={hoveredTaskId}
                          expandedSubtasks={expandedSubtasks}
                          inlineSubtaskInputs={inlineSubtaskInputs}
                          setHoveredTaskId={setHoveredTaskId}
                          setInlineSubtaskInputs={setInlineSubtaskInputs}
                          scrollToTask={scrollToTask}
                          toggleSubtasksExpanded={toggleSubtasksExpanded}
                          handleToggleSubtask={handleToggleSubtask}
                          handleAddInlineSubtask={handleAddInlineSubtask}
                          handleToggleTaskStatus={handleToggleTaskStatus}
                          handleAutoExecuteTask={handleAutoExecuteTask}
                          handleUpdateTaskParent={handleUpdateTaskParent}
                        />
                      ))
                    )}
                  </div>
                );
              }

              // Tree Hierarchy View Mode with Visual Node-Link Connectors & Grouping Rails
              const filteredIds = new Set(filteredTasks.map((f) => f.task.id));

              // Find root families (depth = 0 and has downstream tasks)
              const rootFamilies: Array<{
                rootTask: TaskItem;
                rootDepState: ReturnType<typeof getTaskDependencyState>;
                childTasks: Array<{ task: TaskItem; depState: ReturnType<typeof getTaskDependencyState> }>;
              }> = [];

              const visitedChildIds = new Set<string>();

              evaluatedTasks.forEach((item) => {
                const depth = getTaskDepth(item.task, tasks);
                if (depth === 0 && item.depState.downstreamTasks.length > 0) {
                  const descendants: Array<{ task: TaskItem; depState: ReturnType<typeof getTaskDependencyState> }> = [];
                  const queue = [item.task.id];
                  const visitedInFamily = new Set<string>([item.task.id]);

                  while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    evaluatedTasks.forEach((other) => {
                      if (!visitedInFamily.has(other.task.id)) {
                        const isChild =
                          other.task.parentTaskId === currentId ||
                          (other.task.dependsOn && other.task.dependsOn.includes(currentId));
                        if (isChild) {
                          visitedInFamily.add(other.task.id);
                          visitedChildIds.add(other.task.id);
                          descendants.push(other);
                          queue.push(other.task.id);
                        }
                      }
                    });
                  }

                  descendants.sort((a, b) => getTaskDepth(a.task, tasks) - getTaskDepth(b.task, tasks));

                  rootFamilies.push({
                    rootTask: item.task,
                    rootDepState: item.depState,
                    childTasks: descendants,
                  });
                }
              });

              // Standalone tasks that do not belong to any hierarchy tree
              const standaloneTasks = evaluatedTasks.filter(
                (e) =>
                  getTaskDepth(e.task, tasks) === 0 &&
                  e.depState.downstreamTasks.length === 0 &&
                  !visitedChildIds.has(e.task.id)
              );

              // Filter families based on search / status filter
              const visibleFamilies = rootFamilies.filter((family) => {
                if (taskFilter === 'all') return true;
                const isRootMatch = filteredIds.has(family.rootTask.id);
                const hasMatchingChild = family.childTasks.some((c) => filteredIds.has(c.task.id));
                return isRootMatch || hasMatchingChild;
              });

              const visibleStandalone = standaloneTasks.filter((e) => filteredIds.has(e.task.id));

              if (visibleFamilies.length === 0 && visibleStandalone.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-xl">
                    No tasks match the selected filter.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Dependency Tree Hierarchy Clusters */}
                  {visibleFamilies.map((family) => {
                    const visibleChildren =
                      taskFilter === 'all'
                        ? family.childTasks
                        : family.childTasks.filter((c) => filteredIds.has(c.task.id));

                    return (
                      <div
                        key={`family-${family.rootTask.id}`}
                        className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3.5 relative overflow-hidden shadow-sm"
                      >
                        {/* Cluster Header with Lineage Details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-slate-800/80 text-xs">
                          <div className="flex items-center gap-2">
                            <Workflow className="w-4 h-4 text-cyan-400" />
                            <span className="font-bold text-slate-200">
                              Dependency Tree · Root #{family.rootTask.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full font-semibold">
                              {family.childTasks.length} Dependent Tasks Linked
                            </span>
                          </div>
                        </div>

                        {/* Root Task Card */}
                        <div>
                          <TaskCardItem
                            task={family.rootTask}
                            depState={family.rootDepState}
                            tasks={tasks}
                            language={language}
                            hoveredTaskId={hoveredTaskId}
                            expandedSubtasks={expandedSubtasks}
                            inlineSubtaskInputs={inlineSubtaskInputs}
                            setHoveredTaskId={setHoveredTaskId}
                            setInlineSubtaskInputs={setInlineSubtaskInputs}
                            scrollToTask={scrollToTask}
                            toggleSubtasksExpanded={toggleSubtasksExpanded}
                            handleToggleSubtask={handleToggleSubtask}
                            handleAddInlineSubtask={handleAddInlineSubtask}
                            handleToggleTaskStatus={handleToggleTaskStatus}
                            handleAutoExecuteTask={handleAutoExecuteTask}
                            handleUpdateTaskParent={handleUpdateTaskParent}
                            isInHierarchyTree={true}
                          />
                        </div>

                        {/* Continuous Vertical Guide Rail & Elbow Branch Connectors */}
                        {visibleChildren.length > 0 && (
                          <div className="relative pl-6 sm:pl-8 space-y-3 pt-1">
                            {/* Continuous Vertical Guide Rail */}
                            <div className="absolute left-3 sm:left-4 top-0 bottom-6 w-0.5 bg-gradient-to-b from-cyan-500/80 via-amber-500/70 to-amber-500/20" />

                            {visibleChildren.map((childItem) => {
                              const isChildBlocked =
                                childItem.depState.isBlocked && childItem.task.status !== 'automated_completed';
                              return (
                                <div key={childItem.task.id} className="relative">
                                  {/* Horizontal Node-Link Branch Elbow Connector */}
                                  <div
                                    className={`absolute -left-6 sm:-left-8 top-7 w-6 sm:w-8 h-0.5 rounded-full transition-colors ${
                                      isChildBlocked ? 'bg-amber-500/80' : 'bg-emerald-500/70'
                                    }`}
                                  />
                                  {/* Node Dot on the Vertical Rail */}
                                  <div
                                    className={`absolute -left-[27px] sm:-left-[35px] top-[23px] w-2.5 h-2.5 rounded-full border-2 border-slate-900 shadow-sm transition-all ${
                                      isChildBlocked
                                        ? 'bg-amber-400 shadow-amber-500/50 animate-pulse'
                                        : 'bg-emerald-400 shadow-emerald-500/50'
                                    }`}
                                  />

                                  <TaskCardItem
                                    task={childItem.task}
                                    depState={childItem.depState}
                                    tasks={tasks}
                                    language={language}
                                    hoveredTaskId={hoveredTaskId}
                                    expandedSubtasks={expandedSubtasks}
                                    inlineSubtaskInputs={inlineSubtaskInputs}
                                    setHoveredTaskId={setHoveredTaskId}
                                    setInlineSubtaskInputs={setInlineSubtaskInputs}
                                    scrollToTask={scrollToTask}
                                    toggleSubtasksExpanded={toggleSubtasksExpanded}
                                    handleToggleSubtask={handleToggleSubtask}
                                    handleAddInlineSubtask={handleAddInlineSubtask}
                                    handleToggleTaskStatus={handleToggleTaskStatus}
                                    handleAutoExecuteTask={handleAutoExecuteTask}
                                    handleUpdateTaskParent={handleUpdateTaskParent}
                                    isInHierarchyTree={true}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Standalone Tasks (No Dependencies) */}
                  {visibleStandalone.length > 0 && (
                    <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/30 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Independent Directives (Unconstrained · No Prerequisite Blockers)</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {visibleStandalone.length} standalone
                        </span>
                      </div>
                      <div className="space-y-3">
                        {visibleStandalone.map((item) => (
                          <TaskCardItem
                            key={item.task.id}
                            task={item.task}
                            depState={item.depState}
                            tasks={tasks}
                            language={language}
                            hoveredTaskId={hoveredTaskId}
                            expandedSubtasks={expandedSubtasks}
                            inlineSubtaskInputs={inlineSubtaskInputs}
                            setHoveredTaskId={setHoveredTaskId}
                            setInlineSubtaskInputs={setInlineSubtaskInputs}
                            scrollToTask={scrollToTask}
                            toggleSubtasksExpanded={toggleSubtasksExpanded}
                            handleToggleSubtask={handleToggleSubtask}
                            handleAddInlineSubtask={handleAddInlineSubtask}
                            handleToggleTaskStatus={handleToggleTaskStatus}
                            handleAutoExecuteTask={handleAutoExecuteTask}
                            handleUpdateTaskParent={handleUpdateTaskParent}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Quick Automation Policies */}
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-cyan-400" />
              <span>Autopilot Dependency Directives</span>
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Enforce sequential task dependencies (DAG)</span>
                <span className="text-emerald-400 font-mono">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Live sub-task percentage progress tracking</span>
                <span className="text-cyan-400 font-mono">ENABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cascade auto-unlock on prerequisite completion</span>
                <span className="text-emerald-400 font-mono">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hold 15-min decompression buffers between sessions</span>
                <span className="text-emerald-400 font-mono">ON</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task with Dependencies & Sub-tasks Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Add Executive Task with Dependency & Sub-Tasks</h3>
              </div>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskWithDependency} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Task Title / Deliverable</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Execute Series B Wire Transfer & Legal Escrow"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="legal">Legal & Compliance</option>
                    <option value="finance">Banking & Finance</option>
                    <option value="operations">Operations & Strategic</option>
                    <option value="personal">Personal / Concierge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Deadline</label>
                  <input
                    type="text"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    placeholder="e.g. Today 18:00, Tomorrow"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Assignee</label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    placeholder="e.g. Corporate Treasury Escrow"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Parent Dependency Selector */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Parent Prerequisite Dependency (Blocks this task until done)</span>
                </label>
                <select
                  value={newTaskParentId}
                  onChange={(e) => setNewTaskParentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="">None (Independent task - Unblocked immediately)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} - {t.title} ({t.status === 'automated_completed' ? 'Completed' : 'Pending'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Granular Sub-tasks Definition */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Granular Sub-tasks & Milestones</span>
                </label>

                <div className="space-y-1.5">
                  {newTaskSubtasks.map((st, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-300">{st}</span>
                      <button
                        type="button"
                        onClick={() => setNewTaskSubtasks(newTaskSubtasks.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={tempSubtaskInput}
                    onChange={(e) => setTempSubtaskInput(e.target.value)}
                    placeholder="Enter milestone / sub-task name..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tempSubtaskInput.trim()) {
                        setNewTaskSubtasks([...newTaskSubtasks, tempSubtaskInput.trim()]);
                        setTempSubtaskInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded font-semibold text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  Create Dependent Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
