async function test() {
  try {
    const { createSuperPayOrder } = await import('./src/services/superPay.js');
    console.log("With JS extension:", typeof createSuperPayOrder);
  } catch (e) {
    console.log("With JS extension failed:", e.message);
  }
}
test();
