import React from "react";

/* ─── InlineLoader ─────────────────────────────────────────────────────────
 * Inline spinner for buttons and table loading states.
 * Renders 3 bouncing dots scaled to size prop.
 */
interface InlineLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const DOT_SIZE = { sm: 4, md: 6, lg: 8 } as const;

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  size = "md",
  className = "",
}) => {
  const px = DOT_SIZE[size];
  return (
    <span
      className={`inline-flex items-end gap-[3px] ${className}`}
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`il-dot il-dot-${i}`}
          style={{
            display: "inline-block",
            width: px,
            height: px,
            borderRadius: "50%",
            background: "currentColor",
            opacity: 0.4,
          }}
        />
      ))}

      <style>{`
        @keyframes ilBounce {
          0%, 80%, 100% { transform: translateY(0);   opacity: 0.4; }
          40%           { transform: translateY(-${Math.round(px * 1.4)}px); opacity: 1; }
        }
        .il-dot        { animation: ilBounce 1s ease-in-out infinite; }
        .il-dot-0      { animation-delay: 0s;    }
        .il-dot-1      { animation-delay: 0.16s; }
        .il-dot-2      { animation-delay: 0.32s; }
      `}</style>
    </span>
  );
};

/* ─── FullPageLoader ───────────────────────────────────────────────────────
 * Full-screen dark loader — used by ProtectedRoute while auth resolves.
 */
export const FullPageLoader: React.FC = () => (
  <div className="flex items-center justify-center w-full h-screen bg-[#0e0e0e]">
    <div
      className="pointer-events-none absolute"
      style={{
        width: "300px",
        height: "300px",
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(246,183,10,0.07) 0%, transparent 70%)",
        filter: "blur(40px)",
      }}
    />
    <div className="relative flex flex-col items-center gap-6">
      <div className="flex items-end gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`dot dot-${i}`}
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "#f6b70a",
              boxShadow: "0 0 8px rgba(246,183,10,0.6)",
            }}
          />
        ))}
      </div>

      <div
        style={{
          width: "140px",
          height: "2px",
          background: "rgba(246,183,10,0.1)",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          className="progress-fill"
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #f6b70a, #fecb00)",
            borderRadius: "99px",
          }}
        />
      </div>

      <KineticAnimStyles />
    </div>
  </div>
);

/* ─── KineticLoader ────────────────────────────────────────────────────────
 * Primary loader — used by TransitionLoader for page navigations.
 * overlay=true  → fixed fullscreen backdrop blur overlay
 * overlay=false → centered on a full dark page
 */
interface KineticLoaderProps {
  message?: string;
  overlay?: boolean;
}

export const KineticLoader: React.FC<KineticLoaderProps> = ({
  message = "Loading…",
  overlay = false,
}) => {
  const wrapClass = overlay
    ? "fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60"
    : "flex items-center justify-center w-full h-screen bg-[#0e0e0e]";

  return (
    <div className={wrapClass}>
      {!overlay && (
        <div
          className="pointer-events-none absolute"
          style={{
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(246,183,10,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      )}

      <div
        className="flex flex-col items-center gap-6"
        style={
          overlay
            ? {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }
            : { position: "relative" }
        }
      >
        {/* Dots */}
        <div className="flex items-end gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`dot dot-${i}`}
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: "#f6b70a",
                boxShadow: "0 0 10px rgba(246,183,10,0.65)",
              }}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "160px",
            height: "2px",
            background: "rgba(246,183,10,0.12)",
            borderRadius: "99px",
            overflow: "hidden",
          }}
        >
          <div
            className="progress-fill"
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #f6b70a, #fecb00)",
              borderRadius: "99px",
            }}
          />
        </div>

        {/* Route message */}
        {message && (
          <p
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}
          >
            {message}
          </p>
        )}

        <KineticAnimStyles />
      </div>
    </div>
  );
};

/* ─── Shared keyframes injected once per instance ─────────────────────── */
const KineticAnimStyles: React.FC = () => (
  <style>{`
    @keyframes kineticBounce {
      0%, 80%, 100% { transform: translateY(0);     opacity: 0.35; }
      40%           { transform: translateY(-11px); opacity: 1;    }
    }
    @keyframes kineticProgress {
      0%   { width: 0%;   }
      60%  { width: 85%;  }
      80%  { width: 93%;  }
      100% { width: 100%; }
    }
    .dot           { animation: kineticBounce   1.2s ease-in-out infinite; }
    .dot-0         { animation-delay: 0s;    }
    .dot-1         { animation-delay: 0.18s; }
    .dot-2         { animation-delay: 0.36s; }
    .dot-3         { animation-delay: 0.54s; }
    .dot-4         { animation-delay: 0.72s; }
    .progress-fill { animation: kineticProgress 2.4s ease-in-out infinite; }
  `}</style>
);

export default KineticLoader;
