const { GameDig } = require('gamedig');

async function test() {
  try {
    const state = await GameDig.query({
        type: 'minecraft',
        host: 'luxian.qzz.io',
        port: 26659
    });
    console.log(state);
  } catch (error) {
    console.error("error", error);
  }
}
test();
