import React from 'react';
import { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { HomeColourId, HomeTier, Pet, homeColour } from '../models/progress';

/// The buildings, and the animals that turn up once there is somewhere to keep them.
///
/// One drawing takes a set of parameters and each tier decides them, so a shed and an
/// estate stay recognisably the same farm rather than seven unrelated illustrations.
/// What changes between tiers is deliberately more than paint: the footprint roughly
/// quadruples from end to end, the roof changes shape, and later tiers gain outbuildings,
/// a wing and a pool.
///
/// Every surface is a solid colour. Faces used to be tinted by dropping their opacity,
/// which let the grass show through the walls and made the whole farm look like tracing
/// paper; light and shade are now baked into the fill instead.

/// Mix a hex colour toward black (negative) or white (positive).
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (to - c) * t);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

type Roof = 'pitch' | 'gambrel' | 'hip';
type Door = 'plain' | 'panelled' | 'barn' | 'grand';

interface Shape {
  /** Width of the front wall. Everything else is derived from it. */
  width: number;
  height: number;
  storeys: 1 | 2;
  roof: Roof;
  door: Door;
  windows: number;
  upperWindows: number;
  chimneys: number;
  wing: boolean;
  outbuildings: number;
  pool: boolean;
}

const SHAPES: Record<HomeTier, Shape> = {
  shed: {
    width: 38, height: 30, storeys: 1, roof: 'pitch', door: 'plain',
    windows: 0, upperWindows: 0, chimneys: 0, wing: false, outbuildings: 0, pool: false,
  },
  pottingShed: {
    width: 54, height: 38, storeys: 1, roof: 'pitch', door: 'panelled',
    windows: 2, upperWindows: 0, chimneys: 0, wing: false, outbuildings: 0, pool: false,
  },
  barn: {
    width: 88, height: 58, storeys: 1, roof: 'gambrel', door: 'barn',
    windows: 2, upperWindows: 1, chimneys: 0, wing: false, outbuildings: 0, pool: false,
  },
  countryHouse: {
    width: 104, height: 62, storeys: 1, roof: 'pitch', door: 'panelled',
    windows: 4, upperWindows: 0, chimneys: 1, wing: false, outbuildings: 1, pool: false,
  },
  farmhouse: {
    width: 126, height: 84, storeys: 2, roof: 'pitch', door: 'grand',
    windows: 4, upperWindows: 4, chimneys: 2, wing: false, outbuildings: 1, pool: false,
  },
  manor: {
    width: 150, height: 96, storeys: 2, roof: 'hip', door: 'grand',
    windows: 4, upperWindows: 5, chimneys: 2, wing: true, outbuildings: 2, pool: false,
  },
  estate: {
    width: 182, height: 108, storeys: 2, roof: 'hip', door: 'grand',
    windows: 5, upperWindows: 6, chimneys: 3, wing: true, outbuildings: 2, pool: true,
  },
};

const GLASS = '#F7E9BC';
const GLASS_DEEP = '#E4CE94';

const roofRiseOf = (s: Shape) => s.width * (s.roof === 'gambrel' ? 0.44 : s.roof === 'hip' ? 0.3 : 0.36);
const depthOf = (s: Shape) => s.width * 0.42;

/// Where the pool sits relative to the house, in front and to the left, well clear of
/// the wing it used to be buried under.
const poolOffset = (s: Shape) => ({ dx: 0, dy: s.height * 0.62, size: s.width * 0.34 });

/// How much grass the whole homestead needs, outbuildings and pool included.
export const homeFootprint = (tier: HomeTier) => {
  const s = SHAPES[tier];
  const pool = poolOffset(s);
  const left = s.width / 2
    + (s.wing ? s.width * 0.44 : 0)
    + (s.pool ? Math.max(0, -(pool.dx - pool.size * 0.95) - s.width / 2) : 0);
  const right = s.width / 2 + depthOf(s) + (s.outbuildings ? s.width * 1.0 : 0);
  const below = s.pool ? pool.dy + pool.size * 0.5 : 0;
  return { width: left + right, height: s.height + roofRiseOf(s) + s.width * 0.22 + below };
};

