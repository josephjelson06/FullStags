import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { createOrder, listPartCategories } from '@/services/api';

interface CategoryOption {
  id: number;
  name: string;
  subcategory: string | null;
}

export function EmergencyRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [partDescription, setPartDescription] = useState('Hydraulic Pressure Sensor');
  const [partNumber, setPartNumber] = useState('HPS-4420');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [urgency, setUrgency] = useState<'critical' | 'urgent' | 'standard'>('critical');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.location?.address) {
      setAddress(user.location.address);
    }
    if (typeof user?.location?.lat === 'number') {
      setLat(String(user.location.lat));
    }
    if (typeof user?.location?.lng === 'number') {
      setLng(String(user.location.lng));
    }
  }, [user]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await listPartCategories();
        setCategories(response);
        if (response.length > 0) {
          setCategoryId((current) => current ?? response[0].id);
        }
      } catch {
        setError('Failed to load part categories.');
      }
    };
    void loadCategories();
  }, []);

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearching(true);
    setError(null);

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Latitude and longitude must be valid numbers.');
      setSearching(false);
      return;
    }
    if (!categoryId) {
      setError('Select a category before creating an order.');
      setSearching(false);
      return;
    }

    try {
      const createdOrder = await createOrder({
        urgency,
        items: [
          {
            categoryId,
            partNumber,
            partDescription,
            quantity: 1,
          },
        ],
      });
      navigate(`/buyer/orders/${createdOrder.orderId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create emergency request.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Emergency Request"
        subtitle="Create a backend-valid urgent order. Matching and assignment happen in the backend workflow."
      />

      <form
        className="surface-card grid gap-4 rounded-2xl p-5 shadow-sm md:grid-cols-2"
        onSubmit={submitRequest}
      >
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-part-name">Part Description</label>
          <input id="er-part-name" className="w-full" value={partDescription} onChange={(e) => setPartDescription(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-part-number">Part Number</label>
          <input id="er-part-number" className="w-full" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-category">Category</label>
          <select
            id="er-category"
            className="w-full"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}{category.subcategory ? ` - ${category.subcategory}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-urgency">Urgency</label>
          <select
            id="er-urgency"
            className="w-full"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as 'critical' | 'urgent' | 'standard')}
          >
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="standard">Standard</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-address">Delivery Address</label>
          <input id="er-address" className="w-full" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-lat">Latitude</label>
          <input id="er-lat" className="w-full" value={lat} onChange={(e) => setLat(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-lng">Longitude</label>
          <input id="er-lng" className="w-full" value={lng} onChange={(e) => setLng(e.target.value)} required />
        </div>

        {error ? (
          <p className="rounded-lg px-3 py-2 text-sm font-medium md:col-span-2" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={searching}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:opacity-70 md:col-span-2"
          style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
        >
          {searching ? 'Creating order...' : 'Create Emergency Order'}
        </button>
      </form>
    </section>
  );
}
