// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 02 — Collect Training Samples
// ============================================================
//
// DESCRIPTION:
//   For one region, merges the manually digitized per-class training
//   polygons (drawn in the Code Editor as geometry imports) into broad
//   land-cover groups, filters them to only those confirmed by a
//   reference "checked" (Chequeado) point/polygon set within a buffer,
//   and exports one FeatureCollection per period (1985, 2000).
//
// METHODOLOGY:
//   1. Merge the digitized per-class polygons into broad groups (forest,
//      forest plantation, pasture, annual crops, perennial crops,
//      wetland, grassland, non-vegetated, water — see SECTION 2; which
//      groups exist depends on the region/run, see USAGE NOTE).
//   2. Compute each polygon's area and drop zero-area geometries.
//   3. Buffer the reference "checked" points/polygons (`Chequeado`,
//      `Chequeado_2000`) by `bufferMeters` and keep only training
//      polygons that fall within that buffer — this is a QA step: only
//      polygons the analyst cross-checked against the reference dataset
//      are exported.
//   4. Export one FeatureCollection per period.
//
// INPUT:
//   - Manually digitized per-class training polygons (SECTION 2).
//   - Reference "checked" points/polygons per period (SECTION 2).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions, property
//     `Reg_id`) — used only to center the map during digitizing, not in
//     the exported logic.
//
// OUTPUT:
//   - Per-period training-sample FeatureCollection. Exported as
//     `<region_name>Coleccion6_<period>`.
//
// USAGE NOTE: this script processes ONE region per run — change
// `region_name` (SECTION 1), the class-group merges (SECTION 3), and
// `bufferMeters` per run. In the original source, region 1 was run
// TWICE with this same script: once for natural-cover classes (forest,
// wetland, grassland, non-vegetated, water — buffer 500 m, exports only
// the 1985 period) and once for anthropic-cover classes (forest
// plantation, annual crops, perennial crops, pasture — buffer 55 m,
// exports both periods). Regions 2 and 3 were each run once, combining
// both natural and anthropic classes in a single run (buffer 100 m and
// 200 m respectively, both periods). Re-digitize the correction
// geometries (SECTION 2) and adjust SECTION 3's group merges for
// whichever split you use.
//
// PREVIOUS STEP: none — first script in the pipeline (manual digitizing)
// NEXT STEP:     02-export_points.js (extracts predictor values at
//                these training polygons, converted to points)
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (modified by
//          Pablo Baldassini, March 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var region_name = "reg_1"; // reg_1 | reg_2 | reg_3

// Buffer (meters) applied to the reference "checked" geometries before
// filtering training polygons — varies per region/run in the source
// (55, 500, 100, 200); set to match the run you're reproducing.
var bufferMeters = 100;

// Periods to export. In the original, natural-cover runs exported only
// 1985; anthropic-cover and combined runs exported both.
var periods = ['1985', '2000'];


// ============================================================
// SECTION 2 — MANUALLY DIGITIZED TRAINING POLYGONS & REFERENCE POINTS
// ============================================================
// 🔁 REPLACE: Digitize your own per-class training polygons as GEE Code
// Editor geometry imports, using variable names of your choosing, and
// reference them in SECTION 3 below. The original source used names
// like `m03_forest_formation`, `c03_forest_formation85`,
// `m09_forest_plantation`, `m15_pasture`, `m19_annual_crops_uso1`,
// `m22_non_vegetated_area`, `m33_water`, `m48_Yerba_citrus_otros`,
// `m65_Te`, `m11_wetland`, `m12_grassland` (and numbered/`c`-prefixed
// variants of each, for supplementary polygon sets and per-period
// corrections).
//
// 🔁 REPLACE: Reference "checked" points/polygons used for the QA buffer
// filter (SECTION 4) — one set per period.
var Chequeado = ee.FeatureCollection([]);      // 1985 reference set
var Chequeado_2000 = ee.FeatureCollection([]); // 2000 reference set


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Update to your own GEE asset folder for the sample output.
var outputAsset = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/SAMPLES/STABLE/BA/PoligonosVT/';

// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions,
// property `Reg_id`) — used only to center the map during digitizing.
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name);

// Merge the digitized per-class polygons into broad groups. Only merge
// the groups that exist for the run you're reproducing (see USAGE
// NOTE) — e.g. for a natural-cover-only run:
// var forest = m03_forest_formation.merge(c03_forest_formation85).merge(c03_forest_formation2000).merge(m03_forest_formation2);
// var wetland = m11_wetland.merge(m11_wetland2).merge(c11_wetland85);
// var grassland = m12_grassland.merge(m12_grassland2).merge(c12_grassland85).merge(c12_grassland2000);
// var non_vegetated = m22_non_vegetated_area.merge(m22_non_vegetated_area2).merge(c22_non_vegetated_area85).merge(c22_non_vegetated_area2000);
// var water = m33_water.merge(m33_water2);
// var samples = forest.merge(wetland).merge(grassland).merge(non_vegetated).merge(water);
//
// ...or for an anthropic-cover-only run:
// var forest_plantation = m09_forest_plantation.merge(m09_forest_plantation2);
// var annual_crops = m19_annual_crops.merge(m19_annual_crops2);
// var perennial_crops = mTe.merge(myerba_2);
// var pastures = m15_pasture.merge(c15_pasture85);
// var samples = forest_plantation.merge(annual_crops).merge(perennial_crops).merge(pastures);
//
// ...or for a combined run (regions 2/3 in the original):
var forest = m03_forest_formation.merge(m03_forest_formation2).merge(c03_forest_formation85).merge(c03_forest_formation2000);
var forest_plantation = m09_forest_plantation.merge(m09_forest_plantation2).merge(c09_forest_plantation85);
var pasture = m15_pasture.merge(c15_pasture85);
var annual_crops = m19_annual_crops_uso1.merge(m19_annual_crops_uso2);
var non_vegetated = m22_non_vegetated_area.merge(m22_non_vegetated_area2).merge(c22_non_vegetated_area85);
var water = m33_water.merge(m33_water2).merge(c33_water85);
var perennial_crops = m48_Yerba_citrus_otros.merge(m65_Te);

var samples = forest.merge(forest_plantation).merge(pasture).merge(annual_crops)
    .merge(non_vegetated).merge(water).merge(perennial_crops);


// ============================================================
// SECTION 4 — AREA FILTER + REFERENCE-BUFFER QA FILTER
// ============================================================
var area = function (feature) {
    return ee.Feature(feature).set({ areaHa: feature.geometry().area(10).divide(100 * 100) });
};
var samples_area = samples.map(area);

var samples_polygon = samples_area.filter(ee.Filter.gt('areaHa', 0));
print(samples_polygon.size(), "samples_polygon");

var buff = function (feature) {
    return ee.Feature(feature).buffer(bufferMeters);
};


// ============================================================
// SECTION 5 — EXPORT (per period)
// ============================================================
var referenceByPeriod = {
    '1985': Chequeado,
    '2000': Chequeado_2000
};

periods.forEach(function (period) {
    var referenceBuffered = referenceByPeriod[period].map(buff);
    var samples_polygon_cheq = samples_polygon.filterBounds(referenceBuffered);
    print(samples_polygon_cheq.size(), "samples_polygon_cheq_" + period);

    Export.table.toAsset({
        "collection": ee.FeatureCollection(samples_polygon_cheq),
        "description": region_name + "Coleccion6_" + period,
        // 🔁 REPLACE: Update to your own GEE asset folder (see
        // `outputAsset` above).
        "assetId": outputAsset + region_name + "Coleccion6_" + period
    });
});
