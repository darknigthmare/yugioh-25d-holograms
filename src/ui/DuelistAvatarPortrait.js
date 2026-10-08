import { DEFAULT_DUELIST_AVATAR_ID, getDuelistAvatar } from '../content/DuelistAvatarCatalog.js';
import { escapeHtml } from '../security.js';

const LINE = '#101326';

function hairShape(style, variant) {
  const shift = variant % 3;
  switch (style) {
    case 'star': return `M74 105 L45 87 L66 72 L41 41 L87 53 L81 18 L109 40 L123 9 L137 43 L164 24 L162 60 L199 48 L179 79 L202 92 L169 108 L154 91 L135 108 L119 86 L103 108 L85 87 Z`;
    case 'swept': return `M74 112 Q60 90 65 68 Q65 45 94 37 L158 25 L148 43 L180 40 L162 60 L185 58 L168 87 L157 108 L149 79 L135 92 L${108 + shift * 3} 69 L86 91 L81 112 Z`;
    case 'short': return 'M74 111 L69 82 Q69 44 105 36 Q143 23 168 49 L170 87 L159 113 L151 73 L130 83 L113 66 L89 84 L82 111 Z';
    case 'bob': return 'M65 126 L66 72 Q65 34 119 34 Q173 34 177 72 L180 126 L153 128 L153 79 L136 89 L124 67 L106 89 L84 83 L87 127 Z';
    case 'long': return 'M54 199 L59 79 Q60 32 119 29 Q179 31 181 79 L190 199 L157 174 L155 78 L131 89 L119 66 L102 91 L83 78 L85 171 Z';
    case 'ponytail': return 'M155 57 Q183 28 199 53 Q213 77 190 142 L173 160 L177 86 L162 75 L159 101 L152 76 L128 86 L111 66 L87 87 L79 108 L73 76 Q72 34 121 32 Q150 31 155 57 Z';
    case 'twin-tail': return 'M83 62 Q50 43 41 72 L34 163 L61 148 L76 85 L86 109 L91 76 L112 90 L124 68 L146 89 L155 76 L163 109 L171 85 L186 147 L208 162 L203 73 Q194 41 164 62 Q158 34 122 32 Q88 31 83 62 Z';
    case 'braided': return 'M75 110 L72 78 Q70 33 120 31 Q168 32 173 79 L164 111 L153 77 L130 91 L113 68 L88 88 L85 109 L72 114 L61 132 L70 149 L58 164 L68 182 L54 201 L65 212 L85 188 L77 172 L87 155 L78 138 L89 122 Z';
    case 'mohawk': return 'M83 99 L79 68 L99 73 L92 31 L109 46 L121 12 L134 46 L149 31 L142 72 L162 67 L158 100 L148 80 L126 90 L105 79 Z';
    case 'helmet': return 'M66 96 L68 67 Q72 26 120 24 Q168 26 172 67 L174 96 L158 110 L151 68 L136 79 L120 58 L104 79 L88 68 L82 110 Z';
    case 'bald': return '';
    default: return 'M73 104 L70 75 Q69 35 120 33 Q169 36 170 77 L164 105 L153 74 L136 90 L118 70 L95 87 L85 107 Z';
  }
}

function outfitShape(style, broad) {
  const left = 78 - broad;
  const right = 162 + broad;
  switch (style) {
    case 'long-coat': return `M92 125 L${left - 12} 140 L${left - 18} 266 L109 251 L120 181 L132 251 L${right + 18} 266 L${right + 12} 140 L148 125 L137 145 L120 165 L103 145 Z`;
    case 'robe': return `M93 127 L${left - 14} 145 L54 264 L187 264 L${right + 14} 145 L147 127 L120 153 Z`;
    case 'dress': return `M96 128 L${left} 145 L89 191 L60 256 L180 256 L151 191 L${right} 145 L145 128 L120 150 Z`;
    case 'armor': return `M95 127 L${left - 15} 142 L${left - 10} 169 L89 176 L91 213 L149 213 L151 176 L${right + 10} 169 L${right + 15} 142 L145 127 L135 140 L105 140 Z`;
    case 'mechanical': return `M95 129 L${left - 6} 143 L${left} 180 L94 205 L146 205 L${right} 180 L${right + 6} 143 L145 129 L120 145 Z`;
    case 'suit': return `M95 127 L${left - 7} 141 L87 212 L153 212 L${right + 7} 141 L145 127 L135 137 L120 169 L105 137 Z`;
    default: return `M95 128 L${left - 6} 141 L${left} 175 L90 204 L150 204 L${right} 175 L${right + 6} 141 L145 128 L133 142 L108 142 Z`;
  }
}

