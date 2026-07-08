import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "arrow-right" icon, stroke-based, 24x24 viewBox.
export function ArrowRightIcon({ size = 16, color = '#1D2A38', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M14 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
