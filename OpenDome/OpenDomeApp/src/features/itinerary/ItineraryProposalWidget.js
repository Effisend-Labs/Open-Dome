import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../../providers/smartProvider';
import { useTheme } from '../../providers/ThemeProvider';

const defaultFont = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  default: 'sans-serif',
});

export function ItineraryProposalWidget({ proposal, onViewDetails, glassStyles }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  const s = React.useMemo(() => styles(n, theme), [n, theme]);

  if (!proposal?.stops?.length) return null;

  const previewStops = proposal.stops.slice(0, 3);
  const moreCount = proposal.stops.length - previewStops.length;

  return (
    <View style={[s.card, glassStyles]}>
      <View style={s.headerRow}>
        <View style={s.badge}>
          <Ionicons name="sparkles" size={n(12)} color={theme.text.accent} />
          <Text style={s.badgeText}>Agent proposal</Text>
        </View>
        <Text style={s.dateText}>{proposal.dateLabel}</Text>
      </View>

      <Text style={s.title}>{proposal.title}</Text>
      <Text style={s.subtitle} numberOfLines={2}>{proposal.subtitle}</Text>

      <View style={s.timeline}>
        {previewStops.map((stop, index) => (
          <View key={`${stop.id}-${index}`} style={s.timelineRow}>
            <View style={s.timelineRail}>
              <View style={[s.dot, stop.kind === 'anchor' && s.dotAnchor]} />
              {index < previewStops.length - 1 && <View style={s.line} />}
            </View>
            <View style={s.timelineContent}>
              <Text style={s.time}>{stop.startTime}</Text>
              <Text style={[s.stopTitle, stop.kind === 'anchor' && s.stopTitleAnchor]} numberOfLines={1}>
                {stop.title}
              </Text>
              <Text style={s.place} numberOfLines={1}>{stop.placeName}</Text>
            </View>
          </View>
        ))}
        {moreCount > 0 && (
          <Text style={s.moreText}>+{moreCount} more stop{moreCount > 1 ? 's' : ''}</Text>
        )}
      </View>

      <Pressable style={s.cta} onPress={onViewDetails}>
        <Text style={s.ctaText}>View full itinerary</Text>
        <Ionicons name="chevron-forward" size={n(16)} color={theme.text.buttonText || '#FFF'} />
      </Pressable>
    </View>
  );
}

const styles = (n, theme) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.shape?.cardRadius ?? n(24),
      padding: n(20),
      borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
      borderColor: theme.border.default,
      backgroundColor: theme.bg.card,
      ...(theme.shadow?.card || {}),
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: n(8),
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(4),
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      paddingHorizontal: n(8),
      paddingVertical: n(4),
      borderRadius: n(8),
    },
    badgeText: {
      color: theme.text.accent,
      fontSize: n(11),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    dateText: {
      color: theme.text.secondary,
      fontSize: n(12),
      fontWeight: '500',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    title: {
      color: theme.text.primary,
      fontSize: n(20),
      fontWeight: '700',
      letterSpacing: -0.4,
      marginBottom: n(4),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    subtitle: {
      color: theme.text.secondary,
      fontSize: n(14),
      marginBottom: n(16),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    timeline: {
      marginBottom: n(16),
      gap: n(2),
    },
    timelineRow: {
      flexDirection: 'row',
      minHeight: n(52),
    },
    timelineRail: {
      width: n(20),
      alignItems: 'center',
      marginRight: n(10),
    },
    dot: {
      width: n(8),
      height: n(8),
      borderRadius: n(4),
      backgroundColor: theme.text.secondary,
      marginTop: n(6),
    },
    dotAnchor: {
      backgroundColor: theme.text.accent,
      width: n(10),
      height: n(10),
      borderRadius: n(5),
    },
    line: {
      flex: 1,
      width: 2,
      backgroundColor: theme.border.default,
      marginVertical: n(2),
    },
    timelineContent: {
      flex: 1,
      paddingBottom: n(8),
    },
    time: {
      color: theme.text.secondary,
      fontSize: n(12),
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    stopTitle: {
      color: theme.text.primary,
      fontSize: n(15),
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    stopTitleAnchor: {
      color: theme.text.accent,
    },
    place: {
      color: theme.text.secondary,
      fontSize: n(12),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    moreText: {
      color: theme.text.secondary,
      fontSize: n(12),
      marginLeft: n(30),
      marginTop: n(4),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    cta: {
      backgroundColor: theme.text.accent,
      paddingVertical: n(14),
      paddingHorizontal: n(16),
      borderRadius: theme.shape?.cardRadius ?? n(16),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: n(6),
    },
    ctaText: {
      color: theme.text.buttonText || (theme.isDark ? '#000' : '#FFF'),
      fontSize: n(15),
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
  });
