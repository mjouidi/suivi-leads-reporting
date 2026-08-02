'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Supabase envoie un lien "recovery" (mot de passe oublié) qui authentifie
 * directement le navigateur puis déclenche l'événement PASSWORD_RECOVERY côté
 * client — sans ça, l'utilisateur se retrouve connecté sans jamais avoir pu
 * choisir de nouveau mot de passe. Ce composant affiche le formulaire manquant.
 */
export function PasswordRecoveryModal() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setOpen(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('8 caractères minimum.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => window.location.replace('/rapports'), 1200);
  }

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        {done ? (
          <p className="popup-message">Mot de passe mis à jour.</p>
        ) : (
          <form onSubmit={handleSubmit} className="popup-form">
            <h3 className="step-title" style={{ margin: '0 0 4px' }}>
              Nouveau mot de passe
            </h3>
            <p className="popup-message" style={{ margin: '0 0 12px', fontSize: 12.5 }}>
              Choisissez un nouveau mot de passe pour {' '}
              <strong>maher.jouidi@dentakay.com</strong>.
            </p>
            <label className="popup-label">
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </label>
            <label className="popup-label">
              Confirmer le mot de passe
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error && <p className="popup-error">{error}</p>}
            <button type="submit" className="popup-ok-btn" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Valider'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
