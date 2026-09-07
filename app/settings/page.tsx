'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [form, setForm] = useState({
    auth_host: '',
    app_host: '',
    client_id: '',
    api_username: '',
    api_password: '',
    org_name: '',
    org_identifier: '',
    timezone: 'America/Los_Angeles',
    scheduler_enabled: true,
  });
  const [saved, setSaved] = useState('');

  useEffect(() => {
    void fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setForm((f) => ({ ...f, ...data })));
  }, []);

  async function save() {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaved('Settings saved.');
    setTimeout(() => setSaved(''), 2500);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
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
            ['timezone', 'Timezone'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm col-span-2 md:col-span-1">
            <div>{label}</div>
            <input
              className="w-full"
              type={key === 'api_password' ? 'password' : 'text'}
              value={(form as any)[key] || ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm col-span-2">
          <input
            type="checkbox"
            checked={form.scheduler_enabled}
            onChange={(e) => setForm((f) => ({ ...f, scheduler_enabled: e.target.checked }))}
          />
          Master scheduler enabled
        </label>
      </div>
      <button className="btn-primary" onClick={() => void save()}>
        Save settings
      </button>
      {saved && <div className="text-teal-400 text-sm">{saved}</div>}
    </div>
  );
}
