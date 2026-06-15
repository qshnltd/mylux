async function test() {
  try {
    const res = await fetch('https://crafthead.net/profile/bedrock/SpongeBob');
    const data = await res.json();
    console.log("crafthead:", data);
  } catch(e) { console.error(e) }
}
test();
