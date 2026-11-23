# Lifestyle profiles and place matching

These tools reuse the refitted v3 ATUS activity model; they do not refit outcomes or add ACS migration choices to the predictor. See `model-definition.md` for the regression, weighting, calendar and unspecified-input integration. All predicted days contain the six original activity classes plus unclassified minutes, are nonnegative and sum to 1,440 minutes.

## Lifestyle Profiles

A track specifies a birth year, end year, and one to ten residence stages; several stages may share a year. Each stage has a named MSA with a matching polygon. With demographic details enabled, shared sex and race are required, while Hispanic/Latino origin and nativity/citizenship are optional. Education, employment, marital status and household children are required and visible within every chapter; family income is optional. Race and Hispanic origin are separate variables. Same-year stages are averaged by residence duration; afterward, the final residence and its characteristics continue until a new stage. Omitted optional inputs use the common reference population. With demographic details disabled, all demographic inputs are averaged over that population. The interface does not infer education, marriage or children from age.

For each observed year between the first stage and the end, age is year minus birth year. The tool predicts using that age, year, stage MSA and characteristics. Ages must be at least 15; ages 85 and older use 85+. The data end in 2025, and 2020 remains a gap. No future years are generated. These are repeated-cross-section model profiles, not a respondent panel, a personal forecast or a causal estimate of aging.

At an MSA change, a separate comparison predicts the destination and previous MSA using the same move year, age and destination-stage demographic profile. The difference isolates the modeled place contrast under common inputs. The whole track's change may combine age, year, place and demographic differences. Coefficients for place are pooled across years; this is not a city-specific historical trajectory.

An MSA-year with zero observed diaries under that public code is explicitly flagged as extrapolated, even if the year lies between the code's first and last observation. Historical code transitions are not repaired with invented crosswalks. Numbered map waypoints are schematic anchors derived from the largest displayed polygon component, not street addresses or travel routes.

## Compare people and alternative paths

Page 05 can add up to three independent comparison tracks alongside the original track. Each has a birth year, end year, optional demographic background, and one to ten chapters with an MSA, year and stage-specific education, employment, marriage, children and optional family income. A new comparison copies the current original inputs; subsequent changes are independent. The diary-day calendar is shared across all tracks. Every point is computed by the unchanged v3 prediction engine.

Calendar alignment pairs profiles with the same year; age alignment pairs profiles with the same actual age and may compare different years. The point inspector shows both year and age, all seven predicted activity components, and comparison-minus-original differences when both points exist. No unmatched point is interpolated or extended beyond the chosen range. The missing 2020 diary survey remains a gap for each separate birth cohort. Ages 85+ remain model-top-coded, and MSA-year extrapolation is flagged. Differences can combine year, age, place and demographic inputs, so they are not isolated causal effects. CSVs retain both coordinates, coverage, full selected inputs and activity differences; share links preserve all paths locally in the URL.

## Move for a New Lifestyle

Step 1 chooses a personal profile, current MSA, reference year and diary-day calendar. Step 2 filters destination MSAs by state-based region, fixed Census 2022 metropolitan population and diary-year coverage. Step 3 chooses Low, Medium or High for all six activities and assigns a unique priority rank 1–6. Changing one rank swaps the displaced activity to the old position. The current MSA need not satisfy destination filters.

Small means under 250,000 metropolitan residents; Medium is 250,000–999,999; Large is at least 1,000,000. The combined Small or medium choice includes all MSAs below 1,000,000. Population comes from the project's original Census Vintage 2022 file, POPESTIMATE2022, not ATUS sample size. All 300 mapped MSAs match it exactly by public code. A cross-state MSA satisfies a region if any state in its Census metro name belongs to that region. The broad Northeast/Midwest/South/West choices use Census region definitions; Pacific Northwest explicitly means ID, OR, WA and Southwest AZ, NM, NV, UT. These subsets overlap West. Alaska and Hawaii are included in West. The population is a fixed 2022 reference, not the population of every selected diary year or a forecast. Download `downloads/msa_population_regions_2022.csv`.

For each of six activities k, compute the same profile's predicted minutes across all eligible MSAs. Low/Medium/High target the 25th/50th/75th percentiles of this unweighted distribution across places (linear interpolation between order statistics). Each city counts once; this is not a population percentile. Targets therefore change with the candidate filters and selected profile. Intensity describes the activity amount, while priority indicates its importance. All activities remain in the score.

Let t_k be the target, s_k = max(1 minute, Q75_k − Q25_k), r_k the unique priority rank, and w_k = 7 − r_k. Candidate j has score:

`D_j = sqrt(sum_k w_k * ((m_jk - t_k) / s_k)^2 / sum_k w_k)`

The normalization prevents a category that occupies more minutes from dominating solely because of its raw scale. The score is dimensionless, in candidate interquartile-range units with a 1-minute floor. It is not a probability or an empirically estimated preference parameter. Rank 1 has weight 6 and rank 6 weight 1; these are an explicit tool convention, not a strict lexicographic rule. Lower is closer. Ties use MSA name. Multiple High preferences, including all six, are allowed: targets express competing aspirations. They are not required to form a feasible synthetic day. Every actual candidate composition still sums to 1,440 minutes, so the ranking resolves their tradeoffs.

All 300 boundary-matched MSAs are predicted. The default candidate pool additionally requires at least one diary under that code in the reference year; this is a coverage rule, not a minimum sample size or ACS OD rule. The historical option includes otherwise eligible cities without current-year observations and flags extrapolation. If filters yield no candidates, the page asks to broaden them and disables the stale CSV. A one-city pool is allowed and shows that limited candidate count. Sparse samples can produce unstable matches; diary counts are not demographic-cell counts or confidence intervals.

