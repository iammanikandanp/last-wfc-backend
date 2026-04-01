// utils/csvParser.js
// Robust CSV parser — handles quoted fields, comma inside quotes, CRLF/LF

export const parseCSVText = (text) => {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let cur = "";
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) =>
    h.replace(/^\uFEFF/, "").trim().toLowerCase()
  );

  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] !== undefined ? values[i] : "";
    });
    return obj;
  });

  return { headers, rows };
};

// ── Diet CSV validator ────────────────────────────────────────────────────────
export const DIET_REQUIRED_HEADERS = ["day"];
export const DIET_ALL_HEADERS = [
  "day", "morning", "afternoon", "evening", "night",
  "preworkout", "postworkout", "food", "calories", "weightloss", "weightgain",
];

// ── Workout CSV validator ─────────────────────────────────────────────────────
export const WORKOUT_REQUIRED_HEADERS = ["day"];
export const WORKOUT_ALL_HEADERS = [
  "day", "morning", "evening", "chest", "back",
  "biceps", "triceps", "legs", "shoulders", "cardio", "count", "reps",
];

export const VALID_DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export const normalizeDay = (raw) => {
  if (!raw) return null;
  const d = raw.trim();
  return VALID_DAYS.find((v) => v.toLowerCase() === d.toLowerCase()) || null;
};

export const validateHeaders = (headers, required) => {
  const normalized = headers.map((h) => h.toLowerCase());
  const missing = required.filter((r) => !normalized.includes(r));
  return { valid: missing.length === 0, missing };
};