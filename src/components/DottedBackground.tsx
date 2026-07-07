import React, { useId } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = {
  style?: StyleProp<ViewStyle>;
};

const GRID = 18;
const DOT_RADIUS = 1;

// Notebook-paper dot grid — an SVG <Pattern> tiled via <Rect fill="url(#)">,
// not a bitmap, so it stays crisp at any size. Sizes to whatever box it's
// given (absoluteFillObject by default), so a descendant placed inside
// scrollable content scrolls along with that content rather than sitting
// fixed behind it.
//
// The pattern id must be unique per instance: on web, SVG ids live in one
// global namespace, and navigators keep multiple screens mounted at once
// (tabs always; stacks too), so a hardcoded id here made every screen's
// `url(#...)` reference resolve to whichever instance the browser picked,
// silently blanking the dots on every screen but one.
export function DottedBackground({ style }: Props) {
  const patternId = `dotted-bg-pattern-${useId()}`;

  return (
    <Svg
      style={[StyleSheet.absoluteFill, style]}
      width="100%"
      height="100%"
      pointerEvents="none"
    >
      <Defs>
        <Pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={GRID}
          height={GRID}
        >
          <Circle cx={GRID / 2} cy={GRID / 2} r={DOT_RADIUS} fill={colors.dot} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
    </Svg>
  );
}
