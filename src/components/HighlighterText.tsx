import React from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { colors } from '../theme/tokens';

interface Props {
  children: string;
  textStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

export function HighlighterText({ children, textStyle, containerStyle }: Props) {
  const containerWidth = useSharedValue(0);
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const highlightStyle = useAnimatedStyle(() => {
    const s = progress.value;
    // Simulate left-edge pivot: translateX = (width/2) * (s - 1)
    return {
      transform: [
        { translateX: (containerWidth.value / 2) * (s - 1) },
        { scaleX: s },
        { rotate: '-0.8deg' },
      ],
    };
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && containerWidth.value === 0) {
      containerWidth.value = w;
      progress.value = reduceMotion
        ? 1
        : withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
    }
  };

  return (
    <View onLayout={handleLayout} style={[styles.container, containerStyle]}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, styles.highlight, highlightStyle]} />
      <Text style={textStyle}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  highlight: {
    backgroundColor: colors.highlight,
    borderRadius: 2,
  },
});
