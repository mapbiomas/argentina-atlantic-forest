// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 04 — Stable Map, Stable Points & Complement Classification (Round 1)
// ============================================================
//
// DESCRIPTION:
//   For one region and period, gap-fills the per-year Round-1
//   preclassification (step 03 output), derives a per-pixel "stable"
//   reference map from how often each class occurs across the period
//   (frequency threshold `freq`, refined with an external forest-cover
//   consensus layer), draws a stratified sample of stable points, uses
//   them to retrain a per-year classifier, and exports both the stable
//   map/points and this refined ("complement") classification.
//
// METHODOLOGY:
//   1. Gap-fill the per-year Round-1 classification bands (same
//      forward/backward fill as used elsewhere in this pipeline
//      family).
//   2. For each of the 5 broad classes (3, 9, 10, 22, 33), build a
//      per-pixel frequency mask (`getFrenquencyMask`): count how many
//      years each pixel was classed as that class, keep pixels at or
//      above `freq`.
//   3. Combine the 5 frequency masks into one reference map, restricting
//      class 3 (forest) to pixels also flagged by an external
//      "consensus" forest-cover layer.
//   4. Export the stable map.
//   5. Draw a stratified sample of points from the stable map, sized per
//      class by `percent_*` (same pattern as step 03), extract predictor
//      values per year, and export the stable points.
//   6. For each year: train a classifier on the (single, not per-year)
//      stable-points sample and classify — this "complement
//      classification" is a refinement of the Round-1 preclassification
//      using only pixels the frequency analysis trusts.
//   7. Export the complement classification.
//
// INPUT:
//   - Round-1 preclassification (03-preclassification.js output).
//   - External forest-cover "consensus" raster
//     (`Consenso_bosque_var_col3`, public to this project).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions).
//   - Annual Landsat mosaics for Argentina.
//
// OUTPUT:
//   - Stable map. Exported as
//     `<region_name>stable_map_v<version>-col_6_<yearini>_clas1`.
//   - Stable points. Exported as
//     `<region_name>-stable_points_v<version>-col_6_<yearini>_clas1`.
//   - Complement classification (multi-year). Exported as
//     `step_04_<region_name>-col_6_<yearini>_class_v<version>_clas1`.
//
// NOTE (kept as in the original): several `.where()` branches for
// classes 36/48/65 (perennial crops / yerba / tea) and their supporting
// external rasters (`forestaciones_col3`, `yerbaycitrus_col3`,
// `te_col3`) are commented out — Round 1 only classifies the broad
// classes (3, 9, 10, 22, 33); those finer classes are introduced in
// later rounds (steps 07/10/13). Kept commented as found.
//
// USAGE NOTE: this script processes ONE region and ONE period per run —
// change `region_name`, `yearini`/`year_list`/`freq` (SECTION 1) and the
// per-region `percent_*` config (see step 03's USAGE NOTE — the same
// per-region variation applies here).
//
// PREVIOUS STEP: 03-preclassification.js (produces the per-year
//                classification this script stabilizes)
// NEXT STEP:     07-preclassification.js (Round 2, refines what this
//                round called class 10 "Otros")
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var region_name = "reg_1"; // reg_1 | reg_2 | reg_3
var period = "1985-1999";  // 1985-1999 | 2000-2025

var reg2 = 1; // region id used in the step-03 asset name (matches region_name's number)

var version_class_in = '1';
var version_class_in2 = 1;
var stage_in = 'step_03-class';
var stage_in2 = 3;

var version_stable_out = '1'; // Version that will be saved
var stage_out = 'step_04';

var nSamplesMax = 3000;
var nSamplesMin = 800;

// Per-class sample-balancing percentages — region-specific, same values
// as used in 03-preclassification.js for this region (see that script's
// SECTION 1 for the alternative regions' values).
var percent_03 = 20;
var percent_09 = 10;
var percent_10 = 58;
var percent_22 = 5;
var percent_33 = 7;

