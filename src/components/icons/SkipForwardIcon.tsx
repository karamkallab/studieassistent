import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "player-skip-forward" icon, stroke-based, 24x24 viewBox.
export function SkipForwardIcon({ size = 16, color = '#1D2A38', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 5v14l10-7L6 5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <Line x1={18} y1={5} x2={18} y2={19} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
