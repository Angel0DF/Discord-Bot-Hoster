"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { ApiClient } from "@/lib/api-client";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, Archive, ChevronDown, ChevronUp } from "lucide-react";
import JSZip from "jszip";

export interface UploadTask {
  id: string;
  botId: string;
  botName: string;
  totalFiles: number;
  completedFiles: number;
  currentFileName: string;
  status: "uploading" | "extracting" | "completed" | "error";
  errorMessage?: string;
  archiveMode?: boolean;
}

interface UploadContextType {
  tasks: UploadTask[];
  uploadFiles: (botId: string, botName: string, files: Array<{ relativePath: string; file?: File; content?: string }>, targetPath?: string) => Promise<void>;
  uploadArchive: (botId: string, botName: string, archiveFile: File, targetPath?: string) => Promise<void>;
  clearTask: (taskId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const clearTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Upload an archive file (.zip / .rar), send it to server, and trigger server-side unzip
  const uploadArchive = async (botId: string, botName: string, archiveFile: File, targetPath: string = "") => {
    const taskId = `archive_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const task: UploadTask = {
      id: taskId,
      botId,
      botName,
      totalFiles: 1,
      completedFiles: 0,
      currentFileName: archiveFile.name,
      status: "uploading",
      archiveMode: true,
    };

    setTasks((prev) => [...prev, task]);

    try {
      // 1. Read archive as Base64
      const arrayBuffer = await archiveFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Content = btoa(binary);

      const remoteFileName = archiveFile.name;
      const remoteFilePath = targetPath ? `${targetPath}/${remoteFileName}` : remoteFileName;

      // 2. Upload archive file to server
      await ApiClient.saveFile(botId, {
        path: remoteFilePath,
        content: base64Content,
        isBinary: true,
        encoding: "base64",
      });

      // 3. Trigger Server-side Unzip
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "extracting", currentFileName: `Estrazione di ${archiveFile.name}...` } : t))
      );

      const unzipRes = await ApiClient.saveFile(botId, {
        path: remoteFilePath,
        action: "unzip",
        deleteAfter: true,
      });

      if (!unzipRes.success) {
        throw new Error(unzipRes.error || "Errore durante l'estrazione dell'archivio sul server");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "completed", completedFiles: 1, currentFileName: "Archivio estratto con successo!" }
            : t
        )
      );

      setTimeout(() => {
        clearTask(taskId);
      }, 5000);
    } catch (err: any) {
      console.error("Upload archive error:", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "error", errorMessage: err.message || "Errore durante il caricamento o l'estrazione" }
            : t
        )
      );
    }
  };

  // Upload multiple files preserving folder tree
  const uploadFiles = async (
    botId: string,
    botName: string,
    files: Array<{ relativePath: string; file?: File; content?: string }>,
    targetPath: string = ""
  ) => {
    const taskId = `files_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const task: UploadTask = {
      id: taskId,
      botId,
      botName,
      totalFiles: files.length,
      completedFiles: 0,
      currentFileName: files[0]?.relativePath || "",
      status: "uploading",
    };

    setTasks((prev) => [...prev, task]);

    try {
      let count = 0;
      for (const item of files) {
        const fullTarget = targetPath ? `${targetPath}/${item.relativePath}` : item.relativePath;

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, completedFiles: count, currentFileName: item.relativePath }
              : t
          )
        );

        let content = item.content;
        if (content === undefined && item.file) {
          content = await item.file.text();
        }

        await ApiClient.saveFile(botId, {
          path: fullTarget,
          content: content ?? "",
        });

        count++;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, completedFiles: count } : t
          )
        );
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "completed", currentFileName: "Tutti i file caricati con successo!" }
            : t
        )
      );

      setTimeout(() => {
        clearTask(taskId);
      }, 5000);
    } catch (err: any) {
      console.error("Batch upload error:", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "error", errorMessage: err.message || "Errore durante il caricamento" }
            : t
        )
      );
    }
  };

  return (
    <UploadContext.Provider value={{ tasks, uploadFiles, uploadArchive, clearTask }}>
      {children}

      {/* Floating Global Upload Widget */}
      {tasks.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl transition-all">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-white">Caricamenti in background ({tasks.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {tasks.map((task) => {
                const percent =
                  task.totalFiles > 0
                    ? Math.round((task.completedFiles / task.totalFiles) * 100)
                    : 0;

                return (
                  <div key={task.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-white truncate max-w-[180px]">{task.botName}</span>
                      <div className="flex items-center gap-1.5">
                        {task.status === "uploading" && (
                          <span className="flex items-center gap-1 text-[11px] text-indigo-400 font-mono">
                            <Loader2 className="h-3 w-3 animate-spin" /> {percent}%
                          </span>
                        )}
                        {task.status === "extracting" && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono animate-pulse">
                            <Archive className="h-3 w-3" /> Decompressione...
                          </span>
                        )}
                        {task.status === "completed" && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Fatto
                          </span>
                        )}
                        {task.status === "error" && (
                          <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" /> Errore
                          </span>
                        )}
                        <button
                          onClick={() => clearTask(task.id)}
                          className="text-zinc-500 hover:text-zinc-300 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800 mb-1.5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          task.status === "error"
                            ? "bg-rose-500"
                            : task.status === "completed"
                            ? "bg-emerald-500"
                            : task.status === "extracting"
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                        }`}
                        style={{
                          width: task.status === "completed" ? "100%" : task.status === "extracting" ? "90%" : `${Math.max(5, percent)}%`,
                        }}
                      />
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate">
                      {task.currentFileName}
                    </p>
                    {task.errorMessage && (
                      <p className="text-[10px] text-rose-400 mt-1">{task.errorMessage}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
};

