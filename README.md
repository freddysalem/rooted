# Plant Partner — Expo build

The same app as the native SwiftUI version, rebuilt in React Native so it runs on a phone
through **Expo Go** without Xcode.

## Running it

```bash
npx expo start --lan --port 8100
```

Scan the QR code with the Camera app (iOS) or the Expo Go app. Phone and Mac must be on
the same Wi-Fi. If they aren't, use `npx expo start --tunnel` instead.

The explicit `--port 8100` matters: this machine already runs other Expo projects on 8081
and 8090, and without a free port the CLI stops at a prompt instead of showing a QR code.

**Expo Go must match.** This project is on SDK 54; a mismatched Expo Go refuses it with
"Project is incompatible with this version of Expo Go". Update it from the App Store.

## What's here

| Tab | What it does |
| --- | --- |
| **Allotment** | 3×4 grid of beds. Press a plant and it pulses with a haptic. Weather header, storm/frost alerts, one-tap watering row. |
| **Discover** | What's in season, what to sow this month, and a job list that reacts to your own plot. |
| **Sun spot** | Point the phone at a spot; it computes the sun's real track for your coordinates and reports the direct-sun hours, then names plants that suit it. |
| **Badges** | Ten private milestones. No leaderboard, by design. |

Tapping a plant opens its detail sheet: growth stage and progress to harvest,
weather-adjusted watering advice, a height log, stage-aware pruning reminders, and a diary.

## How the real bits work

**Sun path** (`src/services/sunPath.ts`) is the US Naval Observatory low-precision solar
position algorithm — accurate to about a tenth of a degree. From your coordinates and the
date it derives the sun's azimuth and elevation, samples the whole day, and counts the
samples that both clear your skyline and fall within 90° of the direction you're facing.
That count is the spot's direct-sun hours. Heading comes from `expo-location`'s compass.

**Measurement** (`src/screens/MeasureModal.tsx`) uses the reference-object trick: stand
something of known size in the soil and the ratio between it and the plant is fixed
regardless of camera distance, so `plant_cm = reference_cm × (plant_on_screen ÷ reference_on_screen)`.
`expo-sensors` drives a spirit level, because a tilted frame skews that ratio.

**Plant sprites** (`src/components/PlantSprite.tsx`) are drawn as SVG, not photographed.
Every dimension is driven by the plant's real progress toward harvest, so the drawing
tracks the plant. Each sways on its own seeded clock, hinged at the soil rather than the
middle, so a bed of twelve doesn't look like twelve copies of one animation.

State lives in one React context and persists to AsyncStorage.

## Differences from the native build

- Weather is the same deterministic seasonal model. On the native side WeatherKit would
  slot in behind it; from Expo Go an HTTP forecast API is the equivalent. Neither changes
  a line of UI.
- Photo plant-ID and automatic measurement are still not built — they need Vision/Core ML
  natively, or a hosted model from Expo. The manual flow already does the arithmetic the
  automatic version would feed.
- Social feed, community diary and the bee messenger need a backend and accounts.
- Subscription billing isn't wired up; in-app purchases need a development build, not
  Expo Go.

## Screenshots

`scripts/screenshots.mjs` drives the web build in headless Chrome, seeds a garden, taps
through every flow and writes PNGs at 375px and 1280px. It needs Chrome in
`/Applications` and nothing else that isn't already installed.

```bash
npx expo start --web --port 8110     # in one terminal
npm run shots                        # full walkthrough into shots/<timestamp>/
npm run shots -- --out shots/before  # named folder, for before/after comparisons
node scripts/screenshots.mjs --device mobile --garden small tap:Discover shot:discover
```

Steps are `shot:name`, `tap:Text`, `tapfuzzy:Text`, `type:Placeholder=text`, `scroll:px`
and `wait:ms`. The run exits non-zero if a step fails, and prints any console errors.
