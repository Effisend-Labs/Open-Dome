import React, { useState, useEffect, useRef } from 'react';
import {
  Text, View, TextInput, TouchableOpacity,
  ScrollView, Linking, Platform
} from 'react-native';
import { Events } from 'opendome/src/events';
import { GLOBAL_STYLES } from '../theme';

// ─── Filter data ─────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { id: 'all',      label: 'ALL TIME' },
  { id: 'upcoming', label: 'UPCOMING' },
  { id: 'past',     label: 'PAST'     },
];

const CATEGORIES = [
  { id: 'all',       label: 'ALL CATEGORIES' },
  { id: 'Concert',   label: 'CONCERTS'       },
  { id: 'Baseball',  label: 'BASEBALL'       },
  { id: 'Spa LaQua', label: 'SPA LAQUA'      },
  { id: 'Exhibition',label: 'EXHIBITIONS'    },
  { id: 'Sports',    label: 'SPORTS'         },
];

const LOCATIONS = [
  { id: 'all',                    label: 'ALL PLACES'      },
  { id: 'Tokyo Dome',             label: 'TOKYO DOME'      },
  { id: 'Tokyo Dome City',        label: 'TOKYO DOME CITY' },
  { id: 'Spa LaQua',              label: 'SPA LAQUA'       },
  { id: 'ASO Bono!',              label: 'ASO BONO!'       },
  { id: 'Space Travelium TeNQ',   label: 'TENQ MUSEUM'     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return 'N/A';
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
    });
  } catch { return 'N/A'; }
}

function openUrl(url) {
  if (!url) return;
  const full = url.startsWith('http') ? url : `https://www.tokyo-dome.co.jp${url}`;
  Linking.openURL(full).catch(e => console.warn('[EventsView] open url failed', e));
}

// ─── Collapsible filter accordion ────────────────────────────────────────────

