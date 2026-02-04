import { trpc } from "../../src/lib/trpc";
import { EditEntryModal, type EditableEntry } from "../../src/components/EditEntryModal";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable
} from "react-native";

function getCurrentMonth() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export default function TransactionsScreen() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(getCurrentMonth());
  const [selected, setSelected] = useState<
    (EditableEntry & { id: string }) | null
  >(null);

  const listQuery = trpc.transactions.list.useQuery({ month });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", month] });
      queryClient.invalidateQueries({ queryKey: ["summary", month] });
    }
  });

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", month] });
      queryClient.invalidateQueries({ queryKey: ["summary", month] });
    }
  });

  const grouped = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    return items.reduce<Record<string, typeof items>>((acc, item) => {
      acc[item.date] = acc[item.date] ?? [];
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [listQuery.data]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Month</Text>
        <TextInput value={month} onChangeText={setMonth} style={styles.input} />
      </View>

      {Object.entries(grouped).map(([date, items]) => (
        <View key={date} style={styles.card}>
          <Text style={styles.sectionTitle}>{date}</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>
                  {item.type} - INR {item.amount}
                </Text>
                <Text style={styles.rowSubtitle}>
                  {item.category ?? "Uncategorized"} - {item.paymentMode}
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() =>
                    setSelected({
                      id: item.id,
                      type: item.type,
                      amount: item.amount,
                      category: item.category,
                      subcategory: item.subcategory,
                      date: item.date,
                      paymentMode: item.paymentMode,
                      notes: item.notes
                    })
                  }
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteMutation.mutate({ id: item.id })}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}

      {selected && (
        <EditEntryModal
          visible={Boolean(selected)}
          value={selected}
          onClose={() => setSelected(null)}
          onSave={(value) => {
            updateMutation.mutate({
              id: selected.id,
              type: value.type,
              amount: value.amount,
              currency: "INR",
              category: value.category,
              subcategory: value.subcategory,
              paymentMode: value.paymentMode,
              date: value.date,
              notes: value.notes
            });
            setSelected(null);
          }}
        />
      )}
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
  sectionTitle: {
    color: "#f8fafc",
    fontWeight: "600",
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8
  },
  rowTitle: {
    color: "#f8fafc",
    fontSize: 14
  },
  rowSubtitle: {
    color: "rgba(248,250,252,0.6)",
    fontSize: 12
  },
  actions: {
    flexDirection: "row",
    gap: 8
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontSize: 12
  },
  deleteButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  deleteButtonText: {
    color: "#fecaca",
    fontSize: 12
  }
});
