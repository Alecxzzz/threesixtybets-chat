import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une clases condicionales resolviendo conflictos de Tailwind.
 * Requerido por los componentes de shadcn/ui.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
