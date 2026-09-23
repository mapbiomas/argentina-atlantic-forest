// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 09f — Spatial Filter: Connected Components, Final Pass (Round 2)
// ============================================================
//
// DESCRIPTION:
//   Final Round-2 post-processing step: re-applies the connected-
//   component spatial filter (same algorithm as step 09c/06c) to the
//   temporally filtered result.
//
// METHODOLOGY: identical to step 06c — see that script for the full
// algorithm description.
//
// INPUT:
//   - Temporally filtered classification (step 09e output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     both to clip the working constant image and as the export region.
//
// OUTPUT:
//   - Final Round-2 classification. Exported as
//     `step_14_spatial_filter_col6_v1_clas2`. This is the asset later
//     rounds (steps 10 and 13) read as their base classification to
//     mask against.
//
// PREVIOUS STEP: 09e-temporal_filter_allclasses.js (produces the
//                classification this script filters)
// NEXT STEP:     10-preclassification.js (Round 3, refines this round's
//                class 14 "Agropecuario") and 13-preclassification.js
//                (Round 4, refines this round's class 36 "Perennial
//                crops") — both branch from this same output.
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var version_out = 'v1';

var classes = [11, 12, 14, 36];

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

// 🔁 REPLACE: Temporally filtered classification (step 09e output).
var class4GAP = ee.Image(dir_pre_class + "/step_13_filter_temporal_allclasses_col6_v1_clas2");

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
        .connectedPixelCount({ maxSize: 50, eightConnected: true });

    var objectSize_filtr = objectSize.lte(6).eq(0).unmask(constant);
    var clasesnovalor = (imagem.select('classification_' + (ano)).neq(valor).add(objectSize_filtr)).gte(1);
    var maskclasvalor = imagem.select('classification_' + (ano)).updateMask(clasesnovalor);

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
    "assetId": dir_pre_class + '/step_14_spatial_filter_col6_' + version_out + "_clas2",
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": regions
});
