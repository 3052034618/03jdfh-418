import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CurseRule,
  Character,
  Clue,
  Writer,
  Chapter,
  Ending,
  Scene,
  Choice,
  ValidationIssue,
  RuleType,
  SecretLevel,
  ClueLevel,
  ChapterStatus,
  EndingType,
  EndingStatus,
  IssueStatus,
  CursePointSnapshot,
} from '@/types';
import {
  MOCK_RULES,
  MOCK_CHARACTERS,
  MOCK_CLUES,
  MOCK_WRITERS,
  MOCK_CHAPTERS,
  MOCK_ENDINGS,
} from '@/data/mockData';
import { runValidation, buildCurseFlow, type CurseFlowBranch } from '@/utils/validation';

function hashIssueContent(i: Omit<ValidationIssue, 'id' | 'status' | 'statusUpdatedAt'>): string {
  const key = `${i.category}|${i.sceneId ?? ''}|${i.choiceId ?? ''}|${i.characterId ?? ''}|${i.chapterId ?? ''}|${i.secretTopic ?? ''}|${i.message}`;
  let h = 0;
  for (let k = 0; k < key.length; k++) {
    h = (h << 5) - h + key.charCodeAt(k);
    h |= 0;
  }
  return `${i.category}-${Math.abs(h).toString(36)}`;
}

interface AppState {
  currentUserId: string;
  rules: CurseRule[];
  characters: Character[];
  clues: Clue[];
  writers: Writer[];
  chapters: Chapter[];
  endings: Ending[];
  validationIssues: ValidationIssue[];
  pendingForeshadowing: Record<string, { clueId: string; clueTitle: string; endingId: string; endingTitle: string; addedAt: number }[]>;

  setCurrentUser: (id: string) => void;

  addRule: (rule: Omit<CurseRule, 'id' | 'createdAt'>) => void;
  updateRule: (id: string, patch: Partial<CurseRule>) => void;
  deleteRule: (id: string) => void;

  addCharacter: (character: Omit<Character, 'id'>) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  addClue: (clue: Omit<Clue, 'id'>) => void;
  updateClue: (id: string, patch: Partial<Clue>) => void;
  deleteClue: (id: string) => void;

  addChapter: (chapter: Omit<Chapter, 'id' | 'scenes'>) => void;
  updateChapter: (id: string, patch: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  setChapterWriter: (chapterId: string, writerId: string) => void;
  setChapterStatus: (chapterId: string, status: ChapterStatus) => void;

  addScene: (chapterId: string, scene: Omit<Scene, 'id' | 'chapterId' | 'choices'>) => void;
  updateScene: (chapterId: string, sceneId: string, patch: Partial<Scene>) => void;
  deleteScene: (chapterId: string, sceneId: string) => void;

  addChoice: (chapterId: string, sceneId: string, choice: Omit<Choice, 'id' | 'sceneId'>) => void;
  updateChoice: (chapterId: string, sceneId: string, choiceId: string, patch: Partial<Choice>) => void;
  deleteChoice: (chapterId: string, sceneId: string, choiceId: string) => void;

  addEnding: (ending: Omit<Ending, 'id'>) => void;
  updateEnding: (id: string, patch: Partial<Ending>) => void;
  setEndingStatus: (id: string, status: EndingStatus) => void;
  deleteEnding: (id: string) => void;

  runFullValidation: () => void;
  runChapterValidation: (chapterId: string) => void;
  clearValidation: () => void;
  clearChapterIssues: (chapterId: string) => void;
  setIssueStatus: (issueId: string, status: IssueStatus) => void;
  setIssueStatusBatch: (issueIds: string[], status: IssueStatus) => void;

  addPendingForeshadowing: (chapterId: string, clue: { clueId: string; clueTitle: string; endingId: string; endingTitle: string }) => void;
  clearPendingForeshadowing: (chapterId: string) => void;
  removePendingForeshadowing: (chapterId: string, clueId: string) => void;

  buildCurseFlow: () => CurseFlowBranch[];
}

const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUserId: 'w-lead',
      rules: MOCK_RULES,
      characters: MOCK_CHARACTERS,
      clues: MOCK_CLUES,
      writers: MOCK_WRITERS,
      chapters: MOCK_CHAPTERS,
      endings: MOCK_ENDINGS,
      validationIssues: [],
      pendingForeshadowing: {},

      setCurrentUser: (id) => set({ currentUserId: id }),

      addRule: (rule) =>
        set((s) => ({
          rules: [...s.rules, { ...rule, id: genId('r'), createdAt: Date.now() }],
        })),
      updateRule: (id, patch) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRule: (id) =>
        set((s) => ({
          rules: s.rules.filter((r) => r.id !== id),
        })),

