import * as Sentry from "@sentry/react-native";

import { env } from "@/config/env";

let initialized = false;
function redact(value:string|undefined){return value?.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [redacted]").replace(/\b(user|image|session|repair|appliance|serial|clerk|revenuecat)[-_ ]?(id|number)?[:= ]+[A-Za-z0-9_-]{6,}\b/gi,"$1 [redacted]").replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,"[identifier]");}

export function initializeMonitoring() {
  if (initialized) return;
  initialized = true;
  Sentry.init({
    dsn: env.sentryDsn,
    enabled: Boolean(env.sentryDsn),
    environment: env.appEnv,
    sendDefaultPii: false,
    tracesSampleRate: env.appEnv === "production" ? 0.1 : 0,
    beforeBreadcrumb(breadcrumb) {
      return { ...breadcrumb, data: undefined };
    },
    beforeSend(event) {
      if (event.request) event.request = { method: event.request.method };
      if (event.user) event.user = undefined;
      event.message=redact(event.message);
      for(const exception of event.exception?.values??[])exception.value=redact(exception.value);
      event.extra=undefined;
      return event;
    },
  });
}

export { Sentry };
