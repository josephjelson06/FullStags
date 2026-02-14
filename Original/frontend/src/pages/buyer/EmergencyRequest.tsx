import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useMatches } from '@/hooks/useMatches';
import { createOrder, updateOrder } from '@/services/api';
import type { SupplierMatch, Urgency } from '@/types';

export function EmergencyRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [partName, setPartName] = useState('Hydraulic Pressure Sensor');
  const [partNumber, setPartNumber] = useState('HPS-4420');
  const [urgency, setUrgency] = useState<Urgency>('critical');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<SupplierMatch | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { matches, loading: matchesLoading, error: matchesError } = useMatches(currentOrderId ?? undefined);

  useEffect(() => {
    if (user?.location) {
      setAddress(user.location.address);
      setLat(String(user.location.lat));
      setLng(String(user.location.lng));
    }
  }, [user]);

  const fastestMatchId = useMemo(() => (matches.length > 0 ? matches[0].matchId : null), [matches]);

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

    try {
      const createdOrder = await createOrder({
        partName,
        partNumber,
        urgency,
        deliveryLocation: { lat: latitude, lng: longitude, address },
      });
      setCurrentOrderId(createdOrder.orderId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create emergency request.');
    } finally {
      setSearching(false);
    }
  };

  const confirmSupplier = async () => {
    if (!currentOrderId || !selectedMatch) return;
    setConfirming(true);
    setError(null);
    try {
      await updateOrder(currentOrderId, 'select_supplier', selectedMatch.matchId);
      navigate(`/buyer/orders/${currentOrderId}`);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Could not confirm supplier.');
    } finally {
      setConfirming(false);
      setSelectedMatch(null);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Emergency Request"
        subtitle="Find the fastest supplier by Time-to-Site: pick time plus drive time."
      />

      {/* Order Form */}
      <form
        className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm md:grid-cols-2"
        onSubmit={submitRequest}
      >
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-part-name">Part Name</label>
          <input id="er-part-name" className="w-full" value={partName} onChange={(e) => setPartName(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-part-number">Part Number</label>
          <input id="er-part-number" className="w-full" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="er-urgency">Urgency</label>
          <select id="er-urgency" className="w-full" value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="standard">🔵 Standard</option>
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
          <p className="rounded-lg px-3 py-2 text-sm font-medium md:col-span-2"
             style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={searching}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:opacity-70 md:col-span-2"
          style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
        >
          {searching ? 'Searching suppliers...' : '🔍 Find This Part Now'}
        </button>
      </form>

      {/* Matching status */}
      {matchesError ? (
        <p className="rounded-lg px-3 py-2 text-sm font-medium"
           style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {matchesError}
        </p>
      ) : null}

      {matchesLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5">
          <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">Ranking suppliers by proximity and pick time...</p>
        </div>
      ) : null}

      {currentOrderId && !matchesLoading && matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-secondary">No suppliers found with this part nearby.</p>
        </div>
      ) : null}

      {/* Match Results */}
      {matches.length > 0 ? (
        <div className="stagger-children grid gap-4">
          {matches.map((match) => {
            const isFastest = fastestMatchId === match.matchId;
            return (
              <article
                key={match.matchId}
                className="group rounded-2xl border bg-surface p-5 shadow-sm transition-all hover:shadow-md"
                style={{
                  borderColor: isFastest ? 'var(--color-success)' : 'var(--color-border)',
                  boxShadow: isFastest ? '0 0 0 1px var(--color-success)' : undefined,
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-text-primary">{match.supplierName}</h3>
                  {isFastest ? <Badge variant="fastest" label="⚡ Fastest" /> : null}
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
                  <div className="rounded-lg p-2.5" style={{ background: 'var(--color-surface-inset)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Distance</p>
                    <p className="mt-0.5 font-bold text-text-primary">{match.distanceKm.toFixed(1)} km</p>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: 'var(--color-surface-inset)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Pick Time</p>
                    <p className="mt-0.5 font-bold text-text-primary">{match.pickTimeMinutes} min</p>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: 'var(--color-surface-inset)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Drive Time</p>
                    <p className="mt-0.5 font-bold text-text-primary">{match.driveTimeMinutes} min</p>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: 'var(--color-primary-light)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Total</p>
                    <p className="mt-0.5 text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{match.totalTimeMinutes} min</p>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: 'var(--color-surface-inset)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Price</p>
                    <p className="mt-0.5 font-bold text-text-primary">${match.partPrice.toFixed(2)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMatch(match)}
                  className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:shadow-md"
                  style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
                >
                  Order from This Supplier
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        title="Confirm Supplier Selection"
      >
        <p className="text-sm text-text-secondary">
          Confirm order with <strong className="text-text-primary">{selectedMatch?.supplierName}</strong> for an estimated total time of{' '}
          <strong className="text-text-primary">{selectedMatch?.totalTimeMinutes} minutes</strong>.
        </p>
        <button
          type="button"
          onClick={confirmSupplier}
          disabled={confirming}
          className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:opacity-70"
          style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
        >
          {confirming ? 'Confirming...' : '✓ Confirm Order'}
        </button>
      </Modal>
    </section>
  );
}
