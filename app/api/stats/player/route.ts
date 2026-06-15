import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
        return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }

    const db = getDb();
    
    let stats = {
        playtime: '0 hrs',
        kills: '0',
        deaths: '0',
        rank: 'Player',
        level: '0',
        clan: 'None',
        online: false,
        uuid: null as string | null,
        username: username as string
    };

    try {
        // 1. Resolve UUIDs and IDs from Plan Users
        // We match case-insensitively, and also check with or without the bedrock dot
        const baseName = username.startsWith('.') ? username.substring(1) : username;
        const [planUsers]: any = await db.query('SELECT id, uuid, name FROM plan_users WHERE LOWER(name) = LOWER(?) OR LOWER(name) = LOWER(?)', [baseName, '.' + baseName]);
        
        if (planUsers && planUsers.length > 0) {
            // Find primary UUID/name (prefer Java if both exist)
            const javaUser = planUsers.find((u: any) => !u.name.startsWith('.'));
            const primaryUser = javaUser || planUsers[0];
            
            stats.username = primaryUser.name;
            const primaryUuid = primaryUser.uuid;
            const planIds = planUsers.map((u: any) => u.id);
            const uuids = planUsers.map((u: any) => u.uuid);
            
            // 2. Playtime, Kills, Deaths from Plan Sessions
            if (planIds.length > 0) {
                const [sessions]: any = await db.query(`
                    SELECT 
                        SUM(IFNULL(session_end, UNIX_TIMESTAMP(NOW()) * 1000) - session_start) as pt_ms,
                        SUM(mob_kills) as kills,
                        SUM(deaths) as deaths
                    FROM plan_sessions 
                    WHERE user_id IN (?)
                `, [planIds]);
                
                if (sessions && sessions.length > 0) {
                    if (sessions[0].pt_ms) {
                        stats.playtime = Math.round(Number(sessions[0].pt_ms) / 1000 / 60 / 60) + ' hrs';
                    }
                    if (sessions[0].kills) stats.kills = sessions[0].kills.toString();
                    if (sessions[0].deaths) stats.deaths = sessions[0].deaths.toString();
                }
                
                // 3. Online status from Sessions (if there's an ongoing session)
                const [ongoing]: any = await db.query(`
                    SELECT id FROM plan_sessions WHERE user_id IN (?) AND session_end IS NULL LIMIT 1
                `, [planIds]);
                if (ongoing && ongoing.length > 0) {
                    stats.online = true;
                }
            }
            stats.uuid = primaryUuid;
            
            // 4. AuraSkills Level
            if (uuids.length > 0) {
                const [skills]: any = await db.query(`
                    SELECT SUM(sl.skill_level) as total_level
                    FROM auraskills_skill_levels sl 
                    JOIN auraskills_users au ON sl.user_id = au.user_id 
                    WHERE au.player_uuid IN (?)
                `, [uuids]);
                if (skills && skills.length > 0 && skills[0].total_level !== null) {
                    stats.level = skills[0].total_level.toString();
                }
            }
            
            // 5. ClanForge Clan
            if (uuids.length > 0) {
                const [clans]: any = await db.query(`
                    SELECT clan_name, rank FROM clan_members WHERE uuid IN (?) LIMIT 1
                `, [uuids]);
                if (clans && clans.length > 0) {
                    stats.clan = clans[0].clan_name;
                    stats.rank = clans[0].rank; // Fallback to clan rank if main rank missing
                }
            }
        }
    } catch(e) {
        console.error("Failed fetching player data:", e);
    }
    
    // We do not inject dummy fallback data
    return NextResponse.json({ success: true, stats, isMock: false });
  } catch(error: any) {
    console.error('Player Stats Fetch Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch player stats' }, { status: 500 });
  }
}
