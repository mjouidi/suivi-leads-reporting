'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError('Email ou mot de passe incorrect.');
        setLoading(false);
        return;
      }

      // Navigation complète (pas router.push) : les cookies de session partent forcément
      // avec la requête, et une erreur serveur s'affiche au lieu de laisser le bouton
      // bloqué sur « Connexion… ».
      window.location.assign('/rapports');
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
      setLoading(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8vh' }}>
      <div className="pearl pearl-logo" style={{ marginBottom: 24, width: 120, height: 120 }}>
        <img src="/brand/pearl-logo.png" alt="Dentakay" />
      </div>

      <div className="header-card" style={{ width: '100%', display: 'block' }}>
        <h2 className="step-title" style={{ textAlign: 'center', margin: '0 0 1.25rem' }}>
          Rapports — Suivi des leads
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Mot de passe
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-danger)' }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn-export" style={{ marginTop: 4 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
