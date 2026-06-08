export function Icon({ name, size = 18, className = "" }) {
  const icons = {
    logo: <path d="M12 2 4.8 9.2a4 4 0 0 0 0 5.6L12 22l7.2-7.2a4 4 0 0 0 0-5.6L12 2Zm0 5.2L16.8 12 12 16.8 7.2 12 12 7.2Z" />,
    board: <path d="M4 4h6v16H4V4Zm10 0h6v9h-6V4Zm0 13h6v3h-6v-3Z" />,
    flask: <path d="M9 3h6m-1 0v5.2l4.8 8.1A3 3 0 0 1 16.2 21H7.8a3 3 0 0 1-2.6-4.7L10 8.2V3m-2.8 12h9.6" />,
    building: <path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16m3 0V9a1 1 0 0 0-1-1h-2M3 21h18M8 7h5m-5 4h5m-5 4h5m-3 6v-3" />,
    tag: <path d="M20 13.2 13.2 20a2 2 0 0 1-2.8 0L4 13.6V4h9.6l6.4 6.4a2 2 0 0 1 0 2.8ZM8.5 8.5h.01" />,
    timeline: <path d="M5 5h14M5 12h14M5 19h14M8 3v4m5 3v4m4 3v4" />,
    report: <path d="M5 20V10m7 10V4m7 16v-7" />,
    setting: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.08h-4l-.04-.08a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.04v-4L4 9.92a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.86-2.86.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.08h4l.04.08a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9c.12.38.33.72.6 1l.08.04v4L20 14a1.7 1.7 0 0 0-.6 1Z" />,
    search: <path d="m20 20-4.6-4.6m2.6-4.9a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />,
    plus: <path d="M12 5v14m-7-7h14" />,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
    filter: <path d="M4 5h16l-6.5 7.2V19l-3 1v-7.8L4 5Z" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    down: <path d="m6 9 6 6 6-6" />,
    comment: <path d="M20 14a3 3 0 0 1-3 3H9l-5 4v-4a3 3 0 0 1-2-3V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7Z" />,
    trash: <path d="M4 7h16m-10 4v6m4-6v6m-7 3h10l1-13H6l1 13Zm3-16h4l1 3H9l1-3Z" />,
    edit: <path d="m14 5 5 5M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />,
    grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
    moon: <path d="M20.4 15.6A8.5 8.5 0 0 1 8.4 3.6 8.5 8.5 0 1 0 20.4 15.6Z" />,
    sun: <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4L17 7m-10 10-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />,
    upload: <path d="M12 15V3m0 0 4 4m-4-4L8 7M5 17v3h14v-3" />,
    archive: <path d="M4 7h16M5 7l1.2-3h11.6L19 7v13H5V7Zm5 5h4" />,
    lock: <path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Zm6 4v3" />,
    unlock: <path d="M7 10V7a5 5 0 0 1 9.5-2.2M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Zm6 4v3" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {icons[name]}
    </svg>
  );
}
export function Avatar({ name, size = "normal", index = 0 }) {
  const palettes = ["blue", "purple", "teal", "orange", "pink"];
  const initials = name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("");

  return (
    <span className={`avatar avatar-${size} avatar-${palettes[index % palettes.length]}`}>
      {initials}
    </span>
  );
}
