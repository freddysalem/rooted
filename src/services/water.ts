import { Planting } from '../models/planting';
import { Species } from '../models/species';
import { WeatherSnapshot, measuredRain } from './weather';

/// How much water, not just when.
///
/// "Water your basil" is not advice - the plant in a yoghurt pot on a windowsill and the
/// one in a sack on a roof want very different amounts, and getting it wrong is the most
/// common way people kill things. The honest answer depends on how much soil the roots
/// have, which the app cannot guess, so it asks once when you plant and then does the
/// arithmetic every time.
///
/// The rule underneath: a proper watering wets the whole root ball and leaves a little
/// draining out the bottom, which is roughly a quarter of the soil's volume. Everything
/// else here is a correction to that for what the sky has been doing.

export type ContainerKind = 'pot' | 'sack' | 'bed';

export interface Container {
  kind: ContainerKind;
  /** Volume of soil the roots have, in litres. */
  litres: number;
}

export const CONTAINERS: { id: string; kind: ContainerKind; label: string; detail: string; litres: number }[] = [
  { id: 'potSmall', kind: 'pot', label: 'Small pot', detail: '15 cm across', litres: 2 },
  { id: 'potMedium', kind: 'pot', label: 'Medium pot', detail: '25 cm across', litres: 6 },
  { id: 'potLarge', kind: 'pot', label: 'Large pot', detail: '35 cm across', litres: 15 },
  { id: 'growbag', kind: 'pot', label: 'Grow bag', detail: 'Shared by 2-3 plants', litres: 12 },
  { id: 'sack', kind: 'sack', label: 'Sack garden', detail: 'A full growing sack', litres: 70 },
  { id: 'bed', kind: 'bed', label: 'Open ground', detail: 'A bed or allotment row', litres: 40 },
];

export const DEFAULT_CONTAINER: Container = { kind: 'bed', litres: 40 };

export function containerLabel(container: Container | undefined): string {
  if (!container) return 'Open ground';
  const match = CONTAINERS.find((c) => c.kind === container.kind && c.litres === container.litres);
  return match?.label ?? `${container.litres} litres of soil`;
}

/// A quarter of the soil volume, which is what it takes to wet a root ball right through.
/// Open ground is the exception - there is no bottom for it to drain out of, and the
/// surrounding soil wicks water sideways, so it takes less to do the same job.
function baseLitres(container: Container): number {
  const share = container.kind === 'bed' ? 0.15 : 0.25;
  return container.litres * share;
}

export interface WaterAdvice {
  /** Millilitres for one watering. */
  millilitres: number;
  /** Human-readable amount, already rounded to something pourable. */
  amount: string;
  /** Why it is more or less than usual, or empty when it is just the usual. */
  because: string;
  /** True when the sky has already done it and the answer is to leave it alone. */
  skip: boolean;
}

const round = (millilitres: number) => {
  if (millilitres >= 2000) return `${(millilitres / 1000).toFixed(1).replace(/\.0$/, '')} litres`;
  if (millilitres >= 1000) return `${(millilitres / 1000).toFixed(1)} litres`;
  return `${Math.round(millilitres / 50) * 50} ml`;
};

export function waterFor(
  planting: Planting,
  species: Species,
  weather: WeatherSnapshot | null
): WaterAdvice {
  const container = planting.container ?? DEFAULT_CONTAINER;
  let litres = baseLitres(container);

  // Thirsty species get more per watering, not just more often - a courgette in the same
  // pot as a thyme is doing far more work with the water it gets.
  if (species.waterEveryDays <= 2) litres *= 1.25;
  else if (species.waterEveryDays >= 6) litres *= 0.8;

  let because = '';
  let skip = false;

  // Rain is only a substitute for watering if the rain can land on the plant. A pot on a
  // windowsill under 10mm of rain is exactly as dry as it was yesterday, and telling
  // someone to skip it is how an indoor plant dies.
  const rainReachesIt = !planting.indoors;

  if (weather && !rainReachesIt) {
    // Indoors is warmer and draughtier than the garden and there is no dew, so a heated
    // room asks for a little more rather than less.
    if (weather.highC >= 24) {
      litres *= 1.1;
      because = 'Warm indoors, and no rain reaches it.';
    } else {
      because = 'Indoors, so the rain outside makes no difference.';
    }
  } else if (weather) {
    const rain = measuredRain(weather);
    if (rain >= 6) {
      skip = true;
      because = `${Math.round(rain)}mm of rain overnight - leave it be today.`;
    } else if (rain >= 2) {
      litres *= 0.5;
      because = `Some rain overnight, so half the usual.`;
    } else if (weather.highC >= 28) {
      litres *= 1.35;
      because = `${Math.round(weather.highC)}°C today - more than usual, and water early or late.`;
    } else if (weather.highC >= 24) {
      litres *= 1.15;
      because = `Warm today, so a little extra.`;
    }
  }

  const millilitres = Math.max(Math.round(litres * 1000), 50);
  return { millilitres, amount: round(millilitres), because, skip };
}

/// One line telling someone how to measure it without a measuring jug.
export function inEverydayTerms(millilitres: number): string {
  if (millilitres >= 8000) {
    const n = Math.round(millilitres / 10000 * 10) / 10;
    return `about ${n} ${n === 1 ? 'bucket' : 'buckets'}`;
  }
  if (millilitres >= 1500) return `about ${Math.round(millilitres / 1000)} big bottles`;
  if (millilitres >= 400) {
    const n = Math.round(millilitres / 330);
    return `about ${n} ${n === 1 ? 'mug' : 'mugs'}`;
  }
  return 'a small glass';
}
