'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Shield, Bell, Key, CheckCircle, Loader2, UserPlus, Trash2, Users } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ClientProfile { id: string; email: string; full_name?: string; role: string; created_at: string; }
interface Props { user: SupabaseUser; profile: any; clients: ClientProfile[]; }

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-chrome-dim mb-2 uppercase tracking-wider font-medium">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-DEFAULT/10 flex items-center justify-center text-amber-DEFAULT">{icon}</div>
        <h2 className="font-display text-base text-chrome-bright">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SettingsClient({ user, profile, clients: initialClients }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [clients, setClients] = useState<ClientProfile[]>(initialClients);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState('');
  const [clientSuccess, setClientSuccess] = useState('');
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
    router.refresh(); // re-fetches sidebar so Welcome name updates immediately
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

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    setClientSaving(true); setClientError(''); setClientSuccess('');
    const res = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: newClientEmail, password: newClientPassword, fullName: newClientName }),
    });
    const data = await res.json();
    setClientSaving(false);
    if (!res.ok) { setClientError(data.error ?? 'Failed to create account'); return; }
    setClientSuccess(`Account created for ${newClientEmail}`);
    setNewClientName(''); setNewClientEmail(''); setNewClientPassword('');
    // Refresh client list
    const { data: updated } = await supabase.from('profiles').select('id, email, full_name, role, created_at').eq('admin_id', user.id).eq('role', 'client');
    if (updated) setClients(updated);
  }

  async function handleDeleteClient(clientId: string, clientEmail: string) {
    if (!confirm(`Remove access for ${clientEmail}? This cannot be undone.`)) return;
    const res = await fetch('/api/admin/delete-client', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: clientId }),
    });
    if (res.ok) setClients(prev => prev.filter(c => c.id !== clientId));
  }

  return (
    <div className="max-w-xl space-y-6">

      {isAdmin && (
        <Section title="Client Accounts" icon={<Users className="w-4 h-4" />}>
          <div className="space-y-5">
            {/* Existing clients */}
            {clients.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-chrome-dim uppercase tracking-wider mb-2">Active Accounts</div>
                {clients.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-chrome-bright font-medium">{c.full_name || 'Unnamed Client'}</div>
                      <div className="text-xs text-chrome-dim">{c.email}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 font-semibold">Client</span>
                    <button onClick={() => handleDeleteClient(c.id, c.email)}
                      className="w-7 h-7 rounded btn-ghost flex items-center justify-center text-chrome-dim hover:text-red-400 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create new client */}
            <form onSubmit={handleCreateClient} className="space-y-4 pt-2 border-t border-white/5">
              <div className="text-xs text-chrome-dim uppercase tracking-wider">Create Client Account</div>
              <F label="Client Name">
                <input value={newClientName} onChange={e => setNewClientName(e.target.value)}
                  className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. John Smith" />
              </F>
              <F label="Email Address">
                <input type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)}
                  className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="client@email.com" required />
              </F>
              <F label="Password">
                <input type="password" value={newClientPassword} onChange={e => setNewClientPassword(e.target.value)}
                  className="input-dark w-full rounded-lg px-3 py-2.5 text-sm" placeholder="Min. 8 characters" minLength={8} required />
              </F>
              {clientError && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{clientError}</div>}
              {clientSuccess && <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">✓ {clientSuccess}</div>}
              <button type="submit" disabled={clientSaving}
                className="btn-amber rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                {clientSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {clientSaving ? 'Creating...' : 'Create Client Account'}
              </button>
            </form>
          </div>
        </Section>
      )}

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
