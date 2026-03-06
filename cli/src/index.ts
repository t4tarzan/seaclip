#!/usr/bin/env node
/**
 * SeaClip CLI — Hub-Spoke AI Agent Orchestration
 * Entry point: registers all commands via Commander.js
 */

import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Commands
import { registerOnboard } from './commands/onboard.js';
import { registerRun } from './commands/run.js';
import { registerDoctor } from './commands/doctor.js';
import { registerConfigure } from './commands/configure.js';
import { registerDbBackup } from './commands/db-backup.js';
import { registerCompany } from './commands/company.js';
import { registerAgent } from './commands/agent.js';
import { registerDevice } from './commands/device.js';
import { registerHub } from './commands/hub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
let version = '0.1.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
  version = pkg.version;
} catch {
  // fallback
}

console.log(chalk.cyan.bold('\n  🌊 SeaClip') + chalk.dim(' — Hub-Spoke AI Agent Orchestration\n'));

program
  .name('seaclip')
  .description('SeaClip CLI — manage your AI agent orchestration platform')
  .version(version, '-v, --version', 'output the current version');

// Register all commands
registerOnboard(program);
registerRun(program);
registerDoctor(program);
registerConfigure(program);
registerDbBackup(program);
registerCompany(program);
registerAgent(program);
registerDevice(program);
registerHub(program);

// Unknown command handler
program.on('command:*', (operands) => {
  console.error(chalk.red(`\nUnknown command: ${operands[0]}`));
  console.log(chalk.dim('Run ') + chalk.cyan('seaclip --help') + chalk.dim(' to see available commands.'));
  process.exit(1);
});

// Show help if no args
if (process.argv.length < 3) {
  program.outputHelp();
  process.exit(0);
}

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red('\nFatal error:'), err instanceof Error ? err.message : String(err));
  process.exit(1);
});