var periodConfig = {
    '1985-1999': {
        yearini: 1985,
        freq: 12, // stability threshold: pixel must be that class in >=12 of 15 years
        year_list: [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994,
            1995, 1996, 1997, 1998, 1999]
    },
    '2000-2025': {
        yearini: 2000,
        freq: 21, // stability threshold: pixel must be that class in >=21 of 26 years
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
// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions,
// property `Reg_id`).
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

// 🔁 REPLACE: Round-1 preclassification (03-preclassification.js output).
var class_map = ee.Image('projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/PRECLASSIFICATION/BA/step_0' + stage_in2 + '-class_reg_' + reg2 + "-col_6_" + yearini + '-class_v' + version_class_in2)
    .clip(myRegion);

var image = class_map;


// ============================================================
// SECTION 4 — GAP FILL
// ============================================================
var applyGapFill = function (image) {

    // apply the gap fill form t0 until tn
    var imageFilledt0tn = bandNames.slice(1)
        .iterate(
            function (bandName, previousImage) {

                var currentImage = image.select(ee.String(bandName));

                previousImage = ee.Image(previousImage);

                currentImage = currentImage.unmask(
                    previousImage.select([0]));

                return currentImage.addBands(previousImage);

            }, ee.Image(imageAllBands.select([bandNames.get(0)]))
        );

    imageFilledt0tn = ee.Image(imageFilledt0tn);

    // apply the gap fill form tn until t0
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

// get band names list
var bandNames = ee.List(
    year_list.map(
        function (year) {
            return 'classification_' + String(year);
        }
    )
);

// generate a histogram dictionary of [bandNames, image.bandNames()]
var bandsOccurrence = ee.Dictionary(
    bandNames.cat(image.bandNames()).reduce(ee.Reducer.frequencyHistogram())
);

// insert a masked band for any year missing from the input
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

// convert dictionary to image
var imageAllBands = ee.Image(
    bandNames.iterate(
        function (band, image) {
            return ee.Image(image).addBands(bandsDictionary.get(ee.String(band)));
        },
        ee.Image().select()
    )
);

// apply the gap fill
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

    var maskCollection = collection.map(function (image) {
        return image.eq(classIdInt);
    });

    var frequency = maskCollection.reduce(ee.Reducer.sum());

    var frequencyMask = frequency.gte(classFrequency[classId])
        .multiply(classIdInt)
        .toByte();

    frequencyMask = frequencyMask.mask(frequencyMask.eq(classIdInt));

    return frequencyMask.rename('frequency').set('class_id', classId);
};

// Round-1 classes only (3, 9, 10, 22, 33) — see NOTE above about the
// finer classes introduced in later rounds.
var classFrequency = { "3": freq, "9": freq, "10": freq, "22": freq, "33": freq };

var frequencyMasks = Object.keys(classFrequency).map(function (classId) {
    return getFrenquencyMask(collection, classId);
});

frequencyMasks = ee.ImageCollection.fromImages(frequencyMasks);

var referenceMap = frequencyMasks.reduce(ee.Reducer.firstNonNull());

// 🔁 REPLACE: External forest-cover consensus layer, used to restrict
// class 3 (forest) in the stable map.
var consenso_var_bosque = ee.Image('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/RASTER/Consenso_bosque_var_col3');

var base = ee.Image.constant(0).clip(myRegion);
var mascara_freq_mapref = base.where(referenceMap.eq(3).and(consenso_var_bosque.eq(1)), 3)
    .where(referenceMap.eq(9), 9)
    .where(referenceMap.eq(10), 10)
    .where(referenceMap.eq(22), 22)
    .where(referenceMap.eq(33), 33)
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
    "description": region_name + '-' + 'stable_map_v' + version_stable_out + "Collection_6_" + yearini + "_clas1",
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `outputStable` above).
    "assetId": outputStable + '/' + region_name + 'stable_map_v' + version_stable_out + "-col_6_" + yearini + "_clas1",
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": myRegion
});


// ============================================================
// SECTION 7 — STRATIFIED STABLE POINTS + PER-YEAR PREDICTOR EXTRACTION
// ============================================================
var bandNames2 = ee.List([
    "blue_median",
    "cai_median",
    "evi2_median",
    "evi2_median_dry",
    "evi2_median_wet",
    "gcvi_median_dry",
    "green_median",
    "green_median_wet",
    "green_min",
    "gv_stdDev",
    "gvs_median_wet",
    "ndfi_median",
    "ndfi_median_wet",
    "ndvi_median",
    "ndvi_median_wet",
    "ndwi_median",
    "ndwi_median_wet",
    "nir_median",
    "nir_median_wet",
    "nir_min",
    "red_median",
    "red_median_dry",
    "red_median_wet",
    "red_min",
    "savi_median",
    "savi_median_dry",
    "savi_median_wet",
    "shade_median",
    "swir1_median",
    "swir1_median_dry",
    "swir1_median_wet",
    "swir1_min",
    "swir2_median",
    "swir2_median_dry",
    "swir2_median_wet",
    "swir2_min",
    "wefi_median_wet"
]);

var num_train_03 = ee.Number(nSamplesMax * percent_03 / 100).round().int16().max(nSamplesMin);
var num_train_09 = ee.Number(nSamplesMax * percent_09 / 100).round().int16().max(nSamplesMin);
var num_train_10 = ee.Number(nSamplesMax * percent_10 / 100).round().int16().max(nSamplesMin);
var num_train_22 = ee.Number(nSamplesMax * percent_22 / 100).round().int16().max(nSamplesMin);
var num_train_33 = ee.Number(nSamplesMax * percent_33 / 100).round().int16().max(nSamplesMin);

var training_pt = stables_areas_filter.stratifiedSample({
    scale: 30, classBand: 'reference', numPoints: 10, region: myRegion, geometries: true,
    classValues: [3, 9, 10, 22, 33],
    classPoints: [num_train_03, num_train_09, num_train_10, num_train_22, num_train_33]
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

    if (year_id2 == 0) {
        stable_points = training;
    } else {
        stable_points = stable_points.merge(training);
    }
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
    "description": region_name + '-stable_points_v' + version_stable_out + "Collection_6_" + yearini + "_clas1",
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `outputAsset` above).
    "assetId": outputAsset + '/' + region_name + '-stable_points_v' + version_stable_out + "-col_6_" + yearini + "_clas1"
});


// ============================================================
// SECTION 9 — PER-YEAR RECLASSIFICATION (complement classification)
// ============================================================
var nTrees = 250;
var variablesPerSplit = 4; // mtry
var minLeafPopulation = 25; // Nnodes
var seed = 1;

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
    }).train(stable_points, 'reference', bandNames2);

    var classified = mosaicoTotal.classify(classifier).mask(mosaicoTotal.select('blue_median'));
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
    "description": region_name + '-' + 'col_6_' + yearini + '_class_v' + version_stable_out + "_clas1",
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + stage_out + '_' + region_name + '-' + 'col_6_' + yearini + '_class_v' + version_stable_out + "_clas1",
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": myRegion
});