export function Homestead({ tier, colour, x, y, scale = 1 }: {
  tier: HomeTier;
  colour: HomeColourId;
  x: number;
  y: number;
  /** Drawn about the anchor at (x, y), so the house keeps its footing on the ground. */
  scale?: number;
}) {
  const s = SHAPES[tier];
  const base = homeColour(colour);
  const paint = {
    wall: base.wall,
    wallSide: shade(base.wall, -0.2),
    wallDark: shade(base.wall, -0.34),
    trim: shade(base.wall, 0.28),
    roof: base.roof,
    roofSide: shade(base.roof, -0.16),
    roofLight: shade(base.roof, 0.14),
    roofDark: shade(base.roof, -0.3),
  };
  const w = s.width;
  const h = s.height;
  const depth = depthOf(s);
  const rise = roofRiseOf(s);

  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h;
  const pool = poolOffset(s);

  return (
    <G transform={scale === 1 ? undefined : `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`}>
      {Array.from({ length: s.outbuildings }, (_, i) => (
        <Outbuilding
          key={`out-${i}`}
          x={x + depth + w * (0.62 + i * 0.34)}
          y={y - i * h * 0.12}
          size={w * (0.3 - i * 0.06)}
          paint={paint}
        />
      ))}

      <Ellipse cx={x + depth * 0.3} cy={y + 3} rx={w * 0.8} ry={w * 0.16} fill="#5FA84A" />

      {s.wing ? (
        <G>
          <Polygon
            points={`${left + w * 0.04},${y - h * 0.56} ${left + w * 0.04 + depth * 0.5},${y - h * 0.56 - depth * 0.25} `
              + `${left + w * 0.04 + depth * 0.5},${y - depth * 0.25} ${left + w * 0.04},${y}`}
            fill={paint.wallSide}
          />
          <Rect x={left - w * 0.44} y={y - h * 0.56} width={w * 0.48} height={h * 0.56} fill={paint.wall} />
          <Rect x={left - w * 0.44} y={y - h * 0.08} width={w * 0.48} height={h * 0.08} fill={paint.wallDark} />
          <Polygon
            points={`${left - w * 0.49},${y - h * 0.56} ${left - w * 0.2},${y - h * 0.78} ${left + w * 0.09},${y - h * 0.56}`}
            fill={paint.roof}
          />
          <Rect x={left - w * 0.49} y={y - h * 0.58} width={w * 0.58} height={2.5} fill={paint.roofDark} />
          <Window x={left - w * 0.33} y={y - h * 0.42} size={w * 0.1} paint={paint} />
          <Window x={left - w * 0.15} y={y - h * 0.42} size={w * 0.1} paint={paint} />
        </G>
      ) : null}

      {/* Side wall, receding up and to the right. Solid, darker - not a tint. */}
      <Polygon
        points={`${right},${y} ${right + depth},${y - depth * 0.5} ${right + depth},${top - depth * 0.5} ${right},${top}`}
        fill={paint.wallSide}
      />
      <Rect x={left} y={top} width={w} height={h} fill={paint.wall} />

      {/* A plinth along the base grounds the building instead of it floating on grass. */}
      <Rect x={left} y={y - h * 0.07} width={w} height={h * 0.07} fill={paint.wallDark} />
      <Polygon
        points={`${right},${y - h * 0.07} ${right + depth},${y - h * 0.07 - depth * 0.5} `
          + `${right + depth},${y - depth * 0.5} ${right},${y}`}
        fill={shade(paint.wallSide, -0.16)}
      />

      {s.storeys === 2 ? (
        <G>
          <Rect x={left} y={top + h * 0.45} width={w} height={2.5} fill={paint.trim} />
          <Rect x={left} y={top + h * 0.475} width={w} height={1.5} fill={paint.wallDark} />
        </G>
      ) : null}

      <WindowRow count={s.windows} y={top + h * (s.storeys === 2 ? 0.6 : 0.2)} left={left} w={w} paint={paint} />
      {s.upperWindows > 0 ? (
        <WindowRow
          count={s.upperWindows}
          y={top + h * (s.roof === 'gambrel' ? 0.22 : 0.15)}
          left={left}
          w={w}
          paint={paint}
        />
      ) : null}

      <DoorPiece style={s.door} x={x} y={y} w={w} h={h} paint={paint} />

      <RoofPiece roof={s.roof} left={left} right={right} x={x} top={top} rise={rise} depth={depth} paint={paint} />

      {Array.from({ length: s.chimneys }, (_, i) => {
        const cx = left + w * (0.16 + i * 0.26);
        const cw = w * 0.075;
        return (
          <G key={`ch-${i}`}>
            <Rect x={cx} y={top - rise * 0.56} width={cw} height={rise * 0.7} fill={paint.roofSide} />
            <Rect x={cx} y={top - rise * 0.56} width={cw * 0.45} height={rise * 0.7} fill={paint.roof} />
            <Rect x={cx - cw * 0.16} y={top - rise * 0.62} width={cw * 1.32} height={cw * 0.36} rx={1} fill={paint.roofDark} />
          </G>
        );
      })}

      {/* Drawn last: the pool is in front of the house, so it must sit on top of it. */}
      {s.pool ? <Pool x={x + pool.dx} y={y + pool.dy} size={pool.size} /> : null}
    </G>
  );
}

