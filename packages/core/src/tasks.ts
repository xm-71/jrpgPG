import { deriveSeed, rngShuffle, seedRng } from './rng';

/** Daily tasks: three small goals a day, each worth a little Gloam. */

export type TaskEvent = 'wins' | 'breaks' | 'chains' | 'ultimates' | 'floors' | 'elites' | 'echoes';

export interface TaskDef {
  id: string;
  text: string;
  event: TaskEvent;
  goal: number;
}

export const TASK_GLOAM = 25;

export const TASKS: readonly TaskDef[] = [
  { id: 'win-3', text: 'Win 3 fights', event: 'wins', goal: 3 },
  { id: 'break-5', text: 'Break 5 foes', event: 'breaks', goal: 5 },
  { id: 'chain-3', text: 'Make 3 Chains', event: 'chains', goal: 3 },
  { id: 'ult-2', text: 'Unleash 2 ultimates', event: 'ultimates', goal: 2 },
  { id: 'floor-2', text: 'Clear 2 floors of the Gnomon', event: 'floors', goal: 2 },
  { id: 'elite-1', text: 'Defeat an elite', event: 'elites', goal: 1 },
  { id: 'echo-1', text: 'Take an Echo from a Mirror', event: 'echoes', goal: 1 },
];

export interface TaskState {
  day: string;
  progress: Record<string, number>;
  done: string[];
}

export function newTaskState(day: string): TaskState {
  return { day, progress: {}, done: [] };
}

/** The three tasks for a day. Everyone gets the same ones, and the choice never changes. */
export function tasksForDay(day: string): TaskDef[] {
  const order = rngShuffle(seedRng(deriveSeed('tasks', day)), [...TASKS]);
  return order.slice(0, 3);
}
