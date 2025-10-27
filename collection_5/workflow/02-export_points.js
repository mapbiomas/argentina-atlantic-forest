//// Change to your grid_name
var region_name = "reg_2";

var collection = 5
var version_out = 1     // Version that will be saved
var trainPoints = 700   // Number of points to training
var validPoints = 300   // Number of points to validate

var regions = ee.FeatureCollection("projects/mapbiomas_af_trinacional/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3");
//print(regions, "regions")
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name)
Map.addLayer(myRegion, null, "Region")

var outputAsset = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/SAMPLES/STABLE/BA/';

var poligonos_vt1985_1 = ee.FeatureCollection('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/SAMPLES/STABLE/BA/PoligonosVT/reg_2_Coleccion5_1985')
var poligonos_compl = ee.FeatureCollection('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/SAMPLES/STABLE/BA/PoligonosVT/reg_2_complementsamples_1985_v1_col5')

var poligonos_vt = poligonos_vt1985_1.merge(poligonos_compl)

var agregado = poligonos_vt.aggregate_array('reference').distinct()
print(agregado, "agregado")

var perennial = poligonos_vt.filter(ee.Filter.or(ee.Filter.eq('reference', 48),
                                                 ee.Filter.eq('reference', 65))).map(function(feat){return feat.set("reference",36)})
print(perennial, "pere")

var poligonos_vt1985 = poligonos_vt.merge(perennial)

var class_3 = poligonos_vt1985.filter('reference == 3')
print(class_3.size(), "class_3")
//var class_4 = poligonos_vt1985.filter('reference == 4')
//print(class_4.size(), "class_4")
var class_9 = poligonos_vt1985.filter('reference == 9')
print(class_9.size(), "class_9")
//var class_11 = poligonos_vt1985.filter('reference == 11')
//print(class_11.size(), "class_11")
//var class_12 = poligonos_vt1985.filter('reference == 12')
//print(class_12.size(), "class_12")
var class_15 = poligonos_vt1985.filter('reference == 15')
print(class_15.size(), "class_15")
var class_19 = poligonos_vt1985.filter('reference == 19')
print(class_19.size(), "class_19")
var class_22 = poligonos_vt1985.filter('reference == 22')
print(class_22.size(), "class_22")
var class_33 = poligonos_vt1985.filter('reference == 33')
print(class_33.size(), "class_33")
var class_36 = poligonos_vt1985.filter('reference == 36')
print(class_36.size(), "class_36")
//var class_48 = poligonos_vt1985.filter('reference == 48')
//print(class_48.size(), "class_48")
//var class_65 = poligonos_vt1985.filter('reference == 65')
//print(class_65.size(), "class_65")

// Samples
//var samplesList = [class_48,class_65]
var samplesList = [class_3, class_9,class_15, class_19, class_22, class_33, class_36]

//------------------------------------------------------------------
// User defined functions
//------------------------------------------------------------------
/**
 * 
 * @param {*} collection 
 * @param {*} seed 
 */
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

var totalSample = ee.List(samplesList).iterate(
    function (sample, totalSample) {
        return ee.FeatureCollection(totalSample).merge(sample);
    },
    samplesList[0]
);
totalSample = ee.FeatureCollection(totalSample).filterBounds(myRegion);

var amostraTotalimg = totalSample.reduceToImage({properties: ['reference'],reducer: ee.Reducer.first()})
amostraTotalimg = amostraTotalimg.select([0],['reference'])

// shuffle points and reindex them
var shuffledpoly = shuffle(totalSample, 2);

// split range in %
var splitRange = [0.0, 0.7, 1.0];

var sizepoly = shuffledpoly.size();

var filter1 = ee.Filter.rangeContains('new_id',
    sizepoly.multiply(splitRange[0]).round().add(1),
    sizepoly.multiply(splitRange[1]).round());

var filter2 = ee.Filter.rangeContains('new_id',
    sizepoly.multiply(splitRange[1]).round().add(1),
    sizepoly.multiply(splitRange[2]).round());


var trainingpoly = shuffledpoly.filter(filter1)
    .map(function (feature) {
        return feature.set('type', 'training');
    });
    
var validationpoly = shuffledpoly.filter(filter2)
    .map(function (feature) {
        return feature.set('type', 'validation');
    });

var labeledSamplespoly = validationpoly.merge(trainingpoly);


var validation = amostraTotalimg.stratifiedSample({
    'numPoints': validPoints,
    'classBand': 'reference',
    'region': validationpoly.filterBounds(myRegion),
    'scale': 30,
    'seed': 1,
    'dropNulls': true,
    'geometries':true
});

validation = validation
    .map(function (feature) {
        return feature.set('type', 'validation');
    });
var training = amostraTotalimg.stratifiedSample({
    'numPoints': trainPoints,
    'classBand': 'reference',
    'region': trainingpoly.filterBounds(myRegion),
    'scale': 30,
    'seed': 1,
    'dropNulls': true,
    'geometries':true
});
training = training
    .map(function (feature) {
        return feature.set('type', 'training');
    });

print(training.limit(10), "training")
print('# c03_forest_formation', training.filterMetadata('reference', 'equals', 3).size())
//print('# c04_savanna_formation', training.filterMetadata('reference', 'equals', 04).size())
print('# c09_forest_plantation', training.filterMetadata('reference', 'equals', 9).size())
//print('# c11_wetland', training.filterMetadata('reference', 'equals', 11).size())
//print('# c12_grassland', training.filterMetadata('reference', 'equals', 12).size())
print('# c15_pasture', training.filterMetadata('reference', 'equals', 15).size())
print('# c19_annual_crops', training.filterMetadata('reference', 'equals', 19).size())
//print('# c21_mosaic_agriculture_pasture', training.filterMetadata('reference', 'equals', 21).size())
print('# c22_non_vegetated_area', training.filterMetadata('reference', 'equals', 22).size())
print('# c33_water', training.filterMetadata('reference', 'equals', 33).size())
print('# c36_perennial', training.filterMetadata('reference', 'equals', 36).size())
//print('# c48_perennial_crops', training.filterMetadata('reference', 'equals', 48).size())
//print('# c65_te', training.filterMetadata('reference', 'equals', 65).size())

//var samplesList = [class_48,class_65]
var samplesList = [class_3, class_9,class_15, class_19, class_22, class_33, class_36]

var labeledSamples = validation.merge(training);


//print(labeledSamplespoly)
//print(labeledSamples.size())

//
Export.table.toAsset({
    "collection": labeledSamplespoly,
    "description": region_name + '-col_'+collection + '-poly_v'+version_out + '_1985',
    "assetId": outputAsset + region_name + '-col_'+collection + '-poly_v'+version_out + '_1985'
});

Export.table.toAsset({
    "collection": ee.FeatureCollection(labeledSamples),
    "description": region_name + '-col_'+collection + '-points_v'+version_out + '_1985',
    "assetId": outputAsset + region_name + '-col_'+collection +  '-points_v'+version_out + '_1985'
});
