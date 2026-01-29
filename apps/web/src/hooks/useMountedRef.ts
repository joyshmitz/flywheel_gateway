import { useEffect, useRef } from "react";

/**
 * Returns a ref that tracks whether the component is mounted.
 * Use this to guard setState calls in async callbacks to prevent
 * "Can't perform a React state update on an unmounted component" warnings.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMounted = useMountedRef();
 *
 *   const handleAsync = async () => {
 *     const result = await fetchSomething();
 *     if (!isMounted.current) return;
 *     setState(result);
 *   };
 * }
 * ```
 */
export function useMountedRef(): React.MutableRefObject<boolean> {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}
