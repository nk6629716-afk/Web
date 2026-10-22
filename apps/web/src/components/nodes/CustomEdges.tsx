import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';

export const CustomNeonEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  animated,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: 0, height: 0 }}>
        <defs>
          <filter id={`neon-glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Ambient Neon Glow Line */}
      <path
        d={edgePath}
        fill="none"
        stroke="#00bfff"
        strokeWidth={selected || animated ? 6 : 4}
        strokeOpacity={selected ? 0.6 : animated ? 0.45 : 0.2}
        className="transition-all duration-300"
      />

      {/* Core Crisp Connection Line */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#38d4ff' : animated ? '#00bfff' : '#64748b',
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: animated ? '6 6' : undefined,
        }}
        className={animated ? 'neon-edge-running' : ''}
      />

      {/* Tactile Edge Label Pill */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 rounded-full bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.06)] border border-white/[0.04] text-[10px] font-mono font-semibold text-slate-300 select-none"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const edgeTypes = {
  neon: CustomNeonEdge,
  default: CustomNeonEdge,
};
