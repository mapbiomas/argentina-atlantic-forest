// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 09b — Spatial Filter: Focal Mode (Round 2)
// ============================================================
//
// DESCRIPTION:
//   Same focal-mode spatial filter as step 06b (Round 1), applied here
//   to the Round-2 merged classification.
//
// METHODOLOGY: identical to step 06b — see that script for the full
// algorithm description.
//
// NOTE (kept as in the original): the exclusion condition only checks
// `.neq(3)` (forest) — a class that shouldn't be present in Round 2's
// output at all (Round 2 only produces classes 11/12/14/36). This looks
// like a leftover condition copy-pasted from the Round-1 script and
// never updated; kept exactly as found, since it has no practical
// effect (no pixel is ever class 3 here).
//
// INPUT:
//   - Merged Round-2 classification (step 09a output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     only as the export region.
//
// OUTPUT:
//   - Spatially filtered classification. Exported as
//     `step_10_filter_spatial_col6_v1_clas2`.
//
// PREVIOUS STEP: 09a-merge.js (produces the classification this script
//                filters)
// NEXT STEP:     09c-spatial_filter_connected.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (adapted by Pablo
//          Baldassini, June 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var vesion_in = 'v1'; // merge version being read
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

// 🔁 REPLACE: Merged Round-2 classification (step 09a output).
var class4GAP = ee.Image(dir_pre_class + '/step_09_gap-fill_col6_' + vesion_in + "_clas2");


// ============================================================
// SECTION 4 — PER-YEAR FOCAL-MODE FILTER
// ============================================================
var class_outTotal;

for (var i = 0; i < years.length; i++) {
    var year = years[i];
    var mode = class4GAP.select('classification_' + year).focal_mode(1, 'square', 'pixels');
    mode = mode.mask(class4GAP.select('classification_' + year).neq(3));
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
    "assetId": dir_pre_class + '/step_10_filter_spatial_col6_' + version_out + "_clas2",
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": regions
});
