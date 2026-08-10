"use client";

import { useState, useEffect } from "react";
import Dashboard from "./dashboard";
import { Lock } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if already logged in
  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.authenticated) setIsAuthenticated(true);
      setIsLoading(false);
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return (
    <main style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="surface" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Lock size={32} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>System Access</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Enter credentials to access the Server Bridge</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              style={{ borderColor: error ? '#ef4444' : 'var(--border)', marginBottom: '1rem' }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ borderColor: error ? '#ef4444' : 'var(--border)' }}
            />
            {error && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>Access Denied. Incorrect credentials.</span>}
          </div>
          <button type="submit" style={{ width: '100%' }}>Authenticate</button>
        </form>
      </div>
    </main>
  );
}
