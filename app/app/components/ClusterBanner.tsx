'use client';

import { useState, useEffect } from 'react';

interface ClusterInfo {
  name?: string;
  cluster_name?: string;
  version?: {
    number?: string;
    distribution?: string;
  };
  tagline?: string;
}

export default function ClusterBanner() {
  const [info, setInfo] = useState<ClusterInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cluster-info')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setInfo)
      .catch(e => setError(e.message));
  }, []);

  // Detect engine type: OpenSearch has version.distribution = "opensearch"
  const isOpenSearch = info?.version?.distribution === 'opensearch';
  const engineName = isOpenSearch ? 'OpenSearch' : 'Elasticsearch';
  const version = info?.version?.number || 'unknown';

  if (error) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center text-sm text-red-400 font-mono">
        Cluster error: {error}
      </div>
    );
  }

  if (!info) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm text-amber-400 font-mono">
        Loading cluster info...
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm font-mono">
      <span className="text-amber-400">
        🔧 {engineName} <strong>v{version}</strong>
      </span>
      {info.cluster_name && (
        <span className="text-amber-400/70 ml-3">
          cluster: {info.cluster_name}
        </span>
      )}
      {info.name && (
        <span className="text-amber-400/70 ml-3">
          node: {info.name}
        </span>
      )}
    </div>
  );
}
