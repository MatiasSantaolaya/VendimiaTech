export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

/** Demo is the memory store. A real session needs a database and must not carry plane_demo. */
export function isDemoMode(demoCookie: string | null | undefined) {
  if (!hasDatabase()) return true;
  return demoCookie === "1";
}