type Paint = {
  wall: string; wallSide: string; wallDark: string; trim: string;
  roof: string; roofSide: string; roofLight: string; roofDark: string;
};

function RoofPiece({ roof, left, right, x, top, rise, depth, paint }: {
  roof: Roof; left: number; right: number; x: number; top: number;
  rise: number; depth: number; paint: Paint;
}) {
  const eave = 4;
  const w = right - left;

  if (roof === 'gambrel') {
    const midY = top - rise * 0.52;
    const midIn = w * 0.22;
    return (
      <G>
        <Polygon
          points={`${x},${top - rise} ${x + depth},${top - rise - depth * 0.5} `
            + `${right - midIn + depth},${midY - depth * 0.5} ${right - midIn},${midY}`}
          fill={paint.roofSide}
        />
        <Polygon
          points={`${right - midIn},${midY} ${right - midIn + depth},${midY - depth * 0.5} `
            + `${right + eave + depth},${top - depth * 0.5} ${right + eave},${top}`}
          fill={shade(paint.roofSide, -0.08)}
        />
        <Polygon
          points={`${left - eave},${top} ${left + midIn},${midY} ${x},${top - rise} `
            + `${right - midIn},${midY} ${right + eave},${top}`}
          fill={paint.roof}
        />
        <Polygon
          points={`${left + midIn},${midY} ${x},${top - rise} ${right - midIn},${midY}`}
          fill={paint.roofLight}
        />
        <Rect x={left - eave} y={top - 2.5} width={w + eave * 2} height={2.5} fill={paint.roofDark} />
      </G>
    );
  }

  if (roof === 'hip') {
    const inset = w * 0.2;
    return (
      <G>
        <Polygon
          points={`${left + inset},${top - rise} ${right - inset},${top - rise} `
            + `${right - inset + depth},${top - rise - depth * 0.5} ${left + inset + depth},${top - rise - depth * 0.5}`}
          fill={paint.roofLight}
        />
        <Polygon
          points={`${right - inset},${top - rise} ${right - inset + depth},${top - rise - depth * 0.5} `
            + `${right + eave + depth},${top - depth * 0.5} ${right + eave},${top}`}
          fill={paint.roofSide}
        />
        <Polygon
          points={`${left - eave},${top} ${left + inset},${top - rise} ${right - inset},${top - rise} ${right + eave},${top}`}
          fill={paint.roof}
        />
        <Line
          x1={left + inset} y1={top - rise} x2={right - inset} y2={top - rise}
          stroke={paint.roofDark} strokeWidth={2}
        />
        <Rect x={left - eave} y={top - 2.5} width={w + eave * 2} height={2.5} fill={paint.roofDark} />
      </G>
    );
  }

  return (
    <G>
      <Polygon
        points={`${x},${top - rise} ${x + depth},${top - rise - depth * 0.5} `
          + `${right + eave + depth},${top - depth * 0.5} ${right + eave},${top}`}
        fill={paint.roofSide}
      />
      <Polygon points={`${left - eave},${top} ${x},${top - rise} ${right + eave},${top}`} fill={paint.roof} />
      <Line x1={x} y1={top - rise} x2={x + depth} y2={top - rise - depth * 0.5} stroke={paint.roofDark} strokeWidth={2} />
      <Rect x={left - eave} y={top - 2.5} width={w + eave * 2} height={2.5} fill={paint.roofDark} />
    </G>
  );
}

