/// Where the growing data comes from.
///
/// The app tells people when to sow, how long to wait and how much water to give. That
/// is advice, and advice with no provenance is just confident guessing - so the sources
/// are named in the app rather than in a slide deck.
///
/// Kept deliberately honest, including about the gaps. See AUDIT.md for the full record.

export interface DataSource {
  name: string;
  url: string;
  /** What this source was actually used for. */
  usedFor: string;
}

/// Reviewed on 12 September 2026: all 165 species in the catalogue were checked against
/// published horticultural sources, and 31 records were corrected.
export const REVIEWED_ON = '12 September 2026';
export const SPECIES_REVIEWED = 165;
export const CORRECTIONS_MADE = 31;

export const SOURCES: DataSource[] = [
  {
    name: 'Royal Horticultural Society',
    url: 'https://www.rhs.org.uk',
    usedFor: 'British sowing and harvest windows, sun and water needs, mature sizes',
  },
  {
    name: 'NC State Extension Plant Toolbox',
    url: 'https://plants.ces.ncsu.edu',
    usedFor: 'Growth habit, flower and fruit descriptions used for the plant drawings',
  },
  {
    name: 'Infonet-Biovision',
    url: 'https://infonet-biovision.org',
    usedFor: 'Kenyan crops: African indigenous vegetables, sowing against the two rainy seasons',
  },
  {
    name: 'FAO GIEWS country briefs',
    url: 'https://www.fao.org/giews/countrybrief/country.jsp?code=KEN',
    usedFor: 'Kenyan long and short rains, used to date the Nairobi sowing calendar',
  },
  {
    name: 'UGA Extension',
    url: 'https://extension.uga.edu',
    usedFor: 'Collards and other brassicas grown outside a British season',
  },
  {
    name: 'Plants For A Future',
    url: 'https://pfaf.org',
    usedFor: 'Perennial and forgotten crops: skirret, sea kale, good King Henry, marshmallow',
  },
  {
    name: 'Clemson Home & Garden Information Center',
    url: 'https://hgic.clemson.edu',
    usedFor: 'Warm-climate vegetables and their light needs',
  },
  {
    name: 'Tropical Forages / Useful Tropical Plants',
    url: 'https://www.tropicalforages.info',
    usedFor: 'Pigeon pea, lablab, cowpea and other tropical legumes',
  },
  {
    name: 'Lady Bird Johnson Wildflower Center',
    url: 'https://www.wildflower.org',
    usedFor: 'Flowering times for pollinator plants',
  },
  {
    name: 'International Society for Horticultural Science',
    url: 'https://www.ishs.org',
    usedFor: 'Moringa leaf-harvest trials',
  },
];

/// The honest caveat. Read it before quoting the review at anyone.
export const REVIEW_CAVEAT =
  'Every species was reviewed and 31 were corrected, each against a published source. '
  + 'Records already consistent with standard growing guidance were left as they were, and '
  + 'not all of those were re-checked against a primary source individually. Sowing dates are '
  + 'a guide for an average year, not a promise about yours.';
