import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { BOTS_STORAGE_DIR } from '@/lib/storage';
import { FileItem } from '@/lib/types';

function getSafePath(botId: string, relativePath: string = ''): string | null {
  const botDir = path.join(BOTS_STORAGE_DIR, botId);
  const normalized = path.normalize(path.join(botDir, relativePath));

  // Security check: ensure path is within botDir
  if (!normalized.startsWith(botDir)) {
    return null;
  }
  return normalized;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const subPath = searchParams.get('path') || '';
    const isFileContent = searchParams.get('content') === 'true';

    const targetPath = getSafePath(id, subPath);
    if (!targetPath || !fs.existsSync(targetPath)) {
      return NextResponse.json({ success: false, error: 'File o percorso non trovato' }, { status: 404 });
    }

    const stat = fs.statSync(targetPath);

    if (isFileContent) {
      if (stat.isDirectory()) {
        return NextResponse.json({ success: false, error: 'Il percorso è una cartella, non un file' }, { status: 400 });
      }
      const content = fs.readFileSync(targetPath, 'utf8');
      return NextResponse.json({ success: true, content, path: subPath, size: stat.size });
    }

    if (stat.isDirectory()) {
      const items = fs.readdirSync(targetPath);
      const fileList: FileItem[] = [];

      for (const item of items) {
        // Skip .git and node_modules by default in root view or mark them
        const itemPath = path.join(targetPath, item);
        const itemStat = fs.statSync(itemPath);
        const rel = path.relative(path.join(BOTS_STORAGE_DIR, id), itemPath).replace(/\\/g, '/');

        fileList.push({
          name: item,
          path: rel,
          isDirectory: itemStat.isDirectory(),
          size: itemStat.size,
          updatedAt: itemStat.mtime.toISOString(),
        });
      }

      // Sort directories first, then files alphabetically
      fileList.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json({ success: true, files: fileList, currentPath: subPath });
    }

    const content = fs.readFileSync(targetPath, 'utf8');
    return NextResponse.json({ success: true, content, isFile: true, path: subPath });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { path: filePath, content, isDirectory, action } = body;

    const targetPath = getSafePath(id, filePath);
    if (!targetPath) {
      return NextResponse.json({ success: false, error: 'Percorso non valido o non autorizzato' }, { status: 400 });
    }

    if (action === 'delete') {
      if (fs.existsSync(targetPath)) {
        if (fs.statSync(targetPath).isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(targetPath);
        }
        return NextResponse.json({ success: true, message: 'Elemento eliminato' });
      }
      return NextResponse.json({ success: false, error: 'Elemento non trovato' }, { status: 404 });
    }

    if (action === 'unzip') {
      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ success: false, error: 'Archivio non trovato' }, { status: 404 });
      }
      const destDir = path.dirname(targetPath);
      try {
        const AdmZip = (await import('adm-zip')).default;
        const zip = new AdmZip(targetPath);
        zip.extractAllTo(destDir, true);
        if (body.deleteAfter !== false) {
          try { fs.unlinkSync(targetPath); } catch {}
        }
        return NextResponse.json({ success: true, message: 'Archivio estratto con successo' });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    }

    if (isDirectory) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      return NextResponse.json({ success: true, message: 'Cartella creata con successo' });
    }

    // Save or update file content
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (body.isBinary || body.encoding === 'base64') {
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(targetPath, buffer);
    } else {
      fs.writeFileSync(targetPath, content ?? '', 'utf8');
    }

    return NextResponse.json({ success: true, message: 'File salvato con successo' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

