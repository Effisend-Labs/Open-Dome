import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSmartSize } from '../../providers/smartProvider';
import { useTheme } from '../../providers/ThemeProvider';

const defaultFont = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  default: 'sans-serif',
});

function StopCard({ stop, isLast, n, theme, s }) {
  const isAnchor = stop.kind === 'anchor';

  return (
    <View style={s.stopRow}>
      <View style={s.railCol}>
        <View style={[s.railDot, isAnchor && s.railDotAnchor]}>
          <Ionicons
            name={stop.icon || 'location-outline'}
            size={n(isAnchor ? 14 : 12)}
            color={isAnchor ? theme.text.buttonText || '#FFF' : theme.text.secondary}
          />
        </View>
        {!isLast && <View style={s.railLine} />}
      </View>

      <View style={[s.stopCard, isAnchor && s.stopCardAnchor]}>
        <View style={s.stopHeader}>
          <Text style={s.slotLabel}>{stop.slotLabel}</Text>
          <Text style={s.stopTime}>
            {stop.startTime}
            {stop.endTime && stop.endTime !== stop.startTime ? ` – ${stop.endTime}` : ''}
          </Text>
        </View>
        <Text style={[s.stopTitle, isAnchor && s.stopTitleAnchor]}>{stop.title}</Text>
        <View style={s.placeRow}>
          <Ionicons name="location-outline" size={n(14)} color={theme.text.secondary} />
          <Text style={s.placeText}>{stop.placeName}</Text>
        </View>
        {stop.description ? (
          <Text style={s.description}>{stop.description}</Text>
        ) : null}
        {isAnchor && stop.thumbnail ? (
          <Image source={{ uri: stop.thumbnail }} style={s.thumbnail} contentFit="cover" />
        ) : null}
      </View>
    </View>
  );
}

export function ItineraryProposalSheet({ proposal, onClose, bottomInset = 0 }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  const s = React.useMemo(() => styles(n, theme), [n, theme]);

  if (!proposal) return null;

  return (
    <View style={s.overlay}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close itinerary" />
      <View style={[s.sheet, { paddingBottom: n(20) + bottomInset }]}>
        <View style={s.handle} />

        <View style={s.sheetHeader}>
          <View style={s.sheetHeaderText}>
            <Text style={s.sheetEyebrow}>Itinerary proposal</Text>
            <Text style={s.sheetTitle}>{proposal.title}</Text>
            <Text style={s.sheetDate}>{proposal.dateLabel}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
            <Ionicons name="close-circle" size={n(28)} color={theme.text.secondary} />
          </Pressable>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {proposal.stops.map((stop, index) => (
            <StopCard
              key={`${stop.id}-${index}`}
              stop={stop}
              isLast={index === proposal.stops.length - 1}
              n={n}
              theme={theme}
              s={s}
            />
          ))}

          <View style={s.footerNote}>
            <Ionicons name="information-circle-outline" size={n(16)} color={theme.text.secondary} />
            <Text style={s.footerText}>
              Quote and pass minting come next — this is a preview only.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = (n, theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      maxHeight: '88%',
      backgroundColor: theme.bg.panel,
      borderTopLeftRadius: n(24),
      borderTopRightRadius: n(24),
      borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
      borderColor: theme.border.default,
      borderBottomWidth: 0,
    },
    handle: {
      alignSelf: 'center',
      width: n(36),
      height: n(4),
      borderRadius: n(2),
      backgroundColor: theme.border.default,
      marginTop: n(10),
      marginBottom: n(8),
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: n(20),
      paddingBottom: n(12),
      gap: n(12),
    },
    sheetHeaderText: {
      flex: 1,
    },
    sheetEyebrow: {
      color: theme.text.accent,
      fontSize: n(12),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: n(4),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    sheetTitle: {
      color: theme.text.primary,
      fontSize: n(22),
      fontWeight: '700',
      letterSpacing: -0.5,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    sheetDate: {
      color: theme.text.secondary,
      fontSize: n(14),
      marginTop: n(4),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    closeBtn: {
      marginTop: n(4),
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: n(20),
      paddingBottom: n(8),
    },
    stopRow: {
      flexDirection: 'row',
    },
    railCol: {
      width: n(36),
      alignItems: 'center',
    },
    railDot: {
      width: n(28),
      height: n(28),
      borderRadius: n(14),
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    railDotAnchor: {
      backgroundColor: theme.text.accent,
    },
    railLine: {
      flex: 1,
      width: 2,
      backgroundColor: theme.border.default,
      minHeight: n(16),
    },
    stopCard: {
      flex: 1,
      marginBottom: n(16),
      padding: n(14),
      borderRadius: n(16),
      backgroundColor: theme.bg.card,
      borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
      borderColor: theme.border.default,
    },
    stopCardAnchor: {
      borderColor: theme.text.accent,
      borderWidth: n(1.5),
    },
    stopHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: n(6),
    },
    slotLabel: {
      color: theme.text.secondary,
      fontSize: n(11),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    stopTime: {
      color: theme.text.secondary,
      fontSize: n(12),
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    stopTitle: {
      color: theme.text.primary,
      fontSize: n(17),
      fontWeight: '700',
      marginBottom: n(6),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    stopTitleAnchor: {
      color: theme.text.accent,
    },
    placeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(4),
      marginBottom: n(6),
    },
    placeText: {
      color: theme.text.secondary,
      fontSize: n(13),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    description: {
      color: theme.text.secondary,
      fontSize: n(13),
      lineHeight: n(18),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    thumbnail: {
      width: '100%',
      height: n(120),
      borderRadius: n(12),
      marginTop: n(10),
    },
    footerNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: n(8),
      padding: n(14),
      borderRadius: n(12),
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      marginTop: n(4),
      marginBottom: n(8),
    },
    footerText: {
      flex: 1,
      color: theme.text.secondary,
      fontSize: n(13),
      lineHeight: n(18),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
  });
