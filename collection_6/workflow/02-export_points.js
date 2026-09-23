// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 02b — Export Training Points
// ============================================================
//
// DESCRIPTION:
//   For one region and period, loads the training polygons exported by
//   02-collect_samples.js (one or two source FeatureCollections,
//   depending on whether the region's samples were collected in a
//   single run or split natural/anthropic — see USAGE NOTE), rasterizes
//   them, draws a stratified random sample of points from them, and
//   exports both the source polygons and the sampled points.
//
// METHODOLOGY:
//   1. Merge the region's training-polygon source(s) (one or two,
//      depending on the region).
//   2. Rasterize the merged polygons (`reduceToImage`, band `reference`
//      = class code) and draw a stratified sample of `puntos` points
//      from it.
//   3. Print the per-class point counts, for a quick sanity check.
//   4. Export both the (bounds-filtered) source polygons and the
//      sampled points.
//
// INPUT:
//   - Training-polygon FeatureCollection(s) (02-collect_samples.js
//     output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions, property
//     `Reg_id`).
//
// OUTPUT:
//   - Bounds-filtered training polygons. Exported as
//     `<region_name>-col_<collection>-poly_v<version>_<period>`.
//   - Stratified point sample. Exported as
//     `<region_name>-col_<collection>-points_v<version>_<period>`.
//
// USAGE NOTE: this script processes ONE region and ONE period per run —
// change `region_name` and `period` (SECTION 1). For region 1 (in the
// original source), the training polygons come from TWO source
// FeatureCollections (natural cover + anthropic cover, from
// 02-collect_samples.js's two separate runs for that region) merged
// together; for regions 2 and 3, there is a single combined source per
// period. Adjust SECTION 3 to merge one or two sources as appropriate.
//
// PREVIOUS STEP: 02-collect_samples.js (produces the training polygons
//                this script samples points from)
// NEXT STEP:     03-preclassification.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var region_name = "reg_1"; // reg_1 | reg_2 | reg_3
var period = "1985";       // 1985 | 2000

var collection = 6;
var version_out = 1; // Version that will be saved
var puntos = 3500;   // Number of stratified sample points to draw


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions,
// property `Reg_id`).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name);

// 🔁 REPLACE: Update to your own GEE asset folder for the points output.
var outputAsset = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/SAMPLES/STABLE/BA/';

// 🔁 REPLACE: Training-polygon source(s) (02-collect_samples.js output).
// Region 1: two sources per period (natural + anthropic), e.g.:
// var poligonos_vt_natural = ee.FeatureCollection(outputAsset + 'PoligonosVT/reg_1Coleccion6_naturalcovers' + period);
// var poligonos_vt_antropic = ee.FeatureCollection(outputAsset + 'PoligonosVT/reg_1Coleccion6_antrophiclanduse' + period);
// var poligonos_vt = poligonos_vt_natural.merge(poligonos_vt_antropic);
//
// Regions 2/3: a single combined source per period:
var poligonos_vt = ee.FeatureCollection(outputAsset + 'PoligonosVT/' + region_name + 'Coleccion6_' + period);


// ============================================================
// SECTION 4 — STRATIFIED POINT SAMPLING
// ============================================================
var totalSample = poligonos_vt.filterBounds(myRegion);

var amostraTotalimg = totalSample.reduceToImage({ properties: ['reference'], reducer: ee.Reducer.first() });
amostraTotalimg = amostraTotalimg.select([0], ['reference']);

var training = amostraTotalimg.stratifiedSample({
    'numPoints': puntos,
    'classBand': 'reference',
    'region': myRegion,
    'scale': 30,
    'seed': 1,
    'dropNulls': true,
    'geometries': true
});

training = training.map(function (feature) {
    return feature.set('type', 'training');
});

// Per-class point counts — a quick sanity check before export. Classes
// present vary by region; codes follow the Collection 6 legend (see
// pipeline README).
print('# c03_forest_formation', training.filterMetadata('reference', 'equals', 3).size());
print('# c09_forest_plantation', training.filterMetadata('reference', 'equals', 9).size());
print('# c11_wetland', training.filterMetadata('reference', 'equals', 11).size());
print('# c12_grassland', training.filterMetadata('reference', 'equals', 12).size());
print('# c15_pasture', training.filterMetadata('reference', 'equals', 15).size());
print('# c19_annual_crops', training.filterMetadata('reference', 'equals', 19).size());
print('# c22_non_vegetated_area', training.filterMetadata('reference', 'equals', 22).size());
print('# c33_water', training.filterMetadata('reference', 'equals', 33).size());
print('# c48_yerba', training.filterMetadata('reference', 'equals', 48).size());
print('# c65_te', training.filterMetadata('reference', 'equals', 65).size());


// ============================================================
// SECTION 5 — EXPORT
// ============================================================
Export.table.toAsset({
    "collection": ee.FeatureCollection(totalSample),
    "description": region_name + '-col_' + collection + '-poly_v' + version_out + '_' + period,
    // 🔁 REPLACE: Update to your own GEE asset folder (see `outputAsset`
    // above).
    "assetId": outputAsset + region_name + '-col_' + collection + '-poly_v' + version_out + '_' + period
});

Export.table.toAsset({
    "collection": ee.FeatureCollection(training),
    "description": region_name + '-col_' + collection + '-points_v' + version_out + '_' + period,
    // 🔁 REPLACE: Update to your own GEE asset folder (see `outputAsset`
    // above).
    "assetId": outputAsset + region_name + '-col_' + collection + '-points_v' + version_out + '_' + period
});
