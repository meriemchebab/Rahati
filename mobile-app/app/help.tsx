import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Screen, TopBar } from "../src/ui";
import { colors, fonts } from "../src/theme";
import { t } from "../src/i18n";

// Only numbers we could verify; Algeria's other hotlines vary by source.
const NUMBERS = [
  { tel: "14", name: "Protection civile", hint: "Emergencies, ambulance, fire." },
  { tel: "17", name: "Police", hint: "If you are in danger right now." },
];

export default function Help() {
  const router = useRouter();
  return (
    <Screen>
      <TopBar title={t("Need help now?")} />
      <Card color={colors.dangerSoft} style={{ gap: 6 }}>
        <Text style={s.h2}>{t("If you are in danger, call now.")}</Text>
        <Text style={s.body}>{t("These calls are free, from any phone.")}</Text>
      </Card>
      {NUMBERS.map((n) => (
        <Pressable key={n.tel} onPress={() => Linking.openURL(`tel:${n.tel}`)} accessibilityRole="button" accessibilityLabel={t("Call {name}, {tel}", { name: n.name, tel: n.tel })}>
          <Card style={s.row}>
            <View style={s.num}><Text style={s.numText}>{n.tel}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{n.name}</Text>
              <Text style={s.small}>{t(n.hint)}</Text>
            </View>
            <Text style={s.call}>{t("Call")}</Text>
          </Card>
        </Pressable>
      ))}

      <Card color={colors.lilac} style={{ gap: 8 }}>
        <Text style={s.eyebrow}>{t("RIGHT NOW, FOR ONE MINUTE")}</Text>
        <Text style={s.body}>{t("Breathe in for 4 counts. Hold for 4. Breathe out for 6. Do it five times.")}</Text>
        <Text style={s.body}>{t("Name 5 things you can see, 4 you can touch, 3 you can hear.")}</Text>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.h2}>{t("Talk to someone")}</Text>
        <Text style={s.body}>{t("A verified woman professional, online or near you.")}</Text>
        <Button title={t("Find a professional")} height={52} onPress={() => router.replace("/therapy")} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  num: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.bold, fontSize: 22, color: colors.white },
  name: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  call: { fontFamily: fonts.semibold, fontSize: 15, color: colors.danger },
});
