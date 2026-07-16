import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 42, background: "linear-gradient(145deg, #17161b, #7557ff)", color: "white", fontSize: 116, fontWeight: 800 }}>
      S
    </div>,
    size,
  );
}
