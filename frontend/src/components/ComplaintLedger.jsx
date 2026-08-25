import { Link } from 'react-router-dom';
import { StatusStamp, PriorityChip, timeAgo, EmptyState } from './Common';
import { categoryLabel } from '../utils/constants';

export default function ComplaintLedger({ complaints, emptyTitle = 'The register is empty', emptyBody, basePath = '/citizen' }) {
  if (!complaints || complaints.length === 0) {
    return <EmptyState glyph="\u2732" title={emptyTitle} body={emptyBody} />;
  }
  return (
    <div className="ledger">
      {complaints.map((c, i) => (
        <Link key={c.id} to={`${basePath}/complaints/${c.id}`} className="ledger-row">
          <span className="ledger-idx">#{String(i + 1).padStart(3, '0')}</span>
          <div>
            <div className="ledger-title">{c.title}</div>
            <div className="ledger-meta">
              <span>{categoryLabel(c.category)}</span>
              <span>·</span>
              <span>{c.ward || c.city || 'Location on file'}</span>
              <span>·</span>
              <span>{timeAgo(c.created_at)}</span>
              {c.vote_count !== undefined && (
                <>
                  <span>·</span>
                  <span>{'\u2605'} {c.vote_count} upvotes</span>
                </>
              )}
            </div>
          </div>
          <PriorityChip score={c.priority_score} />
          <StatusStamp status={c.status} />
        </Link>
      ))}
    </div>
  );
}
