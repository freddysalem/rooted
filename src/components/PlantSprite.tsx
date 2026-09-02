import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { PlantFamily } from '../models/species';
import { Theme } from '../theme';
import { useReduceMotion } from '../hooks/useReduceMotion';

/// A stable small integer from any string, so catalogue sprites that share a family do
/// not all sway in lockstep. Plantings use their own seed; this is for species.
export function seedFromString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  return hash;
}

/// The on-screen twin of a real plant. It is drawn, not photographed - no camera needed -
/// and it grows as the real one does: `progress` drives every dimension here.
///
/// Each sprite sways on its own clock, seeded from the plant, so a bed of twelve never
/// looks like twelve copies of one animation.
export function PlantSprite({ family, progress, seed, height = 90 }: {
  family: PlantFamily;
  progress: number;
  seed: number;
  height?: number;
}) {
  const sway = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  const swayAmount = 1.5 + (seed % 4) * 0.45;
  const swayDuration = (2.3 + (seed % 6) * 0.33) * 1000;

  useEffect(() => {
    if (reduceMotion) {
      // Ambient motion off: the plant stands still, upright.
      sway.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: swayDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: swayDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway, swayDuration, reduceMotion]);

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
          // Rotate about the base, not the middle - plants are hinged at the soil.
          transform: [{ translateY: H / 2 }, { rotate }, { translateY: -H / 2 }],
        }}
      >
        <Svg width={H} height={H} viewBox={`0 0 ${H} ${H}`}>
          <Defs>
            <LinearGradient id="stem" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={Theme.leafDeep} />
              <Stop offset="1" stopColor={Theme.leaf} />
            </LinearGradient>
          </Defs>
          <PlantBody family={family} progress={progress} H={H} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function PlantBody({ family, progress, H }: { family: PlantFamily; progress: number; H: number }) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  // Never quite zero: a just-sown seed still shows a visible shoot. The floor is high
  // enough that a day-old planting reads at bed size, not just in the big detail view.
  const scale = 0.3 + 0.7 * clamped;

  const stemHeight = H * 0.64 * scale;
  const stemWidth = Math.max(2.5, H * 0.05 * (0.55 + 0.45 * scale));
  const leafSize = H * 0.4 * scale;
  const leafCount = Math.max(2, Math.round(2 + scale * 4));
  const headSize = H * 0.38 * scale;
  const cx = H / 2;
  const baseY = H;

  const stem = (
    <Rect
      x={cx - stemWidth / 2}
      y={baseY - stemHeight}
      width={stemWidth}
      height={stemHeight}
      rx={stemWidth / 2}
      fill="url(#stem)"
    />
  );

  /// One leaf, alternating sides as it climbs the stem.
  const leaf = (index: number, total: number, size: number) => {
    const t = (index + 1) / (total + 1);
    const side = index % 2 === 0 ? 1 : -1;
    const width = size * (1.05 - 0.25 * t);
    const y = baseY - stemHeight * (0.28 + 0.64 * t);
    const x = cx + side * width * 0.46;
    const angle = side > 0 ? -20 : 20;
    return (
      <Ellipse
        key={`leaf-${index}`}
        cx={x}
        cy={y}
        rx={width / 2}
        ry={width * 0.23}
        fill={index % 2 === 0 ? Theme.leaf : Theme.leafLight}
        transform={`rotate(${angle} ${x} ${y})`}
      />
    );
  };

  const leaves = (count: number, size: number) =>
    Array.from({ length: count }, (_, index) => leaf(index, count, size));

  if (family === 'leafy') {
    return <G>{stem}{leaves(leafCount, leafSize * 1.15)}</G>;
  }

  if (family === 'fruiting') {
    const ripeness = Math.min(Math.max((clamped - 0.55) / 0.45, 0), 1);
    const berry = headSize * 0.34 * (0.5 + 0.5 * ripeness);
    // Green through to ripe as the plant approaches harvest.
    const fruitColour = `rgb(${Math.round((0.35 + 0.5 * ripeness) * 255)}, ${Math.round(
      (0.55 - 0.22 * ripeness) * 255
    )}, ${Math.round((0.3 - 0.1 * ripeness) * 255)})`;
    return (
      <G>
        {stem}
        {leaves(leafCount, leafSize * 0.9)}
        {clamped > 0.55
          ? Array.from({ length: 3 }, (_, index) => (
              <Circle
                key={`fruit-${index}`}
                cx={cx + (index - 1) * berry * 0.85}
                cy={baseY - stemHeight * 0.78 + (index % 2) * berry * 0.5}
                r={berry / 2}
                fill={fruitColour}
              />
            ))
          : null}
      </G>
    );
  }

  if (family === 'flower') {
    const headCx = cx;
    const headCy = baseY - stemHeight - headSize * 0.15;
    return (
      <G>
        {stem}
        {leaves(Math.min(leafCount, 3), leafSize * 0.85)}
        {clamped > 0.42 ? (
          <G>
            {Array.from({ length: 7 }, (_, index) => (
              <Ellipse
                key={`petal-${index}`}
                cx={headCx}
                cy={headCy - headSize * 0.3}
                rx={headSize * 0.2}
                ry={headSize * 0.35}
                fill={Theme.sun}
                transform={`rotate(${(index * 360) / 7} ${headCx} ${headCy})`}
              />
            ))}
            <Circle cx={headCx} cy={headCy} r={headSize * 0.22} fill={Theme.soilDeep} />
          </G>
        ) : null}
      </G>
    );
  }

  if (family === 'root') {
    // The crown of the root just shows above the soil; the rest runs off the canvas.
    return (
      <G>
        <Circle cx={cx} cy={baseY + headSize * 0.2} r={headSize * 0.575} fill={Theme.soil} opacity={0.85} />
        {Array.from({ length: 5 }, (_, index) => {
          const bladeHeight = stemHeight * (0.7 + (0.3 * (index % 3)) / 2);
          const width = stemWidth * 0.85;
          return (
            <Rect
              key={`blade-${index}`}
              x={cx - width / 2}
              y={baseY - bladeHeight}
              width={width}
              height={bladeHeight}
              rx={width / 2}
              fill={index % 2 === 0 ? Theme.leaf : Theme.leafLight}
              transform={`rotate(${(index - 2) * 17} ${cx} ${baseY})`}
            />
          );
        })}
      </G>
    );
  }

  if (family === 'allium') {
    // Tubular leaves fanning from a bulb that sits half out of the soil.
    const bulb = headSize * 0.52;
    return (
      <G>
        {Array.from({ length: 5 }, (_, index) => {
          const width = stemWidth * 0.8;
          const bladeHeight = stemHeight * (0.78 + 0.22 * (index % 2));
          return (
            <Rect
              key={`tube-${index}`}
              x={cx - width / 2}
              y={baseY - bladeHeight}
              width={width}
              height={bladeHeight}
              rx={width / 2}
              fill={index % 2 === 0 ? Theme.leaf : Theme.leafLight}
              transform={`rotate(${(index - 2) * 11} ${cx} ${baseY})`}
            />
          );
        })}
        <Ellipse cx={cx} cy={baseY - bulb * 0.5} rx={bulb * 0.78} ry={bulb} fill={Theme.leafPale} />
        <Ellipse cx={cx - bulb * 0.22} cy={baseY - bulb * 0.6} rx={bulb * 0.3} ry={bulb * 0.6} fill="#FFF" opacity={0.35} />
      </G>
    );
  }

  if (family === 'cole') {
    // A tight heart wrapped in broad outer leaves.
    const head = headSize * 0.9;
    return (
      <G>
        {Array.from({ length: 4 }, (_, index) => {
          const side = index % 2 === 0 ? 1 : -1;
          const tier = Math.floor(index / 2);
          const rx = head * (0.92 - 0.16 * tier);
          const y = baseY - head * (0.34 + 0.3 * tier);
          return (
            <Ellipse
              key={`wrap-${index}`}
              cx={cx + side * head * 0.34}
              cy={y}
              rx={rx * 0.62}
              ry={rx * 0.44}
              fill={tier === 0 ? Theme.leaf : Theme.leafLight}
              transform={`rotate(${side * 16} ${cx} ${y})`}
            />
          );
        })}
        <Circle cx={cx} cy={baseY - head * 0.78} r={head * 0.5} fill={Theme.leafDeep} />
        <Circle cx={cx - head * 0.14} cy={baseY - head * 0.9} r={head * 0.22} fill={Theme.leaf} />
      </G>
    );
  }

  if (family === 'vine') {
    // Low and sprawling: a runner along the ground under big lobed leaves.
    const ripeness = Math.min(Math.max((clamped - 0.5) / 0.5, 0), 1);
    const spread = H * 0.42 * scale;
    return (
      <G>
        <Rect x={cx - spread} y={baseY - stemWidth} width={spread * 2} height={stemWidth} rx={stemWidth / 2} fill={Theme.leafDeep} />
        {Array.from({ length: 3 }, (_, index) => {
          const side = index - 1;
          const x = cx + side * spread * 0.72;
          const size = leafSize * (index === 1 ? 1.15 : 0.9);
          return (
            <Ellipse
              key={`vleaf-${index}`}
              cx={x}
              cy={baseY - size * 0.42}
              rx={size * 0.58}
              ry={size * 0.42}
              fill={index % 2 === 0 ? Theme.leaf : Theme.leafLight}
            />
          );
        })}
        {ripeness > 0 ? (
          <Ellipse
            cx={cx + spread * 0.46}
            cy={baseY - headSize * 0.3}
            rx={headSize * 0.42 * ripeness}
            ry={headSize * 0.3 * ripeness}
            fill={Theme.sun}
          />
        ) : null}
      </G>
    );
  }

  if (family === 'grain') {
    // Thin stalks, each carrying a seed head once it is grown.
    const ripeness = Math.min(Math.max((clamped - 0.45) / 0.55, 0), 1);
    return (
      <G>
        {Array.from({ length: 5 }, (_, index) => {
          const width = stemWidth * 0.55;
          const height = stemHeight * (0.86 + 0.14 * (index % 3));
          const angle = (index - 2) * 7;
          return (
            <G key={`stalk-${index}`} transform={`rotate(${angle} ${cx} ${baseY})`}>
              <Rect x={cx - width / 2} y={baseY - height} width={width} height={height} rx={width / 2} fill={Theme.leafLight} />
              <Ellipse
                cx={cx}
                cy={baseY - height - headSize * 0.12}
                rx={width * 1.5}
                ry={headSize * 0.3}
                fill={ripeness > 0.1 ? Theme.sun : Theme.leaf}
              />
            </G>
          );
        })}
      </G>
    );
  }

  if (family === 'legume') {
    // A climber: upright stem, leaves, and pods hanging once it sets.
    const podLength = headSize * 0.72;
    return (
      <G>
        {stem}
        {leaves(leafCount, leafSize * 0.8)}
        {clamped > 0.5
          ? Array.from({ length: 3 }, (_, index) => {
              const side = index % 2 === 0 ? 1 : -1;
              const y = baseY - stemHeight * (0.4 + 0.22 * index);
              const x = cx + side * stemWidth * 1.6;
              return (
                <Ellipse
                  key={`pod-${index}`}
                  cx={x}
                  cy={y}
                  rx={podLength * 0.16}
                  ry={podLength * 0.5}
                  fill={Theme.leafDeep}
                  transform={`rotate(${side * 18} ${x} ${y})`}
                />
              );
            })
          : null}
      </G>
    );
  }

  if (family === 'cane') {
    // Arching canes with berries clustered along them.
    const ripeness = Math.min(Math.max((clamped - 0.5) / 0.5, 0), 1);
    const berry = headSize * 0.16;
    return (
      <G>
        {Array.from({ length: 3 }, (_, index) => {
          const side = index - 1;
          const tipX = cx + side * H * 0.26 * scale;
          const tipY = baseY - stemHeight * (0.9 - Math.abs(side) * 0.18);
          return (
            <G key={`cane-${index}`}>
              <Path
                d={`M ${cx} ${baseY} Q ${cx + side * H * 0.1 * scale} ${baseY - stemHeight * 0.6} ${tipX} ${tipY}`}
                stroke={Theme.leafDeep}
                strokeWidth={stemWidth * 0.7}
                fill="none"
                strokeLinecap="round"
              />
              {ripeness > 0
                ? Array.from({ length: 2 }, (_, b) => (
                    <Circle
                      key={`berry-${index}-${b}`}
                      cx={tipX - side * berry * b * 1.4}
                      cy={tipY + berry * (1 + b * 1.5)}
                      r={berry * ripeness}
                      fill="#8E4585"
                    />
                  ))
                : null}
            </G>
          );
        })}
      </G>
    );
  }

  if (family === 'tree') {
    // Trunk and canopy, with fruit appearing as it ripens.
    const ripeness = Math.min(Math.max((clamped - 0.55) / 0.45, 0), 1);
    const canopy = H * 0.3 * scale;
    const trunkHeight = stemHeight * 0.62;
    const canopyY = baseY - trunkHeight - canopy * 0.5;
    return (
      <G>
        <Rect
          x={cx - stemWidth * 0.9}
          y={baseY - trunkHeight}
          width={stemWidth * 1.8}
          height={trunkHeight}
          rx={stemWidth * 0.5}
          fill={Theme.soilDeep}
        />
        <Circle cx={cx} cy={canopyY} r={canopy} fill={Theme.leaf} />
        <Circle cx={cx - canopy * 0.5} cy={canopyY + canopy * 0.28} r={canopy * 0.66} fill={Theme.leafLight} />
        <Circle cx={cx + canopy * 0.5} cy={canopyY + canopy * 0.3} r={canopy * 0.6} fill={Theme.leafDeep} />
        {ripeness > 0
          ? Array.from({ length: 3 }, (_, index) => (
              <Circle
                key={`fruit-${index}`}
                cx={cx + (index - 1) * canopy * 0.62}
                cy={canopyY + canopy * (index === 1 ? 0.52 : 0.2)}
                r={canopy * 0.19 * ripeness}
                fill="#E4572E"
              />
            ))
          : null}
      </G>
    );
  }

  // Herbs are bushy rather than tall - several short stems from one crown.
  return (
    <G>
      {Array.from({ length: 4 }, (_, index) => {
        const width = stemWidth * 0.7;
        const shootHeight = stemHeight * 0.8;
        return (
          <G key={`shoot-${index}`} transform={`rotate(${(index - 2) * 13 + 6} ${cx} ${baseY})`}>
            <Rect
              x={cx - width / 2}
              y={baseY - shootHeight}
              width={width}
              height={shootHeight}
              rx={width / 2}
              fill={Theme.leafDeep}
            />
            {Array.from({ length: 3 }, (_, leafIndex) => (
              <Circle
                key={`herb-leaf-${leafIndex}`}
                cx={cx + (leafIndex % 2 === 0 ? leafSize * 0.16 : -leafSize * 0.16)}
                cy={baseY - shootHeight * (0.45 + 0.25 * leafIndex)}
                r={leafSize * 0.17}
                fill={leafIndex % 2 === 0 ? Theme.leaf : Theme.leafLight}
              />
            ))}
          </G>
        );
      })}
    </G>
  );
}
