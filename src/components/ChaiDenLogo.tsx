import React from 'react';

interface ChaiDenLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSubtitle?: boolean;
}

export const ChaiDenLogo: React.FC<ChaiDenLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  // Dimensions based on size
  const dimMap = {
    sm: 40,
    md: 64,
    lg: 96,
    xl: 130,
    '2xl': 160,
  };
  const dim = dimMap[size];

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className} select-none`}>
      <svg
        width={dim}
        height={dim * 1.18}
        viewBox="0 0 140 165"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] drop-shadow-[0_0_12px_rgba(223,183,108,0.3)] transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Rich metallic gold gradient */}
          <linearGradient id="goldGradientMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF7D6" />
            <stop offset="25%" stopColor="#E5C16C" />
            <stop offset="55%" stopColor="#C89736" />
            <stop offset="85%" stopColor="#DFB76C" />
            <stop offset="100%" stopColor="#8A5A12" />
          </linearGradient>

          {/* Inner medal background */}
          <radialGradient id="logoMedalBg" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#251208" />
            <stop offset="70%" stopColor="#150803" />
            <stop offset="100%" stopColor="#0B0301" />
          </radialGradient>

          {/* Leaf green/gold gradient */}
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF1B8" />
            <stop offset="100%" stopColor="#C4932F" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="softGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ======================================================== */}
        {/* 1. CIRCULAR MEDALLION BADGE                                */}
        {/* ======================================================== */}
        {/* Main circular fill */}
        <circle
          cx="70"
          cy="65"
          r="58"
          fill="url(#logoMedalBg)"
          stroke="url(#goldGradientMain)"
          strokeWidth="3.2"
        />

        {/* Inner concentric dotted gold ring */}
        <circle
          cx="70"
          cy="65"
          r="53"
          fill="none"
          stroke="url(#goldGradientMain)"
          strokeWidth="0.9"
          strokeDasharray="2.5 2"
          opacity="0.85"
        />

        {/* ======================================================== */}
        {/* 2. STEAMING CHAI CUP WITH FLANKING TEA LEAVES             */}
        {/* ======================================================== */}
        {/* Left tea leaf sprig */}
        <path
          d="M38 46 C34 40 37 34 46 38 C43 43 41 46 38 46 Z"
          fill="url(#leafGrad)"
          opacity="0.95"
        />
        <path
          d="M39 45 Q44 39 46 38"
          stroke="#5C3B07"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* Right tea leaf sprig */}
        <path
          d="M102 46 C106 40 103 34 94 38 C97 43 99 46 102 46 Z"
          fill="url(#leafGrad)"
          opacity="0.95"
        />
        <path
          d="M101 45 Q96 39 94 38"
          stroke="#5C3B07"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* 3 Whisps of Elegant Steam */}
        <path
          d="M62 33 C62 26 67 27 67 21"
          stroke="url(#goldGradientMain)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M70 31 C70 24 75 25 75 18"
          stroke="url(#goldGradientMain)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M78 33 C78 26 83 27 83 21"
          stroke="url(#goldGradientMain)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Cup Bowl */}
        <path
          d="M52 37 H88 C88 50 81 56 70 56 C59 56 52 50 52 37 Z"
          fill="url(#goldGradientMain)"
        />
        {/* Cup Rim Highlight */}
        <ellipse cx="70" cy="37" rx="18" ry="2.6" fill="#FFF9E0" opacity="0.9" />

        {/* Cup Handle */}
        <path
          d="M87 40 C93 40 97 42 97 46 C97 50 93 52 87 52"
          stroke="url(#goldGradientMain)"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Saucer */}
        <path
          d="M49 58 C58 61 82 61 91 58"
          stroke="url(#goldGradientMain)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* ======================================================== */}
        {/* 3. TYPOGRAPHY: "The", "Chai Den", "PREMIUM CAFE"          */}
        {/* ======================================================== */}
        {/* "The" in graceful script */}
        <text
          x="70"
          y="72"
          textAnchor="middle"
          fill="#FFF2C2"
          fontSize="11.5"
          fontStyle="italic"
          fontFamily="'Playfair Display', 'Cormorant Garamond', Georgia, serif"
          fontWeight="600"
          letterSpacing="0.04em"
        >
          The
        </text>

        {/* "Chai Den" in bold regal serif typography */}
        <text
          x="70"
          y="89"
          textAnchor="middle"
          fill="url(#goldGradientMain)"
          fontSize="17.5"
          fontFamily="'Cinzel', serif"
          fontWeight="900"
          letterSpacing="0.04em"
          filter="url(#softGoldGlow)"
        >
          Chai Den
        </text>

        {/* "PREMIUM CAFE" Subtitle */}
        {showSubtitle && (
          <g>
            {/* Small left ornament */}
            <circle cx="36" cy="99.5" r="1.3" fill="url(#goldGradientMain)" />
            <path d="M38 99.5 L43 99.5" stroke="url(#goldGradientMain)" strokeWidth="0.8" />

            <text
              x="70"
              y="102"
              textAnchor="middle"
              fill="#F5E8C7"
              fontSize="6.6"
              fontFamily="'Outfit', sans-serif"
              fontWeight="800"
              letterSpacing="0.26em"
              opacity="0.95"
            >
              PREMIUM CAFE
            </text>

            {/* Small right ornament */}
            <path d="M97 99.5 L102 99.5" stroke="url(#goldGradientMain)" strokeWidth="0.8" />
            <circle cx="104" cy="99.5" r="1.3" fill="url(#goldGradientMain)" />
          </g>
        )}

        {/* ======================================================== */}
        {/* 4. BOTTOM ORNATE FILIGREE FLOURISH (AS IN PREVIEW.JPG)    */}
        {/* ======================================================== */}
        <g
          stroke="url(#goldGradientMain)"
          strokeWidth="1.9"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Center ornamental diamond jewel */}
          <path
            d="M70 125 L73.5 128.5 L70 132 L66.5 128.5 Z"
            fill="url(#goldGradientMain)"
            stroke="none"
          />

          {/* Left sweeping filigree scroll */}
          <path d="M66 128.5 C55 128.5 45 124 40 131 C35 138 44 145 52 139 C57 134 57 128 49 128" />
          <path
            d="M53 134 C46 131 38 141 43 147 C49 152 60 144 64 136"
            strokeWidth="1.4"
          />
          <path d="M47 137 C42 143 33 141 33 134" strokeWidth="1.1" />

          {/* Right sweeping filigree scroll */}
          <path d="M74 128.5 C85 128.5 95 124 100 131 C105 138 96 145 88 139 C83 134 83 128 91 128" />
          <path
            d="M87 134 C94 131 102 141 97 147 C91 152 80 144 76 136"
            strokeWidth="1.4"
          />
          <path d="M93 137 C98 143 107 141 107 134" strokeWidth="1.1" />

          {/* Floating accent dots */}
          <circle cx="28" cy="141" r="1.4" fill="url(#goldGradientMain)" stroke="none" />
          <circle cx="112" cy="141" r="1.4" fill="url(#goldGradientMain)" stroke="none" />
          <circle cx="70" cy="136" r="1.1" fill="url(#goldGradientMain)" stroke="none" />
        </g>
      </svg>
    </div>
  );
};