/// One window: frame, glazing bars, a sill, and a hint of light inside.
function Window({ x, y, size, paint }: { x: number; y: number; size: number; paint: Paint }) {
  const h = size * 1.2;
  return (
    <G>
      <Rect x={x - 1.2} y={y - 1.2} width={size + 2.4} height={h + 2.4} rx={1.5} fill={paint.trim} />
      <Rect x={x} y={y} width={size} height={h} fill={GLASS} />
      <Polygon points={`${x},${y + h} ${x + size},${y} ${x + size},${y + h}`} fill={GLASS_DEEP} opacity={0.55} />
      <Line x1={x + size / 2} y1={y} x2={x + size / 2} y2={y + h} stroke={paint.roofDark} strokeWidth={0.9} />
      <Line x1={x} y1={y + h * 0.5} x2={x + size} y2={y + h * 0.5} stroke={paint.roofDark} strokeWidth={0.9} />
      <Rect x={x - 2} y={y + h} width={size + 4} height={1.8} rx={0.8} fill={paint.trim} />
    </G>
  );
}

function WindowRow({ count, y, left, w, paint }: {
  count: number; y: number; left: number; w: number; paint: Paint;
}) {
  const size = w * 0.1;
  return (
    <G>
      {Array.from({ length: count }, (_, i) => {
        const spacing = w / (count + 1);
        return <Window key={`w-${y}-${i}`} x={left + spacing * (i + 1) - size / 2} y={y} size={size} paint={paint} />;
      })}
    </G>
  );
}

function DoorPiece({ style, x, y, w, h, paint }: {
  style: Door; x: number; y: number; w: number; h: number; paint: Paint;
}) {
  if (style === 'barn') {
    const dw = w * 0.42;
    const dh = h * 0.64;
    return (
      <G>
        <Rect x={x - dw / 2 - 2} y={y - dh - 4} width={dw + 4} height={dh + 4} fill={paint.trim} />
        <Rect x={x - dw / 2} y={y - dh} width={dw} height={dh} fill={paint.roofDark} />
        <Rect x={x - dw / 2} y={y - dh} width={dw / 2} height={dh} fill={paint.roof} />
        <Line x1={x} y1={y - dh} x2={x} y2={y} stroke={paint.trim} strokeWidth={1.6} />
        <Line x1={x - dw / 2} y1={y - dh} x2={x - 1} y2={y} stroke={paint.trim} strokeWidth={1.3} />
        <Line x1={x - dw / 2} y1={y} x2={x - 1} y2={y - dh} stroke={paint.trim} strokeWidth={1.3} />
        <Line x1={x + 1} y1={y - dh} x2={x + dw / 2} y2={y} stroke={paint.trim} strokeWidth={1.3} />
        <Line x1={x + 1} y1={y} x2={x + dw / 2} y2={y - dh} stroke={paint.trim} strokeWidth={1.3} />
        <Rect x={x - dw / 2 - 4} y={y - dh - 6} width={dw + 8} height={3.5} rx={1.5} fill={paint.roofDark} />
        <Circle cx={x - dw / 2 - 1} cy={y - dh - 4.2} r={1.6} fill={paint.trim} />
        <Circle cx={x + dw / 2 + 1} cy={y - dh - 4.2} r={1.6} fill={paint.trim} />
      </G>
    );
  }

  if (style === 'grand') {
    const dw = w * 0.09;
    const dh = h * 0.4;
    return (
      <G>
        <Rect x={x - dw * 2.1} y={y - dh * 1.05} width={dw * 4.2} height={dh * 1.05} fill={paint.trim} />
        <Polygon
          points={`${x - dw * 2.4},${y - dh * 1.05} ${x},${y - dh * 1.34} ${x + dw * 2.4},${y - dh * 1.05}`}
          fill={paint.roof}
        />
        <Rect x={x - dw * 2.05} y={y - dh * 1.05} width={2.6} height={dh * 1.05} fill={paint.trim} />
        <Rect x={x + dw * 1.45} y={y - dh * 1.05} width={2.6} height={dh * 1.05} fill={paint.trim} />
        <Rect x={x - dw} y={y - dh} width={dw * 2} height={dh} rx={1.5} fill={paint.roofDark} />
        <Line x1={x} y1={y - dh} x2={x} y2={y} stroke={paint.trim} strokeWidth={1} />
        <Circle cx={x - dw * 0.32} cy={y - dh * 0.46} r={1.3} fill={GLASS} />
        <Circle cx={x + dw * 0.32} cy={y - dh * 0.46} r={1.3} fill={GLASS} />
        <Rect x={x - dw * 1.5} y={y - 2} width={dw * 3} height={2} rx={1} fill={paint.trim} />
      </G>
    );
  }

  if (style === 'panelled') {
    const dw = w * 0.17;
    const dh = h * 0.46;
    return (
      <G>
        <Rect x={x - dw / 2 - 2} y={y - dh - 2.5} width={dw + 4} height={dh + 2.5} fill={paint.trim} />
        <Rect x={x - dw / 2} y={y - dh} width={dw} height={dh} fill={paint.roofDark} />
        <Rect x={x - dw * 0.3} y={y - dh * 0.9} width={dw * 0.6} height={dh * 0.3} rx={1} fill={GLASS} />
        <Rect x={x - dw * 0.3} y={y - dh * 0.5} width={dw * 0.6} height={dh * 0.28} rx={1} fill={paint.roof} />
        <Circle cx={x + dw * 0.3} cy={y - dh * 0.38} r={1.3} fill={paint.trim} />
        <Rect x={x - dw / 2 - 3} y={y - 2} width={dw + 6} height={2} rx={1} fill={paint.trim} />
      </G>
    );
  }

  const dw = w * 0.22;
  const dh = h * 0.46;
  return (
    <G>
      <Rect x={x - dw / 2 - 1.5} y={y - dh - 1.5} width={dw + 3} height={dh + 1.5} fill={paint.trim} />
      <Rect x={x - dw / 2} y={y - dh} width={dw} height={dh} fill={paint.roofDark} />
      <Circle cx={x + dw * 0.26} cy={y - dh * 0.45} r={1.1} fill={paint.trim} />
    </G>
  );
}

