import { getDb, schema } from "@acme/db";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

const otpExpiresIn = 300;
const authSecret = process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const expoScheme = process.env.EXPO_PUBLIC_APP_SCHEME;

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
        },
      }
    : {}),
};

async function sendOtpEmail({
  email,
  otp,
}: {
  email: string;
  otp: string;
}) {
  if (!process.env.EMAIL_FROM) {
    console.warn(
      `EMAIL_FROM is not set. OTP for ${email} is ${otp} (expires in ${otpExpiresIn}s).`,
    );
    return;
  }

  // Hook up your email provider here. For now we log to the console.
  console.info(
    `Send OTP ${otp} to ${email} from ${process.env.EMAIL_FROM} (expires in ${otpExpiresIn}s).`,
  );
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: appUrl,
  trustedOrigins: [appUrl, expoScheme ? `${expoScheme}://` : null].filter(
    (origin): origin is string => origin !== null,
  ),
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders,
  plugins: [
    emailOTP({
      expiresIn: otpExpiresIn,
      sendVerificationOTP: sendOtpEmail,
    }),
    expo(),
    nextCookies(),
  ],
});
