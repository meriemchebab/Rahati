// The Figma "landing page": lavender gradient with the Rahati logo in the middle.
import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "./ui";

export function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <LinearGradient colors={["#C5B8FE", "#E9E9FC", "#C5B8FE"]} locations={[0.06, 0.5, 0.95]} style={s.fill}>
      <View style={s.center}>
        <Icon name="logoMark" width={208} height={186} />
        <View style={s.word}>
          <Icon name="logoWord" width={94} height={24} />
        </View>
      </View>
      {children}
    </LinearGradient>
  );
}

export function Logo({ scale = 1 }: { scale?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Icon name="logoMark" width={208 * scale} height={186 * scale} />
      <View style={{ marginTop: -8 * scale }}>
        <Icon name="logoWord" width={94 * scale} height={24 * scale} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  word: { marginTop: -8 },
});
