async function test() {
  try {
    const res = await fetch('https://api.geysermc.org/v2/xbox/xuid/N1ghTVl481');
    const data = await res.json();
    console.log("XUID:", data);
  } catch(e) { console.error(e) }
}
test();
