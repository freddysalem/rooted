import { Dimensions, PixelRatio, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

/// Turning a position on the screen into a real length.
///
/// The phone ruler stands the handset upright in the soil and reads the plant's height
/// straight off the glass, which only works if the app knows how physically large its own
/// pixels are. iOS will not tell you, so this resolves it in two steps: a per-model
/// pixels-per-inch table for an instant answer, and a calibration against a bank card for
/// when that answer is wrong or the model is one this table has never heard of.
///
/// Bank cards are the reference because ID-1 is an ISO standard - 85.60mm x 53.98mm -
/// so everybody already owns an accurate ruler.

const STORAGE_KEY = 'plantpartner.screen.v1';

/// ISO/IEC 7810 ID-1. The long edge of every bank, credit and membership card.
export const CARD_LONG_CM = 8.56;
export const CARD_SHORT_CM = 5.398;

/// Physical pixels per inch, by iOS model identifier. Only the values that differ from
/// what the pixel density alone implies are worth listing; everything else falls through
/// to the density default below.
const PPI_BY_MODEL: Record<string, number> = {
  // The 5.5" Plus generation renders at 3x and then downsamples, so it is neither 326 nor 458.
  'iPhone7,1': 401, 'iPhone8,2': 401, 'iPhone9,2': 401, 'iPhone9,4': 401,
  'iPhone10,2': 401, 'iPhone10,5': 401,
  // The 5.4" minis are the densest screens Apple has shipped.
  'iPhone13,1': 476, 'iPhone14,4': 476,
  // 2x phones that are physically large, so lower density than the 2x default.
  'iPhone11,8': 326, 'iPhone12,1': 326,
};

/// What the pixel density implies when the model is unknown - including any handset
/// released after this table was written.
function densityDefault(): number {
  const scale = PixelRatio.get();
  if (scale >= 3) return 460;   // every 3x OLED iPhone sits within a percent or two of this
  if (scale >= 2) return 326;
  return 160;                   // sensible Android mdpi baseline
}

function fallbackPointsPerCm(): number {
  const model = Platform.OS === 'ios' ? Device.modelId ?? '' : '';
  const ppi = PPI_BY_MODEL[model] ?? densityDefault();
  // ppi is physical pixels; layout happens in points, so divide the density back out.
  return ppi / PixelRatio.get() / 2.54;
}

export interface ScreenScale {
  /** Layout points per real centimetre. */
  pointsPerCm: number;
  /** Distance from the bottom of the glass to the bottom edge of the handset, in cm. */
  bezelCm: number;
  /** False when this is a table lookup rather than something the user checked. */
  calibrated: boolean;
}

/// A modern iPhone has a few millimetres of case below the display. It is small, but the
/// plants this feature is for are small too, so it is not nothing.
const DEFAULT_BEZEL_CM = 0.4;

export function defaultScale(): ScreenScale {
  return { pointsPerCm: fallbackPointsPerCm(), bezelCm: DEFAULT_BEZEL_CM, calibrated: false };
}

export async function loadScale(): Promise<ScreenScale> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScale();
    const parsed = JSON.parse(raw) as Partial<ScreenScale>;
    if (!Number.isFinite(parsed.pointsPerCm) || (parsed.pointsPerCm ?? 0) <= 0) return defaultScale();
    return {
      pointsPerCm: parsed.pointsPerCm!,
      bezelCm: Number.isFinite(parsed.bezelCm) ? parsed.bezelCm! : DEFAULT_BEZEL_CM,
      calibrated: parsed.calibrated ?? true,
    };
  } catch {
    return defaultScale();
  }
}

export async function saveScale(scale: ScreenScale): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scale));
  } catch {
    // Losing the calibration only costs the user the setup step again.
  }
}

export async function clearScale(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do - the caller has already reset its own state.
  }
}

/// The tallest plant this method can reach on this handset, in centimetres.
export function rulerCeiling(scale: ScreenScale, usableHeightPoints: number): number {
  return usableHeightPoints / scale.pointsPerCm + scale.bezelCm;
}

export const screenHeightPoints = () => Dimensions.get('window').height;
