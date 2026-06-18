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
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ENDING_TYPE_LABEL } from '@/types';
import { type CurseFlowBranch } from '@/utils/validation';
import { cn } from '@/lib/utils';

export default function CurseFlow() {
  const navigate = useNavigate();
  const chapters = useAppStore((s) => s.chapters);
  const endings = useAppStore((s) => s.endings);
  const buildCurseFlow = useAppStore((s) => s.buildCurseFlow);
  const [selectedBranchKey, setSelectedBranchKey] = useState<string | null>(null);

  const branches = useMemo(() => buildCurseFlow(), [buildCurseFlow]);
  const selectedBranch = useMemo(
    () => branches.find((b) => b.branchKey === selectedBranchKey) ?? null,
    [branches, selectedBranchKey],
  );

  const globalMax = useMemo(
    () => Math.max(...branches.map((b) => b.maxCurse), 0),
    [branches],
  );
  const hasWarnings = useMemo(
    () => branches.some((b) => b.snapshots.some((s) => s.warning)),
    [branches],
  );

  const handleJumpToScene = (chapterId: string, sceneId: string) => {
    navigate('/chapters');
    setTimeout(() => {
      const event = new CustomEvent('jump-to-scene', { detail: { chapterId, sceneId } });
      window.dispatchEvent(event);
    }, 100);
  };

  const renderCurve = (branch: CurseFlowBranch) => {
    const maxVal = Math.max(globalMax, 1);
    const width = 720;
    const height = 180;
    const padding = 20;
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

    return (
      <svg width={width} height={height} className="w-full">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="3,3"
        />
        {Array.from({ length: 5 }).map((_, i) => {
          const y = height - padding - ((i + 1) / 5) * (height - padding * 2);
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2,4"
            />
          );
        })}
        <path
          d={pathD}
          fill="none"
          stroke={
            branch.snapshots.some((s) => s.warning === 'spike')
              ? 'rgba(239, 68, 68, 0.8)'
              : branch.snapshots.some((s) => s.warning === 'early-release')
                ? 'rgba(245, 158, 11, 0.8)'
                : 'rgba(82, 183, 136, 0.8)'
          }
          strokeWidth="2"
          className="drop-shadow-[0_0_6px_rgba(82,183,136,0.3)]"
        />
        {points.map((p, i) => (
          <g key={i} onClick={() => handleJumpToScene(p.snapshot.chapterId, p.snapshot.sceneId)} className="cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r={p.snapshot.warning ? 6 : 4}
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
                y={p.y - 12}
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
              y={p.y + 16}
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="z-20 bg-ink-950/90 backdrop-blur-md border-b border-ink-700/60 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-ember-500" />
          <div>
            <h2 className="font-display text-lg text-ash-100 tracking-wider">诅咒值走向</h2>
            <p className="text-[11px] text-ash-600 font-body">跨章节分支诅咒值变化曲线，预警异常波动</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="p-3 border-b border-ink-700/60">
            <div className="label-dark">分支路径</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {branches.map((branch) => {
              const hasWarn = branch.snapshots.some((s) => s.warning);
              const isSelected = branch.branchKey === selectedBranchKey;
              return (
                <button
                  key={branch.branchKey}
                  onClick={() => setSelectedBranchKey(branch.branchKey)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-sm border transition-all duration-200',
                    isSelected
                      ? 'bg-ember-900/20 border-ember-600/60 shadow-glow-orange-xs'
                      : 'bg-transparent border-transparent hover:bg-ink-800/60 hover:border-ink-600',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ash-200 font-body truncate">
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
          {selectedBranch ? (
            <div className="space-y-6 animate-fade-in">
              <div className="card-dark">
                <div className="px-5 py-4 border-b border-ink-700/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-sm text-ash-100 tracking-wider">
                      {selectedBranch.endingTitle || '未完结分支'}
                    </h3>
                    <p className="text-[11px] text-ash-600 font-body mt-0.5">
                      诅咒值变化曲线 · 点击节点可跳转至对应场景
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-body">
                    <span className="flex items-center gap-1 text-ash-600">
                      <ArrowUp className="w-2.5 h-2.5 text-blood-400" />
                      暴涨 ≥3
                    </span>
                    <span className="flex items-center gap-1 text-ash-600">
                      <ArrowDown className="w-2.5 h-2.5 text-ember-500" />
                      解除过早
                    </span>
                    <span className="flex items-center gap-1 text-ash-600">
                      <Skull className="w-2.5 h-2.5 text-blood-400" />
                      加深
                    </span>
                    <span className="flex items-center gap-1 text-ash-600">
                      <CircleOff className="w-2.5 h-2.5 text-verdant-500" />
                      解除
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  {renderCurve(selectedBranch)}
                </div>
              </div>

              <div className="card-dark">
                <div className="px-5 py-4 border-b border-ink-700/50">
                  <h3 className="font-display text-sm text-ash-100 tracking-wider">节点明细</h3>
                </div>
                <div className="divide-y divide-ink-700/40">
                  {selectedBranch.snapshots.map((snap, idx) => (
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
                          <span className="text-[11px] text-ash-500 font-body">
                            {snap.chapterTitle}
                          </span>
                          <ChevronRight className="w-2.5 h-2.5 text-ash-600" />
                          <span className="text-sm text-ash-200 font-body truncate">
                            {snap.sceneTitle}
                          </span>
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
                        <div className="text-[10px] text-ash-600 font-body">
                          当前值：{snap.curseValue}
                        </div>
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
          ) : (
            <div className="h-full flex items-center justify-center text-ash-600">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-body">请从左侧选择一条分支路径</p>
                <p className="text-[11px] text-ash-600 font-body mt-1">
                  查看该分支在各章节场景中的诅咒值变化
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
