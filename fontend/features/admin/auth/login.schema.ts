export interface AdminLoginValues { email: string; password: string; }
export function validateAdminLogin(values: AdminLoginValues) {
  const errors: Partial<Record<keyof AdminLoginValues, string>> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid BharatPath operator email.";
  if (values.password.length < 6) errors.password = "Password must be at least 6 characters.";
  return errors;
}
