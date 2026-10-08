import React from 'react';

interface ChaiMugHeroProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ChaiMugHero: React.FC<ChaiMugHeroProps> = ({
  className = '',
  size = 'md',
}) => {
  // Dimensions
  const dimMap = {
    sm: { w: 180, h: 140 },
    md: { w: 240, h: 175 },
    lg: { w: 290, h: 210 },
  };
  const { w, h } = dimMap[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ maxWidth: '100%' }}
    >
      <svg
        width={w}
        height={h}
        viewBox="0 0 280 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)] transition-transform duration-300 hover:scale-[1.02]"
      >
        <defs>
          {/* Terracotta Clay Mug Gradients */}
          <linearGradient id="terracottaMugBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8A3414" />
            <stop offset="25%" stopColor="#C25324" />
            <stop offset="60%" stopColor="#D9632F" />
            <stop offset="85%" stopColor="#AB431A" />
            <stop offset="100%" stopColor="#68220A" />
          </linearGradient>

          <linearGradient id="terracottaHandle" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C25324" />
            <stop offset="50%" stopColor="#E06E38" />
            <stop offset="100%" stopColor="#6E230B" />
          </linearGradient>

          {/* Steaming Chai Liquid Gradient */}
          <radialGradient id="chaiLiquid" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5AC6A" />
            <stop offset="55%" stopColor="#C97836" />
            <stop offset="85%" stopColor="#8C4616" />
            <stop offset="100%" stopColor="#5E2A0B" />
          </radialGradient>

          {/* Ginger Root Gradient */}
          <linearGradient id="gingerSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2B77B" />
            <stop offset="40%" stopColor="#C49658" />
            <stop offset="80%" stopColor="#9C6E35" />
            <stop offset="100%" stopColor="#6E481D" />
          </linearGradient>
          <linearGradient id="gingerCut" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="100%" stopColor="#E5C16C" />
          </linearGradient>

          {/* Green Cardamom Pod Gradient */}
          <linearGradient id="cardamomPod" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A8BD76" />
            <stop offset="50%" stopColor="#7E9A4B" />
            <stop offset="100%" stopColor="#4D6328" />
          </linearGradient>

          {/* Cinnamon Bark Gradient */}
          <linearGradient id="cinnamonStick" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5A2411" />
            <stop offset="35%" stopColor="#8C3F1F" />
            <stop offset="70%" stopColor="#B3582E" />
            <stop offset="100%" stopColor="#481B0B" />
          </linearGradient>

          {/* Star Anise Gradient */}
          <linearGradient id="starAniseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7A391A" />
            <stop offset="100%" stopColor="#3E1A0B" />
          </linearGradient>

          {/* Soft Shadow Filter */}
          <radialGradient id="tableVignette" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Base Shadow under mug and spices */}
        <ellipse cx="170" cy="180" rx="95" ry="24" fill="url(#tableVignette)" />
        <ellipse cx="80" cy="188" rx="55" ry="16" fill="url(#tableVignette)" />

        {/* ======================================================== */}
        {/* 2. THE TERRACOTTA CLAY CHAI MUG (AS IN PREVIEW.JPG)        */}
        {/* ======================================================== */}
        {/* Mug Handle */}
        <path
          d="M215 82 C248 82 258 114 246 142 C236 162 216 160 205 152"
          stroke="url(#terracottaHandle)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
        {/* Handle inner shadow */}
        <path
          d="M214 84 C243 84 252 112 242 138 C234 154 218 154 207 149"
          stroke="#4D1705"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
        />

        {/* Mug Body */}
        <path
          d="M136 68 H222 L212 168 C211 176 200 182 179 182 C158 182 147 176 146 168 Z"
          fill="url(#terracottaMugBody)"
        />

        {/* Mug Clay Rim */}
        <ellipse
          cx="179"
          cy="68"
          rx="44"
          ry="15"
          fill="#A44018"
          stroke="#5C1F08"
          strokeWidth="1.5"
        />

        {/* Hot Steaming Chai Surface inside Mug */}
        <ellipse
          cx="179"
          cy="69"
          rx="40"
          ry="13"
          fill="url(#chaiLiquid)"
        />
        {/* Chai milk froth swirl */}
        <ellipse
          cx="184"
          cy="69"
          rx="32"
          ry="9.5"
          fill="#FFE2BA"
          opacity="0.32"
        />
        <path
          d="M165 67 C174 72 188 71 198 67 C191 66 172 65 165 67 Z"
          fill="#FFF4E0"
          opacity="0.45"
        />

        {/* Subtle Clay Rim Highlight */}
        <path
          d="M140 70 C155 78 203 78 218 70"
          stroke="#FFA570"
          strokeWidth="1.6"
          fill="none"
          opacity="0.75"
        />

        {/* Mug Body Curved Highlights & Shadow */}
        <path
          d="M152 78 C150 110 151 142 153 168"
          stroke="#FF8850"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M208 76 C210 108 207 140 205 168"
          stroke="#381003"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* ======================================================== */}
        {/* 3. STEAM RISING FROM THE HOT CHAI                        */}
        {/* ======================================================== */}
        <g opacity="0.85">
          <path
            d="M166 54 C163 42 173 34 169 22 C166 14 171 7 175 2"
            stroke="#FFF2DC"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
          <path
            d="M182 50 C186 38 178 30 184 18 C188 10 185 4 182 0"
            stroke="#FFE6BC"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M196 54 C200 44 194 36 200 25 C204 17 201 10 197 4"
            stroke="#FFF5E5"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
        </g>

        {/* ======================================================== */}
        {/* 4. WHOLE SPICES SCATTERED (GINGER, CARDAMOM, CINNAMON)    */}
        {/* ======================================================== */}
        {/* Cinnamon Sticks (tucked near the base of the mug) */}
        {/* Stick 1 */}
        <g transform="rotate(-15 125 178)">
          <rect
            x="95"
            y="172"
            width="58"
            height="11"
            rx="5.5"
            fill="url(#cinnamonStick)"
          />
          <path
            d="M96 177 H150"
            stroke="#381306"
            strokeWidth="1.4"
            strokeDasharray="4 2"
            opacity="0.75"
          />
          <ellipse cx="96" cy="177.5" rx="3" ry="5" fill="#3D1507" />
          <ellipse cx="96" cy="177.5" rx="1.8" ry="3.2" fill="#8C3F1F" />
        </g>
        {/* Stick 2 */}
        <g transform="rotate(8 135 186)">
          <rect
            x="105"
            y="180"
            width="52"
            height="10"
            rx="5"
            fill="url(#cinnamonStick)"
          />
          <path
            d="M106 185 H154"
            stroke="#FF9564"
            strokeWidth="0.8"
            opacity="0.45"
          />
        </g>

        {/* Fresh Whole Ginger Root Piece (prominent in preview.jpg) */}
        <g id="gingerRootGroup">
          {/* Main knobby body */}
          <path
            d="M52 178 C42 172 38 156 50 148 C60 140 76 142 82 152 C88 144 99 146 103 154 C108 164 102 176 92 180 C84 184 72 186 64 186 C58 186 54 182 52 178 Z"
            fill="url(#gingerSkin)"
            stroke="#5C3B14"
            strokeWidth="1.2"
          />
          {/* Ginger node ridges / lines */}
          <path
            d="M56 162 C62 165 67 163 72 160"
            stroke="#6B4519"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M78 156 C82 160 88 159 93 156"
            stroke="#6B4519"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M62 174 C69 177 78 174 86 170"
            stroke="#6B4519"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Fresh Cut Ginger Slice */}
          <ellipse
            cx="44"
            cy="166"
            rx="11"
            ry="9"
            fill="url(#gingerCut)"
            stroke="#B58641"
            strokeWidth="1.2"
          />
          {/* Fiber ring inside cut */}
          <ellipse
            cx="44"
            cy="166"
            rx="7"
            ry="5.5"
            fill="none"
            stroke="#DFB155"
            strokeWidth="0.8"
            strokeDasharray="2 1.5"
          />
          <circle cx="44" cy="166" r="1.5" fill="#FFEAA0" />
        </g>

        {/* Green Cardamom Pods (Elaichi) */}
        {/* Pod 1 */}
        <g transform="rotate(-24 148 190)">
          <path
            d="M142 186 C138 182 142 174 148 172 C154 174 158 182 154 186 C150 190 146 190 142 186 Z"
            fill="url(#cardamomPod)"
            stroke="#2B3C11"
            strokeWidth="0.8"
          />
          <path
            d="M148 172 Q148 180 148 188"
            stroke="#BFE089"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <circle cx="148" cy="171.5" r="0.9" fill="#2E4014" />
        </g>
        {/* Pod 2 */}
        <g transform="rotate(35 168 192)">
          <path
            d="M162 188 C158 184 162 177 167 175 C173 177 177 184 173 188 C169 192 165 192 162 188 Z"
            fill="url(#cardamomPod)"
            stroke="#2B3C11"
            strokeWidth="0.8"
          />
          <path
            d="M167 175 Q167 182 167 190"
            stroke="#BFE089"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <circle cx="167" cy="174.5" r="0.9" fill="#2E4014" />
        </g>
        {/* Pod 3 */}
        <g transform="rotate(75 196 186)">
          <path
            d="M192 184 C188 180 192 174 196 172 C202 174 205 180 202 184 C198 187 195 187 192 184 Z"
            fill="url(#cardamomPod)"
            stroke="#2B3C11"
            strokeWidth="0.8"
          />
          <path
            d="M196 172 Q196 178 196 186"
            stroke="#BFE089"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </g>

        {/* Star Anise (Spice Pod) */}
        <g transform="translate(106, 178) scale(0.65)">
          <path
            d="M20 20 L20 4 L24 16 L36 12 L26 22 L36 30 L22 26 L18 38 L16 26 L4 30 L12 20 L2 14 L15 16 Z"
            fill="url(#starAniseGrad)"
            stroke="#2B1107"
            strokeWidth="1.2"
          />
          <circle cx="20" cy="20" r="4.5" fill="#5A2710" />
          <circle cx="20" cy="20" r="2.2" fill="#D98A52" />
        </g>

        {/* Whole Cloves (Laung) scatter */}
        {/* Clove 1 */}
        <g transform="rotate(40 88 184)">
          <line x1="86" y1="184" x2="94" y2="184" stroke="#481B09" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="95" cy="184" r="2.2" fill="#753518" />
          <circle cx="95" cy="184" r="1.1" fill="#D48658" />
        </g>
        {/* Clove 2 */}
        <g transform="rotate(-65 118 192)">
          <line x1="116" y1="192" x2="123" y2="192" stroke="#481B09" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="124" cy="192" r="2" fill="#753518" />
        </g>
      </svg>
    </div>
  );
};
