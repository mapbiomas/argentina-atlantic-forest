// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 11 — Stable Map, Stable Points & Complement Classification (Round 3)
// ============================================================
//
// DESCRIPTION:
//   Round-3 equivalent of 04-stable_map.js / 08-stable_map.js: gap-fills
//   the per-year Round-3 preclassification (step 10 output), derives a
//   stable reference map for classes 15/19 from per-class frequency,
//   draws stable points, and reclassifies per year, masking every year's
//   reclassification to Round 2's class-14 pixels.
//
// METHODOLOGY: identical to 04-stable_map.js (SECTIONS 4-9), with: no
// forest-cover consensus mask (not applicable), only 2 classes (15, 19)
// in the frequency/stable-point steps, and SECTION 9's per-year
// reclassification masked to Round 2's class 14 (from
// `step_14_spatial_filter_col6_v1_clas2`) instead of Round 1's class 10.
//
// INPUT:
//   - Round 3 preclassification (10-preclassification.js output).
//   - Round 2's final classification (09f output), used as a mask.
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions).
//   - Annual Landsat mosaics for Argentina.
//
// OUTPUT:
//   - Stable map. Exported as
//     `<region_name>stable_map_v<version>-col_6_<yearini>_clas3`.
//   - Stable points. Exported as
//     `<region_name>-stable_points_v<version>-col_6_<yearini>_clas3`.
//   - Complement classification (multi-year, masked to Round 2's class
//     14). Exported as
//     `step_04_<region_name>-col_6_<yearini>_class_v<version>_clas3`.
//
// USAGE NOTE: this script processes ONE region and ONE period per run —
// change `region_name`, `yearini`/`year_list`/`freq` (SECTION 1) and the
// per-region `percent_*` config.
//
// PREVIOUS STEP: 10-preclassification.js (produces the per-year
//                classification this script stabilizes)
// NEXT STEP:     12a-merge.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var region_name = "reg_1"; // reg_1 | reg_2 | reg_3
var period = "1985-1999";  // 1985-1999 | 2000-2025

var reg2 = 1; // region id used in the step-03 asset name (matches region_name's number)

var version_class_in2 = 3;
var stage_in2 = 3;

var version_stable_out = '1'; // Version that will be saved
var stage_out = 'step_04';

var nSamplesMax = 3500;
var nSamplesMin = 3000;

// Per-class sample-balancing percentages — region-specific.
var percent_15 = 40;
var percent_19 = 60;

var periodConfig = {
    '1985-1999': {
        yearini: 1985,
        freq: 12,
        year_list: [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994,
            1995, 1996, 1997, 1998, 1999]
    },
    '2000-2025': {
        yearini: 2000,
        freq: 21,
        year_list: [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
            2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    }
};

var yearini = periodConfig[period].yearini;
var freq = periodConfig[period].freq;
var year_list = periodConfig[period].year_list;


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name);

// 🔁 REPLACE: Annual Landsat mosaics for Argentina.
var dirasset = 'projects/YOUR-PROJECT/LANDSAT/ARGENTINA/mosaics-1';
// 🔁 REPLACE: Update to your own GEE asset folder for the stable-points
// output.
var outputAsset = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/SAMPLES/RANDOM_STABLE/BA';
// 🔁 REPLACE: Update to your own GEE asset folder for the stable-map
// output.
var outputStable = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/STABLEMAP/BA';
// 🔁 REPLACE: Update to your own GEE asset folder for the complement
// classification output.
var dir_pre_class = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA';
// 🔁 REPLACE: Round 2's final classification (09f output), used as a
// class-14 mask.
var dir_filters = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA';

// 🔁 REPLACE: Round-3 preclassification (10-preclassification.js output).
var class_map = ee.Image('projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/PRECLASSIFICATION/BA/step_0' + stage_in2 + '-class_reg_' + reg2 + "-col_6_" + yearini + '-class_v' + version_class_in2)
    .clip(myRegion);

var image = class_map;


