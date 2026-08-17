import { describe, expect, it } from "vitest";

import { authenticationErrorMessage, isAuthenticationCancellation } from "../src/utils/auth-errors";

describe("authentication error handling", () => {
  it.each(["SIGN_IN_CANCELLED", "-5", "ERR_REQUEST_CANCELED", "1001"])(
    "recognizes %s as a user cancellation",
    (code) => expect(isAuthenticationCancellation({ code })).toBe(true),
  );

  it("does not hide provider failures", () => {
    expect(isAuthenticationCancellation({ code: "NETWORK_ERROR" })).toBe(false);
    expect(authenticationErrorMessage(new Error("Provider unavailable"))).toBe("Provider unavailable");
  });

  it("uses a safe fallback for unknown errors", () => {
    expect(authenticationErrorMessage({})).toMatch(/could not complete sign-in/i);
  });
});
