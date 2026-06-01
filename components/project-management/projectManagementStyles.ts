export const projectManagementCss = `
.pm-shell { display: grid; align-content: start; gap: 20px; color: #0f172a; font-family: var(--font-body); }
.pm-shell { max-width: var(--wf-content-max, 1440px); width: 100%; margin-inline: auto; padding-inline: clamp(16px, 2vw, 28px); overflow-x: clip; }
.pm-workspace { max-width: 100%; overflow-x: clip; }
.pm-workspace { min-width: 0; display: grid; align-content: start; gap: 20px; position: relative; }
.pm-header { display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 16px; align-items: start; }
.pm-title-block h1 { margin: 0; font-size: 30px; line-height: 1.08; font-weight: 900; letter-spacing: 0; }
.pm-title-block p { margin: 7px 0 0; color: #475569; font-size: 14px; font-weight: 500; }
.pm-header-actions { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
.pm-control, .pm-primary, .pm-select, .pm-search { min-height: 38px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; color: #091133; display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; font-size: 13px; font-weight: 800; max-width: 100%; }
.pm-primary { background: #16a34a; border-color: #16a34a; color: #fff; cursor: pointer; }
.pm-primary:disabled { opacity: .55; cursor: not-allowed; }
.pm-search input { border: 0; outline: 0; min-width: min(220px, 42vw); font: inherit; max-width: 100%; }
.pm-card { background: #fff; border: 1px solid #dfe7f2; border-radius: 8px; box-shadow: 0 10px 24px rgba(15, 23, 42, .035); padding: 20px; min-width: 0; }
.pm-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 18px; margin-bottom: 0; }
.pm-kpi { display: flex; align-items: center; gap: 18px; min-height: 112px; }
.pm-kpi div { min-width: 0; }
.pm-kpi > span { width: 56px; height: 56px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; }
.pm-kpi small, .pm-card small { color: #475569; font-size: 13px; font-weight: 750; }
.pm-kpi strong { display: block; font-size: 24px; line-height: 1.1; margin-top: 6px; overflow-wrap: anywhere; }
.pm-kpi em { display: block; color: #16a34a; font-style: normal; font-size: 12px; font-weight: 750; margin-top: 8px; }
.pm-kpi em.negative { color: #ef4444; }
.pm-tabs {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  min-height: 48px;
  border-bottom: 1px solid #dfe7f2;
  overflow-x: auto;
  margin-bottom: 20px;
  background: transparent !important;
}
.pm-tabs button {
  min-height: 48px;
  padding: 0 0 12px;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transform: none !important;
}
.pm-tabs button.active,
.pm-tabs button[aria-selected="true"],
.pm-tabs button:hover,
.pm-tabs button:focus-visible {
  color: #111827 !important;
  border-bottom-color: #111827 !important;
  font-weight: 600;
}
.pm-overview-grid { display: grid; gap: 18px; align-items: stretch; }
.pm-dashboard-overview {
  grid-template-columns: minmax(340px, 1.05fr) minmax(360px, 1.2fr) minmax(300px, .85fr);
  grid-template-areas:
    "recent recent recent"
    "progress trend budget"
    "progress trend budget";
}
.pm-progress-card { grid-area: progress; }
.pm-trend { grid-area: trend; }
.pm-milestones { grid-area: milestones; }
.pm-recent { grid-area: recent; }
.pm-budget-card { grid-area: budget; }
.pm-section-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.pm-section-header h2 { margin: 0; font-size: 15px; font-weight: 900; }
.pm-section-header button { border: 0; background: transparent; color: #0f172a; font-weight: 900; cursor: pointer; }
.pm-section-bar { min-width: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.pm-section-bar h2 { min-width: 0; margin: 0; font-size: 18px; line-height: 1.2; font-weight: 600; overflow-wrap: anywhere; }
.pm-section-bar button, .pm-section-action { min-height: 24px; display: inline-flex; align-items: center; border: 1px solid var(--pm-border-soft, #dbe3ef); border-radius: 999px; background: var(--pm-card-hover, #f8fafc); color: var(--pm-muted, #475569); padding: 3px 9px; font-size: 12px; line-height: 1.2; font-weight: 600; white-space: nowrap; }
.pm-section-bar button { cursor: pointer; }
.pm-report-actions { display: inline-flex; align-items: center; gap: 6px; }
.pm-report-actions button { gap: 6px; }
.pm-donut-wrap { display: grid; grid-template-columns: minmax(160px, 220px) minmax(0, 1fr); align-items: center; gap: 20px; }
.pm-donut { width: 200px; height: 200px; border-radius: 50%; display: grid; place-items: center; }
.pm-donut span { width: 112px; height: 112px; border-radius: 50%; background: #fff; color: #0f172a; display: grid; grid-template-rows: auto auto; place-items: center; justify-items: center; align-content: center; gap: 6px; text-align: center; user-select: none; }
.pm-donut strong { display: block; color: #0f172a !important; font-size: 24px; line-height: 1; font-weight: 700; }
.pm-donut small { display: block; max-width: 76px; color: #94a3b8 !important; font-size: 12px; line-height: 1.2; font-weight: 500; }
.pm-legend, .pm-list, .pm-actions, .pm-task-list, .pm-bar-list { display: grid; gap: 12px; }
.pm-legend p { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; margin: 0; font-size: 13px; }
.pm-legend i { width: 10px; height: 10px; border-radius: 999px; }
.pm-line { min-height: 244px; display: grid; grid-template-rows: 1fr auto auto; gap: 8px; }
.pm-line svg { width: 100%; height: clamp(170px, 20vw, 224px); }
.pm-line-axis { display: flex; justify-content: space-between; color: #23335f; font-size: 12px; font-weight: 800; }
.pm-line-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; color: #334155; font-size: 12px; font-weight: 800; }
.pm-line-legend span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.pm-line-legend i { width: 9px; height: 9px; border-radius: 999px; flex: 0 0 auto; }
.pm-list article,
.pm-milestone-item { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; column-gap: 10px; row-gap: 4px; align-items: center; }
.pm-milestone-item { width: 100%; border: 0; border-radius: 8px; background: transparent; color: inherit; padding: 6px; text-align: left; font: inherit; cursor: pointer; }
.pm-milestone-item:hover,
.pm-milestone-item:focus-visible { background: var(--pm-card-hover, #f8fafc); outline: none; }
.pm-milestone-item:disabled { cursor: default; opacity: .68; }
.pm-list article > svg,
.pm-milestone-item > svg { grid-column: 1; grid-row: 1 / span 2; align-self: center; }
.pm-list article > span:not(.pm-pill),
.pm-milestone-item > span:not(.pm-pill) { grid-column: 2; grid-row: 1; display: grid; gap: 2px; min-width: 0; }
.pm-list article > .pm-pill,
.pm-milestone-item > .pm-pill { grid-column: 3; grid-row: 1; justify-self: end; align-self: center; }
.pm-list article > em,
.pm-milestone-item > em { grid-column: 2 / -1; grid-row: 2; color: #475569; font-size: 12px; font-style: normal; font-weight: 700; }
.pm-milestone-item > em { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pm-milestone-item > em b { color: var(--pm-foreground, #0f172a); font: inherit; }
.pm-milestone-item > em small { color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 800; }
.pm-list article strong,
.pm-milestone-item strong { font-size: 13px; line-height: 1.3; font-weight: 800; overflow-wrap: anywhere; }
.pm-list article small,
.pm-milestone-item small { color: #64748b; font-size: 12px; line-height: 1.3; overflow-wrap: anywhere; }
.pm-list svg { width: 34px; height: 34px; padding: 8px; border-radius: 9px; background: #e6fffb; color: #0891b2; }
.pm-table-wrap { overflow-x: auto; }
.pm-mobile-projects { display: none; }
.pm-table { width: 100%; min-width: 820px; border-collapse: collapse; }
.pm-table th { text-align: left; padding: 13px 14px; background: #f8fafc; color: #475569; font-size: 11px; font-weight: 900; }
.pm-table td { padding: 13px 14px; border-top: 1px solid #edf2f8; font-size: 12px; vertical-align: middle; }
.pm-avatar { width: 28px; height: 28px; border: 1px solid var(--pm-border-soft); border-radius: 999px; background: var(--pm-card-hover); color: var(--pm-foreground); display: inline-grid; place-items: center; font-size: 11px; font-weight: 900; vertical-align: middle; margin-right: 6px; }
.pm-pill { display: inline-flex; min-height: 24px; border-radius: 7px; background: #eef2ff; color: #4f46e5; padding: 0 8px; align-items: center; font-size: 11px; font-weight: 900; white-space: nowrap; }
.tone-completed, .tone-done, .tone-approved, .tone-good { background: #dcfce7; color: #15803d; }
.tone-in-progress, .tone-active, .tone-review { background: #dbeafe; color: #2563eb; }
.tone-on-hold, .tone-medium, .tone-pending { background: #ffedd5; color: #ea580c; }
.tone-critical, .tone-high, .tone-blocked, .tone-delayed, .tone-at-risk { background: #fee2e2; color: #dc2626; }
.tone-low { background: #f1f5f9; color: #475569; }
.tone-high { background: #ffedd5; color: #c2410c; }
.tone-critical { border: 1px solid rgba(220, 38, 38, .28); }
.pm-progress { display: block; width: 112px; height: 8px; border-radius: 999px; background: #e9edf4; overflow: hidden; }
.pm-progress i { display: block; height: 100%; border-radius: inherit; background: #2f80ed; }
.pm-icon-btn { width: 34px; height: 34px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.pm-clickable-row { cursor: pointer; }
.pm-clickable-row:hover td { background: var(--pm-card-hover, #f8fafc); }
.pm-clickable-row:focus-visible td { background: var(--pm-card-hover, #f8fafc); outline: 2px solid var(--pm-ring, rgba(47,128,237,.22)); outline-offset: -2px; }
.pm-clickable-card { cursor: pointer; }
.pm-clickable-card:focus-visible { outline: 2px solid var(--pm-ring, rgba(47,128,237,.22)); outline-offset: 2px; }
.pm-recent .pm-table-wrap {
  border: 1px solid var(--pm-border, #e5e7eb);
  border-radius: 8px;
  overflow-x: auto;
}
.pm-recent .pm-table {
  min-width: 960px;
}
.pm-recent .pm-table th:first-child,
.pm-recent .pm-table td:first-child {
  border-left: 0;
}
.pm-recent .pm-table th:last-child,
.pm-recent .pm-table td:last-child {
  border-right: 0;
}
.pm-recent .pm-table tbody tr:last-child td {
  border-bottom: 0;
}
.pm-filter-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.pm-kanban { display: grid; grid-template-columns: repeat(5, minmax(240px, 1fr)); gap: 16px; overflow-x: auto; }
.pm-kanban-col { display: grid; align-content: start; gap: 12px; }
.pm-task-board-card { overflow: hidden; }
.pm-task-board { width: 100%; min-width: 0; overflow-x: auto; display: grid; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card, #fff); }
.pm-task-board-group { min-width: 1040px; min-height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); background: var(--pm-card-hover, #f8fafc); color: var(--pm-foreground, #0f172a); }
.pm-task-board-group span { font-size: 14px; font-weight: 800; }
.pm-task-board-group strong { min-width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; background: var(--pm-card, #fff); border: 1px solid var(--pm-border-soft, #e6edf6); color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-task-board-head,
.pm-task-board-row { min-width: 1040px; display: grid; grid-template-columns: minmax(260px, 1.5fr) minmax(180px, .9fr) 112px 104px 120px 132px 82px 76px 116px; align-items: stretch; }
.pm-task-board-head { min-height: 38px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); background: color-mix(in srgb, var(--pm-card-hover, #f8fafc) 55%, var(--pm-card, #fff)); color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 700; }
.pm-task-board-head span,
.pm-task-board-row > * { min-width: 0; display: flex; align-items: center; padding: 10px 12px; border-right: 1px solid var(--pm-border-soft, #e6edf6); }
.pm-task-board-head span:last-child,
.pm-task-board-row > *:last-child { border-right: 0; }
.pm-task-board-row { min-height: 62px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); color: var(--pm-foreground, #0f172a); cursor: pointer; }
.pm-task-board-row:last-child { border-bottom: 0; }
.pm-task-board-row:hover,
.pm-task-board-row:focus-visible { background: var(--pm-card-hover, #f8fafc); outline: none; }
.pm-task-board-title { display: grid !important; align-content: center; align-items: center; gap: 3px; }
.pm-task-board-title strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 1.25; }
.pm-task-board-title small,
.pm-task-board-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.2; }
.pm-task-board-owner { gap: 6px; }
.pm-task-board-owner span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.pm-task-board-date { color: var(--pm-muted, #64748b); font-size: 13px; font-weight: 600; }
.pm-task-board-count { gap: 6px; justify-content: center; color: var(--pm-muted, #64748b); font-size: 13px; font-weight: 700; }
.pm-task-board-actions { justify-content: flex-end; gap: 6px; }
.pm-task-board-actions .pm-icon-btn { width: 30px; height: 30px; }
.pm-task-card { border: 1px solid #e6edf6; border-radius: 14px; padding: 14px; display: grid; gap: 10px; background: #fff; cursor: pointer; }
.pm-task-card.is-draggable { cursor: grab; }
.pm-task-card:focus-visible { outline: 2px solid var(--pm-foreground, #0f172a); outline-offset: 3px; }
.pm-task-card > div:first-child { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; align-items: start; }
.pm-task-card > div:first-child strong { min-width: 0; overflow-wrap: anywhere; }
.pm-task-card > div:first-child small { grid-column: 1; color: var(--pm-muted, #64748b); }
.pm-task-actions { grid-column: 2; grid-row: 1 / span 2; display: flex; align-items: center; gap: 6px; }
.pm-task-actions .pm-icon-btn { width: 30px; height: 30px; }
.pm-icon-btn.danger { border-color: rgba(239,68,68,.35); color: #ef4444; }
.pm-task-card p { margin: 0; color: #23335f; font-size: 13px; line-height: 1.45; }
.pm-chip-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pm-chip-row span:not(.pm-pill) { display: inline-flex; align-items: center; gap: 4px; color: #64748b; font-size: 12px; }
.pm-task-card footer { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; }
.pm-task-collab { grid-column: 1 / -1; display: grid; gap: 14px; padding-top: 2px; }
.pm-task-collab-head { min-width: 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; padding-top: 4px; border-top: 1px solid var(--pm-border-soft, #e6edf6); }
.pm-task-collab-head h3 { margin: 14px 0 0; color: var(--pm-foreground, #0f172a); font-size: 16px; line-height: 1.2; font-weight: 700; }
.pm-task-collab-head p { margin: 4px 0 0; color: var(--pm-muted, #64748b); font-size: 13px; line-height: 1.4; }
.pm-task-collab-head > span { flex: 0 0 auto; color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 600; white-space: nowrap; }
.pm-task-collab-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
.pm-task-panel { min-width: 0; min-height: 0; height: 320px; display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 14px; background: var(--pm-card-hover, #f8fafc); overflow: hidden; }
.pm-task-panel .pm-section-bar { margin-bottom: 0; }
.pm-dependency-list, .pm-checklist-list { min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 8px; padding-right: 3px; scrollbar-width: thin; scrollbar-color: var(--pm-border, #262626) transparent; }
.pm-dependency-list > span, .pm-checklist-list label { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 10px; background: var(--pm-card, #fff); color: var(--pm-foreground, #0f172a); font-size: 13px; }
.pm-dependency-list > span { overflow-wrap: anywhere; }
.pm-dependency-list button, .pm-checklist-list button { width: 24px; height: 24px; margin-left: auto; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 7px; background: transparent; color: var(--pm-muted, #64748b); display: grid; place-items: center; cursor: pointer; }
.pm-checklist-list label span { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.pm-checklist-list label:has(input:checked) span { color: var(--pm-muted, #64748b); text-decoration: line-through; }
.pm-task-comment-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.pm-task-comment-form input, .pm-task-upload input:not([type="checkbox"]):not([type="file"]) { min-width: 0; min-height: 40px; border: 1px solid var(--pm-border-soft, #dbe3ef); border-radius: 10px; background: var(--pm-input, #fff); color: var(--pm-foreground, #0f172a); padding: 0 12px; font: inherit; }
.pm-task-comment-list, .pm-task-file-list { min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 10px; padding-right: 3px; scrollbar-width: thin; scrollbar-color: var(--pm-border, #262626) transparent; }
.pm-task-comment-list article { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; }
.pm-task-comment-list article > div, .pm-task-file-list article > div { min-width: 0; display: grid; gap: 3px; }
.pm-task-comment-list strong, .pm-task-file-list strong { min-width: 0; overflow-wrap: anywhere; font-size: 13px; line-height: 1.35; }
.pm-task-comment-list small, .pm-task-file-list small { color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.35; }
.pm-task-upload { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.pm-upload-button { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--pm-border-soft, #dbe3ef); border-radius: 10px; background: var(--pm-card, #fff); color: var(--pm-foreground, #0f172a); padding: 0 12px; font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; }
.pm-upload-button input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.pm-evidence-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
.pm-evidence-strip span { width: 74px; height: 54px; flex: 0 0 auto; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 10px; background: var(--pm-card, #fff); }
.pm-evidence-strip span { display: grid; place-items: center; gap: 2px; color: var(--pm-muted, #64748b); font-size: 11px; }
.pm-evidence-strip .pm-evidence-thumb { background-size: cover; background-position: center; }
.pm-task-file-list article { min-width: 0; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto auto auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card, #fff); }
.pm-task-file-list article > svg { width: 28px; height: 28px; padding: 6px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 8px; color: var(--pm-foreground, #0f172a); }
.pm-task-file-list em { color: var(--pm-muted, #64748b); font-size: 12px; font-style: normal; overflow-wrap: anywhere; }
.pm-resource-grid, .pm-doc-grid, .pm-budget-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.pm-resource-grid article, .pm-doc-grid article { border: 1px solid #e6edf6; border-radius: 14px; padding: 16px; display: grid; gap: 8px; }
.pm-budget-meter { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 14px 18px; align-items: start; }
.pm-budget-meter span { min-width: 0; display: grid; gap: 5px; }
.pm-budget-meter small { font-size: 12px; color: #475569; font-weight: 850; text-transform: none; }
.pm-budget-meter strong { display: block; color: #0f172a; font-size: 15px; line-height: 1.18; font-weight: 900; white-space: nowrap; }
.pm-budget-meter .pm-progress { grid-column: 1 / -1; width: 100%; }
.pm-budget-utilization { display: grid; gap: 15px; }
.pm-budget-util-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.pm-budget-util-metrics span { min-width: 0; display: grid; gap: 5px; padding: 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 10px; background: var(--pm-card-hover, #f8fafc); }
.pm-budget-util-metrics small { color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 800; }
.pm-budget-util-metrics strong { color: var(--pm-foreground, #0f172a); font-size: 15px; line-height: 1.15; font-weight: 900; white-space: nowrap; }
.pm-budget-stack { display: flex; width: 100%; height: 12px; border-radius: 999px; background: var(--pm-card-hover, #eef2f7); overflow: hidden; }
.pm-budget-stack span { height: 100%; }
.pm-budget-stack .is-spent { background: #0f172a; }
.pm-budget-stack .is-committed { background: #94a3b8; }
.pm-budget-util-legend { display: flex; flex-wrap: wrap; gap: 12px; color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 700; }
.pm-budget-util-legend span { display: inline-flex; align-items: center; gap: 7px; }
.pm-budget-util-legend i { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.pm-budget-util-legend i.is-spent { background: #0f172a; }
.pm-budget-util-legend i.is-committed { background: #94a3b8; }
.pm-budget-util-legend i.is-available { background: var(--pm-card-hover, #e5e7eb); border: 1px solid var(--pm-border, #d4d4d8); }
.pm-budget-page { min-width: 0; display: grid; gap: 18px; }
.pm-budget-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 14px; }
.pm-budget-tile { min-width: 0; border: 1px solid var(--pm-border, #e5e7eb); border-radius: 12px; background: var(--pm-card, #fff); padding: 16px 18px; display: grid; gap: 6px; }
.pm-budget-tile small { color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 700; }
.pm-budget-tile strong { color: var(--pm-foreground, #0f172a); font-size: 22px; line-height: 1.1; font-weight: 800; white-space: nowrap; }
.pm-budget-tile strong.negative { color: #ef4444; }
.pm-budget-tile span { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-budget-summary-card { display: grid; gap: 16px; }
.pm-budget-bar { display: flex; width: 100%; height: 12px; border-radius: 999px; background: var(--pm-card-hover, #eef2f7); overflow: hidden; }
.pm-budget-bar span { height: 100%; }
.pm-budget-bar span.is-spent { background: var(--pm-foreground, #0f172a); }
.pm-budget-bar span.is-committed { background: var(--pm-muted, #94a3b8); }
.pm-budget-bar-legend { display: flex; flex-wrap: wrap; gap: 16px; color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 600; }
.pm-budget-bar-legend span { display: inline-flex; align-items: center; gap: 7px; }
.pm-budget-bar-legend i { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.pm-budget-bar-legend i.is-spent { background: var(--pm-foreground, #0f172a); }
.pm-budget-bar-legend i.is-committed { background: var(--pm-muted, #94a3b8); }
.pm-budget-bar-legend i.is-remaining { background: var(--pm-card-hover, #e5e7eb); border: 1px solid var(--pm-border, #d4d4d8); }
.pm-budget-table th.pm-num, .pm-budget-table td.pm-num { text-align: right; white-space: nowrap; }
.pm-budget-table td.negative, .pm-budget-table strong.negative { color: #ef4444 !important; }
.pm-budget-table tr.pm-budget-subtotal td { border-top: 1px solid var(--pm-border, #e5e7eb); background: var(--pm-card-hover, #f8fafc); font-weight: 800; color: var(--pm-foreground, #0f172a); }
.pm-budget-totals { display: grid; justify-content: end; gap: 10px; margin-top: 4px; }
.pm-budget-totals > div { display: grid; grid-template-columns: minmax(160px, auto) minmax(150px, auto); gap: 24px; align-items: center; }
.pm-budget-totals span { color: var(--pm-muted, #64748b); font-size: 13px; font-weight: 600; }
.pm-budget-totals strong { text-align: right; color: var(--pm-foreground, #0f172a); font-size: 14px; font-weight: 700; white-space: nowrap; }
.pm-budget-totals .pm-budget-grand { border-top: 1px solid var(--pm-border, #e5e7eb); padding-top: 10px; }
.pm-budget-totals .pm-budget-grand span { color: var(--pm-foreground, #0f172a); font-weight: 800; }
.pm-budget-totals .pm-budget-grand strong { font-size: 18px; font-weight: 900; }
.pm-budget-totals .pm-budget-grand strong.negative { color: #ef4444; }
.pm-actions button { min-height: 52px; border: 0; background: #fff; display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 10px; text-align: left; font-weight: 900; cursor: pointer; }
.pm-actions span { width: 34px; height: 34px; border-radius: 10px; background: #dcfce7; color: #16a34a; display: grid; place-items: center; }
.pm-form { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.pm-field { display: grid; gap: 7px; }
.pm-field span { font-size: 12px; color: #23335f; font-weight: 900; }
.pm-field .pm-required { margin-left: 3px; color: #ef4444; font-style: normal; font-weight: 900; }
.pm-field input, .pm-field select, .pm-field textarea { min-height: 42px; border: 1px solid #dbe3ef; border-radius: 10px; padding: 0 12px; font: inherit; }
.pm-field textarea { padding: 10px 12px; resize: vertical; }
.pm-wide { grid-column: span 3; }
.pm-form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
.pm-date-presets { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.pm-date-presets button { min-height: 42px; border: 1px solid #dbe3ef; border-radius: 10px; background: #f8fafc; color: #0f172a; font: inherit; font-size: 12px; font-weight: 900; cursor: pointer; }
.pm-date-presets button:hover { border-color: #16a34a; background: #ecfdf5; color: #047857; }
.pm-filter-panel { position: absolute; top: 58px; right: 52px; z-index: 95; width: min(620px, calc(100vw - 32px)); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: end; padding: 16px; }
.pm-filter-panel-head { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.pm-filter-panel-head strong { color: var(--pm-foreground, #0f172a); font-size: 14px; font-weight: 900; }
.pm-filter-panel-head small { color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 700; }
.pm-filter-date-grid { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.pm-filter-panel .pm-field, .pm-filter-panel .pm-form-actions { min-width: 0; }
.pm-filter-panel .pm-form-actions { grid-column: auto; align-self: end; }
.pm-filter-panel .pm-form-actions .pm-control { width: 100%; justify-content: center; }
.pm-alert-panel { position: absolute; top: 58px; right: 160px; z-index: 95; width: min(360px, calc(100vw - 32px)); display: grid; gap: 10px; padding: 14px; }
.pm-alert-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid #e6edf6; }
.pm-alert-head strong { font-size: 14px; font-weight: 950; }
.pm-alert-head button { width: 30px; height: 30px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.pm-alert-panel > button { border: 0; background: #fff; display: grid; grid-template-columns: 34px 1fr; gap: 10px; align-items: start; text-align: left; padding: 10px; border-radius: 10px; cursor: pointer; }
.pm-alert-panel > button:hover { background: #f8fafc; }
.pm-alert-panel > button > svg { width: 34px; height: 34px; padding: 8px; border-radius: 10px; background: #ecfdf5; color: #16a34a; }
.pm-alert-panel > button span, .pm-alert-empty { display: grid; gap: 3px; }
.pm-alert-panel > button strong { font-size: 13px; font-weight: 950; color: #0f172a; }
.pm-alert-panel > button small, .pm-alert-empty small { color: #64748b; font-size: 12px; line-height: 1.35; }
.pm-alert-empty { min-height: 96px; align-content: center; justify-items: center; text-align: center; border: 1px dashed #dbe3ef; border-radius: 12px; padding: 16px; }
.pm-alert-empty strong { color: #0f172a; font-size: 13px; }
.pm-modal-backdrop { position: fixed; inset: 0; z-index: 1300; background: rgba(15, 23, 42, .62); display: grid; place-items: center; padding: 20px; }
.pm-modal { position: relative; z-index: 1; isolation: isolate; width: min(860px, calc(100vw - 40px)); max-height: min(820px, calc(100dvh - 40px)); overflow: hidden; padding: 0 !important; display: grid; grid-template-rows: auto minmax(0, 1fr); background: var(--pm-card, #fff) !important; background-image: none !important; }
.pm-modal-head { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); background: var(--pm-card, #fff); }
.pm-modal-head h2 { margin: 0; color: var(--pm-foreground, #0f172a); font-size: 19px; line-height: 1.2; font-weight: 700; }
.pm-modal-head p { margin: 5px 0 0; color: var(--pm-muted, #64748b); font-size: 13px; line-height: 1.45; }
.pm-modal-head button { flex: 0 0 auto; min-height: 32px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 999px; background: var(--pm-card-hover, #f8fafc); color: var(--pm-foreground, #0f172a); padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
.pm-modal > .pm-form { min-height: 0; overflow: auto; padding: 20px; }
.pm-modal-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pm-task-editor-modal { width: min(1040px, calc(100vw - 48px)); max-height: min(860px, calc(100dvh - 48px)); }
.pm-task-editor-body { min-height: 0; overflow: auto; display: grid; gap: 18px; padding: 20px; }
.pm-task-modal-form { grid-template-columns: minmax(0, 1.28fr) minmax(320px, .82fr); gap: 18px; align-items: start; }
.pm-task-form-section { min-width: 0; display: grid; gap: 14px; padding: 18px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: color-mix(in srgb, var(--pm-card-hover, #f8fafc) 72%, var(--pm-card, #fff)); }
.pm-task-form-section h3 { margin: 0; color: var(--pm-foreground, #0f172a); font-size: 16px; line-height: 1.2; font-weight: 700; }
.pm-task-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
.pm-task-side-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }
.pm-task-side-grid .pm-field:first-child { grid-column: 1 / -1; }
.pm-task-form-grid .pm-field,
.pm-task-side-grid .pm-field { min-width: 0; }
.pm-span-2 { grid-column: 1 / -1; }
.pm-task-modal-form .pm-field input,
.pm-task-modal-form .pm-field select,
.pm-task-modal-form .pm-field textarea { width: 100%; }
.pm-task-modal-form .pm-field textarea { min-height: 96px; line-height: 1.45; }
.pm-task-modal-form > .pm-form-actions { grid-column: 1 / -1; }
.pm-task-modal-form .pm-form-actions { padding-top: 2px; }
.pm-task-modal-form .pm-form-actions .pm-primary { min-width: 132px; }
.pm-drawer-backdrop { position: fixed; inset: 0; z-index: 1250; background: rgba(15, 23, 42, .58); display: flex; justify-content: flex-end; }
.pm-drawer-close { width: 38px; height: 38px; flex: 0 0 auto; border: 1px solid #dbe3ef; border-radius: 12px; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.pm-drawer-close:hover { border-color: #94a3b8; }
.pm-create-page {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-create-crumbs {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-create-crumbs button {
  border: 0 !important;
  background: transparent !important;
  color: var(--pm-muted) !important;
  padding: 0 !important;
  font: inherit;
  cursor: pointer;
}
.pm-create-crumbs span {
  color: var(--pm-foreground);
}
.pm-create-title-row h1 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(26px, 2.6vw, 34px);
  line-height: 1.1;
  font-weight: 700;
}
.pm-create-title-row p {
  margin: 7px 0 0;
  color: var(--pm-muted);
  font-size: 15px;
}
.pm-create-layout {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 410px);
  gap: 12px;
  align-items: start;
}
.pm-create-main,
.pm-create-side {
  min-width: 0;
  display: grid;
  gap: 8px;
}
.pm-create-section,
.pm-create-side-box {
  min-width: 0;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  background-image: var(--pm-card-gradient);
  padding: 18px;
  display: grid;
  gap: 16px;
  box-shadow: none;
}
.pm-create-section h3,
.pm-create-side-box h3 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
}
.pm-create-section-head {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.pm-create-section-head p {
  margin: 6px 0 0;
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.45;
}
.pm-create-basic-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.pm-create-photo-field {
  min-width: 0;
  display: grid;
  gap: 8px;
}
.pm-create-photo-field > span,
.pm-create-side-box > small,
.pm-create-side-box > p,
.pm-create-note,
.pm-create-section .pm-field small {
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.4;
}
.pm-create-upload {
  min-height: 212px;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  color: var(--pm-muted);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  padding: 20px;
  cursor: pointer;
  overflow: hidden;
}
.pm-create-upload strong,
.pm-create-upload em {
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
}
.pm-create-upload b {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  color: var(--pm-foreground);
  padding: 0 15px;
  font-size: 13px;
}
.pm-create-upload.has-image {
  padding: 0;
}
.pm-create-upload-image {
  width: 100%;
  height: 100%;
  min-height: 212px;
  display: block;
  background-size: cover;
  background-position: center;
}
.pm-create-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.pm-create-basic-fields,
.pm-create-location-grid,
.pm-create-schedule-grid,
.pm-create-budget-grid {
  min-width: 0;
  display: grid;
  gap: 14px;
}
.pm-create-basic-fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pm-create-location-grid,
.pm-create-budget-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.pm-create-schedule-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pm-create-span-2 {
  grid-column: span 2;
}
.pm-create-span-3 {
  grid-column: 1 / -1;
}
.pm-create-page .pm-field {
  min-width: 0;
}
.pm-create-page .pm-field input,
.pm-create-page .pm-field select,
.pm-create-page .pm-field textarea,
.pm-create-team-add select {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  color: var(--pm-foreground);
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
}
.pm-create-page .pm-field textarea {
  min-height: 90px;
  padding: 12px;
  resize: vertical;
}
.pm-create-note {
  margin: -2px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pm-create-side {
  position: sticky;
  top: 16px;
}
.pm-create-side-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pm-create-side-title > svg {
  width: 32px;
  height: 32px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  padding: 7px;
  color: var(--pm-foreground);
  background: var(--pm-card-hover);
}
.pm-create-total {
  color: var(--pm-foreground);
  font-size: 22px;
  line-height: 1.1;
}
.pm-create-budget-list {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--pm-border);
  border-bottom: 1px solid var(--pm-border);
}
.pm-create-budget-list p {
  margin: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 36px;
  color: var(--pm-foreground);
  font-size: 13px;
}
.pm-create-budget-list i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}
.pm-create-budget-list strong {
  font-size: 12px;
  font-weight: 600;
}
.pm-create-donut-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 4px;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.45;
}
.pm-create-donut {
  width: 86px;
  height: 86px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  position: relative;
}
.pm-create-donut::after {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: inherit;
  background: var(--pm-card);
}
.pm-create-donut b {
  position: relative;
  z-index: 1;
  color: var(--pm-foreground);
  font-size: 18px;
}
.pm-create-team-add {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.pm-create-team-add .pm-primary {
  justify-self: start;
  min-height: 34px;
  background: var(--pm-foreground);
  color: var(--pm-background);
  border-color: var(--pm-foreground);
}
.pm-create-team-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pm-create-team-list span {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  padding: 0 8px 0 11px;
  font-size: 12px;
}
.pm-create-team-list button {
  border: 0 !important;
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.pm-create-check {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--pm-foreground);
  font-size: 13px;
  cursor: pointer;
}
.pm-create-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--pm-foreground);
}
.pm-create-actions {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 12px;
}
.pm-create-actions .pm-control,
.pm-create-actions .pm-primary {
  width: 100%;
  justify-content: center;
}
.pm-task-create-page {
  padding-bottom: 18px;
}
.pm-task-name-field input {
  min-height: 46px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
}
.pm-task-id-field {
  align-content: start;
}
.pm-task-id-field input {
  color: var(--pm-muted) !important;
}
.pm-task-id-field small {
  margin-top: 2px;
}
.pm-task-detail-grid,
.pm-task-assignment-grid,
.pm-task-schedule-grid,
.pm-task-time-grid {
  min-width: 0;
  display: grid;
  gap: 14px 16px;
}
.pm-task-detail-grid {
  grid-template-columns: minmax(0, 1fr) minmax(280px, .58fr);
  align-items: start;
}
.pm-task-assignment-grid,
.pm-task-schedule-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.pm-task-time-grid {
  grid-template-columns: minmax(0, 1fr) minmax(160px, .72fr) minmax(0, 1.1fr) minmax(94px, .42fr) minmax(0, .78fr);
  align-items: end;
}
.pm-task-advanced-section {
  padding: 0;
  gap: 0;
}
.pm-task-advanced-toggle {
  min-width: 0;
  width: 100%;
  border: 0 !important;
  background: transparent !important;
  color: var(--pm-foreground) !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.pm-task-advanced-toggle span {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.pm-task-advanced-toggle strong {
  font-size: 15px;
  line-height: 1.2;
}
.pm-task-advanced-toggle small {
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.35;
}
.pm-task-advanced-toggle svg {
  flex: 0 0 auto;
  color: var(--pm-muted);
  transition: transform .16s ease;
}
.pm-task-advanced-toggle[aria-expanded="true"] svg {
  transform: rotate(180deg);
}
.pm-task-advanced-panel {
  display: grid;
  gap: 18px;
  border-top: 1px solid var(--pm-border);
  padding: 18px;
}
.pm-task-advanced-group {
  min-width: 0;
  display: grid;
  gap: 12px;
}
.pm-task-advanced-group h4 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 700;
}
.pm-task-assignment-grid.compact {
  grid-template-columns: minmax(0, .5fr);
}
.pm-task-after-create div {
  display: grid;
  gap: 9px;
}
.pm-task-after-create span {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pm-foreground);
  font-size: 12px;
}
.pm-task-description-editor {
  min-width: 0;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  overflow: hidden;
  display: grid;
}
.pm-task-editor-toolbar {
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0 8px;
  border-bottom: 1px solid var(--pm-border);
  color: var(--pm-foreground);
}
.pm-task-editor-toolbar button {
  min-height: 30px;
  border: 0 !important;
  border-radius: 6px;
  background: transparent !important;
  color: var(--pm-foreground) !important;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.pm-task-editor-toolbar button:hover,
.pm-task-editor-toolbar button:focus-visible {
  background: var(--pm-card-hover) !important;
}
.pm-task-description-input {
  min-height: 136px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--pm-foreground);
  outline: none;
  overflow: auto;
  padding: 10px 12px;
  line-height: 1.55;
  resize: vertical;
  font: inherit;
}
.pm-task-description-input:empty::before {
  content: attr(data-placeholder);
  color: var(--pm-muted);
  pointer-events: none;
}
.pm-task-description-input p,
.pm-task-description-input h2,
.pm-task-description-input h3,
.pm-task-description-input blockquote,
.pm-task-description-input ul,
.pm-task-description-input ol,
.pm-task-description-rich p,
.pm-task-description-rich h2,
.pm-task-description-rich h3,
.pm-task-description-rich blockquote,
.pm-task-description-rich ul,
.pm-task-description-rich ol {
  margin: 0 0 8px;
}
.pm-task-description-input h2,
.pm-task-description-rich h2 {
  font-size: 18px;
  line-height: 1.3;
}
.pm-task-description-input h3,
.pm-task-description-rich h3 {
  font-size: 15px;
  line-height: 1.35;
}
.pm-task-description-input blockquote,
.pm-task-description-rich blockquote {
  border-left: 3px solid var(--pm-border-strong);
  padding-left: 10px;
  color: var(--pm-muted);
}
.pm-task-description-input pre,
.pm-task-description-rich pre {
  margin: 0 0 8px;
  border-radius: 6px;
  background: var(--pm-card-hover);
  padding: 9px 10px;
  overflow: auto;
}
.pm-task-description-input ul,
.pm-task-description-input ol,
.pm-task-description-rich ul,
.pm-task-description-rich ol {
  padding-left: 20px;
}
.pm-task-description-rich {
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.pm-task-description-rich.compact {
  max-height: 78px;
  overflow: hidden;
}
.pm-task-description-rich.compact p,
.pm-task-description-rich.compact ul,
.pm-task-description-rich.compact ol {
  margin-bottom: 6px;
}
.pm-task-description-editor small {
  color: var(--pm-muted);
}
.pm-task-description-footer {
  min-height: 34px;
  border-top: 1px solid var(--pm-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 10px;
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 600;
}
.pm-task-description-editor > .pm-task-description-rich {
  border-top: 1px solid var(--pm-border);
  background: color-mix(in srgb, var(--pm-card) 80%, transparent);
  padding: 10px 12px 4px;
  min-height: 48px;
}
.pm-input-with-suffix,
.pm-input-with-prefix {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  display: grid;
  align-items: center;
  overflow: hidden;
}
.pm-input-with-suffix {
  grid-template-columns: minmax(0, 1fr) 48px;
}
.pm-input-with-prefix {
  grid-template-columns: 54px minmax(0, 1fr);
}
.pm-input-with-suffix input,
.pm-input-with-prefix input {
  min-height: 38px !important;
  border: 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
}
.pm-input-with-suffix b,
.pm-input-with-prefix b {
  height: 100%;
  display: grid;
  place-items: center;
  border-color: var(--pm-border);
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 700;
}
.pm-input-with-suffix b {
  border-left: 1px solid var(--pm-border);
}
.pm-input-with-prefix b {
  border-right: 1px solid var(--pm-border);
}
.pm-task-toggle-field {
  align-self: end;
}
.pm-create-toggle {
  width: 44px;
  height: 26px;
  border: 1px solid var(--pm-border) !important;
  border-radius: 999px;
  background: #e5e7eb !important;
  padding: 2px !important;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.pm-create-toggle i {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--pm-foreground);
  transition: transform .16s ease;
}
.pm-create-toggle.active {
  background: var(--pm-foreground) !important;
}
.pm-create-toggle.active i {
  background: var(--pm-background);
  transform: translateX(18px);
}
.pm-task-follower-list {
  margin-top: -2px;
}
.pm-task-progress-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 22px;
  align-items: center;
}
.pm-task-progress-summary p {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 14px;
  line-height: 1.5;
}
.pm-task-upload-zone {
  min-height: 150px;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--pm-muted);
  text-align: center;
  cursor: pointer;
  padding: 18px;
}
.pm-task-upload-zone b {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  color: var(--pm-foreground);
  padding: 0 14px;
  font-size: 13px;
}
.pm-task-attachment-list,
.pm-task-checklist-list {
  min-width: 0;
  display: grid;
  gap: 8px;
}
.pm-task-attachment-list article,
.pm-task-checklist-list span {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  display: grid;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
}
.pm-task-attachment-list article {
  grid-template-columns: auto minmax(0, 1fr) auto;
}
.pm-task-attachment-list article span {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.pm-task-attachment-list article strong,
.pm-task-checklist-list span {
  font-size: 13px;
  line-height: 1.3;
}
.pm-task-attachment-list article small {
  color: var(--pm-muted);
  font-size: 11px;
}
.pm-task-attachment-list button,
.pm-task-checklist-list button {
  border: 0 !important;
  background: transparent !important;
  color: var(--pm-muted) !important;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.pm-task-checklist-add {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}
.pm-task-checklist-add input {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  color: var(--pm-foreground);
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
}
.pm-task-checklist-add .pm-primary {
  min-height: 40px;
  background: var(--pm-foreground);
  color: var(--pm-background);
  border-color: var(--pm-foreground);
}
.pm-task-checklist-list span {
  grid-template-columns: auto minmax(0, 1fr) auto;
}
.pm-check { min-height: 42px; display: flex; align-items: center; gap: 8px; font-weight: 900; color: #23335f; }
.pm-empty { min-height: 160px; border: 1px dashed #dbe3ef; border-radius: 12px; display: grid; place-items: center; text-align: center; align-content: center; gap: 8px; color: #64748b; padding: 20px; }
.pm-empty strong { color: #0f172a; }
.pm-empty p { margin: 0; max-width: 360px; }
.pm-empty-workspace { min-height: min(440px, calc(100vh - 260px)); border: 1px dashed var(--pm-border, #dbe3ef); border-radius: 8px; background: var(--pm-card, #fff); display: grid; place-items: center; align-content: center; gap: 18px; text-align: center; padding: clamp(28px, 5vw, 56px); }
.pm-empty-workspace > span { width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; background: color-mix(in srgb, #16a34a 12%, var(--pm-card, #fff)); color: #16a34a; }
.pm-empty-workspace h2 { margin: 0; color: var(--pm-foreground, #0f172a); font-size: clamp(24px, 3vw, 34px); line-height: 1.1; font-weight: 800; }
.pm-empty-workspace p { margin: 8px auto 0; max-width: 560px; color: var(--pm-muted, #64748b); font-size: 15px; line-height: 1.55; }
.pm-empty-workspace .pm-primary { min-width: 160px; justify-content: center; }
.pm-detail { display: grid; gap: 18px; }
.pm-detail-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; }
.pm-detail-head h2 { margin: 0; }
.pm-detail-head p { margin: 5px 0 0; color: #23335f; }
.pm-detail-head > button:first-child { border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; min-height: 38px; padding: 0 12px; font-weight: 900; cursor: pointer; }
.pm-detail-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; flex-wrap: wrap; }
.pm-detail-status { width: 150px; }
.pm-detail-overview { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); gap: 16px; align-items: start; }
.pm-project-hero { grid-row: span 2; display: grid; gap: 18px; }
.pm-project-hero-head { display: flex; justify-content: space-between; gap: 14px; align-items: start; }
.pm-project-hero-head h3 { margin: 4px 0 6px; font-size: 24px; line-height: 1.16; }
.pm-project-hero-head p { margin: 0; color: var(--pm-muted, #64748b); line-height: 1.5; }
.pm-overline { color: var(--pm-muted, #64748b); font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
.pm-project-progress { display: grid; gap: 10px; }
.pm-project-progress > div { display: flex; justify-content: space-between; gap: 12px; align-items: end; }
.pm-project-progress strong { font-size: 24px; line-height: 1; }
.pm-project-progress span { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-project-progress .pm-progress { width: 100%; }
.pm-project-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.pm-project-facts span { min-width: 0; display: grid; gap: 4px; padding: 11px 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); }
.pm-project-facts small { color: var(--pm-muted, #64748b); font-size: 11px; font-weight: 800; }
.pm-project-facts strong { min-width: 0; color: var(--pm-foreground, #0f172a); font-size: 13px; line-height: 1.25; overflow-wrap: anywhere; }
.pm-settings-page {
  display: grid;
  gap: 16px;
}
.pm-settings-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 18px 20px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .06);
}
.pm-settings-header > div:first-child {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.pm-settings-header span {
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 800;
}
.pm-settings-header h2 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 24px;
  line-height: 1.16;
}
.pm-settings-header p,
.pm-settings-section-head p,
.pm-settings-photo-card p {
  margin: 0;
  color: var(--pm-muted);
  font-size: 13px;
  line-height: 1.45;
}
.pm-settings-actions,
.pm-settings-danger-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.pm-settings-saved {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #16a34a;
  font-size: 13px;
  font-weight: 700;
}
.pm-settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, .34fr);
  gap: 16px;
  align-items: start;
}
.pm-settings-main,
.pm-settings-side {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-settings-side {
  position: sticky;
  top: 88px;
}
.pm-settings-card {
  min-width: 0;
  display: grid;
  gap: 16px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 18px;
}
.pm-settings-section-head {
  min-width: 0;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
}
.pm-settings-section-head div {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.pm-settings-section-head h3 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.2;
}
.pm-settings-section-head > span {
  flex: 0 0 auto;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-muted);
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 800;
}
.pm-settings-field-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.pm-settings-span-2 {
  grid-column: span 2;
}
.pm-settings-page .pm-field input,
.pm-settings-page .pm-field select,
.pm-settings-page .pm-field textarea {
  min-height: 38px;
  font-size: 13px;
}
.pm-settings-page .pm-field span {
  font-size: 12px;
}
.pm-settings-photo-drop {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  color: var(--pm-muted);
  cursor: pointer;
}
.pm-settings-photo-drop.has-image {
  border-style: solid;
}
.pm-settings-photo-drop > span {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.pm-settings-photo-drop > i {
  width: 58px;
  height: 58px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.04);
}
.pm-settings-photo-drop b {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 8px;
  background: rgba(0,0,0,.62);
  color: #fff;
  font-size: 13px;
}
.pm-settings-toggle-list,
.pm-settings-team-list {
  display: grid;
  gap: 10px;
}
.pm-settings-toggle,
.pm-settings-team-option {
  min-width: 0;
  border: 1px solid var(--pm-border-soft);
  border-radius: 8px;
  background: var(--pm-background);
}
.pm-settings-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
}
.pm-settings-toggle span,
.pm-settings-team-option span {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.pm-settings-toggle strong,
.pm-settings-team-option strong {
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.25;
}
.pm-settings-toggle small,
.pm-settings-team-option small {
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.35;
}
.pm-settings-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--pm-foreground);
}
.pm-settings-team-option {
  display: grid;
  grid-template-columns: auto 32px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
}
.pm-settings-team-option input[type="checkbox"],
.pm-settings-toggle input[type="checkbox"] {
  appearance: auto;
  -webkit-appearance: auto;
  flex: 0 0 auto;
  place-self: center;
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  margin: 0;
  padding: 0;
  border-radius: 4px;
  accent-color: var(--pm-foreground);
}
.pm-settings-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
}
.pm-settings-team-option input[type="checkbox"]:focus-visible,
.pm-settings-toggle input[type="checkbox"]:focus-visible {
  outline: 2px solid var(--pm-foreground);
  outline-offset: 2px;
}
.pm-settings-danger-card {
  border-color: rgba(239,68,68,.32);
  background: color-mix(in srgb, rgba(239,68,68,.11) 45%, var(--pm-card));
}
.pm-detail-form { display: grid; gap: 18px; }
.pm-detail-thumbnail-editor {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  padding: 12px;
}
.pm-detail-thumbnail-drop {
  width: 176px;
  aspect-ratio: 16 / 9;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--pm-muted);
  cursor: pointer;
  overflow: hidden;
}
.pm-detail-thumbnail-drop.has-image { border-style: solid; }
.pm-detail-thumbnail-drop span {
  width: 100%;
  height: 100%;
  display: block;
  background-size: cover;
  background-position: center;
}
.pm-detail-thumbnail-editor div {
  min-width: 0;
  display: grid;
  gap: 6px;
}
.pm-detail-thumbnail-editor strong {
  color: var(--pm-foreground);
  font-size: 14px;
}
.pm-detail-thumbnail-editor small {
  color: var(--pm-muted);
  font-size: 12px;
}
.pm-detail-form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.pm-form-span-2 { grid-column: span 2; }
.pm-team-picker { display: grid; gap: 10px; padding-top: 4px; }
.pm-team-option { min-width: 0; display: grid; grid-template-columns: auto 28px minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); cursor: pointer; }
.pm-team-option input { width: 16px; min-height: 16px; }
.pm-team-option span:last-child { min-width: 0; display: grid; gap: 3px; }
.pm-team-option strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.pm-team-option small { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-danger-zone { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 14px; border: 1px solid rgba(239,68,68,.28); border-radius: 12px; background: rgba(239,68,68,.06); }
.pm-danger-zone div { min-width: 0; display: grid; gap: 3px; }
.pm-danger-zone strong { font-size: 13px; }
.pm-danger-zone small { color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.4; }
.pm-control.danger { border-color: rgba(239,68,68,.42); color: #ef4444; }
.pm-note-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; margin-bottom: 12px; }
.pm-note-form input { min-width: 0; }
.pm-activity-list { display: grid; gap: 10px; }
.pm-activity-list article { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; align-items: start; padding: 10px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); }
.pm-activity-list article > span { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; background: var(--pm-card, #fff); border: 1px solid var(--pm-border-soft, #e6edf6); color: var(--pm-foreground, #0f172a); font-size: 11px; font-weight: 800; }
.pm-activity-list div { min-width: 0; display: grid; gap: 3px; }
.pm-activity-list strong { font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
.pm-activity-list small { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-planning-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .36fr); gap: 16px; align-items: start; }
.pm-planning-form { display: grid; gap: 14px; }
.pm-planning-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.pm-planning-health { display: grid; gap: 14px; }
.pm-planning-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.pm-planning-stats span { min-width: 0; display: grid; gap: 3px; padding: 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); }
.pm-planning-stats strong { font-size: 20px; line-height: 1; }
.pm-planning-stats small { color: var(--pm-muted, #64748b); font-size: 11px; line-height: 1.25; }
.pm-planning-stats span.is-good strong { color: #16a34a; }
.pm-planning-stats span.is-warn { border-color: rgba(245, 158, 11, .42); background: rgba(245, 158, 11, .12); }
.pm-planning-stats span.is-warn strong { color: #d97706; }
.pm-planning-stats span.is-danger { border-color: rgba(239, 68, 68, .42); background: rgba(239, 68, 68, .12); }
.pm-planning-stats span.is-danger strong { color: #ef4444; }
.pm-planning-risks { display: grid; gap: 10px; }
.pm-planning-risks p { margin: 0; display: flex; align-items: center; gap: 8px; color: var(--pm-muted, #64748b); font-size: 13px; line-height: 1.35; }
.pm-phase-board { grid-column: 1 / -1; display: grid; gap: 14px; }
.pm-phase-lanes { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; align-items: start; }
.pm-phase-lane { min-width: 0; display: grid; gap: 10px; padding: 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 14px; background: rgba(255,255,255,.02); }
.pm-phase-lane-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pm-phase-lane-head strong { font-size: 13px; }
.pm-phase-lane-head span { min-width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; background: var(--pm-card-hover, #f8fafc); color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-milestone-card { display: grid; gap: 9px; padding: 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card, #fff); }
.pm-milestone-card > div:first-child { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.pm-milestone-card strong { min-width: 0; font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
.pm-milestone-card small { color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.35; }
.pm-milestone-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pm-milestone-meta select { min-height: 32px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 8px; background: var(--pm-input, #fff); color: var(--pm-foreground, #0f172a); font: inherit; font-size: 12px; padding: 0 8px; }
.pm-milestone-card footer { display: flex; justify-content: flex-end; gap: 8px; }
.pm-milestone-card footer button { min-height: 28px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 8px; background: transparent; color: var(--pm-muted, #64748b); font-size: 12px; cursor: pointer; }
.pm-phase-empty { min-height: 80px; margin: 0; border: 1px dashed var(--pm-border-soft, #e6edf6); border-radius: 12px; display: grid; place-items: center; color: var(--pm-muted, #64748b); font-size: 12px; text-align: center; padding: 12px; }
@media (max-width: 1280px) {
  .pm-dashboard-overview {
    grid-template-columns: minmax(0, 1fr) minmax(300px, .42fr);
    grid-template-areas:
      "recent budget"
      "progress trend";
  }
  .pm-resource-grid, .pm-doc-grid, .pm-budget-grid { grid-template-columns: 1fr 1fr; }
  .pm-kpis { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .pm-kpi { gap: 12px; padding: 16px; }
  .pm-kpi > span { width: 48px; height: 48px; }
  .pm-kpi strong { font-size: clamp(20px, 1.8vw, 24px); }
  .pm-header { grid-template-columns: minmax(300px, .8fr) minmax(520px, 1.2fr); align-items: start; }
  .pm-header-actions { display: grid; grid-template-columns: minmax(190px, auto) minmax(260px, 1fr) 44px minmax(120px, auto); justify-content: end; }
  .pm-new-project-button { grid-column: 4; justify-self: stretch; }
}
@media (max-width: 1080px) {
  .pm-header { grid-template-columns: 1fr; }
  .pm-header-actions { grid-template-columns: minmax(180px, auto) minmax(260px, 1fr) 44px minmax(120px, auto) minmax(150px, auto); justify-content: start; }
  .pm-new-project-button { grid-column: auto; }
}
@media (max-width: 760px) {
  .pm-shell { gap: 16px; padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
  .pm-workspace { gap: 16px; }
  .pm-header { gap: 10px; }
  .pm-title-block h1 { font-size: clamp(24px, 7vw, 28px); letter-spacing: 0; }
  .pm-title-block p { margin-top: 6px; font-size: 13.5px; line-height: 1.45; }
  .pm-header-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: stretch; }
  .pm-control, .pm-primary, .pm-search { width: 100%; min-width: 0; min-height: 44px; justify-content: center; border-radius: 10px; padding: 0 12px; font-size: 12.5px; }
  .pm-header-search { order: 1; grid-column: 1 / -1; justify-content: flex-start; background: #fff; }
  .pm-header-search input { min-width: 0; width: 100%; }
  .pm-date-control { order: 2; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .pm-filter-control { order: 3; }
  .pm-bell-control { display: none; }
  .pm-filter-backdrop {
    position: fixed;
    inset: 0;
    z-index: 850;
    background: rgba(15, 23, 42, .34);
  }
  .pm-new-project-button {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 85;
    width: auto;
    min-width: 156px;
    min-height: 52px;
    border-radius: 999px;
    box-shadow: 0 18px 36px rgba(22, 163, 74, .32);
  }
  .pm-kpis {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin-left: -16px;
    margin-right: -16px;
    padding: 0 16px 8px;
    scroll-padding-left: 16px;
    scrollbar-width: none;
  }
  .pm-kpis::-webkit-scrollbar, .pm-tabs::-webkit-scrollbar { display: none; }
  .pm-kpi { min-width: min(280px, 82vw); min-height: 124px; scroll-snap-align: start; border-radius: 16px; }
  .pm-card { border-radius: 16px; padding: 16px; box-shadow: 0 8px 22px rgba(9, 17, 51, .055); }
  .pm-filter-row { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .pm-filter-row .pm-select { min-height: 44px; padding: 0 8px; font-size: 12px; border-radius: 10px; }
  .pm-resource-grid, .pm-doc-grid, .pm-budget-grid, .pm-form, .pm-modal-form { grid-template-columns: 1fr; }
  .pm-task-form-section,
  .pm-task-modal-form > .pm-form-actions {
    grid-column: 1 / -1;
  }
  .pm-task-form-grid {
    grid-template-columns: 1fr;
  }
  .pm-tabs {
    gap: 22px;
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
    border-bottom: 1px solid #dfe7f2;
    scrollbar-width: none;
  }
  .pm-tabs button {
    min-height: 40px;
    border: 0 !important;
    border-bottom: 2px solid transparent !important;
    border-radius: 0 !important;
    padding: 0 0 10px;
    font-size: 13px;
  }
  .pm-tabs button.active,
  .pm-tabs button[aria-selected="true"] {
    background: transparent !important;
    color: #111827 !important;
    border-bottom-color: #111827 !important;
  }
  .pm-filter-panel,
  .pm-alert-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: auto;
    z-index: 860;
    grid-template-columns: 1fr;
    max-height: min(82dvh, calc(100dvh - 88px));
    overflow: auto;
    border-radius: 20px 20px 0 0;
    padding: 18px;
    box-shadow: 0 -18px 60px rgba(15, 23, 42, .24);
  }
  .pm-date-presets { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pm-alert-panel { gap: 12px; }
  .pm-dashboard-overview {
    grid-template-columns: 1fr;
    grid-template-areas:
      "recent"
      "progress"
      "trend"
      "budget";
  }
  .pm-settings-header,
  .pm-settings-layout {
    grid-template-columns: 1fr;
  }
  .pm-settings-header {
    display: grid;
    align-items: start;
  }
  .pm-settings-side {
    position: static;
  }
  .pm-settings-field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pm-create-layout,
  .pm-create-basic-grid,
  .pm-create-basic-fields,
  .pm-create-location-grid,
  .pm-create-schedule-grid,
  .pm-create-budget-grid,
  .pm-detail-thumbnail-editor,
  .pm-task-detail-grid,
  .pm-task-assignment-grid,
  .pm-task-schedule-grid,
  .pm-task-time-grid,
  .pm-task-progress-summary {
    grid-template-columns: 1fr;
  }
  .pm-create-span-2,
  .pm-create-span-3,
  .pm-settings-span-2 {
    grid-column: auto;
  }
  .pm-create-side {
    position: static;
  }
  .pm-detail-thumbnail-drop {
    width: 100%;
  }
  .pm-create-section,
  .pm-create-side-box {
    padding: 14px;
  }
  .pm-settings-field-grid {
    grid-template-columns: 1fr;
  }
  .pm-settings-header,
  .pm-settings-card {
    padding: 14px;
  }
  .pm-settings-actions,
  .pm-settings-danger-actions {
    width: 100%;
    justify-content: stretch;
  }
  .pm-settings-actions button,
  .pm-settings-danger-actions button {
    flex: 1 1 0;
  }
  .pm-create-actions { grid-template-columns: 1fr; }
  .pm-donut-wrap, .pm-budget-meter, .pm-detail-head { grid-template-columns: 1fr; }
  .pm-donut { width: 180px; height: 180px; margin: auto; }
  .pm-list article { align-items: start; }
  .pm-wide { grid-column: auto; }
  .pm-table-wrap { display: none; }
  .pm-mobile-projects { display: grid; gap: 12px; }
  .pm-mobile-project-card {
    border: 1px solid #e3ebf5;
    border-radius: 16px;
    padding: 16px;
    display: grid;
    gap: 10px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(9, 17, 51, .07);
  }
  .pm-mobile-project-card > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .pm-mobile-project-card strong { overflow-wrap: anywhere; font-size: 15px; }
  .pm-mobile-project-card small { font-size: 12.5px; }
  .pm-mobile-project-card span:not(.pm-pill):not(.pm-progress) { color: #64748b; font-size: 12px; font-weight: 800; }
  .pm-mobile-project-card .pm-progress { width: 100%; }
  .pm-kanban { grid-template-columns: repeat(5, minmax(78vw, 1fr)); margin-right: -16px; }
  .pm-task-card footer { grid-template-columns: auto 1fr; }
  .pm-task-card footer .pm-progress { grid-column: 1 / -1; width: 100%; }
  .pm-task-collab-grid, .pm-task-upload, .pm-task-comment-form { grid-template-columns: 1fr; }
  .pm-task-panel { height: min(320px, 64dvh); }
  .pm-task-actions { flex-wrap: wrap; justify-content: flex-end; }
  .pm-task-file-list article { grid-template-columns: 28px minmax(0, 1fr) auto; }
  .pm-task-file-list article .pm-pill { grid-column: 2; justify-self: start; }
  .pm-modal-backdrop { align-items: end; padding: 0; }
  .pm-modal { width: 100%; max-height: 92dvh; border-radius: 18px 18px 0 0; }
}
@media (max-width: 390px) {
  .pm-new-project-button { left: 16px; right: 16px; width: auto; }
  .pm-kpi { min-width: calc(100vw - 56px); }
}

@media (max-width: 1040px) {
  .pm-detail-head { grid-template-columns: 1fr; align-items: start; }
  .pm-detail-actions { justify-content: flex-start; }
  .pm-detail-overview { grid-template-columns: 1fr; }
  .pm-project-hero { grid-row: auto; }
  .pm-detail-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pm-danger-zone { grid-template-columns: 1fr; }
  .pm-planning-grid { grid-template-columns: 1fr; }
  .pm-planning-health { order: 3; }
}
@media (max-width: 640px) {
  .pm-detail-form-grid { grid-template-columns: 1fr; }
  .pm-planning-form-grid { grid-template-columns: 1fr; }
  .pm-planning-stats { grid-template-columns: 1fr; }
  .pm-form-span-2 { grid-column: span 1; }
  .pm-detail-actions, .pm-note-form { display: grid; grid-template-columns: 1fr; }
  .pm-detail-status { width: 100%; }
}

.pm-shell {
  --pm-background: #f3f4f6;
  --pm-card: #ffffff;
  --pm-card-hover: #f4f4f5;
  --pm-card-gradient: #ffffff;
  --pm-border: #e5e7eb;
  --pm-border-soft: #eef2f7;
  --pm-foreground: #09090b;
  --pm-muted: #4b5563;
  --pm-placeholder: #6b7280;
  --pm-input: #ffffff;
  --pm-ring: rgba(9,9,11,.08);
  gap: 24px;
  color: var(--pm-foreground);
  font-family: var(--font-geist-sans), "Geist Sans", sans-serif;
}
.pm-shell,
.pm-workspace {
  background: var(--pm-background);
}
.pm-workspace {
  gap: 24px;
}
.pm-header {
  align-items: start;
}
.pm-title-block h1 {
  color: var(--pm-foreground);
  font-size: 31px;
  line-height: 37px;
  font-weight: 600;
}
.pm-title-block p {
  color: var(--pm-muted);
  font-size: 15px;
  line-height: 1.5;
  font-weight: 400;
  margin-top: 6px;
}
.pm-header-actions {
  align-items: center;
  gap: 12px;
}
.pm-control,
.pm-primary,
.pm-select,
.pm-search,
.pm-icon-btn,
.pm-detail-head > button:first-child,
.pm-drawer-close,
.pm-alert-head button {
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  background: var(--pm-card);
  color: var(--pm-foreground);
  box-shadow: none;
  font-size: 14px;
  font-weight: 500;
}
.pm-primary {
  background: var(--pm-card);
  border-color: var(--pm-border);
}
.pm-control:hover,
.pm-primary:hover,
.pm-icon-btn:hover,
.pm-date-presets button:hover,
.pm-section-header button:hover,
.pm-alert-panel > button:hover,
.pm-actions button:hover {
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  border-color: var(--pm-border);
  transform: none;
}
.pm-search {
  height: 40px;
  background: var(--pm-input);
}
.pm-search input,
.pm-field input,
.pm-field select,
.pm-field textarea,
.pm-select {
  background: var(--pm-input);
  color: var(--pm-foreground);
  border-color: #2a2a2a;
}
.pm-search input::placeholder,
.pm-field input::placeholder,
.pm-field textarea::placeholder {
  color: var(--pm-placeholder);
}
.pm-search:focus-within,
.pm-field input:focus,
.pm-field select:focus,
.pm-field textarea:focus,
.pm-select:focus {
  border-color: var(--pm-foreground) !important;
  box-shadow: 0 0 0 3px var(--pm-ring) !important;
}
.pm-card {
  background: var(--pm-card-gradient);
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
  color: var(--pm-foreground);
}
.pm-card:hover {
  background: linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.02));
}
.pm-kpis {
  gap: 16px;
}
.pm-kpi {
  min-height: 116px;
  padding: 20px 24px;
  gap: 16px;
}
.pm-kpi > span {
  width: 52px;
  height: 52px;
  border: 1px solid var(--pm-border-soft);
  background: var(--pm-card-hover) !important;
  color: var(--pm-foreground) !important;
}
.pm-kpi small,
.pm-card small,
.pm-budget-meter small {
  color: var(--pm-muted);
  font-weight: 400;
}
.pm-kpi strong,
.pm-budget-meter strong {
  color: var(--pm-foreground);
  font-weight: 600;
}
.pm-kpi em,
.pm-kpi em.negative {
  color: var(--pm-muted);
  font-weight: 400;
}
.pm-tabs {
  gap: 24px;
  min-height: 48px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--pm-border);
  background: transparent !important;
}
.pm-tabs button {
  min-height: 48px;
  padding: 0 0 12px;
  background: transparent !important;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--pm-muted);
  font-size: 13px;
  font-weight: 400;
  transform: none !important;
}
.pm-tabs button.active,
.pm-tabs button[aria-selected="true"],
.pm-tabs button:hover,
.pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
  background: transparent !important;
  font-weight: 500;
}
.pm-section-header {
  margin-bottom: 16px;
}
.pm-section-header h2 {
  color: var(--pm-foreground);
  font-size: 18px;
  font-weight: 600;
}
.pm-section-header button {
  color: var(--pm-foreground);
  font-size: 13px;
  font-weight: 500;
}
.pm-empty {
  min-height: 170px;
  border: 1px dashed #3a3a3a;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.008));
  color: var(--pm-muted);
  gap: 10px;
}
.pm-empty-icon {
  width: 52px;
  height: 52px;
  border: 1px solid var(--pm-border-soft);
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
}
.pm-empty strong {
  color: var(--pm-foreground);
  font-size: 15px;
  font-weight: 600;
}
.pm-empty p {
  color: var(--pm-muted);
  font-size: 14px;
  line-height: 1.55;
}
.pm-line line {
  stroke: var(--pm-border-soft);
}
.pm-line div,
.pm-task-card p,
.pm-detail-head p,
.pm-field span,
.pm-check,
.pm-mobile-project-card span:not(.pm-pill):not(.pm-progress) {
  color: var(--pm-muted);
}
.pm-list article,
.pm-task-card,
.pm-task-panel,
.pm-task-file-list article,
.pm-resource-grid article,
.pm-doc-grid article,
.pm-mobile-project-card,
.pm-create-snapshot span,
.pm-create-section {
  border-color: var(--pm-border);
  background: var(--pm-card);
  box-shadow: none;
}
.pm-list svg,
.pm-actions span {
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  border: 1px solid var(--pm-border-soft);
}
.pm-table th {
  background: var(--pm-card);
  color: var(--pm-muted);
  border-bottom: 1px solid var(--pm-border-soft);
  font-size: 13px;
  font-weight: 500;
}
.pm-table td {
  color: var(--pm-foreground);
  border-color: var(--pm-border-soft);
  font-size: 13px;
}
.pm-table tbody tr:hover td {
  background: var(--pm-card-hover);
}
.pm-pill,
.tone-completed,
.tone-done,
.tone-approved,
.tone-good,
.tone-in-progress,
.tone-active,
.tone-review,
.tone-on-hold,
.tone-medium,
.tone-pending,
.tone-critical,
.tone-high,
.tone-blocked,
.tone-delayed,
.tone-at-risk {
  background: var(--pm-card-hover);
  border: 1px solid var(--pm-border-soft);
  color: var(--pm-foreground);
}
.pm-progress {
  background: #e5e7eb;
}
.pm-progress i {
  background: var(--pm-foreground);
}
.pm-actions button,
.pm-upload-button,
.pm-alert-panel > button,
.pm-date-presets button,
.pm-create,
.pm-create-body,
.pm-create-actions {
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-alert-head,
.pm-create-head,
.pm-create-actions {
  border-color: var(--pm-border);
}
.pm-create-head {
  background: linear-gradient(180deg, var(--pm-card-hover), var(--pm-card));
}
.pm-create-eyebrow {
  color: var(--pm-muted);
}
.pm-create-head h2,
.pm-create-section h3,
.pm-create-snapshot strong,
.pm-alert-panel > button strong,
.pm-alert-empty strong {
  color: var(--pm-foreground);
}
.pm-create-head p,
.pm-create-snapshot small,
.pm-alert-panel > button small,
.pm-alert-empty small {
  color: var(--pm-muted);
}
.pm-create-snapshot,
.pm-alert-empty {
  background: var(--pm-background);
  border-color: var(--pm-border);
}
.pm-modal-backdrop,
.pm-drawer-backdrop {
  background: rgba(15,23,42,.32);
}
@media (max-width: 760px) {
  .pm-header-search,
  .pm-mobile-project-card {
    background: var(--pm-card);
  }
  .pm-tabs {
    border-color: var(--pm-border);
  }
  .pm-filter-backdrop {
    background: rgba(15,23,42,.32);
  }
}
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  transform: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button.active,
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:focus-visible,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button.active,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:hover,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:focus-visible {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
}

html[data-theme='light'] body .project-workspace-shell .pm-shell {
  --pm-background: #f3f4f6;
  --pm-card: #ffffff;
  --pm-card-hover: #f4f4f5;
  --pm-card-gradient: #ffffff;
  --pm-border: #e5e7eb;
  --pm-border-soft: #eef2f7;
  --pm-foreground: #09090b;
  --pm-muted: #4b5563;
  --pm-placeholder: #6b7280;
  --pm-input: #ffffff;
  --pm-ring: rgba(9,9,11,.08);
  color: var(--pm-foreground);
  background: var(--pm-background);
}
html[data-theme='light'] body .project-workspace-shell .pm-workspace {
  background: var(--pm-background);
}
html[data-theme='light'] body .project-workspace-shell .pm-title-block h1,
html[data-theme='light'] body .project-workspace-shell .pm-section-header h2,
html[data-theme='light'] body .project-workspace-shell .pm-kpi strong,
html[data-theme='light'] body .project-workspace-shell .pm-budget-meter strong,
html[data-theme='light'] body .project-workspace-shell .pm-empty strong,
html[data-theme='light'] body .project-workspace-shell .pm-create-head h2,
html[data-theme='light'] body .project-workspace-shell .pm-create-section h3,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot strong,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button strong,
html[data-theme='light'] body .project-workspace-shell .pm-alert-empty strong {
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-title-block p,
html[data-theme='light'] body .project-workspace-shell .pm-kpi small,
html[data-theme='light'] body .project-workspace-shell .pm-card small,
html[data-theme='light'] body .project-workspace-shell .pm-budget-meter small,
html[data-theme='light'] body .project-workspace-shell .pm-kpi em,
html[data-theme='light'] body .project-workspace-shell .pm-kpi em.negative,
html[data-theme='light'] body .project-workspace-shell .pm-empty p,
html[data-theme='light'] body .project-workspace-shell .pm-line div,
html[data-theme='light'] body .project-workspace-shell .pm-task-card p,
html[data-theme='light'] body .project-workspace-shell .pm-detail-head p,
html[data-theme='light'] body .project-workspace-shell .pm-field span,
html[data-theme='light'] body .project-workspace-shell .pm-check,
html[data-theme='light'] body .project-workspace-shell .pm-create-head p,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot small,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button small,
html[data-theme='light'] body .project-workspace-shell .pm-alert-empty small {
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-shell .pm-card,
html[data-theme='light'] body .project-workspace-shell .pm-list article,
html[data-theme='light'] body .project-workspace-shell .pm-task-card,
html[data-theme='light'] body .project-workspace-shell .pm-task-panel,
html[data-theme='light'] body .project-workspace-shell .pm-task-file-list article,
html[data-theme='light'] body .project-workspace-shell .pm-resource-grid article,
html[data-theme='light'] body .project-workspace-shell .pm-doc-grid article,
html[data-theme='light'] body .project-workspace-shell .pm-mobile-project-card,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot span,
html[data-theme='light'] body .project-workspace-shell .pm-create-section,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button,
html[data-theme='light'] body .project-workspace-shell .pm-upload-button,
html[data-theme='light'] body .project-workspace-shell .pm-create,
html[data-theme='light'] body .project-workspace-shell .pm-create-body,
html[data-theme='light'] body .project-workspace-shell .pm-create-actions {
  background: var(--pm-card);
  border-color: var(--pm-border);
  color: var(--pm-foreground);
  box-shadow: none;
}
html[data-theme='light'] body .project-workspace-shell .pm-card:hover {
  background: var(--pm-card);
}
html[data-theme='light'] body .project-workspace-shell .pm-control,
html[data-theme='light'] body .project-workspace-shell .pm-select,
html[data-theme='light'] body .project-workspace-shell .pm-search,
html[data-theme='light'] body .project-workspace-shell .pm-icon-btn,
html[data-theme='light'] body .project-workspace-shell .pm-detail-head > button:first-child,
html[data-theme='light'] body .project-workspace-shell .pm-drawer-close,
html[data-theme='light'] body .project-workspace-shell .pm-alert-head button,
html[data-theme='light'] body .project-workspace-shell .pm-field input,
html[data-theme='light'] body .project-workspace-shell .pm-field select,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea {
  background: var(--pm-input);
  border-color: #d4d4d8;
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-primary {
  background: #09090b;
  border-color: #09090b;
  color: #ffffff;
}
html[data-theme='light'] body .project-workspace-shell .pm-primary:hover {
  background: #18181b;
  border-color: #18181b;
  color: #ffffff;
}
html[data-theme='light'] body .project-workspace-shell .pm-control:hover,
html[data-theme='light'] body .project-workspace-shell .pm-icon-btn:hover,
html[data-theme='light'] body .project-workspace-shell .pm-date-presets button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-actions button:hover {
  background: var(--pm-card-hover);
  border-color: var(--pm-border);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-search input,
html[data-theme='light'] body .project-workspace-shell .pm-field input,
html[data-theme='light'] body .project-workspace-shell .pm-field select,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea {
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-search input::placeholder,
html[data-theme='light'] body .project-workspace-shell .pm-field input::placeholder,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea::placeholder {
  color: var(--pm-placeholder);
}
html[data-theme='light'] body .project-workspace-shell .pm-search:focus-within,
html[data-theme='light'] body .project-workspace-shell .pm-field input:focus,
html[data-theme='light'] body .project-workspace-shell .pm-field select:focus,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea:focus,
html[data-theme='light'] body .project-workspace-shell .pm-select:focus {
  border-color: var(--pm-foreground) !important;
  box-shadow: 0 0 0 3px var(--pm-ring) !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-kpi > span,
html[data-theme='light'] body .project-workspace-shell .pm-empty-icon,
html[data-theme='light'] body .project-workspace-shell .pm-list svg,
html[data-theme='light'] body .project-workspace-shell .pm-actions span {
  background: var(--pm-card-hover) !important;
  border-color: var(--pm-border);
  color: var(--pm-foreground) !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-tabs {
  border-bottom-color: var(--pm-border);
}
html[data-theme='light'] body .project-workspace-shell .pm-tabs button {
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-shell .pm-tabs button.active,
html[data-theme='light'] body .project-workspace-shell .pm-tabs button[aria-selected="true"],
html[data-theme='light'] body .project-workspace-shell .pm-tabs button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-empty,
html[data-theme='light'] body .project-workspace-shell .pm-alert-empty,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot {
  background: #ffffff;
  border-color: #d4d4d8;
}
html[data-theme='light'] body .project-workspace-shell .pm-table th {
  background: #fafafa;
  border-color: var(--pm-border);
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-shell .pm-table td {
  border-color: var(--pm-border-soft);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-table tbody tr:hover td {
  background: #fafafa;
}
html[data-theme='light'] body .project-workspace-shell .pm-pill,
html[data-theme='light'] body .project-workspace-shell .tone-completed,
html[data-theme='light'] body .project-workspace-shell .tone-done,
html[data-theme='light'] body .project-workspace-shell .tone-approved,
html[data-theme='light'] body .project-workspace-shell .tone-good,
html[data-theme='light'] body .project-workspace-shell .tone-in-progress,
html[data-theme='light'] body .project-workspace-shell .tone-active,
html[data-theme='light'] body .project-workspace-shell .tone-review,
html[data-theme='light'] body .project-workspace-shell .tone-on-hold,
html[data-theme='light'] body .project-workspace-shell .tone-medium,
html[data-theme='light'] body .project-workspace-shell .tone-pending,
html[data-theme='light'] body .project-workspace-shell .tone-critical,
html[data-theme='light'] body .project-workspace-shell .tone-high,
html[data-theme='light'] body .project-workspace-shell .tone-blocked,
html[data-theme='light'] body .project-workspace-shell .tone-delayed,
html[data-theme='light'] body .project-workspace-shell .tone-at-risk {
  background: #fafafa;
  border-color: var(--pm-border);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-pill.tone-low,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-low {
  background: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
  color: #475569 !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-pill.tone-medium,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-medium {
  background: #fef3c7 !important;
  border-color: #fcd34d !important;
  color: #b45309 !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-pill.tone-high,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-high {
  background: #ffedd5 !important;
  border-color: #fdba74 !important;
  color: #c2410c !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-pill.tone-critical,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-critical {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-progress {
  background: #e5e7eb;
}
html[data-theme='light'] body .project-workspace-shell .pm-progress i {
  background: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-create-head {
  background: #ffffff;
  border-color: var(--pm-border);
}
html[data-theme='light'] body .project-workspace-shell .pm-modal-backdrop,
html[data-theme='light'] body .project-workspace-shell .pm-drawer-backdrop {
  background: rgba(15,23,42,.32);
}

html[data-theme='dark'] body .project-workspace-shell .pm-header,
html[data-theme='dark'] body .project-workspace-shell .pm-header:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-title-block,
html[data-theme='dark'] body .project-workspace-shell .pm-title-block:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-header-actions,
html[data-theme='dark'] body .project-workspace-shell .pm-header-actions:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header > *,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header > *:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header h2,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header h2:hover {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-header-actions {
  border-color: transparent !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover {
  background: var(--pm-card-gradient) !important;
  background-color: var(--pm-card) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035) !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover .pm-section-header,
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover .pm-section-header h2,
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover .pm-section-header button {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-section-header button:hover {
  background: transparent !important;
  background-color: transparent !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-header,
html[data-theme='light'] body .project-workspace-shell .pm-header:hover,
html[data-theme='light'] body .project-workspace-shell .pm-title-block,
html[data-theme='light'] body .project-workspace-shell .pm-title-block:hover,
html[data-theme='light'] body .project-workspace-shell .pm-header-actions,
html[data-theme='light'] body .project-workspace-shell .pm-header-actions:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header,
html[data-theme='light'] body .project-workspace-shell .pm-section-header:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header > *,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar > *,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar > *:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header > *:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header h2,
html[data-theme='light'] body .project-workspace-shell .pm-section-header h2:hover {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-card:hover {
  background: var(--pm-card) !important;
  background-color: var(--pm-card) !important;
  box-shadow: none !important;
}

body .project-workspace-shell .pm-page-top {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(240px, .9fr) minmax(320px, 1.1fr);
  gap: 16px;
  align-items: start;
}
body .project-workspace-shell .pm-page-title {
  min-width: 0;
}
body .project-workspace-shell .pm-page-title h1 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(26px, 3vw, 32px);
  line-height: 1.12;
  font-weight: 600;
  overflow-wrap: anywhere;
}
body .project-workspace-shell .pm-page-title p {
  margin: 6px 0 0;
  color: var(--pm-muted);
  font-size: 15px;
  line-height: 1.4;
}
body .project-workspace-shell .pm-page-tools {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(140px, max-content) minmax(220px, 1fr) minmax(112px, max-content) 40px;
  gap: 10px;
  justify-content: end;
}
body .project-workspace-shell .pm-page-search,
body .project-workspace-shell .pm-page-search input {
  min-width: 0;
}
body .project-workspace-shell .pm-kpis {
  grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr)) !important;
}
body .project-workspace-shell .pm-dashboard-overview {
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  grid-template-areas: none;
}
body .project-workspace-shell .pm-progress-card,
body .project-workspace-shell .pm-trend,
body .project-workspace-shell .pm-milestones,
body .project-workspace-shell .pm-recent,
body .project-workspace-shell .pm-budget-card {
  grid-area: auto;
}
body .project-workspace-shell .pm-dashboard-overview > .pm-recent {
  grid-column: 1 / -1;
}
body .project-workspace-shell .pm-section-bar,
body .project-workspace-shell .pm-section-header {
  min-width: 0;
  flex-wrap: wrap;
  align-items: flex-start;
  row-gap: 6px;
}
body .project-workspace-shell .pm-section-bar h2,
body .project-workspace-shell .pm-section-header h2 {
  min-width: 0;
  overflow-wrap: anywhere;
  line-height: 1.2;
}
body .project-workspace-shell .pm-section-action,
body .project-workspace-shell .pm-section-bar button,
body .project-workspace-shell .pm-section-header button {
  min-height: 24px;
  white-space: nowrap;
  line-height: 1.2;
}
body .project-workspace-shell .pm-section-action {
  border: 1px solid var(--pm-border-soft);
  border-radius: 999px;
  background: var(--pm-card-hover) !important;
  color: var(--pm-muted);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}
body .project-workspace-shell .pm-kanban {
  grid-template-columns: repeat(5, minmax(220px, 1fr));
}
@media (max-width: 1180px) {
  body .project-workspace-shell .pm-page-top {
    grid-template-columns: 1fr;
  }
  body .project-workspace-shell .pm-page-tools {
    grid-template-columns: minmax(140px, max-content) minmax(220px, 1fr) minmax(112px, max-content) 40px;
    justify-content: start;
  }
}
@media (max-width: 760px) {
  body .project-workspace-shell .pm-page-title h1 {
    font-size: clamp(24px, 8vw, 30px);
  }
  body .project-workspace-shell .pm-page-tools {
    grid-template-columns: 1fr 1fr;
  }
  body .project-workspace-shell .pm-page-search {
    grid-column: 1 / -1;
    order: -1;
  }
  body .project-workspace-shell .pm-bell-control {
    display: none;
  }
  body .project-workspace-shell .pm-kanban {
    grid-template-columns: repeat(5, minmax(78vw, 1fr));
    margin-right: -16px;
  }
  body .project-workspace-shell .pm-section-action,
  body .project-workspace-shell .pm-section-bar button,
  body .project-workspace-shell .pm-section-header button {
    white-space: normal;
    text-align: left;
  }
}

body .project-workspace-shell .pm-section-bar {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: start;
  column-gap: 14px;
  row-gap: 4px;
}
body .project-workspace-shell .pm-section-bar h2 {
  min-width: 0;
  margin: 0;
}
body .project-workspace-shell .pm-section-action {
  min-height: 0;
  justify-self: end;
  border: 0 !important;
  border-radius: 0;
  background: transparent !important;
  color: var(--pm-muted);
  padding: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}
@media (max-width: 760px) {
  body .project-workspace-shell .pm-section-bar {
    grid-template-columns: 1fr;
  }
  body .project-workspace-shell .pm-section-action {
    justify-self: start;
    padding-top: 0;
    white-space: normal;
  }
}

body .app-shell .main-content .pm-shell {
  width: 100%;
  max-width: none !important;
  min-width: 0;
  min-height: calc(100vh - 48px);
  margin: 0 !important;
  padding: 22px clamp(16px, 2.5vw, 48px) 28px;
  align-content: start;
  gap: 18px;
}
body .app-shell .main-content .pm-workspace {
  width: 100%;
  max-width: var(--wf-content-max, 1440px);
  margin-inline: auto;
  min-width: 0;
  align-content: start;
  gap: 18px;
}
body .app-shell .main-content .pm-page-top {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(260px, .72fr) minmax(520px, 1fr);
  gap: 16px;
  align-items: start;
}
body .app-shell .main-content .pm-page-title {
  min-width: 0;
}
body .app-shell .main-content .pm-page-title h1 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(27px, 2.4vw, 32px);
  line-height: 1.1;
  font-weight: 700;
  overflow-wrap: anywhere;
}
body .app-shell .main-content .pm-page-title p {
  margin: 4px 0 0;
  color: var(--pm-muted);
  font-size: 15px;
  line-height: 1.35;
}
body .app-shell .main-content .pm-page-tools {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(142px, max-content) minmax(112px, max-content) 44px;
  gap: 8px;
  justify-content: end;
  align-items: start;
}
body .app-shell .main-content .pm-page-tools .pm-control,
body .app-shell .main-content .pm-page-tools .pm-primary,
body .app-shell .main-content .pm-page-tools .pm-search {
  min-height: 40px;
  height: 40px;
  border-radius: 10px;
  white-space: nowrap;
}
body .app-shell .main-content .pm-page-tools .pm-filter-control,
body .app-shell .main-content .pm-page-tools .pm-new-project-button {
  padding-left: 12px;
  padding-right: 12px;
}
body .app-shell .main-content .pm-page-tools .pm-filter-control span,
body .project-workspace-shell .pm-page-tools .pm-filter-control span {
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  padding: 0 5px;
  background: var(--pm-foreground, #0f172a);
  color: var(--pm-card, #ffffff);
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
}
body .app-shell .main-content .pm-page-search {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
body .app-shell .main-content .pm-page-search input {
  width: 100%;
  min-width: 0;
  max-width: none;
  text-overflow: ellipsis;
}
body .app-shell .main-content .pm-filter-search,
body .project-workspace-shell .pm-filter-search {
  min-width: 0;
  min-height: 38px;
  border: 1px solid var(--pm-border-soft, #dbe3ef);
  border-radius: 8px;
  background: var(--pm-input, #fff);
  color: var(--pm-foreground, #0f172a);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
}
body .app-shell .main-content .pm-filter-search svg,
body .project-workspace-shell .pm-filter-search svg {
  flex: 0 0 auto;
  color: var(--pm-muted, #64748b);
}
body .app-shell .main-content .pm-filter-search input,
body .project-workspace-shell .pm-filter-search input {
  width: 100%;
  min-width: 0;
  border: 0 !important;
  outline: 0;
  background: transparent !important;
  color: inherit;
  font: inherit;
}
body .app-shell .main-content .pm-bell-control {
  width: 44px;
  justify-content: center;
  padding: 0;
}
body .app-shell .main-content .pm-kpis {
  grid-template-columns: repeat(5, minmax(178px, 1fr)) !important;
  gap: 14px;
}
body .app-shell .main-content .pm-kpi {
  min-height: 108px;
  padding: 18px 20px;
  gap: 14px;
}
body .app-shell .main-content .pm-dashboard-overview {
  grid-template-columns: minmax(320px, .92fr) minmax(360px, 1.06fr) minmax(300px, .82fr);
  grid-template-areas:
    "recent recent recent"
    "progress trend budget"
    "progress trend budget";
}
body .app-shell .main-content .pm-progress-card { grid-area: progress; }
body .app-shell .main-content .pm-trend { grid-area: trend; }
body .app-shell .main-content .pm-milestones { grid-area: milestones; }
body .app-shell .main-content .pm-recent { grid-area: recent; }
body .app-shell .main-content .pm-budget-card { grid-area: budget; }
body .app-shell .main-content .pm-tabs {
  gap: 24px;
  min-height: 48px;
  margin-top: 0;
  margin-bottom: 4px;
  padding-bottom: 0;
  border-bottom: 1px solid var(--pm-border);
  background: transparent !important;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button {
  min-height: 48px;
  padding: 0 0 12px;
  background: transparent !important;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--pm-muted);
  font-size: 13px;
  font-weight: 400;
  transform: none !important;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button.active,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:hover,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
  font-weight: 500;
}
body .app-shell .main-content .pm-card {
  padding: 20px;
}
body .app-shell .main-content .pm-section-header {
  margin-bottom: 14px;
}
body .app-shell .main-content .pm-donut-wrap {
  gap: 16px;
}
body .app-shell .main-content .pm-table-wrap {
  overflow-x: auto;
}
@media (max-width: 1440px) {
  body .app-shell .main-content .pm-page-top {
    grid-template-columns: 1fr;
  }
  body .app-shell .main-content .pm-page-tools {
    justify-content: start;
  }
  body .app-shell .main-content .pm-kpis {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important;
  }
  body .app-shell .main-content .pm-dashboard-overview {
    grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
    grid-template-areas: none;
  }
  body .app-shell .main-content .pm-progress-card,
  body .app-shell .main-content .pm-trend,
  body .app-shell .main-content .pm-milestones,
  body .app-shell .main-content .pm-recent,
  body .app-shell .main-content .pm-budget-card {
    grid-area: auto;
  }
  body .app-shell .main-content .pm-dashboard-overview > .pm-recent {
    grid-column: 1 / -1;
  }
}
@media (max-width: 920px) {
  body .app-shell .main-content .pm-page-tools {
    grid-template-columns: minmax(0, 1fr) minmax(112px, max-content);
  }
  body .app-shell .main-content .pm-bell-control {
    display: none;
  }
}
@media (max-width: 560px) {
  body .app-shell .main-content .pm-shell {
    padding: 14px 12px 22px;
  }
  body .app-shell .main-content .pm-page-tools {
    grid-template-columns: 1fr;
  }
  body .app-shell .main-content .pm-page-tools .pm-control,
  body .app-shell .main-content .pm-page-tools .pm-primary,
  body .app-shell .main-content .pm-page-tools .pm-search {
    width: 100%;
    justify-content: center;
  }
}

body .app-shell .main-content .pm-shell {
  align-items: start;
  grid-auto-rows: max-content;
}
body .app-shell .main-content .pm-workspace {
  grid-auto-rows: max-content;
  gap: 16px;
}
body .app-shell .main-content .pm-tab-panel {
  width: 100%;
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 16px;
}
body .app-shell .main-content .pm-tabs {
  gap: 28px;
  min-height: 44px;
  margin-bottom: 0;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button {
  min-height: 44px;
  padding-bottom: 10px;
}
body .app-shell .main-content .pm-kpis {
  gap: 12px;
}
body .app-shell .main-content .pm-kpi {
  min-height: 96px;
  padding: 16px 18px;
  gap: 13px;
}
body .app-shell .main-content .pm-kpi > span {
  width: 46px;
  height: 46px;
  border-radius: 8px;
}
body .app-shell .main-content .pm-kpi small,
body .app-shell .main-content .pm-card small {
  font-weight: 600;
}
body .app-shell .main-content .pm-kpi strong {
  margin-top: 4px;
  font-size: 22px;
}
body .app-shell .main-content .pm-kpi em {
  margin-top: 6px;
  color: var(--pm-muted);
  font-weight: 600;
}
body .app-shell .main-content .pm-dashboard-overview,
body .app-shell .main-content .pm-overview-grid,
body .app-shell .main-content .pm-budget-grid,
body .app-shell .main-content .pm-resource-grid,
body .app-shell .main-content .pm-doc-grid,
body .app-shell .main-content .pm-kanban {
  gap: 16px;
  align-items: start;
}
body .app-shell .main-content .pm-kanban {
  width: 100%;
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(5, minmax(240px, 1fr));
  overflow-x: auto;
  padding-bottom: 4px;
}
body .app-shell .main-content .pm-kanban-col {
  min-width: 0;
}
body .app-shell .main-content .pm-card,
body .app-shell .main-content .pm-task-board,
body .app-shell .main-content .pm-task-card,
body .app-shell .main-content .pm-task-panel,
body .app-shell .main-content .pm-resource-grid article,
body .app-shell .main-content .pm-doc-grid article {
  border-radius: 8px;
}
body .app-shell .main-content .pm-card {
  border-color: var(--pm-border);
  box-shadow: none;
}
body .app-shell .main-content .pm-section-header,
body .app-shell .main-content .pm-section-bar {
  min-width: 0;
  margin-bottom: 12px;
}
body .app-shell .main-content .pm-section-header h2,
body .app-shell .main-content .pm-section-bar h2 {
  font-size: 16px;
  line-height: 1.2;
  font-weight: 650;
}
body .app-shell .main-content .pm-donut-wrap {
  grid-template-columns: minmax(150px, 200px) minmax(0, 1fr);
}
body .app-shell .main-content .pm-donut {
  width: min(200px, 100%);
  height: auto;
  aspect-ratio: 1;
}
body .app-shell .main-content .pm-line {
  min-height: 220px;
}
body .app-shell .main-content .pm-line svg {
  height: clamp(160px, 17vw, 206px);
}
body .app-shell .main-content .pm-table {
  min-width: 900px;
}
body .app-shell .main-content .pm-table th {
  height: 42px;
  padding: 11px 14px;
  color: var(--pm-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
}
body .app-shell .main-content .pm-table td {
  padding: 14px;
  font-size: 13px;
  line-height: 1.35;
}
body .app-shell .main-content .pm-table td strong {
  display: block;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body .app-shell .main-content .pm-table td small {
  display: block;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 3px;
}
body .app-shell .main-content .pm-table tbody tr:hover td {
  background: var(--pm-card-hover);
}
body .app-shell .main-content .pm-progress {
  width: min(140px, 100%);
}
body .app-shell .main-content .pm-empty {
  min-height: 180px;
  border: 1px dashed var(--pm-border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card-hover) 52%, transparent);
}
body .app-shell .main-content .pm-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
}
body .app-shell .main-content .pm-control,
body .app-shell .main-content .pm-primary,
body .app-shell .main-content .pm-select,
body .app-shell .main-content .pm-search,
body .app-shell .main-content .pm-field input,
body .app-shell .main-content .pm-field select,
body .app-shell .main-content .pm-field textarea {
  border-radius: 8px;
}
body .app-shell .main-content .pm-task-board-head,
body .app-shell .main-content .pm-task-board-row {
  min-width: 980px;
}
body .app-shell .main-content .pm-task-board-row {
  min-height: 58px;
}
body .app-shell .main-content .pm-task-board-head span,
body .app-shell .main-content .pm-task-board-row > * {
  padding: 9px 12px;
}
body .app-shell .main-content .pm-task-board-title strong {
  font-size: 13px;
  font-weight: 650;
}
body .app-shell .main-content .pm-pill {
  border-radius: 6px;
  font-weight: 650;
}
body .app-shell .main-content .pm-pill.tone-to-do {
  background: rgba(59, 130, 246, .14) !important;
  border-color: rgba(96, 165, 250, .42) !important;
  color: #93c5fd !important;
}
body .app-shell .main-content .pm-pill.tone-in-progress {
  background: rgba(245, 158, 11, .16) !important;
  border-color: rgba(251, 191, 36, .44) !important;
  color: #fbbf24 !important;
}
body .app-shell .main-content .pm-pill.tone-review {
  background: rgba(168, 85, 247, .16) !important;
  border-color: rgba(192, 132, 252, .44) !important;
  color: #d8b4fe !important;
}
body .app-shell .main-content .pm-pill.tone-on-hold,
body .app-shell .main-content .pm-pill.tone-blocked {
  background: rgba(239, 68, 68, .16) !important;
  border-color: rgba(248, 113, 113, .46) !important;
  color: #fca5a5 !important;
}
body .app-shell .main-content .pm-pill.tone-done,
body .app-shell .main-content .pm-pill.tone-completed {
  background: rgba(34, 197, 94, .16) !important;
  border-color: rgba(74, 222, 128, .44) !important;
  color: #86efac !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-to-do {
  background: #dbeafe !important;
  border-color: #93c5fd !important;
  color: #1d4ed8 !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-in-progress {
  background: #fef3c7 !important;
  border-color: #fcd34d !important;
  color: #b45309 !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-review {
  background: #f3e8ff !important;
  border-color: #c084fc !important;
  color: #7e22ce !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-on-hold,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-blocked {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-done,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-completed {
  background: #dcfce7 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}
body .app-shell .main-content .pm-icon-btn {
  border-radius: 8px;
}
@media (max-width: 920px) {
  body .app-shell .main-content .pm-tabs {
    gap: 22px;
  }
  body .app-shell .main-content .pm-kpi {
    min-height: 104px;
  }
  body .app-shell .main-content .pm-kanban {
    grid-template-columns: repeat(5, minmax(280px, 1fr));
  }
}
@media (max-width: 560px) {
  body .app-shell .main-content .pm-tab-panel {
    gap: 14px;
  }
  body .app-shell .main-content .pm-tabs {
    margin-left: -12px;
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
  }
  body .app-shell .main-content .pm-kanban {
    margin-right: -12px;
    padding-right: 12px;
    grid-template-columns: repeat(5, minmax(78vw, 1fr));
  }
}

body .app-shell .main-content .pm-page-tools:has(.pm-projects-primary) {
  display: flex;
  justify-content: flex-end;
}
body .app-shell .main-content .pm-projects-primary {
  min-width: 154px;
  height: 44px;
  justify-content: center;
  background: #fafafa !important;
  background-color: #fafafa !important;
  background-image: none !important;
  border-color: #fafafa !important;
  color: #050505 !important;
  filter: none !important;
  opacity: 1 !important;
}
html[data-theme='dark'] body .app-shell .main-content .pm-shell .pm-page-tools .pm-projects-primary.pm-projects-primary {
  background: #fafafa !important;
  background-color: #fafafa !important;
  background-image: none !important;
  border-color: #fafafa !important;
  color: #050505 !important;
  filter: none !important;
  opacity: 1 !important;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs {
  min-height: 50px;
  gap: 52px;
  align-items: flex-end;
  border-bottom: 1px solid var(--pm-border);
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  margin: 0 0 16px;
  padding: 0;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button {
  position: relative;
  min-height: 50px;
  padding: 0 0 15px;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--pm-muted) !important;
  font-size: 14px;
  font-weight: 500;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: transparent;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button.active,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:hover,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  font-weight: 700;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button.active::after,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"]::after {
  background: var(--pm-foreground);
}
.pm-detail {
  min-width: 0;
  display: grid;
  gap: 18px;
}
.pm-detail-crumbs {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-detail-crumbs button {
  border: 0;
  background: transparent !important;
  color: var(--pm-muted);
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.pm-detail-crumbs span {
  color: var(--pm-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pm-detail-hero-new {
  min-width: 0;
  display: grid;
  grid-template-columns: 198px minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
}
.pm-detail-hero-new .pm-project-thumb {
  width: 198px;
  height: 150px;
  border-radius: 8px;
}
.pm-detail-hero-copy {
  min-width: 0;
  display: grid;
  gap: 9px;
}
.pm-detail-hero-meta {
  display: flex;
  align-items: center;
  gap: 9px;
}
.pm-detail-hero-meta button,
.pm-detail-hero-actions button,
.pm-detail-panel-head button,
.pm-detail-team-list button {
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  color: var(--pm-foreground);
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.pm-detail-hero-meta button {
  width: 30px;
  min-height: 30px;
  padding: 0;
  border-radius: 999px;
}
.pm-detail-hero-copy h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(28px, 2.8vw, 36px);
  line-height: 1.05;
  letter-spacing: 0;
}
.pm-detail-hero-copy p,
.pm-detail-hero-copy > span {
  margin: 0;
  color: var(--pm-muted);
  font-size: 14px;
}
.pm-detail-hero-copy > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pm-detail-hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
}
.pm-detail-hero-actions button:first-child {
  width: 54px;
  min-height: 54px;
  padding: 0;
}
.pm-detail-dashboard,
.pm-detail-left {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-detail-stats {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.pm-detail-stat,
.pm-detail-panel {
  min-width: 0;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.014));
  color: var(--pm-foreground);
}
.pm-detail-stat {
  min-height: 146px;
  padding: 20px;
  display: grid;
  align-content: space-between;
  gap: 12px;
}
.pm-detail-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-detail-stat-head i {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.07);
  font-style: normal;
}
.pm-detail-stat strong {
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
}
.pm-detail-stat small {
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-detail-main-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 16px;
  align-items: start;
}
.pm-detail-panel {
  padding: 18px;
}
.pm-detail-panel-head {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.pm-detail-panel h3,
.pm-detail-panel-head h3 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
}
.pm-detail-panel-head button {
  border: 0;
  min-height: auto;
  padding: 0;
  background: transparent !important;
  color: #60a5fa;
}
.pm-detail-budget-content {
  display: grid;
  grid-template-columns: 220px minmax(230px, .72fr) minmax(300px, 1fr);
  gap: 34px;
  align-items: center;
}
.pm-detail-donut {
  width: 190px;
  height: 190px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.pm-detail-donut::after {
  content: "";
  position: absolute;
  inset: 34px;
  border-radius: 50%;
  background: var(--pm-background);
}
.pm-detail-donut div {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  text-align: center;
}
.pm-detail-donut strong {
  font-size: 20px;
}
.pm-detail-donut span,
.pm-detail-budget-legend span,
.pm-detail-budget-bar span,
.pm-detail-value span {
  color: var(--pm-muted);
}
.pm-detail-budget-legend {
  display: grid;
  gap: 18px;
}
.pm-detail-budget-legend p {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin: 0;
}
.pm-detail-budget-legend i {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}
.pm-detail-budget-legend strong {
  font-weight: 500;
  white-space: nowrap;
}
.pm-detail-budget-bars {
  display: grid;
  gap: 18px;
  border-left: 1px solid var(--pm-border);
  padding-left: 34px;
}
.pm-detail-budget-bars h4 {
  margin: 0 0 2px;
  font-size: 13px;
  color: var(--pm-foreground);
}
.pm-detail-budget-bar {
  display: grid;
  grid-template-columns: 110px minmax(120px, 1fr) auto;
  align-items: center;
  gap: 14px;
  font-size: 13px;
}
.pm-detail-budget-bar i {
  height: 11px;
  border-radius: 999px;
  background: rgba(255,255,255,.12);
  overflow: hidden;
}
.pm-detail-budget-bar b {
  display: block;
  height: 100%;
  border-radius: inherit;
}
.pm-detail-lower-grid {
  display: grid;
  grid-template-columns: minmax(240px, .78fr) minmax(320px, 1fr) minmax(260px, .78fr);
  gap: 16px;
}
.pm-detail-timeline-list,
.pm-detail-team-list,
.pm-detail-activity-list {
  display: grid;
  gap: 14px;
}
.pm-detail-timeline-list article {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}
.pm-detail-timeline-list article > i {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 2px solid #52525b;
  border-radius: 999px;
  background: var(--pm-card);
}
.pm-detail-timeline-list article.state-done > i {
  border-color: #3fcf54;
  background: #3fcf54;
}
.pm-detail-timeline-list article.state-in-progress > i {
  border-color: #3b82f6;
  background: #3b82f6;
}
.pm-detail-timeline-list strong,
.pm-detail-team-list strong,
.pm-detail-activity-list strong {
  display: block;
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.35;
}
.pm-detail-timeline-list span,
.pm-detail-team-list span,
.pm-detail-activity-list small {
  color: var(--pm-muted);
  font-size: 12px;
}
.pm-detail-timeline-list em {
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  color: var(--pm-muted);
  padding: 4px 9px;
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}
.pm-detail-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.pm-detail-photo-tile {
  position: relative;
  min-height: 112px;
  border: 1px solid var(--pm-border-soft);
  border-radius: 7px;
  overflow: hidden;
  background-color: var(--pm-background);
  background-size: cover;
  background-position: center;
}
.pm-detail-photo-tile::before,
.pm-detail-photo-tile::after {
  display: none;
}
.pm-detail-photos .pm-empty {
  min-height: 238px;
}
.pm-detail-team-list article,
.pm-detail-activity-list article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
}
.pm-detail-team-list button {
  width: 30px;
  min-height: 30px;
  padding: 0;
  border: 0;
  background: transparent !important;
  color: var(--pm-muted);
}
.pm-detail-right {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-detail-info-card,
.pm-detail-description-card {
  display: grid;
  gap: 12px;
}
.pm-detail-value {
  display: grid;
  grid-template-columns: minmax(112px, .72fr) minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  margin: 0;
  font-size: 13px;
}
.pm-detail-value strong {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pm-foreground);
  font-weight: 500;
  overflow-wrap: anywhere;
}
.pm-detail-dot-text i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #3fcf54;
}
.pm-detail-description-card p {
  margin: 0;
  color: var(--pm-muted);
  font-size: 13px;
  line-height: 1.5;
}
.pm-detail-description-card button {
  justify-self: start;
  border: 0;
  background: transparent !important;
  color: #60a5fa;
  padding: 0;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.pm-detail-activity-list article {
  grid-template-columns: 34px minmax(0, 1fr);
}
.pm-detail-activity-list article > span {
  width: 34px;
  height: 34px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: #3b82f6;
  color: #fff;
}
.pm-task-board-toolbar {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.pm-task-board-toolbar h2 {
  min-width: 0;
  margin: 0;
  color: var(--pm-foreground);
  font-size: 18px;
  line-height: 1.2;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.pm-task-board-toolbar p {
  margin: 4px 0 0;
  color: var(--pm-muted);
  font-size: 13px;
  line-height: 1.4;
}
.pm-task-board-toolbar-meta {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pm-task-board-add {
  min-height: 38px;
}
.pm-workload-member {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.pm-workload-member strong {
  color: var(--pm-foreground);
  font-weight: 700;
}
.pm-workload-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.pm-workload-cell b {
  min-width: 38px;
  color: var(--pm-foreground);
  font-size: 12px;
  font-weight: 700;
}
body .app-shell .main-content .pm-detail .pm-detail-stat,
body .app-shell .main-content .pm-detail .pm-detail-panel {
  background-color: var(--pm-card) !important;
}
body .app-shell .main-content .pm-detail .pm-detail-hero-meta button:hover,
body .app-shell .main-content .pm-detail .pm-detail-hero-actions button:hover,
body .app-shell .main-content .pm-detail .pm-detail-panel-head button:hover,
body .app-shell .main-content .pm-detail .pm-detail-team-list button:hover,
body .app-shell .main-content .pm-detail .pm-detail-description-card button:hover,
body .app-shell .main-content .pm-detail .pm-detail-crumbs button:hover {
  background: transparent !important;
  background-color: transparent !important;
}
.pm-project-directory {
  min-width: 0;
  display: grid;
  gap: 12px;
  background: transparent !important;
}
.pm-project-toolbar {
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.pm-project-toolbar > :not(.pm-project-view-switch) {
  display: none !important;
}
.pm-project-view-switch,
.pm-project-action {
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-project-view-switch {
  height: 40px;
  display: inline-grid;
  grid-template-columns: 38px 38px;
  gap: 4px;
  padding: 3px;
}
.pm-project-view-switch button,
.pm-project-pagination button,
.pm-project-action {
  display: grid;
  place-items: center;
  cursor: pointer;
  transform: none !important;
}
.pm-project-view-switch button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-muted);
}
.pm-project-view-switch button.active,
.pm-project-view-switch button:hover {
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
}
.pm-project-table-frame {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  border: 0;
  border-top: 1px solid var(--pm-border);
  border-bottom: 1px solid var(--pm-border);
  border-radius: 0;
  background: var(--pm-background);
}
.pm-project-table {
  width: 100%;
  min-width: 1430px;
  table-layout: fixed;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
}
.pm-project-table th:nth-child(1),
.pm-project-table td:nth-child(1) { width: 268px; }
.pm-project-table th:nth-child(2),
.pm-project-table td:nth-child(2) { width: 160px; }
.pm-project-table th:nth-child(3),
.pm-project-table td:nth-child(3) { width: 105px; }
.pm-project-table th:nth-child(4),
.pm-project-table td:nth-child(4) { width: 95px; }
.pm-project-table th:nth-child(5),
.pm-project-table td:nth-child(5) { width: 130px; }
.pm-project-table th:nth-child(6),
.pm-project-table td:nth-child(6) { width: 162px; }
.pm-project-table th:nth-child(7),
.pm-project-table td:nth-child(7),
.pm-project-table th:nth-child(8),
.pm-project-table td:nth-child(8) { width: 95px; }
.pm-project-table th:nth-child(9),
.pm-project-table td:nth-child(9) { width: 50px; }
.pm-project-table th:nth-child(10),
.pm-project-table td:nth-child(10) { width: 65px; }
.pm-project-table th:nth-child(11),
.pm-project-table td:nth-child(11) { width: 72px; }
.pm-project-table th,
.pm-project-table td {
  border-bottom: 1px solid var(--pm-border-soft);
  padding: 14px 10px !important;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}
.pm-project-table th {
  height: 48px;
  background: transparent !important;
  color: var(--pm-foreground) !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  white-space: nowrap;
}
.pm-project-table th button {
  border: 0 !important;
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  color: inherit !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 !important;
  font: inherit;
  cursor: pointer;
  transform: none !important;
  box-shadow: none !important;
}
.pm-project-table th button:hover,
.pm-project-table th button:focus-visible {
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: inherit !important;
}
.pm-project-table td {
  background: transparent !important;
  color: var(--pm-foreground) !important;
}
.pm-project-table td:nth-child(7),
.pm-project-table td:nth-child(8),
.pm-project-table td:nth-child(9),
.pm-project-table td:nth-child(10),
.pm-project-table td:nth-child(11) {
  white-space: nowrap;
}
.pm-project-table th:nth-child(6),
.pm-project-table td:nth-child(6) {
  padding-left: 14px !important;
}
.pm-project-table tbody tr:last-child td {
  border-bottom: 0;
}
.pm-project-table tbody tr:hover td {
  background: var(--pm-background);
}
body .app-shell .main-content .pm-project-table {
  border-collapse: collapse !important;
  border-spacing: 0 !important;
}
body .app-shell .main-content .pm-project-table thead th,
body .app-shell .main-content .pm-project-table thead td {
  background: transparent !important;
  color: var(--pm-foreground) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}
body .app-shell .main-content .pm-project-table th,
body .app-shell .main-content .pm-project-table td {
  padding: 14px 10px !important;
  line-height: 1.35 !important;
}
body .app-shell .main-content .pm-project-table tbody tr {
  border-radius: 0 !important;
  box-shadow: none !important;
}
body .app-shell .main-content .pm-project-table tbody td:first-child,
body .app-shell .main-content .pm-project-table tbody td:last-child {
  border-radius: 0 !important;
}
body .app-shell .main-content .pm-project-table tbody tr:hover td {
  background: var(--pm-background) !important;
}
.pm-project-name-cell {
  min-width: 0;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
.pm-project-title-block,
.pm-project-grid-head span,
.pm-project-budget-cell {
  min-width: 0;
  display: grid;
  gap: 4px;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
.pm-project-name-cell button,
.pm-project-grid-head button:first-child {
  min-width: 0;
  border: 0 !important;
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  color: var(--pm-foreground) !important;
  padding: 0 !important;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transform: none !important;
  box-shadow: none !important;
  filter: none !important;
}
.pm-project-name-cell button:hover,
.pm-project-name-cell button:focus-visible,
.pm-project-grid-head button:first-child:hover,
.pm-project-grid-head button:first-child:focus-visible {
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--pm-foreground) !important;
  outline: none;
}
.pm-project-name-cell small,
.pm-project-grid-head small,
.pm-project-budget-cell small,
.pm-project-grid-meta small,
.pm-project-overview small {
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 500;
}
.pm-project-thumb {
  position: relative;
  width: 104px;
  height: 68px;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  display: block;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,.22), transparent 42%),
    linear-gradient(135deg, #64748b, #18181b);
}
.pm-project-thumb-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background-size: cover;
  background-position: center;
}
.pm-project-thumb:has(.pm-project-thumb-image)::before,
.pm-project-thumb:has(.pm-project-thumb-image)::after {
  display: none;
}
.pm-project-thumb::before,
.pm-project-thumb::after,
.pm-project-thumb i,
.pm-project-thumb b,
.pm-project-thumb em {
  position: absolute;
  content: "";
  display: block;
}
.pm-project-thumb::before {
  left: 11px;
  right: 11px;
  bottom: 10px;
  height: 32px;
  border: 2px solid rgba(255,255,255,.72);
  border-bottom-width: 6px;
}
.pm-project-thumb::after {
  left: 25px;
  bottom: 10px;
  width: 3px;
  height: 45px;
  background: rgba(255,255,255,.8);
  box-shadow: 19px 0 rgba(255,255,255,.45), 38px 0 rgba(255,255,255,.7);
}
.pm-project-thumb i {
  left: 8px;
  right: 8px;
  bottom: 40px;
  height: 2px;
  background: rgba(255,255,255,.72);
  transform: skewY(-12deg);
}
.pm-project-thumb b {
  left: 0;
  right: 0;
  bottom: 0;
  height: 12px;
  background: rgba(0,0,0,.28);
}
.pm-project-thumb em {
  right: 11px;
  top: 10px;
  width: 32px;
  height: 20px;
  border: 2px solid rgba(255,255,255,.58);
  transform: skewX(-22deg);
}
.pm-project-thumb.variant-1 { background: linear-gradient(180deg, rgba(255,255,255,.20), transparent 44%), linear-gradient(135deg, #475569, #0f172a); }
.pm-project-thumb.variant-2 { background: linear-gradient(180deg, rgba(255,255,255,.18), transparent 44%), linear-gradient(135deg, #71717a, #1f2937); }
.pm-project-thumb.variant-3 { background: linear-gradient(180deg, rgba(255,255,255,.22), transparent 44%), linear-gradient(135deg, #94a3b8, #27272a); }
.pm-project-thumb.variant-4 { background: linear-gradient(180deg, rgba(255,255,255,.18), transparent 44%), linear-gradient(135deg, #52525b, #111827); }
.pm-project-owner,
.pm-project-progress-cell {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.pm-project-owner {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pm-project-owner .pm-avatar {
  flex: 0 0 auto;
  margin-right: 0;
}
.pm-project-progress-cell .pm-progress {
  width: 82px !important;
  height: 7px;
}
.pm-project-progress-cell strong {
  font-size: 13px;
  font-weight: 600;
}
.pm-project-budget-cell strong {
  font-size: 14px;
  font-weight: 700;
}
.pm-project-badge {
  min-height: 28px;
  border: 1px solid color-mix(in srgb, var(--badge-color, #94a3b8) 28%, var(--pm-border));
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  background: color-mix(in srgb, var(--badge-color, #94a3b8) 8%, var(--pm-background));
  color: var(--pm-foreground);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  font-family: inherit;
}
.pm-project-badge-menu-wrap {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}
.pm-project-badge-menu-wrap button.pm-project-badge {
  cursor: pointer;
}
.pm-project-badge-menu-wrap .pm-project-badge svg {
  margin-left: 2px;
  color: #64748b;
}
.pm-project-badge.is-editable {
  cursor: pointer;
}
.pm-project-badge i {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  display: block;
  border-radius: 999px;
  background: currentColor;
  color: var(--badge-color, currentColor);
}
body .app-shell .main-content .pm-project-badge select,
.pm-project-badge select {
  appearance: none;
  width: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  color: inherit !important;
  box-shadow: none !important;
  padding: 0 !important;
  font: inherit;
  font-weight: inherit;
  line-height: 1.2;
  cursor: pointer;
}
.pm-project-badge select option {
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-project-badge-menu {
  position: fixed;
  z-index: 1000;
  display: grid;
  gap: 5px;
  padding: 6px;
  border: 1px solid var(--pm-border);
  border-radius: 9px;
  background: var(--pm-card);
  box-shadow: 0 18px 38px rgb(15 23 42 / .22);
}
.pm-project-badge-menu-option {
  min-height: 28px;
  width: 100%;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  padding: 0 10px;
  background: var(--pm-background);
  color: var(--pm-foreground);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.pm-project-badge-menu-option:hover,
.pm-project-badge-menu-option.is-selected {
  border-color: color-mix(in srgb, var(--badge-color, #94a3b8) 45%, var(--pm-border));
  background: color-mix(in srgb, var(--badge-color, #94a3b8) 12%, var(--pm-card));
}
.pm-project-badge-menu-option i {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  display: block;
  border-radius: 999px;
  background: currentColor;
  color: var(--badge-color, currentColor);
}
.pm-project-badge.is-editable:focus-within {
  border-color: rgba(255,255,255,.42);
  box-shadow: 0 0 0 3px var(--pm-ring);
}
.pm-project-badge.status-in-progress,
.pm-project-badge.status-active,
.pm-project-badge-menu-option.status-in-progress,
.pm-project-badge-menu-option.status-active { --badge-color: #2f80ed; }
.pm-project-badge.status-completed,
.pm-project-badge.status-on-track,
.pm-project-badge-menu-option.status-completed { --badge-color: #22c55e; }
.pm-project-badge.status-planning,
.pm-project-badge-menu-option.status-planning { --badge-color: #a855f7; }
.pm-project-badge.status-on-hold,
.pm-project-badge.priority-medium,
.pm-project-badge-menu-option.status-on-hold,
.pm-project-badge-menu-option.priority-medium { --badge-color: #f59e0b; }
.pm-project-badge.status-cancelled,
.pm-project-badge.priority-critical,
.pm-project-badge.priority-high,
.pm-project-badge-menu-option.status-cancelled,
.pm-project-badge-menu-option.priority-critical,
.pm-project-badge-menu-option.priority-high { --badge-color: #ef4444; }
.pm-project-badge.priority-low,
.pm-project-badge-menu-option.priority-low { --badge-color: #94a3b8; }
.pm-project-action {
  width: 34px;
  height: 34px;
  margin-left: auto;
}
.pm-project-action:hover {
  background: var(--pm-card-hover);
}
.pm-project-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  background: transparent !important;
}
.pm-project-action-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  width: 150px;
  display: grid;
  gap: 3px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 5px;
  box-shadow: 0 16px 34px rgb(0 0 0 / .38);
}
.pm-project-actions.menu-up .pm-project-action-menu {
  top: auto;
  bottom: calc(100% + 6px);
}
.pm-project-action-menu button {
  width: 100%;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-foreground);
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transform: none !important;
  box-shadow: none !important;
}
.pm-project-action-menu button:hover,
.pm-project-action-menu button:focus-visible {
  background: var(--pm-background);
  outline: none;
}
.pm-project-action-menu button svg {
  flex: 0 0 auto;
}
.pm-project-action-menu button.danger {
  color: #ffb4b4;
}
.pm-project-action-menu button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.pm-project-pagination {
  min-height: 44px;
  border: 0;
  border-top: 0;
  border-radius: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-project-pagination > div {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pm-project-pagination button,
.pm-project-pagination strong {
  width: 34px;
  height: 34px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-project-pagination button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.pm-project-pagination strong {
  display: grid;
  place-items: center;
  background: var(--pm-foreground);
  color: var(--pm-background);
}
html[data-theme='dark'] body .app-shell .main-content .pm-project-directory,
html[data-theme='dark'] body .app-shell .main-content .pm-project-toolbar,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table-frame,
html[data-theme='dark'] body .app-shell .main-content .pm-project-pagination,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table th,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table td,
html[data-theme='dark'] body .app-shell .main-content .pm-project-directory .pm-empty {
  background: var(--pm-background) !important;
  background-color: var(--pm-background) !important;
  background-image: none !important;
}
html[data-theme='dark'] body .app-shell .main-content .pm-project-view-switch,
html[data-theme='dark'] body .app-shell .main-content .pm-project-action,
html[data-theme='dark'] body .app-shell .main-content .pm-project-pagination button,
html[data-theme='dark'] body .app-shell .main-content .pm-project-directory .pm-empty-icon {
  background: var(--pm-background) !important;
  background-color: var(--pm-background) !important;
  background-image: none !important;
}
html[data-theme='dark'] body .app-shell .main-content .pm-project-view-switch button.active,
html[data-theme='dark'] body .app-shell .main-content .pm-project-view-switch button:hover,
html[data-theme='dark'] body .app-shell .main-content .pm-project-action:hover,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table tbody tr:hover td {
  background: var(--pm-background) !important;
  background-color: var(--pm-background) !important;
  background-image: none !important;
}
body .app-shell .main-content .pm-project-table .pm-project-name-cell,
body .app-shell .main-content .pm-project-table .pm-project-title-block,
body .app-shell .main-content .pm-project-table .pm-project-title-block::before,
body .app-shell .main-content .pm-project-table .pm-project-title-block::after,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::before,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::after,
body .app-shell .main-content .pm-project-table tbody tr:hover .pm-project-name-cell,
body .app-shell .main-content .pm-project-table tbody tr:hover .pm-project-title-block,
body .app-shell .main-content .pm-project-table tbody tr:hover .pm-project-name-cell button {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  filter: none !important;
}
body .app-shell .main-content .pm-project-table .pm-project-title-block::before,
body .app-shell .main-content .pm-project-table .pm-project-title-block::after,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::before,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::after {
  content: none !important;
}
body .app-shell .main-content .pm-project-table .pm-project-name-cell button {
  width: auto !important;
  justify-self: start !important;
}
.pm-project-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 14px;
}
.pm-project-grid-card {
  min-width: 0;
  display: grid;
  gap: 13px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 14px;
}
.pm-project-grid-card .pm-project-thumb {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 8;
}
.pm-project-grid-head {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}
.pm-project-grid-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pm-project-grid-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pm-project-grid-meta span,
.pm-project-overview article {
  min-width: 0;
  display: grid;
  gap: 5px;
  border: 1px solid var(--pm-border-soft);
  border-radius: 8px;
  background: var(--pm-background);
  padding: 10px;
}
.pm-project-grid-meta strong,
.pm-project-overview strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.25;
}
.pm-project-overview {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}
.pm-project-overview article {
  min-height: 88px;
  align-content: center;
  background: var(--pm-card);
  border-color: var(--pm-border);
}
.pm-project-overview article strong {
  font-size: 22px;
}
.pm-project-overview-list {
  grid-column: 1 / -1;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 18px;
}
@media (max-width: 1100px) {
  .pm-project-overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 700px) {
  body .app-shell .main-content .pm-page-tools:has(.pm-projects-primary) {
    justify-content: stretch;
  }
  body .app-shell .main-content .pm-projects-primary {
    width: 100%;
  }
  .pm-project-view-switch {
    width: 100%;
  }
  .pm-project-view-switch {
    grid-template-columns: 1fr 1fr;
  }
  .pm-project-pagination {
    min-height: 72px;
    align-items: flex-start;
    flex-direction: column;
    padding: 12px;
  }
  .pm-project-overview {
    grid-template-columns: 1fr;
  }
}

body .app-shell .main-content:has(> .pm-shell) {
  padding: 0 !important;
  background: #f3f4f6 !important;
}
body .app-shell .main-content .pm-shell {
  --pm-dashboard-inline-space: clamp(48px, 10.5vw, 176px);
  --pm-dashboard-max-width: 1640px;
  width: 100% !important;
  max-width: none !important;
  min-height: calc(100vh - 48px);
  margin: 0 !important;
  padding: 0 !important;
  background: #f3f4f6 !important;
}
body .app-shell .main-content .pm-workspace {
  width: 100%;
  max-width: none !important;
  margin: 0 !important;
  gap: 0 !important;
  background: #f3f4f6 !important;
}
body .app-shell .main-content .pm-dashboard-hero {
  background: linear-gradient(180deg, #e5f68c 0%, #e5f68c 46%, #f3f4f6 100%);
  color: #0f172a;
  margin: 0;
  padding: 34px 0 64px;
}
body .app-shell .main-content .pm-dashboard-hero.pm-hero-tab-projects,
body .app-shell .main-content .pm-dashboard-hero.pm-hero-tab-overview {
  background: linear-gradient(180deg, #e5f68c 0%, #e5f68c 46%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.pm-hero-tab-archived {
  background: linear-gradient(180deg, #e8e4ff 0%, #e8e4ff 46%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.pm-hero-tab-tasks,
body .app-shell .main-content .pm-dashboard-hero.pm-hero-tab-kanban {
  background: linear-gradient(180deg, #d7e8ff 0%, #d7e8ff 46%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.pm-hero-tab-budget {
  background: linear-gradient(180deg, #f7e7b5 0%, #f7e7b5 46%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.pm-hero-tab-documents {
  background: linear-gradient(180deg, #d5f6e5 0%, #d5f6e5 46%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-inner,
body .app-shell .main-content .pm-dashboard-content {
  width: min(var(--pm-dashboard-max-width), calc(100% - var(--pm-dashboard-inline-space)));
  margin-inline: auto;
}
body .app-shell .main-content .pm-dashboard-inner {
  position: relative;
  display: grid;
  gap: 18px;
}
body .app-shell .main-content .pm-dashboard-content {
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 0 0 32px;
}
body .app-shell .main-content .pm-dashboard-content-flat {
  padding-top: 24px;
}
body .app-shell .main-content .pm-dashboard-hero .pm-page-top {
  grid-template-columns: minmax(260px, .72fr) minmax(420px, 1fr);
  margin: 0;
}
body .app-shell .main-content .pm-dashboard-hero .pm-page-title h1,
body .app-shell .main-content .pm-dashboard-hero .pm-page-title p {
  color: #0f172a !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-page-title p {
  opacity: .94;
}
body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-control,
body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-primary {
  min-height: 40px;
  height: 40px;
  border-radius: 6px;
  box-shadow: none !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-control {
  background: rgba(255,255,255,.76) !important;
  border-color: rgba(255,255,255,.92) !important;
  color: #0f172a !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-primary,
body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-projects-primary {
  background: #22c55e !important;
  border-color: #22c55e !important;
  color: #ffffff !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-control:hover,
body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-primary:hover {
  background: #ffffff !important;
  border-color: #ffffff !important;
  color: #0f172a !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-tabs {
  margin: 0 0 0 !important;
  border-bottom-color: rgba(15,23,42,.28) !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-shell .pm-tabs.pm-tabs,
body .app-shell .main-content .pm-dashboard-hero .pm-tabs.pm-tabs {
  gap: 52px;
}
body .app-shell .main-content .pm-dashboard-hero .pm-tabs button {
  color: #0f172a !important;
  background: transparent !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-tabs button.active,
body .app-shell .main-content .pm-dashboard-hero .pm-tabs button[aria-selected="true"],
body .app-shell .main-content .pm-dashboard-hero .pm-tabs button:hover,
body .app-shell .main-content .pm-dashboard-hero .pm-tabs button:focus-visible {
  color: #0f172a !important;
  border-bottom-color: #0f172a !important;
  background: rgba(255,255,255,.72) !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpis {
  grid-template-columns: repeat(5, minmax(178px, 1fr)) !important;
  gap: 16px;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi {
  position: relative;
  overflow: hidden;
  min-height: 112px;
  padding: 15px 16px;
  gap: 10px;
  border: 1px solid rgba(255,255,255,.92) !important;
  background:
    linear-gradient(135deg, rgba(255,255,255,.94), rgba(255,255,255,.62) 48%, rgba(255,255,255,.86)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,1),
    inset 0 -1px 0 rgba(255,255,255,.46),
    0 18px 42px rgba(15,23,42,.08) !important;
  backdrop-filter: blur(20px) saturate(190%);
  -webkit-backdrop-filter: blur(20px) saturate(190%);
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(115deg, rgba(255,255,255,.92) 0%, rgba(255,255,255,.28) 34%, transparent 60%),
    radial-gradient(circle at 12% 0%, rgba(255,255,255,.78), transparent 38%);
  opacity: .88;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi > * {
  position: relative;
  z-index: 1;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi small,
body .app-shell .main-content .pm-dashboard-hero .pm-kpi strong,
body .app-shell .main-content .pm-dashboard-hero .pm-kpi em {
  color: #0f172a !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi small,
body .app-shell .main-content .pm-dashboard-hero .pm-kpi em {
  overflow: hidden;
  text-overflow: ellipsis;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi small {
  font-size: 12px;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi strong {
  font-size: 22px;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi em {
  opacity: .72;
}
body .app-shell .main-content .pm-dashboard-hero .pm-kpi > span {
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,.62) !important;
  border-color: rgba(255,255,255,.92) !important;
  color: #0f172a !important;
}
body .app-shell .main-content .pm-dashboard-hero .pm-filter-panel,
body .app-shell .main-content .pm-dashboard-hero .pm-alert-panel {
  top: 52px;
}
body .app-shell .main-content .pm-dashboard-content .pm-tab-panel {
  margin: 0;
}
body .app-shell .main-content .pm-dashboard-overview .pm-donut-wrap {
  grid-template-columns: minmax(130px, 170px) minmax(120px, 1fr);
  gap: 14px;
}
body .app-shell .main-content .pm-dashboard-overview .pm-donut {
  width: min(170px, 100%);
}
body .app-shell .main-content .pm-dashboard-overview .pm-donut span {
  width: 96px;
  height: 96px;
}
@media (max-width: 1440px) {
  body .app-shell .main-content .pm-dashboard-hero .pm-page-top {
    grid-template-columns: 1fr;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-page-tools {
    justify-content: start;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-kpis {
    grid-template-columns: repeat(5, minmax(150px, 1fr)) !important;
  }
}
@media (max-width: 920px) {
  body .app-shell .main-content .pm-shell {
    --pm-dashboard-inline-space: 32px;
  }
  body .app-shell .main-content .pm-dashboard-hero {
    padding: 26px 0 54px;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-tabs.pm-tabs {
    gap: 28px;
  }
}
@media (max-width: 560px) {
  body .app-shell .main-content .pm-shell {
    --pm-dashboard-inline-space: 24px;
  }
  body .app-shell .main-content .pm-dashboard-hero {
    padding: 22px 0 46px;
  }
  body .app-shell .main-content .pm-dashboard-inner {
    gap: 14px;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-page-tools {
    grid-template-columns: 1fr;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-control,
  body .app-shell .main-content .pm-dashboard-hero .pm-page-tools .pm-primary {
    width: 100%;
    justify-content: center;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-new-project-button {
    position: static;
    right: auto;
    bottom: auto;
    z-index: auto;
    width: 100%;
    min-width: 0;
    min-height: 40px;
    border-radius: 6px;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-kpis {
    margin-left: -12px;
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
  }
  body .app-shell .main-content .pm-dashboard-hero .pm-kpi {
    min-width: min(280px, 82vw);
  }
  body .app-shell .main-content .pm-dashboard-content-flat {
    padding-top: 16px;
  }
  body .app-shell .main-content .pm-donut-wrap {
    grid-template-columns: 1fr !important;
    justify-items: center;
    gap: 14px;
  }
  body .app-shell .main-content .pm-donut-wrap .pm-legend {
    width: 100%;
  }
  body .app-shell .main-content .pm-donut-wrap .pm-legend p {
    grid-template-columns: 10px minmax(0, 1fr);
    row-gap: 3px;
  }
  body .app-shell .main-content .pm-donut-wrap .pm-legend p strong {
    grid-column: 2;
    justify-self: start;
  }
}

body .app-shell .main-content .pm-dashboard-hero.is-compact {
  padding-bottom: 30px;
  background: linear-gradient(180deg, #e5f68c 0%, #e5f68c 70%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.is-compact.pm-hero-tab-archived {
  background: linear-gradient(180deg, #e8e4ff 0%, #e8e4ff 70%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.is-compact.pm-hero-tab-tasks,
body .app-shell .main-content .pm-dashboard-hero.is-compact.pm-hero-tab-kanban {
  background: linear-gradient(180deg, #d7e8ff 0%, #d7e8ff 70%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.is-compact.pm-hero-tab-budget {
  background: linear-gradient(180deg, #f7e7b5 0%, #f7e7b5 70%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.is-compact.pm-hero-tab-documents {
  background: linear-gradient(180deg, #d5f6e5 0%, #d5f6e5 70%, #f3f4f6 100%);
}
body .app-shell .main-content .pm-dashboard-hero.is-compact .pm-dashboard-inner {
  gap: 16px;
}
body .app-shell .main-content .pm-dashboard-hero.is-compact + .pm-dashboard-content {
  margin-top: -8px;
}
body .app-shell .main-content .pm-project-directory {
  overflow: hidden;
  gap: 0;
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  background: #ffffff !important;
  box-shadow: 0 1px 2px rgba(15,23,42,.04);
}
body .app-shell .main-content .pm-project-toolbar {
  min-height: 54px;
  justify-content: space-between;
  gap: 14px;
  padding: 0 14px !important;
  border-bottom: 1px solid #e5e7eb !important;
  background: #ffffff !important;
}
body .app-shell .main-content .pm-project-toolbar > :not(.pm-project-view-switch) {
  display: grid !important;
}
body .app-shell .main-content .pm-project-toolbar-copy {
  min-width: 0;
  gap: 2px;
}
body .app-shell .main-content .pm-project-toolbar-copy strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body .app-shell .main-content .pm-project-toolbar-copy small {
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body .app-shell .main-content .pm-project-view-switch {
  height: 34px;
  grid-template-columns: 32px 32px;
  gap: 2px;
  padding: 2px;
  border-color: #d8dee7;
  border-radius: 7px;
  background: #f8fafc;
}
body .app-shell .main-content .pm-project-view-switch button {
  border-radius: 5px;
}
body .app-shell .main-content .pm-project-view-switch button.active,
body .app-shell .main-content .pm-project-view-switch button:hover {
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15,23,42,.08);
}
body .app-shell .main-content .pm-project-table-frame {
  border: 0;
  border-radius: 0;
  background: #ffffff;
}
body .app-shell .main-content .pm-project-table {
  min-width: 1320px;
}
body .app-shell .main-content .pm-project-table th:nth-child(1),
body .app-shell .main-content .pm-project-table td:nth-child(1) { width: 258px; }
body .app-shell .main-content .pm-project-table th:nth-child(2),
body .app-shell .main-content .pm-project-table td:nth-child(2) { width: 150px; }
body .app-shell .main-content .pm-project-table th:nth-child(5),
body .app-shell .main-content .pm-project-table td:nth-child(5) { width: 120px; }
body .app-shell .main-content .pm-project-table th:nth-child(6),
body .app-shell .main-content .pm-project-table td:nth-child(6) { width: 152px; }
body .app-shell .main-content .pm-project-table th,
body .app-shell .main-content .pm-project-table td {
  padding: 12px 10px !important;
}
body .app-shell .main-content .pm-project-table thead th,
body .app-shell .main-content .pm-project-table thead td {
  height: 44px;
  background: #f8fafc !important;
  color: #475569 !important;
  font-size: 12px !important;
}
body .app-shell .main-content .pm-project-table td {
  background: #ffffff !important;
}
body .app-shell .main-content .pm-project-table tbody tr:hover td {
  background: #f8fafc !important;
}
body .app-shell .main-content .pm-project-card-grid {
  padding: 14px;
  background: #ffffff;
}
body .app-shell .main-content .pm-project-grid-card {
  border-color: #dbe2ea;
  background: #ffffff !important;
  box-shadow: 0 1px 2px rgba(15,23,42,.04);
}
body .app-shell .main-content .pm-project-directory > .pm-empty {
  margin: 14px;
  border-color: #dbe2ea;
  background: #ffffff !important;
}
body .app-shell .main-content .pm-project-name-cell {
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 12px;
}
body .app-shell .main-content .pm-project-thumb {
  width: 78px;
  height: 52px;
  border-color: #d8dee7;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.32), rgba(255,255,255,0) 46%),
    linear-gradient(135deg, #94a3b8, #334155);
}
body .app-shell .main-content .pm-project-thumb.variant-1 { background: linear-gradient(180deg, rgba(255,255,255,.30), rgba(255,255,255,0) 46%), linear-gradient(135deg, #7dd3fc, #334155); }
body .app-shell .main-content .pm-project-thumb.variant-2 { background: linear-gradient(180deg, rgba(255,255,255,.30), rgba(255,255,255,0) 46%), linear-gradient(135deg, #86efac, #365314); }
body .app-shell .main-content .pm-project-thumb.variant-3 { background: linear-gradient(180deg, rgba(255,255,255,.32), rgba(255,255,255,0) 46%), linear-gradient(135deg, #fcd34d, #7c2d12); }
body .app-shell .main-content .pm-project-thumb.variant-4 { background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0) 46%), linear-gradient(135deg, #c4b5fd, #3730a3); }
body .app-shell .main-content .pm-project-thumb::before {
  left: 9px;
  right: 9px;
  bottom: 8px;
  height: 24px;
  border-width: 2px;
  border-bottom-width: 5px;
}
body .app-shell .main-content .pm-project-thumb::after {
  left: 20px;
  bottom: 8px;
  width: 2px;
  height: 35px;
  box-shadow: 15px 0 rgba(255,255,255,.45), 30px 0 rgba(255,255,255,.68);
}
body .app-shell .main-content .pm-project-thumb i {
  left: 7px;
  right: 7px;
  bottom: 31px;
}
body .app-shell .main-content .pm-project-thumb b {
  height: 9px;
}
body .app-shell .main-content .pm-project-thumb em {
  right: 8px;
  top: 8px;
  width: 25px;
  height: 16px;
}
body .app-shell .main-content .pm-project-badge {
  min-height: 27px;
  border-radius: 8px;
  padding-inline: 9px;
}
body .app-shell .main-content .pm-project-progress-cell .pm-progress {
  width: 78px !important;
}
body .app-shell .main-content .pm-project-action {
  width: 34px;
  height: 34px;
  border-color: #d8dee7;
  background: #ffffff;
}
body .app-shell .main-content .pm-project-pagination {
  min-height: 54px;
  padding: 0 14px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}
body .app-shell .main-content .pm-project-pagination button {
  width: 34px;
  height: 34px;
}
@media (max-width: 920px) {
  body .app-shell .main-content .pm-dashboard-hero.is-compact {
    padding-bottom: 28px;
  }
  body .app-shell .main-content .pm-dashboard-hero.is-compact + .pm-dashboard-content {
    margin-top: -2px;
  }
}
@media (max-width: 560px) {
  body .app-shell .main-content .pm-project-toolbar {
    min-height: 58px;
  }
  body .app-shell .main-content .pm-project-toolbar-copy {
    max-width: calc(100% - 82px);
  }
}
`
