import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  EyeOff,
  MessageSquare,
  Filter,
  ListTree,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { ISSUE_STATUS_LABEL, type IssueStatus, type ValidationCategory } from '@/types';

type GroupKey = 'writer' | 'chapter' | 'category' | 'type';

export default function ReviewDashboard() {
  const navigate = useNavigate();
  const writers = useAppStore((s) => s.writers);
  const chapters = useAppStore((s) => s.chapters);
  const validationIssues = useAppStore((s) => s.validationIssues);
  const setIssueStatus = useAppStore((s) => s.setIssueStatus);
  const setIssueStatusBatch = useAppStore((s) => s.setIssueStatusBatch);
  const runFullValidation = useAppStore((s) => s.runFullValidation);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const currentUser = writers.find((w) => w.id === currentUserId);
  const isLead = currentUser?.role === 'lead';

  const [groupBy, setGroupBy] = useState<GroupKey>('chapter');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all' | 'needsAttention'>('needsAttention');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

  const writerMap = useMemo(() => new Map(writers.map((w) => [w.id, w])), [writers]);
  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);
  const sceneMap = useMemo(() => {
    const m = new Map<string, { sceneId: string; title: string; chapterId: string; chapterTitle: string }>();
    for (const ch of chapters) {
      for (const sc of ch.scenes) {
        m.set(sc.id, { sceneId: sc.id, title: sc.title, chapterId: ch.id, chapterTitle: ch.title });
      }
    }
    return m;
  }, [chapters]);

  const displayIssues = useMemo(() => {
    return validationIssues.filter((i) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'needsAttention') {
        return i.status === 'open' || i.status === 'needs-lead';
      }
      return i.status === statusFilter;
    });
  }, [validationIssues, statusFilter]);

  const groupedIssues = useMemo(() => {
    const groups = new Map<string, { label: string; subtitle?: string; issues: typeof validationIssues; writerId?: string }>();
    for (const issue of displayIssues) {
      let key = '';
      let label = '';
      let subtitle = '';
      let writerId: string | undefined;
      switch (groupBy) {
        case 'writer': {
          let chapter = null;
          if (issue.chapterId) chapter = chapterMap.get(issue.chapterId);
          if (!chapter && issue.sceneId) {
            const sc = sceneMap.get(issue.sceneId);
            if (sc) chapter = chapterMap.get(sc.chapterId);
          }
          const wId = chapter?.writerId ?? 'unassigned';
          const writer = writerMap.get(wId);
          key = wId;
          writerId = wId;
          label = writer?.name ?? '未分配负责人';
          subtitle = writer?.role === 'lead' ? '主笔' : writer?.role === 'writer' ? '编剧' : '访客';
          break;
        }
        case 'chapter': {
          let chapter = null;
          if (issue.chapterId) chapter = chapterMap.get(issue.chapterId);
          if (!chapter && issue.sceneId) {
            const sc = sceneMap.get(issue.sceneId);
            if (sc) chapter = chapterMap.get(sc.chapterId);
          }
          key = chapter?.id ?? 'global';
          label = chapter?.title ?? '全局/结局铺垫';
          subtitle = chapter?.status ? `状态：${chapter.status}` : '';
          break;
        }
        case 'category': {
          const cat: Record<ValidationCategory, string> = {
            curse: '诅咒规则',
            character: '角色泄密',
            foreshadowing: '结局铺垫',
            connectivity: '逻辑连通',
            other: '其他',
          };
          key = issue.category;
          label = cat[issue.category] ?? issue.category;
          break;
        }
        case 'type': {
          const tMap: Record<string, string> = {
            error: '错误',
            warning: '警告',
            info: '提示',
          };
          key = issue.type;
          label = tMap[issue.type] ?? issue.type;
          break;
        }
      }
      if (!groups.has(key)) {
        groups.set(key, { label, subtitle, issues: [], writerId });
      }
      groups.get(key)!.issues.push(issue);
    }
    return Array.from(groups.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.issues.length - a.issues.length);
  }, [displayIssues, groupBy, writerMap, chapterMap, sceneMap]);

  const writerFullStats = useMemo(() => {
    const map = new Map<string, { total: number; open: number; needsLead: number; fixed: number; ignored: number; errors: number }>();
    for (const issue of validationIssues) {
      let chapter = null;
      if (issue.chapterId) chapter = chapterMap.get(issue.chapterId);
      if (!chapter && issue.sceneId) {
        const sc = sceneMap.get(issue.sceneId);
        if (sc) chapter = chapterMap.get(sc.chapterId);
      }
      const writerId = chapter?.writerId ?? 'unassigned';
      if (!map.has(writerId)) {
        map.set(writerId, { total: 0, open: 0, needsLead: 0, fixed: 0, ignored: 0, errors: 0 });
      }
      const s = map.get(writerId)!;
      s.total++;
      if (issue.status === 'open') s.open++;
      if (issue.status === 'needs-lead') s.needsLead++;
      if (issue.status === 'fixed') s.fixed++;
      if (issue.status === 'ignored') s.ignored++;
      if (issue.type === 'error') s.errors++;
    }
    return map;
  }, [validationIssues, chapterMap, sceneMap]);

  const toggleGroup = (k: string) => {
    const next = new Set(expandedGroups);
    next.has(k) ? next.delete(k) : next.add(k);
    setExpandedGroups(next);
  };

  const toggleIssueSelect = (id: string) => {
    const next = new Set(selectedIssueIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIssueIds(next);
  };

  const toggleAllInGroup = (issuesArr: typeof validationIssues) => {
    const next = new Set(selectedIssueIds);
    const allSelected = issuesArr.every((i) => next.has(i.id));
    if (allSelected) {
      issuesArr.forEach((i) => next.delete(i.id));
    } else {
      issuesArr.forEach((i) => next.add(i.id));
    }
    setSelectedIssueIds(next);
  };

  const handleBatchStatus = (status: IssueStatus) => {
    if (selectedIssueIds.size === 0) return;
    setIssueStatusBatch(Array.from(selectedIssueIds), status);
    setSelectedIssueIds(new Set());
  };

  const handleJumpToChapter = (issue: typeof validationIssues[number]) => {
    let chapterId = issue.chapterId;
    if (!chapterId && issue.sceneId) {
      const sc = sceneMap.get(issue.sceneId);
      if (sc) chapterId = sc.chapterId;
    }
    if (!chapterId) return;
    navigate('/chapters');
    setTimeout(() => {
      const ev = new CustomEvent('jump-to-scene', {
        detail: { chapterId, sceneId: issue.sceneId ?? null },
      });
      window.dispatchEvent(ev);
    }, 50);
  };

  const stats = useMemo(() => {
    const total = validationIssues.length;
    const open = validationIssues.filter((i) => i.status === 'open').length;
    const fixed = validationIssues.filter((i) => i.status === 'fixed').length;
    const ignored = validationIssues.filter((i) => i.status === 'ignored').length;
    const needsLead = validationIssues.filter((i) => i.status === 'needs-lead').length;
    const errors = validationIssues.filter((i) => i.type === 'error').length;
    const warnings = validationIssues.filter((i) => i.type === 'warning').length;
    const infos = validationIssues.filter((i) => i.type === 'info').length;
    return { total, open, fixed, ignored, needsLead, errors, warnings, infos };
  }, [validationIssues]);

  const getTypeIcon = (t: string) => {
    if (t === 'error') return <AlertTriangle className="w-3 h-3 text-blood-500" />;
    if (t === 'warning') return <AlertCircle className="w-3 h-3 text-ember-500" />;
    return <Info className="w-3 h-3 text-frost-500" />;
  };

  const getTypeBadge = (t: string) => {
    if (t === 'error') return 'bg-blood-900/40 border-blood-700/50 text-blood-300';
    if (t === 'warning') return 'bg-ember-800/30 border-ember-700/50 text-ember-500';
    return 'bg-void-800/30 border-void-700/50 text-frost-500';
  };

  const groupByOptions: { key: GroupKey; label: string; icon: any }[] = [
    { key: 'chapter', label: '按章节', icon: BookOpen },
    { key: 'writer', label: '按负责人', icon: Users },
    { key: 'category', label: '按校验类型', icon: ListTree },
    { key: 'type', label: '按严重度', icon: AlertTriangle },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="z-20 bg-ink-950/90 backdrop-blur-md border-b border-ink-700/60 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-blood-500" />
          <div>
            <h2 className="font-display text-lg text-ash-100 tracking-wider">主笔审稿台</h2>
            <p className="text-[11px] text-ash-600 font-body">
              集中处理全部校验问题，批量标记状态，快速跳转到对应章节
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              runFullValidation();
              setSelectedIssueIds(new Set());
            }}
            className="btn-primary flex items-center gap-1.5 !text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" /> 重新运行全部校验
          </button>
          {selectedIssueIds.size > 0 && (
            <div className="flex items-center gap-1 pl-2 ml-1 border-l border-ink-700/60">
              <span className="text-[11px] text-ash-400 font-body mr-1">
                已选 {selectedIssueIds.size} 条
              </span>
              <button
                onClick={() => handleBatchStatus('fixed')}
                className="btn-ghost !text-xs !px-2 !py-1 flex items-center gap-1 text-ash-300 hover:text-verdant-400"
              >
                <Check className="w-3 h-3" /> 标记已改
              </button>
              <button
                onClick={() => handleBatchStatus('ignored')}
                className="btn-ghost !text-xs !px-2 !py-1 flex items-center gap-1 text-ash-300 hover:text-ash-200"
              >
                <EyeOff className="w-3 h-3" /> 忽略
              </button>
              {isLead && (
                <button
                  onClick={() => handleBatchStatus('open')}
                  className="btn-ghost !text-xs !px-2 !py-1 flex items-center gap-1 text-ash-300 hover:text-ember-400"
                >
                  <MessageSquare className="w-3 h-3" /> 退回待处理
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 p-4 border-b border-ink-800 shrink-0">
        <div className="card-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-blood-400" />
            <span className="text-[11px] text-ash-500 font-body tracking-wide uppercase">错误</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-display text-blood-400">{stats.errors}</span>
            <span className="text-[10px] text-ash-600 font-body">需优先修复</span>
          </div>
        </div>
        <div className="card-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-ember-500" />
            <span className="text-[11px] text-ash-500 font-body tracking-wide uppercase">警告</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-display text-ember-500">{stats.warnings}</span>
            <span className="text-[10px] text-ash-600 font-body">建议审阅</span>
          </div>
        </div>
        <div className="card-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-ember-400" />
            <span className="text-[11px] text-ash-500 font-body tracking-wide uppercase">待主笔确认</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-display text-ember-400">{stats.needsLead}</span>
            <span className="text-[10px] text-ash-600 font-body">编剧提交</span>
          </div>
        </div>
        <div className="card-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-verdant-400" />
            <span className="text-[11px] text-ash-500 font-body tracking-wide uppercase">已修复 / 忽略</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-display text-verdant-400">{stats.fixed + stats.ignored}</span>
            <span className="text-[10px] text-ash-600 font-body">
              共 {stats.total} 条，{stats.total > 0 ? Math.round(((stats.fixed + stats.ignored) / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between border-b border-ink-800 shrink-0">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-ash-500" />
          <span className="text-[11px] text-ash-500 font-body mr-2">状态：</span>
          {([
            ['needsAttention', '待处理 + 待主笔'],
            ['all', '全部'],
            ['open', '待处理'],
            ['needs-lead', '待主笔确认'],
            ['fixed', '已改'],
            ['ignored', '已忽略'],
          ] as const).map(([val, label]) => {
            const active = statusFilter === val;
            return (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-body transition-colors',
                  active
                    ? 'bg-blood-900/40 text-blood-300 border border-blood-700/50'
                    : 'text-ash-500 hover:text-ash-300 hover:bg-ink-800',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-ash-500 font-body mr-2">分组：</span>
          {groupByOptions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setGroupBy(key);
                setExpandedGroups(new Set());
              }}
              className={cn(
                'px-2 py-1 rounded text-[11px] font-body transition-colors flex items-center gap-1',
                groupBy === key
                  ? 'bg-void-900/50 text-frost-400 border border-void-700/50'
                  : 'text-ash-500 hover:text-ash-300 hover:bg-ink-800',
              )}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {groupedIssues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Check className="w-10 h-10 text-verdant-400/50 mb-3" />
            <div className="font-display text-lg text-ash-300 mb-1">没有待处理的问题</div>
            <div className="text-[11px] text-ash-500 font-body max-w-xs">
              当前筛选条件下暂无校验问题，可以调整状态筛选或重新运行校验
            </div>
          </div>
        ) : (
          groupedIssues.map((group) => {
            const isOpen = expandedGroups.has(group.key);
            const groupErrors = group.issues.filter((i) => i.type === 'error').length;
            const groupWarnings = group.issues.filter((i) => i.type === 'warning').length;
            const groupNeedsLead = group.issues.filter((i) => i.status === 'needs-lead').length;
            const groupFixed = group.issues.filter((i) => i.status === 'fixed').length;
            const allSelected = group.issues.every((i) => selectedIssueIds.has(i.id));
            const someSelected = group.issues.some((i) => selectedIssueIds.has(i.id));
            const fullStats = group.writerId ? writerFullStats.get(group.writerId) : null;
            const isWriterGroup = groupBy === 'writer';
            const writer = group.writerId ? writerMap.get(group.writerId) : null;
            const completionRate = fullStats && fullStats.total > 0
              ? Math.round(((fullStats.fixed + fullStats.ignored) / fullStats.total) * 100)
              : 0;

            return (
              <div key={group.key} className="card-dark">
                {isWriterGroup && fullStats ? (
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-ink-800/50 transition-colors"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div className="flex items-start gap-3 mb-2.5">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blood-800 to-void-800 border-2 border-ink-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-ash-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-sm text-ash-100 tracking-wide">{group.label}</h4>
                          {writer?.role === 'lead' && (
                            <span className="px-1.5 py-0.5 bg-blood-900/50 border border-blood-700/50 text-[9px] text-blood-400 font-body tracking-wider">主笔</span>
                          )}
                          {writer?.role === 'writer' && (
                            <span className="px-1.5 py-0.5 bg-void-800/50 border border-void-700/50 text-[9px] text-frost-400 font-body tracking-wider">编剧</span>
                          )}
                        </div>
                        <div className="text-[11px] text-ash-500 font-body mt-0.5">
                          共 {fullStats.total} 条问题 · 完成度 {completionRate}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAllInGroup(group.issues);
                          }}
                          className="text-ash-500 hover:text-ash-300"
                        >
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = !allSelected && someSelected;
                            }}
                            onChange={() => toggleAllInGroup(group.issues)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 accent-blood-500 bg-ink-800 border-ink-600"
                          />
                        </button>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-ash-500" /> : <ChevronRight className="w-4 h-4 text-ash-500" />}
                      </div>
                    </div>
                    <div className="ml-13 grid grid-cols-4 gap-2 mb-2.5">
                      <div className="bg-blood-900/20 border border-blood-800/40 rounded-sm px-2 py-1.5 text-center">
                        <div className="text-lg font-display text-blood-400">{fullStats.open}</div>
                        <div className="text-[9px] text-ash-500 font-body">待处理</div>
                      </div>
                      <div className="bg-ember-900/20 border border-ember-800/40 rounded-sm px-2 py-1.5 text-center">
                        <div className="text-lg font-display text-ember-400">{fullStats.needsLead}</div>
                        <div className="text-[9px] text-ash-500 font-body">待主笔</div>
                      </div>
                      <div className="bg-verdant-900/20 border border-verdant-800/40 rounded-sm px-2 py-1.5 text-center">
                        <div className="text-lg font-display text-verdant-400">{fullStats.fixed}</div>
                        <div className="text-[9px] text-ash-500 font-body">已改</div>
                      </div>
                      <div className="bg-ink-800/60 border border-ink-700/50 rounded-sm px-2 py-1.5 text-center">
                        <div className="text-lg font-display text-ash-400">{fullStats.ignored}</div>
                        <div className="text-[9px] text-ash-500 font-body">已忽略</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-verdant-700 to-verdant-400 transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    {isLead && group.key !== currentUserId && (
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const ids = group.issues.filter((i) => i.status === 'open').map((i) => i.id);
                            if (ids.length > 0) setIssueStatusBatch(ids, 'fixed');
                          }}
                          className="px-2 py-0.5 text-[10px] bg-verdant-900/30 text-verdant-400 border border-verdant-700/40 rounded font-body hover:bg-verdant-900/50 transition-colors"
                        >
                          <Check className="w-3 h-3 inline mr-0.5 -mt-0.5" /> 全部标记已改
                        </button>
                        <button
                          onClick={() => {
                            const ids = group.issues.filter((i) => i.status === 'open').map((i) => i.id);
                            if (ids.length > 0) setIssueStatusBatch(ids, 'ignored');
                          }}
                          className="px-2 py-0.5 text-[10px] bg-ink-800 text-ash-400 border border-ink-600 rounded font-body hover:bg-ink-700 transition-colors"
                        >
                          <EyeOff className="w-3 h-3 inline mr-0.5 -mt-0.5" /> 全部忽略
                        </button>
                        {fullStats.needsLead > 0 && (
                          <button
                            onClick={() => {
                              const ids = group.issues.filter((i) => i.status === 'needs-lead').map((i) => i.id);
                              if (ids.length > 0) setIssueStatusBatch(ids, 'open');
                            }}
                            className="px-2 py-0.5 text-[10px] bg-blood-900/30 text-blood-400 border border-blood-700/40 rounded font-body hover:bg-blood-900/50 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3 inline mr-0.5 -mt-0.5" /> 退回待处理
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-ink-800/50 transition-colors"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => e.stopPropagation()} className="text-ash-500">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = !allSelected && someSelected;
                          }}
                          onChange={() => toggleAllInGroup(group.issues)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 accent-blood-500 bg-ink-800 border-ink-600"
                        />
                      </div>
                      <div>
                        <div className="font-display text-sm text-ash-200">{group.label}</div>
                        {group.subtitle && <div className="text-[10px] text-ash-500 font-body">{group.subtitle}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {groupErrors > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blood-900/40 border border-blood-700/50 rounded text-[10px] text-blood-300 font-body">
                          <AlertTriangle className="w-2.5 h-2.5" />{groupErrors}
                        </span>
                      )}
                      {groupWarnings > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-ember-800/30 border border-ember-700/50 rounded text-[10px] text-ember-500 font-body">
                          <AlertCircle className="w-2.5 h-2.5" />{groupWarnings}
                        </span>
                      )}
                      {groupNeedsLead > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-ember-900/30 border border-ember-700/40 rounded text-[10px] text-ember-400 font-body">
                          <MessageSquare className="w-2.5 h-2.5" />待确认 {groupNeedsLead}
                        </span>
                      )}
                      {groupFixed > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-verdant-900/20 border border-verdant-700/40 rounded text-[10px] text-verdant-500 font-body">
                          <Check className="w-2.5 h-2.5" />已改 {groupFixed}
                        </span>
                      )}
                      <span className="text-[11px] text-ash-500 font-body w-8 text-right">
                        {group.issues.length}
                      </span>
                    </div>
                  </div>
                )}
                {isOpen && (
                  <div className="border-t border-ink-800 divide-y divide-ink-800/50">
                    {group.issues.map((issue) => {
                      const selected = selectedIssueIds.has(issue.id);
                      const scene = issue.sceneId ? sceneMap.get(issue.sceneId) : null;
                      const locChapter = issue.chapterId
                        ? chapterMap.get(issue.chapterId)
                        : scene
                          ? chapterMap.get(scene.chapterId)
                          : null;
                      return (
                        <div
                          key={issue.id}
                          className={cn(
                            'px-3 py-2.5 pl-12 flex items-start gap-3 transition-colors',
                            issue.status === 'fixed' && 'opacity-60',
                            issue.status === 'ignored' && 'opacity-40',
                            selected && 'bg-void-900/20',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleIssueSelect(issue.id)}
                            className="w-3.5 h-3.5 accent-blood-500 bg-ink-800 border-ink-600 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[9px] font-body border shrink-0 mt-0.5',
                                  getTypeBadge(issue.type),
                                )}
                              >
                                {getTypeIcon(issue.type)}
                              </span>
                              <span className="text-xs text-ash-200 font-body leading-relaxed">
                                {issue.message}
                              </span>
                            </div>
                            {issue.quote && (
                              <div className="ml-5 mt-1 mb-1 px-2 py-1 bg-ink-900/70 border-l-2 border-blood-700/50 text-[10px] text-ash-500 font-mono leading-relaxed truncate">
                                「{issue.quote}」
                              </div>
                            )}
                            <div className="ml-5 flex items-center gap-2 flex-wrap text-[10px] font-body">
                              {issue.secretTopic && (
                                <span className="px-1.5 py-0.5 bg-void-800/50 border border-void-700/50 rounded text-void-300">
                                  🔒 {issue.secretTopic}
                                </span>
                              )}
                              {(locChapter || scene) && (
                                <button
                                  onClick={() => handleJumpToChapter(issue)}
                                  className="px-1.5 py-0.5 bg-ink-800 hover:bg-ink-700 border border-ink-600 rounded text-ash-400 hover:text-ash-200 transition-colors flex items-center gap-0.5"
                                >
                                  <BookOpen className="w-2.5 h-2.5" />
                                  {locChapter?.title ?? '全局'}
                                  {scene && (
                                    <>
                                      <ArrowRight className="w-2.5 h-2.5 mx-0.5 text-ash-600" />
                                      <span>{scene.title}</span>
                                    </>
                                  )}
                                </button>
                              )}
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded border',
                                  issue.status === 'open' && 'bg-blood-900/30 border-blood-700/40 text-blood-400',
                                  issue.status === 'fixed' && 'bg-verdant-900/20 border-verdant-700/40 text-verdant-500',
                                  issue.status === 'ignored' && 'bg-ink-800 border-ink-600 text-ash-500',
                                  issue.status === 'needs-lead' && 'bg-ember-900/30 border-ember-700/40 text-ember-400',
                                )}
                              >
                                {ISSUE_STATUS_LABEL[issue.status]}
                              </span>
                              {issue.status === 'needs-lead' && isLead && (
                                <span className="px-1.5 py-0.5 text-ember-300">⚑ 需您审阅</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => setIssueStatus(issue.id, 'fixed')}
                              className={cn(
                                'p-1 rounded transition-all',
                                issue.status === 'fixed'
                                  ? 'text-verdant-400 bg-verdant-900/30'
                                  : 'text-ash-600 hover:text-verdant-400 hover:bg-ink-700/50',
                              )}
                              title="标记已改"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setIssueStatus(issue.id, 'ignored')}
                              className={cn(
                                'p-1 rounded transition-all',
                                issue.status === 'ignored'
                                  ? 'text-ash-300 bg-ink-700/50'
                                  : 'text-ash-600 hover:text-ash-300 hover:bg-ink-700/50',
                              )}
                              title="忽略"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setIssueStatus(issue.id, 'needs-lead')}
                              className={cn(
                                'p-1 rounded transition-all',
                                issue.status === 'needs-lead'
                                  ? 'text-ember-400 bg-ember-900/30'
                                  : 'text-ash-600 hover:text-ember-400 hover:bg-ink-700/50',
                              )}
                              title="待主笔确认"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleJumpToChapter(issue)}
                              className="p-1 rounded text-ash-600 hover:text-ash-200 hover:bg-ink-700/50 transition-all"
                              title="跳转章节"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
