import React from "react";
import Svg, { Path, Mask, Rect, G } from "react-native-svg";

export default function SuccessIcon() {
  return (
    <Svg width="88" height="88" viewBox="0 0 88 88" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 0C34.1503 0 44 9.84974 44 22C44 9.84974 53.8497 0 66 0C78.1503 0 88 9.84974 88 22C88 34.1503 78.1503 44 66 44C78.1503 44 88 53.8497 88 66C88 78.1503 78.1503 88 66 88C53.8497 88 44 78.1503 44 66C44 78.1503 34.1503 88 22 88C9.84974 88 0 78.1503 0 66C0 53.8497 9.84974 44 22 44C9.84974 44 0 34.1503 0 22C0 9.84974 9.84974 0 22 0Z"
        fill="#F0E6FA"
      />
      <Mask id="mask0" x="24" y="24" width="40" height="40" maskUnits="userSpaceOnUse">
        <Rect x="24" y="24" width="40" height="40" fill="#D9D9D9" />
      </Mask>

      <G mask="url(#mask0)">
        <Path
          d="M39.9167 54.0007L30.4167 44.5007L32.7917 42.1257L39.9167 49.2507L55.2084 33.959L57.5834 36.334L39.9167 54.0007Z"
          fill="#8333D7"
        />
      </G>
    </Svg>
  );
}
