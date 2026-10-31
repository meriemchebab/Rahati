import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../src/auth";
import { NavBar } from "../../src/NavBar";
import { colors } from "../../src/theme";

export default function TabsLayout() {
  const { me } = useAuth();
  if (!me) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(p) => <NavBar {...p} />} screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        // Pages slide a little toward the tab you picked, in step with the nav pill. Each page stays
        // solid near the middle of the switch, so the two never sit half see-through together
        // (that showed as an empty, washed-out flash).
        transitionSpec: { animation: "timing", config: { duration: 220 } },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            opacity: current.progress.interpolate({ inputRange: [-1, -0.35, 0, 0.35, 1], outputRange: [0, 1, 1, 1, 0] }),
            transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-24, 0, 24] }) }],
          },
        }),
      }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="therapy" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
