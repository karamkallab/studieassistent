import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "upload" icon, stroke-based, 24x24 viewBox.
export function UploadIcon({ size = 16, color = '#F7F5F0', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 8l4-4 4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={12} y1={4} x2={12} y2={15} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
