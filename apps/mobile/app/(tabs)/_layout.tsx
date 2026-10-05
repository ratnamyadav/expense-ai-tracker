import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../../src/hooks/use-session";
import { trpc } from "../../src/lib/trpc";

export default function TabsLayout() {
  const { data, isLoading } = useSession();
  const consentMutation = trpc.account.acceptConsent.useMutation();

  useEffect(() => {
    const syncConsent = async () => {
      if (!data?.user?.id) return;
      const pending = await AsyncStorage.getItem("consent:pending");
      if (pending) {
        await consentMutation.mutateAsync({ version: pending });
        await AsyncStorage.removeItem("consent:pending");
      }
    };

    syncConsent();
  }, [data?.user?.id, consentMutation]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0f14",
        }}
      >
        <ActivityIndicator color="#f8fafc" />
      </View>
    );
  }

  if (!data?.user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0c0f14",
          borderTopColor: "rgba(255,255,255,0.1)",
        },
        tabBarActiveTintColor: "#f8fafc",
        tabBarInactiveTintColor: "rgba(248,250,252,0.5)",
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Chat" }} />
      <Tabs.Screen name="summary" options={{ title: "Summary" }} />
      <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
