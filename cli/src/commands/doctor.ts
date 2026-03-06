/**
 * seaclip doctor — System health checks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig, configExists } from '../config/store.js';
import { checkDatabase } from '../checks/database-check.js';
import { checkOllama } from '../checks/ollama-check.js';
import { checkPort } from '../checks/port-check.js';
import { checkStorage } from '../checks/storage-check.js';
import { checkTelegram } from '../checks/telegram-check.js';

interface CheckResult {
  ok: boolean;
  label: string;
  detail?: string;
}

export function registerDoctor(program: Command): void {
  program
    .command('doctor')
    .description('Run system health checks (DB, Ollama, ports, storage, Telegram)')
    .option('--json', 'Output results as JSON')
    .action(async (opts: { json?: boolean }) => {
      await runDoctor(opts.json ?? false);
    });
}

async function runDoctor(jsonOutput: boolean): Promise<void> {
  if (!jsonOutput) {
    console.log(chalk.bold('\n── SeaClip Doctor ──\n'));
  }

  let config;
  if (!configExists()) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: 'Not configured' }));
    } else {
      console.log(chalk.red('SeaClip is not configured.'));
      console.log(chalk.dim('Run ') + chalk.cyan('seaclip onboard') + chalk.dim(' first.\n'));
    }
    process.exit(1);
  }

  config = readConfig();
  const results: CheckResult[] = [];

  // Run all checks with spinners
  async function runCheck(
    label: string,
    fn: () => Promise<CheckResult>
  ): Promise<CheckResult> {
    const spinner = jsonOutput ? null : ora(`Checking ${label}…`).start();
    const result = await fn();
    if (!jsonOutput && spinner) {
      if (result.ok) {
        spinner.succeed(
          chalk.green(result.label) +
            (result.detail ? chalk.dim(` — ${result.detail}`) : '')
        );
      } else {
        spinner.fail(
          chalk.red(result.label) +
            (result.detail ? chalk.dim(` — ${result.detail}`) : '')
        );
      }
    }
    results.push(result);
    return result;
  }

  // 1. Database
  await runCheck('Database', () =>
    checkDatabase(config.database.connectionString)
  );

  // 2. Ollama
  await runCheck('Ollama', () => checkOllama(config.ollama.baseUrl));

  // 3. Server port
  await runCheck(`Port ${config.server.port}`, () =>
    checkPort(config.server.port)
  );

  // 4. Storage
  await runCheck('Storage', () => checkStorage(config.storage.baseDir));

  // 5. Telegram (optional)
  await runCheck('Telegram', () => checkTelegram(config.telegram.botToken));

  // 6. Edge device ping sweep (if we can reach the API)
  await runCheck('API reachability', async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`http://localhost:${config.server.port}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        return { ok: true, label: 'API reachability', detail: `Server responding on port ${config.server.port}` };
      }
      return { ok: false, label: 'API reachability', detail: `HTTP ${res.status} from /api/health` };
    } catch {
      return {
        ok: false,
        label: 'API reachability',
        detail: `Server not running on port ${config.server.port} (start with seaclip run)`,
      };
    }
  });

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const failCount = results.filter((r) => !r.ok).length;

  console.log('');
  if (failCount === 0) {
    console.log(chalk.green.bold('✓ All checks passed — SeaClip is healthy\n'));
  } else {
    console.log(
      chalk.yellow.bold(`⚠  ${failCount} check(s) failed`) +
        chalk.dim(' — review the output above\n')
    );
    process.exit(1);
  }
}
