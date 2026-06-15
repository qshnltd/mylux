import { NextResponse } from 'next/server';
// @ts-ignore
import { GameDig } from 'gamedig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 1000; // 15 seconds for faster live updates

export async function GET() {
  try {
    const now = Date.now();
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
       return NextResponse.json(cachedData);
    }

    const state = await GameDig.query({
        type: 'minecraft',
        host: 'luxian.qzz.io',
        port: 26659,
        maxRetries: 1,
        requestTimeout: 3000
    });
    
    // Format to match expected page.tsx structure
    const data = {
      online: true,
      players: {
        online: state.numplayers,
        max: state.maxplayers,
        list: state.players.map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean)
      },
      version: state.version,
      motd: {
        clean: [state.name],
        html: [`<span style="color:#3BD03B">${state.name}</span>`]
      }
    };

    cachedData = data;
    lastFetchTime = now;
    return NextResponse.json(data);
    
  } catch (error: any) {
    if (cachedData) return NextResponse.json(cachedData);
    if (!error?.message?.includes("Failed all")) {
        console.error('API Route Error:', error);
    }
    return NextResponse.json({ 
      online: false, 
      players: { online: 0, max: 20, list: [] }, 
      motd: { clean: ["Server is offline"], html: ["<span style=\"color:#ff5555\">Server is offline</span>"] },
      error: 'Failed to fetch status'
    });
  }
}


