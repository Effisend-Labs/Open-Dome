import { useCallback, useRef, useState } from 'react';
import {
  buildItineraryForEvent,
  isItineraryFollowUpIntent,
} from 'opendome/src/planner';
import { quoteItineraryProposal } from 'opendome/src/quote';
import { adoptCouncilCandidate, toggleProposalStop } from 'opendome/src/dayPlannerAgents';
import { isPlanningIntent } from 'opendome/src/itinerary';
import {
  COUNCIL_PHASES,
  initialCouncilAgents,
  playCouncilDeliberation,
} from './councilDrama';
import {
  FULFILL_PHASES,
  buildVenueHolds,
  isConfirmBookingIntent,
  playFulfillmentSequence,
} from './fulfillmentDrama';
import { PLAN_DAY_PROMPT } from './PlanDayButton';
import { bookingIntroLine, councilIntroLine } from './dayPlanCopy';
import { usePlannerSession } from './usePlannerSession';
import { askDomeConsultant, checkoutDayPlan } from './plannerCheckout';
import { evmAddressFromToken } from './jwtProfile';

function uid(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useDomeChat({ token } = {}) {
  const { session, runPlannerTurn, shouldHandleLocally, patchSession } = usePlannerSession();
  const [conversation, setConversation] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sheetProposal, setSheetProposal] = useState(null);
  const [paymentNetwork, setPaymentNetwork] = useState('BASE');
  const fulfillLockRef = useRef(false);

  const append = useCallback((msgs) => {
    const list = Array.isArray(msgs) ? msgs : [msgs];
    setConversation((prev) => [...prev, ...list]);
  }, []);

  const runLocalPlanner = useCallback((text) => {
    const result = runPlannerTurn(text, {});
    if (result?.messages?.length) append(result.messages);
    return result;
  }, [append, runPlannerTurn]);

  const handlePlanDay = useCallback(async (userTextArg) => {
    if (isTyping) return;
    const userText =
      typeof userTextArg === 'string' && userTextArg.trim()
        ? userTextArg.trim()
        : PLAN_DAY_PROMPT;
    const event = session?.selectedEvent || session?.lastEventsList?.[0];
    if (!event) {
      append({ id: uid('u'), role: 'user', content: userText });
      runLocalPlanner(userText);
      return;
    }

    const councilId = uid('council-');
    append([
      { id: uid('u'), role: 'user', content: userText },
      {
        id: uid('a'),
        role: 'agent',
        content: councilIntroLine(),
        model: 'Gemini council',
      },
      {
        id: councilId,
        role: 'agent',
        type: 'council',
        model: 'Gemini council',
        content: 'Spinning up the agent council…',
        phase: COUNCIL_PHASES.ANCHOR,
        agents: initialCouncilAgents(),
        winner: null,
        note: 'Preparing Anchor, Scout, Schedule, Critic…',
      },
    ]);
    setIsTyping(true);

    const patchCouncil = (patch) => {
      setConversation((prev) => prev.map((m) => (m.id === councilId ? { ...m, ...patch } : m)));
    };

    try {
      const proposal = buildItineraryForEvent(event, { userText });
      if (!proposal) throw new Error('Council could not build a day plan.');
      patchSession({ selectedEvent: event, proposal, quote: null });

      await playCouncilDeliberation(proposal, {
        onUpdate: ({ phase, agents, winner, note }) => {
          patchCouncil({ phase, agents, winner, note, content: note || 'Deliberating…' });
        },
      });

      const quote = quoteItineraryProposal(proposal);
      patchSession({
        selectedEvent: event,
        proposal,
        quote,
        awaitingConfirm: true,
        councilMessageId: councilId,
      });
      patchCouncil({
        phase: COUNCIL_PHASES.AWAITING_CONFIRM,
        proposal,
        quote,
        chosenId: proposal.council?.chosenId || proposal.council?.winner?.id,
        note: `Winner: ${proposal.council?.winner?.name || 'agent'}. Tap another tile to change. OK books ${quote.totalLabel}.`,
      });
    } catch (err) {
      append({ id: uid('e'), role: 'system', content: err?.message || 'Council run failed.' });
      patchCouncil({ phase: COUNCIL_PHASES.DONE, note: 'Stopped — see error above.' });
    } finally {
      setIsTyping(false);
    }
  }, [append, isTyping, patchSession, runLocalPlanner, session]);

  const handlePickCouncilAgent = useCallback((agentId) => {
    if (!session?.awaitingConfirm || isTyping || !agentId) return;
    const next = adoptCouncilCandidate(session.proposal, agentId);
    if (!next?.stops?.length) return;
    const quote = quoteItineraryProposal(next);
    const winnerName = next.council?.winner?.name;
    const chosenName = next.council?.candidates?.find((c) => c.id === agentId)?.name || winnerName;
    const overridden = agentId !== next.council?.winner?.id;
    patchSession({ proposal: next, quote, awaitingConfirm: true });
    setSheetProposal((prev) => (prev ? next : prev));
    const councilId = session?.councilMessageId;
    if (!councilId) return;
    setConversation((prev) =>
      prev.map((m) =>
        m.id === councilId
          ? {
              ...m,
              proposal: next,
              quote,
              chosenId: agentId,
              note: overridden
                ? `Winner stays ${winnerName}. You chose ${chosenName}. OK books ${quote.totalLabel}.`
                : `Winner: ${winnerName}. OK books ${quote.totalLabel}.`,
            }
          : m,
      ),
    );
  }, [isTyping, patchSession, session]);

  const handleUpdatePlan = useCallback((nextProposal, nextQuote) => {
    if (!nextProposal || isTyping) return;
    const quote = nextQuote || quoteItineraryProposal(nextProposal);
    if (!quote) return;
    patchSession({
      proposal: nextProposal,
      quote,
      awaitingConfirm: session?.awaitingConfirm ?? true,
    });
    setSheetProposal(null);
    const councilId = session?.councilMessageId;
    if (!councilId) return;
    setConversation((prev) =>
      prev.map((m) =>
        m.id === councilId
          ? {
              ...m,
              proposal: nextProposal,
              quote,
              note: `Updated plan. OK books ${quote.totalLabel}.`,
            }
          : m,
      ),
    );
  }, [isTyping, patchSession, session]);

  const handleToggleStop = useCallback((stopIndex) => {
    if (!session?.proposal || isTyping) return;
    const { proposal: next, changed } = toggleProposalStop(session.proposal, stopIndex);
    if (!changed) return;
    const quote = quoteItineraryProposal(next);
    patchSession({ proposal: next, quote, awaitingConfirm: session.awaitingConfirm });
    setSheetProposal(next);
    const councilId = session?.councilMessageId;
    if (!councilId || !quote) return;
    setConversation((prev) =>
      prev.map((m) =>
        m.id === councilId
          ? {
              ...m,
              proposal: next,
              quote,
              note: `Customized plan. OK books ${quote.totalLabel}.`,
            }
          : m,
      ),
    );
  }, [isTyping, patchSession, session]);

  const runCheckout = useCallback(async (quote) => {
    const toAddress = evmAddressFromToken(token);
    if (!toAddress) {
      throw new Error('Sign in on Profile so we can mint passes to your wallet.');
    }
    const data = await checkoutDayPlan({
      quote,
      token,
      toAddress,
      paymentNetwork,
    });
    const confirmation = data?.confirmation;
    if (!confirmation) throw new Error('Checkout completed but no confirmation returned.');
    append({
      id: uid('ok'),
      role: 'agent',
      type: 'confirmation',
      content: 'Payment signed. Your slots are reserved and NFTs are in your wallet.',
      confirmation,
      model: 'Gemini council',
    });
    return true;
  }, [append, paymentNetwork, token]);

  const runFulfillment = useCallback(async ({ userText, quote: quoteArg } = {}) => {
    if (isTyping || fulfillLockRef.current) return;
    const proposal = session?.proposal;
    const quote =
      (proposal ? quoteItineraryProposal(proposal) : null) ||
      quoteArg ||
      session?.quote;
    if (!quote || !proposal) return;
    if (!token) {
      append({ id: uid('e'), role: 'system', content: 'Sign in on Profile to book and mint passes.' });
      return;
    }

    fulfillLockRef.current = true;
    const councilId = session?.councilMessageId;
    const fulfillId = uid('fulfill-');
    const holds = buildVenueHolds(proposal);
    if (userText) append({ id: uid('u'), role: 'user', content: userText });
    patchSession({ awaitingConfirm: false });
    const chosenId = proposal.council?.chosenId || proposal.council?.winner?.id;
    const chosenName =
      proposal.council?.candidates?.find((c) => c.id === chosenId)?.name ||
      proposal.council?.winner?.name;
    append([
      {
        id: uid('a'),
        role: 'agent',
        content: bookingIntroLine(chosenName),
        model: 'Gemini council',
      },
      {
        id: fulfillId,
        role: 'agent',
        type: 'fulfillment',
        model: 'Gemini council',
        content: 'Reserving venues…',
        phase: FULFILL_PHASES.RESERVING,
        venues: holds,
        note: 'You confirmed. Holding each place…',
      },
    ]);
    setIsTyping(true);

    const patchFulfill = (patch) => {
      setConversation((prev) => prev.map((m) => (m.id === fulfillId ? { ...m, ...patch } : m)));
    };
    const patchCouncil = (patch) => {
      if (!councilId) return;
      setConversation((prev) => prev.map((m) => (m.id === councilId ? { ...m, ...patch } : m)));
    };

    try {
      patchCouncil({ phase: COUNCIL_PHASES.PAYING, note: 'You confirmed. Reserving venues, then one payment.' });
      await playFulfillmentSequence(holds, {
        totalLabel: quote.totalLabel,
        onUpdate: ({ phase, venues, note, payingLabel }) => {
          patchFulfill({ phase, venues, note, payingLabel, content: note || 'Booking…' });
        },
      });
      const paid = await runCheckout(quote).catch((err) => {
        append({ id: uid('e'), role: 'system', content: err.message });
        return false;
      });
      const venues = holds.map((v) => ({ ...v, status: paid ? 'paid' : 'confirmed' }));
      patchFulfill({
        phase: FULFILL_PHASES.DONE,
        venues,
        note: paid
          ? 'Reserved, confirmed, and paid in one settlement.'
          : 'Venues were held — payment did not finish.',
        payingLabel: paid
          ? `Settled ${quote.totalLabel} · passes minting`
          : `Held ${quote.totalLabel} — payment failed`,
      });
      patchCouncil({
        phase: COUNCIL_PHASES.DONE,
        note: paid ? 'Booked after your OK. Passes are in Tickets.' : 'You confirmed — payment hit a snag.',
      });
    } catch (err) {
      append({ id: uid('e'), role: 'system', content: err?.message || 'Booking run failed.' });
      patchFulfill({ phase: FULFILL_PHASES.DONE, note: 'Stopped — see error above.' });
      patchCouncil({ phase: COUNCIL_PHASES.DONE, note: 'Stopped after your OK.' });
    } finally {
      fulfillLockRef.current = false;
      setIsTyping(false);
    }
  }, [append, isTyping, patchSession, runCheckout, session, token]);

  const sendGemini = useCallback(async (text) => {
    append({ id: uid('u'), role: 'user', content: text });
    setIsTyping(true);
    try {
      const history = conversation
        .filter((m) => m.role === 'user' || m.role === 'agent')
        .map((m) => ({ role: m.role, content: m.content }))
        .concat({ role: 'user', content: text });
      const data = await askDomeConsultant({ text, token, history });
      append({
        id: uid('a'),
        role: 'agent',
        content: data.response || '',
        model: data.modelLabel || 'Gemini',
      });
    } catch (err) {
      append({ id: uid('e'), role: 'system', content: err.message || 'Agent failed' });
    } finally {
      setIsTyping(false);
    }
  }, [append, conversation, token]);

  const send = useCallback((override) => {
    const text = String(override ?? prompt).trim();
    if (!text || isTyping) return;
    setPrompt('');

    if (session?.awaitingConfirm && isConfirmBookingIntent(text)) {
      runFulfillment({ userText: text });
      return;
    }

    if (shouldHandleLocally(text)) {
      const planEvent = session?.selectedEvent || session?.lastEventsList?.[0] || null;
      if (
        planEvent &&
        !session?.awaitingConfirm &&
        (isPlanningIntent(text) || isItineraryFollowUpIntent(text, session))
      ) {
        handlePlanDay(text);
        return;
      }
      append({ id: uid('u'), role: 'user', content: text });
      runLocalPlanner(text);
      return;
    }

    sendGemini(text);
  }, [
    append,
    handlePlanDay,
    isTyping,
    prompt,
    runFulfillment,
    runLocalPlanner,
    sendGemini,
    session,
    shouldHandleLocally,
  ]);

  const selectEvent = useCallback((event, index) => {
    if (isTyping || !event) return;
    const label = String(index + 1);
    append({ id: uid('u'), role: 'user', content: label });
    runLocalPlanner(label);
  }, [append, isTyping, runLocalPlanner]);

  return {
    conversation,
    prompt,
    setPrompt,
    isTyping,
    session,
    sheetProposal,
    setSheetProposal,
    paymentNetwork,
    setPaymentNetwork,
    send,
    handlePlanDay,
    handlePickCouncilAgent,
    handleToggleStop,
    handleUpdatePlan,
    runFulfillment,
    selectEvent,
  };
}
