import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "help" icon, stroke-based, 24x24 viewBox.
export function HelpCircleIcon({ size = 18, color = '#1D2A38', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={16.7} r={0.9} fill={color} />
    </Svg>
  );
}
