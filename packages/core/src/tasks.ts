import { deriveSeed, rngShuffle, seedRng } from './rng';

/** Daily tasks: three small goals a day, each worth a little Gloam. */

export type TaskEvent = 'wins' | 'breaks' | 'encores' | 'passes' | 'ultimates' | 'bursts' | 'descentFloors';

export interface TaskDef {
  id: string;
  text: string;
  event: TaskEvent;
  goal: number;
}

export const TASK_GLOAM = 25;

export const TASKS: readonly TaskDef[] = [
  { id: 'win-3', text: 'Win 3 battles', event: 'wins', goal: 3 },
  { id: 'break-6', text: 'Break 6 enemies', event: 'breaks', goal: 6 },
  { id: 'encore-4', text: 'Earn 4 Encores', event: 'encores', goal: 4 },
  { id: 'pass-2', text: 'Pass the baton twice', event: 'passes', goal: 2 },
  { id: 'ult-2', text: 'Unleash 2 ultimates', event: 'ultimates', goal: 2 },
  { id: 'burst-1', text: 'Land a Horizon Burst', event: 'bursts', goal: 1 },
  { id: 'floor-1', text: 'Clear a Descent floor', event: 'descentFloors', goal: 1 },
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