function Outbuilding({ x, y, size, paint }: { x: number; y: number; size: number; paint: Paint }) {
  const h = size * 0.78;
  const d = size * 0.4;
  return (
    <G>
      <Ellipse cx={x + d * 0.3} cy={y + 2} rx={size * 0.82} ry={size * 0.2} fill="#5FA84A" />
      <Polygon
        points={`${x + size / 2},${y} ${x + size / 2 + d},${y - d * 0.5} ${x + size / 2 + d},${y - h - d * 0.5} ${x + size / 2},${y - h}`}
        fill={paint.wallSide}
      />
      <Rect x={x - size / 2} y={y - h} width={size} height={h} fill={paint.wall} />
      <Rect x={x - size / 2} y={y - h * 0.12} width={size} height={h * 0.12} fill={paint.wallDark} />
      <Polygon
        points={`${x - size / 2 - 2},${y - h} ${x},${y - h - size * 0.34} ${x + size / 2 + 2},${y - h}`}
        fill={paint.roof}
      />
      <Rect x={x - size / 2 - 2} y={y - h - 1.6} width={size + 4} height={1.6} fill={paint.roofDark} />
      <Rect x={x - size * 0.12} y={y - h * 0.6} width={size * 0.24} height={h * 0.6} rx={1} fill={paint.roofDark} />
    </G>
  );
}

