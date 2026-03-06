export interface AdapterAgent {
  id: string;
  name: string;
  companyId: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
}

export interface AdapterExecutionContext {
  agent: AdapterAgent;
  runId: string;
  companyId: string;
  issueId?: string;
  wakeReason: string;
  wakeDetail?: string;
  sessionParams?: Record<string, unknown>;
  secrets: Record<string, string>;
  apiUrl: string;
  apiKey: string;
}

export interface UsageSummary {
  tokenCount: number;
  costCents: number;
  model?: string;
  provider?: string;
}

export interface AdapterExecutionResult {
  status: "success" | "error" | "timeout";
  excerpt: string;
  usage?: UsageSummary;
  sessionParams?: Record<string, unknown>;
  clearSession?: boolean;
  deviceTelemetry?: Record<string, unknown>;
}

export interface AdapterEnvironmentCheck {
  level: "info" | "warn" | "error";
  message: string;
}

export interface AdapterEnvironmentTestResult {
  status: "ok" | "degraded" | "error";
  checks: AdapterEnvironmentCheck[];
}

export interface ServerAdapterModule {
  type: string;
  label: string;
  execute: (
    ctx: AdapterExecutionContext,
    onStdout?: (chunk: string) => void
  ) => Promise<AdapterExecutionResult>;
  testEnvironment: () => Promise<AdapterEnvironmentTestResult>;
  sessionCodec?: {
    encode: (params: Record<string, unknown>) => string;
    decode: (raw: string) => Record<string, unknown>;
  };
  models?: Array<{ id: string; label: string }>;
  listModels?: () => Promise<Array<{ id: string; label: string }>>;
  supportsLocalAgentJwt?: boolean;
  onHireApproved?: (agent: AdapterAgent) => Promise<void>;
  agentConfigurationDoc?: string;
}
