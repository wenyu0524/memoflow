<script setup lang="ts">
import { computed } from 'vue';
import type { PetAction } from '@/utils/pet/petMotion';

const props = withDefaults(defineProps<{ action: PetAction; direction: -1 | 1; lookY?: number }>(), { lookY: 0 });
const moving = computed(() => props.action === 'walking' || props.action === 'running');
</script>

<template>
  <svg class="pet-character" :class="action" viewBox="0 0 220 220" aria-hidden="true" :style="{ '--look-x': `${direction * 2}px`, '--look-y': `${lookY}px` }">
    <defs>
      <linearGradient id="xiaohei-coat" x1="0" y1="0" x2=".7" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#263038" /><stop offset=".48" stop-color="#131b20" /><stop offset="1" stop-color="#090f13" /></linearGradient>
    </defs>
    <ellipse class="ground-shadow" cx="110" cy="202" :rx="moving ? 72 : 48" ry="5" fill="#102a26" opacity=".12" />

    <!-- A separate four-legged silhouette keeps locomotion from looking like a sliding sitting cat. -->
    <g v-if="moving" :transform="direction < 0 ? 'translate(220 0) scale(-1 1)' : undefined">
      <g class="traveller">
        <g class="travel-tail"><path :d="action === 'running' ? 'M67 158 C43 149 28 146 10 156' : 'M67 158 C38 176 12 145 20 119 C24 107 36 111 30 123'" fill="none" stroke="#111a1f" stroke-width="13" stroke-linecap="round" /><path v-if="action !== 'running'" d="M64 156 C39 165 20 145 23 128" fill="none" stroke="#3c535b" stroke-opacity=".35" stroke-width="2" stroke-linecap="round" /></g>
        <g class="leg far-back"><path d="M88 164 Q98 181 87 195 L100 198" /></g>
        <g class="leg far-front"><path d="M142 164 Q138 180 149 195 L159 197" /></g>
        <path class="travel-body" d="M54 155 Q56 129 93 132 Q120 122 150 142 L168 159 Q155 179 120 177 Q88 183 63 172Z" fill="url(#xiaohei-coat)" stroke="#293a40" stroke-width="1" />
        <path d="M70 145 Q97 134 126 142" fill="none" stroke="#658085" stroke-opacity=".16" stroke-width="2" stroke-linecap="round" />
        <g class="leg near-back"><path d="M76 165 Q64 180 72 195 L86 198" /></g>
        <g class="leg near-front"><path d="M150 161 Q161 180 157 195 L171 198" /></g>
        <g class="travel-head">
          <path d="M137 113 L136 75 Q139 69 146 79 L159 94 L178 74 Q184 69 186 78 L190 111 Q211 120 202 139 Q190 155 162 150 Q138 145 137 113Z" fill="url(#xiaohei-coat)" stroke="#2f4247" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M141 83 L143 102 L152 98 M180 83 L172 99 L182 103" fill="#46595d" opacity=".5" />
          <g class="travel-eyes">
            <ellipse cx="159" cy="117" rx="12" ry="17" fill="#f4fbef" /><ellipse cx="184" cy="117" rx="11" ry="16" fill="#f4fbef" />
            <g class="pupils"><ellipse cx="163" cy="119" rx="6" ry="11" fill="#071419" /><ellipse cx="188" cy="119" rx="5" ry="10" fill="#071419" /><circle cx="165" cy="114" r="2" fill="#fff" /><circle cx="189" cy="114" r="1.7" fill="#fff" /></g>
          </g>
          <path d="M199 128 L205 130 L200 133Z" fill="#809596" /><path d="M194 138 Q199 141 203 136" fill="none" stroke="#839998" stroke-width="1.3" stroke-linecap="round" />
        </g>
      </g>
    </g>

    <g v-else class="cat">
      <g class="tail"><path d="M136 181 C180 204 212 169 194 140 C185 127 172 135 181 148" fill="none" stroke="#10191e" stroke-width="14" stroke-linecap="round" /><path d="M145 182 Q179 195 193 174" fill="none" stroke="#526e72" stroke-opacity=".3" stroke-width="2" stroke-linecap="round" /></g>
      <path d="M86 130 Q63 153 72 181 Q80 200 110 198 Q146 199 150 176 Q153 147 132 130Z" fill="url(#xiaohei-coat)" stroke="#293b42" stroke-width="1" />
      <path d="M90 150 Q83 169 88 186 M131 150 Q138 170 132 186" fill="none" stroke="#344c52" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round" />
      <ellipse cx="88" cy="195" rx="17" ry="8" fill="#0c151a" /><ellipse cx="132" cy="195" rx="17" ry="8" fill="#0c151a" />
      <path d="M81 195 l0 3 M86 195 l0 3 M128 195 l0 3 M133 195 l0 3" stroke="#3a5055" stroke-opacity=".5" stroke-linecap="round" />
      <g class="head">
        <path class="left-ear" d="M50 86 L39 27 Q38 20 45 24 L82 52Z" fill="url(#xiaohei-coat)" stroke="#31434a" stroke-width="1.2" stroke-linejoin="round" />
        <path class="right-ear" d="M138 52 L176 24 Q182 20 181 28 L170 88Z" fill="url(#xiaohei-coat)" stroke="#31434a" stroke-width="1.2" stroke-linejoin="round" />
        <path d="M48 39 L55 67 L68 58 M171 39 L152 58 L164 67" fill="#486065" opacity=".45" />
        <path d="M51 67 Q72 45 109 48 Q148 46 169 69 L175 94 L181 103 L173 104 L177 114 L168 113 Q155 141 110 143 Q66 141 52 116 L43 116 L48 106 L39 105 L47 95Z" fill="url(#xiaohei-coat)" stroke="#2e4349" stroke-width="1.1" stroke-linejoin="round" />
        <path d="M66 65 Q91 53 118 56" fill="none" stroke="#86aaa8" stroke-opacity=".13" stroke-width="2" stroke-linecap="round" />
        <g class="eyes">
          <ellipse cx="83" cy="96" rx="22" ry="26" fill="#f4fbef" /><ellipse cx="137" cy="96" rx="22" ry="26" fill="#f4fbef" />
          <g class="pupils">
            <ellipse cx="85" cy="98" rx="9" ry="17" fill="#071419" /><ellipse cx="135" cy="98" rx="9" ry="17" fill="#071419" />
            <ellipse cx="88" cy="90" rx="3" ry="4" fill="#fff" /><ellipse cx="138" cy="90" rx="3" ry="4" fill="#fff" />
            <circle cx="82" cy="106" r="1.5" fill="#abc8ba" /><circle cx="132" cy="106" r="1.5" fill="#abc8ba" />
          </g>
        </g>
        <path d="M106 122 Q110 120 114 122 L110 126Z" fill="#779393" />
        <path d="M102 129 Q106 134 110 129 Q114 134 118 129" fill="none" stroke="#8ba5a2" stroke-width="1.5" stroke-linecap="round" />
        <path v-if="action === 'jumping'" d="M106 133 L108 138 L110 133 M112 133 L114 137 L116 132" fill="#f4fbef" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.pet-character { width: 190px; height: 190px; overflow: visible; filter: drop-shadow(0 3px 2px #0000001c); pointer-events: none; }
.cat { transform-origin: 110px 197px; animation: breathe 3.3s ease-in-out infinite; }
.tail { transform-origin: 137px 181px; animation: tail-sway 3s ease-in-out infinite; }
.eyes { transform-origin: 110px 96px; animation: blink 4.7s infinite; }
.head { transform-origin: 110px 133px; }
.left-ear { transform-origin: 65px 70px; animation: ear-twitch 8.6s infinite; }
.right-ear { transform-origin: 155px 70px; animation: ear-twitch 8.6s 1.4s infinite; }
.pupils { transform: translate(var(--look-x),var(--look-y)); transition: transform .25s ease; }
.traveller { transform-origin: 110px 195px; animation: walk-bob .64s ease-in-out infinite; }
.travel-tail { transform-origin: 66px 157px; animation: travel-tail 1.1s ease-in-out infinite; }
.travel-eyes { transform-origin: 172px 117px; animation: blink 2.8s infinite; }
.travel-eyes .pupils { transform: translate(2px,var(--look-y)); }
.leg { stroke: #111a1f; stroke-width: 12; stroke-linecap: round; stroke-linejoin: round; fill: none; animation: leg-step .64s ease-in-out infinite; }
.near-front { transform-origin: 150px 164px; }
.near-back { transform-origin: 76px 164px; animation-delay: -.32s; }
.far-front { transform-origin: 142px 164px; animation-delay: -.16s; stroke: #304047; }
.far-back { transform-origin: 88px 164px; animation-delay: -.48s; stroke: #304047; }
.running .traveller { animation: gallop .26s ease-in-out infinite; }
.running .leg { animation-name: run-step; animation-duration: .26s; }
.running .near-back, .running .far-front { animation-delay: -.13s; }
.running .far-back { animation-delay: 0s; }
.running .travel-tail { animation-duration: .35s; }
.running .travel-head { transform-origin: 160px 143px; animation: run-head .26s ease-in-out infinite; }
.jumping .cat { animation: hop .7s ease-out; }
.jumping .head { animation: head-tilt .7s ease-out; }
.jumping .ground-shadow { animation: shadow-hop .7s ease-out; transform-origin: 110px 202px; }
@keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.012,.98); } }
@keyframes tail-sway { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(9deg); } }
@keyframes blink { 0%,86%,94%,100% { transform: scaleY(1); } 90% { transform: scaleY(.07); } }
@keyframes ear-twitch { 0%,84%,94%,100% { transform: rotate(0); } 87% { transform: rotate(-7deg); } 90% { transform: rotate(4deg); } }
@keyframes walk-bob { 0%,50%,100% { transform: translateY(0); } 25%,75% { transform: translateY(-2px); } }
@keyframes travel-tail { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(10deg); } }
@keyframes leg-step { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(19deg); } }
@keyframes gallop { 0%,100% { transform: translateY(0) scale(1.04,.94); } 50% { transform: translateY(-9px) scale(.97,1.03); } }
@keyframes run-step { 0%,100% { transform: rotate(-37deg); } 50% { transform: rotate(40deg); } }
@keyframes run-head { 0%,100% { transform: rotate(4deg); } 50% { transform: rotate(-5deg); } }
@keyframes hop { 0%,100% { transform: translateY(0) scale(1); } 18% { transform: scale(1.08,.9); } 48% { transform: translateY(-27px) scale(.98,1.04); } 83% { transform: scale(1.05,.95); } }
@keyframes head-tilt { 45% { transform: rotate(-7deg); } }
@keyframes shadow-hop { 48% { transform: scaleX(.65); opacity: .06; } }
@media (prefers-reduced-motion: reduce) { .pet-character * { animation: none !important; transition: none !important; } }
</style>
