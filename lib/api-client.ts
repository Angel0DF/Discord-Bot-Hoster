import { BotState, SystemStats, BotConfig } from "./types";

export interface AgentConfig {
  url: string;
  secret: string;
}

export function getStoredAgentConfig(): AgentConfig {
  if (typeof window === "undefined") {
    return {
      url: process.env.NEXT_PUBLIC_PROXMOX_AGENT_URL || "",
      secret: process.env.NEXT_PUBLIC_PROXMOX_AGENT_SECRET || "",
    };
  }

  const storedUrl = localStorage.getItem("proxmox_agent_url");
  const storedSecret = localStorage.getItem("proxmox_agent_secret");

  return {
    url: storedUrl !== null ? storedUrl : (process.env.NEXT_PUBLIC_PROXMOX_AGENT_URL || ""),
    secret: storedSecret !== null ? storedSecret : (process.env.NEXT_PUBLIC_PROXMOX_AGENT_SECRET || ""),
  };
}

export function setStoredAgentConfig(config: AgentConfig) {
  if (typeof window === "undefined") return;
  if (config.url) {
    localStorage.setItem("proxmox_agent_url", config.url.trim().replace(/\/+$/, ""));
  } else {
    localStorage.removeItem("proxmox_agent_url");
  }

  if (config.secret) {
    localStorage.setItem("proxmox_agent_secret", config.secret.trim());
  } else {
    localStorage.removeItem("proxmox_agent_secret");
  }
}

function getBaseUrl(): string {
  const config = getStoredAgentConfig();
  if (config.url && config.url.trim().length > 0) {
    return config.url.trim().replace(/\/+$/, "");
  }
  return ""; // empty means relative path for local Next.js api routes
}

function getHeaders(customSecret?: string): HeadersInit {
  const config = getStoredAgentConfig();
  const secret = customSecret !== undefined ? customSecret : config.secret;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    headers["Authorization"] = `Bearer ${secret}`;
    headers["x-agent-secret"] = secret;
  }

  return headers;
}

export const ApiClient = {
  getAgentUrl(): string {
    return getBaseUrl();
  },

  async testConnection(url: string, secret: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const cleanUrl = url.trim().replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/health?secret=${encodeURIComponent(secret)}`, {
        method: "GET",
        mode: "cors",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: `Connesso con successo a Proxmox Host (${data.hostname})`, data };
      }
      return { success: false, message: data.error || `Errore HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `Impossibile raggiungere l'Agent: ${err.message}` };
    }
  },

  async getSystemStats(): Promise<SystemStats | null> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/system`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      return data.success ? data.stats : null;
    } catch (err) {
      console.error("Failed to fetch system stats:", err);
      return null;
    }
  },

  async getBots(): Promise<BotState[]> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      return data.success ? data.bots : [];
    } catch (err) {
      console.error("Failed to fetch bots:", err);
      return [];
    }
  },

  async getBot(id: string): Promise<BotState | null> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      return data.success ? data.bot : null;
    } catch (err) {
      console.error("Failed to fetch bot:", err);
      return null;
    }
  },

  async createBot(payload: any): Promise<{ success: boolean; bot?: BotConfig; error?: string }> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateBot(id: string, payload: any): Promise<{ success: boolean; bot?: BotConfig; error?: string }> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteBot(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async powerAction(id: string, action: "start" | "stop" | "restart"): Promise<any> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}/power`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getLogsSseUrl(id: string): string {
    const base = getBaseUrl();
    const config = getStoredAgentConfig();
    const secretQuery = config.secret ? `?secret=${encodeURIComponent(config.secret)}` : "";
    return `${base}/api/bots/${id}/logs${secretQuery}`;
  },

  async sendBotInput(id: string, input: string): Promise<boolean> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}/logs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  },

  async clearBotLogs(id: string): Promise<boolean> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}/logs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "clear" }),
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  },

  async getFiles(id: string, path: string = "", isContent: boolean = false): Promise<any> {
    try {
      const base = getBaseUrl();
      const res = await fetch(
        `${base}/api/bots/${id}/files?path=${encodeURIComponent(path)}&content=${isContent}`,
        {
          headers: getHeaders(),
        }
      );
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async saveFile(id: string, payload: any): Promise<any> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}/files`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getGitStatus(id: string): Promise<any> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}/git/status`, {
        headers: getHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async pullGit(id: string): Promise<any> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}/git/pull`, {
        method: "POST",
        headers: getHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async cloneGit(id: string, payload: { repoUrl: string; branch?: string }): Promise<any> {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/bots/${id}/git/clone`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

