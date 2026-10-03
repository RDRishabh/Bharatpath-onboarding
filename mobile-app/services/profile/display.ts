/**
 * How a candidate is addressed on Home.
 *
 * The source of truth is `candidate_profiles.full_name` (asked at sign-up,
 * `PUT /candidate/profile/name`). The greeting uses the first word; the
 * avatar uses the first letter of the first word and of the last word.
 * A CV-extracted name is never used here - that would guess identity from
 * a document the candidate has not confirmed as their account name.
 *
 * When no profile name has been set yet, the candidate's sign-in email is
 * the only identity we have. `nameFromEmail` turns the local part of that
 * email into a presentable name (e.g. `priya.deshmukh@…` → `Priya Deshmukh`)
 * so the header is never blank while the real name is still being filled in.
 */

export function greetingFirstName(
  fullName: string | null | undefined,
): string | null {
  const first = tokens(fullName)[0];
  return first ?? null;
}

export function initialsFromName(fullName: string | null | undefined): string {
  const parts = tokens(fullName);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first}${last}`.toUpperCase();
}

/** IST calendar date, matching the product's India-facing copy. */
export function formatHomeDate(now: Date = new Date()): string {
  return now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

function tokens(fullName: string | null | undefined): string[] {
  return (fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
}

/**
 * Turn the local part of an email into a presentable display name.
 *
 * `priya.deshmukh@example.com` → `Priya Deshmukh`
 * `priya_deshmukh@example.com` → `Priya Deshmukh`
 * `priya123@example.com`       → `Priya123`
 *
 * Returns `null` for an empty or malformed email so the caller can keep its
 * existing fallback rather than showing a blank.
 */
export function nameFromEmail(email: string | null | undefined): string | null {
  const local = (email ?? '').trim().split('@')[0];
  if (!local) return null;

  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return null;

  return cleaned
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
