'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Shield, Bell, Key, CheckCircle, Loader2 } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Props { user: SupabaseUser; profile: any; }

export default function SettingsClient({ user, profile }: Props) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true); setPwError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPwError(error.message); }
    else { setPwSaved(true); setCurrentPassword(''); setNewPassword(''); setTimeout(() => setPwSaved(false), 2000); }
    setPwSaving(false);
  }

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center text-amber-DEFAULT">{icon}</div>
        <h2 className="font-display text-base text-chrome-bright">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs text-chrome-dim mb-2 uppercase tracking-wider font-medium">{label}</label>{children}</div>
  );

  return (
    <div className="max-w-xl space-y-6">
      <Section title="Profile" icon={<User className="w-4 h-4" />}>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <F label="Full Name">
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" />
          </F>
          <F label="Email">
            <input value={user.email} disabled className="input-dark w-full rounded-lg px-3 py-2.5 text-sm opacity-50 cursor-not-allowed" />
          </F>
          <button type="submit" disabled={saving}
            className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
            {saved ? 'Saved' : 'Save Profile'}
          </button>
        </form>
      </Section>

      <Section title="Change Password" icon={<Key className="w-4 h-4" />}>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <F label="New Password">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" minLength={8} required />
          </F>
          {pwError && <div className="text-sm text-red-400">{pwError}</div>}
          <button type="submit" disabled={pwSaving}
            className="btn-ghost rounded-lg px-5 py-2.5 text-sm flex items-center gap-2">
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : pwSaved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : null}
            {pwSaved ? 'Password Updated' : 'Update Password'}
          </button>
        </form>
      </Section>

      <Section title="DVSA MOT API" icon={<Shield className="w-4 h-4" />}>
        <div className="space-y-3 text-sm text-chrome-dim">
          <p>Bluechip Collection uses the official DVSA MOT History API to automatically import MOT records.</p>
          <p>To enable this feature, you need to register for API access:</p>
          <ol className="list-decimal list-inside space-y-1 text-chrome-dim">
            <li>Visit <a href="https://documentation.history.mot.api.gov.uk/mot-history-api/register" target="_blank" className="text-amber-DEFAULT hover:text-amber-light">documentation.history.mot.api.gov.uk</a></li>
            <li>Apply for trade API access (free for approved organisations)</li>
            <li>Receive your Client ID, Client Secret, API Key, and Token URL</li>
            <li>Add these to your <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded font-mono">.env.local</code> file:</li>
          </ol>
          <pre className="bg-obsidian-950 rounded-lg p-4 text-xs font-mono text-chrome-dim mt-3 overflow-x-auto border border-white/5">{`DVSA_CLIENT_ID=your_client_id
DVSA_CLIENT_SECRET=your_client_secret
DVSA_API_KEY=your_api_key
DVSA_TOKEN_URL=https://login.microsoftonline.com/
  {tenantId}/oauth2/v2.0/token
DVSA_SCOPE=https://tapi.dvsa.gov.uk/.default`}</pre>
          <p className="text-xs">Access tokens are cached server-side for 60 minutes. Client secrets expire every 2 years — you'll receive email reminders from DVSA.</p>
        </div>
      </Section>

      <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
        <div className="space-y-3">
          <p className="text-sm text-chrome-dim">Reminder notifications are shown in the app header. Email notifications require a configured email provider (e.g. Resend or SendGrid) — see the README for setup.</p>
          <div className="space-y-2 text-sm text-chrome-dim">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span>MOT expiry reminders</span>
              <span className="text-emerald-400 text-xs">30, 14, 7, 1 days</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span>Insurance renewal reminders</span>
              <span className="text-emerald-400 text-xs">30, 14, 7, 1 days</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Vehicle tax reminders</span>
              <span className="text-emerald-400 text-xs">30, 14, 7, 1 days</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
