import { defineStore } from 'pinia';
import type { MemoDocument } from '@/types/memo';
import { useFeedbackStore } from '@/store/feedback/feedbackStore';
import { readJsonFile, writeJsonFile } from '@/utils/storage/jsonStorage';

interface MemoState {
  document: MemoDocument;
  loaded: boolean;
}

export const useMemoStore = defineStore('memo', {
  state: (): MemoState => ({
    document: {
      content: '',
      updatedAt: null,
    },
    loaded: false,
  }),
  actions: {
    async hydrate() {
      if (this.loaded) {
        return;
      }

      this.document = await readJsonFile('memo');
      this.loaded = true;
    },
    async updateContent(content: string) {
      this.document = {
        content,
        updatedAt: new Date().toISOString(),
      };

      await writeJsonFile('memo', this.document);
      useFeedbackStore().showSaved();
    },
  },
});