      addCharacter: (character) =>
        set((s) => ({
          characters: [...s.characters, { ...character, id: genId('c') }],
        })),
      updateCharacter: (id, patch) =>
        set((s) => ({
          characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteCharacter: (id) =>
        set((s) => ({
          characters: s.characters.filter((c) => c.id !== id),
        })),

      addClue: (clue) =>
        set((s) => ({
          clues: [...s.clues, { ...clue, id: genId('clue') }],
        })),
      updateClue: (id, patch) =>
        set((s) => ({
          clues: s.clues.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteClue: (id) =>
        set((s) => ({
          clues: s.clues.filter((c) => c.id !== id),
        })),

      addChapter: (chapter) =>
        set((s) => ({
          chapters: [...s.chapters, { ...chapter, id: genId('ch'), scenes: [] }],
        })),
      updateChapter: (id, patch) =>
        set((s) => ({
          chapters: s.chapters.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)),
        })),
      deleteChapter: (id) =>
        set((s) => ({
          chapters: s.chapters.filter((ch) => ch.id !== id),
        })),
      setChapterWriter: (chapterId, writerId) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, writerId } : ch,
          ),
        })),
      setChapterStatus: (chapterId, status) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, status } : ch,
          ),
        })),

      addScene: (chapterId, scene) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId
              ? {
                  ...ch,
                  scenes: [...ch.scenes, { ...scene, id: genId('s'), chapterId, choices: [] }],
                }
              : ch,
          ),
        })),
      updateScene: (chapterId, sceneId, patch) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId
              ? {
                  ...ch,
                  scenes: ch.scenes.map((sc) =>
                    sc.id === sceneId ? { ...sc, ...patch } : sc,
                  ),
                }
              : ch,
          ),
        })),
      deleteScene: (chapterId, sceneId) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId
              ? { ...ch, scenes: ch.scenes.filter((sc) => sc.id !== sceneId) }
              : ch,
          ),
        })),

      addChoice: (chapterId, sceneId, choice) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId
              ? {
                  ...ch,
                  scenes: ch.scenes.map((sc) =>
                    sc.id === sceneId
                      ? { ...sc, choices: [...sc.choices, { ...choice, id: genId('chc'), sceneId }] }
                      : sc,
                  ),
                }
              : ch,
          ),
        })),
      updateChoice: (chapterId, sceneId, choiceId, patch) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId
              ? {
                  ...ch,
                  scenes: ch.scenes.map((sc) =>
                    sc.id === sceneId
                      ? {
                          ...sc,
                          choices: sc.choices.map((c) =>
                            c.id === choiceId ? { ...c, ...patch } : c,
                          ),
                        }
                      : sc,
                  ),
                }
              : ch,
          ),
        })),
      deleteChoice: (chapterId, sceneId, choiceId) =>
        set((s) => ({
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId
              ? {
                  ...ch,
                  scenes: ch.scenes.map((sc) =>
                    sc.id === sceneId
                      ? { ...sc, choices: sc.choices.filter((c) => c.id !== choiceId) }
                      : sc,
                  ),
                }
              : ch,
          ),
        })),

      addEnding: (ending) =>
        set((s) => ({
          endings: [...s.endings, { ...ending, id: genId('e') }],
        })),
      updateEnding: (id, patch) =>
        set((s) => ({
          endings: s.endings.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      setEndingStatus: (id, status) =>
        set((s) => ({
          endings: s.endings.map((e) => (e.id === id ? { ...e, status } : e)),
        })),
      deleteEnding: (id) =>
        set((s) => ({
          endings: s.endings.filter((e) => e.id !== id),
        })),

      runFullValidation: () => {
        const state = get();
        const now = Date.now();
        const existingStatusMap = new Map(
          state.validationIssues.map((i) => {
            const { id, status, statusUpdatedAt, ...rest } = i;
            return [hashIssueContent(rest), { id, status, statusUpdatedAt }] as const;
          }),
        );
        const issues = runValidation(state).map((issue) => {
          const { id, status: _s, statusUpdatedAt: _t, ...rest } = issue;
          const key = hashIssueContent(rest);
          const existing = existingStatusMap.get(key);
          return {
            ...issue,
            id: existing?.id ?? issue.id,
            status: existing?.status ?? 'open',
            statusUpdatedAt: existing?.statusUpdatedAt ?? now,
          };
        });
        set({ validationIssues: issues });
      },
      runChapterValidation: (chapterId: string) => {
        const state = get();
        const now = Date.now();
        const allIssues = runValidation(state);
        const existingStatusMap = new Map(
          state.validationIssues.map((i) => {
            const { id, status, statusUpdatedAt, ...rest } = i;
            return [hashIssueContent(rest), { id, status, statusUpdatedAt }] as const;
          }),
        );
        const issuesWithStatus = allIssues.map((issue) => {
          const { id, status: _s, statusUpdatedAt: _t, ...rest } = issue;
          const key = hashIssueContent(rest);
          const existing = existingStatusMap.get(key);
          return {
            ...issue,
            id: existing?.id ?? issue.id,
            status: existing?.status ?? 'open',
            statusUpdatedAt: existing?.statusUpdatedAt ?? now,
          };
        });
        const chapter = state.chapters.find((ch) => ch.id === chapterId);
        const sceneIds = new Set(chapter?.scenes.map((s) => s.id) ?? []);
        const chapterIssueIds = new Set(
          issuesWithStatus.filter((i) => i.sceneId && sceneIds.has(i.sceneId)).map((i) => i.id),
        );
        const foreshadowIssues = issuesWithStatus.filter((i) => i.category === 'foreshadowing');
        for (const fi of foreshadowIssues) {
          chapterIssueIds.add(fi.id);
        }
        const otherIssues = state.validationIssues.filter(
          (i) => !i.sceneId || !sceneIds.has(i.sceneId),
        );
        const newChapterIssues = issuesWithStatus.filter((i) => chapterIssueIds.has(i.id));
        const preservedOtherIssues = otherIssues.filter((i) => i.category !== 'foreshadowing');
        const allChapterSceneIds = new Set(newChapterIssues.map((i) => `${i.sceneId}-${i.category}-${i.message}`));
        const dedupedOtherIssues = preservedOtherIssues.filter((oi) => {
          if (oi.category === 'foreshadowing') return false;
          const sig = `${oi.sceneId}-${oi.category}-${oi.message}`;
          return !allChapterSceneIds.has(sig);
        });
        set({ validationIssues: [...dedupedOtherIssues, ...newChapterIssues] });
      },
      clearValidation: () => set({ validationIssues: [] }),
      clearChapterIssues: (chapterId: string) => {
        set((s) => {
          const chapter = s.chapters.find((ch) => ch.id === chapterId);
          const sceneIds = new Set(chapter?.scenes.map((sc) => sc.id) ?? []);
          return {
            validationIssues: s.validationIssues.filter((i) => {
              if (i.category === 'foreshadowing') return true;
              if (i.chapterId === chapterId) return false;
              if (i.sceneId && sceneIds.has(i.sceneId)) return false;
              return true;
            }),
          };
        });
      },
      setIssueStatus: (issueId, status) => {
        const now = Date.now();
        set((s) => ({
          validationIssues: s.validationIssues.map((i) =>
            i.id === issueId ? { ...i, status, statusUpdatedAt: now } : i,
          ),
        }));
      },
      setIssueStatusBatch: (issueIds, status) => {
        const now = Date.now();
        const ids = new Set(issueIds);
        set((s) => ({
          validationIssues: s.validationIssues.map((i) =>
            ids.has(i.id) ? { ...i, status, statusUpdatedAt: now } : i,
          ),
        }));
      },
      buildCurseFlow: () => {
        const state = get();
        return buildCurseFlow(state.chapters, state.endings);
      },
      addPendingForeshadowing: (chapterId, clue) => {
        set((s) => {
          const existing = s.pendingForeshadowing[chapterId] ?? [];
          const exists = existing.some((e) => e.clueId === clue.clueId && e.endingId === clue.endingId);
          if (exists) return {};
          return {
            pendingForeshadowing: {
              ...s.pendingForeshadowing,
              [chapterId]: [...existing, { ...clue, addedAt: Date.now() }],
            },
          };
        });
      },
      clearPendingForeshadowing: (chapterId) => {
        set((s) => {
          const next = { ...s.pendingForeshadowing };
          delete next[chapterId];
          return { pendingForeshadowing: next };
        });
      },
      removePendingForeshadowing: (chapterId, clueId) => {
        set((s) => {
          const existing = s.pendingForeshadowing[chapterId];
          if (!existing) return {};
          const next = existing.filter((e) => e.clueId !== clueId);
          return {
            pendingForeshadowing: {
              ...s.pendingForeshadowing,
              [chapterId]: next,
            },
          };
        });
      },
    }),
    {
      name: 'curse-workbench',
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        rules: state.rules,
        characters: state.characters,
        clues: state.clues,
        writers: state.writers,
        chapters: state.chapters,
        endings: state.endings,
        validationIssues: state.validationIssues,
        pendingForeshadowing: state.pendingForeshadowing,
      }),
    },
  ),
);

export { genId };
