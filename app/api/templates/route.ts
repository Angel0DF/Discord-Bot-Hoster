import { NextResponse } from 'next/server';
import { BOT_TEMPLATES } from '@/lib/templates';

export async function GET() {
  return NextResponse.json({ success: true, templates: BOT_TEMPLATES });
}

