import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "stack" icon: three layered chevron slabs, stroke-based, 24x24 viewBox.
export function StackIcon({ size = 18, color = '#1D2A38', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4 3 9l9 5 9-5-9-5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M3 13.5 12 18.5 21 13.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
