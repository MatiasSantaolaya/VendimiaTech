export const MATCH_RULES = [
  { id: "interests", pointsEach: 12, max: 40, text: "Intereses en común suman 12 puntos cada uno, con tope 40." },
  { id: "goals", pointsEach: 10, max: 25, text: "Objetivos en común suman 10 puntos cada uno, con tope 25." },
  { id: "tags", pointsEach: 8, max: 20, text: "Etiquetas en común suman 8 puntos cada una, con tope 20." },
  { id: "complementary", points: 15, text: "Un objetivo complementario suma 15 puntos, una sola vez." },
  { id: "sameCompany", points: -10, text: "La misma empresa resta 10 puntos." },
] as const;

const COMPLEMENTS: [string, string][] = [
  ["contratar", "busco-trabajo"],
  ["invertir", "levanto-capital"],
  ["mentoria", "busco-mentor"],
  ["sponsors", "oferta-patrocinio"],
];

export type MatchProfile = { interests: string[]; goals: string[]; tags: string[]; company: string };

export function matchScore(a: MatchProfile, b: MatchProfile) {
  const reasons: string[] = [];
  const sharedInterests = a.interests.filter((item) => b.interests.includes(item));
  const interestPts = Math.min(40, sharedInterests.length * 12);
  if (interestPts) reasons.push(`${sharedInterests.length} interés(es) en común (+${interestPts})`);
  const sharedGoals = a.goals.filter((item) => b.goals.includes(item));
  const goalPts = Math.min(25, sharedGoals.length * 10);
  if (goalPts) reasons.push(`${sharedGoals.length} objetivo(s) en común (+${goalPts})`);
  const sharedTags = a.tags.filter((item) => b.tags.includes(item));
  const tagPts = Math.min(20, sharedTags.length * 8);
  if (tagPts) reasons.push(`${sharedTags.length} etiqueta(s) en común (+${tagPts})`);
  let complementary = 0;
  for (const [left, right] of COMPLEMENTS) {
    const aLeft = a.goals.includes(left) || a.tags.includes(left);
    const bRight = b.goals.includes(right) || b.tags.includes(right);
    const bLeft = b.goals.includes(left) || b.tags.includes(left);
    const aRight = a.goals.includes(right) || a.tags.includes(right);
    if ((aLeft && bRight) || (bLeft && aRight)) {
      complementary = 15;
      reasons.push(`Complemento ${left} / ${right} (+15)`);
      break;
    }
  }
  let company = 0;
  if (a.company && b.company && a.company.toLowerCase() === b.company.toLowerCase()) {
    company = -10;
    reasons.push("Misma empresa (-10)");
  }
  const score = Math.max(0, Math.min(100, interestPts + goalPts + tagPts + complementary + company));
  return { score, reasons };
}
