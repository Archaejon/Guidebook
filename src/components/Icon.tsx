import React from 'react';

export type IconName =
  | 'home'
  | 'book'
  | 'pen'
  | 'library'
  | 'network'
  | 'flask'
  | 'settings'
  | 'search'
  | 'plus'
  | 'menu'
  | 'close'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'arrow-right'
  | 'arrow-left'
  | 'trash'
  | 'edit'
  | 'link'
  | 'unlink'
  | 'check'
  | 'filter'
  | 'focus'
  | 'bold'
  | 'italic'
  | 'heading'
  | 'list'
  | 'quote'
  | 'undo'
  | 'redo'
  | 'comment'
  | 'eye'
  | 'download'
  | 'upload'
  | 'inbox'
  | 'scale'
  | 'more'
  | 'indent'
  | 'outdent'
  | 'external'
  | 'clock'
  | 'alert'
  | 'folder'
  | 'file'
  | 'graph'
  | 'pin'
  | 'spark'
  | 'bookmark';

const paths: Record<IconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  book: (
    <>
      <path d="M4 4h6.5A2.5 2.5 0 0 1 13 6.5V21a3 3 0 0 0-3-3H4z" />
      <path d="M20 4h-6.5A2.5 2.5 0 0 0 11 6.5V21a3 3 0 0 1 3-3h6z" />
    </>
  ),
  pen: (
    <>
      <path d="m4 20 4.5-1L20 7.5 16.5 4 5 15.5z" />
      <path d="m14.5 6 3.5 3.5" />
    </>
  ),
  library: (
    <>
      <path d="M4 4h4v16H4zM10 4h4v16h-4zM17 5l3 .8-3.6 14.2-3-.8z" />
    </>
  ),
  network: (
    <>
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="m7 11 10-4M7 13l10 4" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v5.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 8.5V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevron-down': <path d="m5 9 7 7 7-7" />,
  'chevron-up': <path d="m5 15 7-7 7 7" />,
  'arrow-right': <path d="M4 12h16M14 6l6 6-6 6" />,
  'arrow-left': <path d="M20 12H4M10 6l-6 6 6 6" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </>
  ),
  unlink: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.5 13.5a5 5 0 0 0 7 0l1-1M13.5 10.5a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  focus: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </>
  ),
  bold: <path d="M7 5h6a4 4 0 0 1 0 8H7zM7 13h7a4 4 0 0 1 0 8H7zM7 5v16" />,
  italic: <path d="M10 5h9M5 19h9M14 5 10 19" />,
  heading: <path d="M5 4v16M19 4v16M5 12h14" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  quote: <path d="M4 6h6v6H4zM4 12a6 6 0 0 0 6 6M14 6h6v6h-6zM14 12a6 6 0 0 0 6 6" />,
  undo: <path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12" />,
  redo: <path d="m15 7 5 5-5 5M20 12H10a6 6 0 0 0 0 12" />,
  comment: <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 3v13M7 11l5 5 5-5M4 21h16" />,
  upload: <path d="M12 21V8M7 13l5-5 5 5M4 3h16" />,
  inbox: <path d="M3 13h5l1 3h6l1-3h5M5 4h14l2 9v7H3v-7z" />,
  scale: <path d="M12 3v18M5 7h14M5 7 2 14h6zM19 7l-3 7h6zM8 21h8" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  indent: <path d="M3 6h18M3 12h10M3 18h18M17 9l3 3-3 3" />,
  outdent: <path d="M3 6h18M11 12h10M3 18h18M7 9l-3 3 3 3" />,
  external: <path d="M14 4h6v6M20 4 10 14M18 14v6H4V6h6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: <path d="M12 3 2 21h20zM12 9v5M12 18h.01" />,
  folder: <path d="M3 5h7l2 2h9v12H3z" />,
  file: <path d="M6 3h8l4 4v14H6zM14 3v5h5" />,
  graph: (
    <>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="9" r="2" />
      <circle cx="10" cy="18" r="2" />
      <path d="m8 7 8 2M7 9l2 7M17 11l-5 5" />
    </>
  ),
  pin: <path d="M9 3h6l-1 6 4 4H6l4-4zM12 13v8" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
};

export function Icon({
  name,
  size = 16,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon ${className}`}
    >
      {paths[name]}
    </svg>
  );
}
