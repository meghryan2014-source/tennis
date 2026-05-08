// @ts-nocheck — DOM lib vs `node:stream/web` generic mismatch under strict mode (Node 22+ / Docker build).
/**
 * Runtime polyfills for older Node.js versions.
 * Undici (pulled in by modern HTTP stacks) expects Web API globals.
 * Node 18+ exposes most of these; on 16.x they may be missing from globalThis.
 */
import { Blob } from "node:buffer";
import { ReadableStream, TransformStream, WritableStream } from "node:stream/web";

const g = globalThis;

if (!g.Blob) {
  g.Blob = Blob;
}

/**
 * `File` is a global in Node 20+; `node:buffer` also exports it on newer releases.
 * Older Node only has `Blob`, so we provide a minimal `File extends Blob` for undici.
 */
if (!g.File) {
  const bufferNs = require("node:buffer") as typeof import("node:buffer") & {
    File?: new (bits: BlobPart[], name: string, options?: FilePropertyBag) => File;
  };
  if (typeof bufferNs.File === "function") {
    g.File = bufferNs.File as typeof File;
  } else {
    const BlobCtor = g.Blob;
    class FilePolyfill extends BlobCtor {
      readonly name: string;
      readonly lastModified: number;

      constructor(bits: BlobPart[], fileName: string, options?: FilePropertyBag) {
        super(bits, options);
        this.name = String(fileName);
        this.lastModified = options?.lastModified ?? Date.now();
      }
    }
    Object.defineProperty(FilePolyfill, "name", { value: "File" });
    g.File = FilePolyfill as unknown as typeof File;
  }
}

if (!g.ReadableStream) {
  g.ReadableStream = ReadableStream;
}
if (!g.WritableStream) {
  g.WritableStream = WritableStream;
}
if (!g.TransformStream) {
  g.TransformStream = TransformStream;
}
