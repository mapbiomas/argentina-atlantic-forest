// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 06c — Spatial Filter: Connected Components (Round 1)
// ============================================================
//
// DESCRIPTION:
//   For classes 3 (forest), 9 (forest plantation) and 10 ("Otros"),
//   removes small connected patches (<= 6 pixels, ~5.4 ha — below the
//   10 ha the comment targets, kept as found) by replacing them with
//   the 60 m-radius focal mode of their neighborhood.
//
// METHODOLOGY:
//   1. For each year and each of the 3 classes: mask the pixels of that
//      class, find connected components (plus-shaped connectivity, size
//      capped at 50 for the labeling step) and their sizes
//      (8-connected, capped at 50).
//   2. Small patches (<=6 connected pixels) are replaced by a 60 m focal
//      mode of the same class computed from the surrounding pixels of
//      that class; larger patches are left untouched.
//   3. Blend the correction onto the original band, repeat for every
//      year, then for every class (the previous class's correction is
//      visible to the next class's pass).
//   4. Stack all years (dropping the placeholder constant band used to
//      seed the stack) and export.
//
// INPUT:
//   - Spatially filtered classification (step 06b output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     both to clip the working constant image and as the export region.
//
// OUTPUT:
//   - Further spatially filtered classification. Exported as
//     `step_07b_spatial_filter_col6_v1_clas1`.
//
// USAGE NOTE: this exact connected-component filter is reused later in
// the pipeline (06g-spatial_filter_connected_final.js) on a different,
// later-stage input — same algorithm, different pipeline position.
//
// PREVIOUS STEP: 06b-spatial_filter_mode.js (produces the classification
//                this script filters further)
// NEXT STEP:     06d-temporal_filter_allclasses.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (adapted by Pablo
//          Baldassini, May 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var vesion_in = 'v1'; // spatial-filter (mode) version being read
var version_out = 'v1';

var classes = [3, 9, 10];

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
var reg_union = regions.union();

// 🔁 REPLACE: Spatially filtered classification (step 06b output).
var class4GAP = ee.Image(dir_pre_class + '/step_07a_filter_spatial_col6_' + vesion_in + "_clas1");

var constant = ee.Image.constant(0).clip(reg_union);


// ============================================================
// SECTION 4 — CONNECTED-COMPONENT SPATIAL FILTER
// ============================================================
var spatialfilter = function (valor, ano, imagem) {
    var mask = imagem.select('classification_' + (ano)).eq(valor);
    var maskclase = mask.updateMask(mask);

    var objectId = maskclase.connectedComponents({
        connectedness: ee.Kernel.plus(1),
        maxSize: 50
    });
    var objectSize = objectId.select('labels')
        .connectedPixelCount({
            maxSize: 50, eightConnected: true
        });

    // minimum size threshold: 6 connected pixels
    var objectSize_filtr = objectSize.lte(6).eq(0).unmask(constant);
    var clasesnovalor = (imagem.select('classification_' + (ano)).neq(valor).add(objectSize_filtr)).gte(1);
    var maskclasvalor = imagem.select('classification_' + (ano)).updateMask(clasesnovalor);

    // focal mode filter
    var filteredclas = maskclasvalor.focalMode({
        radius: 60,
        kernelType: 'square',
        units: 'meters',
    });

    var objectSize_filtr2 = objectSize.lte(6).unmask(constant);
    var tope = filteredclas.updateMask(objectSize_filtr2);
    var classfilteredvalor = imagem.select('classification_' + (ano)).blend(tope);

    return classfilteredvalor;
};

var appliedspatialfilter = function (imagem, valor) {
    var img_out = constant;
    for (var i = 0; i < years.length; i++) {
        var ano = years[i];
        img_out = img_out.addBands(spatialfilter(valor, ano, imagem));
    }
    return img_out;
};

var filtered = class4GAP;

for (var i_class = 0; i_class < classes.length; i_class++) {
    var id_class = classes[i_class];
    filtered = appliedspatialfilter(filtered, id_class);
}

// band 0 is the placeholder constant used to seed the stack — drop it
var bandIndices = years.map(function (year, i) { return i + 1; });
var imgfilterspatial = filtered.select(bandIndices);


// ============================================================
// SECTION 5 — EXPORT
// ============================================================
Export.image.toAsset({
    "image": imgfilterspatial.toInt8(),
    "description": 'spatial_filter_' + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + '/step_07b_spatial_filter_col6_' + version_out + "_clas1",
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": regions
});
