# SwiftChat Design System

## Direction

Night Signal is a quiet, dark operational workspace with the softer geometry of Encrypted Relay. Graphite planes carry the interface; neon green communicates live state and action rather than decorating the screen.

## Color

- Canvas: `#0A0A0A`
- Surface: `#121412`
- Raised surface: `#181D1A`
- Border: `#242A26`
- Strong border: `#344039`
- Primary: `#2EE88A`
- Primary bright: `#52F2A4`
- Primary pressed: `#1BBE70`
- Text: `#F5F7F6`
- Muted text: `#A8B0AC`
- Danger: `#FF6B72`

Green is reserved for selected conversations, online status, unread state, keyboard focus, and the send action. Glow is limited to the brand mark and brief active/focus emphasis.

## Typography

Use `Segoe UI Variable`, `Segoe UI`, and the platform sans-serif fallback. Interface copy uses sentence case. Names and primary labels use 600 weight; timestamps and metadata use compact regular text without decorative letter spacing.

## Geometry

Controls and message bubbles use 6-8px radii. Avatars, presence dots, and unread counters remain circular. Panels are not floating cards; borders separate the three workspace zones.

## Components

- Icon-only actions are semantic buttons with `aria-label` and `title`.
- Incoming messages use raised graphite; outgoing messages use dark green.
- Selected rows use a green leading edge and quiet green-tinted surface.
- Focus uses a visible two-pixel green ring.
- Inactive future controls remain styled but use native `hidden` attributes.

## Responsive Behavior

Desktop and tablet retain utility rail, conversation list, and active chat side by side. Narrow screens may shrink the rail and list, but controls, message content, and media must not overlap or escape the viewport. No mobile drill-in flow is part of this system yet.

## Motion

Use short color, border, and transform transitions only. Under `prefers-reduced-motion: reduce`, remove optional transitions and glow animation.