// ============================================================
// SECTION 4 — GAP FILL
// ============================================================
var applyGapFill = function (image) {
    var imageFilledt0tn = bandNames.slice(1)
        .iterate(
            function (bandName, previousImage) {
                var currentImage = image.select(ee.String(bandName));
                previousImage = ee.Image(previousImage);
                currentImage = currentImage.unmask(previousImage.select([0]));
                return currentImage.addBands(previousImage);
            }, ee.Image(imageAllBands.select([bandNames.get(0)]))
        );

    imageFilledt0tn = ee.Image(imageFilledt0tn);

    var bandNamesReversed = bandNames.reverse();

    var imageFilledtnt0 = bandNamesReversed.slice(1)
        .iterate(
            function (bandName, previousImage) {
                var currentImage = imageFilledt0tn.select(ee.String(bandName));
                previousImage = ee.Image(previousImage);
                currentImage = currentImage.unmask(
                    previousImage.select(previousImage.bandNames().length().subtract(1)));
                return previousImage.addBands(currentImage);
            }, ee.Image(imageFilledt0tn.select([bandNamesReversed.get(0)]))
        );

    imageFilledtnt0 = ee.Image(imageFilledtnt0).select(bandNames);

    return imageFilledtnt0;
};

var bandNames = ee.List(
    year_list.map(function (year) { return 'classification_' + String(year); })
);

var bandsOccurrence = ee.Dictionary(
    bandNames.cat(image.bandNames()).reduce(ee.Reducer.frequencyHistogram())
);

var bandsDictionary = bandsOccurrence.map(
    function (key, value) {
        return ee.Image(
            ee.Algorithms.If(
                ee.Number(value).eq(2),
                image.select([key]).byte(),
                ee.Image().rename([key]).byte().updateMask(image.select(0))
            )
        );
    }
);

var imageAllBands = ee.Image(
    bandNames.iterate(
        function (band, image) {
            return ee.Image(image).addBands(bandsDictionary.get(ee.String(band)));
        },
        ee.Image().select()
    )
);

var imageFilledtnt0 = applyGapFill(imageAllBands);
var filtered2 = ee.Image(imageFilledtnt0);


// ============================================================
// SECTION 5 — PER-CLASS FREQUENCY MASK -> STABLE MAP
// ============================================================
var colList = ee.List([]);
for (var i_year = 0; i_year < year_list.length; i_year++) {
    var year = year_list[i_year];
    var colYear = filtered2.select('classification_' + year).rename('remapped');
    colList = colList.add(colYear);
}

var collection = ee.ImageCollection(colList);

var getFrenquencyMask = function (collection, classId) {
    var classIdInt = parseInt(classId, 10);
    var maskCollection = collection.map(function (image) { return image.eq(classIdInt); });
    var frequency = maskCollection.reduce(ee.Reducer.sum());
    var frequencyMask = frequency.gte(classFrequency[classId]).multiply(classIdInt).toByte();
    frequencyMask = frequencyMask.mask(frequencyMask.eq(classIdInt));
    return frequencyMask.rename('frequency').set('class_id', classId);
};

var classFrequency = { "15": freq, "19": freq };

var frequencyMasks = Object.keys(classFrequency).map(function (classId) {
    return getFrenquencyMask(collection, classId);
});

frequencyMasks = ee.ImageCollection.fromImages(frequencyMasks);

var referenceMap = frequencyMasks.reduce(ee.Reducer.firstNonNull());

var base = ee.Image.constant(0).clip(myRegion);
var mascara_freq_mapref = base
    .where(referenceMap.eq(15), 15)
    .where(referenceMap.eq(19), 19)
    .rename("reference")
    .selfMask();

var stables_areas_filter = mascara_freq_mapref;

stables_areas_filter = stables_areas_filter
    .set('collection', 6)
    .set('version', version_stable_out)
    .set('region_name', region_name)
    .set('step', stage_out)
    .set('type', 'region');


// ============================================================
// SECTION 6 — EXPORT STABLE MAP
// ============================================================
Export.image.toAsset({
    "image": stables_areas_filter.toInt8(),
    "description": region_name + '-' + 'stable_map_v' + version_stable_out + "Collection_6_" + yearini + "_clas3",
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `outputStable` above).
    "assetId": outputStable + '/' + region_name + 'stable_map_v' + version_stable_out + "-col_6_" + yearini + "_clas3",
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": myRegion
});


// ============================================================
// SECTION 7 — STRATIFIED STABLE POINTS + PER-YEAR PREDICTOR EXTRACTION
// ============================================================
var bandNames2 = ee.List([
    "blue_median", "cai_median", "evi2_median", "evi2_median_dry", "evi2_median_wet",
    "gcvi_median_dry", "green_median", "green_median_wet", "green_min", "gv_stdDev",
    "gvs_median_wet", "ndfi_median", "ndfi_median_wet", "ndvi_median", "ndvi_median_wet",
    "ndwi_median", "ndwi_median_wet", "nir_median", "nir_median_wet", "nir_min",
    "red_median", "red_median_dry", "red_median_wet", "red_min", "savi_median",
    "savi_median_dry", "savi_median_wet", "shade_median", "swir1_median", "swir1_median_dry",
    "swir1_median_wet", "swir1_min", "swir2_median", "swir2_median_dry", "swir2_median_wet",
    "swir2_min", "wefi_median_wet"
]);