function outfitDetails(style, accent) {
  const stroke = `stroke="${accent}" stroke-width="3" fill="none"`;
  if (style === 'armor' || style === 'mechanical') return `<path d="M91 153 L107 143 L120 157 L133 143 L150 153 L143 186 L120 197 L97 186 Z" ${stroke}/><path d="M102 205 L107 175 M138 205 L133 175" ${stroke}/><path d="M120 159 L111 170 L120 182 L129 170 Z" fill="${accent}"/>`;
  if (style === 'long-coat' || style === 'suit') return `<path d="M93 129 L99 165 L115 159 L106 137 M147 129 L141 165 L125 159 L134 137 M120 169 L120 231" ${stroke}/><circle cx="125" cy="185" r="2" fill="${accent}"/><circle cx="125" cy="199" r="2" fill="${accent}"/>`;
  if (style === 'robe') return `<path d="M92 132 L120 176 L148 132 M88 235 Q120 245 152 235" ${stroke}/><path d="M111 174 L120 191 L129 174" fill="${accent}"/>`;
  if (style === 'uniform') return `<path d="M94 136 L146 136 M120 145 L120 204 M91 185 L149 185" ${stroke}/><path d="M139 145 L148 145 L148 155 L139 155 Z" fill="${accent}"/>`;
  if (style === 'dress') return `<path d="M94 135 Q120 153 146 135 M90 194 L150 194 M80 240 Q120 253 160 240" ${stroke}/><path d="M108 143 L120 152 L132 143 L127 163 L113 163 Z" fill="${accent}"/>`;
  if (style === 'sport') return `<path d="M89 148 L151 148 M93 161 L147 161 M97 177 L143 177" ${stroke}/><path d="M119 147 L119 201" stroke="${LINE}" stroke-width="2"/>`;
  return `<path d="M93 135 L103 157 L117 146 M147 135 L137 157 L123 146 M120 147 L120 204" ${stroke}/><path d="M96 179 L108 179 M132 179 L144 179" ${stroke}/>`;
}

