## 2026-08-26 - Found Missing ARIA Labels on Icon Buttons
**Learning:** In purely client-side Vanilla JS applications where UI elements like close modals (`&times;`) and delete buttons (`X`) are used frequently, they often lack textual context for screen readers. This pattern is easily missed in HTML as well as in dynamically generated string literals.
**Action:** Always scan both static HTML (e.g. `index.html`) and dynamic JS files (e.g. `app.js`) when verifying accessibility on icon-only interactive elements to ensure `aria-label` and `title` are consistently applied.
