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
} from "lucide-react";

import { ApiClient } from "@/lib/api-client";

interface FileEditorProps {
  botId: string;
}

export const FileEditor = ({ botId }: FileEditorProps) => {
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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Drag and Drop & File Upload handlers
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

  const processUploadedFiles = async (fileList: FileList | File[]) => {
    setIsDragging(false);
    setUploadStatus(`Caricamento di ${fileList.length} file in corso...`);

    let uploadedCount = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const text = await file.text();
        const targetPath = currentPath ? `${currentPath}/${file.name}` : file.name;

        await ApiClient.saveFile(botId, {
          path: targetPath,
          content: text,
        });
        uploadedCount++;
      } catch (err) {
        console.error("Failed to upload file:", file.name, err);
      }
    }

    setUploadStatus(`✅ ${uploadedCount} file caricati con successo!`);
    setTimeout(() => setUploadStatus(null), 3000);
    await fetchFiles(currentPath);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processUploadedFiles(e.target.files);
    }
  };

  const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return <Folder className="h-4 w-4 text-indigo-400" />;
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
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-950/80 backdrop-blur-md border-2 border-dashed border-indigo-400 p-8 text-center animate-pulse">
          <UploadCloud className="h-16 w-16 text-indigo-300 mb-3" />
          <h3 className="text-lg font-bold text-white">Rilascia qui i file del tuo bot</h3>
          <p className="text-xs text-indigo-200 mt-1">
            Verranno caricati istantaneamente nella cartella del bot sul tuo server Proxmox.
          </p>
        </div>
      )}

      {/* Upload Notification Banner */}
      {uploadStatus && (
        <div className="absolute top-3 right-4 z-40 rounded-xl border border-indigo-500/40 bg-zinc-900/90 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md flex items-center gap-2">
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* File Tree Sidebar */}
      <div className="flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-900/50">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2.5">
          <span className="text-xs font-semibold text-zinc-300">File del Progetto</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Carica File dal PC (o trascinali qui)"
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
              <UploadCloud className="h-8 w-8 mb-2 opacity-40 text-indigo-400" />
              <p className="text-xs font-medium text-zinc-400">Trascina i file qui</p>
              <p className="text-[10px] text-zinc-500 mt-1">oppure clicca l'icona di upload</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {files.map((item) => {
                const isSelected = selectedFile === item.path;
                return (
                  <li
                    key={item.path}
                    onClick={() => {
                      if (!item.isDirectory) {
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

                    <button
                      onClick={(e) => handleDelete(item.path, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                      title="Elimina"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Drag & Drop Quick Hint at bottom of sidebar */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-t border-zinc-800/80 p-2.5 text-center text-[10px] text-zinc-500 hover:text-indigo-300 hover:bg-zinc-800/40 cursor-pointer transition-colors"
        >
          📁 Trascina qui i file dal tuo PC
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
              className="cursor-pointer rounded-2xl border border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/30 hover:bg-indigo-950/20 p-8 transition-all max-w-sm"
            >
              <UploadCloud className="h-12 w-12 mb-3 mx-auto text-indigo-400/60" />
              <p className="text-sm font-semibold text-zinc-300">Trascina e Rilascia i file qui</p>
              <p className="text-xs text-zinc-500 mt-1">
                Oppure clicca per selezionare i file del tuo bot dal computer
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
