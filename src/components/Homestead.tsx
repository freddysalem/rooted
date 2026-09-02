import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { HomeColourId, HomeTier, Pet, homeColour } from '../models/progress';
import { Theme } from '../theme';

/// The house, and the animals that turn up once it is big enough to keep them.
///
/// Rather than seven hand-drawn buildings, one drawing takes a handful of parameters and
/// the tier decides them. A shed and an estate are then the same shape reasoned about
/// differently, which is what keeps them looking like they belong on the same farm.

interface Shape {
  width: number;
  height: number;
  /** A second storey, drawn as extra wall above the ground floor. */
  storeys: 1 | 2;
  chimney: boolean;
  porch: boolean;
  /** A lower annexe off to one side. */
  wing: boolean;
  windows: number;
}

const SHAPES: Record<HomeTier, Shape> = {
  shed:         { width: 46, height: 34, storeys: 1, chimney: false, porch: false, wing: false, windows: 0 },
  pottingShed:  { width: 54, height: 38, storeys: 1, chimney: false, porch: false, wing: false, windows: 1 },
  cabin:        { width: 62, height: 44, storeys: 1, chimney: true,  porch: false, wing: false, windows: 2 },
  cottage:      { width: 74, height: 48, storeys: 1, chimney: true,  porch: true,  wing: false, windows: 2 },
  farmhouse:    { width: 82, height: 68, storeys: 2, chimney: true,  porch: true,  wing: false, windows: 3 },
  bigFarmhouse: { width: 94, height: 74, storeys: 2, chimney: true,  porch: true,  wing: true,  windows: 4 },
  estate:       { width: 110, height: 84, storeys: 2, chimney: true, porch: true,  wing: true,  windows: 5 },
};

export const homeFootprint = (tier: HomeTier) => {
  const shape = SHAPES[tier];
  return { width: shape.width * 1.7, height: shape.height + shape.width * 0.55 };
};

/// One building, standing on the grass at (x, y) where y is where it meets the ground.
export function Homestead({ tier, colour, x, y }: {
  tier: HomeTier;
  colour: HomeColourId;
  x: number;
  y: number;
}) {
  const shape = SHAPES[tier];
  const paint = homeColour(colour);
  const w = shape.width;
  const h = shape.height;
  const depth = w * 0.42;          // the visible side wall
  const roofRise = w * 0.34;

  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h;

  // Side wall, drawn receding up and to the right.
  const sideWall = `${right},${y} ${right + depth},${y - depth * 0.5} ${right + depth},${top - depth * 0.5} ${right},${top}`;
  const roofFront = `${left - 4},${top} ${x},${top - roofRise} ${right + 4},${top}`;
  const roofSide = `${x},${top - roofRise} ${x + depth},${top - roofRise - depth * 0.5} ${right + depth + 4},${top - depth * 0.5} ${right + 4},${top}`;

  const windowRow = (count: number, wy: number) =>
    Array.from({ length: count }, (_, index) => {
      const spacing = w / (count + 1);
      return (
        <Rect
          key={`win-${wy}-${index}`}
          x={left + spacing * (index + 1) - w * 0.06}
          y={wy}
          width={w * 0.12}
          height={w * 0.13}
          rx={1.5}
          fill="#F7E9BC"
          stroke={paint.roof}
          strokeWidth={1}
        />
      );
    });

  return (
    <G>
      <Ellipse cx={x + depth * 0.3} cy={y + 3} rx={w * 0.78} ry={w * 0.17} fill="#000" opacity={0.13} />

      {shape.wing ? (
        <G>
          <Rect x={left - w * 0.42} y={y - h * 0.52} width={w * 0.46} height={h * 0.52} fill={paint.wall} />
          <Polygon
            points={`${left - w * 0.46},${y - h * 0.52} ${left - w * 0.19},${y - h * 0.72} ${left + w * 0.08},${y - h * 0.52}`}
            fill={paint.roof}
          />
        </G>
      ) : null}

      <Polygon points={sideWall} fill={paint.wall} opacity={0.72} />
      <Rect x={left} y={top} width={w} height={h} fill={paint.wall} />

      {shape.storeys === 2 ? (
        <Rect x={left} y={top + h * 0.48} width={w} height={2} fill={paint.roof} opacity={0.5} />
      ) : null}

      {windowRow(Math.min(shape.windows, 3), top + h * 0.16)}
      {shape.storeys === 2 && shape.windows > 3 ? windowRow(shape.windows - 3, top + h * 0.6) : null}

      {/* Door, always on the front face. */}
      <Rect x={x - w * 0.1} y={y - h * 0.44} width={w * 0.2} height={h * 0.44} rx={2} fill={paint.roof} />
      <Circle cx={x + w * 0.06} cy={y - h * 0.22} r={1.4} fill="#F7E9BC" />

      {shape.porch ? (
        <G>
          <Rect x={x - w * 0.24} y={y - h * 0.5} width={w * 0.48} height={2.5} fill={paint.roof} />
          <Rect x={x - w * 0.23} y={y - h * 0.5} width={2} height={h * 0.5} fill={paint.roof} opacity={0.8} />
          <Rect x={x + w * 0.21} y={y - h * 0.5} width={2} height={h * 0.5} fill={paint.roof} opacity={0.8} />
        </G>
      ) : null}

      <Polygon points={roofSide} fill={paint.roof} opacity={0.78} />
      <Polygon points={roofFront} fill={paint.roof} />

      {shape.chimney ? (
        <G>
          <Rect x={left + w * 0.68} y={top - roofRise * 0.52} width={w * 0.11} height={roofRise * 0.7} fill={paint.roof} />
          <Rect x={left + w * 0.66} y={top - roofRise * 0.58} width={w * 0.15} height={w * 0.05} rx={1} fill={paint.roof} />
        </G>
      ) : null}
    </G>
  );
}

