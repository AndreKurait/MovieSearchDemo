'use client';

import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useSearchContext } from '@/app/context/SearchContext';

export default function SemanticSlider() {
  const { semanticRatio, setSemanticRatio, elserAvailable } = useSearchContext();

  if (!elserAvailable) {
    return (
      <div className="flex items-center gap-3 text-sm text-text-tertiary">
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <span>Semantic search loading...</span>
      </div>
    );
  }

  const label = semanticRatio === 0
    ? 'Keyword'
    : semanticRatio >= 1
      ? 'Semantic'
      : `Hybrid (${Math.round(semanticRatio * 100)}%)`;

  return (
    <div className="w-full max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-accent-keyword">Keyword</span>
        <span className="text-xs font-semibold text-text-secondary px-2 py-0.5 rounded bg-bg-tertiary">
          {label}
        </span>
        <span className="text-xs font-medium text-accent-semantic">Semantic</span>
      </div>
      <div className="semantic-slider">
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={semanticRatio}
          onChange={(value) => setSemanticRatio(value as number)}
        />
      </div>
    </div>
  );
}
