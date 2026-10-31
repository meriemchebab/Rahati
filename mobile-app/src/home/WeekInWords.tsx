// "This week in words": the backend's summary of her own numbers (Gemini when it is
// set up on the server, a plain local summary otherwise). Never uses what she writes.
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "../theme";
import { Appear, Bone, Skeleton } from "../ui";
import { plural, t } from "../i18n";

/** First sentence becomes the headline, the rest the body. */
function split(summary: string) {
  // Break only after punctuation followed by a space, so "4.0/5" stays whole.
  const parts = summary.split(/(?<=[.!?؟])\s+/).map((x) => x.trim()).filter(Boolean);
  return { head: parts[0], rest: parts.slice(1, 4) };
}

const LIGHT = "rgba(255,255,255,0.45)";

export function WeekInWords({ summary, checkIns, loading }: { summary: string | null; checkIns: number; loading?: boolean }) {
  const { head, rest } = summary ? split(summary) : { head: t("Check in a few times this week."), rest: [t("Your summary appears here once you have checked in.")] };
  return (
    <LinearGradient colors={["rgba(174,174,255,0.85)", "rgba(185,150,255,0.85)", "rgba(221,164,255,0.85)"]} locations={[0, 0.51, 1]} style={s.card}>
      <Text style={s.eyebrow}>{t("THIS WEEK IN WORDS")}</Text>
      {loading ? (
        <Skeleton style={{ gap: 10, paddingVertical: 4 }}>
          <Bone w="85%" h={16} color={LIGHT} />
          <Bone w="100%" color={LIGHT} />
          <Bone w="92%" color={LIGHT} />
          <Bone w="60%" color={LIGHT} />
        </Skeleton>
      ) : (
        <Appear style={{ gap: 8 }}>
          <Text style={s.head}>{head}</Text>
          {rest.map((p, i) => (
            <Text key={i} style={s.body}>{p}</Text>
          ))}
        </Appear>
      )}
      <View>
        <Text style={s.foot}>
          {t("Written from your numbers only, never from what you write.")}{checkIns ? " " + plural(checkIns, "Based on {n} check-in.", "Based on {n} check-ins.") : ""}
        </Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 28, padding: 20, gap: 8 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.ink },
  head: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 26, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  foot: { fontFamily: fonts.regular, fontSize: 11, color: colors.inkSoft },
});
