import React from 'react';
import {
  View, ScrollView, StyleSheet,
  type StyleProp, type ViewStyle,
} from 'react-native';
import { DottedBackground } from './DottedBackground';
import { colors } from '../theme/tokens';

type Props = {
  scroll?: boolean;
  header?: React.ReactNode;
  // Rendered as a sibling of the scrollable body, inside the outer
  // viewport-fixed container — for FABs, toasts, anything `position:
  // absolute` that must stay pinned to the screen instead of scrolling
  // away with content (which is where `children` lives).
  overlay?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<any>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  children: React.ReactNode;
};

// Shared page shell: paper background + dotted notebook grid, applied once
// here instead of duplicated per screen. `header`, if given, renders above
// the scrollable body as fixed chrome with its own static dot patch: the
// body's dots live *inside* the scrollable content (via flexGrow so the
// content box's height, not just the viewport's, gets covered) so they
// scroll together with whatever's on the page rather than staying pinned.
export function ScreenContainer({ scroll = true, header, overlay, contentContainerStyle, style, refreshControl, keyboardShouldPersistTaps, children }: Props) {
  // `contentContainerStyle` lands on this box (not the ScrollView's own
  // wrapper) so per-screen layout like `justifyContent` or padding works
  // identically whether the screen scrolls or not.
  const body = (
    <View style={[styles.dottedLayer, contentContainerStyle]}>
      <DottedBackground />
      {children}
    </View>
  );

  return (
    <View style={[styles.root, style]}>
      {header && (
        <View style={styles.headerDotted}>
          <DottedBackground />
          {header}
        </View>
      )}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          {body}
        </ScrollView>
      ) : body}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  dottedLayer: { flex: 1, position: 'relative' },
  headerDotted: { position: 'relative' },
});
