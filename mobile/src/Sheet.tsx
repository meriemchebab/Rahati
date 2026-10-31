// Bottom sheet over the screen (log period, symptoms, settings…). The dark backdrop fades in
// while only the card slides up; closing plays it in reverse before the modal unmounts.
// Drag the card down to dismiss: past a quarter of its height (or a quick flick) closes it.
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { GestureDetector, GestureHandlerRootView, usePanGesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { colors, fonts } from "./theme";
import { t } from "./i18n";

const IN = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) };
const OUT = { duration: 220, easing: Easing.bezier(0.3, 0, 1, 1) };
const BACK = { damping: 22, stiffness: 260 };
const FLICK = 900; // points per second

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0); // 0 = hidden, 1 = shown
  const h = useSharedValue(600); // card height, measured once laid out
  const drag = useSharedValue(0); // how far the finger has pulled the card down

  useEffect(() => {
    if (visible) {
      drag.value = 0;
      setMounted(true);
      p.value = withTiming(1, IN);
      return;
    }
    p.value = withTiming(0, OUT);
    const t = setTimeout(() => setMounted(false), OUT.duration);
    return () => clearTimeout(t);
  }, [visible, p, drag]);

  // Only a downward drag activates it, so scrolling inside the sheet still works.
  const pan = usePanGesture({
    activeOffsetY: 10,
    failOffsetX: [-24, 24],
    onUpdate: (e) => {
      drag.value = Math.max(0, e.translationY);
    },
    onDeactivate: (e) => {
      if (drag.value > h.value * 0.25 || e.velocityY > FLICK) scheduleOnRN(onClose);
      else drag.value = withSpring(0, BACK);
    },
  });

  // Fade the backdrop as the card is pulled away too.
  const backdrop = useAnimatedStyle(() => ({ opacity: p.value * (1 - Math.min(drag.value / Math.max(h.value, 1), 1) * 0.6) }));
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * h.value + drag.value }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("Close")} />
        </Animated.View>
        <View style={s.bottom} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 20 }, card]} onLayout={(e) => (h.value = e.nativeEvent.layout.height)}>
              <View style={s.grabber} />
              <View style={s.head}>
                <Text style={s.title}>{title}</Text>
                <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t("Close")}>
                  <Ionicons name="close" size={24} color={colors.ink} />
                </Pressable>
              </View>
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(4,0,15,0.35)" },
  bottom: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14, width: "100%", maxWidth: 520, alignSelf: "center" },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lavender, marginTop: -8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
});
