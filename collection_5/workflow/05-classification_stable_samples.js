var c03_forest_formation = /* color: #34ff15 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-53.1120934763852, -23.487305106804406]),
            {
              "reference": 3,
              "system:index": "0"
            })]),
    c09_forest_plantation = /* color: #d63000 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-52.8484216013852, -23.688672632716194]),
            {
              "reference": 9,
              "system:index": "0"
            })]),
    c11_wetland = /* color: #0b4a8b */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-53.0022301951352, -23.849543536201768]),
            {
              "reference": 11,
              "system:index": "0"
            })]),
    c12_grassland = /* color: #ffc82d */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-52.6067223826352, -23.487305106804406]),
            {
              "reference": 12,
              "system:index": "0"
            })]),
    c15_pasture = /* color: #00ffff */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-52.8264489451352, -22.75984635891253]),
            {
              "reference": 15,
              "system:index": "0"
            })]),
    c19_annual_crops = /* color: #bf04c2 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-52.4089684763852, -23.749022528013906]),
            {
              "reference": 19,
              "system:index": "0"
            })]),
    c22_non_vegetated_area = /* color: #ff0000 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-52.6726403513852, -23.809344467499248]),
            {
              "reference": 22,
              "system:index": "0"
            })]),
    c33_water = /* color: #00ff00 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-52.6506676951352, -23.869638397290974]),
            {
              "reference": 33,
              "system:index": "0"
            })]),
    c36_perennial_crops = /* color: #0000ff */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-52.8044762888852, -22.840869265633174]),
            {
              "reference": 36,
              "system:index": "0"
            })]);

//

//// save the script with the name: "step1-collect_sample"+grid_name
// in the FOLDER of your institution

//Adaptado por Pablo Baldassini - Mayo 2025

//MODIFICAR ID REGION
var region_name = "reg_2"
var yearini = 1985

var year_list =   [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 
                   1995, 1996, 1997, 1998, 1999]

//var year_list = ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010",
//                  "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019"]

//MODIFICAR VERSIONES
var version_stable_in = '1'  // Version saved
//var version_class = '1'   // Version saved
var version_class_out = '1'// Version out
var stage_out = 'step_04-complement'
var version_samples_out = 1     // Version that will be saved


var trainPoints = 2000   // Number of points to training
var validPoints = 300   // Number of points to validate

//COMPLETAR CON LAS MUESTRAS COMPLEMENTARIAS QUE SE TOMEN 
var complementary_samples_03 = 200
//var complementary_samples_04 = 200
var complementary_samples_09 = 200
var complementary_samples_11 = 200
var complementary_samples_12 = 500
var complementary_samples_15 = 100
var complementary_samples_19 = 200
//var complementary_samples_21 = 200
var complementary_samples_22 = 200
var complementary_samples_33 = 200
var complementary_samples_36 = 200


//nTrees padrao: 100
var nTrees = 250;
var variablesPerSplit = 4 //mtry
var minLeafPopulation = 25  //Nnodes
var seed = 1

//************************************
//Do not change bellow this point

//************************************
//Do not change bellow this point


//************************************
//Do not change bellow this point

//INDICAR DIRECTORIOS
var regions = ee.FeatureCollection("projects/mapbiomas_af_trinacional/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3");
//print(regions, "regions")
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name)

var dirasset = 'projects/nexgenmap/MapBiomas2/LANDSAT/ARGENTINA/mosaics-1'
var dir_pre_class = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA'

var outputAsset = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/SAMPLES/RANDOM_STABLE/BA'
var outputAsset2 = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/SAMPLES/COMPLEMENT/BA'

var blank = ee.Image(0).mask(0);
var outline = blank.paint(myRegion, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, region_name, true);
Map.addLayer(regions, {}, 'regions', false);


