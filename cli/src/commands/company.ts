/**
 * seaclip company — Company list/create subcommands
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

interface Company {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  agentCount?: number;
}

export function registerCompany(program: Command): void {
  const company = program
    .command('company')
    .description('Manage companies');

  // company list
  company
    .command('list')
    .description('List all companies')
    .option('--host <url>', 'SeaClip server URL')
    .option('--json', 'Output as JSON')
    .action(async (opts: { host?: string; json?: boolean }) => {
      ensureConfigured();
      const spinner = opts.json ? null : ora('Fetching companies…').start();
      try {
        const baseUrl = getBaseUrl(opts);
        const data = await apiGet<{ companies: Company[] }>(`${baseUrl}/api/companies`);
        if (spinner) spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(data.companies, null, 2));
          return;
        }

        const companies = data.companies;
        if (companies.length === 0) {
          console.log(chalk.dim('\nNo companies found. Create one with: ') + chalk.cyan('seaclip company create\n'));
          return;
        }

        console.log(chalk.bold(`\n  Companies (${companies.length})\n`));
        for (const c of companies) {
          console.log(
            `  ${chalk.cyan(c.id.slice(0, 8))}  ${chalk.bold(c.name)}` +
              chalk.dim(`  /${c.slug}`) +
              (c.agentCount !== undefined ? chalk.dim(`  ${c.agentCount} agents`) : '')
          );
        }
        console.log('');
      } catch (err) {
        if (spinner) spinner.fail(chalk.red('Failed to fetch companies'));
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  // company create
  company
    .command('create')
    .description('Create a new company')
    .option('--host <url>', 'SeaClip server URL')
    .option('--name <name>', 'Company name')
    .option('--slug <slug>', 'Company URL slug')
    .action(async (opts: { host?: string; name?: string; slug?: string }) => {
      ensureConfigured();

      let name = opts.name;
      let slug = opts.slug;

      if (!name || !slug) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Company name:',
            when: !name,
            validate: (v: string) => v.trim().length > 0 || 'Name is required',
          },
          {
            type: 'input',
            name: 'slug',
            message: 'Company slug (URL-safe identifier):',
            when: !slug,
            default: (ans: { name?: string }) => {
              const n = name ?? ans.name ?? '';
              return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            },
            validate: (v: string) =>
              /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v) || 'Slug must be lowercase alphanumeric with hyphens',
          },
        ]);
        name = name ?? answers.name;
        slug = slug ?? answers.slug;
      }

      const spinner = ora(`Creating company "${name}"…`).start();
      try {
        const baseUrl = getBaseUrl(opts);
        const company = await apiPost<Company>(`${baseUrl}/api/companies`, { name, slug });
        spinner.succeed(chalk.green(`Company created: ${company.name}`));
        console.log(chalk.dim(`  ID: ${company.id}`));
        console.log(chalk.dim(`  Slug: ${company.slug}\n`));
      } catch (err) {
        spinner.fail(chalk.red('Failed to create company'));
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
