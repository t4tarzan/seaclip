/**
 * seaclip agent — Agent list/invoke subcommands
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

interface Agent {
  id: string;
  name: string;
  slug: string;
  status: string;
  adapterType: string;
  companyId: string;
  lastHeartbeatAt?: string;
}

interface HeartbeatResult {
  runId: string;
  status: string;
  tasksAssigned: number;
}

export function registerAgent(program: Command): void {
  const agent = program
    .command('agent')
    .description('Manage agents');

  // agent list
  agent
    .command('list')
    .description('List agents for a company')
    .requiredOption('-c, --company <id>', 'Company ID or slug')
    .option('--host <url>', 'SeaClip server URL')
    .option('--json', 'Output as JSON')
    .action(async (opts: { company: string; host?: string; json?: boolean }) => {
      ensureConfigured();
      const spinner = opts.json ? null : ora('Fetching agents…').start();
      try {
        const baseUrl = getBaseUrl(opts);
        const data = await apiGet<{ agents: Agent[] }>(
          `${baseUrl}/api/companies/${opts.company}/agents`
        );
        if (spinner) spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(data.agents, null, 2));
          return;
        }

        const agents = data.agents;
        if (agents.length === 0) {
          console.log(chalk.dim('\nNo agents found for this company.\n'));
          return;
        }

        console.log(chalk.bold(`\n  Agents for company ${opts.company} (${agents.length})\n`));
        const statusColor: Record<string, (s: string) => string> = {
          active: chalk.green,
          idle: chalk.blue,
          error: chalk.red,
          offline: chalk.dim,
        };
        for (const a of agents) {
          const colorFn = statusColor[a.status] ?? chalk.white;
          const statusStr = colorFn(`● ${a.status}`);
          const lastSeen = a.lastHeartbeatAt
            ? chalk.dim(`  last seen ${new Date(a.lastHeartbeatAt).toLocaleString()}`)
            : '';
          console.log(
            `  ${chalk.cyan(a.id.slice(0, 8))}  ${chalk.bold(a.name)}  ${statusStr}` +
              chalk.dim(`  [${a.adapterType}]`) +
              lastSeen
          );
        }
        console.log('');
      } catch (err) {
        if (spinner) spinner.fail(chalk.red('Failed to fetch agents'));
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  // agent invoke <id>
  agent
    .command('invoke <agentId>')
    .description('Manually trigger a heartbeat/invoke run for an agent')
    .requiredOption('-c, --company <id>', 'Company ID or slug')
    .option('--host <url>', 'SeaClip server URL')
    .option('--json', 'Output result as JSON')
    .action(async (agentId: string, opts: { company: string; host?: string; json?: boolean }) => {
      ensureConfigured();
      const spinner = opts.json ? null : ora(`Invoking agent ${agentId}…`).start();
      try {
        const baseUrl = getBaseUrl(opts);
        const result = await apiPost<HeartbeatResult>(
          `${baseUrl}/api/companies/${opts.company}/agents/${agentId}/invoke`,
          {}
        );
        if (spinner) spinner.succeed(chalk.green(`Agent ${agentId} invoked`));

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.dim(`  Run ID: ${result.runId}`));
        console.log(chalk.dim(`  Status: ${result.status}`));
        console.log(chalk.dim(`  Tasks assigned: ${result.tasksAssigned}\n`));
      } catch (err) {
        if (spinner) spinner.fail(chalk.red(`Failed to invoke agent ${agentId}`));
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}

function ensureConfigured(): void {
  if (!configExists()) {
    console.error(chalk.red('\nSeaClip is not configured yet.'));
    console.log(chalk.dim('Run ') + chalk.cyan('seaclip onboard') + chalk.dim(' first.\n'));
    process.exit(1);
  }
}
