import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@opendome_scanner_recent_v1';
const MAX = 12;

export async function loadRecentScans() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function pushRecentScan(entry) {
  const prev = await loadRecentScans();
  const next = [
    {
      id: `${Date.now()}`,
      query: entry.query,
      label: entry.label,
      passCount: entry.passCount ?? 0,
      at: Date.now(),
    },
    ...prev.filter((x) => x.query !== entry.query),
  ].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentScans() {
  await AsyncStorage.removeItem(KEY);
  return [];
}