function accessoryShape(accessory, accent, variant) {
  switch (accessory) {
    case 'puzzle': return `<path d="M107 120 L106 166 L134 166 L133 120" stroke="${accent}" stroke-width="2.5" fill="none"/><path d="M102 162 L138 162 L120 188 Z" fill="${accent}" stroke="${LINE}" stroke-width="2"/><path d="M111 170 L120 165 L129 170 L120 177 Z" fill="none" stroke="${LINE}" stroke-width="1.5"/><circle cx="120" cy="171" r="2" fill="${LINE}"/>`;
    case 'goggles': return `<path d="M84 62 L157 62" stroke="${LINE}" stroke-width="6"/><path d="M86 51 L111 51 L111 68 L86 68 Z M130 51 L155 51 L155 68 L130 68 Z" fill="${accent}" stroke="${LINE}" stroke-width="3"/><path d="M111 59 L130 59" stroke="${accent}" stroke-width="4"/><path d="M90 54 L100 54 M134 54 L144 54" stroke="#e5fbff" stroke-width="2"/>`;
    case 'headband': return `<path d="M79 74 Q120 61 161 74 L159 83 Q120 70 81 83 Z" fill="${accent}" stroke="${LINE}" stroke-width="2"/><path d="M158 77 L179 90 L173 119 L160 93" fill="${accent}" stroke="${LINE}" stroke-width="2"/>`;
    case 'hat': return `<path d="M70 62 L79 29 Q118 11 162 29 L169 61 Z" fill="${accent}" stroke="${LINE}" stroke-width="3"/><path d="M57 59 Q121 45 183 59 L183 70 Q121 58 57 70 Z" fill="${LINE}"/><path d="M80 43 L159 43" stroke="#e6e9f3" stroke-width="6"/>`;
    case 'glasses': return `<path d="M82 89 L109 89 L109 102 L83 102 Z M131 89 L158 89 L157 102 L131 102 Z" fill="${accent}" fill-opacity=".28" stroke="${LINE}" stroke-width="3"/><path d="M109 94 L131 94" stroke="${LINE}" stroke-width="3"/>`;
    case 'mask': return `<path d="M84 85 L120 78 L157 85 L151 107 L134 109 L120 101 L106 109 L89 107 Z" fill="${accent}" stroke="${LINE}" stroke-width="2"/><path d="M93 94 L110 94 M130 94 L147 94" stroke="#f9fbff" stroke-width="3"/>`;
    case 'scarf': return `<path d="M96 117 Q118 131 143 116 L151 132 Q120 143 88 133 Z" fill="${accent}" stroke="${LINE}" stroke-width="2"/><path d="M97 133 L77 181 L86 197 L113 136" fill="${accent}" stroke="${LINE}" stroke-width="2"/>`;
    case 'necklace': return `<path d="M101 124 L105 146 L120 157 L135 146 L140 124" stroke="${accent}" stroke-width="2.5" fill="none"/><path d="M120 151 L126 160 L120 169 L114 160 Z" fill="${accent}" stroke="${LINE}" stroke-width="1.5"/>`;
    case 'earpiece': return `<path d="M159 87 L169 89 L170 111 L162 115 Z" fill="${accent}" stroke="${LINE}" stroke-width="2"/><path d="M166 109 L155 115 L144 115" stroke="${LINE}" stroke-width="2" fill="none"/>`;
    case 'staff': return `<path d="M202 77 L190 270" stroke="${accent}" stroke-width="6"/><path d="M202 45 L215 60 L201 78 L188 61 Z" fill="${accent}" stroke="${LINE}" stroke-width="2"/><circle cx="201" cy="61" r="6" fill="#e6efff"/>`;
    default: return variant === 13 ? `<circle cx="155" cy="111" r="4" fill="${accent}" stroke="${LINE}" stroke-width="1.5"/>` : '';
  }
}

function signatureDetails(id, hair, accent) {
  switch (id) {
    case 'pegasus': return `<path d="M110 40 Q151 38 157 76 Q128 91 114 124 L95 120 Q110 99 105 78 L87 84 Z" fill="${hair}" stroke="${LINE}" stroke-width="2"/><path d="M133 97 L143 92 L153 97 L143 102 Z" fill="#d4b56b" stroke="${LINE}" stroke-width="1.5"/><circle cx="143" cy="97" r="2.5" fill="${LINE}"/>`;
    case 'yami-bakura':
    case 'bakura': return `<circle cx="120" cy="158" r="12" fill="none" stroke="${accent}" stroke-width="4"/><path d="M110 167 L105 178 L112 175 M115 170 L113 183 L120 178 M126 169 L130 182 L132 174 M131 162 L142 166 L138 158 M108 155 L97 155 L104 164" fill="${accent}" stroke="${LINE}" stroke-width="1"/>`;
    case 'yami-marik': return `<path d="M110 88 L120 82 L130 88 L120 94 Z" fill="none" stroke="${accent}" stroke-width="2"/><circle cx="120" cy="88" r="2" fill="${LINE}"/>`;
    case 'bandit-keith': return `<path d="M86 90 L109 90 L107 104 L88 103 Z M132 90 L155 90 L153 103 L134 104 Z" fill="${LINE}"/><path d="M108 94 L132 94" stroke="${LINE}" stroke-width="3"/><path d="M110 75 L114 69 L118 75 L115 79 Z M126 75 L130 69 L134 75 L131 79 Z" fill="#f6eee2"/>`;
    case 'yuma': return `<path d="M105 124 L107 148 L120 159 L133 148 L136 124" stroke="#dec37f" stroke-width="2" fill="none"/><path d="M116 150 L124 150 L124 172 L131 172 L131 178 L124 178 L124 183 L116 183 Z" fill="#dec37f" stroke="${LINE}" stroke-width="1.5"/><path d="M114 150 L120 145 L126 150 L120 156 Z" fill="${accent}"/>`;
    case 'yubel': return `<path d="M79 59 L63 29 L88 43 L95 61 M145 59 L174 29 L161 66" fill="#e7dce8" stroke="${LINE}" stroke-width="3"/><path d="M119 80 L125 90 L119 99 L113 90 Z" fill="${accent}" stroke="${LINE}" stroke-width="1.5"/>`;
    case 'astral': return `<path d="M119 64 L125 74 L119 84 L113 74 Z" fill="#e4fbff" stroke="${accent}" stroke-width="1.5"/><path d="M95 108 L107 114 M132 115 L144 109 M110 139 L120 150 L131 138" stroke="#c7f7ff" stroke-width="2" fill="none"/>`;
    default: return '';
  }
}

