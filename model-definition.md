# Complete activity model · all public metro codes (v3)

Data: ATUS 2005–2025 excluding the interrupted 2020 survey; 215,479 complete diaries. The model uses the harmonized final survey weight and diary-date-derived month. It retains all 337 observed public metro codes individually, together with nonmetropolitan and undisclosed-geography categories. No ACS migration OD eligibility rule or minimum metro sample threshold is applied. Sparse metro coefficients are regularized rather than pooled into one other-metro category.

For diary i and activity k, q_ik is minutes divided by 1440. Seven shares (six original activity classes plus unclassified time) are fitted jointly by weighted fractional multinomial logit:

mu_ik = 1440 × exp(eta_ik) / sum_j exp(eta_ij).

The unclassified logit is fixed at zero. Each of the other six logits includes an intercept, a cubic age spline, demographic main effects, annual effects, pooled metro-code effects, diary weekday, month, holiday, demographic-by-period interactions, age-band-by-sex, children-by-sex, and weekday-by-employment.

Demographic dimensions: sex, education, race and Hispanic/Latino origin, marital status, nominal annual family income, nativity/citizenship, employment, and children under 18 in the household. Spline knots: ages 15, 25, 35, 45, 55, 65, 75 and 85. Age bands and all nine demographic dimensions interact with four periods: 2005–2009, 2010–2014, 2015–2019 and 2021–2025.

Objective: survey-weight-normalized cross entropy plus lambda/2 times the squared non-intercept coefficients, with lambda=0.0001. Predictions are nonnegative and sum to 1440 minutes. An 80/20 split stratified by year evaluates prediction; the browser subsequently uses the converged fit on all diaries. Public geographic category vocabulary is known before the split; held-out outcomes do not enter model fitting.

Predictions average over the same real 2025 joint weekday/month/seven-holiday calendar. Weekday and weekend options condition that calendar. Unspecified inputs are averaged over a common 2021–2025 weighted national reference population, using deterministic 2048-point integration and preserving the joint combinations among unspecified features. These are standardized model profiles, rather than raw means conditional on all selected inputs.

The Patterns page instead reports observed survey-weighted means. It does not apply regression standardization. Its year pooling uses equal national year weights; a metro or demographic subgroup retains its population share in each year. The survey final weights correct the unequal diary weekday sampling. Neither observed patterns nor scenario differences establish causal effects.

Metro coefficients are pooled and time invariant; there are no city-specific year trends. Some codes are historical, and boundaries are not fully harmonized. Code names come from local Census tables, with unmatched codes explicitly labeled. Selecting a place with no diary observations in that year extrapolates the pooled geographic coefficient and is flagged in the interface. Sparse metro results can be unstable; no survey-design-consistent confidence intervals are available.

Some demographic information was collected in the earlier CPS interview. Income is nominal family income, not personal or inflation-adjusted income. Repeated cross-sections cannot separately identify causal age, period and cohort effects. The same-birth-year comparison only synchronizes age with year; it does not follow the same respondent or estimate the causal effect of moving. Location and companion classifications, urban mechanism analysis and ACS OD re-estimation remain outside this activity-only release.

Detailed public categories: 16 nominal annual family-income bands, nine education groups, six marital states, six race groups plus a separate Hispanic-origin variable, and four household-child counts. Unknown source responses stay in the estimation sample. Multiracial detail is pooled because its codes change in 2012. The earlier v2 model and all original OD regressions remain preserved.

The map offers the 300 public codes matched to the original shapefile. The remaining 37 historical/unmatched codes remain in estimation and national results. Migration Evidence displays preserved OD regressions separately; see `evidence-methods.md`.
