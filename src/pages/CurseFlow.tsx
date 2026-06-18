import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Skull,
  BookOpen,
  ChevronRight,
  Zap,
  CircleOff,
  X,
  GitCompareArrows,
  Check,
  GitBranch,
  ArrowRightLeft,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ENDING_TYPE_LABEL } from '@/types';
import { type CurseFlowBranch } from '@/utils/validation';
import { cn } from '@/lib/utils';

const COLOR_A = { stroke: 'rgba(239, 68, 68, 0.85)', dot: '#ef4444', text: 'text-blood-400', label: 'A' };
const COLOR_B = { stroke: 'rgba(56, 189, 248, 0.85)', dot: '#38bdf8', text: 'text-frost-400', label: 'B' };
const COLOR_COMMON = { dot: '#52b788', stroke: 'rgba(82, 183, 136, 0.6)' };

interface DiffAnalysis {
  forkIndex: number;
  convergeIndex: number;
  diffReasons: { index: number; type: 'fork' | 'converge' | 'value-diff' | 'scene-diff' | 'length'; label: string }[];
  nodeDiffSetA: Set<number>;
  nodeDiffSetB: Set<number>;
  commonSet: Set<number>;
}

function analyzeDiff(a: CurseFlowBranch, b: CurseFlowBranch): DiffAnalysis {
  let forkIndex = -1;
  let convergeIndex = -1;
  const diffReasons: DiffAnalysis['diffReasons'] = [];

  const nodeKey = (s: { chapterId: string; sceneId: string; choiceId?: string }) =>
    `${s.chapterId}|${s.sceneId}|${s.choiceId ?? ''}`;

  const minLen = Math.min(a.snapshots.length, b.snapshots.length);
  const nodeDiffSetA = new Set<number>();
  const nodeDiffSetB = new Set<number>();
  const commonSet = new Set<number>();

  for (let i = 0; i < minLen; i++) {
    const sa = a.snapshots[i];
    const sb = b.snapshots[i];
    const sameNode = nodeKey(sa) === nodeKey(sb);
    const valDiff = Math.abs(sa.curseValue - sb.curseValue);

    if (forkIndex === -1 && !sameNode) {
      forkIndex = i;
      diffReasons.push({
        index: i,
        type: 'fork',
        label: `第一次分叉：选择了不同分支路径（A → ${sa.sceneTitle} / B → ${sb.sceneTitle}）`,
      });
    }

    if (forkIndex !== -1 && convergeIndex === -1 && sameNode) {
      convergeIndex = i;
      diffReasons.push({
        index: i,
        type: 'converge',
        label: `重新汇合：两条线回到同一场景「${sa.sceneTitle}」`,
      });
    }

    if (sameNode && valDiff < 3) {
      commonSet.add(i);
    }

    if (!sameNode) {
      nodeDiffSetA.add(i);
      nodeDiffSetB.add(i);
      if (forkIndex !== -1 && (convergeIndex === -1 || i < convergeIndex)) {
        diffReasons.push({
          index: i,
          type: 'scene-diff',
          label: `剧情节点不同（A: ${sa.sceneTitle}${sa.choiceText ? ` · ${sa.choiceText}` : ''} / B: ${sb.sceneTitle}${sb.choiceText ? ` · ${sb.choiceText}` : ''}）`,
        });
      }
    } else if (valDiff >= 3) {
      diffReasons.push({
        index: i,
        type: 'value-diff',
        label: `同场景但诅咒值相差 ${valDiff}（A: ${sa.curseValue} / B: ${sb.curseValue}）`,
      });
    }
  }

  if (a.snapshots.length !== b.snapshots.length) {
    const longer = a.snapshots.length > b.snapshots.length ? 'A' : 'B';
    const diff = Math.abs(a.snapshots.length - b.snapshots.length);
    diffReasons.push({
      index: minLen,
      type: 'length',
      label: `分支长度不同：${longer} 线多出 ${diff} 个节点`,
    });
    if (longer === 'A') {
      for (let i = minLen; i < a.snapshots.length; i++) nodeDiffSetA.add(i);
    } else {
      for (let i = minLen; i < b.snapshots.length; i++) nodeDiffSetB.add(i);
    }
  }

  return { forkIndex, convergeIndex, diffReasons, nodeDiffSetA, nodeDiffSetB, commonSet };
}

