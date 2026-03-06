/**
 * secrets service — encrypted secret storage/retrieval using company_secrets table.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { getConfig } from "../config.js";
import { notFound } from "../errors.js";

export interface SecretEntry {
  id: string;
  companyId: string;
  key: string;
  encryptedValue: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
}

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;

function deriveKey(masterSecret: string): Buffer {
  // Derive a deterministic 32-byte key from the master secret
  return scryptSync(masterSecret, "seaclip-secrets-salt", KEY_LEN);
}

function encrypt(plaintext: string, key: Buffer): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decrypt(
  encryptedBase64: string,
  ivBase64: string,
  authTagBase64: string,
  key: Buffer,
): string {
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

// In-memory store (replace with Drizzle company_secrets table)
// Format: "companyId:key" → SecretEntry
const secretStore = new Map<string, SecretEntry>();

function storeKey(companyId: string, key: string): string {
  return `${companyId}:${key}`;
}

export async function setSecret(
  companyId: string,
  key: string,
  value: string,
): Promise<void> {
  const config = getConfig();
  const derivedKey = deriveKey(config.jwtSecret);
  const { encrypted, iv, authTag } = encrypt(value, derivedKey);

  const existing = secretStore.get(storeKey(companyId, key));
  const now = new Date().toISOString();

  const entry: SecretEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    companyId,
    key,
    encryptedValue: `${encrypted}.${authTag}`, // Store authTag concatenated
    iv,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  secretStore.set(storeKey(companyId, key), entry);
}

export async function getSecret(
  companyId: string,
  key: string,
): Promise<string> {
  const entry = secretStore.get(storeKey(companyId, key));
  if (!entry) {
    throw notFound(`Secret "${key}" not found for company "${companyId}"`);
  }

  const config = getConfig();
  const derivedKey = deriveKey(config.jwtSecret);

  const [encryptedBase64, authTagBase64] = entry.encryptedValue.split(".");
  if (!encryptedBase64 || !authTagBase64) {
    throw new Error("Malformed encrypted secret");
  }

  return decrypt(encryptedBase64, entry.iv, authTagBase64, derivedKey);
}

export async function deleteSecret(
  companyId: string,
  key: string,
): Promise<void> {
  const sk = storeKey(companyId, key);
  if (!secretStore.has(sk)) {
    throw notFound(`Secret "${key}" not found`);
  }
  secretStore.delete(sk);
}

export async function listSecretKeys(companyId: string): Promise<string[]> {
  const keys: string[] = [];
  for (const [sk, entry] of secretStore.entries()) {
    if (entry.companyId === companyId) {
      keys.push(entry.key);
    }
  }
  return keys.sort();
}
