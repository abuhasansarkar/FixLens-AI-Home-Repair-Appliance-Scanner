import { useRouter } from "expo-router";

export type AppRouter = ReturnType<typeof useRouter>;

export function safeGoBack(router: AppRouter, fallbackHref: string = "/tabs/home") {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackHref as any);
  }
}
