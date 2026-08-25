import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/storage';

export async function GET() {
  try {
    const settings = getSettings();
    // Do not leak master password plain text, only indicate if set
    return NextResponse.json({
      success: true,
      hasPassword: !!settings.masterPassword && settings.masterPassword.length > 0,
      proxmox: settings.proxmox,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = getSettings();

    const updated = {
      masterPassword: body.masterPassword !== undefined ? body.masterPassword : current.masterPassword,
      proxmox: {
        ...current.proxmox,
        ...(body.proxmox || {}),
      },
    };

    saveSettings(updated);
    return NextResponse.json({ success: true, message: 'Impostazioni salvate con successo' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

