import fs from 'fs';
import path from 'path';
import { BotConfig, ProxmoxConfig } from './types';
import { BOT_TEMPLATES } from './templates';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOTS_FILE = path.join(DATA_DIR, 'bots.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
export const BOTS_STORAGE_DIR = path.join(DATA_DIR, 'bots');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOTS_STORAGE_DIR)) {
    fs.mkdirSync(BOTS_STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOTS_FILE)) {
    fs.writeFileSync(BOTS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings = {
      masterPassword: "",
      proxmox: {
        host: "192.168.1.100",
        port: 8006,
        nodeName: "pve",
        useSsl: false,
        enabled: false,
      } as ProxmoxConfig
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }
}

export function getAllBots(): BotConfig[] {
  ensureDirectories();
  try {
    const data = fs.readFileSync(BOTS_FILE, 'utf8');
    return JSON.parse(data) as BotConfig[];
  } catch {
    return [];
  }
}

export function getBotById(id: string): BotConfig | null {
  const bots = getAllBots();
  return bots.find(b => b.id === id) || null;
}

export function saveBots(bots: BotConfig[]): void {
  ensureDirectories();
  fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
}

export function createBotFolder(botId: string, templateId?: string): string {
  ensureDirectories();
  const botDir = path.join(BOTS_STORAGE_DIR, botId);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  if (templateId) {
    const template = BOT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      for (const file of template.files) {
        const filePath = path.join(botDir, file.name);
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);
      }
    }
  }

  return botDir;
}

export function deleteBotFolder(botId: string): void {
  const botDir = path.join(BOTS_STORAGE_DIR, botId);
  if (fs.existsSync(botDir)) {
    fs.rmSync(botDir, { recursive: true, force: true });
  }
}

export function getSettings(): { masterPassword?: string; proxmox: ProxmoxConfig } {
  ensureDirectories();
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      masterPassword: "",
      proxmox: {
        host: "192.168.1.100",
        port: 8006,
        nodeName: "pve",
        useSsl: false,
        enabled: false,
      }
    };
  }
}

export function saveSettings(settings: { masterPassword?: string; proxmox: ProxmoxConfig }): void {
  ensureDirectories();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

