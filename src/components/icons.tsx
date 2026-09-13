import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 5 6.2v5.4c0 4.2 2.8 7.8 7 8.9 4.2-1.1 7-4.7 7-8.9V6.2L12 3.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.8 12.1 2.2 2.2 4.4-4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function IconEject(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5 6.8 12.2h10.4L12 5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M6 17.5h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function IconUsb(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="6.2" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 13.2h4.2a2 2 0 0 0 2-2V9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16.2 8.2h2.6v2.4h-2.6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11.5H8.2A2.2 2.2 0 0 0 6 13.7c0 1.2 1 2.2 2.2 2.2H12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function IconRules(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4.5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 4.5v1.6M12 17.9v1.6M19.5 12h-1.6M6.1 12H4.5M17.3 6.7l-1.1 1.1M7.8 16.2l-1.1 1.1M17.3 17.3l-1.1-1.1M7.8 7.8 6.7 6.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" fill="currentColor" />
      <path d="M18 4.5v3M19.5 6h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8.2V18a1.6 1.6 0 0 0 1.6 1.6h12.8A1.6 1.6 0 0 0 20 18V9.6A1.6 1.6 0 0 0 18.4 8h-6.2L10.4 6H5.6A1.6 1.6 0 0 0 4 7.6v.6Z" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function IconCar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 14.5h16v3.2a1 1 0 0 1-1 1h-1.2a2 2 0 0 1-2-1.4l-.2-.6H8.4l-.2.6a2 2 0 0 1-2 1.4H5a1 1 0 0 1-1-1v-3.2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 14.5 7.6 9.8A1.4 1.4 0 0 1 8.9 9h6.2a1.4 1.4 0 0 1 1.3.8L18 14.5" stroke="currentColor" strokeWidth="1.6" />
    </Svg>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="7" width="17" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 7 10.2 5h3.6L15 7" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function IconNote(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 18.2a2.4 2.4 0 1 1-2.4-2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12.4 15.8V5.5l7 1.4v8.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M19.4 15.5a2.4 2.4 0 1 1-2.4-2.4" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function IconWarn(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.8 20.2 19H3.8L12 4.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 10v4.2M12 16.6v.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function TeslaMark({ className }: { className?: string }) {
  return <img src="/app-icon.png" alt="" className={className} />;
}

export function UsbHero() {
  return (
    <div className="usb-hero" aria-hidden="true">
      <div className="usb-glow" />
      <svg className="usb-stick" viewBox="0 0 280 220" fill="none">
        <ellipse cx="128" cy="196" rx="78" ry="12" fill="url(#usbShadow)" />
        <rect x="86" y="38" width="84" height="132" rx="16" fill="url(#usbBody)" />
        <rect x="94" y="46" width="68" height="116" rx="12" fill="#12141c" />
        <rect x="108" y="18" width="40" height="28" rx="4" fill="#c9cdd6" />
        <rect x="114" y="12" width="10" height="14" rx="1.5" fill="#9aa1ad" />
        <rect x="132" y="12" width="10" height="14" rx="1.5" fill="#9aa1ad" />
        <circle cx="128" cy="92" r="18" fill="url(#usbLogo)" />
        <path d="M118 86c6-1.8 14-1.8 20 0-3.8-.6-7.4-.9-10-.9V101h-2.4V85.1c-2.6 0-6.2.3-10 .9Z" fill="white" />
        <rect x="112" y="132" width="32" height="6" rx="3" fill="#2a2f3d" />
        <defs>
          <linearGradient id="usbBody" x1="86" y1="38" x2="170" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2a2e3a" />
            <stop offset="1" stopColor="#0c0e14" />
          </linearGradient>
          <linearGradient id="usbLogo" x1="110" y1="74" x2="148" y2="112" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CFF" />
            <stop offset="1" stopColor="#E14EC9" />
          </linearGradient>
          <radialGradient id="usbShadow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(128 196) scale(78 12)">
            <stop stopColor="#000" stopOpacity="0.45" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
