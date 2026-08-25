import { NextResponse } from 'next/server';
import { addLogListener, getBotState, sendBotInput, clearBotLogs } from '@/lib/runner';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = getBotState(id);

  if (!state) {
    return new NextResponse('Bot non trovato', { status: 404 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial history
  const initialLogs = state.logs || [];
  const sendInitial = async () => {
    try {
      const data = JSON.stringify({ type: 'history', logs: initialLogs });
      await writer.write(encoder.encode(`data: ${data}\n\n`));
    } catch {
      // client may have disconnected
    }
  };

  sendInitial();

  const removeListener = addLogListener(id, async (line: string) => {
    try {
      const data = JSON.stringify({ type: 'log', log: line });
      await writer.write(encoder.encode(`data: ${data}\n\n`));
    } catch {
      // client disconnected
    }
  });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`: ping\n\n`));
    } catch {
      clearInterval(heartbeat);
      removeListener();
    }
  }, 15000);

  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeat);
    removeListener();
    writer.close().catch(() => {});
  });

  return new NextResponse(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { input, action } = body;

    if (action === 'clear') {
      clearBotLogs(id);
      return NextResponse.json({ success: true, message: 'Log svuotati' });
    }

    if (typeof input === 'string') {
      const sent = sendBotInput(id, input);
      return NextResponse.json({ success: sent });
    }

    return NextResponse.json({ success: false, error: 'Azione o input non valido' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

