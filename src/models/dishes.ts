import { speciesById } from './species';

/// Cook what you grow. A dish is a list of things you could grow for it; the app works
/// out how many you already have in the ground.

export type DishTag = 'quick' | 'noCook' | 'batch' | 'wholeMeal';

export interface Dish {
  id: string;
  name: string;
  blurb: string;
  /** Ingredients you could grow. Shop-bought staples are left out on purpose. */
  speciesIds: string[];
  tags: DishTag[];
}

export const dishTagLabel: Record<DishTag, string> = {
  quick: 'Quick',
  noCook: 'No cooking',
  batch: 'Batch cook',
  wholeMeal: 'Whole meal',
};

export const DISHES: Dish[] = [
  { id: 'pea_mint_smash', name: 'Garden pea and mint smash', blurb: 'Crush warm peas with mint, oil and lemon. On toast, or beside anything.', speciesIds: ['pea', 'mint'], tags: ['quick'] },
  { id: 'rocket_radish_salad', name: 'Rocket, radish and shaved carrot salad', blurb: 'Peppery leaves, hot radish, sweet carrot. Dress it and eat it within the hour.', speciesIds: ['arugula', 'radish', 'carrot'], tags: ['quick', 'noCook'] },
  { id: 'kale_bean_stew', name: 'Kale and white bean stew', blurb: 'Onion, garlic, a tin of beans, and as much kale as the pot will take.', speciesIds: ['kale', 'onion', 'garlic', 'rosemary'], tags: ['batch', 'wholeMeal'] },
  { id: 'tomato_basil_pasta', name: 'Tomato and basil pasta', blurb: 'Ripe tomatoes barely cooked, torn basil at the end.', speciesIds: ['tomato', 'basil', 'garlic'], tags: ['quick', 'wholeMeal'] },
  { id: 'courgette_fritters', name: 'Courgette fritters', blurb: 'Grated, salted, squeezed, fried. The answer to a glut.', speciesIds: ['courgette', 'mint', 'chives'], tags: ['quick'] },
  { id: 'leek_potato_soup', name: 'Leek and potato soup', blurb: 'Two vegetables, a pan of stock, and a cold evening.', speciesIds: ['leek', 'potato', 'thyme'], tags: ['batch', 'wholeMeal'] },
  { id: 'chard_eggs', name: 'Chard with eggs', blurb: 'Wilt the leaves, crack eggs into them, lid on for four minutes.', speciesIds: ['chard', 'garlic'], tags: ['quick', 'wholeMeal'] },
  { id: 'roast_roots', name: 'Roast roots with sage', blurb: 'Parsnip, beetroot and carrot in one tray, sage leaves crisped on top.', speciesIds: ['parsnip', 'beetroot', 'carrot', 'sage'], tags: ['batch'] },
  { id: 'rhubarb_crumble', name: 'Rhubarb crumble', blurb: 'The first pull of the year, with more sugar than you think.', speciesIds: ['rhubarb'], tags: ['batch'] },
  { id: 'broad_bean_bruschetta', name: 'Broad bean bruschetta', blurb: 'Double-podded beans, lemon, oil, on grilled bread.', speciesIds: ['broadbean', 'mint', 'garlic'], tags: ['quick', 'noCook'] },
  { id: 'nasturtium_salad', name: 'Salad with edible flowers', blurb: 'Lettuce, peppery nasturtium leaves and flowers, borage stars on top.', speciesIds: ['lettuce', 'nasturtium', 'borage'], tags: ['quick', 'noCook'] },
  { id: 'mchicha', name: 'Mchicha (amaranth in coconut)', blurb: 'Amaranth greens simmered with onion, tomato and coconut milk.', speciesIds: ['amaranth', 'onion', 'tomato'], tags: ['quick', 'wholeMeal'] },
  { id: 'managu_ugali', name: 'Managu and tomato with ugali', blurb: 'African nightshade leaves cooked down with tomato, eaten with maize meal.', speciesIds: ['africannightshade', 'tomato', 'onion'], tags: ['quick', 'wholeMeal'] },
  { id: 'kunde_groundnut', name: 'Kunde with groundnuts', blurb: 'Cowpea leaves in a groundnut sauce. Filling, and it keeps.', speciesIds: ['cowpea', 'peanut', 'onion', 'tomato'], tags: ['batch', 'wholeMeal'] },
  { id: 'saga_mrenda', name: 'Saga and mrenda', blurb: 'Spider plant and jute mallow leaves, the traditional pairing, with a little milk.', speciesIds: ['spiderplant', 'jutemallow', 'onion'], tags: ['quick'] },
  { id: 'sukuma_wiki', name: 'Sukuma wiki', blurb: 'Collards shredded and fried with onion and tomato. The name means "stretch the week".', speciesIds: ['collards', 'onion', 'tomato'], tags: ['quick', 'wholeMeal'] },
  { id: 'pigeon_pea_stew', name: 'Pigeon pea stew', blurb: 'Dried pigeon peas cooked slowly with tomato and coconut.', speciesIds: ['pigeonpea', 'tomato', 'onion'], tags: ['batch', 'wholeMeal'] },
  { id: 'millet_porridge', name: 'Finger millet porridge', blurb: 'Uji. Fermented overnight, then cooked into a breakfast that lasts till lunch.', speciesIds: ['fingermillet'], tags: ['batch'] },
];

export interface DishMatch {
  dish: Dish;
  /** Species ids from the dish that are growing in the plot. */
  growing: string[];
  /** Species ids still to sow. */
  missing: string[];
}

/// Dishes ordered by how much of them the plot can already supply. Dishes with nothing
/// growing are left out; use `starterCombos` for an empty garden.
export function dishesForGarden(plantingSpeciesIds: string[]): DishMatch[] {
  const growing = new Set(plantingSpeciesIds);
  return DISHES.map((dish) => ({
    dish,
    growing: dish.speciesIds.filter((id) => growing.has(id)),
    missing: dish.speciesIds.filter((id) => !growing.has(id)),
  }))
    .filter((match) => match.growing.length > 0)
    .sort((a, b) =>
      b.growing.length / b.dish.speciesIds.length - a.growing.length / a.dish.speciesIds.length
      || b.growing.length - a.growing.length
    );
}

/// For an empty plot: grow these, make this.
export const starterCombos: { dish: Dish; growThese: string[] }[] = [
  { dish: DISHES.find((d) => d.id === 'rocket_radish_salad')!, growThese: ['arugula', 'radish', 'carrot'] },
  { dish: DISHES.find((d) => d.id === 'pea_mint_smash')!, growThese: ['pea', 'mint'] },
  { dish: DISHES.find((d) => d.id === 'sukuma_wiki')!, growThese: ['collards', 'onion', 'tomato'] },
];

export const dishSpeciesNames = (ids: string[]) => ids.map((id) => speciesById(id).name);
