import { NextRequest, NextResponse } from 'next/server';
import { Rcon } from 'rcon-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { command, host, port, password } = await req.json();

    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    const rconHost = host || process.env.RCON_HOST || 'ip1.id.geo.lavahosting.id';
    const rconPort = port || process.env.RCON_PORT || 26660;
    const rconPassword = password || process.env.RCON_PASSWORD;

    if (!rconPassword) {
      return NextResponse.json({ error: 'RCON Password is required' }, { status: 401 });
    }

    let rcon;
    const rconTimeoutMs = 3000;
    
    try {
      const rconPromise = Rcon.connect({
         host: rconHost,
         port: parseInt(rconPort as string),
         password: rconPassword,
         timeout: rconTimeoutMs
      });
      
      // Mencegah unhandled promise rejection jika Promise.race timeout duluan
      rconPromise.catch(() => {});

      rcon = await Promise.race([
        rconPromise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout_Firewall')), rconTimeoutMs);
        })
      ]) as any;
    } catch (connError: any) {
      const isTimeout = connError.message === 'Timeout_Firewall' || connError.message?.toLowerCase().includes('timeout') || connError.message?.toLowerCase().includes('closed');
      
      if (isTimeout) {
        return NextResponse.json({ 
          error: `Gagal ke ${rconHost}:${rconPort}. IP panel ini diblokir firewall/Anti-DDoS Lavahosting, atau port RCON salah. Sayangnya server host ini tidak bisa di-remote dari luar.` 
        }, { status: 403 });
      }
      return NextResponse.json({ error: 'RCON Error: ' + connError.message }, { status: 500 });
    }

    const response = await rcon.send(command);
    rcon.end();

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('RCON Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute RCON command' }, { status: 500 });
  }
}

