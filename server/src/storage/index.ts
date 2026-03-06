/**
 * Storage service — initializes and exports a singleton storage provider.
 *
 * Defaults to local disk storage. Swap out for S3 or other providers
 * by implementing StorageProvider and passing it to initStorage().
 */
import path from "node:path";
import { getConfig } from "../config.js";
import { LocalDiskProvider } from "./local-disk-provider.js";
import type { StorageProvider } from "./types.js";

export type { StorageProvider, GetObjectResult, StorageObject, ListObjectsResult } from "./types.js";
export { LocalDiskProvider } from "./local-disk-provider.js";

let _provider: StorageProvider | null = null;

export function initStorage(provider?: StorageProvider): StorageProvider {
  if (provider) {
    _provider = provider;
    return _provider;
  }

  const config = getConfig();
  const storagePath = path.join(config.seaclipHome, "storage");

  _provider = new LocalDiskProvider(storagePath);
  return _provider;
}

export function getStorage(): StorageProvider {
  if (!_provider) {
    return initStorage();
  }
  return _provider;
}