var vis = {"opacity":1,//"bands":["classification_2022"],
"min":1,"max":65,"palette":["#129912","#1f4423","#006400","#00ff00","#687537","#76a5af","#29eee4","#77a605","#935132",
"#bbfcac","#45c2a5","#b8af4f","#f1c232","#ffffb2","#ffd966","#f6b26b","#f99f40","#e974ed","#d5a6bd","#c27ba0","#fff3bf",
"#ea9999","#dd7e6b","#aa0000","#ff99ff","#0000ff","#d5d5e5","#dd497f","#b2ae7c","#af2a2a","#8a2be2","#968c46","#0000ff",
"#4fd3ff","#645617","#fae1f9","#000000","#000000","#f5b3c8","#c71585","#f54ca9","#000000","#000000","#000000","#000000",
"#d68fe2","#9932cc","#e6ccff","#02d659","#ad5100","#000000","#000000","#000000","#000000","#000000","#000000","#000000",
"#000000","#000000","#000000","#000000","#ff69b4","#000000","#000000","#842b4c"]};

var visParMedian2 = {'bands':['nir_median','swir1_median','red_median'], 'max':3187.5, 'gamma':1.32 };

// Landsat images that will be added to Layers

var year_land = [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 
                   1995, 1996, 1997, 1998, 1999]
                   
for (var year_id in year_land){
  var year = year_land[year_id]


  var mosaicoTotal = ee.ImageCollection(dirasset)
                    .filterMetadata('year', 'equals', year)
                    .filterBounds(myRegion)
                    .mosaic()
                    .clip(myRegion)
  Map.addLayer(mosaicoTotal, visParMedian2, 'Land_'+year+'_TRINACIONAL', false);  
}

//var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
//var slope = ee.Terrain.slope(terrain)
//var square = ee.Kernel.square({radius: 5});

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
  
// Samples -> MODIFICAR SEGÚN MUESTRAS COMPLEMENTARIAS
var samplesList = [c03_forest_formation, c11_wetland, c12_grassland,c15_pasture,
                    c22_non_vegetated_area, c36_perennial_crops]
                     
var totalSample = ee.List(samplesList).iterate(
    function (sample, totalSample) {
        return ee.FeatureCollection(totalSample).merge(sample);
    },
    samplesList[0]
);
totalSample = ee.FeatureCollection(totalSample).filterBounds(myRegion);

var amostraTotalimg = totalSample.reduceToImage({properties: ['reference'],reducer: ee.Reducer.first()})
amostraTotalimg = amostraTotalimg.select([0],['reference'])


//var visParMedian2 = {'bands':['swir1_median','nir_median','red_median'], 'gain':[0.08, 0.06,0.2],'gamma':0.5 };

//MODIFICAR SEGÚN MUESTRAS COMPLEMENTARIAS
  var training = amostraTotalimg.stratifiedSample({
    'numPoints': 1,
    'classBand': 'reference',
    'region': totalSample.filterBounds(myRegion),
    'scale': 30,
    'seed': 1,
    'classValues': [3,11, 12, 15, 22,36],//MODIFICAR
    'classPoints': [complementary_samples_03,complementary_samples_11,complementary_samples_12,complementary_samples_15,complementary_samples_22,complementary_samples_36],//MODIFICAR
    'dropNulls': true,
    'geometries': true
});

////LEYENDA

var names = [
              "[03] Natural Forest",
              //"[04] Savanna Formation",
              "[09] Forest Plantation",
              "[11] Wetland",
              "[12] Grassland",
              "[15] Pasture",
              "[19] Annual crops",
              //"[21] Mosaic_agriculture_pasture",
              "[22] Non vegetated area",
              "[33] Water",
              "[36] Perennial crops",
              //"[48] Perennial crops",
              //"[65] Te"
            ];

