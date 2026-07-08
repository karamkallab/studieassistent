import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "rotate" (counter-clockwise reset) icon, stroke-based, 24x24 viewBox.
export function RotateCcwIcon({ size = 18, color = '#1D2A38', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path d="M4 16.5V12h4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
