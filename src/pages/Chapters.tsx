import { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Play,
  ChevronRight,
  ChevronDown,
  User,
  Lock,
  Unlock,
  X,
  ArrowRight,
  Skull,
  Link2,
  ShieldCheck,
  Loader2,
  Check,
  EyeOff,
  MessageSquare,
  Filter,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  CHAPTER_STATUS_LABEL,
  VALIDATION_CATEGORY_LABEL,
  SECRET_LEVEL_LABEL,
  ISSUE_STATUS_LABEL,
  type ChapterStatus,
  type Scene,
  type Choice,
  type ValidationIssue,
  type IssueStatus,
} from '@/types';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: ChapterStatus[] = ['draft', 'writing', 'review', 'done'];

export default function Chapters() {
  const chapters = useAppStore((s) => s.chapters);
  const writers = useAppStore((s) => s.writers);
  const rules = useAppStore((s) => s.rules);
  const characters = useAppStore((s) => s.characters);
  const clues = useAppStore((s) => s.clues);
  const endings = useAppStore((s) => s.endings);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const currentUser = writers.find((w) => w.id === currentUserId);
  const isLead = currentUser?.role === 'lead';
  const validationIssues = useAppStore((s) => s.validationIssues);
  const runChapterValidation = useAppStore((s) => s.runChapterValidation);
  const clearChapterIssues = useAppStore((s) => s.clearChapterIssues);
  const setIssueStatus = useAppStore((s) => s.setIssueStatus);
  const pendingForeshadowing = useAppStore((s) => s.pendingForeshadowing);
  const clearPendingForeshadowing = useAppStore((s) => s.clearPendingForeshadowing);

  const updateChapter = useAppStore((s) => s.updateChapter);
  const setChapterWriter = useAppStore((s) => s.setChapterWriter);
  const setChapterStatus = useAppStore((s) => s.setChapterStatus);
  const addScene = useAppStore((s) => s.addScene);
  const updateScene = useAppStore((s) => s.updateScene);
  const deleteScene = useAppStore((s) => s.deleteScene);
  const addChoice = useAppStore((s) => s.addChoice);
  const updateChoice = useAppStore((s) => s.updateChoice);
  const deleteChoice = useAppStore((s) => s.deleteChoice);

  const [activeChapterId, setActiveChapterId] = useState<string | null>(chapters[0]?.id ?? null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [expandedSceneIds, setExpandedSceneIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');

  const activeChapter = useMemo(
    () => chapters.find((ch) => ch.id === activeChapterId) ?? null,
    [chapters, activeChapterId],
  );

  const canEditChapter = (chId: string) => {
    if (isLead) return true;
    const ch = chapters.find((c) => c.id === chId);
    return ch?.writerId === currentUserId;
  };

  const chapterIssues = useMemo(() => {
    if (!activeChapter) return [];
    const sceneIds = new Set(activeChapter.scenes.map((s) => s.id));
    return validationIssues.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (i.category === 'foreshadowing') return true;
      return i.sceneId && sceneIds.has(i.sceneId);
    });
  }, [validationIssues, activeChapter, statusFilter]);

  const chapterIssueStats = useMemo(() => {
    if (!activeChapter) return { errors: 0, warnings: 0, infos: 0, total: 0, open: 0, fixed: 0, ignored: 0, 'needs-lead': 0 };
    const sceneIds = new Set(activeChapter.scenes.map((s) => s.id));
    const allIssues = validationIssues.filter((i) => {
      if (i.category === 'foreshadowing') return true;
      return i.sceneId && sceneIds.has(i.sceneId);
    });
    const errors = allIssues.filter((i) => i.type === 'error').length;
    const warnings = allIssues.filter((i) => i.type === 'warning').length;
    const infos = allIssues.filter((i) => i.type === 'info').length;
    const open = allIssues.filter((i) => i.status === 'open').length;
    const fixed = allIssues.filter((i) => i.status === 'fixed').length;
    const ignored = allIssues.filter((i) => i.status === 'ignored').length;
    const needsLead = allIssues.filter((i) => i.status === 'needs-lead').length;
    return { errors, warnings, infos, total: allIssues.length, open, fixed, ignored, 'needs-lead': needsLead };
  }, [validationIssues, activeChapter]);

  const handleSaveAndValidate = () => {
    if (!activeChapterId) return;
    setSaving(true);
    setTimeout(() => {
      runChapterValidation(activeChapterId);
      clearPendingForeshadowing(activeChapterId);
      setSaving(false);
    }, 400);
  };

  const handleSwitchChapter = (chId: string) => {
    setActiveChapterId(chId);
    setActiveSceneId(null);
    setExpandedSceneIds(new Set());
  };

  const handleAddScene = () => {
    if (!activeChapterId) return;
    addScene(activeChapterId, {
      title: `新场景 ${(activeChapter?.scenes.length ?? 0) + 1}`,
      content: '',
      characterIds: [],
      referencedRuleIds: [],
      referencedClueIds: [],
    });
  };

  const handleAddChoice = () => {
    if (!activeChapterId || !activeSceneId) return;
    addChoice(activeChapterId, activeSceneId, {
      text: '新选项',
      curseDelta: 0,
    });
  };

  const canEdit = activeChapter ? canEditChapter(activeChapter.id) : false;

  useEffect(() => {
    const handleJump = (e: Event) => {
      const { chapterId, sceneId } = (e as CustomEvent).detail;
      if (chapterId) {
        setActiveChapterId(chapterId);
        setExpandedSceneIds(new Set());
        if (sceneId) {
          setActiveSceneId(sceneId);
          setExpandedSceneIds(new Set([sceneId]));
        }
      }
    };
    window.addEventListener('jump-to-scene', handleJump);
    return () => window.removeEventListener('jump-to-scene', handleJump);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="z-20 bg-ink-950/90 backdrop-blur-md border-b border-ink-700/60 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blood-500" />
          <div>
            <h2 className="font-display text-lg text-ash-100 tracking-wider">章节编辑</h2>
            <p className="text-[11px] text-ash-600 font-body">编辑场景与分支后点「保存并校验」即时获取反馈</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeChapterId && (
            <button
              onClick={handleSaveAndValidate}
              disabled={saving}
              className={cn(
                'btn-primary flex items-center gap-1.5',
                saving && 'opacity-70 cursor-wait',
              )}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              {saving ? '校验中…' : '保存并校验'}
            </button>
          )}
          {chapterIssueStats.total > 0 && activeChapterId && (
            <button onClick={() => clearChapterIssues(activeChapterId)} className="btn-ghost flex items-center gap-1.5 !text-xs">
              <X className="w-3 h-3" /> 清除当前章节
            </button>
          )}
          {chapterIssueStats.total > 0 ? (
            <div className="flex items-center gap-2">
              {chapterIssueStats.errors > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blood-900/40 border border-blood-700/60 text-[10px] text-blood-300 font-body">
                  <AlertTriangle className="w-2.5 h-2.5" />{chapterIssueStats.errors} 错误
                </span>
              )}
              {chapterIssueStats.warnings > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-ember-800/30 border border-ember-700/50 text-[10px] text-ember-600 font-body">
                  <AlertCircle className="w-2.5 h-2.5" />{chapterIssueStats.warnings} 警告
                </span>
              )}
              {chapterIssueStats.infos > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-void-800/30 border border-void-700/50 text-[10px] text-frost-500 font-body">
                  <Info className="w-2.5 h-2.5" />{chapterIssueStats.infos} 提示
                </span>
              )}
            </div>
          ) : validationIssues.length === 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-800/60 border border-ink-600 text-[11px] text-ash-500 font-body">
              <CheckCircle2 className="w-3 h-3" />
              点击「保存并校验」检测剧情一致性
            </div>
          ) : null}
        </div>
      </div>

      {activeChapterId && pendingForeshadowing[activeChapterId] && pendingForeshadowing[activeChapterId].length > 0 && (
        <div className="px-6 py-3 bg-frost-950/40 border-b border-frost-700/40 flex items-start gap-3 shrink-0">
          <Sparkles className="w-4 h-4 text-frost-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-frost-300 font-body mb-1.5">
              主笔建议在本章节铺垫以下线索，保存并校验后自动消除：
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pendingForeshadowing[activeChapterId].map((hint, idx) => (
                <div
                  key={`${hint.clueId}-${hint.endingId}-${idx}`}
                  className="px-2 py-1 bg-void-800/50 border border-frost-700/40 rounded-sm text-[10px] font-body flex items-center gap-1.5"
                >
                  <span className="text-frost-300">🔎 {hint.clueTitle}</span>
                  <span className="text-ash-600">→</span>
                  <span className="text-ember-400">{hint.endingTitle}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => clearPendingForeshadowing(activeChapterId)}
            className="text-[10px] text-ash-500 hover:text-ash-300 font-body shrink-0"
          >
            清除
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="w-64 shrink-0 border-r border-ink-700/60 bg-ink-900/40 flex flex-col min-h-0">
          <div className="p-3 border-b border-ink-700/60">
            <div className="label-dark">章节列表</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chapters.map((ch) => {
              const writer = writers.find((w) => w.id === ch.writerId);
              const isMine = ch.writerId === currentUserId;
              const isActive = ch.id === activeChapterId;
              const editable = canEditChapter(ch.id);
              const chIssueCount = validationIssues.filter((i) => {
                if (i.category === 'foreshadowing') return false;
                return ch.scenes.some((s) => s.id === i.sceneId);
              }).length;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleSwitchChapter(ch.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-sm border transition-all duration-200',
                    isActive
                      ? 'bg-blood-900/20 border-blood-600/60 shadow-glow-blood-sm'
                      : 'bg-transparent border-transparent hover:bg-ink-800/60 hover:border-ink-600',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-sm font-body truncate',
                      isActive ? 'text-ash-100' : 'text-ash-300',
                    )}>
                      {ch.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {chIssueCount > 0 && !isActive && (
                        <span className="text-[9px] px-1 py-0.5 bg-blood-900/40 text-blood-400 border border-blood-800/50 font-body">
                          {chIssueCount}
                        </span>
                      )}
                      {!editable && <Lock className="w-3 h-3 text-ash-600" />}
                      {editable && isMine && <Unlock className="w-3 h-3 text-verdant-500/70" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-[10px] text-ash-600 font-body flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      {writer?.name ?? '未分配'}
                    </span>
                    <span className={cn(
                      'text-[10px] font-body px-1.5 py-0.5',
                      ch.status === 'done' && 'bg-verdant-800/40 text-verdant-500 border border-verdant-700/50',
                      ch.status === 'review' && 'bg-void-800/40 text-frost-500 border border-void-700/50',
                      ch.status === 'writing' && 'bg-ember-800/40 text-ember-600 border border-ember-700/50',
                      ch.status === 'draft' && 'bg-ink-700/60 text-ash-500 border border-ink-600',
                    )}>
                      {CHAPTER_STATUS_LABEL[ch.status]}
                    </span>
                  </div>
                  <div className="text-[10px] text-ash-600 mt-1 font-body">
                    {ch.scenes.length} 个场景
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {activeChapter ? (
            <>
              <div className="px-6 py-4 border-b border-ink-700/60 bg-ink-900/30 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <input
                      value={activeChapter.title}
                      onChange={(e) => canEdit && updateChapter(activeChapter.id, { title: e.target.value })}
                      disabled={!canEdit}
                      className={cn(
                        'bg-transparent border-none font-display text-2xl text-ash-100 tracking-wider w-full p-0 focus:outline-none',
                        !canEdit && 'cursor-not-allowed',
                      )}
                    />
                    <textarea
                      value={activeChapter.summary}
                      onChange={(e) => canEdit && updateChapter(activeChapter.id, { summary: e.target.value })}
                      disabled={!canEdit}
                      placeholder="本章概要..."
                      className={cn(
                        'w-full mt-2 bg-transparent border-none text-sm text-ash-500 font-body resize-none focus:outline-none p-0',
                        !canEdit && 'cursor-not-allowed',
                      )}
                      rows={1}
                    />
                  </div>
                  {isLead && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={activeChapter.writerId}
                        onChange={(e) => setChapterWriter(activeChapter.id, e.target.value)}
                        className="input-dark !py-1 !text-xs !w-32"
                      >
                        {writers.filter((w) => w.role !== 'viewer').map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      <select
                        value={activeChapter.status}
                        onChange={(e) => setChapterStatus(activeChapter.id, e.target.value as ChapterStatus)}
                        className="input-dark !py-1 !text-xs !w-28"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{CHAPTER_STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {!canEdit && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ash-600 font-body">
                    <Lock className="w-3 h-3" />
                    此章节由 {writers.find((w) => w.id === activeChapter.writerId)?.name} 负责，您仅可查看
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0">
                {activeChapter.scenes.length === 0 && (
                  <div className="text-center py-16 text-ash-600">
                    <Skull className="w-10 h-10 mx-auto mb-3 opacity-30 animate-breath" />
                    <p className="font-body text-sm">本章暂无场景</p>
                    {canEdit && (
                      <button onClick={handleAddScene} className="btn-primary mt-4 inline-flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> 创建第一个场景
                      </button>
                    )}
                  </div>
                )}

                {activeChapter.scenes.map((scene, idx) => {
                  const isExpanded = expandedSceneIds.has(scene.id);
                  const sceneIssueCount = chapterIssues.filter((i) => i.sceneId === scene.id).length;
                  const sceneErrorCount = chapterIssues.filter((i) => i.sceneId === scene.id && i.type === 'error').length;
                  return (
                    <div
                      key={scene.id}
                      className={cn(
                        'card-dark animate-fade-in',
                        sceneErrorCount > 0 && 'border-blood-700/50',
                      )}
                    >
                      <div
                        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-ink-700/30 transition-colors"
                        onClick={() => {
                          setExpandedSceneIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(scene.id)) next.delete(scene.id);
                            else next.add(scene.id);
                            return next;
                          });
                          setActiveSceneId(scene.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-ash-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-ash-500 shrink-0" />
                        )}
                        <span className="font-display text-xs text-blood-500/80 w-6">#{idx + 1}</span>
                        <h4 className="flex-1 text-sm text-ash-200 font-body truncate">{scene.title}</h4>
                        {sceneIssueCount > 0 && (
                          <span className={cn(
                            'flex items-center gap-1 px-2 py-0.5 text-[10px] font-body',
                            sceneErrorCount > 0
                              ? 'bg-blood-900/40 border border-blood-700/60 text-blood-300'
                              : 'bg-ember-800/30 border border-ember-700/50 text-ember-600',
                          )}>
                            {sceneErrorCount > 0 ? <AlertTriangle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                            {sceneIssueCount}
                          </span>
                        )}
                        <span className="text-[10px] text-ash-600 font-body">
                          {scene.choices.length} 分支 · {scene.characterIds.length} 角色
                        </span>
                      </div>

                      {isExpanded && (
                        <SceneEditor
                          scene={scene}
                          chapterId={activeChapter.id}
                          canEdit={canEdit}
                          rules={rules}
                          characters={characters}
                          clues={clues}
                          endings={endings}
                          allScenes={activeChapter.scenes}
                          updateScene={updateScene}
                          deleteScene={deleteScene}
                          addChoice={addChoice}
                          updateChoice={updateChoice}
                          deleteChoice={deleteChoice}
                          handleAddChoice={handleAddChoice}
                          issues={chapterIssues.filter((i) => i.sceneId === scene.id)}
                        />
                      )}
                    </div>
                  );
                })}

                {canEdit && activeChapter.scenes.length > 0 && (
                  <button onClick={handleAddScene} className="w-full py-3 border border-dashed border-ink-600 text-ash-500 text-sm font-body hover:border-blood-600/50 hover:text-blood-400 hover:bg-blood-900/10 transition-all duration-200 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> 新增场景
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ash-600">
              <p>请选择一个章节</p>
            </div>
          )}
        </div>

        <div className="w-80 shrink-0 border-l border-ink-700/60 bg-ink-900/40 flex flex-col min-h-0">
          <div className="p-3 border-b border-ink-700/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blood-500" />
                <h3 className="font-display text-sm text-ash-200 tracking-wider">
                  {activeChapter ? `「${activeChapter.title.slice(0, 8)}」校验` : '剧情校验'}
                </h3>
              </div>
              {chapterIssueStats.total > 0 && (
                <span className={cn(
                  'text-[11px] font-body',
                  chapterIssueStats.errors > 0 ? 'text-blood-400' : 'text-ember-600',
                )}>
                  {chapterIssueStats.total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'open', 'fixed', 'ignored', 'needs-lead'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-body border transition-all',
                    statusFilter === st
                      ? 'bg-blood-900/40 border-blood-700/60 text-blood-300'
                      : 'bg-ink-800/30 border-ink-700/40 text-ash-500 hover:border-ink-600',
                  )}
                >
                  {st === 'all' ? `全部(${chapterIssueStats.total})` : `${ISSUE_STATUS_LABEL[st]}(${chapterIssueStats[st]})`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chapterIssues.length === 0 ? (
              <div className="text-center py-8 text-ash-600">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-body">
                  {validationIssues.length === 0
                    ? '点击上方「保存并校验」检测剧情一致性'
                    : '当前章节未检测到问题'}
                </p>
              </div>
            ) : (
              chapterIssues.map((issue) => (
                <ValidationItem
                  key={issue.id}
                  issue={issue}
                  chapters={chapters}
                  characters={characters}
                  setIssueStatus={setIssueStatus}
                  isLead={isLead}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SceneEditorProps {
  scene: Scene;
  chapterId: string;
  canEdit: boolean;
  rules: any[];
  characters: any[];
  clues: any[];
  endings: any[];
  allScenes: Scene[];
  updateScene: any;
  deleteScene: any;
  addChoice: any;
  updateChoice: any;
  deleteChoice: any;
  handleAddChoice: () => void;
  issues: ValidationIssue[];
}

function SceneEditor({
  scene,
  chapterId,
  canEdit,
  rules,
  characters,
  clues,
  endings,
  allScenes,
  updateScene,
  deleteScene,
  handleAddChoice,
  updateChoice,
  deleteChoice,
  issues,
}: SceneEditorProps) {
  const toggleChar = (id: string) => {
    const next = scene.characterIds.includes(id)
      ? scene.characterIds.filter((x) => x !== id)
      : [...scene.characterIds, id];
    updateScene(chapterId, scene.id, { characterIds: next });
  };
  const toggleRule = (id: string) => {
    const next = scene.referencedRuleIds.includes(id)
      ? scene.referencedRuleIds.filter((x) => x !== id)
      : [...scene.referencedRuleIds, id];
    updateScene(chapterId, scene.id, { referencedRuleIds: next });
  };
  const toggleClue = (id: string) => {
    const next = scene.referencedClueIds.includes(id)
      ? scene.referencedClueIds.filter((x) => x !== id)
      : [...scene.referencedClueIds, id];
    updateScene(chapterId, scene.id, { referencedClueIds: next });
  };

  return (
    <div className="px-5 pb-5 border-t border-ink-700/50 pt-4 animate-fade-in">
      {issues.length > 0 && (
        <div className="mb-4 p-3 bg-blood-900/20 border border-blood-800/50 space-y-2">
          {issues.map((iss) => (
            <div key={iss.id} className="flex items-start gap-2 text-[12px]">
              {iss.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-blood-400 mt-0.5 shrink-0" />}
              {iss.type === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-ember-600 mt-0.5 shrink-0" />}
              {iss.type === 'info' && <Info className="w-3.5 h-3.5 text-frost-500 mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <div className="text-ash-300 font-body">
                  <span className="text-ash-600">[{VALIDATION_CATEGORY_LABEL[iss.category]}]</span> {iss.message}
                </div>
                {iss.quote && (
                  <div className="mt-1 px-2 py-1 bg-ink-900/80 border border-ink-600/50 text-[11px] text-ember-600 font-body italic truncate">
                    「{iss.quote.length > 60 ? iss.quote.slice(0, 60) + '…' : iss.quote}」
                  </div>
                )}
                {iss.suggestion && (
                  <div className="text-ash-500 text-[11px] mt-0.5">建议：{iss.suggestion}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="label-dark">场景标题</label>
          <input
            value={scene.title}
            onChange={(e) => canEdit && updateScene(chapterId, scene.id, { title: e.target.value })}
            disabled={!canEdit}
            className="input-dark"
          />
        </div>
        <div>
          <label className="label-dark">场景描述 / 剧情内容</label>
          <textarea
            value={scene.content}
            onChange={(e) => canEdit && updateScene(chapterId, scene.id, { content: e.target.value })}
            disabled={!canEdit}
            placeholder="描述场景氛围、角色动作、对话..."
            className="textarea-dark min-h-[140px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-dark flex items-center gap-1.5"><User className="w-3 h-3" />出场角色</label>
            <div className="flex flex-wrap gap-1">
              {characters.map((c: any) => {
                const active = scene.characterIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => canEdit && toggleChar(c.id)}
                    disabled={!canEdit}
                    className={cn(
                      'px-2 py-1 text-[11px] font-body border transition-all',
                      active
                        ? 'bg-blood-900/40 text-blood-300 border-blood-700/60'
                        : 'bg-ink-800/60 text-ash-500 border-ink-600 hover:border-ink-500',
                    )}
                  >
                    {c.name}
                    {c.secretLevel <= 1 && !c.knowsTruth && (
                      <span className="ml-0.5 text-[9px] opacity-50">⚠</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label-dark flex items-center gap-1.5"><Skull className="w-3 h-3" />引用诅咒规则</label>
            <div className="flex flex-wrap gap-1">
              {rules.map((r: any) => {
                const active = scene.referencedRuleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => canEdit && toggleRule(r.id)}
                    disabled={!canEdit}
                    title={r.description}
                    className={cn(
                      'px-2 py-1 text-[11px] font-body border transition-all',
                      active
                        ? 'bg-verdant-800/40 text-verdant-500 border-verdant-700/50'
                        : 'bg-ink-800/60 text-ash-500 border-ink-600 hover:border-ink-500',
                    )}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label-dark flex items-center gap-1.5"><Link2 className="w-3 h-3" />引用线索</label>
            <div className="flex flex-wrap gap-1">
              {clues.map((cl: any) => {
                const active = scene.referencedClueIds.includes(cl.id);
                return (
                  <button
                    key={cl.id}
                    onClick={() => canEdit && toggleClue(cl.id)}
                    disabled={!canEdit}
                    title={cl.content}
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
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-ink-700/50">
        <div className="flex items-center justify-between mb-3">
          <label className="label-dark mb-0 flex items-center gap-1.5">
            <Play className="w-3 h-3" /> 分支选项 ({scene.choices.length})
          </label>
          {canEdit && (
            <button onClick={handleAddChoice} className="btn-ghost !text-xs !py-1 flex items-center gap-1">
              <Plus className="w-3 h-3" /> 添加分支
            </button>
          )}
        </div>

        {scene.choices.length === 0 && (
          <div className="text-center py-6 text-ash-600 text-xs font-body">
            暂无分支选项
          </div>
        )}

        <div className="space-y-2.5">
          {scene.choices.map((choice, idx) => (
            <ChoiceEditor
              key={choice.id}
              choice={choice}
              index={idx}
              sceneId={scene.id}
              chapterId={chapterId}
              canEdit={canEdit}
              allScenes={allScenes}
              endings={endings}
              updateChoice={updateChoice}
              deleteChoice={deleteChoice}
            />
          ))}
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 pt-3 border-t border-ink-700/50 flex justify-end">
          <button
            onClick={() => deleteScene(chapterId, scene.id)}
            className="btn-danger flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> 删除此场景
          </button>
        </div>
      )}
    </div>
  );
}

interface ChoiceEditorProps {
  choice: Choice;
  index: number;
  sceneId: string;
  chapterId: string;
  canEdit: boolean;
  allScenes: Scene[];
  endings: any[];
  updateChoice: any;
  deleteChoice: any;
}

function ChoiceEditor({
  choice,
  index,
  sceneId,
  chapterId,
  canEdit,
  allScenes,
  endings,
  updateChoice,
  deleteChoice,
}: ChoiceEditorProps) {
  return (
    <div className="p-3 bg-ink-900/60 border border-ink-600/60 animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="font-display text-xs text-blood-500/70 pt-1 shrink-0">#{index + 1}</span>
        <div className="flex-1 min-w-0 space-y-2.5">
          <input
            value={choice.text}
            onChange={(e) => canEdit && updateChoice(chapterId, sceneId, choice.id, { text: e.target.value })}
            disabled={!canEdit}
            placeholder="选项文字..."
            className="input-dark !py-1.5 !text-xs"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-ash-600 font-body uppercase tracking-wider">诅咒值 Δ</label>
              <input
                type="number"
                value={choice.curseDelta}
                onChange={(e) => canEdit && updateChoice(chapterId, sceneId, choice.id, { curseDelta: Number(e.target.value) })}
                disabled={!canEdit}
                className="input-dark !py-1 !text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-ash-600 font-body uppercase tracking-wider flex items-center gap-1">
                <ArrowRight className="w-2.5 h-2.5" /> 跳转场景
              </label>
              <select
                value={choice.nextSceneId ?? ''}
                onChange={(e) => canEdit && updateChoice(chapterId, sceneId, choice.id, { nextSceneId: e.target.value || undefined, endingId: e.target.value ? undefined : choice.endingId })}
                disabled={!canEdit}
                className="input-dark !py-1 !text-xs"
              >
                <option value="">(不指定)</option>
                {allScenes.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-ash-600 font-body uppercase tracking-wider">直达结局</label>
              <select
                value={choice.endingId ?? ''}
                onChange={(e) => canEdit && updateChoice(chapterId, sceneId, choice.id, { endingId: e.target.value || undefined, nextSceneId: e.target.value ? undefined : choice.nextSceneId })}
                disabled={!canEdit}
                className="input-dark !py-1 !text-xs"
              >
                <option value="">(不指定)</option>
                {endings.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
          </div>
          {choice.unlockCondition !== undefined && choice.unlockCondition !== '' && (
            <input
              value={choice.unlockCondition ?? ''}
              onChange={(e) => canEdit && updateChoice(chapterId, sceneId, choice.id, { unlockCondition: e.target.value })}
              disabled={!canEdit}
              placeholder="解锁条件（可选，如：收集线索A）"
              className="input-dark !py-1.5 !text-xs"
            />
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => deleteChoice(chapterId, sceneId, choice.id)}
            className="p-1 text-ash-600 hover:text-blood-400 hover:bg-blood-900/30 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ValidationItem({
  issue,
  chapters,
  characters,
  setIssueStatus,
  isLead,
}: {
  issue: ValidationIssue;
  chapters: any[];
  characters: any[];
  setIssueStatus: (id: string, status: IssueStatus) => void;
  isLead: boolean;
}) {
  const sceneTitle = useMemo(() => {
    for (const ch of chapters) {
      const sc = ch.scenes?.find((s: Scene) => s.id === issue.sceneId);
      if (sc) return `${ch.title} · ${sc.title}`;
    }
    return null;
  }, [issue.sceneId, chapters]);

  const charName = useMemo(() => {
    if (!issue.characterId) return null;
    const ch = characters.find((c: any) => c.id === issue.characterId);
    return ch?.name ?? null;
  }, [issue.characterId, characters]);

  const statusButton = (
    status: IssueStatus,
    icon: React.ReactNode,
    label: string,
    colorClass: string,
  ) => (
    <button
      onClick={() => setIssueStatus(issue.id, status)}
      title={label}
      className={cn(
        'p-0.5 rounded transition-all',
        issue.status === status
          ? colorClass
          : 'text-ash-600 hover:text-ash-300 hover:bg-ink-700/50',
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className={cn(
      'p-2.5 border-l-2 animate-fade-in',
      issue.status === 'fixed' && 'opacity-60',
      issue.status === 'ignored' && 'opacity-40',
      issue.type === 'error' && 'bg-blood-900/20 border-blood-600 border-r border-t border-b border-blood-900/40',
      issue.type === 'warning' && 'bg-ember-800/15 border-ember-600 border-r border-t border-b border-ember-900/30',
      issue.type === 'info' && 'bg-void-800/20 border-frost-600 border-r border-t border-b border-void-800/40',
    )}>
      <div className="flex items-start gap-1.5 mb-1">
        {issue.type === 'error' && <AlertTriangle className="w-3 h-3 text-blood-400 mt-0.5 shrink-0" />}
        {issue.type === 'warning' && <AlertCircle className="w-3 h-3 text-ember-600 mt-0.5 shrink-0" />}
        {issue.type === 'info' && <Info className="w-3 h-3 text-frost-500 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(
              'text-[10px] font-body uppercase tracking-wider',
              issue.type === 'error' && 'text-blood-400',
              issue.type === 'warning' && 'text-ember-600',
              issue.type === 'info' && 'text-frost-500',
            )}>
              {VALIDATION_CATEGORY_LABEL[issue.category]}
            </span>
            {charName && (
              <span className="text-[10px] px-1 py-0.5 bg-blood-900/40 text-blood-300 border border-blood-800/50 font-body">
                {charName}
              </span>
            )}
            {issue.secretTopic && (
              <span className="text-[10px] px-1 py-0.5 bg-void-800/40 text-frost-400 border border-void-700/50 font-body">
                🔒 {issue.secretTopic}
              </span>
            )}
            <span className={cn(
              'text-[10px] px-1 py-0.5 font-body ml-auto',
              issue.status === 'open' && 'bg-blood-900/30 text-blood-400 border border-blood-800/40',
              issue.status === 'fixed' && 'bg-verdant-800/30 text-verdant-500 border border-verdant-700/40',
              issue.status === 'ignored' && 'bg-ink-700/50 text-ash-500 border border-ink-600',
              issue.status === 'needs-lead' && 'bg-ember-800/30 text-ember-500 border border-ember-700/40',
            )}>
              {ISSUE_STATUS_LABEL[issue.status]}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-ash-300 font-body leading-relaxed">{issue.message}</p>
      {issue.quote && (
        <div className="mt-1.5 px-2 py-1 bg-ink-900/80 border border-ink-600/50 text-[11px] text-ember-600 font-body italic">
          「{issue.quote.length > 120 ? issue.quote.slice(0, 120) + '…' : issue.quote}」
        </div>
      )}
      {issue.suggestion && (
        <p className="text-[11px] text-ash-600 mt-1 font-body leading-relaxed">→ {issue.suggestion}</p>
      )}
      {sceneTitle && (
        <p className="text-[10px] text-ash-600 mt-1.5 font-body">📍 {sceneTitle}</p>
      )}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-ink-700/40">
        <span className="text-[10px] text-ash-600 font-body mr-1">标记：</span>
        {statusButton('fixed', <Check className="w-3 h-3" />, '已改', 'text-verdant-500 bg-verdant-800/30')}
        {statusButton('ignored', <EyeOff className="w-3 h-3" />, '忽略', 'text-ash-400 bg-ink-700/60')}
        {statusButton('needs-lead', <MessageSquare className="w-3 h-3" />, '待主笔确认', 'text-ember-500 bg-ember-800/30')}
        {isLead && issue.status === 'needs-lead' && (
          <span className="text-[10px] text-ember-500 font-body ml-auto">
            ⚑ 需您审阅
          </span>
        )}
      </div>
    </div>
  );
}
