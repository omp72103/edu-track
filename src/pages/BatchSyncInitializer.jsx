import { useEffect } from 'react';
import { refreshBatches } from '../components/utils/useBatches';

// This component initializes the global batch refresh mechanism
export default function BatchSyncInitializer() {
  useEffect(() => {
    // Expose refresh function globally for legacy components
    if (typeof window !== 'undefined') {
      window.refreshBatches = refreshBatches;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.refreshBatches;
      }
    };
  }, []);

  return null;
}