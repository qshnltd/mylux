async function test() {
  try {
    const res = await fetch('https://playerdb.co/api/player/xbox/SpongeBob');
    const data = await res.json();
    console.log("PlayerDB:", data);
  } catch(e) { console.error(e) }
}
test();
