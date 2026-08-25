"use client";
import React, { useState, useEffect, useRef } from "react";
import { FileItem } from "@/lib/types";
import {
  Folder,
  FileCode,
  FileText,
  FileJson,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  File,
  Check,
  ChevronRight,
  FolderPlus,
  FilePlus,
  Lock,
  UploadCloud,
  Upload,
  FolderOpen,
  Archive,
  FileArchive,
  Sparkles,
  Play,
  Download,
} from "lucide-react";

import { ApiClient } from "@/lib/api-client";
import { useUpload } from "@/context/upload-context";

interface FileEditorProps {
  botId: string;
  botName?: string;
}

interface UploadQueueItem {
  relativePath: string;
  file?: globalThis.File;
  content?: string;
}

export const FileEditor = ({ botId, botName }: FileEditorProps) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState<"file" | "folder" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractingFile, setExtractingFile] = useState<string | null>(null);

  const { uploadFiles, uploadArchive, tasks } = useUpload();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const displayName = botName || "Bot";

  const fetchFiles = async (subPath: string = "") => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getFiles(botId, subPath);
      if (data.success) {
        setFiles(data.files);
        setCurrentPath(subPath);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileContent = async (filePath: string) => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getFiles(botId, filePath, true);
      if (data.success) {
        setSelectedFile(filePath);
        setFileContent(data.content || "");
        setOriginalContent(data.content || "");
        setSaveSuccess(false);
      }
    } catch (err) {
      console.error("Failed to load file content:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles("");
  }, [botId]);

  // If a background upload completes, refresh file list
  const activeTask = tasks.find((t) => t.botId === botId);
  useEffect(() => {
    if (activeTask?.status === "completed") {
      fetchFiles(currentPath);
    }
  }, [activeTask?.status]);

  // Shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedFile) {
          handleSaveFile();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, fileContent]);

  const handleSaveFile = async () => {
    if (!selectedFile || isSaving) return;
    setIsSaving(true);
    try {
      const data = await ApiClient.saveFile(botId, {
        path: selectedFile,
        content: fileContent,
      });
      if (data.success) {
        setOriginalContent(fileContent);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newFileName.trim() || !showCreateModal) return;
    const isFolder = showCreateModal === "folder";
    const fullPath = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();

    try {
      const data = await ApiClient.saveFile(botId, {
        path: fullPath,
        content: isFolder ? undefined : "",
        isDirectory: isFolder,
      });
      if (data.success) {
        setNewFileName("");
        setShowCreateModal(null);
        await fetchFiles(currentPath);
        if (!isFolder) {
          loadFileContent(fullPath);
        }
      }
    } catch (err) {
      console.error("Create error:", err);
    }
  };

  const handleDelete = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Sei sicuro di voler eliminare "${filePath}"?`)) return;

    try {
      const data = await ApiClient.saveFile(botId, {
        path: filePath,
        action: "delete",
      });
      if (data.success) {
        if (selectedFile === filePath) {
          setSelectedFile(null);
          setFileContent("");
        }
        fetchFiles(currentPath);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Manual server-side unzip trigger from file list button
  const handleUnzipFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExtractingFile(filePath);
    try {
      const res = await ApiClient.saveFile(botId, {
        path: filePath,
        action: "unzip",
        deleteAfter: false,
      });
      if (res.success) {
        await fetchFiles(currentPath);
      } else {
        alert(res.error || "Errore durante l'estrazione");
      }
    } catch (err: any) {
      alert(err.message || "Errore durante l'estrazione");
    } finally {
      setExtractingFile(null);
    }
  };

  // Helper for recursive directory traversal in drag and drop
  const traverseFileSystemEntry = async (
    entry: any,
    basePath: string = ""
  ): Promise<UploadQueueItem[]> => {
    const results: UploadQueueItem[] = [];

    if (entry.isFile) {
      const file: globalThis.File = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      results.push({ relativePath, file });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readAllEntries = async (): Promise<any[]> => {
        let entries: any[] = [];
        let read = await new Promise<any[]>((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
        while (read.length > 0) {
          entries = entries.concat(read);
          read = await new Promise<any[]>((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
          });
        }
        return entries;
      };

      const childEntries = await readAllEntries();
      const nextBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;

      for (const child of childEntries) {
        const subResults = await traverseFileSystemEntry(child, nextBasePath);
        results.push(...subResults);
      }
    }

    return results;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    // Check if user dropped a single .zip or .rar archive
    if (items.length === 1 && items[0].kind === "file") {
      const file = items[0].getAsFile();
      if (file && (file.name.toLowerCase().endsWith(".zip") || file.name.toLowerCase().endsWith(".rar") || file.name.toLowerCase().endsWith(".tar.gz"))) {
        // Upload entire archive to server, then unzip on server!
        uploadArchive(botId, displayName, file, currentPath);
        return;
      }
    }

    const queue: UploadQueueItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          const files = await traverseFileSystemEntry(entry);
          queue.push(...files);
        }
      } else if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) {
          if (f.name.toLowerCase().endsWith(".zip") || f.name.toLowerCase().endsWith(".rar")) {
            uploadArchive(botId, displayName, f, currentPath);
          } else {
            queue.push({ relativePath: f.name, file: f });
          }
        }
      }
    }

    if (queue.length > 0) {
      uploadFiles(botId, displayName, queue, currentPath);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (files.length === 1 && (files[0].name.toLowerCase().endsWith(".zip") || files[0].name.toLowerCase().endsWith(".rar"))) {
      uploadArchive(botId, displayName, files[0], currentPath);
      return;
    }

    const queue: UploadQueueItem[] = [];
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".zip") || file.name.toLowerCase().endsWith(".rar")) {
        uploadArchive(botId, displayName, file, currentPath);
      } else {
        queue.push({ relativePath: file.name, file });
      }
    }
    if (queue.length > 0) {
      uploadFiles(botId, displayName, queue, currentPath);
    }
  };

  const handleFolderInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const queue: UploadQueueItem[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const relativePath = (file as any).webkitRelativePath || file.name;
      queue.push({ relativePath, file });
    }
    if (queue.length > 0) {
      uploadFiles(botId, displayName, queue, currentPath);
    }
  };

  const isArchiveFile = (name: string) => {
    const lower = name.toLowerCase();
    return lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz") || lower.endsWith(".tar");
  };

  const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return <Folder className="h-4 w-4 text-indigo-400" />;
    if (isArchiveFile(name)) return <FileArchive className="h-4 w-4 text-amber-400" />;
    if (name.endsWith(".js") || name.endsWith(".ts")) return <FileCode className="h-4 w-4 text-amber-400" />;
    if (name.endsWith(".py")) return <FileCode className="h-4 w-4 text-blue-400" />;
    if (name.endsWith(".json")) return <FileJson className="h-4 w-4 text-emerald-400" />;
    if (name.startsWith(".env")) return <Lock className="h-4 w-4 text-rose-400" />;
    return <FileText className="h-4 w-4 text-zinc-400" />;
  };

  const isDirty = fileContent !== originalContent;
  const lineCount = fileContent.split("\n").length;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex h-[580px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl transition-all"
    >
      {/* Hidden file input with .zip and .rar support */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".zip,.rar,.tar,.gz,.js,.ts,.py,.json,.env,.txt,.md,*"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Hidden folder input with webkitdirectory */}
      <input
        type="file"
        ref={folderInputRef}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFolderInput}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay for Folders, Zips and Files */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-950/90 backdrop-blur-md border-2 border-dashed border-indigo-400 p-8 text-center animate-pulse">
          <UploadCloud className="h-20 w-20 text-indigo-300 mb-3" />
          <h3 className="text-xl font-bold text-white">Rilascia qui File, Cartelle o Archivi ZIP / RAR</h3>
          <p className="text-xs text-indigo-200 mt-2 max-w-md">
            I file e archivi compressi (.zip/.rar) verranno caricati in background ed estratti sul tuo server Proxmox anche se cambi pagina.
          </p>
        </div>
      )}

      {/* File Tree Sidebar */}
      <div className="flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-900/50">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2.5">
          <span className="text-xs font-semibold text-zinc-300">File del Progetto</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => folderInputRef.current?.click()}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Carica un'intera Cartella con tutti i file"
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Carica File o Archivi .ZIP / .RAR"
            >
              <Upload className="h-3.5 w-3.5 text-indigo-400" />
            </button>
            <button
              onClick={() => setShowCreateModal("file")}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Nuovo File"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowCreateModal("folder")}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Nuova Cartella"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => fetchFiles(currentPath)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Ricarica"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Modal for new file/folder */}
        {showCreateModal && (
          <div className="p-2 border-b border-zinc-800 bg-zinc-950">
            <p className="text-[11px] text-zinc-400 mb-1">
              Nuov{showCreateModal === "folder" ? "a Cartella" : "o File"}:
            </p>
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={showCreateModal === "folder" ? "src / commands" : "config.json / bot.js"}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 mb-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreateModal(null);
              }}
            />
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setShowCreateModal(null)}
                className="rounded px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-500"
              >
                Crea
              </button>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 text-center text-zinc-500 mt-6">
              <FileArchive className="h-8 w-8 mb-2 opacity-40 text-amber-400" />
              <p className="text-xs font-medium text-zinc-300">Trascina .ZIP, .RAR o Cartelle</p>
              <p className="text-[10px] text-zinc-500 mt-1">Caricati in background ed estratti</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {files.map((item) => {
                const isSelected = selectedFile === item.path;
                const isArchive = isArchiveFile(item.name);
                const isItemExtracting = extractingFile === item.path;

                return (
                  <li
                    key={item.path}
                    onClick={() => {
                      if (!item.isDirectory && !isArchive) {
                        loadFileContent(item.path);
                      }
                    }}
                    className={`group flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600/20 text-indigo-300 font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(item.name, item.isDirectory)}
                      <span className="truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isArchive && (
                        <button
                          onClick={(e) => handleUnzipFile(item.path, e)}
                          disabled={isItemExtracting}
                          className="opacity-0 group-hover:opacity-100 p-1 text-amber-400 hover:text-amber-300 transition-opacity"
                          title="Estrai archivio (Unzip)"
                        >
                          <Archive className={`h-3 w-3 ${isItemExtracting ? "animate-spin" : ""}`} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(item.path, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                        title="Elimina"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Drag & Drop Quick Hint at bottom of sidebar */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-t border-zinc-800/80 p-2.5 text-center text-[10px] text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/40 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
        >
          <Archive className="h-3.5 w-3.5 text-amber-400" />
          Supporta .ZIP, .RAR e Cartelle
        </div>
      </div>

      {/* Editor Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
        {selectedFile ? (
          <>
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/40 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-300">{selectedFile}</span>
                {isDirty && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 font-medium">Non salvato</span>}
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <Check className="h-3 w-3" /> Salvato!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveFile}
                  disabled={isSaving || !isDirty}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  Salva (Ctrl+S)
                </button>
              </div>
            </div>

            {/* Code Textarea with Line Numbers */}
            <div className="relative flex flex-1 overflow-hidden font-mono text-xs">
              {/* Line Numbers */}
              <div className="w-10 select-none bg-zinc-900/30 border-r border-zinc-800/60 py-3 text-right pr-2 text-zinc-600 text-[11px] overflow-hidden leading-5">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Editor Textarea */}
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                spellCheck={false}
                className="flex-1 resize-none bg-transparent p-3 text-zinc-200 outline-none leading-5 font-mono selection:bg-indigo-500/30"
                placeholder="Inizia a scrivere il codice..."
              />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-600 p-8">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/30 hover:bg-amber-950/10 p-8 transition-all max-w-sm"
            >
              <FileArchive className="h-12 w-12 mb-3 mx-auto text-amber-400/70" />
              <p className="text-sm font-semibold text-zinc-200">Trascina qui File, Cartelle o archivi .ZIP / .RAR</p>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                Gli archivi vengono caricati e decompressi automaticamente sul server Proxmox in background.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
