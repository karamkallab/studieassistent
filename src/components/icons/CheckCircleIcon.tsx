import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "circle-check" icon, stroke-based, 24x24 viewBox.
export function CheckCircleIcon({ size = 18, color = '#1D2A38', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.5 12.5l2.2 2.2 4.8-4.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
