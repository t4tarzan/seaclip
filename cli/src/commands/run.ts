/**
 * seaclip run — Start the SeaClip server process
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { readConfig, configExists } from '../config/store.js';
import { buildEnvFromConfig } from '../config/env.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registerRun(program: Command): void {
  program
    .command('run')
    .description('Start the SeaClip server')
    .option('-p, --port <port>', 'Override server port')
    .option('--host <host>', 'Override server host')
    .option('--env-file <path>', 'Load additional environment variables from a .env file')
    .action(async (opts: { port?: string; host?: string; envFile?: string }) => {
      await runServer(opts);
    });
}

async function runServer(opts: { port?: string; host?: string; envFile?: string }): Promise<void> {
  if (!configExists()) {
    console.error(chalk.red('\nSeaClip is not configured yet.'));
    console.log(chalk.dim('Run ') + chalk.cyan('seaclip onboard') + chalk.dim(' to get started.\n'));
    process.exit(1);
  }

  const config = readConfig();
  const env = buildEnvFromConfig(config);

  // Allow CLI option overrides
  if (opts.port) env['PORT'] = opts.port;
  if (opts.host) env['HOST'] = opts.host;

  // Load additional .env file if provided
  if (opts.envFile) {
    const { config: dotenvConfig } = await import('dotenv');
    dotenvConfig({ path: opts.envFile, override: false });
  }

  // Locate the server entry point
  const candidates = [
    resolve(__dirname, '../../server/dist/index.js'),
    resolve(process.cwd(), 'server/dist/index.js'),
    resolve(process.cwd(), 'dist/index.js'),
  ];

  const serverEntry = candidates.find((p) => existsSync(p));

  if (!serverEntry) {
    console.error(chalk.red('\nCould not find the server entry point.'));
    console.log(chalk.dim('Expected one of:\n') + candidates.map((p) => chalk.dim(`  ${p}`)).join('\n'));
    console.log(chalk.dim('\nRun ') + chalk.cyan('pnpm build') + chalk.dim(' first to compile the server.\n'));
    process.exit(1);
  }

  const port = env['PORT'] ?? String(config.server.port);
  const spinner = ora(`Starting SeaClip server on port ${port}…`).start();

  const child = spawn('node', [serverEntry], {
    env: env as NodeJS.ProcessEnv,
    stdio: 'inherit',
  });

  child.once('spawn', () => {
    spinner.succeed(
      chalk.green(`SeaClip server started`) +
        chalk.dim(` — http://localhost:${port}`)
    );
    console.log(chalk.dim('Press Ctrl+C to stop.\n'));
  });

  child.once('error', (err) => {
    spinner.fail(chalk.red(`Failed to start server: ${err.message}`));
    process.exit(1);
  });

  child.once('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(chalk.red(`\nServer exited with code ${code}`));
      process.exit(code);
    }
  });

  // Forward signals to child process
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => {
      child.kill(sig);
    });
  }
}
