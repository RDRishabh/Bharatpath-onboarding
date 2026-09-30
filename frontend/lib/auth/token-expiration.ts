export function getTokenExpiration(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = Uint8Array.from(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
      (character) => character.charCodeAt(0),
    );
    const claims: unknown = JSON.parse(
      new TextDecoder().decode(decoded),
    );

    if (
      !claims ||
      typeof claims !== "object" ||
      !("exp" in claims) ||
      typeof claims.exp !== "number" ||
      !Number.isFinite(claims.exp)
    ) {
      return null;
    }

    return claims.exp;
  } catch {
    return null;
  }
}