/// The last unlock. Coping, water, a highlight and a ladder - and, crucially, sited in
/// front of the house rather than underneath it.
function Pool({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <G>
      <Ellipse cx={x} cy={y + size * 0.06} rx={size * 1.02} ry={size * 0.56} fill="#CFC7B2" />
      <Ellipse cx={x} cy={y} rx={size * 1.02} ry={size * 0.56} fill="#E8E2D2" />
      <Ellipse cx={x} cy={y} rx={size * 0.8} ry={size * 0.42} fill="#2E86C8" />
      <Ellipse cx={x} cy={y - size * 0.03} rx={size * 0.78} ry={size * 0.39} fill="#4FA8E8" />
      <Ellipse cx={x - size * 0.16} cy={y - size * 0.12} rx={size * 0.42} ry={size * 0.16} fill="#7FC4EE" />
      <Path
        d={`M ${x - size * 0.42} ${y + size * 0.12} q ${size * 0.2} ${-size * 0.09} ${size * 0.4} 0 `
          + `q ${size * 0.2} ${size * 0.09} ${size * 0.4} 0`}
        stroke="#FFF"
        strokeWidth={1.6}
        fill="none"
        opacity={0.7}
      />
      <Rect x={x + size * 0.6} y={y - size * 0.24} width={2.2} height={size * 0.3} rx={1.1} fill="#D7CFBC" />
      <Rect x={x + size * 0.72} y={y - size * 0.24} width={2.2} height={size * 0.3} rx={1.1} fill="#D7CFBC" />
    </G>
  );
}

/// Decoration only - they wander nowhere and do nothing but be there.
export function PetSprite({ pet, x, y }: { pet: Pet; x: number; y: number }) {
  if (pet === 'chickens') return <Chickens x={x} y={y} />;
  if (pet === 'dog') return <Dog x={x} y={y} />;
  return <Horse x={x} y={y} />;
}

function Chickens({ x, y }: { x: number; y: number }) {
  return (
    <G>
      {[0, 1].map((index) => {
        const cx = x + index * 30;
        const cy = y - index * 9;
        const s = 1.9;
        const body = index === 0 ? '#F7F4EC' : '#C9773F';
        const dark = index === 0 ? '#DDD6C6' : '#A85F30';
        return (
          <G key={`hen-${index}`}>
            <Ellipse cx={cx} cy={cy + 2} rx={7.5 * s} ry={2.4 * s} fill="#5FA84A" />
            <Rect x={cx - 1.6 * s} y={cy - 1.2 * s} width={1.5 * s} height={3.4 * s} rx={0.7 * s} fill="#E8A33D" />
            <Rect x={cx + 1.4 * s} y={cy - 1.2 * s} width={1.5 * s} height={3.4 * s} rx={0.7 * s} fill="#E8A33D" />
            <Ellipse cx={cx - 0.4 * s} cy={cy - 5.4 * s} rx={6.2 * s} ry={5.2 * s} fill={body} />
            <Path
              d={`M ${cx - 6 * s} ${cy - 6 * s} q ${-2.6 * s} ${2.4 * s} ${0.6 * s} ${4 * s} q ${1.6 * s} ${-1.4 * s} ${1.4 * s} ${-3.6 * s} z`}
              fill={dark}
            />
            <Ellipse cx={cx - 1.6 * s} cy={cy - 5 * s} rx={3.2 * s} ry={2.6 * s} fill={dark} />
            <Circle cx={cx + 4.6 * s} cy={cy - 9.8 * s} r={3.3 * s} fill={body} />
            <Path
              d={`M ${cx + 7.5 * s} ${cy - 9.9 * s} l ${3.1 * s} ${1.3 * s} l ${-3.1 * s} ${1.3 * s} z`}
              fill="#E8A33D"
            />
            <Path
              d={`M ${cx + 2.9 * s} ${cy - 13.2 * s} q ${1 * s} ${-2.2 * s} ${2 * s} ${-0.5 * s} `
                + `q ${1.1 * s} ${-2 * s} ${2 * s} ${0.4 * s} q ${0.6 * s} ${1.4 * s} ${-0.6 * s} ${1.9 * s} z`}
              fill="#C0392B"
            />
            <Path d={`M ${cx + 5.2 * s} ${cy - 7.6 * s} q ${0.9 * s} ${1.6 * s} ${-0.5 * s} ${2 * s}`} fill="#C0392B" />
            <Circle cx={cx + 5.1 * s} cy={cy - 10.4 * s} r={0.85 * s} fill="#2E3A30" />
            <Circle cx={cx + 5.4 * s} cy={cy - 10.7 * s} r={0.3 * s} fill="#FFF" />
          </G>
        );
      })}
    </G>
  );
}

