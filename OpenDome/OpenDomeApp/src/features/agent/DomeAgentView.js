import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSmartSize } from '../../providers/smartProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { locales } from '../../core/locales';
import { useDomeChat } from './useDomeChat';
import { themeToAgentTokens } from './themeToAgentTokens';
import { DomeAgentMessages } from './DomeAgentMessages';
import { DomeAgentComposer } from './DomeAgentComposer';
import { ItineraryProposalSheet } from './DayPlanSheet';

const defaultFont = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  default: 'sans-serif',
});

export default function DomeAgentView({ verifiedToken }) {
  const { normalize: n, keyboardInset } = useSmartSize();
  const { colors: theme, language } = useTheme();
  const copy = locales[language]?.os || locales.en.os;
  const tokens = themeToAgentTokens(theme);
  const chat = useDomeChat({ token: verifiedToken });
  const canSend = chat.prompt.trim().length > 0 && !chat.isTyping;

  return (
    <View style={styles.shell}>
      <View style={[styles.header, { paddingHorizontal: n(20), paddingTop: n(24) }]}>
        <Text style={[styles.title, { color: theme.text.primary, fontSize: n(28) }]}>
          {copy.agentTitle}
        </Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary, fontSize: n(14) }]}>
          {copy.agentSubtitle}
        </Text>
      </View>

      <DomeAgentMessages
        tokens={tokens}
        messages={chat.conversation}
        isTyping={chat.isTyping}
        starters={copy.agentStarters}
        emptyLabel={copy.agentEmpty}
        session={chat.session}
        onStarter={chat.send}
        onSelectEvent={chat.selectEvent}
        onPlanDay={chat.handlePlanDay}
        onSelectAgent={chat.handlePickCouncilAgent}
        onConfirm={(opts) => chat.runFulfillment(opts)}
        onViewPlan={(p) => chat.setSheetProposal(chat.session?.proposal || p)}
        paymentNetwork={chat.paymentNetwork}
        onPaymentNetworkChange={chat.setPaymentNetwork}
      />

      <View style={{ paddingBottom: keyboardInset > 80 ? n(12) : n(108), zIndex: 4 }}>
        <DomeAgentComposer
          theme={theme}
          n={n}
          value={chat.prompt}
          onChange={chat.setPrompt}
          onSend={() => chat.send()}
          disabled={chat.isTyping}
          canSend={canSend}
          placeholder={copy.agentPlaceholder}
        />
      </View>

      {chat.sheetProposal ? (
        <ItineraryProposalSheet
          proposal={chat.sheetProposal}
          tokens={tokens}
          onClose={() => chat.setSheetProposal(null)}
          onUpdate={chat.handleUpdatePlan}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, position: 'relative' },
  header: { marginBottom: 8 },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: defaultFont,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: defaultFont,
  },
});
