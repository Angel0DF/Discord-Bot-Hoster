import { NextResponse } from 'next/server';
import { getAllBotStates } from '@/lib/runner';
import { getAllBots, saveBots, createBotFolder } from '@/lib/storage';
import { BotConfig } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { BOT_TEMPLATES } from '@/lib/templates';

export async function GET() {
  try {
    const states = getAllBotStates();
    return NextResponse.json({ success: true, bots: states });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, runtime = 'nodejs', templateId, mainFile, description, env } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Il nome del bot è obbligatorio' }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    const selectedTemplate = BOT_TEMPLATES.find((t) => t.id === templateId);

    const config: BotConfig = {
      id,
      name: name.trim(),
      description: description || (selectedTemplate ? selectedTemplate.description : ''),
      runtime: selectedTemplate ? selectedTemplate.runtime : runtime,
      mainFile: mainFile || (selectedTemplate ? selectedTemplate.mainFile : (runtime === 'python' ? 'main.py' : 'index.js')),
      env: env || (selectedTemplate ? selectedTemplate.defaultEnv : { DISCORD_BOT_TOKEN: '' }),
      autoRestart: true,
      maxRestarts: 5,
      restartDelay: 3000,
      createdAt: now,
      updatedAt: now,
    };

    // Create files from template
    createBotFolder(id, templateId);

    const bots = getAllBots();
    bots.push(config);
    saveBots(bots);

    return NextResponse.json({ success: true, bot: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