function FilterDropdown({ label, value, options, onSelect, tokens }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.id === value)?.label ?? label;
  const isFiltered    = value !== 'all';

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Trigger */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(p => !p)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label} filter, currently ${selectedLabel}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: isFiltered ? tokens.NEON_PRIMARY : tokens.SURFACE,
          borderWidth: tokens.shape.border,
          borderColor: isFiltered ? tokens.NEON_PRIMARY : tokens.BORDER,
          borderRadius: tokens.shape.buttonRadius,
        }}
      >
        <Text style={{
          fontSize: 10,
          fontWeight: 'bold',
          fontFamily: tokens.font.primary,
          color: isFiltered ? '#000' : tokens.FG,
          letterSpacing: 0.5,
        }}>
          {label.toUpperCase()}: {selectedLabel}
        </Text>
        <Text style={{
          fontSize: 10,
          color: isFiltered ? '#000' : tokens.MUTED,
          fontFamily: tokens.font.primary,
        }}>
          {open ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Options panel */}
      {open && (
        <View style={{
          borderWidth: tokens.shape.border,
          borderTopWidth: 0,
          borderColor: tokens.BORDER,
          backgroundColor: tokens.SURFACE,
          borderBottomLeftRadius: tokens.shape.buttonRadius,
          borderBottomRightRadius: tokens.shape.buttonRadius,
        }}>
          {options.map((opt, idx) => {
            const active = value === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.7}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: active }}
                onPress={() => { onSelect(opt.id); setOpen(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: active ? (tokens.NEON_PRIMARY + '22') : 'transparent',
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: tokens.BORDER,
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontFamily: tokens.font.primary,
                  color: active ? tokens.NEON_PRIMARY : tokens.FG,
                  fontWeight: active ? 'bold' : 'normal',
                }}>
                  {opt.label}
                </Text>
                {active && (
                  <Text style={{ color: tokens.NEON_PRIMARY, fontSize: 12 }}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventsView({ theme, tokens, t }) {
  const isDark = theme === 'dark';

  // Filter state
  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedTimeframe,setSelectedTimeframe]= useState('upcoming'); // default: upcoming

  // Results
  const [events, setEvents] = useState([]);

  // Filter key — no longer needed, unique item keys fix the reconciliation

  // Scroll ref — used to wire mouse-wheel on web
  const scrollRef = useRef(null);

  // ── Search — plain useEffect, no useCallback, direct state deps ─────────────
  useEffect(() => {
    try {
      const now = Date.now();
      const criteria = {
        query:     searchQuery.trim() || undefined,
        category:  selectedCategory === 'all' ? undefined : selectedCategory,
        placeName: selectedLocation === 'all' ? undefined : selectedLocation,
        from:      selectedTimeframe === 'upcoming' ? now  : undefined,
        to:        selectedTimeframe === 'past'     ? now  : undefined,
      };
      console.log('[EventsView] search →', JSON.stringify(criteria));
      const results = Events.search(criteria);
      console.log('[EventsView] got', results.length, 'events');
      // New array + new items array guarantees React sees a state change
      setEvents(results.map(e => ({ ...e })));
    } catch (err) {
      console.error('[EventsView] search error →', err);
      setEvents([]);
    }
  }, [searchQuery, selectedCategory, selectedLocation, selectedTimeframe]);

  // ── Mouse-wheel support on web ─────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const node = scrollRef.current
      ? (scrollRef.current.getScrollableNode
          ? scrollRef.current.getScrollableNode()
          : scrollRef.current)
      : null;

    if (!node || typeof node.addEventListener !== 'function') return;

    const onWheel = (e) => {
      // Prevent page scroll, drive our ScrollView instead
      node.scrollTop += e.deltaY;
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            color: tokens.FG,
            fontSize: 16,
            fontWeight: GLOBAL_STYLES.heavy,
            letterSpacing: 1,
            fontFamily: tokens.font.primary,
            marginBottom: 4,
          }}>
            {t.events?.title || 'TOKYO_DOME_EVENTS'}
          </Text>
          <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono }}>
            {t.events?.subtitle || 'Historical & scheduled events registry · SDK local DB'}
          </Text>
        </View>

        {/* ── Search input ────────────────────────────────────────────────── */}
        <TextInput
          accessibilityRole="search"
          accessibilityLabel="Search events by title or place"
          style={{
            padding: 12,
            fontSize: 13,
            backgroundColor: tokens.SURFACE,
            color: tokens.FG,
            borderWidth: tokens.shape.border,
            borderColor: tokens.BORDER,
            marginBottom: 12,
            fontFamily: tokens.font.primary,
            borderRadius: tokens.shape.buttonRadius,
            outlineStyle: 'none', // web: remove focus ring in favour of border
          }}
          placeholder={t.events?.searchPlaceholder || "SEARCH TITLE, ARTIST, PLACE…"}
          placeholderTextColor={tokens.MUTED}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />

        {/* ── Timeframe segmented control ─────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          gap: 6,
          marginBottom: 12,
        }}>
          {TIMEFRAMES.map(tf => {
            const active = selectedTimeframe === tf.id;
            return (
              <TouchableOpacity
                key={tf.id}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedTimeframe(tf.id)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  alignItems: 'center',
                  backgroundColor: active ? tokens.NEON_PRIMARY : tokens.SURFACE,
                  borderWidth: tokens.shape.border,
                  borderColor:  active ? tokens.NEON_PRIMARY : tokens.BORDER,
                  borderRadius: tokens.shape.buttonRadius,
                }}
              >
                <Text style={{
                  color: active ? '#000' : tokens.FG,
                  fontSize: 10,
                  fontWeight: 'bold',
                  fontFamily: tokens.font.primary,
                  letterSpacing: 0.5,
                }}>
                  {tf.id === 'all' ? (t.events?.timeAll || tf.label) : tf.id === 'upcoming' ? (t.events?.timeUpcoming || tf.label) : (t.events?.timePast || tf.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Collapsible category dropdown ───────────────────────────────── */}
        <FilterDropdown
          label={t.events?.category || "Category"}
          value={selectedCategory}
          options={CATEGORIES}
          onSelect={setSelectedCategory}
          tokens={tokens}
        />

        {/* ── Collapsible location dropdown ───────────────────────────────── */}
        <FilterDropdown
          label={t.events?.location || "Location"}
          value={selectedLocation}
          options={LOCATIONS}
          onSelect={setSelectedLocation}
          tokens={tokens}
        />

        {/* ── Results header ──────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: tokens.BORDER,
        }}>
          <Text style={{
            color: tokens.MUTED,
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1.5,
            fontFamily: tokens.font.primary,
          }}>
            {t.events?.results || 'REGISTRY_RESULTS'}
          </Text>
          <View style={{
            backgroundColor: tokens.NEON_PRIMARY + '22',
            borderWidth: tokens.shape.border,
            borderColor: tokens.NEON_PRIMARY,
            borderRadius: tokens.shape.pillRadius,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}>
            <Text style={{
              color: tokens.NEON_PRIMARY,
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: tokens.font.primary,
            }}>
              {events.length} {t.events?.eventsCount || 'EVENTS'}
            </Text>
          </View>
        </View>

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {events.length === 0 && (
          <View style={{
            padding: 48,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: tokens.BORDER,
            borderStyle: 'dashed',
            borderRadius: tokens.shape.cardRadius,
            marginTop: 8,
          }}>
            <Text style={{
              color: tokens.MUTED,
              fontSize: 11,
              fontFamily: tokens.font.primary,
              textAlign: 'center',
            }}>
              {t.events?.noMatches || 'NO MATCHING EVENTS FOUND'}{'\n'}{t.events?.tryAdjusting || 'Try adjusting your filters.'}
            </Text>
          </View>
        )}

        {/* ── Event cards ─────────────────────────────────────── */}
        <View>
        {events.map((event, index) => (
          <View
            key={`${event.id}-${index}`}
            style={{
              backgroundColor: tokens.SURFACE,
              borderWidth: tokens.shape.border,
              borderColor: tokens.BORDER,
              borderRadius: tokens.shape.cardRadius,
              padding: 16,
              marginBottom: 10,
              ...tokens.shadow.card
            }}
          >
            {/* Date + Category badge */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
              <Text style={{
                color: tokens.NEON_PRIMARY,
                fontSize: 11,
                fontFamily: tokens.font.mono,
                fontWeight: 'bold',
              }}>
                {formatDate(event.from)}
              </Text>
              <View style={{
                backgroundColor: isDark ? '#1A1A24' : '#E5E5EA',
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: tokens.shape.pillRadius,
              }}>
                <Text style={{
                  color: tokens.MUTED,
                  fontSize: 9,
                  fontWeight: 'bold',
                  fontFamily: tokens.font.primary,
                  letterSpacing: 0.5,
                }}>
                  {(event.category || '').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text style={{
              color: tokens.FG,
              fontSize: 14,
              fontWeight: GLOBAL_STYLES.heavy,
              fontFamily: tokens.font.primary,
              marginBottom: 4,
              lineHeight: 20,
            }}>
              {event.title}
            </Text>

            {/* Japanese title */}
            {event.title_ja && event.title_ja !== event.title && (
              <Text style={{
                color: tokens.MUTED,
                fontSize: 12,
                fontFamily: tokens.font.primary,
                marginBottom: 8,
                lineHeight: 18,
              }}>
                {event.title_ja}
              </Text>
            )}

            {/* Location */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
            }}>
              <Text style={{
                color: tokens.MUTED,
                fontSize: 9,
                fontFamily: tokens.font.primary,
              }}>
                LOCATION:
              </Text>
              <Text style={{
                color: tokens.FG,
                fontSize: 11,
                fontWeight: 'bold',
                fontFamily: tokens.font.primary,
              }}>
                {(event.placeName || '').toUpperCase()}
              </Text>
            </View>

            {/* External link */}
            {event.url && (
              <TouchableOpacity
                accessibilityRole="link"
                accessibilityLabel={`Visit event page for ${event.title}`}
                activeOpacity={0.7}
                onPress={() => openUrl(event.url)}
                style={{
                  marginTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: tokens.BORDER,
                  paddingTop: 10,
                  alignItems: 'flex-end',
                }}
              >
                <Text style={{
                  color: tokens.NEON_PRIMARY,
                  fontSize: 10,
                  fontWeight: 'bold',
                  fontFamily: tokens.font.primary,
                  letterSpacing: 0.5,
                }}>
                  {t.events?.visitPage || 'VISIT EVENT PAGE →'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        </View>
      </ScrollView>
    </View>
  );
}
