import { NextResponse } from 'next/server';
import { getSystemStats } from '@/lib/system';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = getSystemStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

