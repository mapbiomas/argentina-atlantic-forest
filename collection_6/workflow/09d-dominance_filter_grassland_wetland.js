// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 09d — Class Dominance Filter: Grassland vs Wetland (Round 2)
// ============================================================
//
// DESCRIPTION:
//   For every pixel, compares grassland (12) vs. wetland (11) frequency
//   across the full 1985–2025 series, and replaces EVERY year's pixel
//   value (where it's currently 11 or 12) with whichever of the pair is
//   more frequent over time — a pixel doesn't flip between grassland and
//   wetland year to year based on the series-wide dominant subclass.
//   Same pattern as the dominance step used elsewhere in this pipeline
//   family (compare Round 1's absence of this step — forest/shrubland
//   dominance isn't relevant there — with Cuyo/other territories'
//   dominance filters).
//
// METHODOLOGY:
//   1. Compute each pixel's percent frequency of class 12 and class 11
//      across all years (`grassFreq`/`umiFreq` — "umi" from "úmido",
//      i.e. wet).
//   2. For each pixel, pick the dominant subclass (ties go to grassland,
//      12 — see the `.gte()` below).
//   3. For every year, replace any pixel currently classed 11 or 12 with
//      the pixel's dominant subclass.
//   4. Mask out pixels with no value in any year and export.
//
// INPUT:
//   - Spatially filtered classification (step 09c output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     both to clip the working constant image and as the export region.
//
// OUTPUT:
//   - Dominance-corrected classification. Exported as
//     `step_12_filter_temporal_grasshumcol6_v1_clas2` (note: kept the
//     original's asset-name spelling, which omits an underscore before
//     "col6").
//
// PREVIOUS STEP: 09c-spatial_filter_connected.js (produces the
//                classification this script corrects)
// NEXT STEP:     09e-temporal_filter_allclasses.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var version_out = "v1";

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
var target_values = ee.Filter.inList('Reg_id', ["reg_1", "reg_2", "reg_3"]);
var reg_union = regions.filter(target_values).union();

// 🔁 REPLACE: Spatially filtered classification (step 09c output).
var clasif = ee.Image(dir_pre_class + '/step_11_spatial_filter_col6_v1_clas2');
var class4 = clasif.unmask(0).clip(reg_union);


// ============================================================
// SECTION 4 — DOMINANT-SUBCLASS FREQUENCY (per pixel, across all years)
// ============================================================
var computeFrequency = function (mapbiomas) {
    var exp = '100*((b(0)+b(1)+b(2)+b(3)+b(4)+b(5)+b(6)+b(7)+b(8)+b(9)+b(10)+b(11)+b(12)+b(13)+b(14)+b(15)' +
        '+b(16)+b(17)+b(18)+b(19)+b(20)+b(21)+b(22)+b(23)+b(24)+b(25)+b(26)+b(27)+b(28)+b(29)+b(30)+b(31)+b(32)+b(33)' +
        '+b(34)+b(35)+b(36)+b(37)+b(38)+b(39)+b(40))/41)';

    var grassFreq = mapbiomas.eq(12).expression(exp);
    var umiFreq = mapbiomas.eq(11).expression(exp);

    var output = grassFreq.addBands(umiFreq);
    output = output.select(['constant', 'constant_1'], ['grassFreq', 'umiFreq']);
    return output;
};

var frequency = computeFrequency(class4);


// ============================================================
// SECTION 5 — DOMINANT CLASS PER PIXEL
// ============================================================
var constant = ee.Image.constant(0).clip(reg_union);
var dom = constant
    .where(frequency.select('grassFreq').gt(frequency.select('umiFreq')), 12)
    .where(frequency.select('umiFreq').gte(frequency.select('grassFreq')), 11);


// ============================================================
// SECTION 6 — APPLY DOMINANCE CORRECTION (per year)
// ============================================================
var applyDominanceFilter = function (image) {
    return image.where(image.eq(11).or(image.eq(12)), dom);
};

var applyToAllBands = function (image) {
    var result = constant;
    for (var i = 0; i < years.length; i++) {
        var year = years[i];
        result = result.addBands(applyDominanceFilter(image.select("classification_" + year)));
    }
    return result;
};

var reclassifiedCollection = applyToAllBands(class4);
var bandIndices = years.map(function (year, i) { return i + 1; });
var imgfilterdom = reclassifiedCollection.select(bandIndices);

var mascaracero = imgfilterdom.gt(0);
var imgfilterdommasked = imgfilterdom.updateMask(mascaracero);


// ============================================================
// SECTION 7 — EXPORT
// ============================================================
Export.image.toAsset({
    'image': imgfilterdommasked,
    'description': 'frequency_filter_' + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    'assetId': dir_pre_class + '/step_12_filter_temporal_grasshum_col6_' + version_out + "clas2",
    'pyramidingPolicy': { '.default': 'mode' },
    'region': regions,
    'scale': 30,
    'maxPixels': 1e13
});
