import { trpc } from "../../src/lib/trpc";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

function getCurrentMonth() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export default function SummaryScreen() {
  const [month, setMonth] = useState(getCurrentMonth());
  const summaryQuery = trpc.summary.get.useQuery({ month });
  const subscriptionQuery = trpc.subscription.get.useQuery();

  const exportMutation = trpc.export.file.useMutation({
    onSuccess: () => {
      Alert.alert("Export ready", "CSV export downloaded on web. Use the web app to download.");
    },
    onError: () => {
      Alert.alert("Upgrade required", "Upgrade to Pro to export data.");
    }
  });

  const summary = summaryQuery.data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Month</Text>
        <TextInput value={month} onChangeText={setMonth} style={styles.input} />
      </View>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Total income</Text>
        <Text style={styles.metricValue}>
          {summary ? formatCurrency(summary.totalIncome) : "--"}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Total expense</Text>
        <Text style={styles.metricValue}>
          {summary ? formatCurrency(summary.totalExpense) : "--"}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Net balance</Text>
        <Text style={styles.metricValue}>
          {summary ? formatCurrency(summary.netBalance) : "--"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Category breakdown</Text>
        {summary?.categoryBreakdown.map((entry) => (
          <View key={entry.category} style={styles.row}>
            <Text style={styles.rowText}>{entry.category}</Text>
            <Text style={styles.rowText}>{formatCurrency(entry.total)}</Text>
          </View>
        )) ?? <Text style={styles.rowText}>No expenses logged yet.</Text>}
      </View>

  <Text
    style={styles.exportLink}
    onPress={() => {
      if (subscriptionQuery.data?.features.canExport) {
        exportMutation.mutate({ month, format: "csv" });
      } else {
        Alert.alert("Upgrade required", "Upgrade to Pro to export data.");
      }
    }}
  >
    Export CSV (Pro)
  </Text>
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
  label: {
    color: "rgba(248,250,252,0.6)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5
  },
  input: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f8fafc"
  },
  metricLabel: {
    color: "rgba(248,250,252,0.6)",
    fontSize: 12
  },
  metricValue: {
    marginTop: 6,
    fontSize: 22,
    color: "#f8fafc",
    fontWeight: "600"
  },
  sectionTitle: {
    color: "#f8fafc",
    fontWeight: "600",
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6
  },
  rowText: {
    color: "rgba(248,250,252,0.7)"
  },
  exportLink: {
    color: "#f8fafc",
    textAlign: "center"
  }
});
