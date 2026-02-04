import Purchases from "react-native-purchases";

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

export async function configureRevenueCat(userId?: string) {
  if (!apiKey) {
    return false;
  }

  try {
    Purchases.configure({ apiKey, appUserID: userId });
    if (userId) {
      await Purchases.logIn(userId);
    }
    return true;
  } catch {
    return false;
  }
}

export async function purchasePro() {
  if (!apiKey) {
    throw new Error("RevenueCat is not configured");
  }

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const packageToBuy = current?.availablePackages?.[0];
  if (!packageToBuy) {
    throw new Error("No subscription packages available");
  }

  return Purchases.purchasePackage(packageToBuy);
}
