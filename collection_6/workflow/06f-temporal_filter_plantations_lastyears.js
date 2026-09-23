// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 06f — Force Plantation Persistence (Recent Years) (Round 1)
// ============================================================
//
// DESCRIPTION:
//   If a pixel was classed as forest plantation (9) in any of 2017,
//   2018 or 2019, forces it to remain class 9 through 2025 — corrects
//   harvest-cycle noise near the end of the series, where a plantation
//   stand may be temporarily classed as something else right before the
//   series ends (with no later year available to catch it with a
//   sandwich rule).
//
// METHODOLOGY:
//   1. Build a detection mask: pixel is class 9 in 2017, 2018 or 2019.
//   2. For each year from `start_year_replacement` (2017) to
//      `end_year_replacement` (2025): where the detection mask is true,
//      force the year's band to class 9.
//
// INPUT:
//   - Plantation-corrected classification (step 06e output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions), filtered
//     to reg_1/reg_2/reg_3.
//
// OUTPUT:
//   - Classification with recent-years plantation persistence forced.
//     Exported as
//     `step_08c_filter_temporal_plantaciones_ultimosanios_col6_v1_clas1`.
//
// PREVIOUS STEP: 06e-temporal_filter_plantations.js (produces the
//                classification this script corrects)
// NEXT STEP:     06g-spatial_filter_connected_final.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var start_year_detection = 2017;
var end_year_detection = 2019;
var start_year_replacement = 2017;
var end_year_replacement = 2025;


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Update to your own GEE asset folder for the filtered
// classification output.
var dir_pre_class = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA';

// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var region = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3')
    .filter(ee.Filter.inList('Reg_id', ["reg_1", "reg_2", "reg_3"]));
var regions = region.union();

// 🔁 REPLACE: Plantation-corrected classification (step 06e output).
var image_FE = ee.Image(dir_pre_class + '/step_08b_filter_temporal_plantaciones_col6_v1_clas1');


// ============================================================
// SECTION 4 — FORCE PLANTATION PERSISTENCE
// ============================================================
var filtered = image_FE;

// if class 9 in 2017, 2018 or 2019, mark the pixel as plantation
var mask_detection = image_FE.select('classification_2017').eq(9)
    .or(image_FE.select('classification_2018').eq(9))
    .or(image_FE.select('classification_2019').eq(9));

// apply the mask to years 2017-2025
for (var ano = start_year_replacement; ano <= end_year_replacement; ano++) {
    var banda_name = 'classification_' + ano.toString();
    var current_band = filtered.select(banda_name);
    var modified_band = current_band.where(mask_detection.eq(1), 9);
    var otherBands = filtered.select(
        filtered.bandNames().filter(ee.Filter.neq('item', banda_name))
    );
    filtered = otherBands.addBands(modified_band);
}


// ============================================================
// SECTION 5 — EXPORT
// ============================================================
Export.image.toAsset({
    "image": filtered.toInt8(),
    "description": 'step_08c_filter_temporal_plantaciones_ultimosanios_col6_v1_clas1',
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + '/step_08c_filter_temporal_plantaciones_ultimosanios_col6_v1_clas1',
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": regions
});
