import { GitHubAccount, GitHubRepo } from "./types";

const TOKEN_KEY = "github_personal_token";
const ACCOUNT_KEY = "github_user_account";

export function getStoredGitHubToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredGitHubAccount(): GitHubAccount | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredGitHubAccount(account: GitHubAccount | null) {
  if (typeof window === "undefined") return;
  if (account) {
    localStorage.setItem(TOKEN_KEY, account.token.trim());
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  }
}

export async function validateAndConnectGitHub(token: string): Promise<{
  success: boolean;
  account?: GitHubAccount;
  error?: string;
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { success: false, error: "Inserisci un token GitHub valido" };
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: "Token non valido o scaduto" };
      }
      return { success: false, error: `Errore GitHub: HTTP ${res.status}` };
    }

    const data = await res.json();
    const account: GitHubAccount = {
      token: cleanToken,
      username: data.login,
      avatar_url: data.avatar_url,
      name: data.name || data.login,
    };

    setStoredGitHubAccount(account);
    return { success: true, account };
  } catch (err: any) {
    return { success: false, error: err.message || "Errore di connessione a GitHub" };
  }
}

export async function fetchUserRepos(token?: string): Promise<{
  success: boolean;
  repos: GitHubRepo[];
  error?: string;
}> {
  const activeToken = token || getStoredGitHubToken();
  if (!activeToken) {
    return { success: false, repos: [], error: "Nessun account GitHub collegato" };
  }

  try {
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator", {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      return { success: false, repos: [], error: `Errore recupero repository: HTTP ${res.status}` };
    }

    const data = await res.json();
    const repos: GitHubRepo[] = data.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: !!r.private,
      html_url: r.html_url,
      clone_url: r.clone_url,
      default_branch: r.default_branch || "main",
      description: r.description || "",
      updated_at: r.updated_at,
      language: r.language || "",
    }));

    return { success: true, repos };
  } catch (err: any) {
    return { success: false, repos: [], error: err.message || "Errore di connessione" };
  }
}

export function buildAuthenticatedRepoUrl(repoFullNameOrUrl: string, token?: string): string {
  const activeToken = token || getStoredGitHubToken();
  if (!activeToken) return repoFullNameOrUrl;

  let fullName = repoFullNameOrUrl.trim();
  if (fullName.startsWith("http://") || fullName.startsWith("https://")) {
    const cleaned = fullName.replace(/^https?:\/\//, "").replace(/\.git$/, "");
    const parts = cleaned.split("/");
    if (parts.length >= 2) {
      fullName = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
  }

  return `https://${activeToken}@github.com/${fullName}.git`;
}
