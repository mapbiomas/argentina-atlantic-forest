// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 07 — Preclassification (Round 2: refines class 10 "Otros")
// ============================================================
//
// II - Classification over class 10 - grassland, floodable grassland,
// agropecuario (temporary crop + pasture), perennial crops
// wetland (floodable grassland): 11 | grassland: 12
// agropecuario: 14 (merged from pasture 15 + annual crops 19)
// perennial crops: 36 (merged from yerba mate 48 + tea 65)
//
// This is the SECOND of four hierarchical classification rounds — see
// 03-preclassification.js's header for the full round-by-round
// explanation. Round 2 re-runs the same kind of per-year classification
// as Round 1, but restricted (via a mask) to the pixels Round 1's final
// output (step 06's `step_08d_spatial_filter_col6_v1_clas1`) classified
// as the catch-all class 10 ("Otros"), splitting it into 4 classes.
// Rounds 3 and 4 (steps 10 and 13) each further refine ONE of these 4
// classes (14 and 36 respectively) — see their headers.
//
// DESCRIPTION / METHODOLOGY:
//   Identical to 03-preclassification.js (SECTIONS 4-5: shuffle + cap
//   training points per class, remap sub-classes to their merged
//   catch-all, train + classify per year), with one addition: the
//   classified output for each year is masked to only the pixels Round
//   1's final classification called class 10 for that same year
//   (SECTION 5).
//
// INPUT:
//   - Training points (02-export_points.js output).
//   - Round 1's final classification (06g-spatial_filter_connected_final.js
//     output), used as a mask (class 10 only).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions).
//   - Annual Landsat mosaics for Argentina.
//
// OUTPUT:
//   - Multi-year classification image for the region and period, masked
//     to Round 1's class-10 pixels. Exported as
//     `step_03-class_<region_name>-col_6_<anio>-class_v2`.
//
// USAGE NOTE: this script processes ONE region and ONE period per run —
// change `region_name` and `period` (SECTION 1), and re-set the
// per-region `percent_*` config for that region.
//
// PREVIOUS STEP: 02-export_points.js / 06g-spatial_filter_connected_final.js
//                (Round 1's final output, used as this round's mask)
// NEXT STEP:     08-stable_map.js (Round 2)
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (adapted by Pablo
//          Baldassini, June 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var region_name = "reg_1"; // reg_1 | reg_2 | reg_3
var period = "1985-1999";  // 1985-1999 | 2000-2025

var collection = "6";
var version_samples_in = '1';
var version_class_out = '2'; // Version that will be saved
var stage = 'step_03-class';

var nSamplesMin = 800;
var nSamplesMax = 3000;

// Per-class sample-balancing percentages — region-specific (which
// classes are active depends on what's present in that region).
var percent_11 = 23;
var percent_12 = 40;
var percent_15 = 5;
var percent_19 = 8;
var percent_48 = 10;
var percent_65 = 10;

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
// 🔁 REPLACE: Round 1's final classification (06g output), used as a
// class-10 mask.
var dir_filters = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA';

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

var colecao_pontos = ee.FeatureCollection(dir_Samples + region_name + '-col_' + collection + '-points_v' + version_samples_in + '_' + anio);
var totalSample = colecao_pontos.filterBounds(myRegion);


// ============================================================
// SECTION 4 — SAMPLE SHUFFLE + PER-CLASS BALANCING
// ============================================================
var shuffle = function (collection, seed) {
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

    var randomIdList = ee.List(
        collection.reduceColumns(ee.Reducer.toList(), ['new_id'])
            .get('list'));

    var sequentialIdList = ee.List.sequence(1, collection.size());

    var shuffled = collection.remap(randomIdList, sequentialIdList, 'new_id');

    return shuffled;
};

var shuffledtraining = shuffle(totalSample, 2);

var num_train_11 = ee.Number(nSamplesMax * percent_11 / 100).round().int16().max(nSamplesMin);
var train_11 = shuffledtraining.filterMetadata('reference', 'equals', 11).limit(num_train_11);
var num_train_12 = ee.Number(nSamplesMax * percent_12 / 100).round().int16().max(nSamplesMin);
var train_12 = shuffledtraining.filterMetadata('reference', 'equals', 12).limit(num_train_12);
var num_train_15 = ee.Number(nSamplesMax * percent_15 / 100).round().int16().max(nSamplesMin);
var train_15 = shuffledtraining.filterMetadata('reference', 'equals', 15).limit(num_train_15);
var num_train_19 = ee.Number(nSamplesMax * percent_19 / 100).round().int16().max(nSamplesMin);
var train_19 = shuffledtraining.filterMetadata('reference', 'equals', 19).limit(num_train_19);
var num_train_48 = ee.Number(nSamplesMax * percent_48 / 100).round().int16().max(nSamplesMin);
var train_48 = shuffledtraining.filterMetadata('reference', 'equals', 48).limit(num_train_48);
var num_train_65 = ee.Number(nSamplesMax * percent_65 / 100).round().int16().max(nSamplesMin);
var train_65 = shuffledtraining.filterMetadata('reference', 'equals', 65).limit(num_train_65);

var balancedtraining = train_11.merge(train_12).merge(train_15).merge(train_19).merge(train_48).merge(train_65);

// remap pasture (15) + annual crops (19) to class 14 ("agropecuario")
var clases14 = ee.List([15, 19]);
var balancedtraining2 = balancedtraining.map(function (feat) {
    var ref = ee.Number(feat.get('reference'));
    var nuevo = ee.Algorithms.If(clases14.contains(ref), 14, ref);
    return feat.set('reference', nuevo);
});

// remap yerba mate (48) + tea (65) to class 36 ("perennial crops")
var clases36 = ee.List([48, 65]);
var balancedtraining3 = balancedtraining2.map(function (feat) {
    var ref = ee.Number(feat.get('reference'));
    var nuevo = ee.Algorithms.If(clases36.contains(ref), 36, ref);
    return feat.set('reference', nuevo);
});


// ============================================================
// SECTION 5 — PER-YEAR TRAIN + CLASSIFY (masked to Round 1's class 10)
// ============================================================
var bandNames = ee.List([
    "blue_median", "cai_median", "evi2_median", "evi2_median_dry", "evi2_median_wet",
    "gcvi_median_dry", "green_median", "green_median_wet", "green_min", "gv_stdDev",
    "gvs_median_wet", "ndfi_median", "ndfi_median_wet", "ndvi_median", "ndvi_median_wet",
    "ndwi_median", "ndwi_median_wet", "nir_median", "nir_median_wet", "nir_min",
    "red_median", "red_median_dry", "red_median_wet", "red_min", "savi_median",
    "savi_median_dry", "savi_median_wet", "shade_median", "swir1_median", "swir1_median_dry",
    "swir1_median_wet", "swir1_min", "swir2_median", "swir2_median_dry", "swir2_median_wet",
    "swir2_min", "wefi_median_wet"
]);

var collectionimg = ee.ImageCollection(dirasset);

// 🔁 REPLACE: Round 1's final classification (06g output).
var clasif_base = ee.Image(dir_filters + '/step_08d_spatial_filter_col6_v1_clas1').clip(myRegion);

var classifiedStack;

for (var year_id in year_list) {
    var year = year_list[year_id];

    var mosaicoTotal = ee.ImageCollection(collectionimg)
        .filterMetadata('year', 'equals', year)
        .filterBounds(myRegion)
        .mosaic()
        .clip(myRegion);

    mosaicoTotal = mosaicoTotal.select(bandNames);
    var training_img = mosaicoTotal.sampleRegions(balancedtraining3, ['reference'], 30);

    var classifier = ee.Classifier.smileRandomForest({
        'numberOfTrees': nTrees,
        'variablesPerSplit': variablesPerSplit,
        'minLeafPopulation': minLeafPopulation,
        'seed': seed
    }).train(training_img, 'reference', bandNames);

    // Round 1's class-10 mask for this year
    var clasif_otros = clasif_base.select('classification_' + year).eq(10);

    var classified = mosaicoTotal.classify(classifier).mask(mosaicoTotal.select('blue_median')).updateMask(clasif_otros);
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
