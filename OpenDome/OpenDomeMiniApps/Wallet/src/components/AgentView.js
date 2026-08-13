import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Animated, Linking } from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';
import { USE_NATIVE_DRIVER } from '../utils/styleCompat';
import { ItineraryProposalCard } from '../features/itinerary/ItineraryProposalCard';
import { ItineraryProposalSheet } from '../features/itinerary/ItineraryProposalSheet';
import { useAgentConversation } from '../features/agent/AgentConversationContext';
import { EventsListCard } from '../features/agent/EventsListCard';
import { QuoteCard } from '../features/agent/QuoteCard';
import { ConfirmationCard } from '../features/agent/ConfirmationCard';
import { PlanDayButton, PLAN_DAY_PROMPT } from '../features/agent/PlanDayButton';
import { SelectedEventCard } from '../features/agent/SelectedEventCard';
import { CouncilRunCard } from '../features/agent/CouncilRunCard';
import { FulfillmentRunCard } from '../features/agent/FulfillmentRunCard';
import {
  COUNCIL_PHASES,
  initialCouncilAgents,
  playCouncilDeliberation,
} from '../features/agent/councilDrama';
import {
  FULFILL_PHASES,
  buildVenueHolds,
  isConfirmBookingIntent,
  playFulfillmentSequence,
} from '../features/agent/fulfillmentDrama';
import {
  getAgentApiUrl,
  getCheckoutApiUrl,
  SKIP_X402_PAYMENT,
  TEST_QUOTE_PRICING,
  TEST_QUOTE_UNIT_USD,
  GEMINI_CHAT_MODELS,
  resolveGeminiChatModel,
} from '../config/agentSettings';
import { formatQuotePriceForX402, quoteItineraryProposal } from 'opendome/src/quote';
import { AuthRequiredPanel } from '../features/auth/AuthRequiredPanel';
import { PaymentIntentSheet } from '../features/agent/PaymentIntentSheet';
import { buildItineraryForEvent, isItineraryFollowUpIntent } from 'opendome/src/planner';
import { adoptCouncilCandidate } from 'opendome/src/dayPlannerAgents';
import { isPlanningIntent } from 'opendome/src/itinerary';

