/**
 * A candidate name typed at sign-up whose save did not succeed.
 *
 * Its own module, with no imports, so the writer (`services/api/auth`) and
 * the reader (`services/profile/name`) do not have to import each other.
 */

let unsavedName: string | null = null;

export function rememberUnsavedName(fullName: string | null | undefined): void {
  const trimmed = fullName?.trim();
  unsavedName = trimmed ? trimmed : null;
}

export function takeUnsavedName(): string | null {
  return unsavedName;
}

export function clearUnsavedName(): void {
  unsavedName = null;
}
