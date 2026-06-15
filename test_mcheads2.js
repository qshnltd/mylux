async function test() {
  const xuid = BigInt('2535453759792258');
  let hex = xuid.toString(16).padStart(16, '0');
  const uuid = '00000000-0000-0000-0009-' + hex.slice(4);
  console.log("UUID:", uuid);
  const res = await fetch('https://mc-heads.net/body/' + uuid);
  console.log(res.status, res.headers.get("Content-Length"));
}
test();
