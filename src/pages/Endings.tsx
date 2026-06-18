import { useState, useMemo } from 'react';
import {
  ScrollText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  Link2,
  AlertTriangle,
  Plus,
  Save,
  Trash2,
  Edit3,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  ENDING_TYPE_LABEL,
  ENDING_STATUS_LABEL,
  type EndingType,
  type EndingStatus,
  type Ending,
} from '@/types';
import { buildClueRevelationMap, type ClueRevelationInfo } from '@/utils/validation';
import { cn } from '@/lib/utils';

const ENDING_TYPES: { type: EndingType; label: string; color: string; glow: string; accent: string }[] = [
  { type: 'true', label: '真结局', color: 'from-verdant-800/60 to-verdant-900/40', glow: 'shadow-glow-green', accent: 'border-verdant-600/60 text-verdant-500' },
  { type: 'bad', label: '坏结局', color: 'from-ember-800/60 to-ember-900/40', glow: 'shadow-glow-orange', accent: 'border-ember-600/60 text-ember-600' },
  { type: 'loop', label: '循环结局', color: 'from-void-800/60 to-void-900/40', glow: 'shadow-glow-purple', accent: 'border-void-600/60 text-frost-500' },
  { type: 'hidden', label: '隐藏结局', color: 'from-frost-700/40 to-ink-800/60', glow: 'shadow-glow-silver', accent: 'border-frost-600/50 text-frost-500' },
];

