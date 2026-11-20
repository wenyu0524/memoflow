export const reminderStyles = {
  cute: '可爱型 🥰', funny: '诙谐有趣型 🤣', strict: '有进攻性型 😈', encouraging: '鼓励型 💪',
} as const;
export type ReminderStyle = keyof typeof reminderStyles;

const fixed: Record<ReminderStyle, string[]> = {
  cute: [
    '主人～还有待办事项没有完成哦！', '呜呜，还有事情没做完呢，陪你一起加油！',
    '还有小任务在等着你哟，别忘记啦！', '主人主人！你的待办清单还没有清空哦！',
    '偷偷提醒一下，还有事情没有完成呢～', '今天也要做一个完成任务的小能手呀！',
    '任务还在等你哦，快来摸摸我的头，然后开始努力吧！', '不要让待办事项孤零零地待在那里嘛！',
  ],
  funny: [
    '你看看你，待办清单都快长蘑菇了！', '任务：我还在！主人：我没看见！',
    '友情提示：你的待办事项正在原地罚站。', '你是不是忘了什么？你的待办清单表示很受伤。',
    '再不做任务，待办清单就要申请独立了！', '别装忙了，我都看见你的任务还没完成了！',
    '你的待办事项比你的工作热情还顽强。', '任务还没完成，你倒是先摸鱼了？',
  ],
  strict: [
    '还不动？任务准备在这里过年吗？', '看什么看，任务做完了吗？', '别摸鱼了！你的任务还欠着呢！',
    '说好的今天完成呢？你的行动力呢？', '再拖下去，明天的你就要骂今天的你了！',
    '任务还没完成，你倒是挺悠闲啊？', '别找借口了，起来干活！',
    '你可以继续摆烂，但待办清单不会自己消失！', '这么点任务都搞不定？赶紧行动！', '别让我催第二遍，快去完成任务！',
  ],
  encouraging: [
    '一步一步来，每完成一项都在向目标靠近。', '挑一件最容易开始的事，现在就行动吧！',
    '你已经准备好了，小黑陪你把任务逐个完成。', '不用一次做好所有事，先专注眼前这一项。',
    '每一次行动，都比停留在计划里更进一步。', '给自己一点时间，也给任务一个开始。',
    '今天的努力会积累起来，我们继续吧！', '先迈出一小步，你比自己想象的更有力量。',
  ],
};

export const dynamicMessages: Record<ReminderStyle, Record<'one' | 'several' | 'many' | 'complete', string[]>> = {
  cute: {
    one: ['主人～只剩最后 {count} 项啦，小黑陪你收尾！', '还有最后 {count} 个小任务在等你，完成就抱抱～'],
    several: ['还有 {count} 项任务等着你哟，我们一起加油！', '小黑数了数，还有 {count} 个小任务，慢慢来～'],
    many: ['哇！{count} 项待办堆成小山啦，先完成一件好不好～', '还有 {count} 个小任务排着队，小黑陪你一个个来！'],
    complete: ['太棒啦！任务全部完成，给你一个大大的抱抱！', '主人好厉害！待办清空啦，摸摸小黑庆祝一下～'],
  },
  funny: {
    one: ['只剩 {count} 项！最后这位钉子户，安排一下？', '待办只剩 {count} 位选手，坚持到最后是吧！'],
    several: ['还有 {count} 项任务正在排队等你翻牌！', '友情播报：{count} 项待办还在原地罚站。'],
    many: ['{count} 项待办已经组团了，再不处理要开年会啦！', '你的待办小山高达 {count} 项，先铲一小块？'],
    complete: ['待办清零！任务们终于集体下班了！', '恭喜通关！待办清单今天正式宣布：查无任务！'],
  },
  strict: {
    one: ['就剩 {count} 项了，还等什么？赶紧收尾！', '最后 {count} 项任务，别把胜利拖到明天！'],
    several: ['还有 {count} 项没完成，别找借口，现在开始！', '{count} 项任务还欠着呢，拿出行动来！'],
    many: ['已经积了 {count} 项！别继续堆了，立刻处理一件！', '{count} 项待办不会自己消失，先把最重要的做完！'],
    complete: ['全部完成！这才是你的行动力，干得漂亮！', '待办清零，今天表现不错！现在可以放心休息了。'],
  },
  encouraging: {
    one: ['只剩 {count} 项，你已经离完成很近了，稳稳收尾吧！', '最后 {count} 项了，再迈一步就能完成目标！'],
    several: ['还有 {count} 项任务，按优先级一步一步推进就好。', '{count} 项待办，先选一项开始，每一步都算数！'],
    many: ['还有 {count} 项也没关系，先完成最重要的一项。', '{count} 项任务可以分成小步，小黑陪你逐个解决。'],
    complete: ['所有任务完成！你的坚持值得好好庆祝。', '今天的任务全部完成，你做到了！给自己一个休息的奖励吧。'],
  },
};

export function formatReminder(template: string, variables: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (token, key: string) => String(variables[key] ?? token));
}

export function pickReminder(style: ReminderStyle, count: number, previous = '', random = Math.random) {
  const scenario = count === 0 ? 'complete' : count === 1 ? 'one' : count >= 6 ? 'many' : 'several';
  const dynamic = dynamicMessages[style][scenario];
  // Alternate between count-aware and fixed wording, while never repeating the last sentence.
  const pool = count === 0 || random() < .6 ? dynamic : fixed[style];
  const candidates = pool.map(message => formatReminder(message, { count })).filter(message => message !== previous);
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}

export interface TodoSnapshot { remaining: number; completed: number; total: number }
export function shouldCelebrate(previous: TodoSnapshot | undefined, current: TodoSnapshot) {
  return Boolean(previous && previous.remaining > 0 && current.remaining === 0
    && current.total > 0 && current.completed > previous.completed);
}
