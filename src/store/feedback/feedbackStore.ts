import { defineStore } from 'pinia';

interface FeedbackState {
  savedVisible: boolean;
}

let savedTimer: number | undefined;

export const useFeedbackStore = defineStore('feedback', {
  state: (): FeedbackState => ({
    savedVisible: false,
  }),
  actions: {
    showSaved() {
      this.savedVisible = true;

      if (savedTimer !== undefined) {
        window.clearTimeout(savedTimer);
      }

      savedTimer = window.setTimeout(() => {
        this.savedVisible = false;
      }, 2_000);
    },
  },
});