function Dog({ x, y }: { x: number; y: number }) {
  const s = 1.9;
  const coat = '#B98A5A';
  const dark = '#95693E';
  return (
    <G>
      <Ellipse cx={x} cy={y + 2} rx={14 * s} ry={3.4 * s} fill="#5FA84A" />
      <Rect x={x - 7.4 * s} y={y - 7 * s} width={3 * s} height={7 * s} rx={1.5 * s} fill={dark} />
      <Rect x={x + 3.6 * s} y={y - 7 * s} width={3 * s} height={7 * s} rx={1.5 * s} fill={dark} />
      <Path
        d={`M ${x - 10 * s} ${y - 9 * s} q ${-4 * s} ${-4 * s} ${-1.5 * s} ${-7.5 * s}`}
        stroke={coat}
        strokeWidth={2.8 * s}
        fill="none"
        strokeLinecap="round"
      />
      {/* Body, chest and neck as one shape, so the dog reads as a single animal. */}
      <Path
        d={`M ${x - 10 * s} ${y - 8 * s} q ${-1 * s} ${-6 * s} ${5 * s} ${-6.4 * s} `
          + `q ${4 * s} ${-0.2 * s} ${6.4 * s} ${-1.4 * s} q ${2.6 * s} ${-1.2 * s} ${4.2 * s} ${-3 * s} `
          + `q ${2.4 * s} ${1.2 * s} ${1.6 * s} ${4 * s} q ${-0.8 * s} ${2.6 * s} ${-3.6 * s} ${3.4 * s} `
          + `q ${-3 * s} ${1 * s} ${-6.6 * s} ${1.2 * s} q ${-5 * s} ${0.4 * s} ${-7 * s} ${2.2 * s} z`}
        fill={coat}
      />
      <Ellipse cx={x - 2 * s} cy={y - 6.6 * s} rx={7 * s} ry={3.4 * s} fill={dark} opacity={0.35} />
      <Circle cx={x + 9.4 * s} cy={y - 14.6 * s} r={5 * s} fill={coat} />
      <Path
        d={`M ${x + 5.6 * s} ${y - 18 * s} q ${-1.8 * s} ${3.6 * s} ${0.6 * s} ${5.4 * s} q ${2 * s} ${-1.4 * s} ${1.8 * s} ${-4.6 * s} z`}
        fill={dark}
      />
      <Ellipse cx={x + 13.4 * s} cy={y - 13.4 * s} rx={3.2 * s} ry={2.4 * s} fill={coat} />
      <Circle cx={x + 15.6 * s} cy={y - 13.8 * s} r={1.1 * s} fill="#2E3A30" />
      <Circle cx={x + 10.8 * s} cy={y - 16 * s} r={0.95 * s} fill="#2E3A30" />
      <Circle cx={x + 11.1 * s} cy={y - 16.3 * s} r={0.32 * s} fill="#FFF" />
      <Path d={`M ${x + 11.4 * s} ${y - 11.6 * s} q ${1.4 * s} ${0.9 * s} ${2.8 * s} ${0}`} stroke={dark} strokeWidth={0.8 * s} fill="none" />
    </G>
  );
}

