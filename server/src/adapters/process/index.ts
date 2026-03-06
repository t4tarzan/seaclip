/**
 * Process adapter — spawns a shell command from adapterConfig.command,
 * captures stdout, parses exit code.
 */
import { spawnProcess } from "./execute.js";
import type { ServerAdapterModule, AdapterExecuteContext, AdapterExecuteResult, AdapterEnvironmentTestResult } from "../types.js";

const COST_PER_SECOND_USD = 0; // Local process — no cost

export const processAdapter: ServerAdapterModule = {
  type: "process",
  label: "Process",
  description: "Spawns a local shell command as an agent action.",

  async execute(ctx: AdapterExecuteContext): Promise<AdapterExecuteResult> {
    const command = ctx.adapterConfig.command as string | undefined;
    const shell = (ctx.adapterConfig.shell as string | undefined) ?? "/bin/sh";
    const cwd = ctx.adapterConfig.cwd as string | undefined;
    const envOverrides = (ctx.adapterConfig.env as Record<string, string> | undefined) ?? {};

    if (!command) {
      throw new Error("processAdapter: adapterConfig.command is required");
    }

    // Inject execution context as env vars
    const env: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][],
      ),
      ...envOverrides,
      SEACLIP_AGENT_ID: ctx.agentId,
      SEACLIP_COMPANY_ID: ctx.companyId,
      SEACLIP_RUN_ID: ctx.runId,
      SEACLIP_TRIGGERED_BY: ctx.triggeredBy,
      SEACLIP_CONTEXT: JSON.stringify(ctx.context),
    };

    const result = await spawnProcess({
      command,
      shell,
      env,
      cwd,
      timeoutMs: ctx.timeoutMs,
    });

    if (result.exitCode !== 0 && result.exitCode !== null) {
      throw new Error(
        `Process exited with code ${result.exitCode}.\nStdout: ${result.stdout}\nStderr: ${result.stderr}`,
      );
    }

    const durationSeconds = result.durationMs / 1000;
    const costUsd = durationSeconds * COST_PER_SECOND_USD;

    return {
      output: result.stdout || result.stderr,
      inputTokens: 0,
      outputTokens: 0,
      costUsd,
      metadata: {
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        stderr: result.stderr,
      },
    };
  },

  async testEnvironment(
    config: Record<string, unknown>,
  ): Promise<AdapterEnvironmentTestResult> {
    const command = config.command as string | undefined;
    if (!command) {
      return {
        ok: false,
        message: "adapterConfig.command is required",
      };
    }

    try {
      // Try running `which` or `echo` to verify the shell works
      const result = await spawnProcess({
        command: "echo seaclip-process-test",
        shell: "/bin/sh",
        env: process.env as Record<string, string>,
        timeoutMs: 5000,
      });

      return {
        ok: result.exitCode === 0,
        message: result.exitCode === 0 ? "Shell is available" : "Shell test failed",
        details: { stdout: result.stdout, exitCode: result.exitCode },
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },

  agentConfigurationDoc: `
## Process Adapter Configuration

| Field     | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| command   | string | Yes      | Shell command to execute (e.g., \`python agent.py\`) |
| shell     | string | No       | Shell to use (default: \`/bin/sh\`)               |
| cwd       | string | No       | Working directory for the process                |
| env       | object | No       | Extra environment variables to inject            |

### Environment Variables Injected Automatically

- \`SEACLIP_AGENT_ID\` — The agent's UUID
- \`SEACLIP_COMPANY_ID\` — The company UUID
- \`SEACLIP_RUN_ID\` — The current run UUID
- \`SEACLIP_TRIGGERED_BY\` — Who triggered the run
- \`SEACLIP_CONTEXT\` — JSON string of the execution context

### Exit Codes

Exit code \`0\` is treated as success. Any other code causes the run to fail.
`.trim(),
};
