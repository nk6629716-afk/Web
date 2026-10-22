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
      {/* Ambient Neon Glow Line - strictly synchronous path geometry */}
      <path
        d={edgePath}
        fill="none"
        stroke="#00bfff"
        strokeWidth={selected || animated ? 6 : 4}
        strokeOpacity={selected ? 0.6 : animated ? 0.45 : 0.2}
        style={{
          transition: 'stroke-opacity 0.2s ease, stroke-width 0.2s ease, stroke 0.2s ease',
        }}
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
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
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
