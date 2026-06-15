async function test() {
  const res = await fetch('https://bedrock.minotar.net/armor/body/test/150.png');
  console.log(res.status);
}
test();
