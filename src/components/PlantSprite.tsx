import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { PlantLook, LeafShape, SproutKind } from '../models/species';
import { useIsVisible } from './Visibility';
import { useReduceMotion } from '../hooks/useReduceMotion';

/// The on-screen twin of a real plant.
///
/// It is drawn, not photographed - no camera needed - and it is drawn from a description
/// of the actual species rather than of its family. A carrot is feathery foliage over an
/// orange shoulder; a beetroot is red-veined leaves over a purple one. Sharing one picture
/// across every leafy green was the single biggest thing making the plot look generic.
///
/// Growth is staged rather than a uniform shrink. Everything begins as two seed leaves,
/// because everything really does; the species form only appears once it has something to
/// show, and fruit arrives last. A young plant should look young, not miniature.

export type Stage = 'seedling' | 'juvenile' | 'mature' | 'ripe';

/// A stable small integer from any string, so a species without a planting still sways
/// on its own clock rather than in lockstep with every other tile.
export function seedFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) % 9973;
  return hash;
}

export function stageFor(progress: number): Stage {
  if (progress < 0.14) return 'seedling';
  if (progress < 0.46) return 'juvenile';
  if (progress < 0.82) return 'mature';
  return 'ripe';
}

function PlantSpriteImpl({ look, progress, seed, height = 90 }: {
  look: PlantLook;
  progress: number;
  seed: number;
  height?: number;
}) {
  const sway = useRef(new Animated.Value(0)).current;
  const swayAmount = 1.4 + (seed % 4) * 0.4;
  const swayDuration = (2.3 + (seed % 6) * 0.33) * 1000;
  const visible = useIsVisible();
  const reduceMotion = useReduceMotion();

  // The sway only runs on the tab you are looking at. A catalogue screen can hold a
  // hundred of these, and four tabs stay mounted at once, so an unconditional loop was
  // asking the UI thread to drive several hundred animations to show a few dozen.
  useEffect(() => {
    if (!visible || reduceMotion) {
      sway.stopAnimation();
      sway.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: swayDuration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: swayDuration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway, swayDuration, visible, reduceMotion]);

  const rotate = sway.interpolate({
    inputRange: [0, 1],
    outputRange: [`-${swayAmount}deg`, `${swayAmount}deg`],
  });

  const H = height;
  return (
    <View style={{ width: H, height: H, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View
        style={{
          width: H,
          height: H,
          transform: [{ translateY: H / 2 }, { rotate }, { translateY: -H / 2 }],
        }}
      >
        <Svg width={H} height={H} viewBox={`0 0 ${H} ${H}`}>
          <PlantBody look={look} progress={progress} H={H} seed={seed} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/// The drawing is pure for a given species and stage, and a list can hold a hundred of
/// them, so re-render only when the picture would actually differ.
export const PlantSprite = memo(PlantSpriteImpl, (a, b) =>
  a.look === b.look &&
  a.seed === b.seed &&
  a.height === b.height &&
  stageFor(a.progress) === stageFor(b.progress) &&
  Math.abs(a.progress - b.progress) < 0.01
);

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/// Mix a hex colour toward black or white, for shading without transparency.
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (to - c) * t);
  return `#${((1 << 24) | (mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)).toString(16).slice(1)}`;
}

/// One leaf, drawn in the species' own leaf shape.
function Leaf({ x, y, size, angle, colour, shape }: {
  x: number; y: number; size: number; angle: number; colour: string; shape: LeafShape;
}) {
  const t = `rotate(${angle} ${x} ${y})`;
  const dark = shade(colour, -0.16);
  const w = size;
  const h = size * 0.46;

  if (shape === 'blade' || shape === 'needle') {
    const bw = size * (shape === 'needle' ? 0.13 : 0.2);
    return (
      <G transform={t}>
        <Rect x={x - bw / 2} y={y - size} width={bw} height={size} rx={bw / 2} fill={colour} />
      </G>
    );
  }

  if (shape === 'feathery') {
    // Finely divided foliage: paired leaflets that shorten and sweep forward toward the
    // tip. Evenly spaced blobs of the same size read as a sea urchin, not a carrot top.
    const pairs = 6;
    return (
      <G transform={t}>
        <Path
          d={`M ${x} ${y} q ${size * 0.06} ${-size * 0.5} ${0} ${-size}`}
          stroke={dark}
          strokeWidth={size * 0.05}
          fill="none"
          strokeLinecap="round"
        />
        {Array.from({ length: pairs }, (_, i) => {
          const f = 0.2 + (i / (pairs - 1)) * 0.78;
          const ly = y - size * f;
          const len = size * (0.3 - 0.16 * f);
          const lift = 26 + f * 22;
          return (
            <G key={i}>
              <Ellipse cx={x - len * 0.5} cy={ly} rx={len * 0.5} ry={size * 0.032} fill={i % 2 ? colour : shade(colour, 0.12)} transform={`rotate(${-lift} ${x} ${ly})`} />
              <Ellipse cx={x + len * 0.5} cy={ly} rx={len * 0.5} ry={size * 0.032} fill={i % 2 ? shade(colour, 0.12) : colour} transform={`rotate(${lift} ${x} ${ly})`} />
            </G>
          );
        })}
      </G>
    );
  }

  if (shape === 'lobed') {
    return (
      <G transform={t}>
        <Path
          d={`M ${x} ${y} c ${-w * 0.5} ${-h * 0.2} ${-w * 0.62} ${-h * 1.1} ${-w * 0.18} ${-h * 1.5}
              c ${w * 0.12} ${h * 0.42} ${w * 0.24} ${h * 0.42} ${w * 0.36} ${0}
              c ${w * 0.44} ${h * 0.4} ${w * 0.32} ${h * 1.3} ${-w * 0.18} ${h * 1.5} z`}
          fill={colour}
        />
        <Path d={`M ${x} ${y} l 0 ${-h * 1.35}`} stroke={dark} strokeWidth={size * 0.05} />
      </G>
    );
  }

  if (shape === 'serrated') {
    const teeth = 5;
    let d = `M ${x} ${y}`;
    for (let i = 0; i < teeth; i++) {
      const f = (i + 1) / teeth;
      d += ` L ${x - w * 0.5 * f} ${y - h * 1.5 * (f - 0.08)} L ${x - w * 0.34 * f} ${y - h * 1.5 * f}`;
    }
    d += ` L ${x} ${y - h * 1.62}`;
    for (let i = teeth - 1; i >= 0; i--) {
      const f = (i + 1) / teeth;
      d += ` L ${x + w * 0.34 * f} ${y - h * 1.5 * f} L ${x + w * 0.5 * f} ${y - h * 1.5 * (f - 0.08)}`;
    }
    d += ' z';
    return (
      <G transform={t}>
        <Path d={d} fill={colour} />
        <Path d={`M ${x} ${y} l 0 ${-h * 1.5}`} stroke={dark} strokeWidth={size * 0.05} />
      </G>
    );
  }

  if (shape === 'heart') {
    return (
      <G transform={t}>
        <Path
          d={`M ${x} ${y} c ${-w * 0.62} ${-h * 0.5} ${-w * 0.52} ${-h * 1.7} ${0} ${-h * 1.9}
              c ${w * 0.52} ${h * 0.2} ${w * 0.62} ${h * 1.4} ${0} ${h * 1.9} z`}
          fill={colour}
        />
        <Path d={`M ${x} ${y} l 0 ${-h * 1.7}`} stroke={dark} strokeWidth={size * 0.05} />
      </G>
    );
  }

  if (shape === 'round') {
    return (
      <G transform={t}>
        <Circle cx={x} cy={y - h * 0.8} r={w * 0.42} fill={colour} />
        <Path d={`M ${x} ${y} l 0 ${-h * 0.8}`} stroke={dark} strokeWidth={size * 0.05} />
      </G>
    );
  }

  // oval, the default
  return (
    <G transform={t}>
      <Ellipse cx={x} cy={y - h * 0.78} rx={w * 0.3} ry={h * 0.8} fill={colour} />
      <Path d={`M ${x} ${y} l 0 ${-h * 1.4}`} stroke={dark} strokeWidth={size * 0.05} />
    </G>
  );
}

/// Two seed leaves and a shoot. Every plant starts here, which is both true and the
/// clearest possible signal that something has only just gone in.
/// The first fortnight, drawn the way the plant actually does it.
///
/// Nine germinations rather than one, picked per species by botany - see `sproutFor`.
/// The colours come from the species too, so two plants that sprout the same way still
/// do not look the same, and the seed nudges the spread a few degrees either way so a
/// row of them is not a row of clones.
function Sprout({ kind, leaf, cx, baseY, size, colour, deep, stem, seed }: {
  kind: SproutKind;
  /** The species' true-leaf shape, which the seed leaves hint at. */
  leaf: LeafShape;
  cx: number;
  baseY: number;
  size: number;
  colour: string;
  deep: string;
  stem: string;
  seed: number;
}) {
  const jitter = ((seed % 7) - 3) * 1.6;
  const pale = shade(colour, 0.12);
  // Two plants that germinate the same way still do not look alike: a round-leaved one
  // comes up with plump cotyledons, a fine-leaved one with narrow ones.
  const plump = COTYLEDON_PLUMPNESS[leaf];

  switch (kind) {
    case 'blade': {
      // One spike straight up, with the second just breaking after it.
      const h = size * 1.05;
      return (
        <G>
          <Path
            d={`M ${cx} ${baseY} q ${size * 0.05} ${-h * 0.55} ${size * 0.1} ${-h}`}
            stroke={colour} strokeWidth={size * 0.13} strokeLinecap="round" fill="none"
            transform={`rotate(${jitter} ${cx} ${baseY})`}
          />
          <Path
            d={`M ${cx} ${baseY} q ${-size * 0.1} ${-h * 0.36} ${-size * 0.16} ${-h * 0.6}`}
            stroke={pale} strokeWidth={size * 0.1} strokeLinecap="round" fill="none"
          />
        </G>
      );
    }

    case 'loop': {
      // The allium arch, still wearing the seed case at its tip.
      const h = size * 0.92;
      return (
        <G transform={`rotate(${jitter} ${cx} ${baseY})`}>
          <Path
            d={`M ${cx - size * 0.16} ${baseY} C ${cx - size * 0.2} ${baseY - h} ${cx + size * 0.34} ${baseY - h * 1.02} ${cx + size * 0.3} ${baseY - h * 0.52}`}
            stroke={colour} strokeWidth={size * 0.11} strokeLinecap="round" fill="none"
          />
          <Ellipse cx={cx + size * 0.3} cy={baseY - h * 0.5} rx={size * 0.08} ry={size * 0.1} fill="#C9B98E" />
        </G>
      );
    }

    case 'strap': {
      // One broad blade, still furled at the base.
      const h = size * 1.0;
      return (
        <G transform={`rotate(${jitter} ${cx} ${baseY})`}>
          <Path
            d={`M ${cx} ${baseY} q ${-size * 0.3} ${-h * 0.5} ${-size * 0.12} ${-h}
                q ${size * 0.26} ${h * 0.44} ${size * 0.12} ${h} z`}
            fill={colour}
          />
          <Path d={`M ${cx} ${baseY} q ${-size * 0.14} ${-h * 0.5} ${-size * 0.12} ${-h}`}
            stroke={shade(colour, -0.18)} strokeWidth={size * 0.03} fill="none" />
          <Ellipse cx={cx} cy={baseY - size * 0.06} rx={size * 0.11} ry={size * 0.08} fill={stem} />
        </G>
      );
    }

    case 'thread': {
      // Hair-fine, and already showing a divided true leaf between the cotyledons.
      const h = size * 0.7;
      return (
        <G>
          <Rect x={cx - size * 0.02} y={baseY - h} width={size * 0.04} height={h} rx={size * 0.02} fill={shade(colour, -0.2)} />
          {[-1, 1].map((side) => (
            <Path
              key={side}
              d={`M ${cx} ${baseY - h} q ${side * size * 0.2} ${-size * 0.04} ${side * size * 0.32} ${-size * 0.02}`}
              stroke={colour} strokeWidth={size * 0.045} strokeLinecap="round" fill="none"
              transform={`rotate(${side * jitter * 0.4} ${cx} ${baseY - h})`}
            />
          ))}
          {[-1, 0, 1].map((side, i) => (
            <Path
              key={`t${i}`}
              d={`M ${cx} ${baseY - h} q ${side * size * 0.06} ${-size * 0.14} ${side * size * 0.12} ${-size * 0.26}`}
              stroke={pale} strokeWidth={size * 0.035} strokeLinecap="round" fill="none"
            />
          ))}
        </G>
      );
    }

    case 'needle': {
      const h = size * 0.62;
      return (
        <G>
          <Rect x={cx - size * 0.025} y={baseY - h} width={size * 0.05} height={h} rx={size * 0.025} fill={stem} />
          {Array.from({ length: 6 }, (_, i) => {
            const f = i / 5;
            const side = i % 2 ? 1 : -1;
            return (
              <Path
                key={i}
                d={`M ${cx} ${baseY - h * (0.35 + f * 0.6)} l ${side * size * 0.16} ${-size * 0.08}`}
                stroke={i % 2 ? colour : pale} strokeWidth={size * 0.04} strokeLinecap="round"
              />
            );
          })}
        </G>
      );
    }

    case 'shoot': {
      // Off a cutting or a tuber: a woody stub, and leaves straight from the node.
      const h = size * 0.6;
      return (
        <G>
          <Rect x={cx - size * 0.06} y={baseY - h} width={size * 0.12} height={h} rx={size * 0.05} fill={stem} />
          {[-1, 1].map((side, i) => (
            <Ellipse
              key={side}
              cx={cx + side * size * 0.2}
              cy={baseY - h * (0.95 - i * 0.25)}
              rx={size * 0.19}
              ry={size * 0.11}
              fill={i ? colour : pale}
              transform={`rotate(${side * (26 + jitter)} ${cx} ${baseY - h}) `}
            />
          ))}
          <Ellipse cx={cx} cy={baseY - size * 0.03} rx={size * 0.14} ry={size * 0.06} fill={shade(stem, -0.2)} />
        </G>
      );
    }

    case 'heart': {
      const h = size * 0.6;
      return (
        <G>
          <Rect x={cx - size * 0.04} y={baseY - h} width={size * 0.08} height={h} rx={size * 0.04} fill={shade(colour, -0.24)} />
          {[-1, 1].map((side, i) => (
            <Path
              key={side}
              d={`M ${cx} ${baseY - h}
                  c ${side * size * 0.1} ${-size * 0.16} ${side * size * 0.32} ${-size * 0.16} ${side * size * 0.34} ${-size * 0.02}
                  c ${side * size * 0.01} ${size * 0.12} ${-side * size * 0.16} ${size * 0.15} ${-side * size * 0.34} ${size * 0.02} z`}
              fill={i ? colour : pale}
              transform={`rotate(${side * (10 + jitter)} ${cx} ${baseY - h})`}
            />
          ))}
        </G>
      );
    }

    case 'fat': {
      const h = size * 0.52;
      return (
        <G>
          <Rect x={cx - size * 0.07} y={baseY - h} width={size * 0.14} height={h} rx={size * 0.07} fill={shade(colour, -0.26)} />
          {[-1, 1].map((side, i) => (
            <Ellipse
              key={side}
              cx={cx + side * size * 0.26}
              cy={baseY - h}
              rx={size * 0.3}
              ry={size * 0.19}
              fill={i ? colour : pale}
              transform={`rotate(${side * (14 + jitter)} ${cx} ${baseY - h})`}
            />
          ))}
          <Path d={`M ${cx} ${baseY - h} l 0 ${-size * 0.16}`} stroke={deep} strokeWidth={size * 0.05} strokeLinecap="round" />
        </G>
      );
    }

    default: {
      const h = size * (0.56 + plump * 0.1);
      const rx = size * (0.2 + plump * 0.1);
      return (
        <G>
          <Rect x={cx - size * 0.05} y={baseY - h} width={size * 0.1} height={h} rx={size * 0.05} fill={shade(colour, -0.2)} />
          {[-1, 1].map((side, i) => (
            <Ellipse
              key={side}
              cx={cx + side * rx * 0.92}
              cy={baseY - h}
              rx={rx}
              ry={rx * (0.44 + plump * 0.22)}
              fill={i ? pale : colour}
              transform={`rotate(${side * (18 + jitter)} ${cx} ${baseY - h})`}
            />
          ))}
        </G>
      );
    }
  }
}

/// How fat the seed leaves are, hinted from the shape the true leaves will take.
const COTYLEDON_PLUMPNESS: Record<LeafShape, number> = {
  round: 1, heart: 0.85, lobed: 0.7, oval: 0.55, serrated: 0.5, blade: 0.3, feathery: 0.2, needle: 0.15,
};

/// What is left of the seed leaves once the true ones have taken over. They sit at the
/// base through the juvenile stage and then wither away, which is both what really
/// happens and a cheap way to make a half-grown plant read as half-grown.
function Cotyledons({ cx, baseY, size, colour }: {
  cx: number; baseY: number; size: number; colour: string;
}) {
  const faded = shade(colour, 0.24);
  return (
    <G opacity={0.75}>
      {[-1, 1].map((side) => (
        <Ellipse
          key={side}
          cx={cx + side * size * 0.17}
          cy={baseY - size * 0.05}
          rx={size * 0.17}
          ry={size * 0.075}
          fill={faded}
          transform={`rotate(${side * 12} ${cx} ${baseY})`}
        />
      ))}
    </G>
  );
}

function Fruit({ x, y, size, colour, shape }: {
  x: number; y: number; size: number; colour: string; shape: PlantLook['fruit'] extends undefined ? never : string;
}) {
  const dark = shade(colour, -0.2);
  const light = shade(colour, 0.3);

  if (shape === 'long') {
    return (
      <G>
        <Rect x={x - size * 0.22} y={y - size * 0.5} width={size * 0.44} height={size * 1.25} rx={size * 0.22} fill={colour} />
        <Rect x={x - size * 0.1} y={y - size * 0.36} width={size * 0.12} height={size * 0.85} rx={size * 0.06} fill={light} />
      </G>
    );
  }
  if (shape === 'pod') {
    return (
      <G>
        <Path
          d={`M ${x} ${y - size * 0.55} q ${size * 0.4} ${size * 0.55} ${0} ${size * 1.1} q ${-size * 0.22} ${-size * 0.55} ${0} ${-size * 1.1} z`}
          fill={colour}
        />
        <Circle cx={x + size * 0.1} cy={y} r={size * 0.09} fill={dark} />
      </G>
    );
  }
  if (shape === 'oval') {
    return (
      <G>
        <Ellipse cx={x} cy={y} rx={size * 0.42} ry={size * 0.6} fill={colour} />
        <Ellipse cx={x - size * 0.14} cy={y - size * 0.18} rx={size * 0.14} ry={size * 0.22} fill={light} />
      </G>
    );
  }
  if (shape === 'cluster') {
    return (
      <G>
        {[[0, 0], [-0.5, 0.15], [0.5, 0.15], [0, 0.55]].map(([dx, dy], i) => (
          <Circle key={i} cx={x + dx * size * 0.5} cy={y + dy * size} r={size * 0.27} fill={i % 2 ? colour : dark} />
        ))}
      </G>
    );
  }
  if (shape === 'cob') {
    return (
      <G>
        <Ellipse cx={x} cy={y} rx={size * 0.3} ry={size * 0.72} fill={colour} />
        <Path d={`M ${x - size * 0.3} ${y - size * 0.5} q ${size * 0.3} ${size * 0.9} ${0} ${size * 1.2}`} stroke={light} strokeWidth={size * 0.1} fill="none" />
      </G>
    );
  }
  if (shape === 'head') {
    return (
      <G>
        <Circle cx={x} cy={y} r={size * 0.62} fill={colour} />
        <Circle cx={x - size * 0.2} cy={y - size * 0.2} r={size * 0.3} fill={light} />
      </G>
    );
  }
  return (
    <G>
      <Circle cx={x} cy={y} r={size * 0.52} fill={colour} />
      <Circle cx={x - size * 0.17} cy={y - size * 0.17} r={size * 0.17} fill={light} />
    </G>
  );
}

function Bloom({ x, y, size, colour, centre, petals }: {
  x: number; y: number; size: number; colour: string; centre: string; petals: number;
}) {
  return (
    <G>
      {Array.from({ length: petals }, (_, i) => {
        const a = (360 / petals) * i;
        return (
          <Ellipse
            key={i}
            cx={x}
            cy={y - size * 0.62}
            rx={size * 0.24}
            ry={size * 0.46}
            fill={colour}
            transform={`rotate(${a} ${x} ${y})`}
          />
        );
      })}
      <Circle cx={x} cy={y} r={size * 0.34} fill={centre} />
    </G>
  );
}

function PlantBody({ look, progress, H, seed }: {
  look: PlantLook; progress: number; H: number; seed: number;
}) {
  const p = clamp(progress, 0, 1);
  const stage = stageFor(p);
  const cx = H / 2;
  const baseY = H;

  // Size ramps from a real seedling to full height; the floor is small on purpose.
  const grow = 0.2 + 0.8 * p;
  const green = look.green;
  const green2 = look.green2 ?? shade(green, 0.14);
  const leaf = look.leaf;

  const stemColour = look.stem ?? shade(green, -0.24);

  if (stage === 'seedling') {
    return (
      <Sprout
        kind={look.sprout ?? 'pair'}
        leaf={leaf}
        cx={cx}
        baseY={baseY}
        size={H * 0.52}
        colour={green2}
        deep={green}
        stem={stemColour}
        seed={seed}
      />
    );
  }

  const showFlower = look.flower && (stage === 'mature' || stage === 'ripe');
  const showFruit = look.fruit && stage === 'ripe';
  const fruitScale = showFruit ? clamp((p - 0.82) / 0.18, 0.35, 1) : 0;

  // The seed leaves hang on for a while under the first true growth, but only for the
  // plants that had a pair to begin with - a maize seedling never has any to shed.
  const sprout = look.sprout ?? 'pair';
  const keepsCotyledons = sprout === 'pair' || sprout === 'fat' || sprout === 'heart';
  const cotyledons = stage === 'juvenile' && keepsCotyledons ? (
    <Cotyledons cx={cx} baseY={baseY} size={H * 0.4} colour={green2} />
  ) : null;

  const stemH = H * 0.78 * grow;
  const stemW = Math.max(2, H * 0.045 * (0.6 + 0.4 * grow));

  const stem = (
    <Rect x={cx - stemW / 2} y={baseY - stemH} width={stemW} height={stemH} rx={stemW / 2} fill={stemColour} />
  );

  const leafCount = Math.max(3, Math.round(3 + grow * 4));

  const body = (() => {
    switch (look.form) {
    case 'root': {
      // Foliage above, and the shoulder of the root itself breaking the soil.
      const crown = look.crown?.colour ?? '#C1683B';
      const crownR = H * 0.17 * grow;
      const foliage = H * 0.62 * grow;
      return (
        <G>
          {Array.from({ length: 4 }, (_, i) => (
            <Leaf
              key={i}
              x={cx}
              y={baseY - crownR * 0.55}
              size={foliage * (i === 1 || i === 2 ? 1 : 0.86)}
              angle={(i - 1.5) * 26}
              colour={i % 2 ? green : green2}
              shape={leaf}
            />
          ))}
          <Ellipse cx={cx} cy={baseY - crownR * 0.28} rx={crownR} ry={crownR * 0.78} fill={crown} />
          <Ellipse cx={cx - crownR * 0.32} cy={baseY - crownR * 0.48} rx={crownR * 0.3} ry={crownR * 0.24} fill={shade(crown, 0.28)} />
        </G>
      );
    }

    case 'bulb': {
      // Onions and their relatives: tubular leaves out of a bulb at the surface.
      const bulb = H * 0.15 * grow;
      const blades = H * 0.7 * grow;
      return (
        <G>
          {Array.from({ length: 5 }, (_, i) => (
            <Leaf key={i} x={cx} y={baseY - bulb * 0.5} size={blades * (0.8 + 0.2 * (i % 2))} angle={(i - 2) * 12} colour={i % 2 ? green : green2} shape="blade" />
          ))}
          <Ellipse cx={cx} cy={baseY - bulb * 0.45} rx={bulb * 0.8} ry={bulb} fill={look.crown?.colour ?? '#E9E3D2'} />
        </G>
      );
    }

    case 'grass': {
      const blades = H * 0.74 * grow;
      return (
        <G>
          {Array.from({ length: 7 }, (_, i) => (
            <Leaf key={i} x={cx} y={baseY} size={blades * (0.7 + 0.3 * ((i * 3 + seed) % 4) / 3)} angle={(i - 3) * 13} colour={i % 2 ? green : green2} shape="blade" />
          ))}
          {showFlower ? <Bloom x={cx} y={baseY - blades * 0.95} size={H * 0.15 * grow} colour={look.flower!.colour} centre={look.flower!.centre ?? '#E9C44C'} petals={look.flower!.petals} /> : null}
          {/* Cereals ripen as heads held above the leaves - without these, oats and rice
              are just grass. */}
          {showFruit
            ? Array.from({ length: look.fruit!.count }, (_, i) => {
                const side = i - (look.fruit!.count - 1) / 2;
                return (
                  <Fruit
                    key={i}
                    x={cx + side * H * 0.12 * grow}
                    y={baseY - blades * (0.92 - 0.08 * Math.abs(side))}
                    size={H * look.fruit!.size * grow * fruitScale}
                    colour={look.fruit!.colour}
                    shape={look.fruit!.shape}
                  />
                );
              })
            : null}
        </G>
      );
    }

    case 'rosette': {
      // Lettuce, cabbage: leaves whorled from a low centre, tightest in the middle.
      const r = H * 0.5 * grow;
      return (
        <G>
          {Array.from({ length: 7 }, (_, i) => (
            <Leaf key={`o${i}`} x={cx} y={baseY - r * 0.12} size={r} angle={(i - 3) * 26} colour={i % 2 ? green : green2} shape={leaf} />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <Leaf key={`i${i}`} x={cx} y={baseY - r * 0.2} size={r * 0.62} angle={(i - 1.5) * 22} colour={shade(green2, 0.12)} shape={leaf} />
          ))}
          {look.crown ? <Circle cx={cx} cy={baseY - r * 0.5} r={r * 0.26} fill={look.crown.colour} /> : null}
          {/* Strawberries sit at the skirt of the rosette, not on top of it, so they are
              drawn low and to the sides where the fruit actually hangs. */}
          {showFruit
            ? Array.from({ length: look.fruit!.count }, (_, i) => {
                const side = i - (look.fruit!.count - 1) / 2;
                return (
                  <Fruit
                    key={i}
                    x={cx + side * r * 0.52}
                    y={baseY - r * (0.12 + 0.1 * (i % 2))}
                    size={H * look.fruit!.size * grow * fruitScale}
                    colour={look.fruit!.colour}
                    shape={look.fruit!.shape}
                  />
                );
              })
            : null}
          {showFlower ? (
            <Bloom
              x={cx}
              y={baseY - r * 0.86}
              size={H * look.flower!.size * 0.5 * grow}
              colour={look.flower!.colour}
              centre={look.flower!.centre ?? '#E9C44C'}
              petals={look.flower!.petals}
            />
          ) : null}
        </G>
      );
    }

    case 'bushy': {
      // Herbs: several short stems from one crown, densely leaved.
      const shootH = H * 0.64 * grow;
      return (
        <G>
          {Array.from({ length: 4 }, (_, i) => (
            <G key={i} transform={`rotate(${(i - 1.5) * 15} ${cx} ${baseY})`}>
              <Rect x={cx - stemW * 0.32} y={baseY - shootH} width={stemW * 0.64} height={shootH} rx={stemW * 0.32} fill={stemColour} />
              {Array.from({ length: 4 }, (_, j) => (
                <Leaf
                  key={j}
                  x={cx}
                  y={baseY - shootH * (0.35 + 0.2 * j)}
                  size={H * 0.2 * grow}
                  angle={j % 2 ? 62 : -62}
                  colour={j % 2 ? green : green2}
                  shape={leaf}
                />
              ))}
            </G>
          ))}
          {showFlower ? <Bloom x={cx} y={baseY - shootH * 1.06} size={H * 0.13 * grow} colour={look.flower!.colour} centre={look.flower!.centre ?? '#F2E7C0'} petals={look.flower!.petals} /> : null}
          {/* Chillies, blueberries and the like carry their crop through the bush. */}
          {showFruit
            ? Array.from({ length: look.fruit!.count }, (_, i) => {
                const side = i - (look.fruit!.count - 1) / 2;
                return (
                  <Fruit
                    key={i}
                    x={cx + side * H * 0.16 * grow}
                    y={baseY - shootH * (0.5 + 0.16 * (i % 2))}
                    size={H * look.fruit!.size * grow * fruitScale}
                    colour={look.fruit!.colour}
                    shape={look.fruit!.shape}
                  />
                );
              })
            : null}
        </G>
      );
    }

    case 'stalk': {
      // One tall stem: corn, sunflower, cereals.
      const headSize = H * 0.3 * grow;
      return (
        <G>
          {stem}
          {Array.from({ length: leafCount }, (_, i) => {
            const t = (i + 1) / (leafCount + 1);
            return (
              <Leaf
                key={i}
                x={cx}
                y={baseY - stemH * (0.2 + 0.66 * t)}
                size={H * 0.3 * grow}
                angle={i % 2 ? 68 : -68}
                colour={i % 2 ? green : green2}
                shape={leaf}
              />
            );
          })}
          {showFruit && look.fruit!.shape === 'cob'
            ? Array.from({ length: look.fruit!.count }, (_, i) => (
                <G key={i} transform={`rotate(${i % 2 ? 22 : -22} ${cx} ${baseY - stemH * 0.5})`}>
                  <Fruit x={cx} y={baseY - stemH * (0.45 + i * 0.16)} size={H * look.fruit!.size * grow * fruitScale} colour={look.fruit!.colour} shape="cob" />
                </G>
              ))
            : null}
          {showFlower ? <Bloom x={cx} y={baseY - stemH - headSize * 0.2} size={headSize * look.flower!.size * 2.2} colour={look.flower!.colour} centre={look.flower!.centre ?? '#6E4826'} petals={look.flower!.petals} /> : null}
          {showFruit && look.fruit!.shape === 'head'
            ? <Fruit x={cx} y={baseY - stemH} size={H * look.fruit!.size * grow * fruitScale} colour={look.fruit!.colour} shape="head" />
            : null}
        </G>
      );
    }

    case 'climber': {
      // Peas and beans: an upright stem, tendrils, pods hanging once set.
      return (
        <G>
          {stem}
          <Path
            d={`M ${cx} ${baseY - stemH * 0.7} q ${H * 0.1} ${-H * 0.06} ${H * 0.04} ${-H * 0.14}`}
            stroke={green2}
            strokeWidth={stemW * 0.5}
            fill="none"
            strokeLinecap="round"
          />
          {Array.from({ length: leafCount }, (_, i) => {
            const t = (i + 1) / (leafCount + 1);
            return (
              <Leaf key={i} x={cx} y={baseY - stemH * (0.24 + 0.62 * t)} size={H * 0.21 * grow} angle={i % 2 ? 58 : -58} colour={i % 2 ? green : green2} shape={leaf} />
            );
          })}
          {showFruit
            ? Array.from({ length: look.fruit!.count }, (_, i) => (
                <Fruit
                  key={i}
                  x={cx + (i % 2 ? 1 : -1) * stemW * 1.7}
                  y={baseY - stemH * (0.35 + 0.2 * i)}
                  size={H * look.fruit!.size * grow * fruitScale}
                  colour={look.fruit!.colour}
                  shape={look.fruit!.shape}
                />
              ))
            : null}
          {showFlower ? (
            <Bloom
              x={cx + stemW * 1.4}
              y={baseY - stemH * 0.78}
              size={H * look.flower!.size * 0.55 * grow}
              colour={look.flower!.colour}
              centre={look.flower!.centre ?? '#F2E7C0'}
              petals={look.flower!.petals}
            />
          ) : null}
        </G>
      );
    }

    case 'vine': {
      // Squashes: low and sprawling, big lobed leaves, one heavy fruit on the ground.
      const spread = H * 0.42 * grow;
      return (
        <G>
          <Rect x={cx - spread} y={baseY - stemW} width={spread * 2} height={stemW} rx={stemW / 2} fill={stemColour} />
          {[-1, 0, 1].map((side, i) => (
            <Leaf key={i} x={cx + side * spread * 0.68} y={baseY - stemW} size={H * 0.34 * grow * (i === 1 ? 1.12 : 0.92)} angle={side * 16} colour={i % 2 ? green : green2} shape="lobed" />
          ))}
          {showFruit ? (
            <Fruit x={cx + spread * 0.5} y={baseY - H * look.fruit!.size * grow * 0.4} size={H * look.fruit!.size * 1.5 * grow * fruitScale} colour={look.fruit!.colour} shape={look.fruit!.shape} />
          ) : null}
          {showFlower ? <Bloom x={cx - spread * 0.55} y={baseY - H * 0.12 * grow} size={H * 0.1 * grow} colour={look.flower!.colour} centre={look.flower!.centre ?? '#E9C44C'} petals={look.flower!.petals} /> : null}
        </G>
      );
    }

    case 'cane': {
      const canes = 3;
      return (
        <G>
          {Array.from({ length: canes }, (_, i) => {
            const side = i - 1;
            const tipX = cx + side * H * 0.24 * grow;
            const tipY = baseY - stemH * (0.95 - Math.abs(side) * 0.16);
            return (
              <G key={i}>
                <Path
                  d={`M ${cx} ${baseY} Q ${cx + side * H * 0.1 * grow} ${baseY - stemH * 0.6} ${tipX} ${tipY}`}
                  stroke={stemColour}
                  strokeWidth={stemW * 0.7}
                  fill="none"
                  strokeLinecap="round"
                />
                <Leaf x={tipX} y={tipY + H * 0.06} size={H * 0.17 * grow} angle={side * 24} colour={i % 2 ? green : green2} shape={leaf} />
                {showFruit
                  ? Array.from({ length: 2 }, (_, b) => (
                      <Fruit
                        key={b}
                        x={tipX - side * H * 0.03 * b}
                        y={tipY + H * 0.05 * (b + 1)}
                        size={H * look.fruit!.size * grow * fruitScale}
                        colour={look.fruit!.colour}
                        shape={look.fruit!.shape}
                      />
                    ))
                  : null}
                {showFlower && i === 1 ? (
                  <Bloom
                    x={tipX}
                    y={tipY - H * 0.03}
                    size={H * look.flower!.size * 0.5 * grow}
                    colour={look.flower!.colour}
                    centre={look.flower!.centre ?? '#F2E7C0'}
                    petals={look.flower!.petals}
                  />
                ) : null}
              </G>
            );
          })}
        </G>
      );
    }

    case 'tree': {
      const canopy = H * 0.34 * grow;
      const trunkH = stemH * 0.62;
      const canopyY = baseY - trunkH - canopy * 0.5;
      return (
        <G>
          <Rect x={cx - stemW * 0.9} y={baseY - trunkH} width={stemW * 1.8} height={trunkH} rx={stemW * 0.5} fill={look.stem ?? '#7A5433'} />
          <Circle cx={cx} cy={canopyY} r={canopy} fill={green} />
          <Circle cx={cx - canopy * 0.5} cy={canopyY + canopy * 0.28} r={canopy * 0.66} fill={green2} />
          <Circle cx={cx + canopy * 0.5} cy={canopyY + canopy * 0.3} r={canopy * 0.6} fill={shade(green, -0.14)} />
          {showFlower && !showFruit
            ? Array.from({ length: 5 }, (_, i) => (
                <Circle key={i} cx={cx + (i - 2) * canopy * 0.44} cy={canopyY + (i % 2 ? canopy * 0.3 : -canopy * 0.2)} r={canopy * 0.12} fill={look.flower!.colour} />
              ))
            : null}
          {showFruit
            ? Array.from({ length: look.fruit!.count }, (_, i) => (
                <Fruit
                  key={i}
                  x={cx + (i - (look.fruit!.count - 1) / 2) * canopy * 0.6}
                  y={canopyY + (i % 2 ? canopy * 0.44 : canopy * 0.08)}
                  size={H * look.fruit!.size * grow * fruitScale}
                  colour={look.fruit!.colour}
                  shape={look.fruit!.shape}
                />
              ))
            : null}
        </G>
      );
    }

    default: {
      // 'leafy': upright leaves on their own stalks - chard, kale, spinach.
      const r = H * 0.58 * grow;
      return (
        <G>
          {Array.from({ length: leafCount + 1 }, (_, i) => {
            const side = i - leafCount / 2;
            return (
              <G key={i}>
                <Rect
                  x={cx - stemW * 0.26}
                  y={baseY - r * 0.7}
                  width={stemW * 0.52}
                  height={r * 0.7}
                  rx={stemW * 0.26}
                  fill={look.stem ?? stemColour}
                  transform={`rotate(${side * 14} ${cx} ${baseY})`}
                />
                <Leaf x={cx} y={baseY - r * 0.24} size={r * (0.82 + 0.18 * (i % 2))} angle={side * 15} colour={i % 2 ? green : green2} shape={leaf} />
              </G>
            );
          })}
          {showFruit ? (
            <Fruit x={cx} y={baseY - r * 0.7} size={H * look.fruit!.size * grow * fruitScale} colour={look.fruit!.colour} shape={look.fruit!.shape} />
          ) : null}
          {/* Mustard and broccoli rabe are grown to the point of flowering, and the
              flower is how you recognise them. */}
          {showFlower ? (
            <Bloom
              x={cx}
              y={baseY - r * 0.92}
              size={H * look.flower!.size * 0.5 * grow}
              colour={look.flower!.colour}
              centre={look.flower!.centre ?? '#E9C44C'}
              petals={look.flower!.petals}
            />
          ) : null}
        </G>
      );
    }
    }
  })();

  // Seed leaves sit behind the true growth, never in front of it.
  return <G>{cotyledons}{body}</G>;
}
