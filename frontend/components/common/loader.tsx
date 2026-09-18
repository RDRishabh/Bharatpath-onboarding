import { Spinner } from "./loading/spinner";

interface LoaderProps {
  label?: string;
  size?: number;
  className?: string;
}

/**
 * Backwards-compatible alias for the shared {@link Spinner}. Prefer importing
 * `Spinner` from `@/components/common/loading` in new code.
 */
export function Loader({ label, size = 20, className = "" }: LoaderProps) {
  return <Spinner label={label} size={size} className={className} />;
}
