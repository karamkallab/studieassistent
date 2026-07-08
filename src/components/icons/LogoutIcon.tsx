import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "logout" icon, stroke-based, 24x24 viewBox.
export function LogoutIcon({ size = 18, color = '#C1666B', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={20} y1={12} x2={10.5} y2={12} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M16.5 8.5 20 12l-3.5 3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
