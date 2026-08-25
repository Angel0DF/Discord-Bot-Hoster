import { NextResponse } from 'next/server';
import { getBotState, stopBot } from '@/lib/runner';
import { getAllBots, getBotById, saveBots, deleteBotFolder } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const state = getBotState(id);
    if (!state) {
      return NextResponse.json({ success: false, error: 'Bot non trovato' }, { status: 404 });
    }
    return NextResponse.json({ success: true, bot: state });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = getBotById(id);

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Bot non trovato' }, { status: 404 });
    }

    const updated = {
      ...existing,
      ...body,
      id, // protect id
      updatedAt: new Date().toISOString(),
    };

    const bots = getAllBots().map((b) => (b.id === id ? updated : b));
    saveBots(bots);

    return NextResponse.json({ success: true, bot: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await stopBot(id);
    deleteBotFolder(id);

    const bots = getAllBots().filter((b) => b.id !== id);
    saveBots(bots);

    return NextResponse.json({ success: true, message: 'Bot eliminato con successo' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

