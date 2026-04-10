import React from "react";
import Svg, { Path, Rect, Circle } from "react-native-svg";

export default function ResetEmailIcon() {
  return (
    <Svg width="96" height="99" viewBox="0 0 96 99" fill="none">
      <Path
        d="M55.3471 2.5121C51.0217 -0.837364 44.9784 -0.837369 40.6529 2.5121L0 33.9923L96 33.9923L55.3471 2.5121Z"
        fill="#EEF2FF"
      />
      <Path
        d="M48 71.1618L96 33.9923L0 33.9923L48 71.1618Z"
        fill="#EEF2FF"
      />
      <Rect
        x="30.4493"
        y="46.8223"
        width="36"
        height="36"
        rx="2"
        fill="#4F46E5"
      />
      <Rect
        x="37.4493"
        y="33.8223"
        width="20"
        height="22"
        rx="9"
        stroke="#4F46E5"
        strokeWidth="2"
      />
      <Circle cx="48" cy="57.8223" r="3" fill="#A5B4FC" />
      <Path d="M0.218873 33.8223L0 33.9918V33.8223H0.218873Z" fill="#F7F3FD" />
      <Path
        d="M95.7811 33.8223L96 33.9918L55.3471 65.4719C51.0217 68.8214 44.9784 68.8214 40.6529 65.4719L0 33.9918V86.8223C0 93.4497 5.37258 98.8223 12 98.8223H84C90.6274 98.8223 96 93.4497 96 86.8223V33.9918V33.8223H95.7811Z"
        fill="#F7F3FD"
      />
    </Svg>
  );
}
