async function test() {
  try {
    const { createSuperPayOrder } = await import('./src/services/superPay');
    console.log("Without extension:", typeof createSuperPayOrder);
  } catch (e) {
    console.log("Without extension failed:", e.message);
  }
}
test();
