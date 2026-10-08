'use client';

import { useEffect, useState } from 'react';

type ProfileSummary = { id: string; name: string };

type ProfileDetail = {
  id: string;
  name: string;
  auth_host: string | null;
  app_host: string | null;
  client_id: string | null;
  api_username: string | null;
  api_password: string | null;
  org_name: string | null;
  org_identifier: string | null;
  application_name: string | null;
};

const emptyForm = {
  auth_host: '',
  app_host: '',
  client_id: '',
  api_username: '',
  api_password: '',
  org_name: '',
  org_identifier: '',
  application_name: 'SimphonyBIAPI-Sample',
};

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [activeId, setActiveId] = useState('');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    profileName?: string | null;
    steps: { id: string; label: string; status: string; detail: string }[];
    error?: string;
  } | null>(null);

  async function refresh(nextSelected?: string) {
    const [settingsRes, profilesRes] = await Promise.all([
      fetch('/api/settings', { cache: 'no-store' }),
      fetch('/api/profiles', { cache: 'no-store' }),
    ]);
    const settings = await settingsRes.json();
    const list = (await profilesRes.json()) as ProfileDetail[];
    setProfiles(list.map((p) => ({ id: p.id, name: p.name })));
    setActiveId(settings.active_profile_id || '');
    setTimezone(settings.timezone || 'America/Los_Angeles');
    setSchedulerEnabled(Boolean(settings.scheduler_enabled));
    const pickId = nextSelected || selectedId || settings.active_profile_id || list[0]?.id || '';
    setSelectedId(pickId);
    const detail = list.find((p) => p.id === pickId);
    setForm({
      auth_host: detail?.auth_host || '',
      app_host: detail?.app_host || '',
      client_id: detail?.client_id || '',
      api_username: detail?.api_username || '',
      api_password: detail?.api_password || '',
      org_name: detail?.org_name || '',
      org_identifier: detail?.org_identifier || '',
      application_name: detail?.application_name || 'SimphonyBIAPI-Sample',
    });
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectProfile(id: string) {
    setSelectedId(id);
    const res = await fetch(`/api/profiles/${id}`, { cache: 'no-store' });
    const detail = (await res.json()) as ProfileDetail;
    setForm({
      auth_host: detail.auth_host || '',
      app_host: detail.app_host || '',
      client_id: detail.client_id || '',
      api_username: detail.api_username || '',
      api_password: detail.api_password || '',
      org_name: detail.org_name || '',
      org_identifier: detail.org_identifier || '',
      application_name: detail.application_name || 'SimphonyBIAPI-Sample',
    });
  }

  function flash(ok: string, err?: string) {
    setSaved(err ? '' : ok);
    setError(err || '');
    setTimeout(() => {
      setSaved('');
      setError('');
    }, 2500);
  }

  async function save() {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timezone,
        scheduler_enabled: schedulerEnabled,
        profile_id: selectedId,
        ...form,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      flash('', data.error || 'Save failed');
      return;
    }
    flash('Settings saved.');
  }

  async function activate() {
    const res = await fetch(`/api/profiles/${selectedId}/activate`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      flash('', data.error || 'Could not activate');
      return;
    }
    const data = await res.json();
    setActiveId(data.active_profile_id);
    flash(`Active environment: ${data.active_profile_name}`);
  }

  async function createNew() {
    const name = window.prompt('New environment name');
    if (!name) return;
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash('', data.error || 'Could not create');
      return;
    }
    await refresh(data.id);
    flash(`Created ${data.name}`);
  }

  async function duplicate() {
    const current = profiles.find((p) => p.id === selectedId);
    const name = window.prompt('Duplicate as', current ? `Copy of ${current.name}` : '');
    if (!name) return;
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, duplicateFrom: selectedId }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash('', data.error || 'Could not duplicate');
      return;
    }
    await refresh(data.id);
    flash(`Created ${data.name}`);
  }

  async function rename() {
    const current = profiles.find((p) => p.id === selectedId);
    const name = window.prompt('Rename environment', current?.name || '');
    if (!name) return;
    const res = await fetch(`/api/profiles/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash('', data.error || 'Could not rename');
      return;
    }
    await refresh(selectedId);
    flash('Renamed.');
  }

  async function remove() {
    const current = profiles.find((p) => p.id === selectedId);
    if (!current) return;
    if (!window.confirm(`Delete environment "${current.name}"?`)) return;
    const res = await fetch(`/api/profiles/${selectedId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash('', data.error || 'Could not delete');
      return;
    }
    setSelectedId('');
    await refresh();
    flash('Deleted.');
  }

  async function testActive() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.steps)) {
        setTestResult({
          ok: Boolean(data.ok),
          profileName: data.profileName,
          steps: data.steps,
        });
        return;
      }
      setTestResult({
        ok: false,
        steps: [],
        error: data.error || 'Connection test failed.',
      });
    } catch (err) {
      setTestResult({
        ok: false,
        steps: [],
        error: err instanceof Error ? err.message : 'Connection test failed.',
      });
    } finally {
      setTesting(false);
    }
  }
  const selectedIsActive = selectedId && selectedId === activeId;
  const selectedName = profiles.find((p) => p.id === selectedId)?.name || '';

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-slate-400">
        Jobs use the active environment. Warehouse tables are shared across environments, so mock and production
        totals can land in the same Postgres database.
      </p>

      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm min-w-[12rem] flex-1">
            <div>Environment</div>
            <select className="w-full" value={selectedId} onChange={(e) => void selectProfile(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === activeId ? ' (active)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" disabled={selectedIsActive || !selectedId} onClick={() => void activate()}>
            Use this environment
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => void createNew()}>
            New
          </button>
          <button className="btn-ghost" disabled={!selectedId} onClick={() => void duplicate()}>
            Duplicate
          </button>
          <button className="btn-ghost" disabled={!selectedId} onClick={() => void rename()}>
            Rename
          </button>
          <button className="btn-danger" disabled={!selectedId} onClick={() => void remove()}>
            Delete
          </button>
        </div>
        {selectedName && (
          <div className="text-xs text-slate-400">
            Editing <span className="text-slate-200">{selectedName}</span>
            {selectedIsActive ? ' — this is the active environment for jobs.' : ' — jobs still use the active environment until you switch.'}
          </div>
        )}
      </div>

      <div className="card p-5 grid grid-cols-2 gap-4">
        {(
          [
            ['auth_host', 'Authentication Server URL'],
            ['app_host', 'Application Server URL'],
            ['client_id', 'Client ID'],
            ['api_username', 'API username'],
            ['api_password', 'API password'],
            ['org_name', 'Organization short name'],
            ['org_identifier', 'Enterprise short name'],
            ['application_name', 'Application name'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm col-span-2 md:col-span-1">
            <div>{label}</div>
            <input
              className="w-full"
              type={key === 'api_password' ? 'password' : 'text'}
              value={(form as Record<string, string>)[key] || ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <label className="space-y-1 text-sm col-span-2 md:col-span-1">
          <div>Timezone</div>
          <input className="w-full" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm col-span-2">
          <input
            type="checkbox"
            checked={schedulerEnabled}
            onChange={(e) => setSchedulerEnabled(e.target.checked)}
          />
          Master scheduler enabled
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={() => void save()}>
          Save settings
        </button>
        <button className="btn-ghost" disabled={testing || !activeId} onClick={() => void testActive()}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Test connection uses the saved active environment, not unsaved form edits.
      </p>
      {saved && <div className="text-teal-400 text-sm">{saved}</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {testResult && (
        <div className="card p-4 space-y-2">
          <div className={`text-sm font-medium ${testResult.ok ? 'text-teal-400' : 'text-red-400'}`}>
            {testResult.ok
              ? `Connection succeeded${testResult.profileName ? ` (${testResult.profileName})` : ''}`
              : `Connection failed${testResult.profileName ? ` (${testResult.profileName})` : ''}`}
          </div>
          {testResult.error && <div className="text-sm text-red-400">{testResult.error}</div>}
          <ol className="space-y-2 text-sm">
            {testResult.steps.map((step) => (
              <li key={step.id} className="border-t border-navy-700 pt-2 first:border-t-0 first:pt-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={
                      step.status === 'ok'
                        ? 'text-teal-400'
                        : step.status === 'failed'
                          ? 'text-red-400'
                          : 'text-slate-500'
                    }
                  >
                    {step.status === 'ok' ? 'Passed' : step.status === 'failed' ? 'Failed' : 'Skipped'}
                  </span>
                  <span className="text-slate-200">{step.label}</span>
                </div>
                {step.detail && <div className="text-xs text-slate-400 mt-0.5 break-words">{step.detail}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
