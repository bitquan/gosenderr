Design tokens (match app)

Colors
- background-dark: #0b1220
- panel-bg: rgba(15,23,42,0.86)
- primary: #1453ff
- success: #16a34a
- warning: #f59e0b
- danger: #dc2626
- text-primary: #f8fafc
- text-muted: #cbd5e1
- surface-quiet: #0f172a

Typography
- font-family: System / San Francisco (iOS)
- h1 (title): 17px, 800, text-primary
- body: 14px, 600, text-primary
- meta: 12px, 600, text-muted

Spacing
- gutter: 12px
- panel-radius: 14px
- button-height: 44px

CTA states
- Primary: background primary (#1453ff), label white
- Disabled: opacity 0.55 on base
- Secondary: bg #edf2ff, label #1453ff

Notes
- Use rounded 10px buttons for primary CTAs to match `PrimaryButton` component.
- Panel card uses panel-bg with panel-radius and subtle inner padding.

Export: Create matching Color Styles and Text Styles in Figma using the tokens above.