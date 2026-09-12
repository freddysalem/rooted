import { Species, speciesById } from './species';
import { Container } from '../services/water';

/// One measurement from the reference-object flow.
export interface HeightEntry {
  id: string;
  date: string;   // ISO
  centimetres: number;
}

/// Something actually growing in the user's plot.
export interface Planting {
  id: string;
  speciesID: string;
  nickname: string;
  plantedOn: string;      // ISO
  lastWatered: string | null;
  wateringCount: number;
  /** Index into the allotment grid. */
  plot: number;
  heights: HeightEntry[];
  notes: string;
  /** How much soil the roots have, which is what decides how much water to give it. */
  container?: Container;
}

export type GrowthStage = 'sown' | 'sprouting' | 'growing' | 'established' | 'ready';

export const stageLabel: Record<GrowthStage, string> = {
  sown: 'Just sown',
  sprouting: 'Sprouting',
  growing: 'Growing',
  established: 'Established',
  ready: 'Ready to harvest',
};

/// The plot has no fixed size. A bed appears when you plant in it, plus one empty bed
/// waiting for the next, and the block stays roughly square as it grows rather than
/// running off in a line.
export function plotLayout(tileCount: number) {
  // Never wider than there are beds to fill: a single planting plus its waiting bed is
  // two columns, not three with a strip of bare soil hanging off the end.
  const square = Math.min(Math.max(Math.ceil(Math.sqrt(tileCount)), 3), 8);
  const columns = Math.max(1, Math.min(tileCount, square));
  return { columns, rows: Math.max(1, Math.ceil(tileCount / columns)) };
}

/// What "a full plot" means for the badge, now the plot itself has no ceiling.
export const FULL_PLOT_TARGET = 12;

const DAY = 1000 * 60 * 60 * 24;

export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = typeof from === 'string' ? new Date(from) : from;
  const b = typeof to === 'string' ? new Date(to) : to;
  return Math.floor((b.getTime() - a.getTime()) / DAY);
}

export function getSpecies(planting: Planting): Species {
  return speciesById(planting.speciesID);
}

export function daysSincePlanting(planting: Planting): number {
  return Math.max(daysBetween(planting.plantedOn), 0);
}

/// 0 = just sown, 1 = ready to harvest. Drives the on-screen plant's size.
export function progressOf(planting: Planting): number {
  const species = getSpecies(planting);
  const p = daysSincePlanting(planting) / Math.max(species.daysToHarvest, 1);
  return Math.min(Math.max(p, 0), 1);
}

export function stageOf(planting: Planting): GrowthStage {
  const p = progressOf(planting);
  if (p < 0.08) return 'sown';
  if (p < 0.3) return 'sprouting';
  if (p < 0.6) return 'growing';
  if (p < 0.95) return 'established';
  return 'ready';
}

export function daysUntilHarvest(planting: Planting): number {
  return Math.max(getSpecies(planting).daysToHarvest - daysSincePlanting(planting), 0);
}

export function sortedHeights(planting: Planting): HeightEntry[] {
  return [...planting.heights].sort((a, b) => a.date.localeCompare(b.date));
}

export function latestHeight(planting: Planting): number | null {
  const sorted = sortedHeights(planting);
  return sorted.length ? sorted[sorted.length - 1].centimetres : null;
}

/// Growth since the first recorded measurement, in cm.
export function heightGain(planting: Planting): number | null {
  const sorted = sortedHeights(planting);
  if (sorted.length < 2) return null;
  return sorted[sorted.length - 1].centimetres - sorted[0].centimetres;
}

/// A stable small integer per plant, so each sprite sways on its own clock.
export function seedOf(planting: Planting): number {
  let hash = 0;
  for (let i = 0; i < planting.id.length; i++) {
    hash = (hash * 31 + planting.id.charCodeAt(i)) % 9973;
  }
  return hash;
}
