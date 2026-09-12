# Catalogue audit — 12 September 2026

All 165 species in `src/models/species.ts` were reviewed against published horticultural sources.
**31 records were corrected**; 134 were checked and left as they were.

Sowing and harvest months are for an outdoor temperate British garden, except the
African indigenous crops, which are written for Nairobi and its two rainy seasons.

## Corrections applied

| Species | What changed | Why | Confidence |
|---|---|---|---|
| `eggplant` | look.form | Aubergine was drawn as a 'climber'; it is an upright bush that is pinched at ~30cm to make it bushier and then caned for support, so a climbing sprite would not read as an aubergine plant. | high |
| `alyssum` | look.flower | Sweet alyssum is a crucifer (Brassicaceae) with four rounded petals, not five. | high |
| `broccolirabe` | look.flower | Broccoli rabe is Brassica rapa; its small yellow flowers are four-petalled crosses, not five-petalled. | medium |
| `rosemary` | look.flower | The sprite had no flower at all; rosemary's small pale violet-blue flowers along the stems from mid-spring into summer are one of its most recognisable features. | medium |
| `goodkinghenry` | daysToHarvest | Good King Henry is a perennial that should only be picked lightly in its first year after planting, so the first meaningful crop is the spring of year two, not 120 days from sowing. | medium |
| `collards` | sowMonths, harvestMonths | Collards is the sukuma wiki record and must follow Nairobi's bimodal rains (long rains Mar-May, short rains Oct-Dec) rather than a British sow-in-summer, crop-in-winter calendar; at 60-90 days from seed the first cut falls in May-Jul and Dec-Feb. | medium |
| `sweetpotato` | sowMonths, harvestMonths, difficulty | Sweet potato is on the Nairobi list but was recorded on a British calendar (single May planting, Sep-Oct lift, difficulty 3); in Kenya slips go in at the onset of each rains and roots are lifted 3-5 months later, and it is a straightforward smallholder staple rather than a fussy crop. | medium |
| `amaranth` | sowMonths, harvestMonths | Amaranth is on the African indigenous crop list and must follow the Nairobi calendar, but the record carried a British calendar (sow May-June, harvest Aug-Oct); in Kenya amaranth is sown at the onset of each rainy season (long rains Mar-May, short rains Oct-Dec) with grain ready about 3-4 months later. | high |
| `seakale` | daysToHarvest, tip | daysToHarvest of 365 implied a crop in year one; the RHS says sea kale needs to be established for two years (2-5 years to maturity) before shoots are cut, so the old tip's 'do not pick in the first year' understated the wait. | high |
| `milkweed` | daysToHarvest, harvestMonths | Asclepias is a perennial that takes two to three years from seed to flower, so 120 days (flowers in the sowing year) was wrong; NC State gives a May-August bloom window, making September late. | medium |
| `licorice` | daysToHarvest, look.flower | daysToHarvest of 900 (2.5 years) contradicted the record's own tip and the RHS, which say roots are lifted when plants are at least three years old; the plant also carried no flower although its pale blue-to-violet vetch-like spikes in late summer are its one distinguishing feature against every other green bushy herb sprite. | medium |
| `peanut` | look.flower | The only part of a peanut plant visible above ground is its small yellow pea-like flower (the pods are geocarpic and form underground), and the sprite had no flower at all. | high |
| `turnip` | light | Record said partialShade; the RHS grow-your-own guide states turnips like a sunny spot. | medium |
| `okra` | sowMonths, harvestMonths | RHS sows okra in March or April (the record omitted March and added May) and gives the picking window as mid-summer to autumn, roughly July to October, wider than the recorded Aug-Sep. | high |
| `brusselssprouts` | look.fruit | Sprouts form all the way up the main stem at the base of every leaf stalk, so a stalk drawn with only three buttons does not read as Brussels sprouts; raised the count and trimmed the size slightly so they still fit the stem. | medium |
| `lablab` | look.flower | Lablab's purple-and-white pea flowers in long erect racemes are its most recognisable feature and are carried at the same time as the pods, but the sprite showed pods only, leaving it hard to tell from any other climbing bean. | medium |
| `slenderleaf` | look.flower | Crotalaria ochroleuca/brevidens carries conspicuous yellow pea flowers with reddish-purple veining; without them the sprite is an anonymous green bush that looks the same as the jute mallow sprite sitting next to it in the same category. | medium |
| `pepper` | look.form | Peppers were drawn as a climber; Capsicum is a compact bushy shrub that never climbs, so the sprite reads as the wrong plant entirely. | high |
| `africaneggplant` | look.form | African eggplant was drawn as a climber; Solanum aethiopicum is an erect, much-branched shrub and is explicitly not a climbing plant. | high |
| `sage` | daysToHarvest, look.flower | daysToHarvest of 120 contradicted the record's own April/May sowing and May harvest start - RHS says seed-raised sage needs at least a year to reach harvestable size - and the sprite omitted sage's conspicuous blue-purple summer flower spikes. | high |
| `medlar` | matureHeightCm, daysToHarvest | Height was far too small (RHS gives an ultimate height of 4-8m, 4-6m on a grafting rootstock) and one year to a first crop is not achievable - grafted medlars only come into fruit after several years. | medium |
| `spiderplant` | matureHeightCm, look.flower | Cleome gynandra is an erect annual to about one metre, not 60cm, and the sprite showed no flower even though the plant is named for its showy white flowers with long purple stamens - without them it is an unidentifiable green blob. | medium |
| `ethiopiankale` | matureHeightCm, look.form | Brassica carinata is an erect annual herb reaching 1.2m or more, so 70cm is too short and a ground-hugging 'rosette' form misrepresents its upright, branching habit. | medium |
| `pumpkinleaf` | look.flower | The sprite had no flower at all, yet the single most recognisable feature of a pumpkin vine is its very large 5-parted yellow flower (7-15cm across); without it the record draws as a generic anonymous vine. | high |
| `broadbean` | look.form, look.flower | Broad bean is a stiffly erect, unbranched plant that is staked rather than trained, so 'climber' is wrong, and its white flowers blotched purple-black are its single most recognisable feature but were missing entirely. | high |
| `catnip` | look.green, look.flower | True catnip (Nepeta cataria) has white flowers with pale purple spotting and downy grey-green foliage; the record drew solid lilac flowers on bright green, which is Nepeta x faassenii, a different plant that cats largely ignore. | high |
| `mint` | light | Mint is listed as full sun to partial shade, not a shade plant; in deep shade it goes leggy and loses oil content. | medium |
| `tomatillo` | look.flower | Tomatillo carries conspicuous yellow star/bell flowers with a dark centre all through cropping; without them the sprite is just green balls on a bush and reads as an unripe tomato. | high |
| `marshmallow` | light, daysToHarvest | Marsh mallow needs full sun (it cannot grow in shade) and the root is lifted in autumn of the SECOND year once the leaves have died down, not 150 days after sowing. | medium |
| `moringa` | daysToHarvest | Moringa grown as a leaf crop is first cut back at roughly four months from sowing (116 days in the ISHS density/frequency trial, 60-75 days for high-density direct-seeded stands), so 240 days overstates the wait for a first leaf harvest. | medium |
| `bittermelon` | look.flower | Bitter melon carries conspicuous yellow five-petalled flowers in the leaf axils at the same time as the fruit; the sprite showed fruit only. | medium |

