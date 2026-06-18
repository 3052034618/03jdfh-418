import type { ValidationIssue, CurseRule, Character, Clue, Chapter, Ending, Scene } from '@/types';

interface ValidationState {
  rules: CurseRule[];
  characters: Character[];
  clues: Clue[];
  chapters: Chapter[];
  endings: Ending[];
}

const genIssueId = () => `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function makeIssueSignature(issue: Omit<ValidationIssue, 'id' | 'status' | 'statusUpdatedAt'>): string {
  const parts = [
    issue.category,
    issue.sceneId ?? '',
    issue.choiceId ?? '',
    issue.characterId ?? '',
    issue.chapterId ?? '',
    issue.secretTopic ?? '',
    issue.message,
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash |= 0;
  }
  return `v-${Math.abs(hash).toString(36)}-${issue.category}-${issue.sceneId ?? issue.chapterId ?? 'global'}`;
}

interface DialogueMatch {
  characterId: string;
  characterName: string;
  content: string;
  fullMatch: string;
}

function extractDialogues(text: string, characters: Character[]): DialogueMatch[] {
  const results: DialogueMatch[] = [];
  const sentenceEnd = '[。！？!?]';

  for (const char of characters) {
    const name = char.name;

    const colonPatterns = [
      new RegExp(`${escapeRegex(name)}[：:]\\s*([^。！？!?]*?${sentenceEnd})`, 'g'),
      new RegExp(`${escapeRegex(name)}说[：:]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
      new RegExp(`${escapeRegex(name)}说道[：:]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
      new RegExp(`${escapeRegex(name)}低声说[：:]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
      new RegExp(`${escapeRegex(name)}开口[：:]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
      new RegExp(`${escapeRegex(name)}回答[：:]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
      new RegExp(`${escapeRegex(name)}冷笑道[：:]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
      new RegExp(`${escapeRegex(name)}叹了口气[，。]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
    ];

    for (const pattern of colonPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const content = (match[1] || match[0]).trim();
        if (content) {
          results.push({
            characterId: char.id,
            characterName: name,
            content,
            fullMatch: match[0].trim(),
          });
        }
      }
    }

    const quotedPatterns = [
      new RegExp(`${escapeRegex(name)}[地的不]?[低轻缓急颤]\\s*声[说道着]+[，。！？]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
      new RegExp(`${escapeRegex(name)}[地的不]?[说道低喊叫嚷吼]\\s*[着了]?[，。！？]?\\s*[「"']([^」"']*?)[」"']`, 'g'),
    ];
    for (const pattern of quotedPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const content = (match[1] || match[0]).trim();
        if (content) {
          results.push({
            characterId: char.id,
            characterName: name,
            content,
            fullMatch: match[0].trim(),
          });
        }
      }
    }
  }

  return results;
}

interface NarrativeLeak {
  characterId: string;
  characterName: string;
  fullMatch: string;
}

function extractNarrativeLeaks(text: string, characters: Character[]): NarrativeLeak[] {
  const results: NarrativeLeak[] = [];
  for (const char of characters) {
    if (char.secretLevel >= 3) continue;
    const name = char.name;
    const patterns = [
      new RegExp(`${escapeRegex(name)}[^。！？]{0,30}(知道|了解|透露|揭穿|说出|说出.*真相|明白|清楚|看穿|发现了?|意识到).{0,60}`, 'g'),
      new RegExp(`(原来|其实).{0,20}${escapeRegex(name)}.{0,30}(知道|了解|一直|早就|早已).{0,40}`, 'g'),
      new RegExp(`${escapeRegex(name)}告诉.{0,20}(真相|秘密|诅咒|仪式|三年前).{0,30}`, 'g'),
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push({
          characterId: char.id,
          characterName: name,
          fullMatch: match[0].trim(),
        });
      }
    }
  }
  return results;
}

const SECRET_TOPICS: { keyword: string; severity: 'high' | 'medium' }[] = [
  { keyword: '诅咒的真相', severity: 'high' },
  { keyword: '三年前的真相', severity: 'high' },
  { keyword: '诅咒机制', severity: 'high' },
  { keyword: '仪式方法', severity: 'high' },
  { keyword: '解除诅咒的方法', severity: 'high' },
  { keyword: '诅咒怎么传播', severity: 'medium' },
  { keyword: '血字', severity: 'medium' },
  { keyword: '诅咒', severity: 'medium' },
  { keyword: '仪式', severity: 'medium' },
  { keyword: '镜子', severity: 'medium' },
  { keyword: '标记', severity: 'medium' },
  { keyword: '三年前', severity: 'medium' },
  { keyword: '失踪', severity: 'medium' },
  { keyword: '真相', severity: 'medium' },
  { keyword: '被替换', severity: 'medium' },
  { keyword: '遗忘仪式', severity: 'high' },
];

function validateCharacterSecrets(
  scene: Scene,
  characters: Character[],
  issues: ValidationIssue[],
): void {
  const presentChars = characters.filter((c) => scene.characterIds.includes(c.id));
  if (presentChars.length === 0) return;
  const lowKnowledgeChars = presentChars.filter((c) => c.secretLevel <= 1 && !c.knowsTruth);
  if (lowKnowledgeChars.length === 0) return;

  const dialogues = extractDialogues(scene.content, lowKnowledgeChars);
  for (const dlg of dialogues) {
    const char = lowKnowledgeChars.find((c) => c.id === dlg.characterId);
    if (!char) continue;
    for (const topic of SECRET_TOPICS) {
      if (dlg.content.includes(topic.keyword)) {
        const isHigh = topic.severity === 'high';
        const existing = issues.find(
          (i) => i.sceneId === scene.id && i.characterId === char.id && i.secretTopic === topic.keyword,
        );
        if (existing) continue;
        issues.push({
          id: genIssueId(),
          type: isHigh ? 'error' : 'warning',
          category: 'character',
          sceneId: scene.id,
          characterId: char.id,
          chapterId: scene.chapterId,
          quote: dlg.fullMatch,
          secretTopic: topic.keyword,
          message: `角色「${char.name}」（知情等级${char.secretLevel}）说出了「${topic.keyword}」相关内容`,
          suggestion: `该角色目前仅为${char.secretLevel === 0 ? '完全不知情' : '略有怀疑'}，请确认此对话是否合理，或调整角色秘密等级`,
          status: 'open',
          statusUpdatedAt: Date.now(),
        });
        break;
      }
    }
  }

  const narrativeLeaks = extractNarrativeLeaks(scene.content, lowKnowledgeChars);
  for (const leak of narrativeLeaks) {
    const char = lowKnowledgeChars.find((c) => c.id === leak.characterId);
    if (!char) continue;
    const already = issues.some(
      (i) => i.sceneId === scene.id && i.characterId === char.id && i.category === 'character',
    );
    if (already) continue;
    issues.push({
      id: genIssueId(),
      type: 'warning',
      category: 'character',
      sceneId: scene.id,
      characterId: char.id,
      chapterId: scene.chapterId,
      quote: leak.fullMatch,
      secretTopic: '旁白暗示知情',
      message: `旁白暗示角色「${char.name}」（知情等级${char.secretLevel}）知晓内情，但角色档案标记为不知真相`,
      suggestion: '请统一角色知情设定，或修改旁白描述',
      status: 'open',
      statusUpdatedAt: Date.now(),
    });
  }

  for (const char of lowKnowledgeChars) {
    if (scene.content.includes(`${char.name}知道诅咒的真相`) || scene.content.includes(`${char.name}了解诅咒的真相`)) {
      const already = issues.some(
        (i) => i.sceneId === scene.id && i.characterId === char.id && i.category === 'character',
      );
      if (!already) {
        issues.push({
          id: genIssueId(),
          type: 'error',
          category: 'character',
          sceneId: scene.id,
          characterId: char.id,
          chapterId: scene.chapterId,
          quote: `${char.name}知道诅咒的真相`,
          secretTopic: '诅咒的真相',
          message: `场景描述直接写明「${char.name}知道诅咒的真相」，但角色档案标记为不知真相`,
          suggestion: '请统一角色知情设定，或修改场景描述',
          status: 'open',
          statusUpdatedAt: Date.now(),
        });
      }
    }
  }
}

function buildRuleKeywords(rules: CurseRule[]): Map<string, { ruleId: string; ruleName: string; ruleType: string; keywords: string[] }> {
  const map = new Map();
  for (const rule of rules) {
    const keywords = new Set<string>();
    const nameWords = rule.name.replace(/[：:，。！？、]/g, ' ').split(/\s+/);
    for (const w of nameWords) {
      if (w.length >= 2) keywords.add(w);
    }
    const descPhrases = rule.description.match(/[\u4e00-\u9fff]{2,6}/g) ?? [];
    for (const p of descPhrases) {
      if (p.length >= 2 && p.length <= 5) {
        const generic = ['这是', '但是', '如果', '那么', '可以', '不能', '不会', '已经', '需要', '必须', '之后', '之前', '只有', '并且', '或者', '以及', '为了', '因为', '所以', '而且', '此时', '此时'];
        if (!generic.includes(p)) keywords.add(p);
      }
    }
    const specificKeywords: Record<string, string[]> = {
      'r-spread-01': ['血字', '墙上', '书写', '读出', '念出', '墙面'],
      'r-spread-02': ['镜子', '照镜子', '凌晨', '3点', '镜像', '取代', '替换', '反常'],
      'r-deepen-01': ['死者', '名讳', '全名', '念出', '说出名字'],
      'r-deepen-02': ['回头', '应答', '呼唤', '名字', '应声', '回头应答'],
      'r-release-01': ['遗忘仪式', '焚毁', '灰烬', '流动的水', '七日', '午夜'],
      'r-other-01': ['教堂', '十字架', '安全屋', '免疫'],
    };
    if (specificKeywords[rule.id]) {
      for (const kw of specificKeywords[rule.id]) keywords.add(kw);
    }
    map.set(rule.id, {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      keywords: [...keywords],
    });
  }
  return map;
}

function validateCurseRules(
  scene: Scene,
  rules: CurseRule[],
  issues: ValidationIssue[],
): void {
  const ruleKeywords = buildRuleKeywords(rules);
  const contentText = `${scene.content} ${scene.choices.map((c) => c.text).join(' ')}`;
  const matchedRuleIds = new Set<string>();

  for (const [ruleId, info] of ruleKeywords) {
    for (const kw of info.keywords) {
      if (contentText.includes(kw)) {
        matchedRuleIds.add(ruleId);
        break;
      }
    }
  }

  for (const ruleId of matchedRuleIds) {
    const info = ruleKeywords.get(ruleId)!;
    if (!scene.referencedRuleIds.includes(ruleId)) {
      const existing = issues.find(
        (i) => i.sceneId === scene.id && i.category === 'curse' && i.message.includes(info.ruleName),
      );
      if (!existing) {
        issues.push({
          id: genIssueId(),
          type: 'warning',
          category: 'curse',
          sceneId: scene.id,
          chapterId: scene.chapterId,
          message: `场景内容涉及「${info.ruleName}」相关设定但未引用该规则`,
          suggestion: `内容中提到了与「${info.ruleName}」相关的关键词，建议在场景中引用此${info.ruleType === 'spread' ? '传播' : info.ruleType === 'deepen' ? '加深' : info.ruleType === 'release' ? '解除' : ''}规则以保持设定一致`,
          status: 'open',
          statusUpdatedAt: Date.now(),
        });
      }
    }
  }

  for (const choice of scene.choices) {
    if (choice.curseDelta > 0) {
      const deepenRules = rules.filter((r) => r.type === 'deepen');
      const hasDeepenRef = deepenRules.some((r) => scene.referencedRuleIds.includes(r.id));
      const choiceTextMentionsDeepen = deepenRules.some((r) => {
        const info = ruleKeywords.get(r.id);
        return info && choice.text.split('').some(() => {
          return info.keywords.some((kw) => choice.text.includes(kw) || scene.content.includes(kw));
        });
      });
      if (!hasDeepenRef && !choiceTextMentionsDeepen && deepenRules.length > 0 && choice.curseDelta >= 3) {
        issues.push({
          id: genIssueId(),
          type: 'warning',
          category: 'curse',
          sceneId: scene.id,
          choiceId: choice.id,
          chapterId: scene.chapterId,
          message: `分支「${choice.text.slice(0, 20)}…」诅咒值+${choice.curseDelta}但未引用加深规则`,
          suggestion: '建议在场景中引用对应的诅咒加深规则以保持设定一致',
          status: 'open',
          statusUpdatedAt: Date.now(),
        });
      }
    }

    if (choice.curseDelta < -3) {
      const releaseRules = rules.filter((r) => r.type === 'release');
      const hasReleaseRef = releaseRules.some((r) => scene.referencedRuleIds.includes(r.id));
      if (!hasReleaseRef && releaseRules.length > 0) {
        issues.push({
          id: genIssueId(),
          type: 'error',
          category: 'curse',
          sceneId: scene.id,
          choiceId: choice.id,
          chapterId: scene.chapterId,
          message: `分支「${choice.text.slice(0, 20)}…」诅咒值大幅降低（${choice.curseDelta}）但未引用任何解除规则`,
          suggestion: '请在场景中引用至少一条解除类诅咒规则，或调整诅咒值变化',
          status: 'open',
          statusUpdatedAt: Date.now(),
        });
      }
    }
  }

  for (const refId of scene.referencedRuleIds) {
    const rule = rules.find((r) => r.id === refId);
    if (!rule) continue;
    const info = ruleKeywords.get(refId);
    if (!info) continue;
    const isRelevant = info.keywords.some((kw) => contentText.includes(kw));
    if (!isRelevant && rule.type !== 'other') {
      const existing = issues.find(
        (i) => i.sceneId === scene.id && i.category === 'curse' && i.message.includes(rule.name) && i.type === 'info',
      );
      if (!existing) {
        issues.push({
          id: genIssueId(),
          type: 'info',
          category: 'curse',
          sceneId: scene.id,
          chapterId: scene.chapterId,
          message: `场景引用了「${rule.name}」但内容中未体现该规则相关描述`,
          suggestion: '如果场景内容不涉及此规则，可移除引用以保持简洁',
          status: 'open',
          statusUpdatedAt: Date.now(),
        });
      }
    }
  }
}

function validateSceneConnectivity(
  scene: Scene,
  _allScenes: Scene[],
  issues: ValidationIssue[],
): void {
  if (scene.choices.length === 0 && !scene.content.includes('结局')) {
    issues.push({
      id: genIssueId(),
      type: 'info',
      category: 'connectivity',
      sceneId: scene.id,
      chapterId: scene.chapterId,
      message: `场景「${scene.title}」没有分支选项，可能形成剧情死路`,
      suggestion: '如非结局场景，建议添加至少一个选项或跳转目标',
      status: 'open',
      statusUpdatedAt: Date.now(),
    });
  }

  for (const choice of scene.choices) {
    if (!choice.nextSceneId && !choice.endingId) {
      issues.push({
        id: genIssueId(),
        type: 'warning',
        category: 'connectivity',
        sceneId: scene.id,
        choiceId: choice.id,
        chapterId: scene.chapterId,
        message: `分支「${choice.text.slice(0, 20)}…」未设置下一场景或结局`,
        suggestion: '请配置该选项跳转到下一场景或指定结局',
        status: 'open',
        statusUpdatedAt: Date.now(),
      });
    }
  }
}

export interface ClueRevelationInfo {
  clueId: string;
  clueName: string;
  clueLevel: string;
  revealedInChapters: { chapterId: string; chapterTitle: string; sceneTitle: string }[];
  isRevealed: boolean;
}

export function buildClueRevelationMap(
  chapters: Chapter[],
  clues: Clue[],
): Map<string, ClueRevelationInfo> {
  const map = new Map<string, ClueRevelationInfo>();

  for (const clue of clues) {
    map.set(clue.id, {
      clueId: clue.id,
      clueName: clue.name,
      clueLevel: clue.level,
      revealedInChapters: [],
      isRevealed: false,
    });
  }

  for (const ch of chapters) {
    for (const sc of ch.scenes) {
      for (const clueId of sc.referencedClueIds) {
        const info = map.get(clueId);
        if (info) {
          info.revealedInChapters.push({
            chapterId: ch.id,
            chapterTitle: ch.title,
            sceneTitle: sc.title,
          });
          info.isRevealed = true;
        }
      }
    }
  }

  return map;
}

function validateForeshadowing(
  endings: Ending[],
  chapters: Chapter[],
  clues: Clue[],
  issues: ValidationIssue[],
): void {
  const revelationMap = buildClueRevelationMap(chapters, clues);

  for (const ending of endings) {
    if (ending.requiredClueIds.length === 0) continue;

    const missing: { name: string; level: string }[] = [];
    const partial: { name: string; chapters: string[] }[] = [];

    for (const reqId of ending.requiredClueIds) {
      const info = revelationMap.get(reqId);
      if (!info) continue;
      if (info.isRevealed) {
        partial.push({
          name: info.clueName,
          chapters: info.revealedInChapters.map((r) => r.chapterTitle),
        });
      } else {
        missing.push({ name: info.clueName, level: info.clueLevel });
      }
    }

    if (missing.length > 0) {
      const missingNames = missing.map((m) => `${m.name}[${m.level}]`).join('、');
      const endingChapterId = ending.chapterId;
      const type = ending.type === 'true' ? 'error' : 'warning';
      issues.push({
        id: genIssueId(),
        type,
        category: 'foreshadowing',
        chapterId: endingChapterId,
        message: `结局「${ending.title}」所需线索铺垫不足：${missingNames}尚未在任何章节中出现`,
        suggestion: `请在进入此结局前的章节中通过场景或对话揭示这些线索（已铺垫：${partial.length > 0 ? partial.map((p) => p.name).join('、') : '无'}）`,
        status: 'open',
        statusUpdatedAt: Date.now(),
      });
    }
  }
}

export function runValidation(state: ValidationState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const chapter of state.chapters) {
    for (const scene of chapter.scenes) {
      validateCurseRules(scene, state.rules, issues);
      validateCharacterSecrets(scene, state.characters, issues);
      validateSceneConnectivity(scene, chapter.scenes ?? [], issues);
    }
  }

  validateForeshadowing(state.endings, state.chapters, state.clues, issues);

  return issues;
}

export interface CurseFlowBranch {
  branchKey: string;
  snapshots: {
    chapterId: string;
    chapterTitle: string;
    sceneId: string;
    sceneTitle: string;
    choiceId?: string;
    choiceText?: string;
    curseValue: number;
    delta: number;
    warning?: 'spike' | 'early-release';
  }[];
  maxCurse: number;
  minCurse: number;
  endingId?: string;
  endingTitle?: string;
  endingType?: string;
}

export function buildCurseFlow(chapters: Chapter[], endings: Ending[]): CurseFlowBranch[] {
  const results: CurseFlowBranch[] = [];
  const sceneMap = new Map<string, Scene>();
  for (const ch of chapters) {
    for (const sc of ch.scenes) {
      sceneMap.set(sc.id, sc);
    }
  }
  const endingMap = new Map(endings.map((e) => [e.id, e]));

  function traverse(
    sceneId: string,
    currentCurse: number,
    path: CurseFlowBranch['snapshots'],
    visitedScenes: Set<string>,
    branchKey: string,
  ): void {
    if (visitedScenes.has(sceneId)) return;
    visitedScenes.add(sceneId);

    const scene = sceneMap.get(sceneId);
    if (!scene) return;

    const chapter = chapters.find((ch) => ch.scenes.some((s) => s.id === sceneId));
    if (!chapter) return;

    const entrySnapshot: CurseFlowBranch['snapshots'][0] = {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      sceneId: scene.id,
      sceneTitle: scene.title,
      curseValue: currentCurse,
      delta: 0,
    };
    const currentPath = [...path, entrySnapshot];

    if (scene.choices.length === 0) {
      const ending = endings.find((e) => e.chapterId === chapter.id && e.title.includes(scene.title));
      results.push({
        branchKey,
        snapshots: currentPath,
        maxCurse: Math.max(...currentPath.map((s) => s.curseValue)),
        minCurse: Math.min(...currentPath.map((s) => s.curseValue)),
        endingId: ending?.id,
        endingTitle: ending?.title,
        endingType: ending?.type,
      });
      return;
    }

    for (const choice of scene.choices) {
      const nextCurse = currentCurse + choice.curseDelta;
      let warning: 'spike' | 'early-release' | undefined;
      if (choice.curseDelta >= 3) warning = 'spike';
      if (choice.curseDelta <= -3 && currentCurse > 5) warning = 'early-release';

      const choiceSnapshot: CurseFlowBranch['snapshots'][0] = {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        sceneId: scene.id,
        sceneTitle: scene.title,
        choiceId: choice.id,
        choiceText: choice.text,
        curseValue: nextCurse,
        delta: choice.curseDelta,
        warning,
      };
      const choicePath = [...currentPath, choiceSnapshot];

      if (choice.endingId) {
        const ending = endingMap.get(choice.endingId);
        results.push({
          branchKey: `${branchKey}-${choice.id}`,
          snapshots: choicePath,
          maxCurse: Math.max(...choicePath.map((s) => s.curseValue)),
          minCurse: Math.min(...choicePath.map((s) => s.curseValue)),
          endingId: choice.endingId,
          endingTitle: ending?.title,
        });
        continue;
      }

      if (choice.nextSceneId) {
        traverse(choice.nextSceneId, nextCurse, choicePath, new Set(visitedScenes), `${branchKey}-${choice.id}`);
      } else {
        results.push({
          branchKey: `${branchKey}-${choice.id}`,
          snapshots: choicePath,
          maxCurse: Math.max(...choicePath.map((s) => s.curseValue)),
          minCurse: Math.min(...choicePath.map((s) => s.curseValue)),
        });
      }
    }
  }

  for (const chapter of chapters) {
    if (chapter.scenes.length > 0) {
      const firstScene = chapter.scenes[0];
      traverse(firstScene.id, 0, [], new Set(), `ch-${chapter.id}`);
    }
  }

  return results;
}

export interface ForeshadowingNode {
  clueId: string;
  clueName: string;
  clueLevel: string;
  firstRevealed?: { chapterId: string; chapterTitle: string; sceneTitle: string };
  lastRevealed?: { chapterId: string; chapterTitle: string; sceneTitle: string };
  allReveals: { chapterId: string; chapterTitle: string; sceneTitle: string }[];
  usedInEnding: boolean;
  status: 'revealed' | 'missing' | 'partial';
}

export interface ForeshadowingChain {
  endingId: string;
  endingTitle: string;
  endingType: string;
  nodes: ForeshadowingNode[];
  suggestion?: { chapterId: string; chapterTitle: string; reason: string };
}

export function buildForeshadowingChain(
  ending: Ending,
  chapters: Chapter[],
  clues: Clue[],
  revelationMap: Map<string, ClueRevelationInfo>,
): ForeshadowingChain {
  const nodes: ForeshadowingNode[] = [];

  for (const clueId of ending.requiredClueIds) {
    const clue = clues.find((c) => c.id === clueId);
    const info = revelationMap.get(clueId);
    if (!clue) continue;

    const reveals = info?.revealedInChapters ?? [];
    const status: ForeshadowingNode['status'] =
      reveals.length === 0 ? 'missing' : reveals.length >= 2 ? 'revealed' : 'partial';

    nodes.push({
      clueId,
      clueName: clue.name,
      clueLevel: clue.level,
      firstRevealed: reveals[0],
      lastRevealed: reveals[reveals.length - 1],
      allReveals: reveals,
      usedInEnding: true,
      status,
    });
  }

  let suggestion: ForeshadowingChain['suggestion'] | undefined;
  const missingClues = nodes.filter((n) => n.status === 'missing');
  if (missingClues.length > 0 && chapters.length > 0) {
    const endingChapter = chapters.find((ch) => ch.id === ending.chapterId);
    const chapterIndex = chapters.findIndex((ch) => ch.id === ending.chapterId);
    const prevChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : chapters[0];
    suggestion = {
      chapterId: prevChapter.id,
      chapterTitle: prevChapter.title,
      reason: `建议在「${prevChapter.title}」中铺垫：${missingClues.map((c) => c.clueName).join('、')}`,
    };
  }

  return {
    endingId: ending.id,
    endingTitle: ending.title,
    endingType: ending.type,
    nodes,
    suggestion,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
