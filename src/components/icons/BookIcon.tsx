import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tabler-style "book-2" icon: open book, stroke-based, 24x24 viewBox.
export function BookIcon({ size = 18, color = '#FFFFFF', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 19a2 2 0 0 1 2-2h6v-13.5a1.5 1.5 0 0 0-1.5-1.5h-4.5a2 2 0 0 0-2 2v15Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 19a2 2 0 0 0-2-2h-6v-13.5a1.5 1.5 0 0 1 1.5-1.5h4.5a2 2 0 0 1 2 2v15Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
