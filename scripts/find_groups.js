const animators = [
  { n: 'Maks Erich', pts: 132, st: 'Animator' },        // G1
  { n: 'Maciej Erich', pts: 313, st: 'Animator' },       // G2
  { n: 'Michał Kupiec', pts: 50, st: 'Animator' },       // G3
  { n: 'Michał Danielczok', pts: 142, st: 'Animator' }   // G4
];

const pool = [
  { n: 'Emil Czech', pts: 306, st: 'Lektor', isSuper: true },
  { n: 'Mikołaj Erich', pts: 145, st: 'Lektor', isSuper: false },
  { n: 'Mateusz Pierścieński', pts: 195, st: 'Starszy', isSuper: false },
  { n: 'Wiktor Kowalski', pts: 61, st: 'Starszy', isSuper: false },
  { n: 'Paweł Głaz', pts: -20, st: 'Starszy', isSuper: false },
  { n: 'Jakub Brytner', pts: 327, st: 'Młodszy', isSuper: true },
  { n: 'Franek Kik', pts: 317, st: 'Kandydat', isSuper: true },
  { n: 'Bartosz Rozik', pts: 240, st: 'Młodszy', isSuper: false },
  { n: 'Rafał Danielczok', pts: 216, st: 'Młodszy', isSuper: false },
  { n: 'Jan Radliński', pts: 208, st: 'Młodszy', isSuper: false },
  { n: 'Ksawery Skrzypek', pts: 202, st: 'Młodszy', isSuper: false },
  { n: 'Marcel Mazurkiewicz', pts: -51, st: 'Młodszy', isSuper: false }
];

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

const solutions = [];

const c1 = getCombinations(pool, 3);
for (const g1Members of c1) {
  const rem1 = pool.filter(p => !g1Members.includes(p));
  const c2 = getCombinations(rem1, 3);
  for (const g2Members of c2) {
    const rem2 = rem1.filter(p => !g2Members.includes(p));
    const c3 = getCombinations(rem2, 3);
    for (const g3Members of c3) {
      const g4Members = rem2.filter(p => !g3Members.includes(p));

      const groups = [
        [animators[0], ...g1Members],
        [animators[1], ...g2Members],
        [animators[2], ...g3Members],
        [animators[3], ...g4Members]
      ];

      // 1. Emil Czech i Mikołaj Erich w RÓŻNYCH grupach
      const emilGroup = groups.findIndex(g => g.some(m => m.n === 'Emil Czech'));
      const mikolajGroup = groups.findIndex(g => g.some(m => m.n === 'Mikołaj Erich'));
      if (emilGroup === mikolajGroup) continue;

      // 2. Każda grupa ma co najmniej 1 Lektora LUB Starszego ministranta
      const allHaveSeniorOrLector = groups.every(g => 
        g.some(m => m.st === 'Lektor' || m.st === 'Starszy')
      );
      if (!allHaveSeniorOrLector) continue;

      // 3. Rozkład lokomotyw punktowych (>300 pkt: Maciej w G2, Emil, Jakub, Franek po jednym na grupę)
      const superCounts = groups.map(g => g.filter(m => m.isSuper || m.n === 'Maciej Erich').length);
      if (!superCounts.every(c => c === 1)) continue;

      const sums = groups.map(g => g.reduce((s, m) => s + m.pts, 0));
      const minSum = Math.min(...sums);
      const maxSum = Math.max(...sums);
      const diff = maxSum - minSum;

      const mikolajWithMaciej = (mikolajGroup === 1);
      const rafalWithMichal = groups[3].some(m => m.n === 'Rafał Danielczok');

      solutions.push({
        groups,
        sums,
        diff,
        mikolajWithMaciej,
        rafalWithMichal
      });
    }
  }
}

console.log('Znaleziono rozwiązań spełniających wszystkie warunki:', solutions.length);

solutions.sort((a, b) => a.diff - b.diff);

console.log('\n=== NAJLEPSZE ROZWIĄZANIA OGÓŁEM (NAJMNIEJSZA RÓŻNICA PUNKTOWA) ===');
solutions.slice(0, 3).forEach((sol, i) => {
  console.log(`\nOPCJA #${i+1} [Różnica max-min: ${sol.diff} pkt] Sumy: G1=${sol.sums[0]}, G2=${sol.sums[1]}, G3=${sol.sums[2]}, G4=${sol.sums[3]} | Mikołaj w G2: ${sol.mikolajWithMaciej} | Rafał w G4: ${sol.rafalWithMichal}`);
  sol.groups.forEach((g, gi) => {
    const names = g.map(m => `${m.n} [${m.st}, ${m.pts}p]`).join(', ');
    console.log(`  Grupa ${gi+1} (${sol.sums[gi]} pkt): ${names}`);
  });
});

console.log('\n=== NAJLEPSZE ROZWIĄZANIA Z MIKOŁAJEM ERICH W GRUPIE 2 (z Maciejem) ===');
const withMikolajG2 = solutions.filter(s => s.mikolajWithMaciej);
withMikolajG2.slice(0, 3).forEach((sol, i) => {
  console.log(`\nOPCJA Z MIKOŁAJEM #${i+1} [Różnica max-min: ${sol.diff} pkt] Sumy: G1=${sol.sums[0]}, G2=${sol.sums[1]}, G3=${sol.sums[2]}, G4=${sol.sums[3]} | Rafał w G4: ${sol.rafalWithMichal}`);
  sol.groups.forEach((g, gi) => {
    const names = g.map(m => `${m.n} [${m.st}, ${m.pts}p]`).join(', ');
    console.log(`  Grupa ${gi+1} (${sol.sums[gi]} pkt): ${names}`);
  });
});
