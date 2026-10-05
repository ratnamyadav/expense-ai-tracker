import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authClient } from "../src/lib/auth-client";
import { trpc } from "../src/lib/trpc";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const consentMutation = trpc.account.acceptConsent.useMutation();
  const googleEnabled = Boolean(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
  const appleEnabled = Boolean(process.env.EXPO_PUBLIC_APPLE_CLIENT_ID);

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (result.error) throw new Error(result.error.message ?? "Unable to send code");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      if (result.error) throw new Error(result.error.message ?? "Unable to verify code");
      if (accepted) {
        await consentMutation.mutateAsync({ version: "v1" });
      }
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify code");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(provider: "google" | "apple") {
    setError(null);
    if (!accepted) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }
    try {
      await AsyncStorage.setItem("consent:pending", "v1");
      const result = await authClient.signIn.social({ provider });
      if (result.error) throw new Error(result.error.message ?? "Unable to sign in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in with an email OTP.</Text>

        <Pressable
          style={[styles.socialButton, !googleEnabled && styles.socialDisabled]}
          onPress={() => handleSocial("google")}
          disabled={!googleEnabled}
        >
          <Text style={styles.socialText}>Continue with Google</Text>
        </Pressable>
        <Pressable
          style={[styles.socialButton, !appleEnabled && styles.socialDisabled]}
          onPress={() => handleSocial("apple")}
          disabled={!appleEnabled}
        >
          <Text style={styles.socialText}>Continue with Apple</Text>
        </Pressable>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          placeholderTextColor="rgba(248,250,252,0.5)"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {step === "otp" && (
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            placeholderTextColor="rgba(248,250,252,0.5)"
            style={styles.input}
            keyboardType="number-pad"
          />
        )}

        <Pressable onPress={() => setAccepted(!accepted)} style={styles.checkboxRow}>
          <View style={[styles.checkbox, accepted && styles.checkboxActive]} />
          <Text style={styles.checkboxText}>I agree to the Terms and Privacy Policy.</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={styles.primaryButton}
          onPress={step === "email" ? handleSendOtp : handleVerifyOtp}
          disabled={loading || !email || (step === "otp" && !otp) || !accepted}
        >
          {loading ? (
            <ActivityIndicator color="#0c0f14" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {step === "email" ? "Send code" : "Verify & continue"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0f14",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: "#f8fafc",
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 8,
    color: "rgba(248,250,252,0.7)",
  },
  socialButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingVertical: 10,
    alignItems: "center",
  },
  socialText: {
    color: "#f8fafc",
    fontSize: 13,
  },
  socialDisabled: {
    opacity: 0.4,
  },
  input: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#f8fafc",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: "#f8fafc",
  },
  checkboxText: {
    color: "rgba(248,250,252,0.6)",
    fontSize: 12,
  },
  error: {
    marginTop: 12,
    color: "#fecaca",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0c0f14",
    fontWeight: "600",
  },
});
