import { Redirect } from "expo-router";
import { useAuth } from "../src/auth";

export default function Index() {
  const { me } = useAuth();
  return <Redirect href={me ? "/home" : "/welcome"} />;
}
