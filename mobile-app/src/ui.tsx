// Shared building blocks, sized and colored to the Figma design.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  ImageSourcePropType,
  View,
  ViewStyle,
} from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "./theme";
import { svgs, SvgName } from "./svgs";
import { avatarChoice, AvatarName, DEFAULT_AVATAR, onAvatarChange } from "./local";
import { mirror, t } from "./i18n";

// ---------- layout ----------
export const NAV_SPACE = 110; // room under the floating nav bar

/** Scrolling page on the lavender background. Keeps the focused field above the keyboard. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  tabs = false,
  style,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  tabs?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const Scroller = Platform.OS === "web" ? ScrollView : KeyboardAwareScrollView;
  return (
    <Scroller
      bottomOffset={24}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        { paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: (tabs ? NAV_SPACE : 32) + insets.bottom },
        s.page,
        style,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.purple} /> : undefined}
    >
      {children}
    </Scroller>
  );
}

export function Card({ children, color = colors.surface, style }: { children: React.ReactNode; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, { backgroundColor: color }, style]}>{children}</View>;
}

/** Back button + centered title for pushed screens. */
export function TopBar({ title }: { title?: string }) {
  const router = useRouter();
  return (
    <View style={[s.rowCenter, { gap: 12 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Back")}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
        style={s.back}
        hitSlop={6}
      >
        <Ionicons style={mirror()} name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
      <Text style={[s.h2, { flex: 1, textAlign: "center", marginRight: 56 }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

// ---------- type ----------
type TP = { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export const H1 = ({ children, style }: TP) => <Text style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: TP) => <Text style={[s.h2, style]}>{children}</Text>;
export const Body = ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[s.body, style]}>{children}</Text>;
export const Small = ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[s.small, style]}>{children}</Text>;
export const Eyebrow = ({ children, style }: TP) => <Text style={[s.eyebrow, style]}>{children}</Text>;

/** Title with an underlined link on the right ("See all", "Browse all"). */
export function SectionHeader({ title, link, onLink, size = 18 }: { title: string; link?: string; onLink?: () => void; size?: number }) {
  return (
    <View style={s.rowCenter}>
      <Text style={[s.h2, { flex: 1, fontSize: size }]}>{title}</Text>
      {link ? (
        <Pressable onPress={onLink} hitSlop={10} accessibilityRole="link">
          <Text style={s.link}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- controls ----------
type BtnKind = "primary" | "soft" | "outline" | "pink" | "white" | "dashed" | "danger";
const BTN: Record<BtnKind, ViewStyle> = {
  primary: { backgroundColor: colors.purple },
  soft: { backgroundColor: colors.lavender },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.purple },
  pink: { backgroundColor: colors.pinkSoft },
  white: { backgroundColor: colors.white },
  dashed: { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.purple, borderStyle: "dashed", borderRadius: 20 },
  danger: { backgroundColor: colors.dangerSoft },
};
export function Button({
  title,
  onPress,
  kind = "primary",
  height = 48,
  loading,
  disabled,
  style,
  textStyle,
  icon,
}: {
  title: string;
  onPress?: () => void;
  kind?: BtnKind;
  height?: number;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { height, borderRadius: kind === "dashed" ? 20 : height / 2 },
        BTN[kind],
        { opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <View style={[s.rowCenter, { gap: 6 }]}>
          {icon}
          <Text style={[s.btnText, kind === "danger" && { color: colors.danger }, textStyle]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Rounded chip: lavender with purple border when on, white with lilac border when off. */
export function Chip({ label, on, onPress, style }: { label: string; on?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={[s.chip, on ? { backgroundColor: colors.lavender, borderColor: colors.purple } : null, style]}
    >
      <Text style={s.chipText}>{label}</Text>
    </Pressable>
  );
}

/** Small rounded label ("From Dr. Sara", "Mine", "Stress · 3"). */
export function Tag({ label, color = colors.lilac, style }: { label: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.tag, { backgroundColor: color }, style]}>
      <Text style={s.tagText}>{label}</Text>
    </View>
  );
}

export function Field({ label, error, hint, secureTextEntry, ...props }: TextInputProps & { label?: string; error?: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  const secret = !!secureTextEntry;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <View>
        <TextInput
          placeholderTextColor={colors.placeholder}
          {...props}
          secureTextEntry={secret && !shown}
          style={[
            s.input,
            props.multiline && { minHeight: 132, textAlignVertical: "top", paddingTop: 16 },
            secret && { paddingRight: 52 },
            error ? { borderColor: colors.danger } : null,
            props.style,
          ]}
        />
        {secret && (
          <Pressable accessibilityRole="button" accessibilityLabel={shown ? t("Hide password") : t("Show password")} onPress={() => setShown(!shown)} hitSlop={8} style={s.eye}>
            <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Small>{hint}</Small> : null}
    </View>
  );
}

export function ErrorText({ message }: { message: string | null | undefined }) {
  return message ? <Text style={s.errorBox}>{message}</Text> : null;
}
export function Notice({ message }: { message: string | null | undefined }) {
  return message ? <Text style={s.notice}>{message}</Text> : null;
}
// ---------- placeholders ----------
// Faded shapes shown in place of content that is still loading. Each Skeleton pulses as one
// block, so every bone inside it breathes together.
const BONE = "#ECE5FF";

/** Pulsing group of placeholder shapes. */
export function Skeleton({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[style, pulse]} accessibilityRole="progressbar" accessibilityLabel={t("Loading")}>
      {children}
    </Animated.View>
  );
}

/** One placeholder shape: a text line, a chip, a circle… */
export function Bone({ w = "100%", h = 12, r = 8, color = BONE, style }: { w?: ViewStyle["width"]; h?: number; r?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: color }, style]} />;
}

/** Fades content in once it replaces its placeholder. */
export function Appear({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeIn.duration(280)} style={style}>{children}</Animated.View>;
}

/** Placeholder lines for a list inside a card (entries, slots). */
export function SkeletonLines({ rows = 3 }: { rows?: number }) {
  return (
    <Skeleton style={{ gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ backgroundColor: colors.tint, borderRadius: 20, padding: 16, gap: 8 }}>
          <Bone w="35%" h={10} />
          <Bone w="92%" />
          <Bone w="64%" />
        </View>
      ))}
    </Skeleton>
  );
}

/** Placeholder cards for a page-level list (professionals, cards, to-dos, a detail page). */
export function Loading({ cards = 3 }: { cards?: number }) {
  return (
    <Skeleton style={{ gap: 16 }}>
      {Array.from({ length: cards }, (_, i) => (
        <View key={i} style={[s.card, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Bone w={44} h={44} r={22} />
            <View style={{ flex: 1, gap: 8 }}>
              <Bone w="55%" h={14} />
              <Bone w="35%" h={10} />
            </View>
          </View>
          <Bone w="95%" />
          <Bone w="70%" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Bone w={84} h={24} r={12} />
            <Bone w={64} h={24} r={12} />
          </View>
        </View>
      ))}
    </Skeleton>
  );
}

// ---------- images ----------
/** Renders one of the Figma SVGs; `color` replaces its white strokes/fills (nav icons). */
export function Icon({ name, width, height, color }: { name: SvgName; width: number; height?: number; color?: string }) {
  let xml = svgs[name];
  if (color) xml = xml.replace(/stroke="white"/g, `stroke="${color}"`).replace(/(<(?:path|use|rect|circle)[^>]*)fill="white"/g, `$1fill="${color}"`);
  return <SvgXml xml={xml} width={width} height={height ?? width} />;
}

const AVATAR_IMG: Record<AvatarName, ImageSourcePropType> = {
  brownWavy: require("../assets/avatars/flat_1_brown_wavy.jpg"),
  blondeBob: require("../assets/avatars/flat_2_blonde_bob.jpg"),
  blackLong: require("../assets/avatars/flat_3_black_long.jpg"),
  gingerUpdo: require("../assets/avatars/flat_4_ginger_updo.jpg"),
  pinkPixie: require("../assets/avatars/flat_5_pink_pixie.jpg"),
  redPlaid: require("../assets/avatars/flat_6_red_plaid.jpg"),
};

/** Her avatar in the lavender ring (header, profile). */
export function Avatar({ size = 54, choice }: { size?: number; choice?: AvatarName }) {
  const [picked, setPicked] = useState<AvatarName>(choice ?? DEFAULT_AVATAR);
  useEffect(() => {
    if (choice) return;
    avatarChoice().then(setPicked);
    return onAvatarChange(setPicked);
  }, [choice]);
  const name = choice ?? picked;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.ink, backgroundColor: "#FFE7E3", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {/* Zoomed a little so the face, not the shoulders, fills the circle. */}
      <Image source={AVATAR_IMG[name] ?? AVATAR_IMG[DEFAULT_AVATAR]} style={{ width: size * 1.2, height: size * 1.2, marginTop: size * 0.08 }} resizeMode="cover" />
    </View>
  );
}

export const s = StyleSheet.create({
  page: { gap: 26, width: "100%", maxWidth: 520, alignSelf: "center" },
  card: { borderRadius: radius.card, padding: 20, gap: 12, overflow: "hidden" },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  h1: { fontFamily: fonts.semibold, fontSize: 28, color: colors.ink },
  h2: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.ink },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, textDecorationLine: "underline" },
  btn: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  chip: { height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.chipLine, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  tagText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: 52, borderRadius: 20, backgroundColor: colors.white, paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 14, color: colors.ink, borderWidth: 1.5, borderColor: "transparent" },
  eye: { position: "absolute", right: 6, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  errorBox: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.danger, backgroundColor: "#FFE7E3", borderRadius: 14, padding: 12 },
  notice: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: "#1F6B4A", backgroundColor: "#DFF6EA", borderRadius: 14, padding: 12 },
});
