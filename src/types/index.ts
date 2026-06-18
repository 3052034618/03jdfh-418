export type RuleType = 'spread' | 'deepen' | 'release' | 'other';
export type SecretLevel = 0 | 1 | 2 | 3;
export type ClueLevel = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type ChapterStatus = 'draft' | 'writing' | 'review' | 'done';
export type EndingType = 'true' | 'bad' | 'loop' | 'hidden';
export type EndingStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'lead' | 'writer' | 'viewer';

export interface CurseRule {
  id: string;
  name: string;
  type: RuleType;
  description: string;
  relatedRuleIds: string[];
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  avatar?: string;
  secretLevel: SecretLevel;
  knowsTruth: boolean;
  knownSecrets: string;
  notes: string;
}

export interface Clue {
  id: string;
  name: string;
  content: string;
  level: ClueLevel;
  sourceChapterId?: string;
}

export interface Writer {
  id: string;
  name: string;
  role: UserRole;
}

export interface Choice {
  id: string;
  sceneId: string;
  text: string;
  nextSceneId?: string;
  endingId?: string;
  curseDelta: number;
  unlockCondition?: string;
}

export interface Scene {
  id: string;
  chapterId: string;
  title: string;
  content: string;
  characterIds: string[];
  referencedRuleIds: string[];
  referencedClueIds: string[];
  choices: Choice[];
}

export interface Chapter {
  id: string;
  title: string;
  writerId: string;
  status: ChapterStatus;
  summary: string;
  scenes: Scene[];
}

export interface Ending {
  id: string;
  chapterId: string;
  type: EndingType;
  title: string;
  description: string;
  requiredClueIds: string[];
  entryCondition: string;
  status: EndingStatus;
}

export type ValidationCategory = 'curse' | 'character' | 'foreshadowing' | 'connectivity' | 'other';
export type ValidationType = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  type: ValidationType;
  category: ValidationCategory;
  message: string;
  suggestion?: string;
  sceneId?: string;
  choiceId?: string;
}

export const RULE_TYPE_LABEL: Record<RuleType, string> = {
  spread: '传播规则',
  deepen: '加深规则',
  release: '解除规则',
  other: '其他设定',
};

export const SECRET_LEVEL_LABEL: Record<SecretLevel, string> = {
  0: '完全不知情',
  1: '略有怀疑',
  2: '部分知情',
  3: '完全知晓',
};

export const CHAPTER_STATUS_LABEL: Record<ChapterStatus, string> = {
  draft: '草稿',
  writing: '撰写中',
  review: '待审稿',
  done: '已定稿',
};

export const ENDING_TYPE_LABEL: Record<EndingType, string> = {
  true: '真结局',
  bad: '坏结局',
  loop: '循环结局',
  hidden: '隐藏结局',
};

export const ENDING_STATUS_LABEL: Record<EndingStatus, string> = {
  pending: '待审',
  approved: '已通过',
  rejected: '需修改',
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  lead: '项目负责人',
  writer: '编剧',
  viewer: '只读成员',
};

export const VALIDATION_CATEGORY_LABEL: Record<ValidationCategory, string> = {
  curse: '诅咒设定',
  character: '角色泄密',
  foreshadowing: '铺垫完整度',
  connectivity: '逻辑连通',
  other: '其他',
};
