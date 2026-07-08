import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "sun" icon: circle + 8 rays, stroke-based, 24x24 viewBox.
export function SunIcon({ size = 18, color = '#FFFFFF', strokeWidth = 2 }: Props) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={strokeWidth} />
      {rays.map((deg) => (
        <Line
          key={deg}
          x1={12} y1={3} x2={12} y2={5.5}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </Svg>
  );
}
