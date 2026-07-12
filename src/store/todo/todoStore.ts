import { defineStore } from 'pinia';
import type { TodoItem } from '@/types/todo';
import { useFeedbackStore } from '@/store/feedback/feedbackStore';
import { createId } from '@/utils/id/createId';
import { isBlankRichText, normalizeRichText } from '@/utils/richText/richText';
import { readJsonFile, writeJsonFile } from '@/utils/storage/jsonStorage';

interface TodoState {
  items: TodoItem[];
  loaded: boolean;
}

function timestamp() {
  return new Date().toISOString();
}

export const useTodoStore = defineStore('todo', {
  state: (): TodoState => ({
    items: [],
    loaded: false,
  }),
  getters: {
    remainingCount: (state) => state.items.filter((item) => !item.completed).length,
  },
  actions: {
    async hydrate() {
      if (this.loaded) {
        return;
      }

      this.items = await readJsonFile('todo');
      this.loaded = true;
    },
    async save() {
      await writeJsonFile('todo', this.items);
      useFeedbackStore().showSaved();
    },
    async add(title: string) {
      const normalizedTitle = normalizeRichText(title);

      if (isBlankRichText(normalizedTitle)) {
        return;
      }

      const now = timestamp();

      this.items.push({
        id: createId('todo'),
        title: normalizedTitle,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });

      await this.save();
    },
    async remove(id: string) {
      this.items = this.items.filter((item) => item.id !== id);
      await this.save();
    },
    async updateTitle(id: string, title: string) {
      const target = this.items.find((item) => item.id === id);

      if (!target) {
        return;
      }

      target.title = normalizeRichText(title);
      target.updatedAt = timestamp();
      await this.save();
    },
    async cleanupBlank(id: string) {
      const target = this.items.find((item) => item.id === id);

      if (!target) {
        return;
      }

      if (isBlankRichText(target.title)) {
        await this.remove(id);
        return;
      }

      target.title = normalizeRichText(target.title);
      target.updatedAt = timestamp();
      await this.save();
    },
    async toggle(id: string) {
      const target = this.items.find((item) => item.id === id);

      if (!target) {
        return;
      }

      target.completed = !target.completed;
      target.updatedAt = timestamp();
      await this.save();
    },
  },
});
