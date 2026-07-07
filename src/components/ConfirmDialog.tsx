import React, { useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../theme/tokens';

export type ConfirmButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type ConfirmState = {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
};

// react-native-web's Alert.alert is a no-op (does not render anything or
// invoke button callbacks), so screens that need working confirm dialogs
// on web must use this instead.
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((title: string, message: string | undefined, buttons: ConfirmButton[]) => {
    setState({ title, message, buttons });
  }, []);

  const dismiss = () => setState(null);

  const element = (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={st.overlay}>
        <View style={st.card}>
          <Text style={st.title}>{state?.title}</Text>
          {!!state?.message && <Text style={st.message}>{state.message}</Text>}
          <View style={st.buttons}>
            {state?.buttons.map((b, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [st.btn, pressed && st.btnPressed]}
                onPress={() => { dismiss(); b.onPress?.(); }}
              >
                <Text style={[
                  st.btnTxt,
                  b.style === 'cancel' && st.btnTxtCancel,
                  b.style === 'destructive' && st.btnTxtDestructive,
                ]}>
                  {b.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  return { confirm, element };
}

const st = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(29,42,56,0.4)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: colors.paper,
    borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder,
    padding: spacing.lg, gap: spacing.sm,
  },
  title: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink },
  message: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  buttons: { marginTop: spacing.sm, gap: spacing.xs },
  btn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.button },
  btnPressed: { backgroundColor: colors.cardBg },
  btnTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink, textAlign: 'right' },
  btnTxtCancel: { fontFamily: fontFamily.body, color: colors.inkMuted },
  btnTxtDestructive: { color: colors.rust },
});
