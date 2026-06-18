import type { ValidationIssue, CurseRule, Character, Clue, Chapter, Ending, Scene } from '@/types';

interface ValidationState {
  rules: CurseRule[];
  characters: Character[];
  clues: Clue[];
  chapters: Chapter[];
  endings: Ending[];
}

const genIssueId = () => `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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

function validateCurseRules(
  scene: Scene,
  rules: CurseRule[],
  issues: ValidationIssue[],
): void {
  for (const choice of scene.choices) {
    if (choice.endingId && choice.curseDelta < -5) {
      const releaseRules = rules.filter((r) => r.type === 'release');
      const hasReleaseRef = releaseRules.some((r) => scene.referencedRuleIds.includes(r.id));
      if (releaseRules.length > 0 && !hasReleaseRef) {
        issues.push({
          id: genIssueId(),
          type: 'error',
          category: 'curse',
          sceneId: scene.id,
          choiceId: choice.id,
          message: `分支「${choice.text.slice(0, 20)}…」诅咒值大幅降低但未引用任何解除规则`,
          suggestion: '请在场景中引用至少一条解除类诅咒规则，或调整诅咒值变化',
        });
      }
    }

    if (choice.curseDelta > 2) {
      const deepenRules = rules.filter((r) => r.type === 'deepen');
      const hasRef = deepenRules.some((r) => scene.referencedRuleIds.includes(r.id));
      if (!hasRef && deepenRules.length > 0) {
        issues.push({
          id: genIssueId(),
          type: 'warning',
          category: 'curse',
          sceneId: scene.id,
          choiceId: choice.id,
          message: `分支「${choice.text.slice(0, 20)}…」诅咒值+${choice.curseDelta}但未对应加深规则`,
          suggestion: '建议在场景描述里引用对应的诅咒加深规则以保持设定一致',
        });
      }
    }
  }
}

function validateCharacterSecrets(
  scene: Scene,
  characters: Character[],
  issues: ValidationIssue[],
): void {
  const truthKeywords = ['诅咒', '血字', '镜子', '仪式', '标记', '三年前', '失踪', '真相'];

  for (const charId of scene.characterIds) {
    const char = characters.find((c) => c.id === charId);
    if (!char) continue;

    const saidTruth = truthKeywords.some(
      (kw) => scene.content.includes(`${char.name}说`) && scene.content.includes(kw),
    );

    if (saidTruth && char.secretLevel <= 1 && !char.knowsTruth) {
      issues.push({
        id: genIssueId(),
        type: 'error',
        category: 'character',
        sceneId: scene.id,
        message: `角色「${char.name}」（知情等级${char.secretLevel}）在场景中可能说出了超出其知情范围的内容`,
        suggestion: `该角色仅为${char.secretLevel === 0 ? '完全不知情' : '略有怀疑'}，请确认对话内容或调整角色秘密等级`,
      });
    }

    if (scene.content.includes(`${char.name}知道诅咒的真相`) && !char.knowsTruth) {
      issues.push({
        id: genIssueId(),
        type: 'error',
        category: 'character',
        sceneId: scene.id,
        message: `场景描述「${scene.title}」暗示${char.name}知道真相，但角色档案标记为不知真相`,
        suggestion: '请统一角色知情设定，或修改场景描述',
      });
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
      message: `场景「${scene.title}」没有分支选项，可能形成剧情死路`,
      suggestion: '如非结局场景，建议添加至少一个选项或跳转目标',
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
        message: `分支「${choice.text.slice(0, 20)}…」未设置下一场景或结局`,
        suggestion: '请配置该选项跳转到下一场景或指定结局',
      });
    }
  }
}

function validateForeshadowing(
  endings: Ending[],
  chapters: Chapter[],
  clues: Clue[],
  issues: ValidationIssue[],
): void {
  const revealedClueIds = new Set<string>();
  for (const ch of chapters) {
    for (const sc of ch.scenes) {
      sc.referencedClueIds.forEach((id) => revealedClueIds.add(id));
    }
  }

  for (const ending of endings) {
    const missing: string[] = [];
    for (const reqId of ending.requiredClueIds) {
      if (!revealedClueIds.has(reqId)) {
        const clue = clues.find((c) => c.id === reqId);
        if (clue) missing.push(clue.name);
      }
    }
    if (missing.length > 0 && ending.type === 'true') {
      issues.push({
        id: genIssueId(),
        type: 'error',
        category: 'foreshadowing',
        message: `结局「${ending.title}」所需线索铺垫不足：${missing.join('、')}尚未在任何场景中出现`,
        suggestion: '请在对应章节中通过场景或对话揭示这些线索，否则玩家无法合理进入真结局',
      });
    }
    if (missing.length > 0 && ending.type !== 'true') {
      issues.push({
        id: genIssueId(),
        type: 'warning',
        category: 'foreshadowing',
        message: `结局「${ending.title}」有${missing.length}条线索未在剧情中出现`,
        suggestion: missing.length > 0
          ? `缺失：${missing.join('、')}`
          : '请确认这些线索是否需要在剧情中铺垫',
      });
    }
  }
}
