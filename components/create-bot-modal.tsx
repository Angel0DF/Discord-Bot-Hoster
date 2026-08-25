"use client";
import React, { useState, useRef } from "react";
import { BOT_TEMPLATES, BotTemplate } from "@/lib/templates";
import { X, Bot, Sparkles, Check, Code, FileText, ArrowRight, UploadCloud, Upload, FolderOpen } from "lucide-react";
import { ShimmerButton } from "./ui/shimmer-button";
import { ApiClient } from "@/lib/api-client";

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
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate>(BOT_TEMPLATES[0]);
  const [botName, setBotName] = useState("");
  const [botDescription, setBotDescription] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const traverseEntry = async (entry: any, basePath: string = ""): Promise<UploadedFileItem[]> => {
    const list: UploadedFileItem[] = [];
    if (entry.isFile) {
      const file: File = await new Promise((res, rej) => entry.file(res, rej));
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
          const text = await file.text();
          list.push({ name: file.name, content: text });
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

      // Auto-detect mainFile if python vs js
      let mainFile = selectedTemplate.mainFile;
      let runtime = selectedTemplate.runtime;
      if (uploadedFiles.some((f) => f.name.endsWith(".py") || f.name.includes("main.py"))) {
        runtime = "python";
        mainFile = uploadedFiles.find((f) => f.name.endsWith("main.py") || f.name.endsWith("bot.py"))?.name || "main.py";
      } else if (uploadedFiles.some((f) => f.name.endsWith(".js") || f.name.endsWith(".ts"))) {
        runtime = "nodejs";
        mainFile = uploadedFiles.find((f) => f.name.endsWith("index.js") || f.name.endsWith("bot.js") || f.name.endsWith("main.js"))?.name || "index.js";
      }

      const data = await ApiClient.createBot({
        name: botName.trim(),
        description: botDescription.trim() || selectedTemplate.description,
        templateId: selectedTemplate.id,
        templateFiles: finalFiles,
        runtime,
        mainFile,
        env,
      });

      if (data.success) {
        onBotCreated(data.bot);
        onClose();
        setBotName("");
        setBotDescription("");
        setDiscordToken("");
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
          onChange={async (e) => {
            if (e.target.files) {
              const list: UploadedFileItem[] = [];
              for (let i = 0; i < e.target.files.length; i++) {
                const f = e.target.files[i];
                const text = await f.text();
                list.push({ name: f.name, content: text });
              }
              setUploadedFiles((prev) => [...prev, ...list]);
            }
          }}
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
              Scegli un template pronto o trascina l'intera cartella del tuo bot esistente.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-6 space-y-5">
          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              1. Seleziona il Template / Linguaggio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOT_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
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

          {/* Drag and Drop Zone for Folders & Files */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Oppure Carica una Cartella Intera (Drag & Drop)</span>
              {uploadedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUploadedFiles([])}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Rimuovi file caricati ({uploadedFiles.length})
                </button>
              )}
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => folderInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border border-dashed p-5 text-center transition-all ${
                isDragging
                  ? "border-indigo-400 bg-indigo-950/40 scale-[1.01]"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
              }`}
            >
              <FolderOpen className="h-7 w-7 mx-auto text-amber-400/90 mb-1.5" />
              <p className="text-xs font-medium text-zinc-200">
                {uploadedFiles.length > 0
                  ? `✅ ${uploadedFiles.length} file e sottocartelle pronti per il bot`
                  : "Trascina qui l'intera Cartella del tuo Bot (con comandi, config, env)"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                oppure clicca per selezionare una cartella dal computer
              </p>
            </div>
          </div>

          {/* Bot details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                2. Nome del Bot <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="es. ProxmoxManager, ModerationBot, MusicBot"
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
              className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              Annulla
            </button>
            <ShimmerButton type="submit" disabled={isLoading} className="h-10 px-5 text-xs">
              {isLoading ? "Creazione in corso..." : "Crea e Configura Bot"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </ShimmerButton>
          </div>
        </form>
      </div>
    </div>
  );
};