/// Body, neck and head drawn as one continuous silhouette. Built from separate ellipses
/// and a stroked neck, the horse read as a set of parts that had been assembled rather
/// than an animal.
function Horse({ x, y }: { x: number; y: number }) {
  const s = 1.55;
  const coat = '#8A5E36';
  const dark = '#6E4826';
  const mane = '#3E2A17';

  const leg = (dx: number, back: boolean) => (
    <G key={`leg-${dx}`}>
      <Path
        d={`M ${x + dx * s} ${y - 17 * s} q ${back ? -1.6 * s : 1.2 * s} ${6 * s} ${back ? -0.4 * s : 0.6 * s} ${9 * s} `
          + `l ${0} ${7 * s} l ${3.4 * s} ${0} l ${0} ${-7.4 * s} q ${back ? 0.8 * s : -0.4 * s} ${-4 * s} ${back ? 1.4 * s : -0.4 * s} ${-8.6 * s} z`}
        fill={back ? dark : coat}
      />
      <Rect
        x={x + dx * s + (back ? -1.2 * s : -0.2 * s)}
        y={y - 2.2 * s}
        width={4 * s}
        height={2.4 * s}
        rx={0.8 * s}
        fill={mane}
      />
    </G>
  );

  return (
    <G>
      <Ellipse cx={x + 2 * s} cy={y + 1.5 * s} rx={20 * s} ry={4.2 * s} fill="#5FA84A" />

      {leg(-13, true)}
      {leg(9, true)}

      {/* One path: rump, back, withers, neck, head, jaw, chest and belly. */}
      <Path
        d={`M ${x - 17 * s} ${y - 22 * s}
            q ${-2 * s} ${-9 * s} ${6 * s} ${-11 * s}
            q ${9 * s} ${-2 * s} ${17 * s} ${-0.6 * s}
            q ${3 * s} ${-6 * s} ${7.5 * s} ${-10 * s}
            q ${2.6 * s} ${-2.4 * s} ${5 * s} ${-2 * s}
            q ${2 * s} ${0.4 * s} ${1.4 * s} ${2.6 * s}
            l ${-1.2 * s} ${5 * s}
            q ${2.6 * s} ${1.2 * s} ${2 * s} ${3.6 * s}
            q ${-0.6 * s} ${2.4 * s} ${-3.6 * s} ${2.4 * s}
            l ${-5.6 * s} ${-0.4 * s}
            q ${-4.4 * s} ${3.4 * s} ${-6.6 * s} ${8 * s}
            q ${-1.4 * s} ${3 * s} ${-1.6 * s} ${6.4 * s}
            q ${-8 * s} ${2 * s} ${-16 * s} ${0.4 * s}
            q ${-3.4 * s} ${-1 * s} ${-4.3 * s} ${-4.4 * s} z`}
        fill={coat}
      />

      {leg(-16, false)}
      {leg(6, false)}

      {/* Belly and haunch shading, so the volume reads. */}
      <Ellipse cx={x - 10 * s} cy={y - 26 * s} rx={7 * s} ry={5.4 * s} fill={dark} opacity={0.3} />
      <Path
        d={`M ${x - 17 * s} ${y - 22 * s} q ${8 * s} ${3 * s} ${18 * s} ${1.4 * s} q ${-9 * s} ${3 * s} ${-18 * s} ${0.6 * s} z`}
        fill={dark}
        opacity={0.45}
      />

      {/* Mane along the crest, forelock, and tail. */}
      <Path
        d={`M ${x + 6 * s} ${y - 33.4 * s} q ${3.4 * s} ${-6 * s} ${8 * s} ${-9.6 * s} `
          + `q ${1.6 * s} ${1 * s} ${0.6 * s} ${3 * s} q ${-4 * s} ${3.4 * s} ${-6.4 * s} ${8.4 * s} z`}
        fill={mane}
      />
      <Path
        d={`M ${x + 19.6 * s} ${y - 42.6 * s} q ${2 * s} ${-1.6 * s} ${3.4 * s} ${-0.4 * s} l ${-1.6 * s} ${3.6 * s} z`}
        fill={mane}
      />
      <Path
        d={`M ${x - 17.4 * s} ${y - 31 * s} q ${-6 * s} ${2 * s} ${-5.4 * s} ${9 * s} q ${0.4 * s} ${4 * s} ${2.6 * s} ${6.4 * s} `
          + `q ${1.4 * s} ${-1 * s} ${0.8 * s} ${-3 * s} q ${-1.8 * s} ${-5 * s} ${3.6 * s} ${-10.4 * s} z`}
        fill={mane}
      />

      {/* Ear, eye, muzzle. */}
      <Path d={`M ${x + 21.6 * s} ${y - 42 * s} l ${0.4 * s} ${-3.4 * s} l ${2.4 * s} ${2.6 * s} z`} fill={coat} />
      <Circle cx={x + 24.4 * s} cy={y - 38.4 * s} r={1.05 * s} fill="#2E3A30" />
      <Circle cx={x + 24.7 * s} cy={y - 38.8 * s} r={0.34 * s} fill="#FFF" />
      <Ellipse cx={x + 26.6 * s} cy={y - 33.6 * s} rx={2.4 * s} ry={2 * s} fill={dark} />
      <Circle cx={x + 27.2 * s} cy={y - 33.4 * s} r={0.5 * s} fill={mane} />
    </G>
  );
}
