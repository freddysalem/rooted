import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/// True when the person has asked the system to reduce motion. Ambient animation - the
/// sway, the bobbing drop - should stop; feedback animation can stay but shorten.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReduce(value); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