var num_train_15 = ee.Number(nSamplesMax * percent_15 / 100).round().int16().max(nSamplesMin);
var num_train_19 = ee.Number(nSamplesMax * percent_19 / 100).round().int16().max(nSamplesMin);

var training_pt = stables_areas_filter.stratifiedSample({
    scale: 30, classBand: 'reference', numPoints: 10, region: myRegion, geometries: true,
    classValues: [15, 19],
    classPoints: [num_train_15, num_train_19]
});

var stable_points;

for (var year_id2 in year_list) {
    var year2 = year_list[year_id2];

    var mosaic = ee.ImageCollection(dirasset)
        .filterMetadata('year', 'equals', year2)
        .filterBounds(myRegion.geometry())
        .mosaic();

    mosaic = mosaic.select(bandNames2).addBands(stables_areas_filter);

    var training = mosaic.sampleRegions({
        'collection': training_pt,
        'properties': ['reference'],
        'geometries': true,
        'scale': 30
    });

    training = training.map(function (feat) { return feat.set({ 'year': year2 }); });
    training = training.map(function (feat) { return feat.set({ 'region_name': region_name }); });

    if (year_id2 == 0) { stable_points = training; }
    else { stable_points = stable_points.merge(training); }
}

stable_points = stable_points
    .set('collection', 6)
    .set('version', version_stable_out)
    .set('region_name', region_name)
    .set('step', stage_out)
    .set('type', 'region');


// ============================================================
// SECTION 8 — EXPORT STABLE POINTS
// ============================================================
Export.table.toAsset({
    "collection": ee.FeatureCollection(stable_points),
    "description": region_name + '-stable_points_v' + version_stable_out + "Collection_6_" + yearini + "_clas3",
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `outputAsset` above).
    "assetId": outputAsset + '/' + region_name + '-stable_points_v' + version_stable_out + "-col_6_" + yearini + "_clas3"
});


// ============================================================
// SECTION 9 — PER-YEAR RECLASSIFICATION (masked to Round 2's class 14)
// ============================================================
var nTrees = 250;
var variablesPerSplit = 4;
var minLeafPopulation = 25;
var seed = 1;

// 🔁 REPLACE: Round 2's final classification (09f output).
var clasif_base = ee.Image(dir_filters + '/step_14_spatial_filter_col6_v1_clas2').clip(myRegion);

var classifiedStack;

for (var year_id3 in year_list) {
    var year3 = year_list[year_id3];
    var mosaicoTotal = ee.ImageCollection(dirasset)
        .filterMetadata('year', 'equals', year3)
        .filterBounds(myRegion.geometry())
        .mosaic().clip(myRegion);

    mosaicoTotal = mosaicoTotal.select(bandNames2);

    var classifier = ee.Classifier.smileRandomForest({
        'numberOfTrees': nTrees,
        'variablesPerSplit': variablesPerSplit,
        'minLeafPopulation': minLeafPopulation,
        'seed': seed
    }).train(stable_points.filterMetadata("year", "equals", year3), 'reference', bandNames2);

    var clasif_otros = clasif_base.select('classification_' + year3).eq(14);

    var classified = mosaicoTotal.classify(classifier).mask(mosaicoTotal.select('blue_median')).updateMask(clasif_otros);
    classified = classified.select(['classification'], ['classification_' + year3]).clip(myRegion).toInt8();

    if (year_id3 == 0) { classifiedStack = classified; }
    else { classifiedStack = classifiedStack.addBands(classified); }
}

classifiedStack = classifiedStack
    .set('collection', 6)
    .set('version', version_stable_out)
    .set('region_name', region_name)
    .set('step', stage_out)
    .set('type', 'region');


// ============================================================
// SECTION 10 — EXPORT COMPLEMENT CLASSIFICATION
// ============================================================
Export.image.toAsset({
    "image": classifiedStack.toInt8(),
    "description": region_name + '-' + 'col_6_' + yearini + '_class_v' + version_stable_out + "_clas3",
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + stage_out + '_' + region_name + '-' + 'col_6_' + yearini + '_class_v' + version_stable_out + "_clas3",
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": myRegion
});
