# Lifestyle Migration · research website and paper

This static site contains ten pages: 01 Overview; 02 Research Blog; 03 Lifestyle Patterns; 04 Compare Your Day; 05 Lifestyle Profiles; 06 Move for a New Lifestyle; 07 Lifestyle Migration; A1 Data & Models; A2 Predictive Validation; 10 Copyright.

## Preview locally

Extract the whole package. Double-click `Preview_Lifestyle.command` on macOS, or run `python3 preview_server.py` from the site folder. Python 3 is required for the optional server; direct HTML opening also supports the tools offline. Keep the preview terminal open. The Mac GUI launcher has not been exercised on this Linux host.

## Upload to GitHub Pages

Upload the **contents** of this site folder to the root of your repository (or to its configured Pages folder), keeping all folders and `.nojekyll`. `index.html` should be at the selected Pages root. In repository Settings → Pages, choose the branch/folder containing the files. No Node, npm, build pipeline or server-side service is needed. All asset links are relative, so a project subpath works. Do not upload the outer delivery folder as though it were the site root. This package has not been publicly deployed by the assistant.

The paper is in `papers/` as editable DOCX and PDF, dated 24 November 2026, linked and previewed on Copyright. Its scientific results and original OD estimates are preserved.

## Research and validation

The activity tools use 215,479 ATUS diaries, 2005–2025 excluding 2020. All 337 public metro codes remain in the fitted v3 fractional-share model; 300 have boundary matches. Six activity groups plus unclassified time sum to 1,440 minutes. Unspecified traits use the common weighted recent reference population; the diary calendar is standardized when the tools compare profiles.

A2 refits weighted OLS, the current fractional method, random forest and CatBoost gradient boosting on the same development diaries and evaluates a locked 43,096-diary test sample. It compares real prediction error, error distributions and observed-group calibration. Live tools retain the established fractional model. Aggregate protocol/tuning/metrics are downloadable. Private diary-level predictions, IDs and fitted tree models are not included.

Page 07 presents the main age, education and personal-income findings in three interactive charts, each with six selectable lifestyle lines. Sex and marital-status findings remain in the text, and all 120 main demographic point estimates remain in an expandable table. Full original statistical results are preserved in the downloadable CSV and research notes. The original 189,114-mover analysis uses separate weekday-adjusted rolling metropolitan scores, ACS weights, origin and year fixed effects. It is not a personal time-change or causal-moving model. Low score reliability and attenuation after city-size/density controls remain visible.

## Authors and use

Shizhen Wang — Departmental Fellow, Department of Land Economy, University of Cambridge. shizhen.wang.21@alumni.ucl.ac.uk

Riordan Frost — Senior Research Analyst, Joint Center for Housing Studies, Harvard University. riordan_frost@harvard.edu

© 2026 Shizhen Wang & Riordan Frost. Data and third-party assets retain their respective terms. See `MAP_SOURCES.md`, `THIRD_PARTY_NOTICES.txt`, A1 and Copyright. No institutional endorsement is implied. `VALIDATION.json` records actual release checks.


## Within-year residences and voluntary research contributions (v11)

Page 05 supports multiple places in one year: blank months split equally, supplied months fill the year, and the final residence continues into later years. Main and comparison profiles, charts, CSV and shared links retain those shares. No fitted model, OD result or paper was changed.

Each Explore separately asks for optional research agreement, with an exact record preview. Demographics and dependent estimates have an additional optional checkbox. Other people's comparisons are excluded. On static/offline copies, the action downloads to the visitor's device only. To receive agreed records on a private research computer, use the optional Python collector; see `research-contributions.md`. Research records stay outside the public website and are never included in this package.
