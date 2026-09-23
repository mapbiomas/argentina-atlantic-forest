// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 03 — Preclassification (Round 1: broad classes)
// ============================================================
//
// I - General - Forest, Forest Plantation, Water and Other
// forest: 3 | forest plantation: 9 | water: 33 | non-vegetated: 22
// other (yerba, te, annual crops, pastures, grassland, wetland): 10
//
// This is the FIRST of four hierarchical classification rounds in this
// pipeline. Round 1 classifies only broad classes (forest, forest
// plantation, water, non-vegetated area) and lumps everything else
// (wetland, grassland, pasture, annual crops, yerba mate, tea) into a
// single catch-all class 10 ("Otros"). Later rounds (steps 07, 10, 13)
// re-run this same kind of classification restricted to the areas
// mapped as class 10 here, progressively splitting it into finer
// classes — see the pipeline README for the full round-by-round legend.
//
// DESCRIPTION:
//   For one region and period, trains a Random Forest classifier per
//   year on a balanced sample (capped per class, remapping the
//   "other"-group classes to a single class 10) and classifies every
//   year in the period.
//
// METHODOLOGY:
//   1. Load the region's training points (02-export_points.js output);
//      for the 2000-2025 period, both the 1985 and 2000 point sets are
//      merged in (see USAGE NOTE).
//   2. Shuffle and cap the training points per class
//      (`nSamplesMax * percent_<class> / 100`, floored at `nSamplesMin`).
//   3. Remap the "other" classes (11, 12, 15, 19, 48, 65 — wetland,
//      grassland, pasture, annual crops, yerba mate, tea) to class 10.
//   4. For each year in the period: build the year's predictor mosaic
//      (`bandNames`), train a classifier on the balanced sample, and
//      classify.
//   5. Stack all years into one multi-year image and export.
//
// INPUT:
//   - Training points (02-export_points.js output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions, property
//     `Reg_id`).
//   - Annual Landsat mosaics for Argentina.
//   - ALOS World 3D-30m terrain slope (public, computed but not
//     currently in `bandNames` — see NOTE).
//
// OUTPUT:
//   - Multi-year classification image for the region and period, one
//     `classification_<year>` band per year. Exported as
//     `step_03-class_<region_name>-col_6_<anio>-class_v<version>`.
//
// NOTE (kept as in the original): `slope` is computed (from
// `JAXA/ALOS/AW3D30_V1_1`) and a `square` kernel is defined, but neither
// is referenced anywhere else in the script — `bandNames` does not
// include slope. Kept as found; may be leftover from an earlier version
// of the predictor set.
//
// USAGE NOTE: this script processes ONE region and ONE period per run —
// change `region_name` and `period` (SECTION 1), and re-set the
// per-class `percent_*` sample-balancing config (SECTION 1) for that
// region (see the commented alternative below SECTION 1's config for
// another region's values). For the 2000-2025 period, the training
// points from BOTH the 1985 and 2000 point exports are merged as the
// training pool (the 1985-1999 period uses only the 1985 points).
//
// PREVIOUS STEP: 02-export_points.js (produces the training points used
//                here)
// NEXT STEP:     04-stable_map.js (uses this classification to build the
//                stable-pixel map)
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (adapted by Pablo
//          Baldassini, May 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var region_name = "reg_1"; // reg_1 | reg_2 | reg_3
var period = "1985-1999";  // 1985-1999 | 2000-2025

var collection = "6";
var version_samples_in = '1';
var version_class_out = '1'; // Version that will be saved
var stage = 'step_03-class';

var nSamplesMin = 500;
var nSamplesMax = 3000;

// Per-class sample-balancing percentages — region-specific (which
// classes are active/commented out depends on what's present in that
// region). Shown below: region 1's config. Region 2/3 example (kept as
// a record of what varies):
// percent_03 = 60, percent_15 = 8, percent_19 = 8, percent_22 = 3,
// with percent_11/percent_12 disabled (not present in that region).
var percent_03 = 13;
var percent_09 = 8;
var percent_11 = 17;
var percent_12 = 43;
var percent_15 = 2;
var percent_19 = 2;
var percent_22 = 2;
var percent_33 = 3;
var percent_48 = 5;
var percent_65 = 5;

// random forest parameters
var nTrees = 250;
var variablesPerSplit = 4; // mtry
var minLeafPopulation = 25; // Nnodes
var seed = 1;


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions,
// property `Reg_id`).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name);

// 🔁 REPLACE: Annual Landsat mosaics for Argentina.
var dirasset = 'projects/YOUR-PROJECT/LANDSAT/ARGENTINA/mosaics-1';
// 🔁 REPLACE: Training points (02-export_points.js output).
var dir_Samples = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/SAMPLES/STABLE/BA/';
// 🔁 REPLACE: Update to your own GEE asset folder for the classification
// output.
var dir_pre_class = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/PRECLASSIFICATION/BA/';

var yearsByPeriod = {
    '1985-1999': {
        anio: '1985',
        year_list: [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994,
            1995, 1996, 1997, 1998, 1999]
    },
    '2000-2025': {
        anio: '2000',
        year_list: [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
            2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    }
};

var anio = yearsByPeriod[period].anio;
var year_list = yearsByPeriod[period].year_list;

// Training points: the 2000-2025 period merges in the 1985 points too
// (see USAGE NOTE).
var colecao_pontos;
if (period === '2000-2025') {
    var samples_1985 = ee.FeatureCollection(dir_Samples + region_name + '-col_' + collection + '-points_v' + version_samples_in + '_1985');
    var samples_2000 = ee.FeatureCollection(dir_Samples + region_name + '-col_' + collection + '-points_v' + version_samples_in + '_2000');
    colecao_pontos = samples_1985.merge(samples_2000);
} else {
    colecao_pontos = ee.FeatureCollection(dir_Samples + region_name + '-col_' + collection + '-points_v' + version_samples_in + '_' + anio);
}

var totalSample = colecao_pontos.filterBounds(myRegion);
print(totalSample.size(), "total points");


// ============================================================
// SECTION 4 — SAMPLE SHUFFLE + PER-CLASS BALANCING
// ============================================================
var shuffle = function (collection, seed) {

    // Adds a column of deterministic pseudorandom numbers to a collection.
    // The range 0 (inclusive) to 1000000000 (exclusive).
    collection = collection.randomColumn('random', seed || 1)
        .sort('random', true)
        .map(
            function (feature) {
                var rescaled = ee.Number(feature.get('random'))
                    .multiply(1000000000)
                    .round();
                return feature.set('new_id', rescaled);
            }
        );

    // list of random ids
    var randomIdList = ee.List(
        collection.reduceColumns(ee.Reducer.toList(), ['new_id'])
            .get('list'));

    // list of sequential ids
    var sequentialIdList = ee.List.sequence(1, collection.size());

    // set new ids
    var shuffled = collection.remap(randomIdList, sequentialIdList, 'new_id');

    return shuffled;
};

// shuffle points and reindex them
var shuffledtraining = shuffle(totalSample, 2);

var num_train_03 = ee.Number(nSamplesMax * percent_03 / 100).round().int16().max(nSamplesMin);
var train_03 = shuffledtraining.filterMetadata('reference', 'equals', 3).limit(num_train_03);
var num_train_09 = ee.Number(nSamplesMax * percent_09 / 100).round().int16().max(nSamplesMin);
var train_09 = shuffledtraining.filterMetadata('reference', 'equals', 9).limit(num_train_09);
var num_train_11 = ee.Number(nSamplesMax * percent_11 / 100).round().int16().max(nSamplesMin);
var train_11 = shuffledtraining.filterMetadata('reference', 'equals', 11).limit(num_train_11);
var num_train_12 = ee.Number(nSamplesMax * percent_12 / 100).round().int16().max(nSamplesMin);
var train_12 = shuffledtraining.filterMetadata('reference', 'equals', 12).limit(num_train_12);
var num_train_15 = ee.Number(nSamplesMax * percent_15 / 100).round().int16().max(nSamplesMin);
var train_15 = shuffledtraining.filterMetadata('reference', 'equals', 15).limit(num_train_15);
var num_train_19 = ee.Number(nSamplesMax * percent_19 / 100).round().int16().max(nSamplesMin);
var train_19 = shuffledtraining.filterMetadata('reference', 'equals', 19).limit(num_train_19);
var num_train_22 = ee.Number(nSamplesMax * percent_22 / 100).round().int16().max(nSamplesMin);
var train_22 = shuffledtraining.filterMetadata('reference', 'equals', 22).limit(num_train_22);
var num_train_33 = ee.Number(nSamplesMax * percent_33 / 100).round().int16().max(nSamplesMin);
var train_33 = shuffledtraining.filterMetadata('reference', 'equals', 33).limit(num_train_33);
var num_train_48 = ee.Number(nSamplesMax * percent_48 / 100).round().int16().max(nSamplesMin);
var train_48 = shuffledtraining.filterMetadata('reference', 'equals', 48).limit(num_train_48);
var num_train_65 = ee.Number(nSamplesMax * percent_65 / 100).round().int16().max(nSamplesMin);
var train_65 = shuffledtraining.filterMetadata('reference', 'equals', 65).limit(num_train_65);

var balancedtraining = train_03.merge(train_09).merge(train_11).merge(train_12).merge(train_15).merge(train_19).merge(train_22).merge(train_33).merge(train_48).merge(train_65);

// remap the "other" classes to class 10
var clases = ee.List([11, 12, 15, 19, 48, 65]);

var balancedtraining2 = balancedtraining.map(function (feat) {
    var ref = ee.Number(feat.get('reference'));
    var nuevo = ee.Algorithms.If(
        clases.contains(ref),
        10,
        ref
    );
    return feat.set('reference', nuevo);
});


// ============================================================
// SECTION 5 — PER-YEAR TRAIN + CLASSIFY
// ============================================================
var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
var slope = ee.Terrain.slope(terrain);
var square = ee.Kernel.square({ radius: 5 });

var bandNames = ee.List([
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

var collectionimg = ee.ImageCollection(dirasset);

var classifiedStack;

for (var year_id in year_list) {
    var year = year_list[year_id];

    var mosaicoTotal = ee.ImageCollection(collectionimg)
        .filterMetadata('year', 'equals', year)
        .filterBounds(myRegion)
        .mosaic()
        .clip(myRegion);

    mosaicoTotal = mosaicoTotal.select(bandNames);
    var training_img = mosaicoTotal.sampleRegions(balancedtraining2, ['reference'], 30);

    var classifier = ee.Classifier.smileRandomForest({
        'numberOfTrees': nTrees,
        'variablesPerSplit': variablesPerSplit,
        'minLeafPopulation': minLeafPopulation,
        'seed': seed
    }).train(training_img, 'reference', bandNames);

    var classified = mosaicoTotal.classify(classifier).mask(mosaicoTotal.select('blue_median'));
    classified = classified.select(['classification'], ['classification_' + year]).clip(myRegion).toInt8();

    if (year_id == 0) { classifiedStack = classified; }
    else { classifiedStack = classifiedStack.addBands(classified); }
}


// ============================================================
// SECTION 6 — EXPORT
// ============================================================
classifiedStack = classifiedStack
    .set('collection', 6)
    .set('version', version_class_out)
    .set('region_name', region_name)
    .set('step', stage)
    .set('type', 'region');

Export.image.toAsset({
    "image": classifiedStack.toInt8(),
    "description": region_name + '-col_' + collection + '_' + anio + '-' + 'class_v' + version_class_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + stage + '_' + region_name + '-col_' + collection + '_' + anio + '-' + 'class_v' + version_class_out,
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": myRegion
});
