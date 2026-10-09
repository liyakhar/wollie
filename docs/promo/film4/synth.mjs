// Wollie film score: all sounds made from scratch (no stock audio).
// Soft pads, a gentle pluck line, glass bells and airy swooshes. 120 BPM.
import { writeFileSync } from 'node:fs'
const SR = 44100, DUR = 30.5, N = Math.round(SR * DUR)
const mk = () => ({ L: new Float32Array(N), R: new Float32Array(N) })
const dry = mk(), wet = mk() // wet goes through a reverb
const TAU = Math.PI * 2
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
let seed = 12345
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
const pan = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)]

function put(bus, t0, len, fn, gain = 1, p = 0) {
  const [gl, gr] = pan(p)
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + len) * SR))
  for (let i = i0; i < i1; i++) {
    const t = i / SR - t0
    const v = fn(t) * gain
    bus.L[i] += v * gl
    bus.R[i] += v * gr
  }
}
const adsr = (t, a, d, len, rel) => {
  if (t < 0) return 0
  const att = a > 0 ? Math.min(1, t / a) : 1
  const dec = Math.exp(-t / d)
  const tail = t > len - rel ? Math.max(0, (len - t) / rel) : 1
  return att * dec * tail
}
const smooth = (x) => x * x * (3 - 2 * x)

/* ---------------- instruments ---------------- */
// soft pad note: detuned sines + triangle, slow attack, gentle release
function pad(t0, len, midi, gain, bus = dry, p = 0) {
  const f = mtof(midi)
  put(bus, t0, len, (t) => {
    const e = Math.min(1, t / 0.9) * Math.min(1, Math.max(0, (len - t) / 1.1))
    const s = Math.sin(TAU * f * t) + 0.55 * Math.sin(TAU * f * 1.004 * t) + 0.35 * Math.sin(TAU * f * 0.996 * t)
      + 0.18 * Math.sin(TAU * f * 2 * t + 0.4 * Math.sin(TAU * 0.13 * t))
    return s * e
  }, gain, p)
}
// pluck: warm, soft, quick decay
function pluck(t0, midi, gain, p = 0, d = 0.28) {
  const f = mtof(midi)
  put(dry, t0, 1.2, (t) => {
    const e = adsr(t, 0.010, d, 1.2, 0.2)
    return (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t) * Math.exp(-t * 14)) * e
  }, gain, p)
  put(wet, t0, 1.2, (t) => Math.sin(TAU * f * t) * adsr(t, 0.010, d, 1.2, 0.2), gain * 0.9, p)
}
// glass bell: inharmonic partials, long shimmer
function bell(t0, midi, gain, p = 0, len = 2.4) {
  const f = mtof(midi)
  const parts = [[1, 1, 1], [2.76, 0.42, 0.55], [5.4, 0.2, 0.3], [8.93, 0.08, 0.18]]
  const fn = (t) => {
    let s = 0
    for (const [r, a, dk] of parts) s += a * Math.sin(TAU * f * r * t) * Math.exp(-t * (2.2 / dk) / (len / 2.4) * 0.5)
    return s * Math.min(1, t / 0.003)
  }
  put(dry, t0, len, fn, gain * 0.7, p)
  put(wet, t0, len, fn, gain, p)
}
// airy swoosh: band-passed noise sweeping, soft in and out
function swoosh(t0, len, f0, f1, gain, p = 0, q = 0.0) {
  let lp = 0, hp = 0, lp2 = 0
  const fn = (t) => {
    const k = t / len
    const fc = f0 * Math.pow(f1 / f0, smooth(Math.min(1, k)))
    const a = 1 - Math.exp((-TAU * fc) / SR)
    const b = 1 - Math.exp((-TAU * fc * 0.35) / SR)
    const x = rnd()
    lp += a * (x - lp)
    lp2 += a * (lp - lp2)
    hp += b * (lp2 - hp)
    const v = lp2 - hp
    const env = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, k))), 1.6)
    return v * env * 2.2
  }
  put(dry, t0, len, fn, gain, p)
  lp = hp = lp2 = 0
  put(wet, t0, len, fn, gain * 0.6, p)
}
// soft glass tick (UI)
function tick(t0, midi, gain, p = 0) {
  const f = mtof(midi)
  put(dry, t0, 0.35, (t) => (Math.sin(TAU * f * t) * Math.exp(-t * 38) + 0.4 * Math.sin(TAU * f * 2.4 * t) * Math.exp(-t * 60)) * Math.min(1, t / 0.0015), gain, p)
  put(wet, t0, 0.35, (t) => Math.sin(TAU * f * t) * Math.exp(-t * 38), gain * 0.8, p)
}
// round bloop (dot appears)
function bloop(t0, gain, f0 = 330, f1 = 780) {
  put(dry, t0, 0.5, (t) => {
    const f = f0 + (f1 - f0) * (1 - Math.exp(-t * 18))
    return Math.sin(TAU * f * t) * Math.exp(-t * 9) * Math.min(1, t / 0.004)
  }, gain)
  put(wet, t0, 0.5, (t) => Math.sin(TAU * 600 * t) * Math.exp(-t * 9), gain * 0.7)
}
// soft sub thud
function thud(t0, gain, f = 62, d = 0.22) {
  put(dry, t0, 1.2, (t) => Math.sin(TAU * (f + 40 * Math.exp(-t * 25)) * t) * Math.exp(-t / d) * Math.min(1, t / 0.003), gain)
}
// rising sparkle (arpeggio up)
function sparkle(t0, base, gain, steps = [0, 4, 7, 12], gap = 0.07) {
  steps.forEach((s, i) => bell(t0 + i * gap, base + s, gain * (0.8 + 0.1 * i), -0.3 + i * 0.2, 1.8))
}

