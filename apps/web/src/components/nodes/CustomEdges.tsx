import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';
import { X } from 'lucide-react';

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
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const showDeleteBtn = selected || hovered;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      {/* Wide invisible interaction zone for easy clicking/hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Ambient Neon Glow Line - strictly synchronous path geometry */}
      <path
        d={edgePath}
        fill="none"
        stroke="#00bfff"
        strokeWidth={selected || animated ? 6 : hovered ? 5 : 4}
        strokeOpacity={selected ? 0.6 : hovered ? 0.45 : animated ? 0.45 : 0.2}
        style={{
          transition: 'stroke-opacity 0.2s ease, stroke-width 0.2s ease, stroke 0.2s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Core Crisp Connection Line */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#38d4ff' : hovered ? '#00bfff' : animated ? '#00bfff' : '#64748b',
          strokeWidth: selected ? 2.5 : hovered ? 2.5 : 2,
          strokeDasharray: animated ? '6 6' : undefined,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
          pointerEvents: 'none',
        }}
        className={animated ? 'neon-edge-running' : ''}
      />

      {/* Edge Label + Delete Button */}
      <EdgeLabelRenderer>
        {/* Tactile Edge Label Pill */}
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - (showDeleteBtn ? 18 : 0)}px)`,
              pointerEvents: 'all',
              transition: 'transform 0.15s ease',
            }}
            className="px-2 py-0.5 rounded-full bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.06)] border border-white/[0.04] text-[10px] font-mono font-semibold text-slate-300 select-none"
          >
            {label}
          </div>
        )}

        {/* Neumorphic Delete Button */}
        {showDeleteBtn && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + (label ? 10 : 0)}px)`,
              pointerEvents: 'all',
            }}
            className="animate-in fade-in zoom-in-75 duration-150"
          >
            <button
              onClick={handleDelete}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              title="Delete connection"
              className="group/del flex items-center justify-center w-7 h-7 rounded-full bg-[#292b30] border border-white/[0.06] shadow-[3px_3px_8px_rgba(0,0,0,0.5),-3px_-3px_8px_rgba(255,255,255,0.08)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.06)] hover:border-[#ff3366]/40 transition-all duration-150 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-400 group-hover/del:text-[#ff3366] transition-colors duration-150" />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export const edgeTypes = {
  neon: CustomNeonEdge,
  default: CustomNeonEdge,
};
