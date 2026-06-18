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
  GitBranch,
  CircleDot,
  X,
  GitCompareArrows,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ENDING_TYPE_LABEL } from '@/types';
import { type CurseFlowBranch } from '@/utils/validation';
import { cn } from '@/lib/utils';

const COLOR_A = { stroke: 'rgba(239, 68, 68, 0.85)', dot: '#ef4444', text: 'text-blood-400', label: 'A' };
const COLOR_B = { stroke: 'rgba(56, 189, 248, 0.85)', dot: '#38bdf8', text: 'text-frost-400', label: 'B' };
const COLOR_COMMON = { dot: '#52b788', stroke: 'rgba(82, 183, 136, 0.6)' };

export default function CurseFlow() {
  const navigate = useNavigate();
  const chapters = useAppStore((s) => s.chapters);
  const endings = useAppStore((s) => s.endings);
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

  const renderCompareCurves = (a: CurseFlowBranch, b: CurseFlowBranch) => {
    const maxVal = Math.max(globalMax, a.maxCurse, b.maxCurse, 1);
    const maxLen = Math.max(a.snapshots.length, b.snapshots.length);
    const width = 820;
    const height = 220;
    const padding = 28;
    const stepX = (width - padding * 2) / Math.max(maxLen - 1, 1);

    const buildPoints = (branch: CurseFlowBranch) =>
      branch.snapshots.map((s, i) => {
        const x = padding + i * stepX;
        const y = height - padding - (s.curseValue / maxVal) * (height - padding * 2);
        return { x, y, snapshot: s };
      });

    const pointsA = buildPoints(a);
    const pointsB = buildPoints(b);

    const commonSet = (() => {
      const set = new Set<string>();
      const bScenes = new Map(b.snapshots.map((s) => [`${s.chapterId}|${s.sceneId}|${s.choiceId ?? ''}`, s]));
      for (const sa of a.snapshots) {
        const key = `${sa.chapterId}|${sa.sceneId}|${sa.choiceId ?? ''}`;
        const sb = bScenes.get(key);
        if (sb && Math.abs(sa.curseValue - sb.curseValue) < 3) {
          set.add(key);
        }
      }
      return set;
    })();

    const isCommon = (s: typeof a.snapshots[number]) =>
      commonSet.has(`${s.chapterId}|${s.sceneId}|${s.choiceId ?? ''}`);

    const diffSetA = new Set(
      a.snapshots
        .map((s, i) => ({ s, i }))
        .filter(({ s, i }) => {
          if (isCommon(s)) return false;
          const sb = b.snapshots[i];
          if (!sb) return true;
          return Math.abs(s.curseValue - sb.curseValue) >= 3;
        })
        .map(({ s, i }) => i),
    );
    const diffSetB = new Set(
      b.snapshots
        .map((s, i) => ({ s, i }))
        .filter(({ s, i }) => {
          if (isCommon(s)) return false;
          const sa = a.snapshots[i];
          if (!sa) return true;
          return Math.abs(s.curseValue - sa.curseValue) >= 3;
        })
        .map(({ s, i }) => i),
    );

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

        <path d={buildPath(pointsA)} fill="none" stroke={COLOR_A.stroke} strokeWidth="2.2" opacity="0.9" />
        <path d={buildPath(pointsB)} fill="none" stroke={COLOR_B.stroke} strokeWidth="2.2" opacity="0.9" strokeDasharray="6,3" />

        {pointsA.map((p, i) => {
          const common = isCommon(p.snapshot);
          const isDiff = diffSetA.has(i);
          return (
            <g key={`a-${i}`} onClick={() => handleJumpToScene(p.snapshot.chapterId, p.snapshot.sceneId)} className="cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r={common ? 4 : isDiff ? 7 : 5}
                fill={common ? COLOR_COMMON.dot : COLOR_A.dot}
                stroke={isDiff ? '#fca5a5' : '#0a0a0f'}
                strokeWidth={isDiff ? 3 : 2}
              />
              {isDiff && (
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  fill="#fca5a5"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  Δ{Math.abs(p.snapshot.curseValue - (b.snapshots[i]?.curseValue ?? 0))}
                </text>
              )}
              {!isDiff && (
                <text
                  x={p.x}
                  y={p.y + 17}
                  textAnchor="middle"
                  fill={common ? 'rgba(148, 163, 184, 0.6)' : 'rgba(252, 165, 165, 0.85)'}
                  fontSize="8.5"
                  fontFamily="JetBrains Mono"
                >
                  {p.snapshot.curseValue}
                </text>
              )}
            </g>
          );
        })}

        {pointsB.map((p, i) => {
          const common = isCommon(p.snapshot);
          const isDiff = diffSetB.has(i);
          if (common) return null;
          return (
            <g key={`b-${i}`} onClick={() => handleJumpToScene(p.snapshot.chapterId, p.snapshot.sceneId)} className="cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r={isDiff ? 7 : 5}
                fill={COLOR_B.dot}
                stroke={isDiff ? '#7dd3fc' : '#0a0a0f'}
                strokeWidth={isDiff ? 3 : 2}
                opacity="0.95"
              />
              {isDiff && (
                <text
                  x={p.x}
                  y={p.y + 20}
                  textAnchor="middle"
                  fill="#7dd3fc"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  Δ{Math.abs(p.snapshot.curseValue - (a.snapshots[i]?.curseValue ?? 0))}
                </text>
              )}
              {!isDiff && (
                <text
                  x={p.x}
                  y={p.y + 17}
                  textAnchor="middle"
                  fill="rgba(125, 211, 252, 0.9)"
                  fontSize="8.5"
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
              诅咒值走向{isCompareMode ? ' · 分支对比' : ''}
            </h2>
            <p className="text-[11px] text-ash-600 font-body">
              {isCompareMode
                ? '对比两条分支：共同节点=绿色，差异节点=亮色加粗并标注差值'
                : '跨章节分支诅咒值变化曲线，预警异常波动。选中两条进入对比模式'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompareMode && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-void-800/50 border border-void-700/60 text-[11px] text-frost-400 font-body">
              <GitCompareArrows className="w-3 h-3" /> 对比模式
            </span>
          )}
          {hasWarnings && (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-blood-900/30 border border-blood-700/50 text-[11px] text-blood-400 font-body">
              <Zap className="w-3 h-3" /> 检测到 {branches.flatMap((b) => b.snapshots.filter((s) => s.warning)).length} 处异常
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
              {isCompareMode ? `对比：A / B（最多2条）` : '分支路径'}
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
                  选 1 条看单条曲线，选 2 条进入对比模式
                </p>
              </div>
            </div>
          ) : isCompareMode && branchA && branchB ? (
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
                    <h3 className="font-display text-sm text-ash-100 tracking-wider">分支对比曲线</h3>
                    <p className="text-[11px] text-ash-600 font-body mt-0.5">
                      绿色=共同节点 · 亮色加粗=差异节点 · 点击节点跳转场景
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-body">
                    <span className="flex items-center gap-1 text-ash-600">
                      <span className="w-3 h-3 rounded-full bg-blood-500" /> 分支 A
                    </span>
                    <span className="flex items-center gap-1 text-ash-600">
                      <span className="w-3 h-3 rounded-full bg-frost-500" /> 分支 B（虚线）
                    </span>
                    <span className="flex items-center gap-1 text-ash-600">
                      <span className="w-3 h-3 rounded-full bg-verdant-500" /> 共同节点
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  {renderCompareCurves(branchA, branchB)}
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
                        <th className="text-left px-3 py-2">分支 A（{branchA.endingTitle?.slice(0, 12) || '未完结'}…）</th>
                        <th className="text-center px-3 py-2 w-14">诅咒值</th>
                        <th className="text-center px-3 py-2 w-14">差值</th>
                        <th className="text-center px-3 py-2 w-14">诅咒值</th>
                        <th className="text-left px-3 py-2">分支 B（{branchB.endingTitle?.slice(0, 12) || '未完结'}…）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(branchA.snapshots.length, branchB.snapshots.length) }).map((_, i) => {
                        const sa = branchA.snapshots[i];
                        const sb = branchB.snapshots[i];
                        const diff = sa && sb ? Math.abs(sa.curseValue - sb.curseValue) : null;
                        const common =
                          sa && sb &&
                          sa.chapterId === sb.chapterId &&
                          sa.sceneId === sb.sceneId &&
                          (sa.choiceId ?? '') === (sb.choiceId ?? '') &&
                          (diff ?? 99) < 3;
                        const rowBg =
                          diff && diff >= 3 ? 'bg-blood-900/15' :
                          common ? 'bg-verdant-900/10' :
                          !sa || !sb ? 'bg-ink-800/30' : '';

                        const renderCell = (s: typeof sa, color: string) => s ? (
                          <>
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
                          </>
                        ) : (
                          <span className="text-ash-600 italic">— 分支到此结束 —</span>
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
                              {diff === null ? (
                                <span className="text-ash-600">—</span>
                              ) : diff >= 3 ? (
                                <span className="px-1.5 py-0.5 rounded bg-blood-900/40 text-blood-400 border border-blood-700/50">
                                  Δ {diff}
                                </span>
                              ) : common ? (
                                <span className="text-verdant-500 flex items-center justify-center gap-0.5">
                                  <Check className="w-3 h-3" /> 一致
                                </span>
                              ) : (
                                <span className="text-ash-500">Δ {diff}</span>
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
