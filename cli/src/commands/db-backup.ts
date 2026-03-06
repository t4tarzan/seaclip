/**
 * seaclip db:backup — PostgreSQL backup using pg_dump
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig, configExists } from '../config/store.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execFileAsync = promisify(execFile);

export function registerDbBackup(program: Command): void {
  program
    .command('db:backup')
    .description('Backup the SeaClip database using pg_dump')
    .option('-o, --output <dir>', 'Output directory for backup file', process.cwd())
    .option('--filename <name>', 'Override backup filename (default: seaclip-<timestamp>.sql)')
    .action(async (opts: { output: string; filename?: string }) => {
      await runDbBackup(opts);
    });
}

async function runDbBackup(opts: { output: string; filename?: string }): Promise<void> {
  if (!configExists()) {
    console.error(chalk.red('\nSeaClip is not configured yet.'));
    console.log(chalk.dim('Run ') + chalk.cyan('seaclip onboard') + chalk.dim(' first.\n'));
    process.exit(1);
  }

  const config = readConfig();

  if (config.database.mode !== 'postgres') {
    console.log(chalk.yellow('\nDatabase is embedded SQLite.'));
    const dataDir = config.storage.baseDir;
    const dbFile = join(dataDir, 'seaclip.db');
    console.log(
      chalk.dim('  To back up, copy: ') + chalk.cyan(dbFile) + chalk.dim(' to a safe location.\n')
    );
    return;
  }

  const connectionString = config.database.connectionString!;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = opts.filename ?? `seaclip-${timestamp}.sql`;
  const outPath = join(opts.output, filename);

  const spinner = ora(`Backing up database to ${outPath}…`).start();

  try {
    await execFileAsync('pg_dump', [
      '--clean',
      '--if-exists',
      '--no-password',
      '-f',
      outPath,
      connectionString,
    ]);
    spinner.succeed(chalk.green(`Database backed up to ${outPath}`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found') || msg.includes('ENOENT')) {
      spinner.fail(
        chalk.red('pg_dump not found — install PostgreSQL client tools')
      );
    } else {
      spinner.fail(chalk.red(`Backup failed: ${msg}`));
    }
    process.exit(1);
  }
}
