import bcrypt from "bcryptjs";

export const BCRYPT_FULL_RE = /^\$2[aby]\$(?:0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/;

export function isBcryptPassword(stored: string): boolean {
  return BCRYPT_FULL_RE.test(String(stored || ""));
}

export async function verifyPassword(input: string, stored: string): Promise<boolean> {
  const plainInput = String(input || "");
  const storedValue = String(stored || "");

  if (!plainInput || !storedValue || !isBcryptPassword(storedValue)) {
    return false;
  }

  try {
    return await bcrypt.compare(plainInput, storedValue);
  } catch {
    return false;
  }
}
