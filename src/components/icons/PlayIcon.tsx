import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Filled "play" triangle, 24x24 viewBox.
export function PlayIcon({ size = 14, color = '#F4D35E' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5v14l11-7z" fill={color} />
    </Svg>
  );
}
