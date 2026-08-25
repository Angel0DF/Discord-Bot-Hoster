import { NextResponse } from 'next/server';
import { startBot, stopBot, restartBot } from '@/lib/runner';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    let result;
    if (action === 'start') {
      result = await startBot(id);
    } else if (action === 'stop') {
      result = await stopBot(id);
    } else if (action === 'restart') {
      result = await restartBot(id);
    } else {
      return NextResponse.json({ success: false, error: 'Azione non valida. Usa: start, stop, restart' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

