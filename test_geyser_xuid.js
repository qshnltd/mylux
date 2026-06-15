async function test() {
  try {
    const res = await fetch('https://api.geysermc.org/v2/skin/2535453759792258');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) { console.error(e) }
}
test();
