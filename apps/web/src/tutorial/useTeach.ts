import { useEffect } from 'preact/hooks';
import { clear, teach } from './coach';

/** Ask the coach for these lessons while the screen is up, and withdraw them when it goes. */
export function useTeach(ids: readonly string[], scope: string): void {
  useEffect(() => {
    teach(ids, scope);
    return () => clear(scope);
    // The lessons a screen gives do not change while it is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
}
