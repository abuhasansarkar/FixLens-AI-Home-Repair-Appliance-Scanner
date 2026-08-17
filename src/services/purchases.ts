import Purchases, { type PurchasesPackage } from "react-native-purchases";

import { env } from "@/config/env";

let configured = false;
let configuredUserId: string | undefined;

function key() {
  if (!env.revenueCatKey) throw new Error("RevenueCat is not configured for this platform.");
  return env.revenueCatKey;
}

export async function configurePurchases(appUserId: string) {
  if (!configured) {
    Purchases.configure({ apiKey: key(), appUserID: appUserId });
    configured = true;
    configuredUserId = appUserId;
    return;
  }
  if (configuredUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
  }
}

export async function clearPurchaseIdentity() {
  if (!configured || !configuredUserId) return;
  await Purchases.logOut();
  configuredUserId = undefined;
}

function ensureConfigured() {
  if (!configured || !configuredUserId) throw new Error("RevenueCat has not synchronized the authenticated user yet.");
}

export async function loadSubscriptionPackages() {
  ensureConfigured();
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchaseSubscription(subscriptionPackage: PurchasesPackage) {
  ensureConfigured();
  return Purchases.purchasePackage(subscriptionPackage);
}

export async function restoreSubscriptions() {
  ensureConfigured();
  return Purchases.restorePurchases();
}

export async function manageSubscription() {
  ensureConfigured();
  return Purchases.showManageSubscriptions();
}
