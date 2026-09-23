# Collection 6 — Atlantic Forest

Google Earth Engine pipeline for MapBiomas Argentina — Atlantic Forest
(Bosque Atlántico) region, land-cover classification, Collection 6
(1985–2025), covering the 3 regions of the Argentine Atlantic Forest
(Misiones and surrounding areas).

This is a documented, public-reproducibility version of the original GEE
Code Editor scripts. Every internal/organization-specific asset path has
been replaced with a `🔁 REPLACE:` marker and an explanation — see each
script's header and inline comments for details. No processing logic was
changed; only visualization/debug code (`Map.addLayer`, `print`, legend
panels, interactive UI tools) was removed and the code was reorganized into
labeled sections.

We highly recommend reading the [Atlantic Forest Algorithm Theoretical Basis Document (ATBD)](https://drive.google.com/file/d/1cDHBEH2nQLKdq2aKc2DF0juL2lOATks_/view?usp=drive_link/)
for background on the classification methodology. For the MapBiomas
Argentina legend and class codes, see
[argentina.mapbiomas.org/codigos-de-la-leyenda](https://argentina.mapbiomas.org/codigos-de-la-leyenda/).
For all available collections, see
[argentina.mapbiomas.org](https://argentina.mapbiomas.org/).

## Pipeline: a hierarchical, 4-round classification

Unlike Collections 4 and 5 (which run one main classification pass plus a
single yerba-mate-specific refinement round), Collection 6 classifies in
**4 progressively finer hierarchical rounds**, each a full
samples → preclassification → stable-map → post-processing cycle, where a
later round only re-classifies the pixels an earlier round grouped into a
catch-all class:

- **Round 1** (scripts `02`–`06g`): broad classes — forest (3), forest
  plantation (9), water (33), non-vegetated (22) — everything else →
  catch-all class **10** ("Otros").
- **Round 2** (scripts `07`–`09f`): re-classifies ONLY the pixels Round 1
  called class 10, splitting it into wetland (11), grassland (12),
  agropecuario (14, merged pasture + annual crops), and perennial crops
  (36, merged yerba mate + tea).
- **Round 3** (scripts `10`–`12e`): re-classifies ONLY the pixels Round 2
  called class 14, splitting it into pasture (15) and annual crops (19).
- **Round 4** (scripts `13`–`15d`): re-classifies ONLY the pixels Round 2
  called class 36, splitting it into yerba mate (48) and tea (65).
- **Integration** (scripts `16a`–`16b`): stacks all 4 rounds back into one
  flat classification (Round 1 as the base, each later round's valid
  pixels overwrite the coarser class beneath them) and publishes the final
  product.

Rounds 3 and 4 are **sibling branches** of Round 2's output (refining two
different classes), not a linear continuation of each other. Each region
(`reg_1`/`reg_2`/`reg_3`) is processed with the same generic, parameterized
script per step — see each script's USAGE NOTE for how to re-run it per
region.

## Pipeline steps

| # | Script | Round | What it does | Output |
|---|--------|-------|----------------|--------|
| 02 | [02-collect_samples.js](02-collect_samples.js) | 1 | Merges digitized training polygons into broad class groups, QA-filters them, exports per period. | Training polygons |
| 02 | [02-export_points.js](02-export_points.js) | 1 | Draws a stratified point sample from the training polygons. | Training points |
| 03 | [03-preclassification.js](03-preclassification.js) | 1 | Per-year Random Forest classification of broad classes (3/9/22/33); everything else → class 10. | `step_03-class_..._v1` |
| 04 | [04-stable_map.js](04-stable_map.js) | 1 | Gap-fill, per-class frequency → stable map, stable points, complement (re-trained) classification. | Stable map, stable points, complement classification |
| 06a–06g | [06a-merge_and_gapfill.js](06a-merge_and_gapfill.js) … [06g-spatial_filter_connected_final.js](06g-spatial_filter_connected_final.js) | 1 | Merge regions, spatial filters (focal mode + connected components), temporal filters (all classes + plantation-specific), final spatial filter. | `step_08d_spatial_filter_..._clas1` (Round 1 final) |
| 07 | [07-preclassification.js](07-preclassification.js) | 2 | Refines class 10 → 11/12/14/36. | `step_03-class_..._v2` |
| 08 | [08-stable_map.js](08-stable_map.js) | 2 | Stable map/points/complement classification. | Stable map, stable points, complement classification |
| 09a–09f | [09a-merge.js](09a-merge.js) … [09f-spatial_filter_connected_final.js](09f-spatial_filter_connected_final.js) | 2 | Merge, spatial filters, grassland/wetland dominance filter, temporal filter, final spatial filter. | `step_14_spatial_filter_..._clas2` (Round 2 final) |
| 10 | [10-preclassification.js](10-preclassification.js) | 3 | Refines class 14 → 15/19. | `step_03-class_..._v3` |
| 11 | [11-stable_map.js](11-stable_map.js) | 3 | Stable map/points/complement classification. | Stable map, stable points, complement classification |
| 12a–12e | [12a-merge.js](12a-merge.js) … [12e-spatial_filter_connected_final.js](12e-spatial_filter_connected_final.js) | 3 | Merge, spatial filters, temporal filter, final spatial filter. | `step_19_spatial_filter_..._clas3` (Round 3 final) |
| 13 | [13-preclassification.js](13-preclassification.js) | 4 | Refines class 36 → 48/65. | `step_03-class_..._v3_yerbate` |
| 14 | [14-stable_map.js](14-stable_map.js) | 4 | Stable map/points/complement classification. | Stable map, stable points, complement classification |
| 15a–15d | [15a-merge.js](15a-merge.js) … [15d-dominance_filter_yerba_te.js](15d-dominance_filter_yerba_te.js) | 4 | Merge, spatial filters, yerba mate/tea dominance filter (final step of this round). | `step_23_filter_temporal_yerbate_..._clas3_yerbate` (Round 4 final) |
| 16a | [16a-stack_rounds.js](16a-stack_rounds.js) | Integration | Stacks all 4 rounds' final outputs into one flat classification. | `step_24_apilado_col6_v1_integrado` |
| 16b | [16b-standardize_and_export_final.js](16b-standardize_and_export_final.js) | Integration | Standardizes metadata and exports the public final product. | `BosqueAtlantico-FINAL_v1` |

```
Round 1: 02 → 02 → 03 → 04 → 06a → 06b → 06c → 06d → 06e → 06f → 06g
                                                                    │
Round 2: ─────────────────────────────────────────────────────────┤ 07 → 08 → 09a → 09b → 09c → 09d → 09e → 09f
                                                                                                              │
Round 3 (from Round 2's class 14): ──────────────────────────────────────────────────────────────────────────┤ 10 → 11 → 12a → 12b → 12c → 12d → 12e ─┐
Round 4 (from Round 2's class 36): ──────────────────────────────────────────────────────────────────────────┤ 13 → 14 → 15a → 15b → 15c → 15d ────────┤
                                                                                                                                                          ↓
                                                                                                                                   16a (stack) → 16b (final product)
```

Each script's header comment has the full DESCRIPTION / METHODOLOGY / INPUT
/ OUTPUT / PREVIOUS STEP / NEXT STEP for that step.

## Adapting to your own project

Every script marks the values you need to change with `🔁 REPLACE:`
comments — mainly asset paths (`ee.Image(...)`, `ee.FeatureCollection(...)`,
`Export.*.assetId`, `Export.*.region`): replace `projects/YOUR-PROJECT/...`
with your own GEE asset paths.

- Scripts `02`, `03`, `04`, `07`, `08`, `10`, `11`, `13`, `14` run **once
  per region** (`region_name`) and, where applicable, **once per period**
  (`1985-1999` / `2000-2025`) — see each script's USAGE NOTE.
- `02-collect_samples.js` needs your own digitized training polygons
  (SECTION 2 placeholders) per class group — the original team split
  region 1 into two separate runs (natural cover / anthropic cover) and
  combined both in regions 2/3; see that script's USAGE NOTE.
- The post-processing scripts within a round (`06`, `09`, `12`, `15`) run
  in sequence, each consuming the previous one's export — follow the
  PREVIOUS/NEXT STEP chain in each script's header.
- A few scripts preserve small inconsistencies/leftovers from the original
  team's iterative development (an unused config variable, a filter
  condition referencing a class that can't occur at that pipeline stage,
  an extra literal prefix on Round 4's export names) — each is called out
  with a `NOTE (kept as in the original): ...` comment rather than
  silently fixed.

## Legend (Collection 6 classes referenced throughout the pipeline)

| Code | Class | Introduced in |
|------|-------|----------------|
| 3  | Natural forest | Round 1 |
| 9  | Forest plantation | Round 1 |
| 10 | "Otros" (catch-all, refined away by Round 2) | Round 1 |
| 11 | Wetland (floodable grassland) | Round 2 |
| 12 | Grassland | Round 2 |
| 14 | Agropecuario (catch-all, refined away by Round 3) | Round 2 |
| 15 | Pasture | Round 3 |
| 19 | Annual crops | Round 3 |
| 22 | Non-vegetated area | Round 1 |
| 33 | Water | Round 1 |
| 36 | Perennial crops (catch-all, refined away by Round 4) | Round 2 |
| 48 | Yerba mate | Round 4 |
| 65 | Tea | Round 4 |

## Original source

Adapted from the internal GEE-hosted repository
`users/mapbiomas-arg/ba-col6` (folder `Coleccion6/`) — MapBiomas Argentina /
Atlantic Forest team. Scope limited to the `Coleccion6` folder per the
team's own request; the source repository's `Lechu`/`statistics` folders
and root-level loose scripts are unrelated side work, out of scope here.
