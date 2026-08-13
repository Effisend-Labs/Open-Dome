import { useState, useCallback, useRef, useEffect } from 'react';
import { createEmptySession } from 'opendome/src/planner';
import { routeAgentTurn, shouldUsePlanner } from './routeAgentTurn';

export function useAgentSession() {
  const [session, setSession] = useState(createEmptySession);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const runPlannerTurn = useCallback((text, options) => {
    const result = routeAgentTurn(text, sessionRef.current, options);
    if (!result) return null;
    const next = { ...sessionRef.current, ...result.sessionPatch };
    sessionRef.current = next;
    setSession(next);
    return result;
  }, []);

  const shouldHandleLocally = useCallback(
    (text) => shouldUsePlanner(text, sessionRef.current),
    [],
  );

  const resetSession = useCallback(() => {
    const empty = createEmptySession();
    sessionRef.current = empty;
    setSession(empty);
  }, []);

  const patchSession = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    const next = { ...sessionRef.current, ...patch };
    sessionRef.current = next;
    setSession(next);
  }, []);

  return {
    session,
    runPlannerTurn,
    shouldHandleLocally,
    resetSession,
    patchSession,
  };
}
