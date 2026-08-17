import { useUser } from "@clerk/expo";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";

import { serviceReadiness } from "@/config/env";
import { clearPurchaseIdentity, configurePurchases } from "@/services/purchases";

export function PurchaseSync({ children }: PropsWithChildren) {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (!serviceReadiness.purchases || !isLoaded) return;
    if (user) void configurePurchases(user.id);
    else void clearPurchaseIdentity();
  }, [isLoaded, user]);
  return children;
}
