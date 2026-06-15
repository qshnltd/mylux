import { NextResponse } from 'next/server';
// @ts-ignore
import { GameDig } from 'gamedig';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    
    let skills: any[] = [];
    let playtime: any[] = [];
    let kills: any[] = [];
    let clans: any[] = [];
    let general: any[] = [];
    
    // 1. Top Skills (AuraSkills)
    try {
        const [rows]: any = await db.query(`
            SELECT IF(u.name LIKE '.%', SUBSTRING(u.name, 2), u.name) as username, MAX(u.uuid) as uuid, SUM(sl.skill_level) as stat 
            FROM auraskills_skill_levels sl 
            JOIN auraskills_users au ON sl.user_id = au.user_id 
            JOIN plan_users u ON au.player_uuid = u.uuid 
            GROUP BY username 
            ORDER BY stat DESC 
            LIMIT 10
        `);
        skills = rows.filter((r: any) => r.username);
    } catch(e: any) {}

    // 2. Top Playtime (Plan)
    try {
        const [rows]: any = await db.query(`
            SELECT IF(u.name LIKE '.%', SUBSTRING(u.name, 2), u.name) as username, MAX(u.uuid) as uuid, SUM(IFNULL(s.session_end, UNIX_TIMESTAMP(NOW()) * 1000) - s.session_start) as stat 
            FROM plan_sessions s 
            JOIN plan_users u ON s.user_id = u.id 
            GROUP BY username 
            ORDER BY stat DESC 
            LIMIT 10
        `);
        playtime = rows.filter((r: any) => r.username);
    } catch(e: any) {}
    
    // 3. Top Kills (Plan)
    try {
        const [rows]: any = await db.query(`
            SELECT IF(u.name LIKE '.%', SUBSTRING(u.name, 2), u.name) as username, MAX(u.uuid) as uuid, SUM(s.mob_kills) as stat 
            FROM plan_sessions s 
            JOIN plan_users u ON s.user_id = u.id 
            GROUP BY username 
            ORDER BY stat DESC 
            LIMIT 10
        `);
        kills = rows.filter((r: any) => r.username);
    } catch(e: any) {}

    // 4. Top Clans (ClanForge)
    try {
        const [rows]: any = await db.query(`
            SELECT name as username, level as stat 
            FROM clans 
            ORDER BY level DESC 
            LIMIT 10
        `);
        clans = rows.filter((r: any) => r.username);
    } catch(e: any) {}
    
    let isEmpty = skills.length === 0 && playtime.length === 0 && kills.length === 0 && clans.length === 0;
    
    // 5. Online players via query if DB is totally empty
    let onlineList = [];
    if (isEmpty) {
        try {
            const state = await GameDig.query({
                type: 'minecraft',
                host: 'luxian.qzz.io',
                port: 26659,
                maxRetries: 1,
                requestTimeout: 2000
            });
            onlineList = state.players.map((p: any) => ({
                username: typeof p === 'string' ? p : p.name,
                stat: 'Online Now'
            })).filter((p: any) => p.username);
            
            if (onlineList.length > 0) {
                general = onlineList;
                isEmpty = false;
            }
        } catch(e) {}
    }
    
    return NextResponse.json({ 
        success: true, 
        leaderboard: { 
            skills, 
            playtime,
            kills,
            clans,
            general,
            isEmpty
        } 
    });
  } catch(error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard data', details: error.message }, { status: 500 });
  }
}


