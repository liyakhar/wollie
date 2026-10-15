// Usage: CARTESIA_API_KEY=... node take.mjs script.txt [voiceId] [model]
// script.txt: one paragraph per scene, blank line between paragraphs.
// Writes vo/take.wav (one continuous read) and vo/take.json ({ segs, words }) with word timings.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const [,, file = "script.txt", voiceId = "5cad89c9-d88a-4832-89fb-55f2f16d13d3", model = "sonic-3.6"] = process.argv;
const key = process.env.CARTESIA_API_KEY;
if (!key) { console.error("CARTESIA_API_KEY is not set. Run this through the secret manager."); process.exit(2); }
const rawSegs = readFileSync(file, "utf8").split(/\n\s*\n/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean); const segs = rawSegs.map((s) => s.replace(/<[^>]+>/g, " ").replace(/\.\.\./g, ".").replace(/\s+/g, " ").trim());
const transcript = rawSegs.join(' <break time="900ms"/> ');
const r = await fetch("https://api.cartesia.ai/tts/sse", {
  method: "POST",
  headers: { "X-API-Key": key, "Cartesia-Version": "2026-08-14", "Content-Type": "application/json" },
  body: JSON.stringify({ model_id: model, transcript, voice: { mode: "id", id: voiceId }, language: "en", add_timestamps: true, output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: 44100 } }),
});
if (!r.ok) { console.error("Cartesia refused the request:", r.status, (await r.text()).slice(0, 300)); process.exit(1); }
const chunks = [], words = [];
for (const block of (await r.text()).split(/\n\n+/)) {
  const line = block.split("\n").find((l) => l.startsWith("data:")); if (!line) continue;
  let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
  if (ev.type === "chunk" && ev.data) chunks.push(Buffer.from(ev.data, "base64"));
  if (ev.type === "timestamps") { const w = ev.word_timestamps; w.words.forEach((x, i) => words.push({ w: x, s: w.start[i], e: w.end[i] })); }
  if (ev.type === "error") { console.error("Cartesia error event:", JSON.stringify(ev).slice(0, 300)); process.exit(1); }
}
const expected = segs.join(" ").split(/\s+/).length;
if (words.length !== expected) { console.error(`Word count mismatch: script has ${expected}, timings have ${words.length}. Remove symbols the voice does not read (URLs, slashes, emoji) and run again.`); process.exit(1); }
const pcm = Buffer.concat(chunks), h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(44100, 24); h.writeUInt32LE(88200, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
mkdirSync("vo", { recursive: true });
writeFileSync("vo/take.wav", Buffer.concat([h, pcm])); writeFileSync("vo/take.json", JSON.stringify({ segs, words }));
console.log(`vo/take.wav ${(pcm.length / 88200).toFixed(2)} s, ${words.length} words, ${segs.length} segments`);