## Sources cited

- https://en.wikipedia.org/wiki/Brassicaceae
- https://en.wikipedia.org/wiki/Lobularia_maritima
- https://en.wikipedia.org/wiki/Mespilus_germanica
- https://fieldreport.caes.uga.edu/publications/B1181/
- https://hgic.clemson.edu/factsheet/peanut/
- https://infonet-biovision.org/crops-fruits-vegetables/cabbagekalesother-brassicas-revised
- https://infonet-biovision.org/crops-fruits-vegetables/ethiopian-kale-kanzirakansera-new
- https://infonet-biovision.org/crops-fruits-vegetables/sweet-potato
- https://infonet-biovision.org/indigenous-plants/amaranth-revised
- https://infonet-biovision.org/indigenous-plants/crotalaria-new
- https://infonet-biovision.org/indigenous-plants/spider-plant-revised
- https://pfaf.org/user/Plant.aspx?LatinName=Althaea+officinalis
- https://plants.ces.ncsu.edu/plants/arachis-hypogaea/
- https://plants.ces.ncsu.edu/plants/asclepias-tuberosa/
- https://plants.ces.ncsu.edu/plants/cucurbita-moschata/
- https://plants.ces.ncsu.edu/plants/lablab-purpureus/
- https://plants.ces.ncsu.edu/plants/lobularia-maritima/
- https://plants.ces.ncsu.edu/plants/mentha-spicata/
- https://plants.ces.ncsu.edu/plants/momordica-charantia/
- https://plants.ces.ncsu.edu/plants/nepeta-cataria/
- https://plants.ces.ncsu.edu/plants/physalis-philadelphica/
- https://plants.ces.ncsu.edu/plants/vicia-faba/
- https://tropical.theferns.info/viewtropical.php?id=Solanum+aethiopicum
- https://tropicalforages.info/text/entities/lablab_purpureus.htm
- https://ucanr.edu/node/125130/printable/print
- https://www.fao.org/giews/countrybrief/country.jsp?code=KEN
- https://www.ishs.org/ishs-article/1158_12
- https://www.rhs.org.uk/fruit/medlars/grow-your-own
- https://www.rhs.org.uk/herbs/sage/grow-your-own
- https://www.rhs.org.uk/plants/1024/althaea-officinalis/details
- https://www.rhs.org.uk/plants/11088/mespilus-germanica-f/details
- https://www.rhs.org.uk/plants/384211/salvia-rosmarinus-ro/details
- https://www.rhs.org.uk/plants/4710/crambe-maritima/details
- https://www.rhs.org.uk/plants/525046/blitum-bonus-henricus/details
- https://www.rhs.org.uk/plants/8071/glycyrrhiza-glabra/details
- https://www.rhs.org.uk/vegetables/aubergines/grow-your-own
- https://www.rhs.org.uk/vegetables/broad-beans/grow-your-own
- https://www.rhs.org.uk/vegetables/brussels-sprouts/grow-your-own
- https://www.rhs.org.uk/vegetables/okra/grow-your-own
- https://www.rhs.org.uk/vegetables/peppers/grow-your-own
- https://www.rhs.org.uk/vegetables/pumpkins/grow-your-own
- https://www.rhs.org.uk/vegetables/turnips/grow-your-own
- https://www.standardmedia.co.ke/farmkenya/article/2001495241/amaranthterere-how-to-cultivate-this-healthy-delicacy
- https://www.wildflower.org/learn/how-to/how-to-germinate-milkweeds