var colors = [
              "006400",//3
              //"32cd32",//4
              "935132",//9
              "45c2a5",//11
              "b8af4f",//12
              "ffd966",//15
              "d5a6bd",//19
              //"ffefc3",//21
              "EA9999",//22
              "0000ff",//33
              "dd497f",//36
             // "dd497f",//48
            //  "842b4c",//65
              ];

              
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Create and add the legend title.
var legendTitle = ui.Label({
  value: 'MapBiomas AF Col. 5',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

legend.add(legendTitle);

// var loading = ui.Label('Legend:', {margin: '2px 0 4px 0'});
// legend.add(loading);

var makeRow = function(color, name) {
  // Create the label that is actually the colored box.
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      // Use padding to give the box height and width.
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  // Create the label filled with the description text.
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

for (var i = 0; i < names.length; i++){
legend.add(makeRow(colors[i], names[i]));
}
  Map.add(legend);
  

//////////////////////////////////////////////////////////////////////////////////////////
  
// Add mosaic for each year
for (var year_id in year_list){
  var year = year_list[year_id]
  var mosaicoTotal = ee.ImageCollection(dirasset)
                    .filterMetadata('year', 'equals', year)
                    .filterBounds(myRegion.geometry())
                    .mosaic()
 // Map.addLayer(mosaicoTotal, visParMedian2, 'Land_'+year, false);  
  var stable_samples = ee.FeatureCollection(outputAsset + '/' + region_name  +  '-stable_points_v'+version_stable_in +  "-col_5_" + yearini + "_filter")
  
    .filterMetadata("year","equals",year)
     print(stable_samples.size(), "muestras estables "+year) 

  mosaicoTotal = mosaicoTotal.clip(myRegion)
  //mosaicoTotal = mosaicoTotal.addBands(slope.int8().clip(myRegion))
  //var entropyG = mosaicoTotal.select('median_green').entropy(square);
  //mosaicoTotal = mosaicoTotal.addBands(entropyG.select([0],['textG']).multiply(100).int16())
  mosaicoTotal = mosaicoTotal.select(bandNames)
  
//  var training_img = mosaicoTotal.sampleRegions(balancedtraining, ['reference'], 30)

  var training_year = mosaicoTotal.sampleRegions({
    'collection': training,
    'properties': ['reference'],
    'scale': 30,
    'geometries':false
  });

  print("complementary samples "+year, training_year.size())
  
  var training_complementar = stable_samples.merge(training_year)
  print(training_complementar.size(),"muestras totales "+year)

  var classifier = ee.Classifier.smileRandomForest({
            'numberOfTrees': nTrees,
            'variablesPerSplit': variablesPerSplit, 
            'minLeafPopulation': minLeafPopulation, 
            'seed': seed}).train(training_complementar, 'reference', bandNames);
            
  var classified = mosaicoTotal.classify(classifier).mask(mosaicoTotal.select('blue_median'));
  classified = classified.select(['classification'],['classification_'+year]).clip(myRegion).toInt8()
  Map.addLayer(classified, vis, 'RF'+year+"_"+region_name, false);
  
  if (year_id == 0){ var classified85a99 = classified }  
  else {classified85a99 = classified85a99.addBands(classified); }
}
classified85a99 = classified85a99
.set('collection', 5)
.set('version', version_class_out)
.set('region_name', region_name)
.set('step', stage_out)
.set('type', 'region')
print(classified85a99)

//MODIFICAR SEGUN LAS MUESTRAS
  Map.addLayer(stable_samples.filterMetadata('reference','equals',3), {'color': "006400"}, 'Natural Forest', false)
  //Map.addLayer(stable_samples.filterMetadata('reference','equals',4), {'color': "32cd32"}, 'Savanna Formation', false)
 // Map.addLayer(stable_samples.filterMetadata('reference','equals',9), {'color': "935132 "}, 'Forest Plantation', false)
  Map.addLayer(stable_samples.filterMetadata('reference','equals',11), {'color': "45c2a5 "}, 'Wetland', false)
  Map.addLayer(stable_samples.filterMetadata('reference','equals',12), {'color': "b8af4f"}, 'Grassland', false)
  Map.addLayer(stable_samples.filterMetadata('reference','equals',15), {'color': "ffd966"}, 'Pasture', false)
  //Map.addLayer(stable_samples.filterMetadata('reference','equals',19), {'color': "d5a6bd"}, 'Annual crops', false)
  //Map.addLayer(stable_samples.filterMetadata('reference','equals',21), {'color': "ffefc3"}, 'Mosaic_agriculture_pasture', false)
  Map.addLayer(stable_samples.filterMetadata('reference','equals',22), {'color': "EA9999"}, 'Non vegetated area', false)
 // Map.addLayer(stable_samples.filterMetadata('reference','equals',33), {'color': "0000ff"}, 'Water', false)
  Map.addLayer(stable_samples.filterMetadata('reference','equals',36), {'color': "dd497f"}, 'Perennial crops', false)
  //Map.addLayer(stable_samples.filterMetadata('reference','equals',48), {'color': "dd497f"}, 'Perennial crops', false)
  //Map.addLayer(stable_samples.filterMetadata('reference','equals',65), {'color': "842b4c"}, 'Te', false)


Export.image.toAsset({
  "image": classified85a99.toInt8(),
  "description": region_name+ '-'+ 'col_5_' + yearini +'_class_v'+version_class_out,
  "assetId": dir_pre_class + stage_out + '_' + region_name+ '-'+ 'col_5_' + yearini +'_class_v'+version_class_out,
  "scale": 30,
  "pyramidingPolicy": {
      '.default': 'mode'
  },
  "maxPixels": 1e13,
  "region": myRegion
});    

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


//MODIFICAR SEGÚN MUESTRAS
print('exported samples')
print('# c03_forest_formation', training.filterMetadata('reference', 'equals', 3).size())
//print('# c04_savanna_formation', training.filterMetadata('reference', 'equals', 4).size())
//print('# c09_forest_plantation', training.filterMetadata('reference', 'equals', 9).size())
print('# c11_wetland', training.filterMetadata('reference', 'equals', 11).size())
print('# c12_grassland', training.filterMetadata('reference', 'equals', 12).size())
print('# c15_pasture', training.filterMetadata('reference', 'equals', 15).size())
//print('# c19_annual_crops', training.filterMetadata('reference', 'equals', 19).size())
//print('# c21_mosaic_agricuture_pasture', training.filterMetadata('reference', 'equals', 21).size())
print('# c22_non_vegetated_area', training.filterMetadata('reference', 'equals', 22).size())
//print('# c33_water', training.filterMetadata('reference', 'equals', 33).size())
print('# c36_perennial_crops', training.filterMetadata('reference', 'equals', 36).size())
//print('# c48_perennial_crops', training.filterMetadata('reference', 'equals', 48).size())
//print('# c65_Te', training.filterMetadata('reference', 'equals', 65).size())

// Samples -> MODIFICAR SEGÚN MUESTRAS COMPLEMENTARIAS
var samplesList = [c03_forest_formation, c11_wetland, c12_grassland,c15_pasture,
                    c22_non_vegetated_area,c36_perennial_crops]


var labeledSamples = validation.merge(training);


//print(labeledSamplespoly)
print(labeledSamples.size(),"muestras complementarias totales")


Export.table.toAsset({
    "collection": labeledSamplespoly,
    "description": region_name  + '_stable-compl-poly_' + yearini + "_v" +version_samples_out + "_col5",
    "assetId": outputAsset2 + region_name  + '_stable-compl-poly_' + yearini + "_v" +version_samples_out + "_col5"
});

Export.table.toAsset({
    "collection": ee.FeatureCollection(labeledSamples),
    "description": region_name + '_stable-compl-points_'+ yearini + "_v" +version_samples_out + "_col5",
    "assetId": outputAsset2 + region_name  + '_stable-compl-points_'+ yearini + "_v" +version_samples_out + "_col5"
});

