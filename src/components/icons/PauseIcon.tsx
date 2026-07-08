import React from 'react';
import Svg, { Line } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "player-pause" icon, stroke-based, 24x24 viewBox.
export function PauseIcon({ size = 16, color = '#F7F5F0', strokeWidth = 2.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={8} y1={5} x2={8} y2={19} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={16} y1={5} x2={16} y2={19} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
