// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 15d — Class Dominance Filter: Yerba Mate vs Tea (Round 4)
// ============================================================
//
// DESCRIPTION:
//   For every pixel, compares yerba mate (48) vs. tea (65) frequency
//   across the full 1985–2025 series, and replaces EVERY year's pixel
//   value (where it's currently 48 or 65) with whichever of the pair is
//   more frequent over time. Same dominance pattern as step 09d
//   (grassland vs wetland). This is the FINAL step of Round 4 — its
//   output feeds directly into the Integration stage (step 16), there
//   is no additional temporal or spatial filter pass after this one.
//
// METHODOLOGY:
//   1. Compute each pixel's percent frequency of class 48 and class 65
//      across all years.
//   2. For each pixel, pick the dominant subclass (ties go to yerba
//      mate, 48 — see the `.gte()` below).
//   3. For every year, replace any pixel currently classed 48 or 65 with
//      the pixel's dominant subclass.
//   4. Mask out pixels with no value in any year and export.
//
// INPUT:
//   - Spatially filtered classification (step 15c output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     both to clip the working constant image and as the export region.
//
// OUTPUT:
//   - Final Round-4 classification. Exported as
//     `step_23_filter_temporal_yerbate_col6_v1_clas3_yerbate`.
//
// PREVIOUS STEP: 15c-spatial_filter_connected.js (produces the
//                classification this script corrects)
// NEXT STEP:     16-integration.js (Integration stacks this round's
//                output together with Round 3's)
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
var reg_union = regions.union();

// 🔁 REPLACE: Spatially filtered classification (step 15c output).
var class4 = ee.Image(dir_pre_class + "/step_22_spatial_filter_col6_v1_clas3_yerbate").unmask(0).clip(reg_union);


// ============================================================
// SECTION 4 — DOMINANT-SUBCLASS FREQUENCY (per pixel, across all years)
// ============================================================
var computeFrequency = function (mapbiomas) {
    var exp = '100*((b(0)+b(1)+b(2)+b(3)+b(4)+b(5)+b(6)+b(7)+b(8)+b(9)+b(10)+b(11)+b(12)+b(13)+b(14)+b(15)' +
        '+b(16)+b(17)+b(18)+b(19)+b(20)+b(21)+b(22)+b(23)+b(24)+b(25)+b(26)+b(27)+b(28)+b(29)+b(30)+b(31)+b(32)+b(33)' +
        '+b(34)+b(35)+b(36)+b(37)+b(38)+b(39)+b(40))/41)';

    var yerbaFreq = mapbiomas.eq(48).expression(exp);
    var teFreq = mapbiomas.eq(65).expression(exp);

    var output = yerbaFreq.addBands(teFreq);
    output = output.select(['constant', 'constant_1'], ['yerbaFreq', 'teFreq']);
    return output;
};

var frequency = computeFrequency(class4);


// ============================================================
// SECTION 5 — DOMINANT CLASS PER PIXEL
// ============================================================
var constant = ee.Image.constant(0).clip(reg_union);
var dom = constant
    .where(frequency.select('yerbaFreq').gte(frequency.select('teFreq')), 48)
    .where(frequency.select('teFreq').gt(frequency.select('yerbaFreq')), 65);


// ============================================================
// SECTION 6 — APPLY DOMINANCE CORRECTION (per year)
// ============================================================
var applyDominanceFilter = function (image) {
    return image.where(image.eq(48).or(image.eq(65)), dom);
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
    'assetId': dir_pre_class + '/step_23_filter_temporal_yerbate_col6_' + version_out + "_clas3_yerbate",
    'pyramidingPolicy': { '.default': 'mode' },
    'region': regions,
    'scale': 30,
    'maxPixels': 1e13
});
