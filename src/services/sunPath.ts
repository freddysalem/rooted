export interface SunPosition {
  /** Degrees clockwise from true north. */
  azimuth: number;
  /** Degrees above the horizon. Negative means the sun is down. */
  elevation: number;
}

export interface SunSample {
  date: Date;
  position: SunPosition;
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;

function normaliseDegrees(value: number): number {
  const v = value % 360;
  return v < 0 ? v + 360 : v;
}

function normaliseHours(value: number): number {
  const v = value % 24;
  return v < 0 ? v + 24 : v;
}

function julianDaysSinceJ2000(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5 - 2451545.0;
}

/// Where the sun actually is, from date and coordinates.
///
/// This is the low-precision solar position algorithm published by the US Naval
/// Observatory - accurate to roughly a tenth of a degree, which is far beyond what
/// "should I put tomatoes here" requires.
export function sunPosition(date: Date, latitude: number, longitude: number): SunPosition {
  const d = julianDaysSinceJ2000(date);

  const meanLongitude = normaliseDegrees(280.46 + 0.9856474 * d);
  const meanAnomaly = rad(normaliseDegrees(357.528 + 0.9856003 * d));

  // Ecliptic longitude, correcting for the orbit not being circular.
  const eclipticLongitude = rad(
    normaliseDegrees(meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly))
  );

  const obliquity = rad(23.439 - 0.0000004 * d);

  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude)
  );
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));

  const gmst = normaliseHours(18.697374558 + 24.06570982441908 * d);
  const localSiderealDegrees = normaliseDegrees(gmst * 15 + longitude);
  const hourAngle = rad(normaliseDegrees(localSiderealDegrees - deg(rightAscension)));

  const lat = rad(latitude);
  const elevation = Math.asin(
    Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  );
  const azimuth = Math.atan2(
    -Math.sin(hourAngle),
    Math.tan(declination) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle)
  );

  return { azimuth: normaliseDegrees(deg(azimuth)), elevation: deg(elevation) };
}

/// The sun's track across one day.
export function sunArc(date: Date, latitude: number, longitude: number, stepMinutes = 20): SunSample[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const samples: SunSample[] = [];
  for (let minute = 0; minute < 24 * 60; minute += stepMinutes) {
    const moment = new Date(start.getTime() + minute * 60000);
    samples.push({ date: moment, position: sunPosition(moment, latitude, longitude) });
  }
  return samples;
}

/// Smallest angle between two compass bearings, 0-180.
export function angularDistance(a: number, b: number): number {
  const diff = Math.abs(normaliseDegrees(a - b));
  return diff > 180 ? 360 - diff : diff;
}

/// Hours of direct sun a spot gets, given which way it faces and how high the
/// surroundings are.
///
/// The model: a spot facing `bearing` catches the sun whenever the sun is above the
/// horizon, within 90 degrees either side of that bearing, and high enough to clear
/// whatever is around it. `obstructionDegrees` is the elevation of the skyline - 0 for an
/// open field, 25 or so for a spot hemmed in by houses.
export function directSunHours(
  date: Date,
  latitude: number,
  longitude: number,
  bearing: number,
  obstructionDegrees = 12
): number {
  const stepMinutes = 10;
  const samples = sunArc(date, latitude, longitude, stepMinutes);
  return sunHoursFromArc(samples, bearing, obstructionDegrees, stepMinutes);
}

/// The same sum, but over an arc you already have.
///
/// The arc depends only on the date and where you are standing; the bearing and the
/// skyline are what the user is moving. Splitting them means turning on the spot
/// re-runs a filter over a cached arc instead of recomputing the sun's whole day.
export function sunHoursFromArc(
  samples: SunSample[],
  bearing: number,
  obstructionDegrees: number,
  stepMinutes: number
): number {
  const lit = samples.filter(
    (s) => s.position.elevation > obstructionDegrees && angularDistance(s.position.azimuth, bearing) <= 90
  );
  return (lit.length * stepMinutes) / 60;
}

export function lightNeedForHours(hours: number): 'fullSun' | 'partialShade' | 'shade' {
  if (hours >= 6) return 'fullSun';
  if (hours >= 3) return 'partialShade';
  return 'shade';
}

export function compassLabel(bearing: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(normaliseDegrees(bearing) / 45) % 8];
}
