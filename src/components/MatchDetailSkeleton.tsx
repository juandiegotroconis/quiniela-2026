import Skeleton from './Skeleton';

export default function MatchDetailSkeleton() {
  return (
    <div>
      <Skeleton width={70} height={16} />
      <div
        style={{
          marginTop: 16,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Skeleton width={100} height={12} />
        <Skeleton width={140} height={20} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Skeleton width={48} height={48} radius="50%" />
          <Skeleton width={60} height={32} />
          <Skeleton width={48} height={48} radius="50%" />
        </div>
      </div>
    </div>
  );
}
