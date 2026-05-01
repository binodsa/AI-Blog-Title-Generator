/**
 * Utility for generating PRNG-based style constraints
 */

function mulberry32(seed: number) {
    let a = seed | 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  
  const STYLE_CONSTRAINTS_POOL = [
    "Start each title differently; do not reuse the same opening pattern.",
    "Avoid formulaic templates like '10 ways', 'ultimate guide', 'what nobody tells you' unless the topic explicitly calls for it.",
    "Vary punctuation and structure across titles: mix statements, questions, and colon/dash styles.",
    "Use different rhetorical devices across titles: contrast, curiosity gap, specificity, surprise, and benefit framing.",
    "Include at least 2 titles with concrete specificity (numbers, timeframes, or scenarios), but not all 5.",
    "Keep the tone natural and non-clickbait; avoid hype words like 'insane', 'mind-blowing', 'ultimate'.",
  ];
  
  export function pickStyleConstraints(nonce: number): string[] {
    const rng = mulberry32(Math.floor(nonce) ^ 0x9e3779b9);
    const picked: string[] = [];
    const used = new Set<number>();
    const targetCount = 4;
  
    while (
      picked.length < targetCount &&
      used.size < STYLE_CONSTRAINTS_POOL.length
    ) {
      const idx = Math.floor(rng() * STYLE_CONSTRAINTS_POOL.length);
      if (used.has(idx)) continue;
      used.add(idx);
      picked.push(STYLE_CONSTRAINTS_POOL[idx]);
    }
  
    return picked;
  }