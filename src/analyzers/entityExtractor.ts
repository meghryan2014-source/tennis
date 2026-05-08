const playerNameRegex = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\b/g;
const rankRegex = /(?:rank(?:ed|ing)?\s*#?|world\s*#)\s*(\d{1,3})/i;

const tournamentKeywords = [
  "Open",
  "Masters",
  "Wimbledon",
  "Roland Garros",
  "US Open",
  "Australian Open",
  "ATP Finals",
  "WTA Finals"
];

export const extractPlayerNames = (text: string): string[] => {
  const matches = text.match(playerNameRegex) ?? [];
  const unique = [...new Set(matches)];
  return unique.filter((name) => !name.includes("ATP Tour") && !name.includes("WTA Tennis")).slice(0, 6);
};

export const extractPlayerRank = (text: string): number | null => {
  const rankMatch = text.match(rankRegex);
  if (!rankMatch) return null;
  const rank = Number(rankMatch[1]);
  return Number.isFinite(rank) ? rank : null;
};

export const extractTournamentNames = (text: string): string[] => {
  const tournaments = tournamentKeywords.filter((keyword) =>
    new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "i").test(text)
  );
  return tournaments;
};