/* ---------------- music ---------------- */
const BEAT = 0.5, BAR = 2.0, DROP = 4.38
// chords: C maj9, A min9, F maj9, G 6/9 (voicings in midi)
const CH = [
  { root: 36, notes: [48, 52, 55, 59, 62], arp: [60, 64, 67, 71, 72, 71, 67, 64] },
  { root: 33, notes: [45, 48, 52, 55, 59], arp: [57, 60, 64, 67, 69, 67, 64, 60] },
  { root: 41, notes: [53, 57, 60, 64, 67], arp: [60, 65, 69, 72, 76, 72, 69, 65] },
  { root: 43, notes: [50, 55, 59, 62, 64], arp: [59, 62, 67, 71, 74, 71, 67, 62] },
]
const END_MUSIC = 26.4
for (let bar = 0; bar * BAR < END_MUSIC + BAR; bar++) {
  const c = CH[bar % 4], t0 = bar * BAR
  const open = t0 >= DROP - 0.01
  // pad is on the whole time; it gets filtered below (muffled before the drop)
  c.notes.forEach((m, i) => pad(t0, BAR + 0.9, m, 0.020 - i * 0.002, dry, -0.5 + i * 0.25))
  if (!open) continue
  // bass: on beat 1 and the "and" of beat 3
  const bass = (tt, g) => put(dry, tt, 0.9, (t) => (Math.sin(TAU * mtof(c.root) * t) + 0.25 * Math.sin(TAU * mtof(c.root + 12) * t)) * adsr(t, 0.01, 0.35, 0.9, 0.2), g)
  bass(t0, 0.15); bass(t0 + 1.5, 0.11)
  // plucks: 8th notes
  c.arp.forEach((m, i) => {
    const tt = t0 + i * 0.25
    if (tt < DROP - 0.01 || tt > END_MUSIC) return
    const accent = i % 4 === 0 ? 1 : 0.7
    pluck(tt, m, 0.085 * accent, i % 2 ? 0.35 : -0.35)
  })
  // soft shaker on off beats
  for (let i = 0; i < 4; i++) {
    const tt = t0 + i * BEAT + BEAT / 2
    if (tt > END_MUSIC) continue
    let hp = 0
    put(dry, tt, 0.09, (t) => { const x = rnd(); const y = x - hp; hp += 0.5 * (x - hp); return y * Math.exp(-t * 60) }, 0.03, i % 2 ? 0.4 : -0.4)
  }
}
// riser before the drop: soft air that opens
swoosh(3.35, 1.03, 400, 3500, 0.12, 0)
// the drop: warm low boom + open shimmer
thud(DROP, 0.40, 55, 0.5)
sparkle(DROP, 72, 0.045, [0, 7, 12, 16], 0.05)
// final chord (tonic) rings out under the end card
;[48, 55, 60, 64, 67, 71].forEach((m, i) => pad(26.3, 4.2, m, 0.020, dry, -0.4 + i * 0.16))
bell(26.85, 84, 0.07, 0, 3.4)

/* ---------------- sound design on every motion ---------------- */
// hook: chips are pulled in, the dot appears, the logo blooms
swoosh(2.55, 0.5, 250, 2400, 0.17, 0)
bloop(2.84, 0.28)
bell(3.22, 72, 0.075, -0.2, 2.2); bell(3.22, 79, 0.05, 0.2, 2.2)
// ring: segments drawn
;[0, 1, 2, 3, 4].forEach((i) => tick(4.67 + i * 0.16, [76, 79, 81, 84, 88][i], 0.12, -0.5 + i * 0.25))
// transitions: soft air + a tiny low glide
const TR = [[7.2, 0.7], [10.15, 0.7], [15.55, 0.7], [21.95, 0.7], [25.5, 0.8]]
TR.forEach(([t, l], i) => {
  swoosh(t - 0.1, l, 250, 2000, 0.16, i % 2 ? 0.25 : -0.25)
  put(dry, t, l, (tt) => Math.sin(TAU * (160 + 170 * smooth(tt / l)) * tt) * Math.sin(Math.PI * tt / l) * 0.05, 1)
})
// card lands
tick(8.25, 84, 0.10); tick(8.3, 91, 0.06)
// chart line draws
swoosh(8.25, 1.4, 500, 1800, 0.04, 0.1)
// budget bars fill
;[0, 1, 2, 3].forEach((i) => tick(11.0 + i * 0.42, [79, 81, 84, 79][i], 0.12, -0.4 + i * 0.27))
// transport goes red: soft low warning (two descending marimba-ish notes)
tick(13.75, 60, 0.28); tick(13.9, 55, 0.24); thud(13.75, 0.22, 90, 0.18)
// notification chime
bell(14.35, 88, 0.12, 0.15, 2.0); bell(14.52, 95, 0.095, 0.25, 2.2)
// savings: transfer slides in, drops into the slot, tick-off sparkle
swoosh(18.55, 0.8, 300, 1900, 0.13, -0.3)
bloop(19.35, 0.30, 500, 280); thud(19.35, 0.26, 70, 0.16)
sparkle(20.04, 84, 0.12, [0, 4, 7, 12, 16], 0.075)
bell(20.04, 60, 0.07, 0, 2.6)
// two banks link, then merge
swoosh(23.55, 0.5, 500, 2200, 0.09, 0.2)
tick(24.0, 79, 0.12, 0.3)
thud(24.85, 0.22, 66, 0.3)
sparkle(24.85, 76, 0.07, [0, 7, 12], 0.06)
// end: flood collapses to the dot, wordmark opens
swoosh(26.25, 0.7, 2400, 280, 0.14, 0)
bloop(26.82, 0.26, 420, 900)
// tagline lands, url lands
tick(27.45, 91, 0.10); tick(28.3, 96, 0.08)

