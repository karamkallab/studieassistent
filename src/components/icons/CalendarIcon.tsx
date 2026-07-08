import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "calendar" icon: rounded rect + two tabs + header rule, 24x24 viewBox.
export function CalendarIcon({ size = 18, color = '#FFFFFF', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={4.5} width={17} height={16} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={3.5} y1={9.5} x2={20.5} y2={9.5} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={8} y1={2.5} x2={8} y2={6.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={16} y1={2.5} x2={16} y2={6.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