// ── Pulsing Dot Component ───────────────────────────────────────────────────────
// Three dots that pulse sequentially to indicate the agent is thinking.
const PulsingDots = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
    const a1 = createPulse(dot1, 0);
    const a2 = createPulse(dot2, 200);
    const a3 = createPulse(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim) => ({
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: color,
    opacity: anim,
    marginHorizontal: 2,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
};

// ── Animated Message Wrapper ────────────────────────────────────────────────────
// Each message fades in + slides up 8px over 200ms.
const AnimatedMessage = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

// ── Model Config ────────────────────────────────────────────────────────────────
const MODELS = GEMINI_CHAT_MODELS;

const QUICK_ACTIONS = [
  {
    id: 'list-tokyo-dome',
    label: 'What are the next Tokyo Dome events?',
    prompt: 'What are the next Tokyo Dome events?',
  },
  {
    id: 'plan-show-day',
    label: 'Plan a full TDC day around a show',
    prompt: PLAN_DAY_PROMPT,
  },
];

function formatItemUsd(amount) {
  if (amount > 0 && amount < 0.01) return amount.toFixed(4);
  return amount.toFixed(2);
}

export default function AgentView({ tokens, theme, isDark: isDarkProp, username, t, isAuthorized, onGoToAccount }) {
  // Prefer App-computed isDark; never force a white card against dark tokens.
  const isDark = typeof isDarkProp === 'boolean'
    ? isDarkProp
    : !['light', 'pastel', 'alpine'].includes(String(theme || 'dark').toLowerCase());
  const { Agent, user } = useOpenDome();
  const {
    conversation,
    setConversation,
    runPlannerTurn,
    shouldHandleLocally,
    selectedModel,
    setSelectedModel,
    sheetProposal,
    setSheetProposal,
    session,
    patchSession,
  } = useAgentConversation();
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(48);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(null);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState('base');
  const scrollViewRef = useRef(null);
  const fulfillLockRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `textarea::-webkit-scrollbar { display: none; }`;
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, []);

  // Scroll only when a new bubble is added — not when the council card updates in place.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [conversation.length]);

  const activeModelLabel = resolveGeminiChatModel(selectedModel).label;

  const runLocalPlanner = useCallback(async (text) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const result = runPlannerTurn(text, { t });
    if (result?.messages?.length) {
      setConversation((prev) => [...prev, ...result.messages]);
    }
    setIsTyping(false);
    return result;
  }, [runPlannerTurn, t]);

  const handleSend = () => {
    const text = prompt.trim();
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
      const userMsg = { id: Date.now().toString(), role: 'user', content: text };
      setConversation((prev) => [...prev, userMsg]);
      runLocalPlanner(text);
      return;
    }

    if (!isAuthorized) {
      onGoToAccount?.();
      return;
    }

    const activeModel = resolveGeminiChatModel(selectedModel);
    const intent = { text, model: activeModel };
    if (SKIP_X402_PAYMENT) {
      executeSend(intent);
      return;
    }
    setPendingIntent(intent);
  };

  const handleQuickAction = (action) => {
    if (isTyping) return;
    if (action.id === 'plan-show-day') {
      const planEvent = session?.selectedEvent || session?.lastEventsList?.[0] || null;
      if (planEvent) {
        handlePlanDay(action.prompt || PLAN_DAY_PROMPT);
        return;
      }
    }
    const userMsg = { id: Date.now().toString(), role: 'user', content: action.prompt };
    setConversation((prev) => [...prev, userMsg]);
    runLocalPlanner(action.prompt);
  };

  const handleSelectEvent = (event, index) => {
    if (isTyping || !event) return;
    const label = String(index + 1);
    const userMsg = { id: Date.now().toString(), role: 'user', content: label };
    setConversation((prev) => [...prev, userMsg]);
    runLocalPlanner(label);
  };

  const handlePlanDay = async (userTextArg) => {
    if (isTyping) return;

    const userText =
      typeof userTextArg === 'string' && userTextArg.trim()
        ? userTextArg.trim()
        : PLAN_DAY_PROMPT;
    const event = session?.selectedEvent || session?.lastEventsList?.[0];
    if (!event) {
      const userMsg = { id: Date.now().toString(), role: 'user', content: userText };
      setConversation((prev) => [...prev, userMsg]);
      runLocalPlanner(userText);
      return;
    }

    if (!isAuthorized) {
      onGoToAccount?.();
      return;
    }

    const userMsg = { id: Date.now().toString(), role: 'user', content: userText };
    const councilId = `council-${Date.now()}`;
    setConversation((prev) => [
      ...prev,
      userMsg,
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
      setConversation((prev) =>
        prev.map((m) => (m.id === councilId ? { ...m, ...patch } : m)),
      );
    };

    try {
      // Compute full council result first (deterministic), then play it visibly
      const proposal = buildItineraryForEvent(event, { userText });
      if (!proposal) throw new Error('Council could not build a day plan.');

      patchSession?.({
        selectedEvent: event,
        proposal,
        quote: null,
      });

      await playCouncilDeliberation(proposal, {
        onUpdate: ({ phase, agents, winner, note }) => {
          patchCouncil({ phase, agents, winner, note, content: note || 'Deliberating…' });
        },
      });

      const quote = quoteItineraryProposal(proposal, {
        ...(TEST_QUOTE_PRICING ? { testUnitPriceUsd: TEST_QUOTE_UNIT_USD } : {}),
      });

      patchSession?.({
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
      setConversation((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          content: err?.message || 'Council run failed.',
        },
      ]);
      patchCouncil({
        phase: COUNCIL_PHASES.DONE,
        note: 'Stopped — see error above.',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handlePickCouncilAgent = (agentId) => {
    if (!session?.awaitingConfirm || isTyping || !agentId) return;
    const next = adoptCouncilCandidate(session.proposal, agentId);
    if (!next?.stops?.length) return;

    const quote = quoteItineraryProposal(next, {
      ...(TEST_QUOTE_PRICING ? { testUnitPriceUsd: TEST_QUOTE_UNIT_USD } : {}),
    });
    const winnerName = next.council?.winner?.name;
    const chosenName =
      next.council?.candidates?.find((c) => c.id === agentId)?.name || winnerName;
    const overridden = agentId !== next.council?.winner?.id;

    patchSession?.({ proposal: next, quote, awaitingConfirm: true });

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
  };

  const runFulfillment = async ({ userText, quote: quoteArg } = {}) => {
    if (isTyping || fulfillLockRef.current) return;
    const quote = quoteArg || session?.quote;
    const proposal = session?.proposal;
    if (!quote || !proposal) return;

    if (!isAuthorized) {
      onGoToAccount?.();
      return;
    }
    fulfillLockRef.current = true;

    const councilId = session?.councilMessageId;
    const fulfillId = `fulfill-${Date.now()}`;
    const holds = buildVenueHolds(proposal);

    if (userText) {
      setConversation((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'user', content: userText },
      ]);
    }

    patchSession?.({ awaitingConfirm: false });
    setConversation((prev) => [
      ...prev,
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
      setConversation((prev) =>
        prev.map((m) => (m.id === fulfillId ? { ...m, ...patch } : m)),
      );
    };
    const patchCouncil = (patch) => {
      if (!councilId) return;
      setConversation((prev) =>
        prev.map((m) => (m.id === councilId ? { ...m, ...patch } : m)),
      );
    };

    try {
      patchCouncil({
        phase: COUNCIL_PHASES.PAYING,
        note: 'You confirmed. Reserving venues, then one payment.',
      });

      await playFulfillmentSequence(holds, {
        totalLabel: quote.totalLabel,
        onUpdate: ({ phase, venues, note, payingLabel }) => {
          patchFulfill({ phase, venues, note, payingLabel, content: note || 'Booking…' });
        },
      });

      const paid = await runCheckout(quote, { manageTyping: false });
      const venues = (holds || []).map((v) => ({ ...v, status: paid ? 'paid' : 'confirmed' }));

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
        note: paid
          ? 'Booked after your OK. Passes are in the wallet.'
          : 'You confirmed the plan — payment hit a snag.',
      });
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          content: err?.message || 'Booking run failed.',
        },
      ]);
      patchFulfill({
        phase: FULFILL_PHASES.DONE,
        note: 'Stopped — see error above.',
      });
      patchCouncil({
        phase: COUNCIL_PHASES.DONE,
        note: 'Stopped after your OK — see error above.',
      });
    } finally {
      fulfillLockRef.current = false;
      setIsTyping(false);
    }
  };

  const runCheckout = async (quote, { manageTyping = true } = {}) => {
    if (!quote) return false;
    if (!isAuthorized) {
      setPendingCheckout(null);
      onGoToAccount?.();
      return false;
    }
    setPendingCheckout(null);
    if (manageTyping) setIsTyping(true);

    try {
      const toAddress = user?.evmAddress || user?.evm?.address || user?.address || null;
      const res = await Agent.pay(getCheckoutApiUrl(), formatQuotePriceForX402(quote.totalUsd), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment-network': selectedNetwork,
        },
        body: JSON.stringify({ quote, toAddress }),
      });

      const payload = res?.data || res;
      const confirmation = payload?.confirmation || res?.confirmation;
      if (!confirmation) {
        throw new Error('Checkout completed but no confirmation returned.');
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        type: 'confirmation',
        content: t?.agent?.confirmReply || 'Payment signed. Your slots are reserved and NFTs are in your wallet.',
        confirmation,
        model: 'Gemini council',
      };
      setConversation((prev) => [...prev, aiMsg]);
      return true;
    } catch (err) {
      const errMsg = { id: (Date.now() + 1).toString(), role: 'system', content: `${err.message}` };
      setConversation((prev) => [...prev, errMsg]);
      return false;
    } finally {
      if (manageTyping) setIsTyping(false);
    }
  };

  const executeCheckout = () => runCheckout(pendingCheckout);

  const executeSend = async (intentArg) => {
    const intent = intentArg || pendingIntent;
    if (!intent) return;
    if (!isAuthorized) {
      setPendingIntent(null);
      onGoToAccount?.();
      return;
    }
    const { text, model } = intent;

    setPrompt('');
    setPendingIntent(null);

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setConversation(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await Agent.pay(getAgentApiUrl(), model.cost, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment-network': selectedNetwork,
        },
        body: JSON.stringify({ prompt: text, modelId: model.id }),
      });
      const payload = res?.data || res;
      const responseText = payload?.response || res.response || JSON.stringify(res);
      const paymentTxHash = res.paymentTxHash || payload?.paymentTxHash || null;
      const explorerUrl =
        res.explorerUrl ||
        payload?.explorerUrl ||
        (paymentTxHash ? `https://basescan.org/tx/${paymentTxHash}` : null);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: responseText,
        cost: SKIP_X402_PAYMENT ? null : model.cost,
        model: payload?.modelLabel || model.label,
        paymentTxHash: SKIP_X402_PAYMENT ? null : paymentTxHash,
        explorerUrl: SKIP_X402_PAYMENT ? null : explorerUrl,
      };
      setConversation(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = { id: (Date.now() + 1).toString(), role: 'system', content: `${err.message}` };
      setConversation(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendButtonActive = prompt.trim().length > 0 && !isTyping;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG, overflow: 'hidden' }}>

      {/* ── Pending Intent Overlay ──────────────────────────────────────── */}
      {pendingIntent && !SKIP_X402_PAYMENT ? (
        <PaymentIntentSheet
          tokens={tokens}
          isDark={isDark}
          amountLabel={`$${pendingIntent.model.cost}`}
          targetLabel="OpenDome Agent"
          selectedNetwork={selectedNetwork}
          onSelectNetwork={setSelectedNetwork}
          onConfirm={() => executeSend()}
          onCancel={() => setPendingIntent(null)}
        />
      ) : null}

      {/* ── Checkout Overlay ───────────────────────────────────────────── */}
      {pendingCheckout && !SKIP_X402_PAYMENT ? (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(10,10,10,0.45)',
          zIndex: 110,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {})
        }}>
          {!isAuthorized ? (
            <View style={{
              width: '100%', maxWidth: 360,
              backgroundColor: tokens.SURFACE,
              borderRadius: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.BORDER,
              overflow: 'hidden',
            }}>
              <AuthRequiredPanel
                tokens={tokens}
                t={t}
                compact
                description={t?.authRequired?.checkout}
                onSignIn={() => {
                  setPendingCheckout(null);
                  onGoToAccount?.();
                }}
              />
              <TouchableOpacity onPress={() => setPendingCheckout(null)} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={{
            width: '100%', maxWidth: 360,
            backgroundColor: tokens.SURFACE,
            borderRadius: 16,
            padding: 22,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.BORDER,
          }}>
            <Text style={{ fontFamily: tokens.font.mono, color: tokens.MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1.4, marginBottom: 16 }}>
              {t?.agent?.checkoutTitle || 'Sign to confirm'}
            </Text>
            <Text style={{ fontFamily: tokens.font.mono, fontSize: 36, fontWeight: '500', color: tokens.FG, letterSpacing: -1.2, marginBottom: 6 }}>
              {pendingCheckout.totalLabel}
            </Text>
            <Text style={{ fontFamily: tokens.font.primary, fontSize: 14, color: tokens.FG_SECONDARY, marginBottom: 20 }}>
              USDC · tickets + reservations + NFT mint
            </Text>
            {pendingCheckout.lineItems.slice(0, 4).map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ flex: 1, color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontSize: 13 }} numberOfLines={1}>{item.title}</Text>
                <Text style={{ color: tokens.FG, fontFamily: tokens.font.mono, fontSize: 13 }}>${formatItemUsd(item.totalUsd)}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={executeCheckout} activeOpacity={0.85} style={{ marginTop: 20, backgroundColor: tokens.ACCENT, paddingVertical: 14, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontFamily: tokens.font.primary, fontWeight: '600', fontSize: 15 }}>{t?.agent?.signAndPay || 'Sign & pay'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingCheckout(null)} style={{ marginTop: 4, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      ) : null}

      {/* ── Conversation Area ─────────────────────────────────────────── */}
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
      >
        {!isAuthorized ? (
          <View style={{
            marginHorizontal: 16,
            marginTop: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.BORDER,
            backgroundColor: tokens.SURFACE,
          }}>
            <Text style={{ color: tokens.FG_SECONDARY, fontSize: 13, fontFamily: tokens.font.primary, lineHeight: 18, textAlign: 'center' }}>
              {t?.authRequired?.description}
            </Text>
            {onGoToAccount ? (
              <TouchableOpacity onPress={onGoToAccount} activeOpacity={0.8} style={{ marginTop: 8, alignItems: 'center' }}>
                <Text style={{ color: tokens.ACCENT, fontSize: 13, fontWeight: '600', fontFamily: tokens.font.primary }}>
                  {t?.authRequired?.cta}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Empty State */}
        {conversation.length === 0 && (
          <View style={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 }}>
            <Text style={{ 
              color: tokens.FG, 
              fontSize: 22, 
              fontWeight: '600', 
              fontFamily: tokens.font.primary, 
              letterSpacing: -0.6,
              marginBottom: 12
            }}>
              What can I help with?
            </Text>
            <Text style={{ 
              color: tokens.MUTED, 
              fontSize: 14, 
              fontFamily: tokens.font.primary, 
              lineHeight: 22,
              letterSpacing: -0.2,
              marginBottom: 20,
            }}>
              {t?.agent?.poweredBy || 'Pick a Gemini model for chat. Day plans run as a four-agent council.'}
            </Text>

            <View style={{ gap: 8 }}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  activeOpacity={0.85}
                  onPress={() => handleQuickAction(action)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: tokens.BORDER,
                    backgroundColor: tokens.SURFACE,
                  }}
                >
                  <Text style={{
                    color: tokens.FG,
                    fontSize: 14,
                    fontFamily: tokens.font.primary,
                    letterSpacing: -0.2,
                  }}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {/* Messages */}
        {conversation.map((msg, idx) => (
          <AnimatedMessage key={msg.id}>
            <View style={{ 
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 20,
              borderBottomWidth: idx !== conversation.length - 1 || isTyping ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: tokens.BORDER,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                {/* Role avatar dot */}
                <View style={{ 
                  width: 6, height: 6, borderRadius: 3, 
                  backgroundColor: msg.role === 'user' ? tokens.ACCENT : msg.role === 'agent' ? tokens.SUCCESS : tokens.DANGER 
                }} />
                <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: tokens.font.mono, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {msg.role === 'user' ? username : msg.role === 'agent' ? 'Agent' : 'System'}
                </Text>
                {msg.role === 'agent' && msg.model && (
                  <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono, opacity: 0.5 }}>
                    · {msg.model}
                  </Text>
                )}
              </View>
              <View style={{
                paddingLeft: msg.role === 'user' ? 16 : 0,
                borderLeftWidth: msg.role === 'user' ? 2 : 0,
                borderLeftColor: msg.role === 'user' ? tokens.BORDER : 'transparent',
              }}>
                {msg.type !== 'council' && msg.type !== 'fulfillment' ? (
                  <Text style={{ 
                    color: msg.role === 'system' ? tokens.DANGER : tokens.FG, 
                    fontSize: 15, 
                    lineHeight: 24, 
                    fontFamily: msg.role === 'system' ? tokens.font.mono : tokens.font.primary,
                    letterSpacing: -0.2
                  }}>
                    {msg.content}
                  </Text>
                ) : null}
              </View>
              {msg.type === 'event_selected' ? (
                <>
                  <SelectedEventCard event={msg.selectedEvent} tokens={tokens} />
                  <PlanDayButton
                    tokens={tokens}
                    disabled={isTyping}
                    onPress={() => handlePlanDay()}
                  />
                </>
              ) : null}
              {msg.type === 'council' ? (
                <CouncilRunCard
                  phase={msg.phase}
                  agents={msg.agents}
                  winner={msg.winner}
                  chosenId={msg.chosenId || session?.proposal?.council?.chosenId}
                  note={msg.note}
                  payingLabel={msg.payingLabel}
                  tokens={tokens}
                  proposal={msg.proposal || session?.proposal}
                  quote={msg.quote || session?.quote}
                  onSelectAgent={handlePickCouncilAgent}
                  confirmDisabled={isTyping}
                  confirmLabel={
                    (msg.quote || session?.quote)?.totalLabel
                      ? `OK — book ${(msg.quote || session?.quote).totalLabel}`
                      : 'OK — book this day'
                  }
                  onConfirm={() => {
                    if (!session?.awaitingConfirm) return;
                    if (!isAuthorized) {
                      onGoToAccount?.();
                      return;
                    }
                    runFulfillment();
                  }}
                />
              ) : null}
              {msg.type === 'fulfillment' ? (
                <FulfillmentRunCard
                  phase={msg.phase}
                  venues={msg.venues}
                  note={msg.note}
                  payingLabel={msg.payingLabel}
                  tokens={tokens}
                  done={msg.phase === FULFILL_PHASES.DONE}
                />
              ) : null}
              {msg.type === 'events' && msg.events ? (
                <EventsListCard
                  events={msg.events}
                  tokens={tokens}
                  placeName={msg.placeName}
                  isCatalogLag={msg.isCatalogLag}
                  onSelect={handleSelectEvent}
                />
              ) : null}
              {msg.type === 'itinerary' && msg.proposal ? (
                <ItineraryProposalCard
                  proposal={msg.proposal}
                  tokens={tokens}
                  t={t}
                  onViewDetails={() => setSheetProposal(msg.proposal)}
                />
              ) : null}
              {msg.type === 'quote' && msg.quote ? (
                <QuoteCard
                  quote={msg.quote}
                  tokens={tokens}
                  t={t}
                  ctaLabel={session?.awaitingConfirm ? 'OK — confirm booking' : (t?.agent?.signAndPay || 'Sign & pay')}
                  onSign={() => {
                    if (!isAuthorized) {
                      onGoToAccount?.();
                      return;
                    }
                    if (session?.awaitingConfirm) {
                      runFulfillment({ userText: 'OK', quote: msg.quote });
                      return;
                    }
                    if (SKIP_X402_PAYMENT) {
                      runCheckout(msg.quote);
                      return;
                    }
                    setPendingCheckout(msg.quote);
                  }}
                />
              ) : null}
              {msg.type === 'confirmation' && msg.confirmation ? (
                <ConfirmationCard confirmation={msg.confirmation} tokens={tokens} t={t} />
              ) : null}
              {/* Transaction Awareness Badge */}
              {msg.role === 'agent' && msg.cost && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: tokens.SUCCESS }} />
                    <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono, letterSpacing: 0.3 }}>
                      ${msg.cost} USDC · x402
                    </Text>
                  </View>
                  {msg.explorerUrl ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(msg.explorerUrl).catch(() => {})}
                      hitSlop={8}
                    >
                      <Text style={{ color: tokens.ACCENT, fontSize: 10, fontFamily: tokens.font.mono, letterSpacing: 0.3, textDecorationLine: 'underline' }}>
                        View on BaseScan →
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          </AnimatedMessage>
        ))}

        {isTyping &&
        !conversation.some(
          (m) =>
            (m.type === 'council' && m.phase !== COUNCIL_PHASES.DONE && m.phase !== COUNCIL_PHASES.AWAITING_CONFIRM) ||
            (m.type === 'fulfillment' && m.phase !== FULFILL_PHASES.DONE),
        ) ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.SUCCESS }} />
              <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: tokens.font.mono, textTransform: 'uppercase', letterSpacing: 0.5 }}>Agent</Text>
            </View>
            <PulsingDots color={tokens.MUTED} />
          </View>
        ) : null}
      </ScrollView>

      {/* ── Model Selector Dropdown (positioned above input bar) ─────── */}
      {modelDropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setModelDropdownOpen(false)} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} 
          />
          <View style={{ 
            position: 'absolute', 
            bottom: 76, 
            left: 16, 
            right: 16,
            backgroundColor: tokens.SURFACE_ELEVATED,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.BORDER,
            zIndex: 20,
            overflow: 'hidden',
          }}>
            {MODELS.map((model, idx) => (
              <TouchableOpacity
                key={model.id}
                onPress={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: idx < MODELS.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: tokens.BORDER,
                  backgroundColor: selectedModel === model.id ? tokens.ACCENT_SOFT : 'transparent',
                }}
              >
                <Text style={{ 
                  color: selectedModel === model.id ? tokens.ACCENT : tokens.FG, 
                  fontSize: 14, 
                  fontFamily: tokens.font.primary,
                  fontWeight: selectedModel === model.id ? '600' : '400',
                  letterSpacing: -0.2
                }}>
                  {model.label}
                </Text>
                {selectedModel === model.id && (
                  <Text style={{ color: tokens.ACCENT, fontSize: 14 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}


          </View>
        </>
      )}

      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <View style={{ 
        backgroundColor: tokens.BG, 
        borderTopWidth: StyleSheet.hairlineWidth, 
        borderTopColor: tokens.BORDER,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12
      }}>
        {/* Model selector chip row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <TouchableOpacity 
            onPress={() => setModelDropdownOpen(!modelDropdownOpen)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: tokens.SURFACE,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.BORDER,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontWeight: '500' }}>
              {activeModelLabel}
            </Text>
            <Text style={{ fontSize: 8, color: tokens.MUTED }}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Text input + send */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minHeight: 48, position: 'relative', justifyContent: 'center' }}>
            {/* Shadow Text for exact height measurement */}
            <Text 
              style={{
                position: 'absolute', opacity: 0, zIndex: -1, top: 0, left: 0, right: 0,
                fontFamily: tokens.font.primary, fontSize: 15, lineHeight: 20, paddingTop: 14, paddingBottom: 14
              }}
              onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
            >
              {prompt ? prompt + ' ' : ' '}
            </Text>
            
            <TextInput
              style={{
                height: Math.max(48, Math.min(108, inputHeight)),
                color: tokens.FG,
                fontFamily: tokens.font.primary,
                fontSize: 15,
                lineHeight: 20,
                paddingTop: 14,
                paddingBottom: 14,
                textAlignVertical: 'top',
                outlineStyle: 'none'
              }}
              placeholder="Ask anything..."
              placeholderTextColor={tokens.MUTED}
              value={prompt}
              onChangeText={(text) => {
                setPrompt(text);
              }}
              onKeyPress={(e) => {
                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                  e.preventDefault();
                  if (sendButtonActive) {
                    handleSend();
                  }
                }
              }}
              multiline
              maxLength={1000}
              showsVerticalScrollIndicator={false}
            />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 8, marginLeft: 8 }}>
            <Text style={{ 
              color: prompt.length >= 1000 ? tokens.DANGER : (prompt.length > 800 ? tokens.WARNING : tokens.FG_SECONDARY), 
              fontSize: 10, 
              fontFamily: tokens.font.mono, 
              marginBottom: 6,
              opacity: prompt.length > 0 ? 1 : 0
            }}>
              {prompt.length}/1000
            </Text>
            <TouchableOpacity 
              onPress={handleSend}
              disabled={!sendButtonActive}
              style={{
                height: 32,
                width: 32,
                borderRadius: 16,
                backgroundColor: !sendButtonActive ? tokens.SURFACE_ELEVATED : tokens.FG,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ 
                color: !sendButtonActive ? tokens.MUTED : tokens.BG, 
                fontFamily: tokens.font.mono, 
                fontWeight: '600', 
                fontSize: 16,
                marginTop: -2
              }}>
                ➤
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {sheetProposal ? (
        <ItineraryProposalSheet
          proposal={sheetProposal}
          tokens={tokens}
          t={t}
          onClose={() => setSheetProposal(null)}
        />
      ) : null}
    </View>
  );
}
