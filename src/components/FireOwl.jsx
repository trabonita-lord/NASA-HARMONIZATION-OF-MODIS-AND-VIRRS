// The flying owl has separate wings. Your original PNG appears at the end.
import React from 'react';

export default function FireOwl({ logoUrl, onLogoReady }) {
  return (
    <div className="fire-owl-scene">
      <div className="fire-owl-flight" aria-hidden="true">
        <svg className="fire-owl-bird" viewBox="0 0 500 380">
          <defs>
            <linearGradient id="owl-feather-fire" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF0B0" />
              <stop offset="38%" stopColor="#FFB139" />
              <stop offset="72%" stopColor="#FF5722" />
              <stop offset="100%" stopColor="#9D160C" />
            </linearGradient>
            <linearGradient id="owl-body-fire" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#FFD27D" />
              <stop offset="48%" stopColor="#F96121" />
              <stop offset="100%" stopColor="#A21A10" />
            </linearGradient>
            {/* One wing is mirrored to create the other. Each has moving feathers. */}
            <g id="owl-spread-wing" fill="url(#owl-feather-fire)" stroke="#FFD08A" strokeWidth="0.7">
              <path d="M225 166 C175 148 115 83 20 34 C51 115 102 173 211 197 Z" />
              <path d="M218 180 C155 164 87 124 14 87 C48 166 105 203 215 207 Z" />
              <path d="M217 191 C144 195 84 161 16 143 C63 211 124 230 219 219 Z" />
              <path d="M222 207 C151 224 102 208 41 201 C92 250 152 255 227 231 Z" />
              <path d="M226 223 C177 254 144 254 95 250 C138 282 184 277 235 245 Z" />
              <path d="M226 169 C166 144 99 86 39 55" fill="none" stroke="#FFF2B9" strokeWidth="2" />
              <path d="M225 194 C158 187 91 158 34 119" fill="none" stroke="#FFF2B9" strokeWidth="1.3" />
            </g>
          </defs>

          {/* LEFT WING */}
          <g className="fire-owl-wing">
            <use href="#owl-spread-wing" />
          </g>

          {/* RIGHT WING: mirrored, so both flap together. */}
          <g transform="translate(500 0) scale(-1 1)">
            <g className="fire-owl-wing">
              <use href="#owl-spread-wing" />
            </g>
          </g>

          {/* TAIL AND BODY */}
          <path d="M225 239 L224 330 L247 303 L251 352 L264 303 L282 329 L274 237 Z" fill="url(#owl-body-fire)" />
          <path d="M221 152 C197 200 213 255 250 289 C287 255 303 200 279 152 Z" fill="url(#owl-body-fire)" stroke="#FFBE62" />
          <path d="M234 210 L250 260 L267 210 L250 226 Z" fill="#FFD18A" opacity="0.7" />

          {/* OWL FACE: ear tufts, facial discs, glowing eyes, and beak. */}
          <path d="M207 109 L205 67 L235 94 Q250 85 265 94 L295 67 L293 109 Q311 145 286 175 Q250 196 214 175 Q189 145 207 109 Z" fill="#9D2719" stroke="#FFAB4D" strokeWidth="2" />
          <path d="M207 115 Q229 100 247 128 Q244 161 224 164 Q204 155 207 115 Z" fill="#E76329" />
          <path d="M293 115 Q271 100 253 128 Q256 161 276 164 Q296 155 293 115 Z" fill="#E76329" />
          <path d="M211 122 L240 131 Q228 146 215 138 Z" fill="#FFF2B1" />
          <path d="M289 122 L260 131 Q272 146 285 138 Z" fill="#FFF2B1" />
          <ellipse cx="228" cy="132" rx="3" ry="7" fill="#48130C" />
          <ellipse cx="272" cy="132" rx="3" ry="7" fill="#48130C" />
          <path d="M242 146 L250 166 L258 146 L250 139 Z" fill="#FFD180" />
          <path d="M208 114 L201 96 L240 117 M292 114 L299 96 L260 117" fill="none" stroke="#FFD18A" strokeWidth="3" />
        </svg>
      </div>

      {/* EXACT ORIGINAL LOGO: The flying owl resolves into this image. */}
      <div className="fire-owl-final">
        <div className="fire-owl-logo-glow" aria-hidden="true" />
        <img
          src={logoUrl}
          className="fire-owl-original-logo"
          alt="TANAW fire owl"
          onLoad={onLogoReady}
          onError={onLogoReady}
          fetchPriority="high"
        />
      </div>
      <div className="fire-owl-reveal-ring" aria-hidden="true" />
    </div>
  );
}
