
//Adaptado por Pablo Baldassini - Julio 2025

var region_name = "reg_2"
var collection = "5"
var anio = "1985"

var version_samples_in = '1'
var version_class_out = '1'   // Version that will be saved
var stage = 'step_03-class'

var nSamplesMin = 1500;
var nSamplesMax = 3500;

var percent_48 = 4
var percent_65 = 4

var year_list =   [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 
                   1995, 1996, 1997, 1998, 1999]
                   
var nTrees = 250;
var variablesPerSplit = 4 //mtry
var minLeafPopulation = 25  //Nnodes
var seed = 1
var colors = ["dd497f",//48
              "842b4c",//65
              ];

//************************************
//Do not change bellow this point

var regions = ee.FeatureCollection("projects/mapbiomas_af_trinacional/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3");
//print(regions, "regions")
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name)
Map.addLayer(myRegion, null, "Region")

var dirasset = 'projects/nexgenmap/MapBiomas2/LANDSAT/ARGENTINA/mosaics-1'
var dir_Samples = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/SAMPLES/STABLE/BA/';
var dir_pre_class = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/PRECLASSIFICATION/BA/'

var palettes = require('users/mapbiomas/modules:Palettes.js');

var names = ["[48] Yerba",
             "[65] Te"
            ];

//Paleta para visualización
var Palettes = require('users/mapbiomas/modules:Palettes.js');
var palette = Palettes.get('classification8');
var vis = {
          'min': 0,
          'max': 68,
          'palette': palette,
          'format': 'png'
      };
palette[45] = 'D0FFD0';
palette[63] = '#ebf8b5'//'D6BC74'//'#ebf8b5'//'f8d81a';
palette[64] = '000000';
palette[65] = '000000';
palette[66] = '91ff36';
palette[67] = '7dc975'; //color de leñosa abierta
palette[68] = 'aee37f';

              var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Create and add the legend title.
var legendTitle = ui.Label({
  value: 'MapBiomas Atlantic Forest Col. 5 yerba y te',
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
/////////////////////////////////
var visParMedian2 = {'bands':['swir1_median','nir_median','red_median'], 'gain':[0.08, 0.06,0.2],'gamma':0.5 };

var colecao_pontos = ee.FeatureCollection(dir_Samples + region_name + '-col_'+collection +'-points_v'+version_samples_in + '_' + anio+"_yerbate")

var agregado = colecao_pontos.aggregate_array('reference').distinct()
print(agregado, "agregado")

var totalSample = colecao_pontos
                  //.filterMetadata('type', 'equals', 'training')
                  .filterBounds(myRegion)

print(totalSample.size())

var blank = ee.Image(0).mask(0);
var outline = blank.paint(myRegion, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, region_name, false);

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



// shuffle points and reindex them
var shuffledtraining = shuffle(totalSample, 2)

var num_train_48 = ee.Number(nSamplesMax * percent_48 / 100).round().int16().max(nSamplesMin)
var train_48 = shuffledtraining.filterMetadata('reference', 'equals', 48).limit(num_train_48)
var num_train_65 = ee.Number(nSamplesMax * percent_65 / 100).round().int16().max(nSamplesMin)
var train_65 = shuffledtraining.filterMetadata('reference', 'equals', 65).limit(num_train_65)

print(train_48.size())
print(train_65.size())


var balancedtraining = train_48.merge(train_65)

var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
var slope = ee.Terrain.slope(terrain)
var square = ee.Kernel.square({radius: 5});

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

var visParMedian2 = {'bands':['swir1_median','nir_median','red_median'], 'gain':[0.08, 0.06,0.2],'gamma':0.5 };

var collectionimg =  ee.ImageCollection(dirasset)

for (var year_id in year_list){
  var year = year_list[year_id]


  //var mosaicoTotal = ee.ImageCollection(dirasset)
  var mosaicoTotal = ee.ImageCollection(collectionimg)
                    .filterMetadata('year', 'equals', year)
                    .filterBounds(myRegion)
                    .mosaic()
                    .clip(myRegion)
  Map.addLayer(mosaicoTotal, visParMedian2, 'Land_'+year+'_trinacional', false);  


  mosaicoTotal = mosaicoTotal.clip(myRegion)
//  mosaicoTotal = mosaicoTotal.addBands(slope.int8().clip(myRegion))
//  var entropyG = mosaicoTotal.select('green_median').entropy(square);
//  mosaicoTotal = mosaicoTotal.addBands(entropyG.select([0],['textG']).multiply(100).int16())
  mosaicoTotal = mosaicoTotal.select(bandNames)
  var training_img = mosaicoTotal.sampleRegions(balancedtraining, ['reference'], 30)

  var classifier = ee.Classifier.smileRandomForest({
            'numberOfTrees': nTrees,
            'variablesPerSplit': variablesPerSplit, 
            'minLeafPopulation': minLeafPopulation, 
            'seed': seed}).train(training_img, 'reference', bandNames);
  
  var clasif_base = ee.Image("projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/FILTERS/BA/step_10b_spatial_filter_col5_v1").clip(myRegion)
  Map.addLayer(clasif_base.select('classification_'+year), vis, "clasif_base "+year,false)          
  
  var clasif_perenne = clasif_base.select(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14)
                       .eq(36)
  Map.addLayer(clasif_perenne.select('classification_'+year), null, "clasif_perenne "+year,false)          
  var classified = mosaicoTotal.classify(classifier).mask(mosaicoTotal.select('blue_median')).updateMask(clasif_perenne.select('classification_'+year))
  classified = classified.select(['classification'],['classification_'+year]).clip(myRegion).toInt8()
  
  var imageVisParam = {"opacity":1,"min":0,"max":68,"palette":["ffffff","32a65e","32a65e","1f8d49","7dc975","04381d","026975","000000","000000","7a6c00","ad975a","519799","d6bc74","d89f5c","ffffb2","edde8e","000000","000000","f5b3c8","c27ba0","db7093","ffefc3","db4d4f","ffa07a","d4271e","db4d4f","0000ff","000000","000000","ffaa5f","9c0027","091077","fc8114","2532e4","93dfe6","9065d0","d082de","000000","000000","f5b3c8","c71585","f54ca9","cca0d4","dbd26b","807a40","d0ffd0","d68fe2","9932cc","dd497f","02d659","ad5100","000000","000000","000000","000000","000000","000000","cc66ff","ff6666","006400","8d9e8b","f5d5d5","ff69b4","ebf8b5","000000","842b4c","91ff36","7dc975","aee37f"]};
  Map.addLayer(classified, imageVisParam, 'RF'+year+"_"+region_name, false);
  
  if (year_id == 0){ var classified85a99 = classified }  
  else {classified85a99 = classified85a99.addBands(classified); }
  
}

Map.add(legend);
classified85a99 = classified85a99
.set('collection', 5)
.set('version', version_class_out)
.set('region_name', region_name)
.set('step', stage)
.set('type', 'region')

print(classified85a99)

Export.image.toAsset({
  "image": classified85a99.toInt8(),
  "description": region_name + '-col_'+collection +'_'+ anio + '-'+ 'class_v' + version_class_out+"_yerbate",
  "assetId": dir_pre_class + stage + '_' + region_name + '-col_'+collection +'_'+ anio + '-'+ 'class_v' + version_class_out+"_yerbate",
  "scale": 30,
  "pyramidingPolicy": {
      '.default': 'mode'
  },
  "maxPixels": 1e13,
  "region": myRegion
});    