export default function CurseFlow() {
  const navigate = useNavigate();
  const buildCurseFlow = useAppStore((s) => s.buildCurseFlow);
  const [selectedBranchKeys, setSelectedBranchKeys] = useState<string[]>([]);

  const branches = useMemo(() => buildCurseFlow(), [buildCurseFlow]);
  const selectedBranches = useMemo(
    () => selectedBranchKeys.map((k) => branches.find((b) => b.branchKey === k)).filter(Boolean) as CurseFlowBranch[],
    [branches, selectedBranchKeys],
  );
  const branchA = selectedBranches[0] ?? null;
  const branchB = selectedBranches[1] ?? null;
  const isCompareMode = selectedBranches.length === 2;

  const globalMax = useMemo(
    () => Math.max(...branches.map((b) => b.maxCurse), 0),
    [branches],
  );
  const hasWarnings = useMemo(
    () => branches.some((b) => b.snapshots.some((s) => s.warning)),
    [branches],
  );

  const diffAnalysis = useMemo<DiffAnalysis | null>(() => {
    if (!branchA || !branchB) return null;
    return analyzeDiff(branchA, branchB);
  }, [branchA, branchB]);

  const toggleBranch = (key: string) => {
    setSelectedBranchKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  };

  const clearSelection = () => setSelectedBranchKeys([]);

  const handleJumpToScene = (chapterId: string, sceneId: string) => {
    navigate('/chapters');
    setTimeout(() => {
      const event = new CustomEvent('jump-to-scene', { detail: { chapterId, sceneId } });
      window.dispatchEvent(event);
    }, 100);
  };

  const renderSingleCurve = (branch: CurseFlowBranch) => {
    const maxVal = Math.max(globalMax, 1);
    const width = 760;
    const height = 200;
    const padding = 24;
    const pointCount = branch.snapshots.length;
    if (pointCount === 0) return null;

    const stepX = (width - padding * 2) / Math.max(pointCount - 1, 1);
    const points = branch.snapshots.map((s, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (s.curseValue / maxVal) * (height - padding * 2);
      return { x, y, snapshot: s };
    });

    const pathD = points
      .map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cpx1 = prev.x + stepX / 3;
        const cpx2 = p.x - stepX / 3;
        return `C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
      })
      .join(' ');

    const strokeColor =
      branch.snapshots.some((s) => s.warning === 'spike')
        ? 'rgba(239, 68, 68, 0.85)'
        : branch.snapshots.some((s) => s.warning === 'early-release')
          ? 'rgba(245, 158, 11, 0.85)'
          : 'rgba(82, 183, 136, 0.85)';

    return (
      <svg width={width} height={height} className="w-full">
        {Array.from({ length: 6 }).map((_, i) => {
          const y = height - padding - (i / 5) * (height - padding * 2);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={i === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
                strokeDasharray={i === 0 ? '3,3' : '2,4'}
              />
              <text
                x={padding - 6}
                y={y + 3}
                textAnchor="end"
                fill="rgba(148, 163, 184, 0.5)"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                {Math.round((i / 5) * maxVal)}
              </text>
            </g>
          );
        })}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          className="drop-shadow-[0_0_6px_rgba(82,183,136,0.3)]"
        />
        {points.map((p, i) => (
          <g key={i} onClick={() => handleJumpToScene(p.snapshot.chapterId, p.snapshot.sceneId)} className="cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r={p.snapshot.warning ? 7 : 4.5}
              fill={
                p.snapshot.warning === 'spike'
                  ? '#ef4444'
                  : p.snapshot.warning === 'early-release'
                    ? '#f59e0b'
                    : p.snapshot.delta > 0
                      ? '#ef4444'
                      : p.snapshot.delta < 0
                        ? '#52b788'
                        : '#64748b'
              }
              stroke="#0a0a0f"
              strokeWidth="2"
            />
            {p.snapshot.warning && (
              <text
                x={p.x}
                y={p.y - 14}
                textAnchor="middle"
                fill="#ef4444"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                {p.snapshot.warning === 'spike' ? '⚠ 暴涨' : '⚠ 解除'}
              </text>
            )}
            <text
              x={p.x}
              y={p.y + 18}
              textAnchor="middle"
              fill="rgba(148, 163, 184, 0.8)"
              fontSize="9"
              fontFamily="JetBrains Mono"
            >
              {p.snapshot.curseValue}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const renderCompareCurves = (a: CurseFlowBranch, b: CurseFlowBranch, analysis: DiffAnalysis) => {
    const maxVal = Math.max(globalMax, a.maxCurse, b.maxCurse, 1);
    const maxLen = Math.max(a.snapshots.length, b.snapshots.length);
    const width = 820;
    const height = 240;
    const padding = 28;
    const stepX = (width - padding * 2) / Math.max(maxLen - 1, 1);

    const buildPoints = (branch: CurseFlowBranch) =>
      branch.snapshots.map((s, i) => {
        const x = padding + i * stepX;
        const y = height - padding - (s.curseValue / maxVal) * (height - padding * 2 - 20);
        return { x, y, snapshot: s };
      });

    const pointsA = buildPoints(a);
    const pointsB = buildPoints(b);

    const buildPath = (pts: { x: number; y: number }[]) =>
      pts
        .map((p, i) => {
          if (i === 0) return `M ${p.x} ${p.y}`;
          const prev = pts[i - 1];
          const cpx1 = prev.x + stepX / 3;
          const cpx2 = p.x - stepX / 3;
          return `C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
        })
        .join(' ');

    const renderDiamond = (x: number, y: number, color: string, label: string) => (
      <g>
        <polygon
          points={`${x},${y - 10} ${x + 9},${y} ${x},${y + 10} ${x - 9},${y}`}
          fill={color}
          stroke="#0a0a0f"
          strokeWidth="2"
        />
        <text
          x={x}
          y={y - 18}
          textAnchor="middle"
          fill={color}
          fontSize="10"
          fontFamily="Cinzel"
          fontWeight="bold"
        >
          {label}
        </text>
      </g>
    );

    return (
      <svg width={width} height={height} className="w-full">
        {Array.from({ length: 6 }).map((_, i) => {
          const y = height - padding - 10 - (i / 5) * (height - padding * 2 - 20);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={i === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
                strokeDasharray={i === 0 ? '3,3' : '2,4'}
              />
              <text
                x={padding - 8}
                y={y + 3}
                textAnchor="end"
                fill="rgba(148, 163, 184, 0.5)"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                {Math.round((i / 5) * maxVal)}
              </text>
            </g>
          );
        })}

        <path d={buildPath(pointsA)} fill="none" stroke={COLOR_A.stroke} strokeWidth="2.5" opacity="0.95" />
        <path d={buildPath(pointsB)} fill="none" stroke={COLOR_B.stroke} strokeWidth="2.5" opacity="0.95" strokeDasharray="6,3" />

        {analysis.forkIndex >= 0 && pointsA[analysis.forkIndex] &&
          renderDiamond(pointsA[analysis.forkIndex].x, pointsA[analysis.forkIndex].y - 28, '#f59e0b', 'FORK')}
        {analysis.convergeIndex >= 0 && pointsA[analysis.convergeIndex] &&
          renderDiamond(pointsA[analysis.convergeIndex].x, pointsA[analysis.convergeIndex].y - 28, '#52b788', 'MERGE')}

        {pointsA.map((p, i) => {
          const common = analysis.commonSet.has(i);
          const nodeDiff = analysis.nodeDiffSetA.has(i);
          const isDiff = !common;
          const valDiff = b.snapshots[i] ? Math.abs(p.snapshot.curseValue - b.snapshots[i].curseValue) : 0;
          const isFork = analysis.forkIndex === i;
          const isConverge = analysis.convergeIndex === i;
          return (
            <g key={`a-${i}`} onClick={() => handleJumpToScene(p.snapshot.chapterId, p.snapshot.sceneId)} className="cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r={common ? 4 : nodeDiff ? 8 : isDiff ? 7 : 5}
                fill={common ? COLOR_COMMON.dot : COLOR_A.dot}
                stroke={isFork ? '#f59e0b' : isConverge ? '#52b788' : nodeDiff ? '#f59e0b' : isDiff ? '#fca5a5' : '#0a0a0f'}
                strokeWidth={isFork || isConverge ? 3.5 : nodeDiff ? 3.5 : isDiff ? 3 : 2}
              />
              {isDiff && !common && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fill={nodeDiff ? '#f59e0b' : '#fca5a5'}
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  fontWeight="bold"
                >
                  {nodeDiff ? '≠' : `Δ${valDiff}`}
                </text>
              )}
              {common && (
                <text
                  x={p.x}
                  y={p.y + 18}
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.5)"
                  fontSize="8"
                  fontFamily="JetBrains Mono"
                >
                  {p.snapshot.curseValue}
                </text>
              )}
            </g>
          );
        })}

        {pointsB.map((p, i) => {
          const common = analysis.commonSet.has(i);
          if (common) return null;
          const nodeDiff = analysis.nodeDiffSetB.has(i);
          const isDiff = !common;
          const valDiff = a.snapshots[i] ? Math.abs(p.snapshot.curseValue - a.snapshots[i].curseValue) : 0;
          return (
            <g key={`b-${i}`} onClick={() => handleJumpToScene(p.snapshot.chapterId, p.snapshot.sceneId)} className="cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r={nodeDiff ? 8 : isDiff ? 7 : 5}
                fill={COLOR_B.dot}
                stroke={nodeDiff ? '#f59e0b' : isDiff ? '#7dd3fc' : '#0a0a0f'}
                strokeWidth={nodeDiff ? 3.5 : isDiff ? 3 : 2}
                opacity="0.95"
              />
              {isDiff && (
                <text
                  x={p.x}
                  y={p.y + 24}
                  textAnchor="middle"
                  fill={nodeDiff ? '#f59e0b' : '#7dd3fc'}
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  fontWeight="bold"
                >
                  {nodeDiff ? '≠' : `Δ${valDiff}`}
                </text>
              )}
              {!isDiff && (
                <text
                  x={p.x}
                  y={p.y + 18}
                  textAnchor="middle"
                  fill="rgba(125, 211, 252, 0.8)"
                  fontSize="8"
                  fontFamily="JetBrains Mono"
                >
                  {p.snapshot.curseValue}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="z-20 bg-ink-950/90 backdrop-blur-md border-b border-ink-700/60 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-ember-500" />
          <div>
            <h2 className="font-display text-lg text-ash-100 tracking-wider">
              诅咒值走向{isCompareMode ? ' · 分支对比分析' : ''}
            </h2>
            <p className="text-[11px] text-ash-600 font-body">
              {isCompareMode
                ? '对比两条分支：分叉点/汇合点用菱形标出，≠ 表示剧情节点不同'
                : '跨章节分支诅咒值变化曲线，选中 2 条进入对比分析'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompareMode && diffAnalysis && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-void-800/50 border border-void-700/60 text-[11px] text-frost-400 font-body">
              <GitCompareArrows className="w-3 h-3" />
              {diffAnalysis.diffReasons.length} 处差异
            </span>
          )}
          {hasWarnings && (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-blood-900/30 border border-blood-700/50 text-[11px] text-blood-400 font-body">
              <Zap className="w-3 h-3" />
              检测到 {branches.flatMap((b) => b.snapshots.filter((s) => s.warning)).length} 处异常
            </span>
          )}
          <span className="text-[11px] text-ash-600 font-body">
            共 {branches.length} 条分支路径
          </span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-80 shrink-0 border-r border-ink-700/60 bg-ink-900/40 flex flex-col min-h-0">
          <div className="p-3 border-b border-ink-700/60 flex items-center justify-between">
            <div className="label-dark m-0">
              {isCompareMode ? `对比分支 A / B` : '分支路径'}
            </div>
            {selectedBranches.length > 0 && (
              <button onClick={clearSelection} className="text-[10px] text-ash-500 hover:text-ash-300 font-body flex items-center gap-0.5">
                <X className="w-2.5 h-2.5" /> 清空
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {branches.map((branch) => {
              const hasWarn = branch.snapshots.some((s) => s.warning);
              const idx = selectedBranchKeys.indexOf(branch.branchKey);
              const isSelected = idx >= 0;
              const slot = isSelected ? (idx === 0 ? 'A' : 'B') : null;
              return (
                <button
                  key={branch.branchKey}
                  onClick={() => toggleBranch(branch.branchKey)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-sm border transition-all duration-200 relative',
                    isSelected
                      ? slot === 'A'
                        ? 'bg-blood-900/20 border-blood-600/60 shadow-glow-blood-xs'
                        : 'bg-void-800/30 border-frost-500/60 shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                      : 'bg-transparent border-transparent hover:bg-ink-800/60 hover:border-ink-600',
                  )}
                >
                  {isSelected && slot && (
                    <span className={cn(
                      'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-display shadow-lg',
                      slot === 'A' ? 'bg-blood-600 text-white' : 'bg-frost-500 text-ink-950',
                    )}>
                      {slot}
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ash-200 font-body truncate pr-4">
                      {branch.endingTitle || '未完结分支'}
                    </span>
                    {hasWarn && <Zap className="w-3 h-3 text-blood-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn(
                      'text-[10px] font-body px-1.5 py-0.5 border',
                      branch.endingType === 'true' && 'bg-verdant-800/40 text-verdant-500 border-verdant-700/50',
                      branch.endingType === 'bad' && 'bg-blood-900/40 text-blood-400 border-blood-800/50',
                      branch.endingType === 'loop' && 'bg-void-800/40 text-frost-500 border-void-700/50',
                      branch.endingType === 'hidden' && 'bg-ember-800/40 text-ember-600 border-ember-700/50',
                      !branch.endingType && 'bg-ink-700/60 text-ash-500 border-ink-600',
                    )}>
                      {branch.endingType ? ENDING_TYPE_LABEL[branch.endingType as keyof typeof ENDING_TYPE_LABEL] : '分支'}
                    </span>
                    <span className="text-[10px] text-ash-600 font-body">
                      峰值 {branch.maxCurse} / 谷值 {branch.minCurse}
                    </span>
                  </div>
                  <div className="text-[10px] text-ash-600 mt-1 font-body">
                    {branch.snapshots.length} 个节点 · {new Set(branch.snapshots.map((s) => s.chapterId)).size} 章
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {selectedBranches.length === 0 ? (
            <div className="h-full flex items-center justify-center text-ash-600">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-body">请从左侧选择 1-2 条分支路径</p>
                <p className="text-[11px] text-ash-600 font-body mt-1">
                  选 1 条看单条曲线，选 2 条进入对比分析模式
                </p>
              </div>
            </div>
          ) : isCompareMode && branchA && branchB && diffAnalysis ? (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className={cn(
                  'card-dark border-l-4',
                  'border-l-blood-500',
                )}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blood-600 text-white text-[10px] font-display flex items-center justify-center">A</span>
                      <h3 className="font-display text-sm text-ash-100 tracking-wider truncate">
                        {branchA.endingTitle || '未完结分支'}
                      </h3>
                    </div>
                    <div className="text-[11px] text-ash-600 font-body">
                      峰值 <span className="text-blood-400">{branchA.maxCurse}</span> · 谷值 <span className="text-verdant-400">{branchA.minCurse}</span>
                      {' · '}{branchA.snapshots.length} 节点
                      {branchA.endingType && (
                        <> · <span className={cn(
                          branchA.endingType === 'true' && 'text-verdant-400',
                          branchA.endingType === 'bad' && 'text-blood-400',
                          branchA.endingType === 'loop' && 'text-frost-400',
                          branchA.endingType === 'hidden' && 'text-ember-500',
                        )}>{ENDING_TYPE_LABEL[branchA.endingType as keyof typeof ENDING_TYPE_LABEL]}</span></>
                      )}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  'card-dark border-l-4',
                  'border-l-frost-500',
                )}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-frost-500 text-ink-950 text-[10px] font-display flex items-center justify-center">B</span>
                      <h3 className="font-display text-sm text-ash-100 tracking-wider truncate">
                        {branchB.endingTitle || '未完结分支'}
                      </h3>
                    </div>
                    <div className="text-[11px] text-ash-600 font-body">
                      峰值 <span className="text-blood-400">{branchB.maxCurse}</span> · 谷值 <span className="text-verdant-400">{branchB.minCurse}</span>
                      {' · '}{branchB.snapshots.length} 节点
                      {branchB.endingType && (
                        <> · <span className={cn(
                          branchB.endingType === 'true' && 'text-verdant-400',
                          branchB.endingType === 'bad' && 'text-blood-400',
                          branchB.endingType === 'loop' && 'text-frost-400',
                          branchB.endingType === 'hidden' && 'text-ember-500',
                        )}>{ENDING_TYPE_LABEL[branchB.endingType as keyof typeof ENDING_TYPE_LABEL]}</span></>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-dark">
                <div className="px-5 py-4 border-b border-ink-700/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-sm text-ash-100 tracking-wider">对比曲线</h3>
                    <p className="text-[11px] text-ash-600 font-body mt-0.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-verdant-500 mr-1 align-middle" /> 共同节点
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-ember-500 ml-3 mr-1 align-middle" /> 节点不同（剧情分歧）
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-blood-500 ml-3 mr-1 align-middle" /> 诅咒值差异 ≥3
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-body">
                    <span className="flex items-center gap-1 text-ash-600">
                      <span className="w-3 h-3 rounded-full bg-blood-500" /> 分支 A
                    </span>
                    <span className="flex items-center gap-1 text-ash-600">
                      <span className="w-3 h-0.5 bg-frost-500 border-b-2 border-dashed" /> 分支 B
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  {renderCompareCurves(branchA, branchB, diffAnalysis)}
                </div>
              </div>

              <div className="card-dark">
                <div className="px-5 py-4 border-b border-ink-700/50 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-frost-400" />
                  <h3 className="font-display text-sm text-ash-100 tracking-wider">差异分析</h3>
                  <span className="text-[10px] text-ash-600 font-body">
                    共 {diffAnalysis.diffReasons.length} 处差异
                  </span>
                </div>
                <div className="divide-y divide-ink-700/40 max-h-64 overflow-y-auto">
                  {diffAnalysis.diffReasons.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[11px] text-ash-500 font-body">
                      <Check className="w-6 h-6 mx-auto mb-2 text-verdant-500/60" />
                      两条分支高度一致
                    </div>
                  ) : (
                    diffAnalysis.diffReasons.map((reason, idx) => (
                      <div key={idx} className="px-5 py-2.5 flex items-start gap-3 hover:bg-ink-800/30">
                        <span className="text-[10px] font-display text-ash-600 w-6 mt-0.5">#{reason.index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {reason.type === 'fork' && <GitBranch className="w-3 h-3 text-ember-500" />}
                            {reason.type === 'converge' && <ArrowRightLeft className="w-3 h-3 text-verdant-500" />}
                            {reason.type === 'scene-diff' && <Layers className="w-3 h-3 text-ember-400" />}
                            {reason.type === 'value-diff' && <TrendingUp className="w-3 h-3 text-blood-400" />}
                            {reason.type === 'length' && <Sparkles className="w-3 h-3 text-void-400" />}
                            <span className={cn(
                              'text-[10px] font-medium uppercase tracking-wider',
                              reason.type === 'fork' && 'text-ember-500',
                              reason.type === 'converge' && 'text-verdant-500',
                              reason.type === 'scene-diff' && 'text-ember-400',
                              reason.type === 'value-diff' && 'text-blood-400',
                              reason.type === 'length' && 'text-void-400',
                            )}>
                              {reason.type === 'fork' && '分叉点'}
                              {reason.type === 'converge' && '汇合点'}
                              {reason.type === 'scene-diff' && '剧情节点不同'}
                              {reason.type === 'value-diff' && '诅咒值差异'}
                              {reason.type === 'length' && '长度差异'}
                            </span>
                          </div>
                          <p className="text-[11px] text-ash-400 font-body leading-relaxed">
                            {reason.label}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card-dark">
                <div className="px-5 py-4 border-b border-ink-700/50">
                  <h3 className="font-display text-sm text-ash-100 tracking-wider">节点对照</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-body">
                    <thead>
                      <tr className="text-ash-500 border-b border-ink-700/50">
                        <th className="text-left px-5 py-2 w-10">#</th>
                        <th className="text-left px-3 py-2">分支 A</th>
                        <th className="text-center px-3 py-2 w-14">诅咒值</th>
                        <th className="text-center px-3 py-2 w-14">差异</th>
                        <th className="text-center px-3 py-2 w-14">诅咒值</th>
                        <th className="text-left px-3 py-2">分支 B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(branchA.snapshots.length, branchB.snapshots.length) }).map((_, i) => {
                        const sa = branchA.snapshots[i];
                        const sb = branchB.snapshots[i];
                        const common = diffAnalysis.commonSet.has(i);
                        const nodeDiff = diffAnalysis.nodeDiffSetA.has(i) || diffAnalysis.nodeDiffSetB.has(i);
                        const valDiff = sa && sb ? Math.abs(sa.curseValue - sb.curseValue) : null;

                        const rowBg =
                          nodeDiff ? 'bg-ember-900/10' :
                          common ? 'bg-verdant-900/8' :
                          valDiff && valDiff >= 3 ? 'bg-blood-900/12' :
                          !sa || !sb ? 'bg-ink-800/30' : '';

                        const renderCell = (s: typeof sa, side: 'A' | 'B') => s ? (
                          <div
                            onClick={() => handleJumpToScene(s.chapterId, s.sceneId)}
                            className="cursor-pointer hover:text-ash-200"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-ash-500">{s.chapterTitle}</span>
                              <ChevronRight className="w-2.5 h-2.5 text-ash-600" />
                              <span className="text-ash-300">{s.sceneTitle}</span>
                            </div>
                            {s.choiceText && (
                              <div className="text-ember-600 mt-0.5 truncate">选项：{s.choiceText}</div>
                            )}
                            {s.warning && (
                              <div className={cn('mt-0.5 flex items-center gap-0.5', s.warning === 'spike' ? 'text-blood-400' : 'text-ember-500')}>
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {s.warning === 'spike' ? '暴涨' : '解除过早'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-ash-600 italic">— 到此结束 —</span>
                        );

                        return (
                          <tr key={i} className={cn('border-b border-ink-800/40', rowBg)}>
                            <td className="px-5 py-2.5 text-ash-500 font-display">{i + 1}</td>
                            <td className="px-3 py-2.5 text-blood-300">{renderCell(sa, 'A')}</td>
                            <td className="text-center px-3 py-2.5">
                              <span className={cn('font-display text-sm', sa?.delta ? (sa.delta > 0 ? 'text-blood-400' : 'text-verdant-500') : 'text-ash-400')}>
                                {sa?.curseValue ?? '—'}
                              </span>
                            </td>
                            <td className="text-center px-3 py-2.5">
                              {valDiff === null ? (
                                <span className="text-ash-600">—</span>
                              ) : common ? (
                                <span className="text-verdant-500 flex items-center justify-center gap-0.5">
                                  <Check className="w-3 h-3" /> 一致
                                </span>
                              ) : nodeDiff ? (
                                <span className="px-1.5 py-0.5 rounded bg-ember-900/40 text-ember-400 border border-ember-700/50">
                                  ≠ 节点不同
                                </span>
                              ) : valDiff >= 3 ? (
                                <span className="px-1.5 py-0.5 rounded bg-blood-900/40 text-blood-400 border border-blood-700/50">
                                  Δ {valDiff}
                                </span>
                              ) : (
                                <span className="text-ash-500">Δ {valDiff}</span>
                              )}
                            </td>
                            <td className="text-center px-3 py-2.5">
                              <span className={cn('font-display text-sm', sb?.delta ? (sb.delta > 0 ? 'text-blood-400' : 'text-verdant-500') : 'text-ash-400')}>
                                {sb?.curseValue ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-frost-300">{renderCell(sb, 'B')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            branchA && (
              <div className="space-y-6 animate-fade-in">
                <div className="card-dark">
                  <div className="px-5 py-4 border-b border-ink-700/50 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-sm text-ash-100 tracking-wider">
                        {branchA.endingTitle || '未完结分支'}
                      </h3>
                      <p className="text-[11px] text-ash-600 font-body mt-0.5">
                        诅咒值变化曲线 · 点击节点可跳转至对应场景
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-body">
                      <span className="flex items-center gap-1 text-ash-600">
                        <ArrowUp className="w-2.5 h-2.5 text-blood-400" /> 暴涨 ≥3
                      </span>
                      <span className="flex items-center gap-1 text-ash-600">
                        <ArrowDown className="w-2.5 h-2.5 text-ember-500" /> 解除过早
                      </span>
                      <span className="flex items-center gap-1 text-ash-600">
                        <Skull className="w-2.5 h-2.5 text-blood-400" /> 加深
                      </span>
                      <span className="flex items-center gap-1 text-ash-600">
                        <CircleOff className="w-2.5 h-2.5 text-verdant-500" /> 解除
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    {renderSingleCurve(branchA)}
                  </div>
                </div>

                <div className="card-dark">
                  <div className="px-5 py-4 border-b border-ink-700/50">
                    <h3 className="font-display text-sm text-ash-100 tracking-wider">节点明细</h3>
                  </div>
                  <div className="divide-y divide-ink-700/40">
                    {branchA.snapshots.map((snap, idx) => (
                      <div
                        key={`${snap.sceneId}-${snap.choiceId || 'entry'}-${idx}`}
                        onClick={() => handleJumpToScene(snap.chapterId, snap.sceneId)}
                        className={cn(
                          'px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-ink-800/40 transition-colors',
                          snap.warning && 'bg-blood-900/10',
                        )}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-full border-2 border-ink-600 flex items-center justify-center">
                          <span className="text-[11px] font-display text-ash-400">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-ash-500 font-body">{snap.chapterTitle}</span>
                            <ChevronRight className="w-2.5 h-2.5 text-ash-600" />
                            <span className="text-sm text-ash-200 font-body truncate">{snap.sceneTitle}</span>
                          </div>
                          {snap.choiceText && (
                            <div className="text-[11px] text-ember-600 font-body mt-0.5 truncate">
                              选项：{snap.choiceText}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn(
                            'font-display text-sm',
                            snap.delta > 0 && 'text-blood-400',
                            snap.delta < 0 && 'text-verdant-500',
                            snap.delta === 0 && 'text-ash-500',
                          )}>
                            {snap.delta > 0 && '+'}{snap.delta}
                          </div>
                          <div className="text-[10px] text-ash-600 font-body">当前值：{snap.curseValue}</div>
                        </div>
                        {snap.warning === 'spike' && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-blood-900/40 text-blood-400 border border-blood-800/50 font-body flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> 诅咒值暴涨
                          </span>
                        )}
                        {snap.warning === 'early-release' && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-ember-800/40 text-ember-500 border border-ember-700/50 font-body flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> 解除过早
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
