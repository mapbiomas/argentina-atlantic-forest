// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 16a — Stack the 4 Hierarchical Rounds
// ============================================================
//
// DESCRIPTION:
//   Reconstructs the final flat classification by layering the 4
//   hierarchical rounds' final outputs on top of each other, base to
//   most-refined. Since each round only produced valid pixels where it
//   actually classified something (leaving the rest masked/no-data),
//   `.blend()` naturally lets each later round's classification replace
//   the coarser class underneath it, without needing an explicit mask.
//
// METHODOLOGY:
//   1. Load Round 1's final output (broad classes: forest, forest
//      plantation, water, non-vegetated, and the catch-all "Otros").
//   2. Load Round 2's final output (wetland, grassland, agropecuario,
//      perennial crops — valid only where Round 1 said "Otros").
//   3. Load Round 3's final output (pasture, annual crops — valid only
//      where Round 2 said "agropecuario").
//   4. Load Round 4's final output (yerba mate, tea — valid only where
//      Round 2 said "perennial crops").
//   5. Blend in order: Round 1 as the base, then Round 2, then Round 3,
//      then Round 4 — each later blend overwrites only the pixels the
//      corresponding round actually classified.
//   6. Export the stacked, fully refined classification.
//
// INPUT:
//   - Round 1's final classification (06g output).
//   - Round 2's final classification (09f output).
//   - Round 3's final classification (12e output).
//   - Round 4's final classification (15d output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     only as the export region.
//
// OUTPUT:
//   - Stacked classification (all 4 rounds combined into one flat class
//     scheme). Exported as `step_24_apilado_col6_v1_integrado`.
//
// PREVIOUS STEP: 06g-spatial_filter_connected_final.js (Round 1),
//                09f-spatial_filter_connected_final.js (Round 2),
//                12e-spatial_filter_connected_final.js (Round 3),
//                15d-dominance_filter_yerba_te.js (Round 4)
// NEXT STEP:     16b-standardize_and_export_final.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var version_out = 'v1';


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Update to your own GEE asset folder for the filtered
// classification output.
var dir_pre_class = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA';

// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var target_values = ee.Filter.inList('Pais', ["Argentina"]);
var reg_union = regions.filter(target_values).union();

// 🔁 REPLACE: Round 1's final classification (06g output).
var clasif_level1 = ee.Image(dir_pre_class + '/step_08d_spatial_filter_col6_v1_clas1');
// 🔁 REPLACE: Round 2's final classification (09f output).
var clasif_level2 = ee.Image(dir_pre_class + '/step_14_spatial_filter_col6_v1_clas2');
// 🔁 REPLACE: Round 3's final classification (12e output).
var clasif_level3agripastu = ee.Image(dir_pre_class + '/step_19_spatial_filter_col6_v1_clas3');
// 🔁 REPLACE: Round 4's final classification (15d output).
var clasif_level3yerbate = ee.Image(dir_pre_class + '/step_23_filter_temporal_yerbate_col6_v1_clas3_yerbate');


// ============================================================
// SECTION 4 — STACK THE ROUNDS
// ============================================================
var classfilteredvalor = clasif_level1
    .blend(clasif_level2)
    .blend(clasif_level3agripastu)
    .blend(clasif_level3yerbate);


// ============================================================
// SECTION 5 — EXPORT
// ============================================================
Export.image.toAsset({
    "image": classfilteredvalor.toInt8(),
    "description": 'spatial_filter_' + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + '/step_24_apilado_col6_' + version_out + "_integrado",
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": reg_union
});
