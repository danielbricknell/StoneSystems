export function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function dateOrNull(formData: FormData, key: string): Date | null {
  const value = str(formData, key);
  return value ? new Date(value) : null;
}

export function numberOrNull(formData: FormData, key: string): number | null {
  const value = str(formData, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
