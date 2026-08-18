import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { communityApi } from '../../api/client';
import { Loader } from '../../components/Common';
import ComplaintLedger from '../../components/ComplaintLedger';

export default function Bookmarks() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.listBookmarks()
      .then(({ data }) => setComplaints(data.bookmarks || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Bookmarked" subtitle="Complaints you're keeping an eye on">
      {loading ? <Loader /> : (
        <ComplaintLedger
          complaints={complaints}
          emptyTitle="No bookmarks yet"
          emptyBody="Bookmark a complaint from its detail page to track it here."
        />
      )}
    </AppShell>
  );
}
