import React from 'react';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "target" icon: three concentric circles, stroke-based, 24x24 viewBox.
export function TargetIcon({ size = 18, color = '#FFFFFF', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}
