import { useMemo } from 'react';
import { buildDemoItineraryProposal } from './itineraryService';

export function useItineraryProposal() {
  const proposal = useMemo(() => buildDemoItineraryProposal(), []);
  return { proposal, isLoading: false, error: null };
}
