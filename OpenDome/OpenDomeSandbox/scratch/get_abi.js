async function getAbi() {
  try {
    const res = await fetch("https://api.basescan.org/api?module=contract&action=getabi&address=0x77777777dcc4d5a8b6e418fd04d8997ef11000ee", {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const data = await res.json();
    console.log(data.result);
  } catch (e) {
    console.error(e);
  }
}
getAbi();
