import { authClient } from "../../src/lib/auth-client";
import { trpc } from "../../src/lib/trpc";
import { configureRevenueCat, purchasePro } from "../../src/lib/revenuecat";
import { useSession } from "../../src/hooks/use-session";
import { useChatStore } from "../../src/stores/chat";
import { useMutation } from "@tanstack/react-query";
import { Alert, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";

const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000";

export default function ProfileScreen() {
  const sessionQuery = useSession();
  const subscriptionQuery = trpc.subscription.get.useQuery();
  const resetChat = useChatStore((state) => state.reset);

  const deleteMutation = useMutation({
    mutationFn: () => trpc.account.delete.mutate(),
    onSuccess: () => {
      resetChat();
      authClient.signOut();
    }
  });

  useEffect(() => {
    if (sessionQuery.data?.user?.id) {
      configureRevenueCat(sessionQuery.data.user.id);
    }
  }, [sessionQuery.data?.user?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Subscription</Text>
        <Text style={styles.subtitle}>
          Status: {subscriptionQuery.data?.status ?? "loading"}
        </Text>
        <Text style={styles.subtitle}>
          Entries used: {subscriptionQuery.data?.entriesUsed ?? "--"} /{" "}
          {subscriptionQuery.data?.entriesLimit ?? "--"}
        </Text>
        <Text style={styles.caption}>
          Billed via App Store or Play Store. Cancel anytime in your account
          settings.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            try {
              await purchasePro();
              Alert.alert("Purchase complete", "Your subscription is active.");
            } catch (err) {
              Alert.alert(
                "Upgrade failed",
                err instanceof Error ? err.message : "Try again"
              );
            }
          }}
        >
          <Text style={styles.primaryButtonText}>Upgrade to Pro</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Data & Privacy</Text>
        <Pressable onPress={() => Linking.openURL(`${webUrl}/privacy`)}>
          <Text style={styles.link}>Privacy Policy</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`${webUrl}/terms`)}>
          <Text style={styles.link}>Terms of Service</Text>
        </Pressable>
        <Pressable
          onPress={() => deleteMutation.mutate()}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Delete account</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Pressable
          onPress={() => {
            resetChat();
            authClient.signOut();
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() =>
          Alert.alert(
            "Export",
            "Export is available in the web dashboard for Pro subscribers."
          )
        }
      >
        <Text style={styles.link}>Export data (Pro)</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0f14",
    padding: 16,
    gap: 12
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16
  },
  title: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  subtitle: {
    color: "rgba(248,250,252,0.6)",
    marginBottom: 4
  },
  caption: {
    color: "rgba(248,250,252,0.5)",
    fontSize: 12,
    marginTop: 6
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#0c0f14",
    fontWeight: "600"
  },
  link: {
    color: "#f8fafc",
    marginTop: 8
  },
  deleteButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.5)",
    paddingVertical: 8,
    alignItems: "center"
  },
  deleteButtonText: {
    color: "#fecaca"
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#f8fafc"
  }
});
