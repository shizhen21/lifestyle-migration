# Map sources and scope

Metro polygons come from the user's original `Lifestyle Migration.zip`, at `ATUS_Migration_0927/2 lifestyle_selection_graph/USA_Core_Based_Statistical_Area.*`. Only geometry and code matching are used; shapefile population fields do not enter the ATUS statistics.

The base state outlines are the Census-derived `us-atlas` version 3 `states-10m.json` dataset: https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json (https://github.com/topojson/us-atlas, ISC license). They are bundled locally as SVG paths; no map provider or external request is required to use the page.

300 of the 337 observed public ATUS metro codes match this reference boundary file. The 37 unmatched historical codes remain in the statistical model and national sample. Interactive MSA choices are restricted to the 300 boundary-matched names; unmatched codes are not offered as map-selectable regions. No approximate coordinates or invented code crosswalks are used. The map is a reference geography; its polygons do not change when a survey year is selected, and historical boundaries remain incompletely harmonized.

The contiguous states use EPSG:5070. Alaska and Hawaii are separate labeled insets, using EPSG:3338 and EPSG:26905. Geometry is simplified for a browser preview. Displayed activity time and diary counts always come from the ATUS aggregates, rather than map attributes.

Annual map colors share one fixed scale across the selected years and population group. The color endpoints are the fifth and ninety-fifth percentiles of the available annual metro values; values outside those limits keep their actual tooltip/CSV values and receive the endpoint color. Gray means no observed cell. Dashed boundaries indicate fewer than 30 diaries. Selecting pooled years uses the same weighted period aggregation as the descriptive charts.
