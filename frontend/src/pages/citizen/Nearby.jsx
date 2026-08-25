import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { communityApi } from '../../api/client';
import { Loader, EmptyState } from '../../components/Common';
import ComplaintLedger from '../../components/ComplaintLedger';

export default function Nearby() {
  const [state, setState] = useState('idle');
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setState('error');
      setError('Your browser does not support location access.');
      return;
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await communityApi.nearby({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            radius_m: 2000,
            limit: 30,
          });
          setComplaints(data.complaints || []);
          setState('ready');
        } catch {
          setState('error');
          setError('Could not load nearby reports.');
        }
      },
      () => { setState('error'); setError('Location access was denied. Enable it to see nearby reports.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <AppShell title="Nearby Reports" subtitle="Community complaints within 2 km of you">
      {state === 'locating' && <Loader label="Finding your location…" />}
      {state === 'error' && <EmptyState glyph="\u26A0" title="Couldn't load nearby reports" body={error} />}
      {state === 'ready' && (
        <ComplaintLedger
          complaints={complaints}
          emptyTitle="All clear around you"
          emptyBody="No open complaints reported within 2 km."
        />
      )}
    </AppShell>
  );
}
