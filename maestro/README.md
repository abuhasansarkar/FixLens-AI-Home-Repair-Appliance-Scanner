# FixLens Maestro journeys

Run these against a development or preview build with staging Clerk, Convex, RevenueCat, OpenAI, and notification configuration. The welcome smoke is credential-free. Returning-auth requires `MAESTRO_TEST_EMAIL` and `MAESTRO_TEST_PASSWORD`; onboarding requires a unique `MAESTRO_NEW_EMAIL` and `MAESTRO_NEW_PASSWORD` and pauses at verification because the email code is external.

The camera, hazardous-diagnosis, purchase, restore, push, and deletion release journeys require seeded staging fixtures and store/device automation. They are release gates documented in `PLAN.md`; never point destructive or purchase automation at production accounts.