The map shows preference closeness or an activity's minutes. Gray marks MSAs excluded by region, size or coverage, and clicking explains the reason. Results and CSV update after a search. Share links preserve profile, region, size, coverage, intensities and priority order. Old minute-target links load an explicitly labeled example of the updated preferences, rather than silently claiming to preserve the former objective.

Personal care includes sleep. Leisure includes eating, drinking and exercise; none is separately fitted here. These profile comparisons omit housing costs, jobs and personal constraints and do not promise the causal outcome of moving. Actual ACS migration evidence appears separately on page 07.

## Computation and exports

An optimized place routine integrates the same reference profiles and calendar as the established predictor, reusing the logit components that do not vary across MSAs. It is numerically checked against the original predictor under full and partial demographic inputs and average-day, weekday and weekend calendars. HTTP previews use a browser worker; direct offline files use the same engine on the main thread with cooperative yielding. No external API is used.

CSV exports contain full predicted minutes and selected characteristics. Share links encode form choices in the URL; they do not create a server-side record. The final residence-stage profile can be passed to the place-matching page. The browser session stores the latest completed track profile for the optional reuse button.


## Observed population reference curves

Page 05 offers actual survey-weighted national (age 15+), age-band and age-band-by-sex annual means from the same prepared ATUS diaries. Age bands are 15–17, 18–24, 25–34, 35–44, 45–54, 55–64, 65–74 and 75+. References condition on the selected diary-day type and retain actual within-year group composition and calendar. They are not predictions under the personal model's fixed 2025 calendar. Counts and Kish effective sample sizes are exported; no intervals are implied. The main profile determines peer year and age. Main-person references can be overlaid on multiple-person comparisons without being mislabeled as another person's peers.

## From place examples to similarity and tentative priorities

For each example, predict all 300 mapped metros at its age, year, demographics and diary-day type. Standardize each activity using the median and IQR of metros observed that year; IQR has a one-minute floor. The liked centroid uses ratings 4/5 with weights 1/2. Equal-weight Euclidean distance to that centroid gives similarity matches. Residence without a rating contributes neither to that centroid nor to preference fitting. Unchosen metros are never coded as dislikes.

With at least four scored examples from three metros, both a liked example and an example rated 1–3, and a two-point rating range, fit centered six-feature ridge regression to (rating−3)/2, minimizing mean squared error plus sum(beta^2). Lambda=1 is fixed, not tuned on those few ratings; the intercept is unpenalized. Absolute coefficient shares sum to one, and coefficient signs give conditional directions in this regularized descriptive fit. Score reference-year candidates by the signed normalized coefficients. Leave-one-example-out and lambda=0.25/1/4 sign checks report sensitivity rather than inferential confidence. Do not identify these coefficients with revealed or stable personal utility weights. Users can explicitly replace them with adjusted signed priorities.

Every recommendation candidate shares the one current reference profile and year; filters concern region, fixed 2022 metro population and diary-year coverage. The example-specific standardization prevents common age/year levels from directly defining place preferences, but it does not make the estimates causal or resolve geographic support and omitted influences. A single metro can recur in different years, but exact identical profiles are rejected and dependent examples do not support statistical inference. No original regression is refitted.


## Within-year residence shares (v11)

Several stages may have the same year. Stages are sorted by year and retain their entered order within a year. All blank durations split 12 months equally. If some durations are supplied, blank stages split the remaining months equally. All positive explicit durations must total 12 when none is blank. Zero, negative, non-finite, overfilled and underfilled years are rejected, rather than silently normalized.

For activity k, annual expected minutes are sum_j (months_j / 12) * prediction_k(profile_j, year, age, MSA_j). Each component and annual average sum to 1,440 minutes. Stage demographics may differ. This averages annual model predictions; it does not fit month-specific seasonality or identify the actual date of a move. In the next year without a new stage, the final residence and demographic stage continue, with updated year and age. The interrupted 2020 diary year remains missing. Ages 85+ retain the model's top coding.

Annual CSV rows contain full-precision annual averages and a residence_segments_json column with each component's months, share, demographics, prediction, sequence and extrapolation flag. Same-year move contrasts use the destination stage's profile and year for both cities, not the annual mixture. The last-stage link uses the final residence, not the composite annual profile. Residence shares are never interpreted as preference or importance weights in the place-rating tool.

## Optional contributions to academic research (v11)

Each interactive exploration has its own unchecked consent control. Calculation does not submit data. A separate explicit contribution button, a description and an exact payload preview precede submission. Contributions describe user-entered scenarios, not observed time diaries or verified migration. The visitor chooses whether this is their own information or a hypothetical scenario. Comparison B and other people's profile paths are excluded. Names, street addresses, shared URLs, IP addresses and browser identifiers are not stored. Birth year is not a separate field, but ages and years can imply it. Profiles may still contain sensitive, potentially identifying combinations of ages, metropolitan areas and demographic categories; the contribution is not described as anonymous.

The private preview can accept same-origin JSON POST submissions and store them outside its document root. No public export endpoint is available. Every record has a random receipt identifier, consent version, scope, timestamp and selected fields; separate exploration submissions have no stable cross-page visitor identifier. Explicit retries reuse the identifier to avoid duplicate saves. Changing inputs, reloading, or submitting resets consent. Only owner-readable private files are used. An operator export tool writes JSONL/CSV on the researcher's computer. In a static/offline copy, the button only downloads the consented record to the visitor's device and explicitly states that nothing was sent to the researchers. GitHub Pages alone does not provide central collection.

These convenience samples require separate research design and institutional review as applicable before academic use; they cannot validate the ATUS model or represent all U.S. movers.
