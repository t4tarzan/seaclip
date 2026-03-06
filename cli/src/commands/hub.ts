/**
 * seaclip hub — Federated hub list/register subcommands
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig, configExists } from '../config/store.js';

function getBaseUrl(opts: { host?: string }): string {
  const config = readConfig();
  const host = opts.host ?? `http://localhost:${config.server.port}`;
  return host.replace(/\/$/, '');
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

interface Hub {
  id: string;
  name: string;
  apiUrl: string;
  status: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  registeredAt: string;
}

export function registerHub(program: Command): void {
  const hub = program
    .command('hub')
    .description('Manage federated hubs');

  // hub list
  hub
    .command('list')
    .description('List all registered federated hubs')
    .option('--host <url>', 'SeaClip server URL')
    .option('--json', 'Output as JSON')
    .action(async (opts: { host?: string; json?: boolean }) => {
      ensureConfigured();
      const spinner = opts.json ? null : ora('Fetching hubs…').start();
      try {
        const baseUrl = getBaseUrl(opts);
        const data = await apiGet<{ hubs: Hub[] }>(`${baseUrl}/api/federation/hubs`);
        if (spinner) spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(data.hubs, null, 2));
          return;
        }

        const hubs = data.hubs;
        if (hubs.length === 0) {
          console.log(chalk.dim('\nNo federated hubs registered.'));
          console.log(chalk.dim('Register one with: ') + chalk.cyan('seaclip hub register\n'));
          return;
        }

        console.log(chalk.bold(`\n  Federated Hubs (${hubs.length})\n`));
        const statusColor: Record<string, (s: string) => string> = {
          connected: chalk.green,
          disconnected: chalk.red,
          syncing: chalk.yellow,
          pending: chalk.dim,
        };
        for (const h of hubs) {
          const colorFn = statusColor[h.status] ?? chalk.dim;
          const statusStr = colorFn(`● ${h.status}`);
          const lastSync = h.lastSyncAt
            ? chalk.dim(`  synced ${new Date(h.lastSyncAt).toLocaleString()}`)
            : '';
          const syncBadge = h.syncEnabled
            ? chalk.dim(' [sync on]')
            : chalk.dim(' [sync off]');
          console.log(
            `  ${chalk.cyan(h.id.slice(0, 8))}  ${chalk.bold(h.name)}  ${statusStr}${syncBadge}` +
              chalk.dim(`\n    ${h.apiUrl}`) +
              lastSync
          );
        }
        console.log('');
      } catch (err) {
        if (spinner) spinner.fail(chalk.red('Failed to fetch hubs'));
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  // hub register
  hub
    .command('register')
    .description('Register a remote SeaClip hub for federation')
    .option('--host <url>', 'SeaClip server URL (local hub)')
    .option('--name <name>', 'Friendly name for the remote hub')
    .option('--api-url <url>', 'Remote hub API URL')
    .option('--api-key <key>', 'Remote hub API key (if authenticated)')
    .option('--sync', 'Enable automatic sync (default: true)')
    .action(
      async (opts: {
        host?: string;
        name?: string;
        apiUrl?: string;
        apiKey?: string;
        sync?: boolean;
      }) => {
        ensureConfigured();

        let { name, apiUrl, apiKey } = opts;

        if (!name || !apiUrl) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Remote hub name:',
              when: !name,
              validate: (v: string) => v.trim().length > 0 || 'Name is required',
            },
            {
              type: 'input',
              name: 'apiUrl',
              message: 'Remote hub API URL:',
              when: !apiUrl,
              validate: (v: string) => {
                try {
                  new URL(v);
                  return true;
                } catch {
                  return 'Please enter a valid URL';
                }
              },
            },
            {
              type: 'password',
              name: 'apiKey',
              message: 'Remote hub API key (leave blank if local_trusted):',
              when: !apiKey,
            },
            {
              type: 'confirm',
              name: 'syncEnabled',
              message: 'Enable automatic sync?',
              default: true,
            },
          ]);
          name = name ?? answers.name;
          apiUrl = apiUrl ?? answers.apiUrl;
          apiKey = apiKey ?? answers.apiKey ?? undefined;
          opts.sync = opts.sync ?? answers.syncEnabled;
        }

        const spinner = ora(`Registering hub "${name}"…`).start();
        try {
          const baseUrl = getBaseUrl(opts);
          const hub = await apiPost<Hub>(`${baseUrl}/api/federation/hubs`, {
            name,
            apiUrl,
            apiKey: apiKey || undefined,
            syncEnabled: opts.sync !== false,
          });
          spinner.succeed(chalk.green(`Hub registered: ${hub.name}`));
          console.log(chalk.dim(`  ID: ${hub.id}`));
          console.log(chalk.dim(`  API URL: ${hub.apiUrl}`));
          console.log(chalk.dim(`  Status: ${hub.status}`));
          console.log(chalk.dim(`  Sync: ${hub.syncEnabled ? 'enabled' : 'disabled'}\n`));
        } catch (err) {
          spinner.fail(chalk.red('Failed to register hub'));
          console.error(chalk.red(err instanceof Error ? err.message : String(err)));
          process.exit(1);
        }
      }
    );
}

function ensureConfigured(): void {
  if (!configExists()) {
    console.error(chalk.red('\nSeaClip is not configured yet.'));
    console.log(chalk.dim('Run ') + chalk.cyan('seaclip onboard') + chalk.dim(' first.\n'));
    process.exit(1);
  }
}
