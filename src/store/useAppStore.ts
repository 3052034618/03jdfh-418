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
} from '@/types';
import {
  MOCK_RULES,
  MOCK_CHARACTERS,
  MOCK_CLUES,
  MOCK_WRITERS,
  MOCK_CHAPTERS,
  MOCK_ENDINGS,
} from '@/data/mockData';
import { runValidation } from '@/utils/validation';

interface AppState {
  currentUserId: string;
  rules: CurseRule[];
  characters: Character[];
  clues: Clue[];
  writers: Writer[];
  chapters: Chapter[];
  endings: Ending[];
  validationIssues: ValidationIssue[];

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
        const issues = runValidation(state);
        set({ validationIssues: issues });
      },
      runChapterValidation: (chapterId: string) => {
        const state = get();
        const allIssues = runValidation(state);
        const chapter = state.chapters.find((ch) => ch.id === chapterId);
        const sceneIds = new Set(chapter?.scenes.map((s) => s.id) ?? []);
        const chapterIssueIds = new Set(
          allIssues.filter((i) => i.sceneId && sceneIds.has(i.sceneId)).map((i) => i.id),
        );
        const foreshadowIssues = allIssues.filter((i) => i.category === 'foreshadowing');
        for (const fi of foreshadowIssues) {
          chapterIssueIds.add(fi.id);
        }
        const otherIssues = state.validationIssues.filter(
          (i) => !i.sceneId || !sceneIds.has(i.sceneId),
        );
        const newChapterIssues = allIssues.filter((i) => chapterIssueIds.has(i.id));
        set({ validationIssues: [...otherIssues.filter((i) => i.category !== 'foreshadowing'), ...newChapterIssues] });
      },
      clearValidation: () => set({ validationIssues: [] }),
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
      }),
    },
  ),
);

export { genId };
