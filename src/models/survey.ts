/// A saved sun survey: one spot in the garden, measured once and kept.
///
/// The screen used to record a single boolean - "you have done this" - which was enough
/// for a badge and no use to anybody. A garden has several spots and they are different:
/// the bed by the south fence and the corner behind the shed want different plants, and
/// the point of measuring is to be able to compare them later.

export interface SunSurvey {
  id: string;
  /** What the grower calls this spot. */
  name: string;
  /** ISO date it was taken. Sun hours change through the year, so this matters. */
  takenOn: string;
  /** Compass bearing the spot faces, degrees from north. */
  bearing: number;
  /** How enclosed it is, in degrees of horizon blocked. */
  obstruction: number;
  /** Hours of direct sun on the day it was taken. */
  sunHours: number;
  /** Coordinates it was worked out for, so a survey taken elsewhere is not silently reused. */
  latitude: number;
  longitude: number;
  /** Where the coordinates came from, for the honest line under the result. */
  placeName: string;
}

export function surveyLightLabel(sunHours: number): string {
  if (sunHours >= 6) return 'Full sun';
  if (sunHours >= 3) return 'Partial shade';
  return 'Shade';
}

/// Which way the spot faces, in words. The bearing is the direction you pointed the
/// phone, which is the direction the bed looks out on.
export function aspectLabel(bearing: number): string {
  const points = ['North', 'North-east', 'East', 'South-east', 'South', 'South-west', 'West', 'North-west'];
  return points[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

export function surveySummary(survey: SunSurvey): string {
  return `${surveyLightLabel(survey.sunHours)} · ${survey.sunHours.toFixed(1)}h · ${aspectLabel(survey.bearing).toLowerCase()}-facing`;
}
