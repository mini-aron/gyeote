const CENTER_X = 40;
const CENTER_Y = 42;
const ORBIT_RADIUS = 28;
const LAP_SECONDS = 3;
const BODY_LENGTH = 32;
const BODY_WIDTH = 5;
const DISPLAY_SIZE = 120;
const LINE_COLOR = "#ffffff";
const EYE_COLOR = "#000000";
const APPLE_COLOR = "#e5383b";

const ORBIT_PATH = `M${CENTER_X + ORBIT_RADIUS} ${CENTER_Y} a${ORBIT_RADIUS} ${ORBIT_RADIUS} 0 1 1 ${-ORBIT_RADIUS * 2} 0 a${ORBIT_RADIUS} ${ORBIT_RADIUS} 0 1 1 ${ORBIT_RADIUS * 2} 0`;

export function SnakeAppleLoader({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      width={DISPLAY_SIZE}
      height={DISPLAY_SIZE}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M40 35 C34 30 25 33 26 43 C27 52 33 57 37 56 C38.5 55.5 41.5 55.5 43 56 C47 57 53 52 54 43 C55 33 46 30 40 35 Z"
        fill={APPLE_COLOR}
      />
      <path d="M40.5 30 C42.5 25.5 47.5 24.5 50.5 26 C48.5 30 43.5 31.5 40.5 30 Z" fill={LINE_COLOR} />

      <path
        d={ORBIT_PATH}
        pathLength={100}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={BODY_WIDTH}
        strokeLinecap="round"
        strokeDasharray={`${BODY_LENGTH} ${100 - BODY_LENGTH}`}
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-100" dur={`${LAP_SECONDS}s`} repeatCount="indefinite" />
      </path>

      {/* 머리는 몸통 대시의 앞 끝(경로의 BODY_LENGTH% 지점)에서 출발해야 해서 그만큼 앞당겨 시작한다. */}
      <g>
        <animateMotion
          path={ORBIT_PATH}
          rotate="auto"
          dur={`${LAP_SECONDS}s`}
          begin={`${(-LAP_SECONDS * BODY_LENGTH) / 100}s`}
          repeatCount="indefinite"
        />
        <path
          d="M6 0 H9 M9 0 l1.5 -1.2 M9 0 l1.5 1.2"
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="1.5" cy="0" r="4" fill={LINE_COLOR} />
        <circle cx="3" cy="-1.7" r="0.9" fill={EYE_COLOR} />
        <circle cx="3" cy="1.7" r="0.9" fill={EYE_COLOR} />
      </g>
    </svg>
  );
}
