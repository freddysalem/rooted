# Plant Partner

A gamified gardening companion for iPhone — a native SwiftUI app that helps people grow
their own food by giving every plant an on-screen twin that grows as the real one does.

Built from the concept notes: allotment home screen, sun-path spot finder, weather-aware
watering, photo-based measurement, seasonal discovery, and private badges.

## Running it

Requires **Xcode** (not just the Command Line Tools). Open `PlantPartner.xcodeproj`,
pick an iPhone simulator, and press Run. Deployment target is iOS 17.

To run on your own iPhone you'll need to set a signing team: select the `PlantPartner`
target → Signing & Capabilities → Team. A free Apple ID works for on-device builds.

## What's here

| Screen | What it does |
| --- | --- |
| **Allotment** | The home screen. A 3×4 grid of beds; press a plant and it pulses back with a haptic. Weather header, storm/frost alerts, and a one-tap watering row. |
| **Discover** | What's in season, what to sow this month, and a generated job list that reacts to your own plot. |
| **Sun spot** | Point the phone at a spot; it computes the sun's real track for your coordinates and tells you how many hours of direct sun that patch gets, then names plants that suit it. |
| **Badges** | Ten private, collectible milestones. No leaderboard, by design. |

Tapping a plant opens its detail sheet: growth stage and progress to harvest, weather-adjusted
watering advice, a height log, stage-aware pruning reminders, and a free-text diary.

## How the real bits work

**Sun path** (`Services/SunPath.swift`) is the US Naval Observatory low-precision solar
position algorithm — accurate to about a tenth of a degree. From your coordinates and the
date it derives the sun's azimuth and elevation, samples the whole day, and counts the
samples that both clear your skyline and fall within 90° of the direction you're facing.
That count is the spot's direct-sun hours.

**Measurement** (`Views/MeasurePlantView.swift`) uses the reference-object trick: stand
something of known size in the soil and the ratio between it and the plant is fixed
regardless of camera distance, so `plant_cm = reference_cm × (plant_on_screen ÷ reference_on_screen)`.
The device motion sensor drives a spirit level, because a tilted frame skews that ratio.

**Plant sprites** (`Views/PlantSprite.swift`) are drawn in SwiftUI shapes, not photographed
or pre-rendered. Every dimension is driven by the plant's real progress toward harvest, so
the drawing genuinely tracks the plant. Each sways on its own seeded clock so a bed of
twelve doesn't look like twelve copies of one animation.

**Growth** is derived from days planted against the species' days-to-harvest. The catalogue
is 20 species on a UK growing calendar.

## What is stubbed, and what it would take

- **Weather** is a deterministic seasonal model (`SeasonalMockWeather`) behind a
  `WeatherProviding` protocol. Swapping in Apple's WeatherKit is a drop-in conformance —
  every screen above it stays identical. It needs the WeatherKit entitlement, which
  requires a paid Apple Developer account.
- **Plant ID from a photo** and **automatic measurement from a photo** are not built. Both
  need Vision/Core ML: a classifier for ID, and object detection to find the reference
  object's bounding box. The manual measurement flow already implements the maths that the
  automatic version would feed.
- **Social feed, community diary and the bee messenger** are not built — they need a backend
  and accounts, which is a separate piece of work from the single-user app.
- **Subscription billing** is not wired up. StoreKit 2 with a 6-month product would slot in
  behind a paywall on the Discover tab.

## Layout

```
PlantPartner/
  Models/       Species catalogue, Planting, Badge, Garden store
  Services/     Solar maths, weather, location, haptics, JSON persistence
  Views/        The four tabs plus the plant detail and measurement sheets
  Theme.swift   Palette and shared components
```

State is a single `Garden` observable object saved as pretty-printed JSON in Application
Support — small, rarely written, and trivially inspectable.
