<script setup lang="ts">
defineProps<{ action: 'idle' | 'walking' | 'jumping'; direction: -1 | 1 }>();
</script>

<template>
  <svg class="pet-character" :class="action" viewBox="0 0 200 190" aria-hidden="true" :style="{ '--look': `${direction * 2}px` }">
    <ellipse class="ground-shadow" cx="100" cy="179" rx="48" ry="5" fill="#17252c" opacity=".12" />
    <g class="cat">
      <g class="tail"><path d="M126 153 C166 172 191 143 179 119 C173 107 158 114 168 125" fill="none" stroke="#1c2025" stroke-width="14" stroke-linecap="round" /></g>
      <g class="torso">
        <ellipse cx="100" cy="141" rx="36" ry="34" fill="#1c2025" stroke="#3b424a" stroke-width="1" />
        <ellipse class="paw left-paw" cx="78" cy="170" rx="16" ry="8" fill="#171b20" />
        <ellipse class="paw right-paw" cx="123" cy="170" rx="16" ry="8" fill="#171b20" />
      </g>
      <g class="head">
        <path d="M49 73 L48 18 L78 39 Q100 30 122 39 L153 18 L152 74 Q157 119 101 120 Q46 118 49 73Z" fill="#1c2025" stroke="#3b424a" stroke-width="1.2" stroke-linejoin="round" />
        <path class="ear-mark" d="M56 31 L58 56 L71 44 M144 31 L142 56 L129 44" fill="#394047" />
        <g class="eyes">
          <ellipse cx="79" cy="79" rx="18" ry="23" fill="#fafcf8" />
          <ellipse cx="121" cy="79" rx="18" ry="23" fill="#fafcf8" />
          <g class="pupils">
            <ellipse cx="81" cy="82" rx="7" ry="14" fill="#11171b" />
            <ellipse cx="119" cy="82" rx="7" ry="14" fill="#11171b" />
            <circle cx="83" cy="76" r="2.1" fill="#fff" />
            <circle cx="121" cy="76" r="2.1" fill="#fff" />
          </g>
        </g>
        <path d="M97 103 L103 103 L100 106Z" fill="#737d86" />
        <path d="M94 109 Q97 113 100 109 Q103 113 106 109" fill="none" stroke="#87909a" stroke-width="1.5" stroke-linecap="round" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.pet-character { width: 180px; height: 171px; overflow: visible; filter: drop-shadow(0 3px 2px #00000018); pointer-events: none; }
.cat { transform-origin: 100px 173px; animation: breathe 3.2s ease-in-out infinite; }
.tail { transform-origin: 126px 153px; animation: tail-sway 2.6s ease-in-out infinite; }
.eyes { transform-origin: 100px 79px; animation: blink 5.2s infinite; }
.head { transform-origin: 100px 112px; }
.pupils { transform: translateX(var(--look)); transition: transform .3s; }
.walking .cat { animation: walk-bob .42s ease-in-out infinite; }
.walking .left-paw { animation: step .42s ease-in-out infinite; }
.walking .right-paw { animation: step .42s ease-in-out -.21s infinite; }
.jumping .cat { animation: hop .7s ease-out; }
.jumping .head { animation: head-tilt .7s ease-out; }
.jumping .ground-shadow { animation: shadow-hop .7s ease-out; transform-origin: 100px 179px; }
@keyframes breathe { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.015,.975); } }
@keyframes tail-sway { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(8deg); } }
@keyframes blink { 0%,88%,94%,100% { transform: scaleY(1); } 91% { transform: scaleY(.07); } }
@keyframes walk-bob { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-3px) rotate(1deg); } }
@keyframes step { 0%,100% { transform: translate(-3px,0); } 50% { transform: translate(3px,-4px); } }
@keyframes hop { 0%,100% { transform: translateY(0) scale(1); } 18% { transform: scale(1.08,.9); } 48% { transform: translateY(-27px) scale(.98,1.04); } 83% { transform: scale(1.05,.95); } }
@keyframes head-tilt { 45% { transform: rotate(-7deg); } }
@keyframes shadow-hop { 48% { transform: scaleX(.65); opacity: .06; } }
@media (prefers-reduced-motion: reduce) { .pet-character * { animation: none !important; transition: none !important; } }
</style>
