import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import App from '../App';

export default function Index() {
  const [dock, setDock] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/docking-token');
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `docking-token failed (${res.status})`);
        if (!body.token) throw new Error('docking-token response missing token');
        if (!cancelled) setDock(body);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#b91c1c', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (!dock) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <App appId={dock.appId} appToken={dock.token} />;
}