/* ---------------- reverb on the wet bus ---------------- */
function reverb(src) {
  const out = mk()
  for (const ch of ['L', 'R']) {
    const x = src[ch], y = out[ch]
    const off = ch === 'L' ? 0 : 23
    const combs = [1557, 1617, 1491, 1422].map((d) => d + off)
    const gains = [0.84, 0.83, 0.82, 0.81]
    for (let c = 0; c < combs.length; c++) {
      const d = combs[c], g = gains[c]
      const buf = new Float32Array(d)
      let idx = 0, lp = 0
      for (let i = 0; i < N; i++) {
        const o = buf[idx]
        lp += 0.35 * (o - lp)
        buf[idx] = x[i] + lp * g
        y[i] += o * 0.25
        idx = (idx + 1) % d
      }
    }
    // two allpass
    for (const d of [225 + off, 556 + off]) {
      const buf = new Float32Array(d); let idx = 0
      for (let i = 0; i < N; i++) {
        const o = buf[idx]; const v = y[i] + o * 0.5
        buf[idx] = v; y[i] = o - v * 0.5; idx = (idx + 1) % d
      }
    }
  }
  return out
}
const rv = reverb(wet)

/* ---------------- music is muffled before the drop ---------------- */
// one-pole lowpass whose cutoff opens at the drop (applies to the whole dry bus before the drop moment)
function openFilter(ch) {
  let y = 0
  for (let i = 0; i < N; i++) {
    const t = i / SR
    const k = smooth(Math.min(1, Math.max(0, (t - (DROP - 0.5)) / 0.55)))
    const fc = 450 + (14000 - 450) * k * k
    const a = 1 - Math.exp((-TAU * fc) / SR)
    y += a * (ch[i] - y)
    ch[i] = y
  }
}
// Only the pad/bass/music should be muffled; sfx before the drop are few and already soft, so filter everything lightly.
// (Hook sfx remain audible because they carry plenty of low-mid energy.)
openFilter(dry.L); openFilter(dry.R)
const rvMuffle = (ch) => { let y = 0; for (let i = 0; i < N; i++) { const t = i / SR; const k = smooth(Math.min(1, Math.max(0, (t - (DROP - 0.5)) / 0.55))); const fc = 900 + 12000 * k * k; const a = 1 - Math.exp((-TAU * fc) / SR); y += a * (ch[i] - y); ch[i] = y } }
rvMuffle(rv.L); rvMuffle(rv.R)

/* ---------------- mix down ---------------- */
const outL = new Float32Array(N), outR = new Float32Array(N)
let peak = 0
for (let i = 0; i < N; i++) {
  const t = i / SR
  const fade = Math.min(1, t / 0.25) * Math.min(1, Math.max(0, (DUR - t) / 1.8))
  outL[i] = (dry.L[i] + rv.L[i] * 0.55) * fade
  outR[i] = (dry.R[i] + rv.R[i] * 0.55) * fade
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]))
}
{ // soften the top: gentle lowpass around 9 kHz so nothing is harsh
  let yl = 0, yr = 0; const a = 1 - Math.exp((-TAU * 9000) / SR)
  for (let i = 0; i < N; i++) { yl += a * (outL[i] - yl); yr += a * (outR[i] - yr); outL[i] = yl; outR[i] = yr }
}
const norm = 0.85 / peak
const pcm = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(outL[i] * norm * 32767))), i * 4)
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(outR[i] * norm * 32767))), i * 4 + 2)
}
const hdr = Buffer.alloc(44)
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16)
hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28)
hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40)
writeFileSync('/home/liya/work/promo/film4/score.wav', Buffer.concat([hdr, pcm]))
console.log('score.wav written, peak', peak.toFixed(3))
