async function test() {
  try {
    const res = await fetch("http://0.0.0.0:3000/api/health");
    const data = await res.json();
    console.log("STATUS:", res.status);
    console.log("VERSION:", data.v);
    console.log("FULL BODY:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("FETCH FAILED:", e.message);
  }
}
test();
