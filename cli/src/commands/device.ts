/**
 * seaclip device — Edge device list/register/ping subcommands
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

interface Device {
  id: string;
  hostname: string;
  ipAddress?: string;
  deviceType: string;
  status: string;
  companyId: string;
  registeredAt: string;
  lastSeenAt?: string;
}

interface PingResult {
  deviceId: string;
  latencyMs: number;
  online: boolean;
  message?: string;
}

export function registerDevice(program: Command): void {
  const device = program
    .command('device')
    .description('Manage edge devices');

  // device list
  device
    .command('list')
    .description('List all registered edge devices')
    .requiredOption('-c, --company <id>', 'Company ID or slug')
    .option('--host <url>', 'SeaClip server URL')
    .option('--json', 'Output as JSON')
    .action(async (opts: { company: string; host?: string; json?: boolean }) => {
      ensureConfigured();
      const spinner = opts.json ? null : ora('Fetching edge devices…').start();
      try {
        const baseUrl = getBaseUrl(opts);
        const data = await apiGet<{ devices: Device[] }>(
          `${baseUrl}/api/companies/${opts.company}/devices`
        );
        if (spinner) spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(data.devices, null, 2));
          return;
        }

        const devices = data.devices;
        if (devices.length === 0) {
          console.log(chalk.dim('\nNo edge devices registered.'));
          console.log(chalk.dim('Register one with: ') + chalk.cyan('seaclip device register\n'));
          return;
        }

        console.log(chalk.bold(`\n  Edge Devices (${devices.length})\n`));
        const statusColor: Record<string, (s: string) => string> = {
          online: chalk.green,
          offline: chalk.red,
          degraded: chalk.yellow,
        };
        for (const d of devices) {
          const colorFn = statusColor[d.status] ?? chalk.dim;
          const statusStr = colorFn(`● ${d.status}`);
          const ip = d.ipAddress ? chalk.dim(` [${d.ipAddress}]`) : '';
          const lastSeen = d.lastSeenAt
            ? chalk.dim(`  last seen ${new Date(d.lastSeenAt).toLocaleString()}`)
            : '';
          console.log(
            `  ${chalk.cyan(d.id.slice(0, 8))}  ${chalk.bold(d.hostname)}${ip}  ${statusStr}` +
              chalk.dim(`  ${d.deviceType}`) +
              lastSeen
          );
        }
        console.log('');
      } catch (err) {
        if (spinner) spinner.fail(chalk.red('Failed to fetch devices'));
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  // device register
  device
    .command('register')
    .description('Register a new edge device')
    .requiredOption('-c, --company <id>', 'Company ID or slug')
    .option('--host <url>', 'SeaClip server URL')
    .option('--hostname <hostname>', 'Device hostname')
    .option('--ip <ip>', 'Device IP address')
    .option('--type <type>', 'Device type (e.g. raspberry-pi, jetson-nano, android)')
    .action(
      async (opts: { company: string; host?: string; hostname?: string; ip?: string; type?: string }) => {
        ensureConfigured();

        let { hostname, ip, type } = opts;

        if (!hostname || !type) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'hostname',
              message: 'Device hostname:',
              when: !hostname,
              validate: (v: string) => v.trim().length > 0 || 'Hostname is required',
            },
            {
              type: 'input',
              name: 'ip',
              message: 'Device IP address (optional):',
              when: !ip,
            },
            {
              type: 'list',
              name: 'type',
              message: 'Device type:',
              when: !type,
              choices: ['raspberry-pi', 'jetson-nano', 'jetson-orin', 'android', 'x86-linux', 'mac', 'other'],
            },
          ]);
          hostname = hostname ?? answers.hostname;
          ip = ip ?? answers.ip ?? undefined;
          type = type ?? answers.type;
        }

        const spinner = ora(`Registering device "${hostname}"…`).start();
        try {
          const baseUrl = getBaseUrl(opts);
          const device = await apiPost<Device>(
            `${baseUrl}/api/companies/${opts.company}/devices`,
            { hostname, ipAddress: ip, deviceType: type }
          );
          spinner.succeed(chalk.green(`Device registered: ${device.hostname}`));
          console.log(chalk.dim(`  ID: ${device.id}`));
          console.log(chalk.dim(`  Type: ${device.deviceType}`));
          if (device.ipAddress) console.log(chalk.dim(`  IP: ${device.ipAddress}`));
          console.log('');
        } catch (err) {
          spinner.fail(chalk.red('Failed to register device'));
          console.error(chalk.red(err instanceof Error ? err.message : String(err)));
          process.exit(1);
        }
      }
    );

  // device ping <id>
  device
    .command('ping <deviceId>')
    .description('Ping an edge device to check reachability')
    .requiredOption('-c, --company <id>', 'Company ID or slug')
    .option('--host <url>', 'SeaClip server URL')
    .option('--json', 'Output as JSON')
    .action(
      async (deviceId: string, opts: { company: string; host?: string; json?: boolean }) => {
        ensureConfigured();
        const spinner = opts.json ? null : ora(`Pinging device ${deviceId}…`).start();
        try {
          const baseUrl = getBaseUrl(opts);
          const result = await apiPost<PingResult>(
            `${baseUrl}/api/companies/${opts.company}/devices/${deviceId}/ping`,
            {}
          );
          if (spinner) spinner.stop();

          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          if (result.online) {
            console.log(
              chalk.green(`✓ Device ${deviceId} is online`) +
                chalk.dim(` — ${result.latencyMs}ms`)
            );
          } else {
            console.log(
              chalk.red(`✗ Device ${deviceId} is offline`) +
                (result.message ? chalk.dim(` — ${result.message}`) : '')
            );
          }
          console.log('');
        } catch (err) {
          if (spinner) spinner.fail(chalk.red(`Failed to ping device ${deviceId}`));
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
