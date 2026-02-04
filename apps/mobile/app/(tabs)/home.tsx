import { parseTransactionLocally } from "@acme/api";
import { EditEntryModal, type EditableEntry } from "../../src/components/EditEntryModal";
import { trpc } from "../../src/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import {
  ExpoSpeechRecognitionModule,
  isRecognitionAvailable,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useChatStore } from "../../src/stores/chat";

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

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(getCurrentMonth());
  const [input, setInput] = useState("");
  const { messages, pending, addMessage, setPending } = useChatStore();
  const [editing, setEditing] = useState(false);
  const [listening, setListening] = useState(false);

  const summaryQuery = trpc.summary.get.useQuery({ month });

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary", month] });
      queryClient.invalidateQueries({ queryKey: ["transactions", month] });
    }
  });

  const parseMutation = trpc.ai.parseTransaction.useMutation();

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript;
    if (transcript) {
      setInput(transcript);
    }
  });

  useSpeechRecognitionEvent("error", () => {
    setListening(false);
    Alert.alert(
      "Voice input",
      "Speech recognition failed. Try again or type your message."
    );
  });

  async function handleSend() {
    if (!input.trim()) return;
    const content = input.trim();
    addMessage({ role: "user", content });
    setInput("");

    const local = parseTransactionLocally(content);
    let parsed = local;
    if (local.confidence < 0.7 || !local.amount || !local.type) {
      try {
        parsed = await parseMutation.mutateAsync({ text: content });
      } catch {
        Alert.alert("Parsing failed", "Try clarifying the amount or type.");
      }
    }

    if (!parsed.amount || !parsed.type) {
      addMessage({
        role: "assistant",
        content:
          "I need the amount and whether it's income or expense. Can you clarify?"
      });
      return;
    }

    addMessage({
      role: "assistant",
      content: "Confirm the details below before saving."
    });

    setPending({
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      subcategory: parsed.subcategory,
      date: parsed.date ?? new Date().toISOString().slice(0, 10),
      paymentMode: parsed.payment_mode ?? "unknown",
      notes: null
    });
  }

  async function handleSave(entry: EditableEntry) {
    try {
      await createMutation.mutateAsync({
        type: entry.type,
        amount: entry.amount,
        currency: "INR",
        category: entry.category,
        subcategory: entry.subcategory,
        paymentMode: entry.paymentMode,
        date: entry.date,
        notes: entry.notes,
        source: "chat"
      });
      setPending(null);
      setEditing(false);
    } catch (err) {
      Alert.alert(
        "Unable to save",
        err instanceof Error ? err.message : "Try again"
      );
    }
  }

  async function handleVoice() {
    if (listening) {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } finally {
        setListening(false);
      }
      return;
    }

    if (!(await isRecognitionAvailable())) {
      Alert.alert(
        "Voice input",
        "Speech recognition is unavailable on this device."
      );
      return;
    }

    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Voice input",
        "Microphone permission is required to use voice input."
      );
      return;
    }

    try {
      await ExpoSpeechRecognitionModule.start({
        lang: "en-IN",
        interimResults: true,
        maxAlternatives: 1
      });
    } catch {
      setListening(false);
      Alert.alert(
        "Voice input",
        "Speech recognition failed to start. Please try again."
      );
    }
  }

  const summary = summaryQuery.data;

  return (
    <SafeAreaView style={styles.container}>
      <Text className="text-xs uppercase tracking-[0.35em] text-white/60">
        Expense AI Tracker
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Month</Text>
        <TextInput
          value={month}
          onChangeText={setMonth}
          style={styles.input}
        />
        <Text style={styles.balanceLabel}>Net balance</Text>
        <Text style={styles.balanceValue}>
          {summary ? formatCurrency(summary.netBalance) : "--"}
        </Text>
        <Text style={styles.balanceHint}>
          Income {summary ? formatCurrency(summary.totalIncome) : "--"} - Expense{" "}
          {summary ? formatCurrency(summary.totalExpense) : "--"}
        </Text>
      </View>

      <View style={styles.chatCard}>
        <FlatList
          data={messages}
          keyExtractor={(_, index) => `msg-${index}`}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <View
              style={
                item.role === "user" ? styles.userBubble : styles.assistantBubble
              }
            >
              <Text
                style={
                  item.role === "user"
                    ? styles.userBubbleText
                    : styles.assistantBubbleText
                }
              >
                {item.content}
              </Text>
            </View>
          )}
        />

        {pending && (
          <View style={styles.confirmation}>
            <Text style={styles.confirmTitle}>
              {pending.type} - INR {pending.amount}
            </Text>
            <Text style={styles.confirmText}>
              {pending.category ?? "Uncategorized"} - {pending.paymentMode} -{" "}
              {pending.date}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setPending(null)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Discard</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditing(true)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSave(pending)}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Log an expense or income"
            placeholderTextColor="rgba(248,250,252,0.5)"
            style={styles.chatInput}
          />
          <Pressable onPress={handleVoice} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>
              {listening ? "Stop" : "Voice"}
            </Text>
          </Pressable>
          <Pressable onPress={handleSend} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Send</Text>
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>
          AI suggestions are drafts only. You must confirm before saving. Voice
          input stays on device and no audio is stored.
        </Text>
      </View>

      {pending && (
        <EditEntryModal
          visible={editing}
          value={pending}
          onClose={() => setEditing(false)}
          onSave={(value) => {
            setPending(value);
            setEditing(false);
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
    textTransform: "uppercase",
    fontSize: 10,
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
  balanceLabel: {
    marginTop: 12,
    color: "rgba(248,250,252,0.6)",
    fontSize: 12,
    textTransform: "uppercase"
  },
  balanceValue: {
    marginTop: 6,
    fontSize: 24,
    color: "#f8fafc",
    fontWeight: "600"
  },
  balanceHint: {
    marginTop: 4,
    color: "rgba(248,250,252,0.6)",
    fontSize: 12
  },
  chatCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 16,
    gap: 12
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 10,
    maxWidth: "80%"
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 10,
    maxWidth: "80%"
  },
  userBubbleText: {
    color: "#0c0f14",
    fontSize: 12
  },
  assistantBubbleText: {
    color: "#f8fafc",
    fontSize: 12
  },
  confirmation: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 12
  },
  confirmTitle: {
    color: "#f8fafc",
    fontWeight: "600"
  },
  confirmText: {
    marginTop: 4,
    color: "rgba(248,250,252,0.6)",
    fontSize: 12
  },
  confirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  chatInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f8fafc"
  },
  iconButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  iconButtonText: {
    color: "#f8fafc",
    fontSize: 12
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  primaryButtonText: {
    color: "#0c0f14",
    fontWeight: "600",
    fontSize: 12
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontSize: 12
  },
  disclaimer: {
    marginTop: 8,
    color: "rgba(248,250,252,0.6)",
    fontSize: 11
  }
});
