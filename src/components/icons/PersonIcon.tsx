import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "user" icon: head circle + shoulders arc, stroke-based, 24x24 viewBox.
export function PersonIcon({ size = 18, color = '#FFFFFF', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M5 20.5c0-4 3.5-6.5 7-6.5s7 2.5 7 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
