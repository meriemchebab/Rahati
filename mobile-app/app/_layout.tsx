import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Nunito_700Bold } from "@expo-google-fonts/nunito";
import { Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold } from "@expo-google-fonts/cairo";
import { AuthProvider, useAuth } from "../src/auth";
import { colors } from "../src/theme";
import { Splash } from "../src/Splash";
import { loadUiLang, uiLang } from "../src/i18n";

function Gate() {
  const { ready } = useAuth();
  if (!ready) return <Splash />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}

// Styles name the Poppins weights everywhere. In Arabic the same names are loaded from Cairo,
// so every screen switches font without touching its styles.
const POPPINS = { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Nunito_700Bold };
const CAIRO = { Poppins_400Regular: Cairo_400Regular, Poppins_500Medium: Cairo_500Medium, Poppins_600SemiBold: Cairo_600SemiBold, Poppins_700Bold: Cairo_700Bold, Nunito_700Bold: Cairo_700Bold };

function App() {
  const [loaded] = useFonts(uiLang() === "ar" ? CAIRO : POPPINS);
  if (!loaded) return <Splash />; // the logo, not an empty screen, while fonts load
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Gate />
          </AuthProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Reads the app language first (it decides the font and the layout direction), then starts. */
export default function RootLayout() {
  const [langReady, setLangReady] = useState(false);
  useEffect(() => {
    loadUiLang().finally(() => setLangReady(true));
  }, []);
  return langReady ? <App /> : <Splash />;
}
