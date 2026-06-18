import { useState } from 'react';
import {
  Skull,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Link2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  BookMarked,
  Users,
  Search,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  RULE_TYPE_LABEL,
  SECRET_LEVEL_LABEL,
  type RuleType,
  type SecretLevel,
  type ClueLevel,
} from '@/types';
import { cn } from '@/lib/utils';

const RULE_TYPE_OPTIONS: { value: RuleType; label: string; className: string }[] = [
  { value: 'spread', label: '传播规则', className: 'tag-blood' },
  { value: 'deepen', label: '加深规则', className: 'tag-orange' },
  { value: 'release', label: '解除规则', className: 'tag-green' },
  { value: 'other', label: '其他设定', className: 'tag-purple' },
];

const CLUE_LEVELS: ClueLevel[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

export default function WorldRules() {
  const rules = useAppStore((s) => s.rules);
  const characters = useAppStore((s) => s.characters);
  const clues = useAppStore((s) => s.clues);
  const currentUser = useAppStore((s) => s.writers.find((w) => w.id === s.currentUserId));
  const isLead = currentUser?.role === 'lead';

  const [activeTab, setActiveTab] = useState<'rules' | 'characters' | 'clues'>('rules');
  const [filterType, setFilterType] = useState<RuleType | 'all'>('all');

  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name: '', type: 'spread' as RuleType, description: '', relatedRuleIds: [] as string[] });

  const [editingChar, setEditingChar] = useState<string | null>(null);
  const [charForm, setCharForm] = useState({ name: '', secretLevel: 0 as SecretLevel, knowsTruth: false, knownSecrets: '', notes: '' });

  const [editingClue, setEditingClue] = useState<string | null>(null);
  const [newClue, setNewClue] = useState(false);
  const [clueForm, setClueForm] = useState({ name: '', content: '', level: 'C' as ClueLevel });

  const addRule = useAppStore((s) => s.addRule);
  const updateRule = useAppStore((s) => s.updateRule);
  const deleteRule = useAppStore((s) => s.deleteRule);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const addClue = useAppStore((s) => s.addClue);
  const updateClue = useAppStore((s) => s.updateClue);
  const deleteClue = useAppStore((s) => s.deleteClue);

  const filteredRules = filterType === 'all' ? rules : rules.filter((r) => r.type === filterType);

  const openNewRule = () => {
    setRuleForm({ name: '', type: 'spread', description: '', relatedRuleIds: [] });
    setNewRule(true);
    setEditingRule(null);
  };

  const openEditRule = (id: string) => {
    const r = rules.find((x) => x.id === id);
    if (r) setRuleForm({ name: r.name, type: r.type, description: r.description, relatedRuleIds: [...r.relatedRuleIds] });
    setEditingRule(id);
    setNewRule(false);
  };

  const saveRule = () => {
    if (!ruleForm.name.trim()) return;
    if (newRule) {
      addRule(ruleForm);
      setNewRule(false);
    } else if (editingRule) {
      updateRule(editingRule, ruleForm);
      setEditingRule(null);
    }
    setRuleForm({ name: '', type: 'spread', description: '', relatedRuleIds: [] });
  };

  const openEditChar = (id: string) => {
    const c = characters.find((x) => x.id === id);
    if (c) setCharForm({ name: c.name, secretLevel: c.secretLevel, knowsTruth: c.knowsTruth, knownSecrets: c.knownSecrets, notes: c.notes });
    setEditingChar(id);
  };

  const saveChar = () => {
    if (!editingChar || !charForm.name.trim()) return;
    updateCharacter(editingChar, charForm);
    setEditingChar(null);
  };

  const openNewClue = () => {
    setClueForm({ name: '', content: '', level: 'C' });
    setNewClue(true);
    setEditingClue(null);
  };

  const openEditClue = (id: string) => {
    const c = clues.find((x) => x.id === id);
    if (c) setClueForm({ name: c.name, content: c.content, level: c.level });
    setEditingClue(id);
    setNewClue(false);
  };

  const saveClue = () => {
    if (!clueForm.name.trim()) return;
    if (newClue) {
      addClue(clueForm);
      setNewClue(false);
    } else if (editingClue) {
      updateClue(editingClue, clueForm);
      setEditingClue(null);
    }
    setClueForm({ name: '', content: '', level: 'C' });
  };

  const tabStyle = (active: boolean) =>
    cn(
      'flex items-center gap-2 px-4 py-2.5 text-sm font-body border-b-2 transition-all duration-200',
      active
        ? 'text-blood-400 border-blood-500 shadow-[0_1px_0_rgba(139,0,0,0.3)]'
        : 'text-ash-500 border-transparent hover:text-ash-300 hover:border-ink-500',
    );

  return (
    <div className="h-screen overflow-y-auto">
      <div className="sticky top-0 z-20 bg-ink-950/90 backdrop-blur-md border-b border-ink-700/60 px-8 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl text-ash-100 tracking-wider flex items-center gap-2.5">
              <Skull className="w-6 h-6 text-blood-500 animate-flicker" />
              世界观规则
            </h2>
            <p className="text-xs text-ash-600 mt-1 font-body">
              定义诅咒机制、角色秘密与公共线索，为所有编剧提供统一口径
            </p>
          </div>
          {isLead && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ash-500 font-body">主笔模式 · 可编辑</span>
              <CheckCircle2 className="w-4 h-4 text-verdant-500" />
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <button onClick={() => setActiveTab('rules')} className={tabStyle(activeTab === 'rules')}>
            <BookMarked className="w-4 h-4" /> 诅咒规则 <span className="text-ash-600 text-xs">({rules.length})</span>
          </button>
          <button onClick={() => setActiveTab('characters')} className={tabStyle(activeTab === 'characters')}>
            <Users className="w-4 h-4" /> 角色档案 <span className="text-ash-600 text-xs">({characters.length})</span>
          </button>
          <button onClick={() => setActiveTab('clues')} className={tabStyle(activeTab === 'clues')}>
            <Search className="w-4 h-4" /> 怪谈线索库 <span className="text-ash-600 text-xs">({clues.length})</span>
          </button>
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto">
        {activeTab === 'rules' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFilterType('all')} className={cn('btn-ghost !text-xs !py-1', filterType === 'all' && '!text-blood-300 !border-blood-600/60')}>
                  全部
                </button>
                {RULE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterType(opt.value)}
                    className={cn('btn-ghost !text-xs !py-1', filterType === opt.value && '!text-blood-300 !border-blood-600/60')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {isLead && (
                <button onClick={openNewRule} className="btn-primary flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> 新增规则
                </button>
              )}
            </div>

            {newRule && (
              <div className="card-dark p-5 mb-5 animate-fade-in border-l-4 border-l-blood-600">
                <h4 className="font-display text-ash-200 mb-4 text-sm tracking-wider">新增诅咒规则</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-dark">规则名称</label>
                    <input
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                      className="input-dark"
                      placeholder="如：血字传播"
                    />
                  </div>
                  <div>
                    <label className="label-dark">规则类型</label>
                    <select
                      value={ruleForm.type}
                      onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value as RuleType })}
                      className="input-dark"
                    >
                      {RULE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="label-dark">规则描述</label>
                  <textarea
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                    className="textarea-dark min-h-[100px]"
                    placeholder="详细描述这条诅咒规则的触发条件、效果与限制..."
                  />
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button onClick={() => setNewRule(false)} className="btn-ghost">取消</button>
                  <button onClick={saveRule} className="btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />保存</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredRules.map((rule) => {
                const isEditing = editingRule === rule.id;
                const typeOpt = RULE_TYPE_OPTIONS.find((o) => o.value === rule.type);
                const relatedRules = rules.filter((r) => rule.relatedRuleIds.includes(r.id));
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      'card-dark card-hover p-5 animate-fade-in',
                      isEditing && 'border-l-4 border-l-blood-600',
                    )}
                  >
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="label-dark">规则名称</label>
                            <input
                              value={ruleForm.name}
                              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                              className="input-dark"
                            />
                          </div>
                          <div>
                            <label className="label-dark">规则类型</label>
                            <select
                              value={ruleForm.type}
                              onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value as RuleType })}
                              className="input-dark"
                            >
                              {RULE_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="label-dark">规则描述</label>
                          <textarea
                            value={ruleForm.description}
                            onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                            className="textarea-dark min-h-[100px]"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingRule(null)} className="btn-ghost">取消</button>
                          <button onClick={saveRule} className="btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />保存</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-2">
                              <h3 className="font-display text-lg text-ash-100 tracking-wide">{rule.name}</h3>
                              <span className={typeOpt?.className}>{RULE_TYPE_LABEL[rule.type]}</span>
                            </div>
                            <p className="text-sm text-ash-400 font-body leading-relaxed">{rule.description}</p>
                            {relatedRules.length > 0 && (
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <Link2 className="w-3 h-3 text-ash-600" />
                                <span className="text-[11px] text-ash-600">关联规则：</span>
                                {relatedRules.map((rr) => (
                                  <span key={rr.id} className="text-[11px] px-2 py-0.5 bg-ink-700/60 text-ash-400 border border-ink-600">
                                    {rr.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {isLead && (
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => openEditRule(rule.id)} className="p-1.5 text-ash-500 hover:text-ash-200 hover:bg-ink-700/60 transition-colors">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-ash-500 hover:text-blood-400 hover:bg-blood-900/30 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'characters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map((char) => {
              const isEditing = editingChar === char.id;
              return (
                <div
                  key={char.id}
                  className={cn(
                    'card-dark card-hover p-5 animate-fade-in',
                    isEditing && 'border-l-4 border-l-blood-600',
                  )}
                >
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="label-dark">角色名</label>
                          <input value={charForm.name} onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} className="input-dark" />
                        </div>
                        <div>
                          <label className="label-dark">知情等级</label>
                          <select
                            value={charForm.secretLevel}
                            onChange={(e) => setCharForm({ ...charForm, secretLevel: Number(e.target.value) as SecretLevel })}
                            className="input-dark"
                          >
                            {[0, 1, 2, 3].map((lv) => (
                              <option key={lv} value={lv}>{SECRET_LEVEL_LABEL[lv as SecretLevel]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mb-3 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="knowsTruth"
                          checked={charForm.knowsTruth}
                          onChange={(e) => setCharForm({ ...charForm, knowsTruth: e.target.checked })}
                          className="w-3.5 h-3.5 accent-blood-600"
                        />
                        <label htmlFor="knowsTruth" className="text-xs text-ash-400 font-body">该角色知晓诅咒的完整真相</label>
                      </div>
                      <div className="mb-3">
                        <label className="label-dark">已知秘密</label>
                        <textarea
                          value={charForm.knownSecrets}
                          onChange={(e) => setCharForm({ ...charForm, knownSecrets: e.target.value })}
                          className="textarea-dark min-h-[60px]"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="label-dark">备注</label>
                        <textarea
                          value={charForm.notes}
                          onChange={(e) => setCharForm({ ...charForm, notes: e.target.value })}
                          className="textarea-dark min-h-[60px]"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        {isLead && (
                          <>
                            <button onClick={() => setEditingChar(null)} className="btn-ghost">取消</button>
                            <button onClick={saveChar} className="btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />保存</button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 shrink-0 rounded-sm bg-ink-700/80 border border-ink-500/60 flex items-center justify-center overflow-hidden">
                          <User className="w-6 h-6 text-ash-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-display text-base text-ash-100 tracking-wide">{char.name}</h3>
                            {char.knowsTruth && <span className="tag-blood">知真相</span>}
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[0, 1, 2, 3].map((lv) => (
                              <div
                                key={lv}
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  lv <= char.secretLevel ? 'bg-blood-500 shadow-glow-blood-sm' : 'bg-ink-600',
                                )}
                              />
                            ))}
                            <span className="text-[11px] text-ash-500 ml-1.5 font-body">{SECRET_LEVEL_LABEL[char.secretLevel]}</span>
                          </div>
                          <p className="text-xs text-ash-500 font-body leading-relaxed">{char.notes || '暂无备注'}</p>
                          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-ash-600 font-body">
                            <Eye className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{char.knownSecrets || '暂无已知秘密'}</span>
                          </div>
                        </div>
                        {isLead && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEditChar(char.id)} className="p-1.5 text-ash-500 hover:text-ash-200 hover:bg-ink-700/60 transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'clues' && (
          <>
            <div className="flex justify-end mb-5">
              {isLead && (
                <button onClick={openNewClue} className="btn-primary flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> 新增线索
                </button>
              )}
            </div>

            {newClue && (
              <div className="card-dark p-5 mb-5 animate-fade-in border-l-4 border-l-blood-600">
                <h4 className="font-display text-ash-200 mb-4 text-sm tracking-wider">新增怪谈线索</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label-dark">线索名称</label>
                    <input value={clueForm.name} onChange={(e) => setClueForm({ ...clueForm, name: e.target.value })} className="input-dark" placeholder="如：褪色的毕业照" />
                  </div>
                  <div>
                    <label className="label-dark">线索等级</label>
                    <select value={clueForm.level} onChange={(e) => setClueForm({ ...clueForm, level: e.target.value as ClueLevel })} className="input-dark">
                      {CLUE_LEVELS.map((l) => (
                        <option key={l} value={l}>等级 {l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="label-dark">线索内容</label>
                  <textarea
                    value={clueForm.content}
                    onChange={(e) => setClueForm({ ...clueForm, content: e.target.value })}
                    className="textarea-dark min-h-[80px]"
                    placeholder="详细描述这条线索的内容与暗示..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setNewClue(false)} className="btn-ghost">取消</button>
                  <button onClick={saveClue} className="btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />保存</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clues.map((clue) => {
                const isEditing = editingClue === clue.id;
                const isHighLevel = ['A', 'S'].includes(clue.level);
                return (
                  <div
                    key={clue.id}
                    className={cn(
                      'card-dark card-hover p-5 animate-fade-in',
                      isEditing && 'border-l-4 border-l-blood-600',
                      isHighLevel && !isEditing && 'border-blood-800/40',
                    )}
                  >
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="label-dark">线索名称</label>
                            <input value={clueForm.name} onChange={(e) => setClueForm({ ...clueForm, name: e.target.value })} className="input-dark" />
                          </div>
                          <div>
                            <label className="label-dark">线索等级</label>
                            <select value={clueForm.level} onChange={(e) => setClueForm({ ...clueForm, level: e.target.value as ClueLevel })} className="input-dark">
                              {CLUE_LEVELS.map((l) => (
                                <option key={l} value={l}>等级 {l}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="label-dark">线索内容</label>
                          <textarea
                            value={clueForm.content}
                            onChange={(e) => setClueForm({ ...clueForm, content: e.target.value })}
                            className="textarea-dark min-h-[80px]"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingClue(null)} className="btn-ghost">取消</button>
                          <button onClick={saveClue} className="btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />保存</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-display text-base text-ash-100 tracking-wide">{clue.name}</h3>
                          <span
                            className={cn(
                              'w-6 h-6 shrink-0 flex items-center justify-center text-[11px] font-bold font-body border',
                              isHighLevel
                                ? 'bg-blood-900/60 text-blood-300 border-blood-700/60 shadow-glow-blood-sm'
                                : 'bg-ink-700/60 text-ash-400 border-ink-600',
                            )}
                          >
                            {clue.level}
                          </span>
                        </div>
                        <p className="text-xs text-ash-400 font-body leading-relaxed mb-3">{clue.content}</p>
                        {clue.sourceChapterId && (
                          <div className="flex items-center gap-1.5 text-[11px] text-ash-600">
                            <AlertCircle className="w-3 h-3" />
                            <span>首次出现：{clue.sourceChapterId}</span>
                          </div>
                        )}
                        {isLead && (
                          <div className="flex gap-1 justify-end mt-3 pt-3 border-t border-ink-700/60">
                            <button onClick={() => openEditClue(clue.id)} className="p-1.5 text-ash-500 hover:text-ash-200 hover:bg-ink-700/60 transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteClue(clue.id)} className="p-1.5 text-ash-500 hover:text-blood-400 hover:bg-blood-900/30 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