/** Portraits only consume the immutable catalogue entry; saved or supplied visuals are ignored. */
export function renderDuelistAvatarPortrait(avatarOrId, { className = '', label, decorative = false } = {}) {
  const avatar = getDuelistAvatar(typeof avatarOrId === 'string' ? avatarOrId : avatarOrId?.id)
    || getDuelistAvatar(DEFAULT_DUELIST_AVATAR_ID);
  if (!avatar) return '';
  const visual = avatar.visual;
  const { hairStyle, hairColor, hairAccent, skinColor, outfitStyle, outfitColor, accentColor, accessory, variant, build, pose, height } = visual;
  const broad = build === 'broad' ? 8 : build === 'slim' ? -3 : 0;
  const raised = pose === 'energetic' || pose === 'confident';
  const leftHand = raised ? 'M76 145 L60 158 L46 129 L34 131 L47 178 L66 180 L84 164 Z' : 'M76 145 L61 167 L54 208 L67 213 L83 176 L91 157 Z';
  const rightHand = pose === 'ready' ? 'M162 145 L177 154 L192 141 L202 152 L183 179 L164 172 L151 155 Z' : 'M162 145 L177 166 L184 208 L171 213 L156 176 L149 157 Z';
  const rear = accessory === 'cape' ? `<path d="M83 128 L54 149 L34 263 L106 248 L120 154 L138 253 L213 267 L186 148 L156 128 Z" fill="${accentColor}" stroke="${LINE}" stroke-width="3"/>` : accessory === 'wings' ? `<path d="M85 144 L24 106 L30 175 L68 205 L87 174 M156 144 L216 106 L210 175 L172 205 L153 174" fill="${accentColor}" fill-opacity=".75" stroke="${LINE}" stroke-width="3"/>` : '';
  const longHair = ['long', 'ponytail', 'twin-tail', 'braided'].includes(hairStyle);
  const hair = hairShape(hairStyle, variant);
  const face = `<path d="M84 78 Q81 72 78 81 L78 100 Q78 110 88 111 Q96 129 119 134 Q143 129 152 111 Q162 110 163 100 L163 82 Q160 73 155 79 L151 61 Q120 43 89 61 Z" fill="${skinColor}" stroke="${LINE}" stroke-width="3"/><path d="M86 96 L106 91 L110 96 M132 96 L137 91 L154 96" stroke="${LINE}" stroke-width="2" fill="none"/><path d="M89 98 L108 98 L103 104 L94 104 Z M134 98 L153 98 L148 104 L139 104 Z" fill="#f7f7ff"/><path d="M99 98 L99 104 M142 98 L142 104" stroke="${accentColor}" stroke-width="4"/><path d="M118 102 L116 112 L121 113 M112 122 Q120 125 128 121" stroke="${LINE}" stroke-width="1.5" fill="none"/>`;
  const hairLayer = hair ? `<path d="${hair}" fill="${hairColor}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><path d="${hairStyle === 'star' ? 'M86 53 L111 68 L103 96 L118 83 L122 42 L135 72 L136 96 L150 76 L161 56' : hairStyle === 'bald' ? '' : 'M87 67 L105 58 L122 69 L146 48 L139 70 L158 61'}" fill="none" stroke="${hairAccent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  const mechanicalMarks = outfitStyle === 'mechanical' ? `<path d="M119 65 L119 83 L112 91 M131 109 L144 115 M97 115 L108 119" stroke="${accentColor}" stroke-width="2" fill="none"/><circle cx="120" cy="81" r="3" fill="${accentColor}"/>` : '';
  const frontHair = longHair ? `<path d="M78 79 Q75 39 120 35 Q163 39 163 79 L151 83 L136 91 L120 65 L104 90 L87 83 Z" fill="${hairColor}" stroke="${LINE}" stroke-width="3"/><path d="M89 67 L111 56 L122 71 L145 56" stroke="${hairAccent}" stroke-width="4" fill="none"/>` : '';
  const stature = Math.max(.8, Math.min(1, .8 + ((Number(height) || 1) - .85) * .5));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 288" class="duelist-avatar-portrait ${escapeHtml(className)}" ${decorative ? 'aria-hidden="true" focusable="false"' : `role="img" aria-label="${escapeHtml(label || `Silhouette de ${avatar.name}`)}"`} data-avatar-portrait="${escapeHtml(avatar.id)}">
    ${decorative ? '' : `<title>${escapeHtml(label || avatar.name)}</title>`}
    <ellipse cx="120" cy="266" rx="69" ry="12" fill="${accentColor}" opacity=".15"/>
    <path d="M35 91 L120 16 L206 91 L192 218 L120 270 L48 218 Z" fill="${accentColor}" opacity=".055"/>
    <path d="M30 80 L30 57 L53 57 M186 57 L209 57 L209 80 M30 214 L30 238 L54 238 M186 238 L209 238 L209 214" stroke="${accentColor}" stroke-width="1.5" fill="none" opacity=".45"/>
    <g stroke-linejoin="round" stroke-linecap="round" transform="translate(120 266) scale(1 ${stature.toFixed(3)}) translate(-120 -266)">
      ${rear}${longHair ? hairLayer : ''}
      <path d="M93 192 L119 192 L118 247 L108 264 L78 264 L83 251 L96 245 Z M121 192 L147 192 L144 245 L157 251 L162 264 L132 264 L122 247 Z" fill="${outfitColor}" stroke="${LINE}" stroke-width="3"/>
      <path d="M79 258 L108 258 L109 268 L75 268 Z M132 258 L161 258 L165 268 L132 268 Z" fill="${LINE}"/><path d="M90 250 L105 250 M135 250 L148 250" stroke="${accentColor}" stroke-width="3"/>
      <path d="M106 118 L105 142 L135 142 L134 118 Z" fill="${skinColor}" stroke="${LINE}" stroke-width="2"/>
      <path d="${leftHand}" fill="${outfitColor}" stroke="${LINE}" stroke-width="3"/><path d="${rightHand}" fill="${outfitColor}" stroke="${LINE}" stroke-width="3"/>
      <path d="${raised ? 'M33 130 L32 120 L38 115 L44 119 L48 130 L43 138 Z' : 'M54 204 L50 215 L54 225 L63 223 L68 211 Z'}" fill="${skinColor}" stroke="${LINE}" stroke-width="2"/>
      <path d="${pose === 'ready' ? 'M193 142 L196 131 L203 129 L211 136 L210 145 L201 153 Z' : 'M171 207 L175 221 L184 226 L188 218 L185 206 Z'}" fill="${skinColor}" stroke="${LINE}" stroke-width="2"/>
      <path d="${outfitShape(outfitStyle, broad)}" fill="${outfitColor}" stroke="${LINE}" stroke-width="3"/>
      ${outfitDetails(outfitStyle, accentColor)}
      <path d="M88 195 L150 195 L150 204 L90 204 Z" fill="${LINE}"/><path d="M113 195 L128 195 L128 204 L113 204 Z" fill="${accentColor}"/>
      ${face}${longHair ? frontHair : hairLayer}${mechanicalMarks}${accessoryShape(accessory, accentColor, variant)}${signatureDetails(avatar.id, hairColor, accentColor)}
      <path d="M55 173 L74 183 L72 201 L47 190 Z" fill="#d4dce7" stroke="${LINE}" stroke-width="2"/><path d="M48 173 L65 162 L80 172 L65 181 Z" fill="${accentColor}" stroke="${LINE}" stroke-width="2"/><path d="M56 174 L59 172 M62 177 L65 175 M68 180 L71 178" stroke="${LINE}" stroke-width="2"/>
    </g>
  </svg>`;
}
