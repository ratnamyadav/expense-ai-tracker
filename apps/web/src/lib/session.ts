import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }
  return session.user;
}
