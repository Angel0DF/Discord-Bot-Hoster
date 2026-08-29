"use client";
import React, { useState, useRef } from "react";
import { BOT_TEMPLATES, BotTemplate } from "@/lib/templates";
import { X, Bot, Sparkles, Check, Code, FileText, ArrowRight, UploadCloud, Upload, FolderOpen, FileArchive, GitBranch } from "lucide-react";
import { ShimmerButton } from "./ui/shimmer-button";
import { GitHubRepoPicker } from "./github-repo-picker";
import { GitHubConnectModal } from "./github-connect-modal";
import { ApiClient } from "@/lib/api-client";
import JSZip from "jszip";

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBotCreated: (newBot: any) => void;
}

interface UploadedFileItem {
  name: string;
  content: string;
}

export const CreateBotModal = ({ isOpen, onClose, onBotCreated }: CreateBotModalProps) => {
  const [sourceType, setSourceType] = useState<"github" | "upload" | "template">("github");
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate>(BOT_TEMPLATES[0]);
  const [botName, setBotName] = useState("");
  const [botDescription, setBotDescription] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const extractZipFile = async (zipFile: globalThis.File): Promise<UploadedFileItem[]> => {
    const list: UploadedFileItem[] = [];
    const zip = new JSZip();
    const loaded = await zip.loadAsync(zipFile);
    for (const [filename, fileData] of Object.entries(loaded.files)) {
      if (!fileData.dir) {
        const content = await fileData.async("string");
        list.push({ name: filename, content });
      }
    }
    return list;
  };

  const traverseEntry = async (entry: any, basePath: string = ""): Promise<UploadedFileItem[]> => {
    const list: UploadedFileItem[] = [];
    if (entry.isFile) {
      const file: File = await new Promise((res, rej) => entry.file(res, rej));
      if (file.name.toLowerCase().endsWith(".zip")) {
        try {
          const unzipped = await extractZipFile(file);
          list.push(...unzipped);
          return list;
        } catch {}
      }
      const content = await file.text();
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      list.push({ name: relativePath, content });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const childEntries = await new Promise<any[]>((res, rej) => reader.readEntries(res, rej));
      const nextPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      for (const child of childEntries) {
        const sub = await traverseEntry(child, nextPath);
        list.push(...sub);
      }
    }
    return list;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const list: UploadedFileItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          const files = await traverseEntry(entry);
          list.push(...files);
        }
      } else if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          if (file.name.toLowerCase().endsWith(".zip")) {
            const unzipped = await extractZipFile(file);
            list.push(...unzipped);
          } else {
            const text = await file.text();
            list.push({ name: file.name, content: text });
          }
        }
      }
    }

    if (list.length > 0) {
      setUploadedFiles((prev) => [...prev, ...list]);
      if (!botName) {
        setBotName(list[0].name.replace(/\.[^/.]+$/, "").split("/")[0]);
      }
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const list: UploadedFileItem[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const name = (file as any).webkitRelativePath || file.name;
      const content = await file.text();
      list.push({ name, content });
    }
    if (list.length > 0) {
      setUploadedFiles((prev) => [...prev, ...list]);
      if (!botName) {
        setBotName(list[0].name.split("/")[0]);
      }
    }
  };

  const handleMultipleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list: UploadedFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.name.toLowerCase().endsWith(".zip")) {
        try {
          const unzipped = await extractZipFile(f);
          list.push(...unzipped);
          continue;
        } catch {}
      }
      const text = await f.text();
      list.push({ name: f.name, content: text });
    }
    if (list.length > 0) {
      setUploadedFiles((prev) => [...prev, ...list]);
      if (!botName) {
        setBotName(list[0].name.replace(/\.[^/.]+$/, "").split("/")[0]);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botName.trim()) {
      setError("Inserisci un nome per il bot");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const env = {
        ...selectedTemplate.defaultEnv,
      };
      if (discordToken.trim()) {
        env.DISCORD_BOT_TOKEN = discordToken.trim();
      }

      const finalFiles = uploadedFiles.length > 0 ? uploadedFiles : selectedTemplate.files;

      // Auto-detect runtime and main entry point
      let mainFile = selectedTemplate.mainFile;
      let runtime = selectedTemplate.runtime;
      if (uploadedFiles.some((f) => f.name.endsWith(".py") || f.name.includes("main.py"))) {
        runtime = "python";
        mainFile = uploadedFiles.find((f) => f.name.endsWith("main.py") || f.name.endsWith("bot.py"))?.name || "main.py";
      } else if (uploadedFiles.some((f) => f.name.endsWith(".js") || f.name.endsWith(".ts"))) {
        runtime = "nodejs";
        mainFile = uploadedFiles.find((f) => f.name.endsWith("index.js") || f.name.endsWith("bot.js") || f.name.endsWith("main.js"))?.name || "index.js";
      }

      let cleanRepoDisplay = "";
      if (gitRepoUrl) {
        cleanRepoDisplay = gitRepoUrl
          .replace(/^https?:\/\/[^@]+@github\.com\//, "")
          .replace(/^https?:\/\/github\.com\//, "")
          .replace(/\.git$/, "");
      }

      const data = await ApiClient.createBot({
        name: botName.trim(),
        description: botDescription.trim() || (cleanRepoDisplay ? `Repository: ${cleanRepoDisplay}` : selectedTemplate.description),
        templateId: selectedTemplate.id,
        templateFiles: gitRepoUrl ? [] : finalFiles,
        runtime,
        mainFile,
        gitRepo: gitRepoUrl.trim() || undefined,
        gitBranch: gitBranch.trim() || "main",
        env,
      });

      if (data.success && data.bot) {
        if (gitRepoUrl.trim()) {
          try {
            await ApiClient.cloneGit(data.bot.id, {
              repoUrl: gitRepoUrl.trim(),
              branch: gitBranch.trim() || "main",
            });
          } catch (cloneErr) {
            console.error("Git clone on creation warning:", cloneErr);
          }
        }

        onBotCreated(data.bot);
        onClose();
        setBotName("");
        setBotDescription("");
        setDiscordToken("");
        setGitRepoUrl("");
        setUploadedFiles([]);
      } else {
        setError(data.error || "Errore durante la creazione del bot");
      }
    } catch (err: any) {
      setError(err.message || "Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".zip,.rar,.tar,.gz,.js,.ts,.py,.json,.env,.txt,*"
          onChange={(e) => handleMultipleFiles(e.target.files)}
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={handleFolderUpload}
          className="hidden"
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Crea o Ospita un Nuovo Bot</h2>
            <p className="text-xs text-zinc-400">
              Scegli un template pronto o trascina un archivio .ZIP / .RAR / Cartella.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-6 space-y-5">
          {/* Source Type Navigation Tabs */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              1. Scegli da dove importare il Bot
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <button
                type="button"
                onClick={() => setSourceType("github")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sourceType === "github"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <GitBranch className="h-4 w-4" />
                Da GitHub
              </button>
              <button
                type="button"
                onClick={() => setSourceType("upload")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sourceType === "upload"
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <FileArchive className="h-4 w-4" />
                Carica ZIP / File
              </button>
              <button
                type="button"
                onClick={() => setSourceType("template")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sourceType === "template"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Code className="h-4 w-4" />
                Template Pronti
              </button>
            </div>
          </div>

          {/* TAB 1: GITHUB */}
          {sourceType === "github" && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-purple-400" />
                  Seleziona Repository dal tuo Account GitHub
                </span>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  Auto-Deploy & Webhook
                </span>
              </div>

              <GitHubRepoPicker
                selectedRepoUrl={gitRepoUrl}
                selectedBranch={gitBranch}
                onSelect={({ repoUrl, branch, repoName, description }) => {
                  setGitRepoUrl(repoUrl);
                  setGitBranch(branch || "main");
                  if (!botName) setBotName(repoName);
                  if (!botDescription && description) setBotDescription(description);
                }}
                onOpenConnectModal={() => setShowConnectModal(true)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <input
                  type="text"
                  value={gitRepoUrl}
                  onChange={(e) => {
                    setGitRepoUrl(e.target.value);
                    if (!botName && e.target.value.includes("/")) {
                      const parts = e.target.value.replace(/\/$/, "").split("/");
                      setBotName(parts[parts.length - 1].replace(".git", ""));
                    }
                  }}
                  placeholder="Oppure incolla URL GitHub manualmente"
                  className="sm:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  placeholder="Branch: main"
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD ZIP / FOLDER */}
          {sourceType === "upload" && (
            <div className="space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="font-semibold">Trascina o seleziona i file</span>
                {uploadedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUploadedFiles([])}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Rimuovi file caricati ({uploadedFiles.length})
                  </button>
                )}
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? "border-amber-400 bg-amber-950/20 scale-[1.01]"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
                }`}
              >
                <FileArchive className="h-8 w-8 mx-auto text-amber-400/90 mb-2" />
                <p className="text-xs font-medium text-zinc-200">
                  {uploadedFiles.length > 0
                    ? `✅ ${uploadedFiles.length} file estratti pronti per il bot`
                    : "Trascina qui il file .ZIP, .RAR o l'intera Cartella del tuo Bot"}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Verrà decompresso e importato istantaneamente sul server Proxmox
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: READY TEMPLATES */}
          {sourceType === "template" && (
            <div className="space-y-2 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BOT_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedTemplate(tmpl);
                        if (!botName) setBotName(tmpl.id === "empty" ? "CustomBot" : tmpl.name.split(" ")[0]);
                      }}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300">
                          {tmpl.runtime}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-white">{tmpl.name}</h4>
                      <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bot details */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                2. Nome del Bot <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="es. MBOT, MusicBot, ModerationBot"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                3. Discord Bot Token (puoi inserirlo anche in seguito)
              </label>
              <input
                type="password"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
                placeholder="MTA2ND... (dal Discord Developer Portal)"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              Annulla
            </button>
            <ShimmerButton type="submit" disabled={isLoading} className="h-10 px-5 text-xs cursor-pointer">
              {isLoading ? "Creazione in corso..." : "Crea e Configura Bot"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </ShimmerButton>
          </div>
        </form>
      </div>

      <GitHubConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
};
