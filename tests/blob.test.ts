import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { blobToArrayBuffer, sha256Hex } from "../src/utils/blob";

describe("blobToArrayBuffer", () => {
  it("converts a standard Blob to an ArrayBuffer when arrayBuffer() is present", async () => {
    const text = "FixLens AI Home Repair Appliance Scanner";
    const blob = new Blob([text], { type: "text/plain" });
    const buffer = await blobToArrayBuffer(blob);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(buffer)).toBe(text);
  });

  it("converts a Blob using FileReader when arrayBuffer is undefined (React Native environment)", async () => {
    const text = "React Native Hermes Blob Simulation";
    const blob = new Blob([text], { type: "text/plain" });
    Object.defineProperty(blob, "arrayBuffer", { value: undefined });

    // Mock global FileReader
    class MockFileReader {
      result: ArrayBuffer | null = null;
      error: Error | null = null;
      onloadend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      readAsArrayBuffer(b: Blob) {
        new Response(b).arrayBuffer().then((buf) => {
          this.result = buf;
          this.onloadend?.();
        }).catch((err) => {
          this.error = err;
          this.onerror?.();
        });
      }
    }

    vi.stubGlobal("FileReader", MockFileReader);
    try {
      const buffer = await blobToArrayBuffer(blob);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(new TextDecoder().decode(buffer)).toBe(text);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("falls back to Response.arrayBuffer when neither is present", async () => {
    const text = "Fallback stream simulation";
    const blob = new Blob([text], { type: "text/plain" });
    Object.defineProperty(blob, "arrayBuffer", { value: undefined });

    const buffer = await blobToArrayBuffer(blob);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(buffer)).toBe(text);
  });
});

describe("sha256Hex", () => {
  it("computes SHA-256 hex matching Node crypto", () => {
    const inputs = [
      "",
      "FixLens test image binary data 12345",
      "The quick brown fox jumps over the lazy dog",
      new Uint8Array([0, 1, 2, 3, 254, 255, 128, 64]),
    ];

    for (const input of inputs) {
      const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
      const expected = createHash("sha256").update(bytes).digest("hex");
      const actual = sha256Hex(bytes);
      expect(actual).toBe(expected);
      expect(actual).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
