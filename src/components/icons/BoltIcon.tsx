import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Tabler-style "bolt" icon, filled, 24x24 viewBox.
export function BoltIcon({ size = 14, color = '#1D2A38' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        fill={color}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