## Left for a human decision

The reviewers flagged these and did not change them. Each needs a judgement call
rather than a source.

- **`chickpea`** — its months are written on a Kenyan two-season calendar, but it is not
  on the African-crops list, so it is currently wrong for Bristol and right for Nairobi.
- **`avocado`** — `harvestMonths` says September to November, while its own tip correctly
  says a British avocado will not fruit. The data model has no way to say "no harvest".
- **`asparagus`** — filed as `family: 'grain'`. It is Asparagaceae; this looks like a
  data-entry slip and it affects how the plant is drawn and grouped.
- **`arrowroot`** — sold in Kenya as *nduma*, which is taro (*Colocasia esculenta*), not
  true arrowroot (*Maranta arundinacea*). The growing data matches taro. If a judge asks
  for the Latin name, the answer is *Colocasia*.
- **`quinoa`** — drawn with a six-petalled flower, which renders as a daisy. Quinoa's seed
  head is a dense panicle; `fruit: { shape: 'head' }` is the convention the catalogue
  already uses for sorghum.
- **`dill`** — the tip repeats the common "do not plant near fennel, they cross" advice.
  They are different genera and no authoritative source could be found for it.
- **`collards`** and **`sweetpotato`** tips are written for a British plot but both crops
  are on the Kenyan list.
- **`kale`**, **`blackberry`** — recorded as `partialShade` where the RHS says they prefer
  sun and merely tolerate shade. This is really a question about what `light` means:
  "what it needs" or "what it will put up with".

## How to read the review

Every correction above is backed by a source that was actually fetched. Records that
already matched standard growing guidance were left alone, and not all of those were
individually re-checked against a primary source. Two sources wanted for the Kenyan
grain amaranth entry (KALRO's manual, OSU Extension's milkweed guide) were unreachable;
those corrections rest on other citations.
