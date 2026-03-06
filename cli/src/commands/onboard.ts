/**
 * seaclip onboard — Interactive setup wizard
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { writeConfig, readConfig, getConfigDir, getConfigPath, type SeaClipConfig } from '../config/store.js';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

export function registerOnboard(program: Command): void {
  program
    .command('onboard')
    .description('Interactive setup wizard — configure SeaClip for the first time')
    .option('--reset', 'Overwrite existing configuration')
    .action(async (opts: { reset?: boolean }) => {
      await runOnboard(opts.reset ?? false);
    });
}

async function runOnboard(reset: boolean): Promise<void> {
  const configPath = getConfigPath();

  if (existsSync(configPath) && !reset) {
    console.log(chalk.yellow('\nSeaClip is already configured.'));
    console.log(
      chalk.dim('  Config: ') + chalk.cyan(configPath)
    );
    console.log(
      chalk.dim('  Run ') +
        chalk.cyan('seaclip onboard --reset') +
        chalk.dim(' to overwrite, or ') +
        chalk.cyan('seaclip configure') +
        chalk.dim(' to update individual settings.\n')
    );
    return;
  }

  console.log(chalk.bold('\n── SeaClip Setup Wizard ──\n'));
  console.log(chalk.dim('This wizard configures your SeaClip installation.'));
  console.log(chalk.dim(`Config will be saved to: ${getConfigDir()}\n`));

  // Step 1: Deployment mode
  const { deploymentMode } = await inquirer.prompt<{ deploymentMode: 'local_trusted' | 'authenticated' }>([
    {
      type: 'list',
      name: 'deploymentMode',
      message: 'Select deployment mode:',
      choices: [
        {
          name: 'local_trusted  — No auth required, suitable for home/lab networks',
          value: 'local_trusted',
        },
        {
          name: 'authenticated  — JWT-based auth, suitable for multi-user or internet-facing deployments',
          value: 'authenticated',
        },
      ],
    },
  ]);

  // Step 2: Database
  const { databaseMode } = await inquirer.prompt<{ databaseMode: 'embedded' | 'postgres' }>([
    {
      type: 'list',
      name: 'databaseMode',
      message: 'Database backend:',
      choices: [
        { name: 'Embedded SQLite  — Zero-config, stored in ~/.seaclip/data/', value: 'embedded' },
        { name: 'PostgreSQL       — External database for production use', value: 'postgres' },
      ],
    },
  ]);

  let connectionString: string | undefined;
  if (databaseMode === 'postgres') {
    const { dbUrl } = await inquirer.prompt<{ dbUrl: string }>([
      {
        type: 'input',
        name: 'dbUrl',
        message: 'PostgreSQL connection URL:',
        default: 'postgres://seaclip:seaclip@localhost:5432/seaclip',
        validate: (v: string) => {
          try {
            new URL(v);
            return true;
          } catch {
            return 'Please enter a valid PostgreSQL URL (e.g. postgres://user:pass@host:5432/db)';
          }
        },
      },
    ]);
    connectionString = dbUrl;
  }

  // Step 3: Ollama
  const { ollamaUrl } = await inquirer.prompt<{ ollamaUrl: string }>([
    {
      type: 'input',
      name: 'ollamaUrl',
      message: 'Ollama base URL:',
      default: 'http://localhost:11434',
      validate: (v: string) => {
        try {
          new URL(v);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
  ]);

  // Step 4: Telegram (optional)
  const { useTelegram } = await inquirer.prompt<{ useTelegram: boolean }>([
    {
      type: 'confirm',
      name: 'useTelegram',
      message: 'Configure Telegram bridge? (optional — enables bot notifications and commands)',
      default: false,
    },
  ]);

  let telegramBotToken: string | undefined;
  let telegramChatId: string | undefined;

  if (useTelegram) {
    const telegramAnswers = await inquirer.prompt<{ botToken: string; chatId: string }>([
      {
        type: 'password',
        name: 'botToken',
        message: 'Telegram bot token (from @BotFather):',
        validate: (v: string) => v.trim().length > 0 || 'Bot token is required',
      },
      {
        type: 'input',
        name: 'chatId',
        message: 'Telegram chat ID (leave blank to configure later):',
      },
    ]);
    telegramBotToken = telegramAnswers.botToken;
    telegramChatId = telegramAnswers.chatId || undefined;
  }

  // Step 5: Server port
  const { serverPort } = await inquirer.prompt<{ serverPort: number }>([
    {
      type: 'number',
      name: 'serverPort',
      message: 'Server port:',
      default: 3100,
      validate: (v: number) =>
        (v >= 1024 && v <= 65535) || 'Port must be between 1024 and 65535',
    },
  ]);

  // Build config
  const config: SeaClipConfig = {
    server: {
      host: '0.0.0.0',
      port: serverPort,
      deploymentMode,
    },
    database: {
      mode: databaseMode,
      connectionString,
    },
    ollama: { baseUrl: ollamaUrl },
    telegram: {
      botToken: telegramBotToken,
      chatId: telegramChatId,
    },
    storage: {
      provider: 'local_disk',
      baseDir: join(homedir(), '.seaclip', 'data'),
    },
  };

  // Save config
  const spinner = ora('Saving configuration…').start();
  try {
    writeConfig(config);
    spinner.succeed(chalk.green('Configuration saved'));
  } catch (err) {
    spinner.fail(chalk.red('Failed to save configuration'));
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }

  // Run migrations (if postgres)
  if (databaseMode === 'postgres') {
    const migSpinner = ora('Running database migrations…').start();
    try {
      // Attempt to run migrations via the server's migrate entrypoint
      const { execSync } = await import('child_process');
      execSync('node server/dist/migrate.js', {
        env: { ...process.env, DATABASE_URL: connectionString },
        stdio: 'ignore',
        timeout: 30_000,
      });
      migSpinner.succeed(chalk.green('Database migrations complete'));
    } catch {
      migSpinner.warn(
        chalk.yellow('Could not run migrations automatically — run them manually after building the server')
      );
    }
  }

  // Print next steps
  console.log(chalk.bold('\n✓ SeaClip is configured!\n'));
  console.log(chalk.dim('─'.repeat(42)));
  console.log(chalk.bold('  Next steps:\n'));
  console.log(
    '  1. ' +
      chalk.cyan('seaclip doctor') +
      chalk.dim('    — verify system health')
  );
  console.log(
    '  2. ' +
      chalk.cyan('seaclip run') +
      chalk.dim('       — start the server')
  );
  console.log(
    `  3. Open ${chalk.cyan(`http://localhost:${serverPort}`)} in your browser`
  );
  console.log(chalk.dim('\n─'.repeat(42)));
  console.log(
    chalk.dim(`\n  Config stored at: ${getConfigPath()}\n`)
  );
}
