import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "hexagon" icon, stroke-based, 24x24 viewBox.
export function HexagonIcon({ size = 18, color = '#1D2A38', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9L12 2.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
