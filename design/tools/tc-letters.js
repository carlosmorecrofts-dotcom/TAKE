// upright shapes, skewed later about baseline y=700
const T='M11,265 H591 L560,385 H380 V700 H200 V385 H11 Z';
const C='M470,465 H752 L730,522 H602 Q560,522 560,562 V598 Q560,638 602,638 H737 L715,695 H470 Q420,695 420,645 V515 Q420,465 470,465 Z';
function letter(d,id){return `
 <g transform="translate(0,700) skewX(-24) translate(0,-700)">
  ${[24,22,20,18,16,14,12,10,8,6,4,2].map(k=>`<path d="${d}" transform="translate(${k*0.6},${k})" fill="url(#chrome)" stroke="none"/>`).join('')}
  <path d="${d}" fill="#0a0408" stroke="#c9d3e0" stroke-width="5" stroke-linejoin="round"/>
  <clipPath id="cl${id}"><path d="${d}"/></clipPath>
  <g clip-path="url(#cl${id})">
   <path d="${d}" fill="url(#face)"/>
   <path d="${d}" fill="none" stroke="#5a0016" stroke-width="40" stroke-linejoin="round"/>
   <path d="${d}" fill="none" stroke="#ff1e5a" stroke-width="26" stroke-linejoin="round" filter="url(#glow)"/>
   <path d="${d}" fill="none" stroke="#0a0408" stroke-width="18" stroke-linejoin="round"/>
   <path d="${d}" fill="none" stroke="#ff3b75" stroke-width="14" stroke-linejoin="round" filter="url(#glow)"/>
   <path d="${d}" fill="none" stroke="#ffe3ea" stroke-width="5" stroke-linejoin="round"/>
  </g>
 </g>`}
function svg(body,vb){return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${vb}">
<defs>
 <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d97a6"/><stop offset=".45" stop-color="#2a2f38"/><stop offset=".55" stop-color="#d7dee8"/><stop offset="1" stop-color="#14171d"/></linearGradient>
 <radialGradient id="face" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#2a0010"/><stop offset="1" stop-color="#7a0022"/></radialGradient>
 <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="halo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="28"/></filter>
</defs>
<rect x="-2000" y="-2000" width="5000" height="5000" fill="#000"/>${body}</svg>`}
const halo=d=>`<g transform="translate(0,700) skewX(-24) translate(0,-700)" opacity=".55"><path d="${d}" fill="none" stroke="#ff1e5a" stroke-width="30" filter="url(#halo)"/></g>`;
module.exports={
 'tc-rebuilt.svg':svg(halo(T)+halo(C)+letter(T,'t')+letter(C,'c'),'0 0 1024 1024'),
 't-alone.svg':svg(halo(T)+letter(T,'t'),'60 140 780 780'),
 'c-alone.svg':svg(halo(C)+letter(C,'c'),'360 330 560 560'),
};
