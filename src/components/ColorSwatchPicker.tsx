import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { courseColors, colors, spacing } from '../theme/tokens';

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

export function ColorSwatchPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {courseColors.map(c => (
        <Pressable
          key={c.hex}
          onPress={() => onChange(c.hex)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={[
            styles.swatch,
            { backgroundColor: c.hex },
            value === c.hex && styles.swatchActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  swatch: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  swatchActive: { borderColor: colors.ink },
});