export default function Endings() {
  const endings = useAppStore((s) => s.endings);
  const chapters = useAppStore((s) => s.chapters);
  const clues = useAppStore((s) => s.clues);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const writers = useAppStore((s) => s.writers);
  const currentUser = writers.find((w) => w.id === currentUserId);
  const isLead = currentUser?.role === 'lead';

  const setEndingStatus = useAppStore((s) => s.setEndingStatus);
  const updateEnding = useAppStore((s) => s.updateEnding);
  const addEnding = useAppStore((s) => s.addEnding);
  const deleteEnding = useAppStore((s) => s.deleteEnding);

  const [activeType, setActiveType] = useState<EndingType | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Ending>>({
    type: 'true',
    title: '',
    description: '',
    requiredClueIds: [],
    entryCondition: '',
    chapterId: chapters[0]?.id,
    status: 'pending',
  });

  const filteredEndings = useMemo(
    () => (activeType === 'all' ? endings : endings.filter((e) => e.type === activeType)),
    [endings, activeType],
  );

  const counts = useMemo(() => {
    const res: Record<EndingType, { total: number; approved: number }> = {
      true: { total: 0, approved: 0 },
      bad: { total: 0, approved: 0 },
      loop: { total: 0, approved: 0 },
      hidden: { total: 0, approved: 0 },
    };
    endings.forEach((e) => {
      res[e.type].total++;
      if (e.status === 'approved') res[e.type].approved++;
    });
    return res;
  }, [endings]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (ending: Ending) => {
    setForm({ ...ending });
    setEditingId(ending.id);
    setCreating(false);
    setExpandedIds((prev) => new Set([...prev, ending.id]));
  };

  const startCreate = () => {
    setForm({
      type: activeType === 'all' ? 'true' : activeType,
      title: '',
      description: '',
      requiredClueIds: [],
      entryCondition: '',
      chapterId: chapters[0]?.id,
      status: 'pending',
    });
    setCreating(true);
    setEditingId(null);
  };

  const saveForm = () => {
    if (!form.title?.trim()) return;
    if (creating) {
      addEnding(form as Omit<Ending, 'id'>);
      setCreating(false);
    } else if (editingId) {
      updateEnding(editingId, form);
      setEditingId(null);
    }
  };

  const toggleClue = (clueId: string) => {
    const current = form.requiredClueIds ?? [];
    const next = current.includes(clueId)
      ? current.filter((x) => x !== clueId)
      : [...current, clueId];
    setForm({ ...form, requiredClueIds: next });
  };

  const getChapterTitle = (id?: string) => chapters.find((c) => c.id === id)?.title ?? '未指定';

  const clueRevelationMap = useMemo(() => {
    return buildClueRevelationMap(chapters, clues);
  }, [chapters, clues]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="z-20 bg-ink-950/90 backdrop-blur-md border-b border-ink-700/60 px-8 py-5 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-blood-500" />
            <div>
              <h2 className="font-display text-2xl text-ash-100 tracking-wider">结局看板</h2>
              <p className="text-xs text-ash-600 mt-0.5 font-body">
                按类型汇总全部路线，审核进入条件与铺垫完整度
              </p>
            </div>
          </div>
          {isLead && (
            <button onClick={startCreate} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> 新增结局
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {ENDING_TYPES.map((et) => {
            const data = counts[et.type];
            const isActive = activeType === et.type;
            return (
              <button
                key={et.type}
                onClick={() => setActiveType(isActive ? 'all' : et.type)}
                className={cn(
                  'relative overflow-hidden text-left p-4 border transition-all duration-300',
                  `bg-gradient-to-br ${et.color}`,
                  isActive
                    ? `${et.accent} ${et.glow} scale-[1.02]`
                    : 'border-ink-600/50 hover:border-ink-500',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'font-display text-sm tracking-wider',
                    isActive ? et.accent.split(' ').pop() : 'text-ash-200',
                  )}>
                    {et.label}
                  </span>
                  <div className="text-[10px] text-ash-500 font-body flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-verdant-500/70" />
                    {data.approved}/{data.total}
                  </div>
                </div>
                <div className="mt-2">
                  <span className={cn(
                    'font-display text-4xl tracking-tight',
                    et.accent.split(' ').pop(),
                  )}>
                    {data.total}
                  </span>
                </div>
                <div className="mt-2 h-0.5 bg-ink-800/60 overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      et.type === 'true' && 'bg-verdant-500',
                      et.type === 'bad' && 'bg-ember-600',
                      et.type === 'loop' && 'bg-frost-500',
                      et.type === 'hidden' && 'bg-frost-600',
                    )}
                    style={{ width: data.total ? `${(data.approved / data.total) * 100}%` : '0%' }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-3">
          {creating && (
            <div className="card-dark border-l-4 border-l-blood-600 p-5 animate-fade-in">
              <EndingForm
                form={form}
                setForm={setForm}
                chapters={chapters}
                clues={clues}
                onCancel={() => setCreating(false)}
                onSave={saveForm}
                mode="create"
              />
            </div>
          )}

          {filteredEndings.length === 0 && !creating && (
            <div className="text-center py-16 text-ash-600">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-body text-sm">此分类下暂无结局</p>
            </div>
          )}

          {filteredEndings.map((ending) => {
            const isExpanded = expandedIds.has(ending.id);
            const isEditing = editingId === ending.id;
            const et = ENDING_TYPES.find((x) => x.type === ending.type)!;
            const missingClues = ending.requiredClueIds.filter((id) => !clueRevelationMap.get(id)?.isRevealed);
            return (
              <div
                key={ending.id}
                className={cn(
                  'card-dark overflow-hidden animate-fade-in transition-all duration-300',
                  isExpanded && et.glow,
                )}
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-ink-800/40 transition-colors"
                  onClick={() => !isEditing && toggleExpand(ending.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className={cn('w-4 h-4 shrink-0', et.accent.split(' ').pop())} />
                  ) : (
                    <ChevronRight className={cn('w-4 h-4 shrink-0', et.accent.split(' ').pop())} />
                  )}

                  <div className={cn(
                    'px-2.5 py-1 text-[11px] font-body border shrink-0',
                    et.accent,
                    `bg-gradient-to-br ${et.color}`,
                  )}>
                    {ENDING_TYPE_LABEL[ending.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base text-ash-100 tracking-wide truncate">{ending.title}</h3>
                    <p className="text-[11px] text-ash-600 mt-0.5 font-body truncate">
                      {getChapterTitle(ending.chapterId)} · 需 {ending.requiredClueIds.length} 条线索
                    </p>
                  </div>

                  {missingClues.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blood-900/30 border border-blood-800/50 text-[10px] text-blood-400 font-body shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                      {missingClues.length} 条线索未铺垫
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge status={ending.status} />
                    {isLead && !isEditing && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(ending); }}
                          className="p-1.5 text-ash-500 hover:text-ash-200 hover:bg-ink-700/60 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEnding(ending.id); }}
                          className="p-1.5 text-ash-500 hover:text-blood-400 hover:bg-blood-900/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-ink-700/50 px-5 py-4 animate-fade-in">
                    {isEditing ? (
                      <EndingForm
                        form={form}
                        setForm={setForm}
                        chapters={chapters}
                        clues={clues}
                        onCancel={() => setEditingId(null)}
                        onSave={saveForm}
                        mode="edit"
                      />
                    ) : (
                      <EndingDetail
                        ending={ending}
                        clues={clues}
                        missingClues={missingClues}
                        clueRevelationMap={clueRevelationMap}
                        isLead={!!isLead}
                        onSetStatus={(s) => setEndingStatus(ending.id, s)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EndingStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-body border',
      status === 'approved' && 'bg-verdant-800/40 text-verdant-500 border-verdant-700/50',
      status === 'rejected' && 'bg-blood-900/40 text-blood-400 border-blood-700/60',
      status === 'pending' && 'bg-ink-700/60 text-ash-400 border-ink-600',
    )}>
      {status === 'approved' && <Check className="w-2.5 h-2.5" />}
      {status === 'rejected' && <X className="w-2.5 h-2.5" />}
      {status === 'pending' && <Clock className="w-2.5 h-2.5" />}
      {ENDING_STATUS_LABEL[status]}
    </span>
  );
}

interface EndingDetailProps {
  ending: Ending;
  clues: any[];
  missingClues: string[];
  clueRevelationMap: Map<string, ClueRevelationInfo>;
  isLead: boolean;
  onSetStatus: (s: EndingStatus) => void;
}

function EndingDetail({ ending, clues, missingClues, clueRevelationMap, isLead, onSetStatus }: EndingDetailProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label-dark">结局描述</label>
        <p className="text-sm text-ash-300 font-body leading-relaxed whitespace-pre-wrap bg-ink-900/50 p-3 border border-ink-700/50">
          {ending.description || '（暂无描述）'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-dark flex items-center gap-1.5"><Eye className="w-3 h-3" />进入条件</label>
          <p className="text-sm text-ash-400 font-body leading-relaxed bg-ink-900/50 p-3 border border-ink-700/50 min-h-[60px]">
            {ending.entryCondition || '（未设置）'}
          </p>
        </div>
        <div>
          <label className="label-dark flex items-center gap-1.5"><Link2 className="w-3 h-3" />所需线索铺垫</label>
          <div className="bg-ink-900/50 border border-ink-700/50 p-3 min-h-[60px]">
            {ending.requiredClueIds.length === 0 ? (
              <p className="text-sm text-ash-600 font-body">（无需特定线索）</p>
            ) : (
              <div className="space-y-2">
                {ending.requiredClueIds.map((cid) => {
                  const clue = clues.find((c) => c.id === cid);
                  const info = clueRevelationMap.get(cid);
                  const isMissing = missingClues.includes(cid);
                  return (
                    <div
                      key={cid}
                      className={cn(
                        'px-3 py-2 border text-[12px] font-body',
                        isMissing
                          ? 'bg-blood-900/20 border-blood-700/60'
                          : 'bg-verdant-800/10 border-verdant-700/40',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isMissing ? (
                          <XCircle className="w-3 h-3 text-blood-400 shrink-0" />
                        ) : (
                          <Check className="w-3 h-3 text-verdant-500 shrink-0" />
                        )}
                        <span className={cn(
                          'font-body',
                          isMissing ? 'text-blood-400' : 'text-verdant-500',
                        )}>
                          {clue?.name ?? cid}
                        </span>
                        <span className="opacity-50 text-[10px]">[{clue?.level}]</span>
                      </div>
                      {info && info.isRevealed && info.revealedInChapters.length > 0 && (
                        <div className="ml-5 text-[11px] text-ash-500 space-y-0.5">
                          <span className="text-ash-600">已出现在：</span>
                          {info.revealedInChapters.map((r, idx) => (
                            <div key={idx} className="ml-2 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-verdant-500/60" />
                              <span>{r.chapterTitle} · {r.sceneTitle}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isMissing && (
                        <div className="ml-5 text-[11px] text-blood-400/70">
                          尚未在任何章节中出现，需在进入此结局前铺垫
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLead && (
        <div className="pt-3 border-t border-ink-700/50 flex items-center justify-end gap-2">
          <span className="text-[11px] text-ash-600 font-body mr-1">审批：</span>
          <button
            onClick={() => onSetStatus('rejected')}
            className={cn(
              'btn-ghost !text-xs !py-1 flex items-center gap-1',
              ending.status === 'rejected' && '!text-blood-400 !border-blood-700/60',
            )}
          >
            <XCircle className="w-3 h-3" /> 退回修改
          </button>
          <button
            onClick={() => onSetStatus('pending')}
            className={cn(
              'btn-ghost !text-xs !py-1 flex items-center gap-1',
              ending.status === 'pending' && '!text-ash-300 !border-ash-600',
            )}
          >
            <Clock className="w-3 h-3" /> 待审
          </button>
          <button
            onClick={() => onSetStatus('approved')}
            className={cn(
              'btn-ghost !text-xs !py-1 flex items-center gap-1',
              ending.status === 'approved' && '!text-verdant-500 !border-verdant-700/60',
            )}
          >
            <CheckCircle2 className="w-3 h-3" /> 通过
          </button>
        </div>
      )}
    </div>
  );
}

interface EndingFormProps {
  form: Partial<Ending>;
  setForm: (f: Partial<Ending>) => void;
  chapters: any[];
  clues: any[];
  onCancel: () => void;
  onSave: () => void;
  mode: 'create' | 'edit';
}

function EndingForm({ form, setForm, chapters, clues, onCancel, onSave, mode }: EndingFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label-dark">结局类型</label>
          <select
            value={form.type ?? 'true'}
            onChange={(e) => setForm({ ...form, type: e.target.value as EndingType })}
            className="input-dark"
          >
            {ENDING_TYPES.map((et) => (
              <option key={et.type} value={et.type}>{et.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-dark">标题</label>
          <input
            value={form.title ?? ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="结局名称"
            className="input-dark"
          />
        </div>
        <div>
          <label className="label-dark">所属章节</label>
          <select
            value={form.chapterId ?? ''}
            onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
            className="input-dark"
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label-dark">结局描述</label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="描述这个结局发生了什么..."
          className="textarea-dark min-h-[100px]"
        />
      </div>
      <div>
        <label className="label-dark">进入条件</label>
        <textarea
          value={form.entryCondition ?? ''}
          onChange={(e) => setForm({ ...form, entryCondition: e.target.value })}
          placeholder="玩家需要满足什么条件才能进入此结局..."
          className="textarea-dark min-h-[60px]"
        />
      </div>
      <div>
        <label className="label-dark flex items-center gap-1.5"><Link2 className="w-3 h-3" />必须收集的线索</label>
        <div className="flex flex-wrap gap-1.5 bg-ink-900/50 border border-ink-700/50 p-3">
          {clues.map((cl) => {
            const active = (form.requiredClueIds ?? []).includes(cl.id);
            return (
              <button
                key={cl.id}
                onClick={() => {
                  const current = form.requiredClueIds ?? [];
                  const next = current.includes(cl.id)
                    ? current.filter((x) => x !== cl.id)
                    : [...current, cl.id];
                  setForm({ ...form, requiredClueIds: next });
                }}
                className={cn(
                  'px-2 py-1 text-[11px] font-body border transition-all',
                  active
                    ? 'bg-void-800/40 text-frost-500 border-void-700/50'
                    : 'bg-ink-800/60 text-ash-500 border-ink-600 hover:border-ink-500',
                )}
              >
                {cl.name} [{cl.level}]
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-ghost">取消</button>
        <button onClick={onSave} className="btn-primary flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" />
          {mode === 'create' ? '创建结局' : '保存修改'}
        </button>
      </div>
    </div>
  );
}
