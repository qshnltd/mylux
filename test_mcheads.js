async function test() {
  try {
    const res = await fetch('https://mc-heads.net/body/00000000-0000-0000-0009-0123456789abcdef');
    console.log("mc-heads status:", res.status, res.headers.get("Content-Length"));
  } catch(e) { console.error(e) }
}
test();
