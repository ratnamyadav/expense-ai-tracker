import { createApiClient, type Health } from "@acme/api";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export default function App() {
  const client = useMemo(
    () => createApiClient({ baseUrl: API_BASE_URL }),
    []
  );
  const [status, setStatus] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await client.getHealth();
        if (mounted) {
          setStatus(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [client]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Expense AI Tracker</Text>
        </View>
        <Text style={styles.title}>Mobile expense cockpit</Text>
        <Text style={styles.subtitle}>
          Expo SDK 54 syncs with the same API surface powering expense insights.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Live check</Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {status ? "Connected" : error ? "Offline" : "Connecting"}
            </Text>
          </View>
        </View>

        {status ? (
          <View style={styles.cardBody}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Service</Text>
              <Text style={styles.rowValue}>{status.app}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Timestamp</Text>
              <Text style={styles.rowValue}>{status.timestamp}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>API base</Text>
              <Text style={styles.rowValue}>{API_BASE_URL}</Text>
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color="#6ee7ff" />
            <Text style={styles.loadingText}>Waking the API...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Shared API layer - Biome tooling</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0f14",
    paddingHorizontal: 24
  },
  hero: {
    marginTop: 24,
    marginBottom: 32
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  badgeText: {
    color: "#e2e8f0",
    letterSpacing: 2,
    fontSize: 11,
    textTransform: "uppercase"
  },
  title: {
    marginTop: 16,
    fontSize: 34,
    fontWeight: "600",
    color: "#f8fafc"
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "rgba(248,250,252,0.7)",
    lineHeight: 22
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardLabel: {
    color: "rgba(248,250,252,0.6)",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 11
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#6ee7ff"
  },
  statusText: {
    color: "rgba(248,250,252,0.75)",
    fontSize: 12
  },
  cardBody: {
    marginTop: 20,
    gap: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  rowLabel: {
    color: "rgba(248,250,252,0.6)",
    fontSize: 13
  },
  rowValue: {
    color: "#f8fafc",
    fontSize: 13
  },
  loading: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: {
    color: "rgba(248,250,252,0.6)"
  },
  errorBox: {
    marginTop: 20,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.5)",
    backgroundColor: "rgba(248,113,113,0.15)"
  },
  errorText: {
    color: "#fecaca"
  },
  footer: {
    marginTop: 28,
    alignItems: "center"
  },
  footerText: {
    color: "rgba(248,250,252,0.5)",
    fontSize: 12
  }
});
