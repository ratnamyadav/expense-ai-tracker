import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../src/hooks/use-session";

export default function Index() {
  const { data, isLoading } = useSession();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0f14"
        }}
      >
        <ActivityIndicator color="#f8fafc" />
      </View>
    );
  }

  return data?.user ? <Redirect href="/(tabs)/home" /> : <Redirect href="/login" />;
}
