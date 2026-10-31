// Floating nav bar: Figma purple bar, white outline icons. The active tab grows into a white
// pill holding its icon + name in that tab's own colour; the other tabs slide aside to make
// room. Old tab shrinks and fades its label while the new one grows, so the pill appears to
// move and morph. Animations run on the UI thread (Reanimated).
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import type { BottomTabBarProps } from "expo-router/tabs";
import { ChartNoAxesColumn, CircleUser, HeartHandshake, House, NotebookPen, type LucideIcon } from "lucide-react-native";
import { colors, fonts } from "./theme";
import { t } from "./i18n";

// One icon set (Lucide) so every tab has the same grid, size and line weight.
type TabDef = { label: string; Icon: LucideIcon; color: string };
const TABS: Record<string, TabDef> = {
  home: { label: "Home", Icon: House, color: "#524DFC" },
  stats: { label: "Stats", Icon: ChartNoAxesColumn, color: "#B935C0" },
  therapy: { label: "Therapy", Icon: HeartHandshake, color: "#0E8578" },
  journal: { label: "Journal", Icon: NotebookPen, color: "#A86A0C" },
  profile: { label: "Profile", Icon: CircleUser, color: "#C8401F" },
};
const ICON = 22;
const STROKE = 2;

// Figma purple bar, white outline icons, white pill around the active tab.
const BAR = colors.navPurple;
const IDLE = colors.white;
const PILL = colors.white;
const BAR_H = 62;
const PILL_H = 42;
const PAD = 10; // bar edge to the first/last tab
const GAP = 6; // icon to label
const ICON_BOX = 24;
// ~450ms settle, a touch of overshoot.
const SPRING = { damping: 19, stiffness: 170, mass: 0.9 };

function Tab({ tab, on, labelW, padX, onLabel, onPress }: { tab: TabDef; on: boolean; labelW: number; padX: number; onLabel: (w: number) => void; onPress: () => void }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(on ? 1 : 0, SPRING);
  }, [on, p]);

  // The tab's own width grows to fit its name; flexbox moves the neighbours aside.
  const box = useAnimatedStyle(() => ({ width: padX * 2 + ICON_BOX + Math.max(0, p.value) * (GAP + labelW) }));
  const bg = useAnimatedStyle(() => ({ opacity: Math.min(Math.max(p.value, 0), 1), transform: [{ scale: interpolate(p.value, [0, 1], [0.6, 1]) }] }));
  const dark = useAnimatedStyle(() => ({ opacity: 1 - Math.min(Math.max(p.value, 0), 1) }));
  const tinted = useAnimatedStyle(() => ({ opacity: Math.min(Math.max(p.value, 0), 1) }));
  const label = useAnimatedStyle(() => {
    const v = Math.min(Math.max(p.value, 0), 1);
    return { width: (GAP + labelW) * Math.max(0, p.value), opacity: interpolate(v, [0, 0.55, 1], [0, 0, 1]) };
  });

  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={t(tab.label)} accessibilityState={{ selected: on }} onPress={onPress} hitSlop={6}>
      <Animated.View style={[s.tab, box]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.pill, { backgroundColor: PILL }, bg]} />
        <View style={s.iconBox}>
          <Animated.View style={[StyleSheet.absoluteFill, s.center, dark]}>
            <tab.Icon size={ICON} strokeWidth={STROKE} color={IDLE} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, s.center, tinted]}>
            <tab.Icon size={ICON} strokeWidth={STROKE} color={tab.color} />
          </Animated.View>
        </View>
        <Animated.View style={[s.clip, label]}>
          <Text style={[s.label, { color: tab.color, marginLeft: GAP, width: labelW ? labelW + 1 : undefined }]} numberOfLines={1}>
            {t(tab.label)}
          </Text>
        </Animated.View>
      </Animated.View>
      {/* Invisible copy, measured once to size the pill. */}
      <Text style={[s.label, s.measure]} onLayout={(e) => onLabel(e.nativeEvent.layout.width)} numberOfLines={1}>
        {t(tab.label)}
      </Text>
    </Pressable>
  );
}

export function NavBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const active = Math.max(0, routes.findIndex((r) => r.key === state.routes[state.index]?.key));
  const [width, setWidth] = useState(0);
  const [labels, setLabels] = useState<Record<string, number>>({});

  // Fit the widest active tab plus the other icons on narrow phones: shrink the side padding.
  const widest = Math.max(0, ...routes.map((r) => labels[r.name] ?? 0));
  const room = width - PAD * 2 - routes.length * ICON_BOX - GAP - widest - (routes.length - 1) * 4;
  const padX = width ? Math.min(14, Math.max(8, room / (routes.length * 2))) : 14;

  // Slide the bar away while typing so it never covers the keyboard.
  const hide = useSharedValue(0);
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => (hide.value = withTiming(1, { duration: 180 })));
    const b = Keyboard.addListener("keyboardDidHide", () => (hide.value = withTiming(0, { duration: 220 })));
    return () => { a.remove(); b.remove(); };
  }, [hide]);
  const wrap = useAnimatedStyle(() => ({ opacity: 1 - hide.value, transform: [{ translateY: hide.value * 110 }] }));

  return (
    <Animated.View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 12) }, wrap]}>
      <View style={s.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {routes.map((r, i) => (
          <Tab
            key={r.key}
            tab={TABS[r.name]}
            on={i === active}
            labelW={labels[r.name] ?? 0}
            padX={padX}
            onLabel={(w) => setLabels((m) => (m[r.name] === w ? m : { ...m, [r.name]: w }))}
            onPress={() => i !== active && navigateToTab(r.key)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  bar: {
    width: "100%",
    maxWidth: 488,
    height: BAR_H,
    borderRadius: BAR_H / 2,
    backgroundColor: BAR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAD,
    shadowColor: "#3B37C8",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tab: { height: PILL_H, flexDirection: "row", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  pill: { borderRadius: PILL_H / 2 },
  iconBox: { width: ICON_BOX, height: ICON_BOX },
  center: { alignItems: "center", justifyContent: "center" },
  clip: { overflow: "hidden" },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
  // Hidden above the screen, not to the side: a side offset widens the page in right-to-left.
  measure: { position: "absolute", opacity: 0, top: -1000, pointerEvents: "none" },
});
