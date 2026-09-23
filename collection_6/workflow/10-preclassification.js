// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 10 — Preclassification (Round 3: refines class 14 "Agropecuario")
// ============================================================
//
// III - Classification over class 14 - agropecuario (temporary crop + pasture)
// agriculture (annual crops): 19 | pasture: 15
//
// This is the THIRD of four hierarchical classification rounds — see
// 03-preclassification.js's header for the full round-by-round
// explanation. Round 3 branches from Round 2's final output (step 09's
// `step_14_spatial_filter_col6_v1_clas2`), restricted to the pixels
// classed 14 ("Agropecuario"), splitting it into pasture (15) and
// annual crops (19). Unlike Rounds 1 and 2, neither 15 nor 19 gets
// merged into a further catch-all — they are final classes.
//
// DESCRIPTION / METHODOLOGY: identical to 07-preclassification.js
// (Round 2), except: no sub-class remapping is needed (15 and 19 stay
// as-is), and the mask is Round 2's final output restricted to class 14
// instead of Round 1's restricted to class 10.
//
// INPUT:
//   - Training points (02-export_points.js output).
//   - Round 2's final classification (09f output), used as a mask
//     (class 14 only).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions).
//   - Annual Landsat mosaics for Argentina.
//
// OUTPUT:
//   - Multi-year classification image for the region and period, masked
//     to Round 2's class-14 pixels. Exported as
//     `step_03-class_<region_name>-col_6_<anio>-class_v3`.
//
// USAGE NOTE: this script processes ONE region and ONE period per run —
// change `region_name` and `period` (SECTION 1), and re-set the
// per-region `percent_*` config for that region.
//
// PREVIOUS STEP: 02-export_points.js / 09f-spatial_filter_connected_final.js
//                (Round 2's final output, used as this round's mask)
// NEXT STEP:     11-stable_map.js (Round 3)
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
var version_class_out = '3'; // Version that will be saved
var stage = 'step_03-class';

var nSamplesMin = 2000;
var nSamplesMax = 3000;

// Per-class sample-balancing percentages — region-specific.
var percent_15 = 40;
var percent_19 = 60;

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
// 🔁 REPLACE: Round 2's final classification (09f output), used as a
// class-14 mask.
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

var num_train_15 = ee.Number(nSamplesMax * percent_15 / 100).round().int16().max(nSamplesMin);
var train_15 = shuffledtraining.filterMetadata('reference', 'equals', 15).limit(num_train_15);
var num_train_19 = ee.Number(nSamplesMax * percent_19 / 100).round().int16().max(nSamplesMin);
var train_19 = shuffledtraining.filterMetadata('reference', 'equals', 19).limit(num_train_19);

var balancedtraining = train_15.merge(train_19);


// ============================================================
// SECTION 5 — PER-YEAR TRAIN + CLASSIFY (masked to Round 2's class 14)
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

// 🔁 REPLACE: Round 2's final classification (09f output).
var clasif_base = ee.Image(dir_filters + '/step_14_spatial_filter_col6_v1_clas2').clip(myRegion);

var classifiedStack;

for (var year_id in year_list) {
    var year = year_list[year_id];

    var mosaicoTotal = ee.ImageCollection(collectionimg)
        .filterMetadata('year', 'equals', year)
        .filterBounds(myRegion)
        .mosaic()
        .clip(myRegion);

    mosaicoTotal = mosaicoTotal.select(bandNames);
    var training_img = mosaicoTotal.sampleRegions(balancedtraining, ['reference'], 30);

    var classifier = ee.Classifier.smileRandomForest({
        'numberOfTrees': nTrees,
        'variablesPerSplit': variablesPerSplit,
        'minLeafPopulation': minLeafPopulation,
        'seed': seed
    }).train(training_img, 'reference', bandNames);

    // Round 2's class-14 mask for this year
    var clasif_otros = clasif_base.select('classification_' + year).eq(14);

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
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": myRegion
});
