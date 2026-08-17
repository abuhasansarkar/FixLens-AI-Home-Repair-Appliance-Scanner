# FixLens design reference audit

This inventory is the implementation gate for the nine supplied reference sheets. Screen numbers follow the labels embedded in each sheet.

| Sheet | Screen contracts |
|---|---|
| `design/1.png` | Welcome; Onboarding Scan; Onboarding Understand; Onboarding Repair |
| `design/2.png` | Onboarding Safety; Repair Interests; DIY Experience; Authentication |
| `design/3.png` | Home Dashboard; Camera Scanner; Diagnosis Result; Paywall |
| `design/4.png` | Photo Review; AI Analyzing; More Information; AI Question |
| `design/5.png` | Safe DIY Result; Professional Required; Repair Overview; Repair Step |
| `design/6.png` | Repair Progress; AI Assistant; Tools & Parts; Repair Completion |
| `design/7.png` | Repair Success; Repairs; Repair Detail; My Home |
| `design/8.png` | Add Appliance; Appliance Detected; Appliance Profile; Maintenance |
| `design/9.png` | Repair vs Replace; Free Limit Reached; AI Usage; Profile |

## Extracted visual tokens

- Canvas: warm off-white `#FBFAF8`; surface: white `#FFFFFF`; primary text: `#111318`; secondary text: `#657083`; border: `#E3E6EA`.
- Primary action: vivid blue `#075FFF`; safe: green `#159447`; caution: amber `#F4A51C`; advanced: orange `#E87816`; professional/danger: red `#E93434`.
- Spacing follows a 4-point rhythm. Primary controls are at least 54 points high. Cards use 18-point radii; image heroes use 28-point radii.
- Typography uses the native system family with compact, heavy headings and regular supporting copy. Text must wrap at large accessibility sizes.
- Icons are minimal line icons in controls; reference-specific photographic/3D assets are not replaced silently. Where the supplied sheets contain only a composite, the implementation records a discrepancy rather than claiming an exact extracted asset.
- Motion is limited to camera/analyzing progress and success feedback. Reduced Motion uses static status changes.

## Known reference discrepancies

- The supplied files are four-screen composites, not layered source files. Individual washer, tool, appliance, and 3D onboarding artwork cannot be losslessly extracted.
- The reusable washer photograph is a generated, logo-free substitute. Tool and appliance thumbnails require approved standalone assets before store release.
- iOS framing and Dynamic Island are presentation context, not application UI. Android preserves hierarchy while using native safe areas and back behavior.

## Implementation review — 2026-08-17

All 36 screen references across the nine sheets were compared against their implemented routes and shared components. The review corrected the highest-impact hierarchy and consistency issues:

- Centered-brand stack headers no longer compete with flex spacers on review, repair-progress, and add-appliance screens.
- Feature onboarding now uses the connected three-step progress treatment from the references; Safety retains the separate-dot treatment.
- Home diagnosis statistics, diagnosis metrics, repair guide metrics, and repair-success metrics use the compact three-column card hierarchy shown in the sheets.
- Diagnosis content order now places the issue and likely causes before time, difficulty, and cost.
- Repair steps use a large accessible completion checkbox instead of a secondary text button.
- Repair-success and feature-onboarding layouts scroll at large text sizes and on short devices.
- Cards use a subtle shared elevation treatment, dark-mode fields use readable semantic text colors, and onboarding safety/experience surfaces have dark variants.
- The Pro paywall now exposes all V1 benefits, explicit plan radio selection, store-localized prices, restore/manage actions, and legal links.
- Repair history only uses the approved washer substitute for washer-related records; other categories use a neutral category tile instead of misleading artwork.

| Sheet | Code review status | Remaining visual approval |
|---|---|---|
| `1.png` | Welcome and three feature-onboarding screens aligned | Standalone onboarding artwork |
| `2.png` | Safety, interests, experience, and auth hierarchy aligned | Device screenshot comparison |
| `3.png` | Home metrics, camera flow, result hierarchy, and paywall aligned | Camera/device framing |
| `4.png` | Review, analyzing, evidence, and clarification states implemented | Annotated standalone artwork |
| `5.png` | Safe/pro result, overview metrics, and step completion aligned | Repair-step photography |
| `6.png` | Progress, assistant, tools, and completion states implemented | Tool/part photography |
| `7.png` | Success summary, repair history, detail, and home implemented | Non-washer thumbnails |
| `8.png` | Appliance add/detect/profile/maintenance flow implemented | Appliance photography |
| `9.png` | Repair-vs-replace, limit, usage, and profile implemented | Device screenshot comparison |

“Aligned” here means the route, hierarchy, interaction, spacing/token use, and state coverage were reviewed in code. It does not claim pixel-perfect approval until the rendered-device checks below are completed.

## Approval checklist

- [x] All nine sheets inventoried.
- [x] Semantic light tokens documented and configured.
- [ ] Dark theme reviewed against every screen.
- [ ] Component gallery reviewed at normal and accessibility text sizes.
- [ ] Rendered iOS and Android screenshots approved beside references.
- [ ] Replacement artwork approved for all composite-only assets.