/// Decoration only - they wander nowhere and do nothing but be there.
export function PetSprite({ pet, x, y }: { pet: Pet; x: number; y: number }) {
  if (pet === 'chickens') {
    return (
      <G>
        {[0, 1].map((index) => {
          const cx = x + index * 17;
          const cy = y - index * 5;
          return (
            <G key={`hen-${index}`}>
              <Ellipse cx={cx} cy={cy + 1} rx={7} ry={2.4} fill="#000" opacity={0.13} />
              <Ellipse cx={cx} cy={cy - 5} rx={6} ry={5} fill={index === 0 ? '#F2EFE6' : '#C9773F'} />
              <Circle cx={cx + 4.5} cy={cy - 10} r={3.2} fill={index === 0 ? '#F2EFE6' : '#C9773F'} />
              <Path d={`M ${cx + 7.4} ${cy - 10} l 3 1.2 l -3 1.2 z`} fill="#E8A33D" />
              <Circle cx={cx + 4.8} cy={cy - 11} r={0.7} fill="#2E3A30" />
              <Path d={`M ${cx + 3.4} ${cy - 13.4} q 1.4 -2.2 2.8 0`} stroke="#C0392B" strokeWidth={1.6} fill="none" />
              <Rect x={cx - 1} y={cy - 1} width={1.3} height={2.6} fill="#E8A33D" />
              <Rect x={cx + 1.6} y={cy - 1} width={1.3} height={2.6} fill="#E8A33D" />
            </G>
          );
        })}
      </G>
    );
  }

  if (pet === 'dog') {
    return (
      <G>
        <Ellipse cx={x} cy={y + 1} rx={13} ry={3.4} fill="#000" opacity={0.14} />
        <Ellipse cx={x} cy={y - 8} rx={10} ry={6} fill="#B98A5A" />
        <Rect x={x - 7} y={y - 6} width={2.8} height={6} rx={1.4} fill="#A5794C" />
        <Rect x={x + 4} y={y - 6} width={2.8} height={6} rx={1.4} fill="#A5794C" />
        <Circle cx={x + 9} cy={y - 14} r={5.4} fill="#B98A5A" />
        <Ellipse cx={x + 13} cy={y - 12.5} rx={3} ry={2.2} fill="#8B6239" />
        <Circle cx={x + 14.6} cy={y - 13} r={1} fill="#2E3A30" />
        <Circle cx={x + 10.4} cy={y - 15.4} r={0.9} fill="#2E3A30" />
        <Ellipse cx={x + 5.6} cy={y - 16} rx={2.2} ry={3.4} fill="#8B6239" />
        <Path d={`M ${x - 9} ${y - 11} q -5 -3 -3 -7`} stroke="#B98A5A" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      </G>
    );
  }

  return (
    <G>
      <Ellipse cx={x} cy={y + 1} rx={19} ry={4.4} fill="#000" opacity={0.14} />
      <Ellipse cx={x} cy={y - 15} rx={16} ry={9.5} fill="#7A5433" />
      <Rect x={x - 12} y={y - 12} width={3.6} height={12} rx={1.8} fill="#6B4829" />
      <Rect x={x - 5} y={y - 12} width={3.6} height={12} rx={1.8} fill="#7A5433" />
      <Rect x={x + 5} y={y - 12} width={3.6} height={12} rx={1.8} fill="#6B4829" />
      <Rect x={x + 11} y={y - 12} width={3.6} height={12} rx={1.8} fill="#7A5433" />
      <Path d={`M ${x + 12} ${y - 22} q 6 -2 8 -9`} stroke="#7A5433" strokeWidth={7} fill="none" strokeLinecap="round" />
      <Circle cx={x + 21} cy={y - 32} r={5.6} fill="#7A5433" />
      <Ellipse cx={x + 25} cy={y - 30} rx={3.4} ry={2.6} fill="#6B4829" />
      <Path d={`M ${x + 18} ${y - 37} l 1.4 -4 l 2.4 3.4 z`} fill="#7A5433" />
      <Circle cx={x + 23} cy={y - 33.5} r={1} fill="#2E3A30" />
      <Path d={`M ${x + 13} ${y - 30} q 4 4 2 9`} stroke="#4A3320" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d={`M ${x - 16} ${y - 20} q -6 4 -4 11`} stroke="#4A3320" strokeWidth={3.4} fill="none" strokeLinecap="round" />
    </G>
  );
}

export const PET_LABEL: Record<Pet, string> = {
  chickens: 'Chickens',
  dog: 'Dog',
  horse: 'Horse',
};

export const homeAccent = Theme.leafDeep;
