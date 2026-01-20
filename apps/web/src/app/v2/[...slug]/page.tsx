// TODO: Remove this compatibility redirect after 1-2 deploys
'use client';

import { useParams, redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function V2CatchAllRedirect() {
  const params = useParams();
  const slug = params?.slug as string[];

  useEffect(() => {
    if (slug) {
      // Redirect /v2/path/to/page -> /path/to/page
      const newPath = '/' + slug.join('/');
      window.location.href = newPath;
    } else {
      window.location.href = '/';
    }
  }, [slug]);

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <p>Redirecting...</p>
    </div>
  );
}
