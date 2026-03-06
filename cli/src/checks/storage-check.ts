/**
 * Storage directory writability check
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface CheckResult {
  ok: boolean;
  label: string;
  detail?: string;
}

export async function checkStorage(baseDir: string): Promise<CheckResult> {
  const label = 'Storage';

  try {
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }

    const testFile = join(baseDir, `.seaclip-write-test-${Date.now()}`);
    writeFileSync(testFile, 'ok', 'utf-8');
    unlinkSync(testFile);

    return {
      ok: true,
      label,
      detail: `${baseDir} is writable`,
    };
  } catch (err) {
    return {
      ok: false,
      label,
      detail: `Cannot write to ${baseDir}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
