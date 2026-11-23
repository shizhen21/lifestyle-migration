# Optional research contributions

Every interactive Explore has a separate, unchecked consent control. A contribution is a user-entered scenario, not an actual ATUS diary or a verified move. Each submission is either the visitor's own information or a hypothetical scenario. A profile comparison collects only the main profile; Compare Your Day collects A only. Other people and scenario B are excluded.

The visible form lists the data for that Explore and provides an exact JSON preview. Demographic categories and demographic-dependent model estimates are excluded unless a second optional checkbox is selected. Names, precise street addresses, other comparison paths, search text, shared URLs, IP addresses, cookies and browser identifiers are not retained. Birth year is not a separate field, but ages and years can imply it. Age, MSA and demographic combinations can still identify people. There is no persistent visitor ID linking different Explores. A random receipt only identifies one contribution and deduplicates retries.

Calculation and research submission are separate actions. A new edit, reload or successful contribution resets agreement. A failed save is never reported as successful. Server records include the consent text and version, timestamp and receipt. To discuss withdrawal, contact Shizhen Wang (shizhen.wang.21@alumni.ucl.ac.uk) or Riordan Frost (riordan_frost@harvard.edu) and provide the receipt. The operator can locate and remove that receipt's JSON file and regenerate any exports.

## Private preview collection

Python 3, no extra packages:

```
python preview_server.py --host 127.0.0.1 --port 8787 --no-browser --collect-research --research-dir /absolute/private/path/research_contributions
```

Use a loopback or a reachable private-network IP. The records directory must be outside the website root. The server accepts same-origin JSON only, caps each request at 64 KiB, checks allowed fields and durations, and writes owner-only files. It does not log visitor addresses, request paths or user-agent data. There is no public API to list/download records.

The project operator's start script enables collection on the existing private preview and saves to `research_rebuild/data/research_contributions/`. Export locally with the supplied `54_export_research_contributions.py` script:

```
python research_rebuild/scripts/54_export_research_contributions.py
```

Exports are `research_rebuild/outputs/research_contributions/contributions.jsonl` and `.csv`. Import consented downloads manually with `--import-dir /folder/containing/downloaded/files`. The public package never contains records or exports.

## Static or offline copy

GitHub Pages and direct file previews have no receiver. Each consent form says this and offers **Download this research record**. The record is saved on the visitor's device; it is not sent to the research team or automatically to the researcher's machine. Central collection requires a separately configured receiver. The delivered site does not send records to any external service.

## Academic interpretation

Opt-in scenarios are a convenience sample and must be kept separate from hypothetical examples. They cannot establish population preferences, causal effects or validate the ATUS model. Sensitive demographic combinations need careful treatment. Consent here documents a visitor's choice to contribute; it does not constitute institutional approval for a research protocol. Define the intended research, retention and access arrangements with the relevant institution before analysis or sharing.
