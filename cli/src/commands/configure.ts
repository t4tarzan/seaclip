/**
 * seaclip configure — Interactive reconfiguration
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig, writeConfig, configExists, getConfigPath } from '../config/store.js';

export function registerConfigure(program: Command): void {
  program
    .command('configure')
    .description('Reconfigure SeaClip settings interactively')
    .option('--set <key=value>', 'Set a specific config key (e.g. --set ollama.baseUrl=http://remote:11434)')
    .option('--show', 'Print the current configuration')
    .action(async (opts: { set?: string; show?: boolean }) => {
      await runConfigure(opts);
    });
}

async function runConfigure(opts: { set?: string; show?: boolean }): Promise<void> {
  if (!configExists()) {
    console.error(chalk.red('\nSeaClip is not configured yet.'));
    console.log(chalk.dim('Run ') + chalk.cyan('seaclip onboard') + chalk.dim(' first.\n'));
    process.exit(1);
  }

  const config = readConfig();

  // --show mode: print the current config (redacting secrets)
  if (opts.show) {
    const safe = JSON.parse(JSON.stringify(config));
    if (safe.telegram?.botToken) {
      safe.telegram.botToken = safe.telegram.botToken.replace(/.(?=.{4})/g, '*');
    }
    console.log(chalk.bold('\nCurrent configuration:\n'));
    console.log(JSON.stringify(safe, null, 2));
    console.log(chalk.dim(`\n  Stored at: ${getConfigPath()}\n`));
    return;
  }

  // --set <key=value> mode: direct key set
  if (opts.set) {
    const eqIdx = opts.set.indexOf('=');
    if (eqIdx === -1) {
      console.error(chalk.red('--set format must be key=value (e.g. --set ollama.baseUrl=http://remote:11434)'));
      process.exit(1);
    }
    const key = opts.set.slice(0, eqIdx);
    const value = opts.set.slice(eqIdx + 1);
    setNestedKey(config as unknown as Record<string, unknown>, key, value);
    writeConfig(config);
    console.log(chalk.green(`✓ Set ${key} = ${value}`));
    return;
  }

  // Interactive reconfiguration
  console.log(chalk.bold('\n── SeaClip Configure ──\n'));
  console.log(chalk.dim('Leave blank to keep current values.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'ollamaUrl',
      message: 'Ollama base URL:',
      default: config.ollama.baseUrl,
    },
    {
      type: 'number',
      name: 'serverPort',
      message: 'Server port:',
      default: config.server.port,
      validate: (v: number) => (v >= 1024 && v <= 65535) || 'Port must be between 1024 and 65535',
    },
    {
      type: 'list',
      name: 'deploymentMode',
      message: 'Deployment mode:',
      choices: ['local_trusted', 'authenticated'],
      default: config.server.deploymentMode,
    },
    {
      type: 'confirm',
      name: 'updateTelegram',
      message: 'Update Telegram settings?',
      default: false,
    },
  ]);

  config.ollama.baseUrl = answers.ollamaUrl;
  config.server.port = answers.serverPort;
  config.server.deploymentMode = answers.deploymentMode;

  if (answers.updateTelegram) {
    const tgAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'botToken',
        message: 'Telegram bot token (leave blank to clear):',
      },
      {
        type: 'input',
        name: 'chatId',
        message: 'Telegram chat ID (leave blank to clear):',
      },
    ]);
    config.telegram.botToken = tgAnswers.botToken || undefined;
    config.telegram.chatId = tgAnswers.chatId || undefined;
  }

  const spinner = ora('Saving configuration…').start();
  try {
    writeConfig(config);
    spinner.succeed(chalk.green('Configuration updated'));
    console.log(chalk.dim(`  Stored at: ${getConfigPath()}\n`));
  } catch (err) {
    spinner.fail(chalk.red('Failed to save configuration'));
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

function setNestedKey(obj: Record<string, unknown>, dotKey: string, value: string): void {
  const parts = dotKey.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts[parts.length - 1]!;
  // Attempt numeric coercion
  const num = Number(value);
  current[lastPart] = !isNaN(num) && value.trim() !== '' ? num : value;
}
