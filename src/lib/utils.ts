import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeFieldKey(value: string): string {
  // Remove any characters that are not alphanumeric or underscore
  return value.replace(/[^a-zA-Z0-9_]/g, '')
}