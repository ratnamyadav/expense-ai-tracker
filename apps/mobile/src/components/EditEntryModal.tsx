import {
  Categories,
  PaymentModeSchema,
  TransactionTypeSchema
} from "@acme/api";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export type EditableEntry = {
  type: "expense" | "income" | "refund";
  amount: number;
  category: string | null;
  subcategory: string | null;
  date: string;
  paymentMode: "cash" | "upi" | "card" | "bank" | "wallet" | "unknown";
  notes: string | null;
};

export function EditEntryModal({
  visible,
  value,
  onClose,
  onSave
}: {
  visible: boolean;
  value: EditableEntry;
  onClose: () => void;
  onSave: (value: EditableEntry) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value, visible]);

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Edit entry</Text>
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.rowWrap}>
              {TransactionTypeSchema.options.map((option) => (
                <Pressable
                  key={option}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      type: TransactionTypeSchema.parse(option)
                    })
                  }
                  style={[
                    styles.chip,
                    draft.type === option && styles.chipActive
                  ]}
                >
                  <Text style={styles.chipText}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              value={String(draft.amount)}
              onChangeText={(text) =>
                setDraft({
                  ...draft,
                  amount: Number(text)
                })
              }
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.rowWrap}>
              <Pressable
                onPress={() => setDraft({ ...draft, category: null })}
                style={[
                  styles.chip,
                  draft.category === null && styles.chipActive
                ]}
              >
                <Text style={styles.chipText}>Uncategorized</Text>
              </Pressable>
              {Categories.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setDraft({ ...draft, category })}
                  style={[
                    styles.chip,
                    draft.category === category && styles.chipActive
                  ]}
                >
                  <Text style={styles.chipText}>{category}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Date</Text>
            <TextInput
              value={draft.date}
              onChangeText={(text) => setDraft({ ...draft, date: text })}
              style={styles.input}
            />

            <Text style={styles.label}>Payment mode</Text>
            <View style={styles.rowWrap}>
              {PaymentModeSchema.options.map((option) => (
                <Pressable
                  key={option}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      paymentMode: PaymentModeSchema.parse(option)
                    })
                  }
                  style={[
                    styles.chip,
                    draft.paymentMode === option && styles.chipActive
                  ]}
                >
                  <Text style={styles.chipText}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={draft.notes ?? ""}
              onChangeText={(text) =>
                setDraft({
                  ...draft,
                  notes: text || null
                })
              }
              style={[styles.input, styles.notes]}
              multiline
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSave(draft)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%"
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12
  },
  form: {
    gap: 12
  },
  label: {
    color: "rgba(248,250,252,0.7)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 10,
    color: "#f8fafc",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  notes: {
    minHeight: 80
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  chipText: {
    color: "#f8fafc",
    fontSize: 12
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#f8fafc"
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#0c0f14",
    fontWeight: "600"
  }
});
