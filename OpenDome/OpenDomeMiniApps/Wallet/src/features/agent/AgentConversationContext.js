import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useAgentSession } from './useAgentSession';

const AgentConversationContext = createContext(null);

/**
 * Keeps Agent chat + planner session alive across Wallet tab switches.
 * AgentView remounts on tab change; this provider stays mounted in App.
 */
export function AgentConversationProvider({ children }) {
  const {
    session,
    runPlannerTurn,
    shouldHandleLocally,
    resetSession,
    patchSession,
  } = useAgentSession();
  const [conversation, setConversation] = useState([]);
  const [selectedModel, setSelectedModel] = useState('fast');
  const [sheetProposal, setSheetProposal] = useState(null);

  const appendMessages = useCallback((msgs) => {
    const list = Array.isArray(msgs) ? msgs : [msgs];
    setConversation((prev) => [...prev, ...list]);
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setSheetProposal(null);
    resetSession();
  }, [resetSession]);

  const value = useMemo(
    () => ({
      conversation,
      setConversation,
      appendMessages,
      clearConversation,
      selectedModel,
      setSelectedModel,
      sheetProposal,
      setSheetProposal,
      session,
      runPlannerTurn,
      shouldHandleLocally,
      resetSession,
      patchSession,
    }),
    [
      conversation,
      appendMessages,
      clearConversation,
      selectedModel,
      sheetProposal,
      session,
      runPlannerTurn,
      shouldHandleLocally,
      resetSession,
      patchSession,
    ],
  );

  return (
    <AgentConversationContext.Provider value={value}>
      {children}
    </AgentConversationContext.Provider>
  );
}

export function useAgentConversation() {
  const ctx = useContext(AgentConversationContext);
  if (!ctx) {
    throw new Error('useAgentConversation must be used within AgentConversationProvider');
  }
  return ctx;
}
