export type BotRuntime = 'nodejs' | 'python' | 'bun' | 'custom';

export type BotStatus = 'online' | 'offline' | 'starting' | 'stopping' | 'error';

export interface BotEnvironmentVar {
  key: string;
  value: string;
}

export interface BotStats {
  cpu: number; // percentage
  memory: number; // in bytes
  uptime: number; // in seconds
  pid?: number;
}

export interface BotConfig {
  id: string;
  name: string;
  description?: string;
  runtime: BotRuntime;
  mainFile: string; // e.g. "index.js", "main.py", "src/bot.ts"
  startCommand?: string; // custom command override if any
  installCommand?: string; // e.g. "npm install" or "pip install -r requirements.txt"
  env: Record<string, string>;
  enabled?: boolean;
  autoRestart: boolean;
  maxRestarts: number;
  restartDelay: number; // ms
  gitRepo?: string; // e.g. "https://github.com/user/repo"
  gitBranch?: string; // e.g. "main"
  autoDeployWebhook?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GitSyncStatus {
  isGit: boolean;
  synced: boolean;
  branch?: string;
  repoUrl?: string;
  localCommit?: string;
  localCommitShort?: string;
  localMessage?: string;
  remoteCommit?: string;
  remoteCommitShort?: string;
  remoteMessage?: string;
  behindCount?: number;
  lastChecked?: string;
  error?: string;
}

export interface BotState {
  id: string;
  config: BotConfig;
  status: BotStatus;
  stats: BotStats;
  logs: string[];
  restartsCount: number;
  gitStatus?: GitSyncStatus;
  lastStarted?: string;
  lastStopped?: string;
  error?: string;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  updatedAt?: string;
}

export interface SystemStats {
  hostname: string;
  platform: string;
  uptime: number;
  cpuModel: string;
  cpuCores: number;
  cpuUsage: number;
  totalMem: number;
  freeMem: number;
  usedMem: number;
  memUsagePercent: number;
  nodeVersion: string;
  isProxmoxGuest?: boolean;
}

export interface ProxmoxConfig {
  host: string;
  port: number;
  nodeName: string;
  apiTokenId?: string;
  apiTokenSecret?: string;
  useSsl: boolean;
  enabled: boolean;
}

