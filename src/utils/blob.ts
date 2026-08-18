/**
 * Converts a Blob to an ArrayBuffer across React Native, Web, and Node.js environments.
 * React Native's native Blob does not implement `blob.arrayBuffer()`, requiring `FileReader`.
 */
export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error("FileReader result is not an ArrayBuffer"));
        }
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error("Failed to read blob data"));
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  return new Response(blob).arrayBuffer();
}
