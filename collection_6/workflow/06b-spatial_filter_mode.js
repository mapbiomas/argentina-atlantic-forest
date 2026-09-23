// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 06b — Spatial Filter: Focal Mode (Round 1)
// ============================================================
//
// DESCRIPTION:
//   For every year, replaces each pixel NOT classed as forest (3),
//   non-vegetated (22) or water (33) with the focal mode of its
//   immediate 3x3 neighborhood — a light spatial smoothing pass that
//   deliberately excludes the three classes considered least noisy.
//
// METHODOLOGY:
//   1. For each year: compute the focal mode (1-pixel radius, square
//      kernel) of that year's band.
//   2. Mask the focal-mode result to pixels whose ORIGINAL class is NOT
//      3, 22 or 33.
//   3. Blend the masked focal-mode result onto the original band.
//   4. Stack all years and export.
//
// INPUT:
//   - Gap-filled, merged classification (step 06a output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     only as the export region.
//
// OUTPUT:
//   - Spatially filtered classification. Exported as
//     `step_07a_filter_spatial_col6_v1_clas1`.
//
// PREVIOUS STEP: 06a-merge_and_gapfill.js (produces the classification
//                this script filters)
// NEXT STEP:     06c-spatial_filter_connected.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (adapted by Pablo
//          Baldassini, May 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var vesion_in = 'v1'; // Gap Fill version being read
var version_out = 'v1';

var years = [1985, 1986, 1987,
    1988, 1989, 1990, 1991,
    1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999,
    2000, 2001, 2002, 2003,
    2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011,
    2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019,
    2020, 2021, 2022, 2023, 2024, 2025];


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Update to your own GEE asset folder for the filtered
// classification output.
var dir_pre_class = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA';

// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');

// 🔁 REPLACE: Gap-filled, merged classification (step 06a output).
var class4GAP = ee.Image(dir_pre_class + '/step_06_gap-fill_col6_' + vesion_in + "_clas1");


// ============================================================
// SECTION 4 — PER-YEAR FOCAL-MODE FILTER
// ============================================================
var class_outTotal;

for (var i = 0; i < years.length; i++) {
    var year = years[i];
    var mode = class4GAP.select('classification_' + year).focal_mode(1, 'square', 'pixels');
    mode = mode.mask(class4GAP.select('classification_' + year).neq(3)
        .and(class4GAP.select('classification_' + year).neq(22)
            .and(class4GAP.select('classification_' + year).neq(33))));
    var class_out = class4GAP.select('classification_' + year).blend(mode);

    if (i === 0) { class_outTotal = class_out; }
    else { class_outTotal = class_outTotal.addBands(class_out); }
}


// ============================================================
// SECTION 5 — EXPORT
// ============================================================
Export.image.toAsset({
    "image": class_outTotal.toInt8(),
    "description": 'filter_spatial_' + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + '/step_07a_filter_spatial_col6_' + version_out + "_clas1",
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": regions
});
