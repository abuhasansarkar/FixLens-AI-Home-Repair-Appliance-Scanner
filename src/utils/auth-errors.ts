const cancellationCodes = new Set([
  "-5",
  "1001",
  "ERR_CANCELED",
  "ERR_REQUEST_CANCELED",
  "SIGN_IN_CANCELLED",
]);

export function isAuthenticationCancellation(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return cancellationCodes.has(String(error.code));
}

export function authenticationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "The identity provider could not complete sign-in. Check your connection and try again.";
}
