'use client';

/**
 * Root fallback when even the layout crashes. Must define its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 16, border: '1px solid #eee', padding: 32, textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>TheFarmYard couldn&apos;t load</h2>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{error.message || 'An unexpected error occurred.'}</p>
            {error.digest && (
              <p style={{ fontSize: 12, color: '#999', fontFamily: 'monospace' }}>Ref: {error.digest}</p>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => reset()}
                style={{ padding: '10px 20px', background: '#1E4620', color: '#fff', border: 0, borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Reload
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{ padding: '10px 20px', color: '#444', background: '#fff', border: '1px solid #ddd', borderRadius: 12, cursor: 'pointer' }}
              >
                Go back home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
