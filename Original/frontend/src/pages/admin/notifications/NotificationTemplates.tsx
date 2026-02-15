import { useState } from 'react';

const EVENT_TYPES = ['order_placed', 'order_matched', 'order_delivered', 'order_cancelled', 'delivery_started', 'delivery_completed', 'low_stock_alert', 'supplier_accepted', 'supplier_rejected'];

const TEMPLATES = EVENT_TYPES.map(type => ({
  type,
  title_template: `{{event_type}} — {{entity_type}} #{{entity_id}}`,
  message_template: `A ${type.replace(/_/g, ' ')} event occurred for {{entity_type}} #{{entity_id}}.`,
  enabled: true,
}));

export function NotificationTemplates() {
  const [templates, setTemplates] = useState(TEMPLATES);
  const [saved, setSaved] = useState(false);

  const toggle = (i: number) => {
    setTemplates(prev => prev.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t));
    setSaved(false);
  };

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notification Templates</h1>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={save}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-3">
        {templates.map((t, i) => (
          <div key={t.type} className={`rounded-lg border p-4 transition-colors ${t.enabled ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900' : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(i)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${t.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${t.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="font-medium text-sm">{t.type.replace(/_/g, ' ')}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${t.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="ml-14 space-y-1 text-sm text-gray-500">
              <div><span className="text-xs uppercase text-gray-400">Title:</span> {t.title_template}</div>
              <div><span className="text-xs uppercase text-gray-400">Message:</span> {t.message_template}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
