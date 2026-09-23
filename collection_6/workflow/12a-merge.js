// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 12a — Merge Regions (Round 3)
// ============================================================
//
// DESCRIPTION:
//   Combines the 3 regions' Round-3 complement classifications (step 11
//   output) into a single national mosaic, using per-pixel
//   minimum-value priority to resolve overlaps. Same pattern as
//   09a-merge.js (Round 2) — no gap-filling is actually applied here
//   either, despite the inherited script name (see that script's NOTE).
//
// INPUT:
//   - Per-region Round-3 complement classifications (11-stable_map.js
//     output, both periods, all 3 regions).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions).
//
// OUTPUT:
//   - Merged multi-year classification. Exported as
//     `step_09_gap-fill_col6_v1_clas3`.
//
// PREVIOUS STEP: 11-stable_map.js (produces each region's complement
//                classification)
// NEXT STEP:     12b-spatial_filter_mode.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (adapted by Pablo
//          Baldassini, June 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var version_out = 'v1';
var col = "col6_";
var prefixo_out = 'step_09_gap-fill_';


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var regions_union = regions.union();

// 🔁 REPLACE: Export bounding box (Argentina Atlantic Forest extent) —
// used only as the export region below.
var exportRegion = ee.Geometry.Polygon(
    [[[-60.23680810003558, -19.33531374656231],
      [-60.23680810003558, -31.11250553661841],
      [-53.02977685003558, -31.11250553661841],
      [-53.02977685003558, -19.33531374656231]]], null, false);

// 🔁 REPLACE: Per-region Round-3 complement classifications
// (11-stable_map.js output, both periods).
var dircol5 = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA';
// 🔁 REPLACE: Update to your own GEE asset folder for the filtered
// classification output.
var dirout = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA/';

var classif_reg1 = ee.Image(dircol5 + '/BAstep_04_reg_1-col_6_1985_class_v1_clas3')
    .addBands(ee.Image(dircol5 + '/BAstep_04_reg_1-col_6_2000_class_v1_clas3'));

var classif_reg2 = ee.Image(dircol5 + '/BAstep_04_reg_2-col_6_1985_class_v1_clas3')
    .addBands(ee.Image(dircol5 + '/BAstep_04_reg_2-col_6_2000_class_v1_clas3'));

var classif_reg3 = ee.Image(dircol5 + '/BAstep_04_reg_3-col_6_1985_class_v1_clas3')
    .addBands(ee.Image(dircol5 + '/BAstep_04_reg_3-col_6_2000_class_v1_clas3'));


// ============================================================
// SECTION 4 — MERGE REGIONS + EXPORT
// ============================================================
var image = ee.ImageCollection.fromImages(
    [ee.Image(classif_reg1),
        ee.Image(classif_reg2),
        ee.Image(classif_reg3)
    ]).min().clip(regions_union);

Export.image.toAsset({
    'image': image,
    'description': prefixo_out + col + version_out + "_clas3",
    // 🔁 REPLACE: Update to your own GEE asset folder (see `dirout`
    // above).
    'assetId': dirout + prefixo_out + col + version_out + "_clas3",
    'pyramidingPolicy': { '.default': 'mode' },
    'region': exportRegion,
    'scale': 30,
    'maxPixels': 1e13
});
