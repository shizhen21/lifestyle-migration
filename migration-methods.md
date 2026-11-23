# Lifestyle Migration: research design and source notes

This chapter presents the current original manuscript, *Moving for a New Lifestyle: Time Use and Migration in the United States*, by Shizhen Wang and Riordan Frost. It covers the research question, ATUS metropolitan lifestyle measurement, ACS origin–destination matching, main regressions, all supplementary analyses, and references. Current author affiliations appear in Overview. The chapter does not use the newer personal-profile model to validate the OD results.

## Measurement and study design

The original study starts with the ATUS activity, respondent and linked CPS files for 2003–2025. Its metropolitan maps pool 2005–2025. Six study-defined activity totals cover personal care, work/education, household activities, social activity, leisure and travel. The detailed coding is reproduced from manuscript Table A1. Ambiguous residual minutes are not forcibly allocated to one of the six categories.

The original area regressions adjust for age, sex, race, marital status, education, year and diary weekday. They do not use ATUS population weights. Ten-year rolling profiles are standardized separately for each activity and window. The selected panel contains 121 MSAs and 10 window endpoints, 2014–2023, or 1,210 rows. Original Figure 1 displays 120 selected MSAs with matching boundaries. These study restrictions differ from the broader sample and all 337 public codes used by the website's newer activity tools.

ACS one-year PUMS covers 2015–2019 and 2021–2024. Standard 2020 ACS one-year PUMS is omitted. MIG = 3 identifies domestic movers. Destination uses current state/PUMA; origin uses prior-residence state/MIGPUMA. Separate IPUMS MSA–PUMA and MSA–MIGPUMA crosswalks apply, with 2010-based geography through 2021 and 2020-based geography from 2022. Strict linkage at both endpoints requires at least 95% of the relevant PUMA/MIGPUMA population in the assigned MSA and a published omission-plus-commission criterion below five percentage points. These are geographic correspondence rules, not a per-person misclassification guarantee. Same-MSA moves are excluded.

For ACS year t, both origin and destination use the ATUS ten-year window ending t−1. ACS 2015 therefore uses 2005–2014; ACS 2024 uses 2014–2023. The strict sample has 402,385 cross-MSA movers before lifestyle linkage, 220,817 with complete scores at both endpoints, and 189,114 complete-case adults with positive person weights in the main regressions. There are 79 origin-MSA clusters.

For each activity k, the outcome is the destination area z-score minus the origin area z-score. Six separate ACS PWGTP-weighted OLS models include demographic variables, ACS-year fixed effects and origin-MSA fixed effects. The main SEs cluster by origin MSA. References are age 18–24, male, married, less than high school, personal income below $25,000, non-Hispanic White, US citizen at birth and employed. The 65+ group is retained.

A coefficient compares a group's destination-minus-origin contrast with the demographic reference group. It is not the group's raw mean OD outcome or a person's change in daily minutes. The design describes actual movers and does not identify preferences, moving motives, moving probabilities or causal effects. ACS individual income must not be confused with the newer activity model's ATUS family-income categories.

## Main and supplementary results

Page 07 shows three interactive line charts for age, education and personal income, each with six independently selectable activities and a common vertical scale. The 66 original group estimates and 18 explicit reference zeros match the Blog charts. Lines connect separate groups and do not estimate continuous personal changes. Sex and marital-status findings remain in the text. An expandable table retains all 120 main demographic point estimates, adding race/ethnicity, citizenship and employment. No uncertainty intervals are drawn in the reading view; the complete original estimates and 95% intervals remain downloadable in the main CSV and research notes. Detailed methods and all original supplementary analyses remain in the self-contained research-notes download. Repeated metropolitan maps are omitted from page 07.

The supplementary analyses cover diary weekday adjustment; named metros and adjusted minute coefficients; population coverage; score correlations; complete baseline coefficients; age-by-education and age-by-income interactions; expanded household, tenure, occupation and work-from-home controls; two-way clustering; destination population and density; split-half reliability; work-related versus other travel; and minimum ATUS sample thresholds.

The original 120 mapped MSAs cover 73.2% of the total population of 384 Census MSAs in the 2022 file. Adjusted-minute comparisons in Supplementary Figure 2 are relative to the mean coefficient across 172 areas, rather than raw resident means. Age-by-education joint tests exclude zero at conventional levels for five of six outcomes (work is the exception); age-by-income joint tests do so for all six. The young/top-income cell has 524 movers.

Destination population and gross density attenuate the travel coefficients from approximately 0.090/0.089 to 0.032/0.040 for BA+ and the top personal-income group. Median split-half area-score correlations are about 0.11–0.40. Neither stronger diary thresholds nor unchanged coefficient signs resolves that reliability issue. Two-way clustering leaves point estimates unchanged but widens some intervals, and four covariance matrices required numerical repair. Work-related travel is 17.3% of recorded travel minutes; separately standardized component coefficients cannot be added together. The web page states these qualifications briefly; numerical details remain in the research-notes download.

## Sources and reproduction

The manuscript source is `项目梳理_2026-11-18/研究阅读副本/Moving Lifestyle_1028_with_robustness_appendix.docx`, SHA256 `98d80b48f4e94124a2614a5325061418054d0bf1517715f9b588ffb26e51b3fc`. All 20 original figures are copied byte for byte from its embedded media. The main figure also matches the current strict-regression PNG. Supplementary Figures 1–13 retain their original captions and explanatory notes.

The current main CSV SHA256 is `7c649f8b3f709840bd2ef1ca211405bf9a2bf57559b39bd88e0e4fe24644da86`. Seven saved specifications contain 840 demographic coefficient/CI rows. Existing endpoint CIs are reproduced exactly, rather than recomputed; the original scripts used estimate ± 1.96 × clustered SE. Only aggregate coefficients, counts, summaries and manuscript figures are bundled. Original manuscripts, data archives and regressions are preserved.

`34_prepare_original_migration_study.py` extracts the original research content and aggregate tables into a separate candidate directory. `35_build_lifestyle_migration_chapter.py` builds the English chapter and its six main-result SVGs. `36_verify_migration_chapter.py` verifies original sources, values, navigation, figures, mobile readability and offline loading. `37_release_migration_chapter.py` verifies and packages the final release. These presentation changes do not refit ATUS or ACS OD regressions.


The concise web presentation is built by `38_build_concise_migration_page.py`. Original data, regressions, manuscripts, and the other five interactive tools are unchanged.

The complete main results were restored for the concise web presentation by `40_restore_complete_migration_results.py`, retaining original data and estimates.
