///// version 2 - changes the classification output to 'dir_pre_class'
// version 3 - classify region based on grid samples

//Adaptado por Pablo Baldassini - Mayo 2025

var region_name = "reg_2"
var collection = "5"
var anio = "1985"

var version_samples_in = '1'
var version_class_out = '1'   // Version that will be saved
var stage = 'step_03-class'

var nSamplesMin = 350;
var nSamplesMax = 700;

var percent_03 = 60
//var percent_04 = 8
var percent_09 = 2
//var percent_11 = 2
//var percent_12 = 3
var percent_15 = 4
var percent_19 = 4
//var percent_21 = 5
var percent_22 = 2
var percent_33 = 2
var percent_36 = 8
//var percent_48 = 4
//var percent_65 = 4

// Landsat images that will be added to Layers
//var year_list =   ['1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', 
//                   '1995', '1996', '1997', '1998', '1999']

var year_list =   [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 
                   1995, 1996, 1997, 1998, 1999]
                   
//var year_list = ['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', 
//                   '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019']


//nTrees padrao: 100
var nTrees = 250;
var variablesPerSplit = 4 //mtry
var minLeafPopulation = 25  //Nnodes
var seed = 1
var colors = [
              "006400",//3
              //"32cd32",//4
              "935132",//9
              //"45c2a5",//11
              //"b8af4f",//12
              "ffd966",//15
              "d5a6bd",//19
              //"#ffefc3",//21
              "EA9999",//22
              "0000ff",//33
              "dd497f",//36
             // "dd497f",//48
             // "842b4c",//65
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

var names = [
              "[03] Natural Forest",
              //"[04] Savanna Formation",
              "[09] Forest Plantation",
              //"[11] Wetlands",
              //"[12] Grassland",
              "[15] Pasture",
              "[19] Annual crops",
              //"[21] Mosaic_agriculture_pasture",
              "[22] Non vegetated area",
              "[33] Water",
              "[36] Perennial crops",
              //"[48] Yerba",
              //"[65] Te"
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
  value: 'MapBiomas Atlantic Forest Col. 5',
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

var colecao_pontos = ee.FeatureCollection(dir_Samples + region_name + '-col_'+collection +'-points_v'+version_samples_in + '_' + anio)

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

var num_train_03 = ee.Number(nSamplesMax * percent_03 / 100).round().int16().max(nSamplesMin)
var train_03 = shuffledtraining.filterMetadata('reference', 'equals', 3).limit(num_train_03)
//var num_train_04 = ee.Number(nSamplesMax * percent_04 / 100).round().int16().max(nSamplesMin)
//var train_04 = shuffledtraining.filterMetadata('reference', 'equals', 4).limit(num_train_04)
var num_train_09 = ee.Number(nSamplesMax * percent_09 / 100).round().int16().max(nSamplesMin)
var train_09 = shuffledtraining.filterMetadata('reference', 'equals', 9).limit(num_train_09)
//var num_train_11 = ee.Number(nSamplesMax * percent_11 / 100).round().int16().max(nSamplesMin)
//var train_11 = shuffledtraining.filterMetadata('reference', 'equals', 11).limit(num_train_11)
//var num_train_12 = ee.Number(nSamplesMax * percent_12 / 100).round().int16().max(nSamplesMin)
//var train_12 = shuffledtraining.filterMetadata('reference', 'equals', 12).limit(num_train_12)
var num_train_15 = ee.Number(nSamplesMax * percent_15 / 100).round().int16().max(nSamplesMin)
var train_15 = shuffledtraining.filterMetadata('reference', 'equals', 15).limit(num_train_15)
var num_train_19 = ee.Number(nSamplesMax * percent_19 / 100).round().int16().max(nSamplesMin)
var train_19 = shuffledtraining.filterMetadata('reference', 'equals', 19).limit(num_train_19)
//var num_train_21 = ee.Number(nSamplesMax * percent_21 / 100).round().int16().max(nSamplesMin)
//var train_21 = shuffledtraining.filterMetadata('reference', 'equals', 21).limit(num_train_21)
var num_train_22 = ee.Number(nSamplesMax * percent_22 / 100).round().int16().max(nSamplesMin)
var train_22 = shuffledtraining.filterMetadata('reference', 'equals', 22).limit(num_train_22)
var num_train_33 = ee.Number(nSamplesMax * percent_33 / 100).round().int16().max(nSamplesMin)
var train_33 = shuffledtraining.filterMetadata('reference', 'equals', 33).limit(num_train_33)
var num_train_36 = ee.Number(nSamplesMax * percent_36 / 100).round().int16().max(nSamplesMin)
var train_36 = shuffledtraining.filterMetadata('reference', 'equals', 36).limit(num_train_36)
//var num_train_48 = ee.Number(nSamplesMax * percent_48 / 100).round().int16().max(nSamplesMin)
//var train_48 = shuffledtraining.filterMetadata('reference', 'equals', 48).limit(num_train_48)
//var num_train_65 = ee.Number(nSamplesMax * percent_65 / 100).round().int16().max(nSamplesMin)
//var train_65 = shuffledtraining.filterMetadata('reference', 'equals', 65).limit(num_train_65)

print(train_03.size())
//print(train_04.size())
print(train_09.size())
//print(train_11.size())
//print(train_12.size())
print(train_15.size())
print(train_19.size())
//print(train_21.size())
print(train_22.size())
print(train_33.size())
print(train_36.size())
//print(train_48.size())
//print(train_65.size())

//var balancedtraining = train_03.merge(train_04).merge(train_09).merge(train_11).merge(train_12).merge(train_15).merge(train_19).merge(train_21).merge(train_22).merge(train_33).merge(train_36)
var balancedtraining = train_03.merge(train_09).merge(train_15).merge(train_19).merge(train_22).merge(train_33).merge(train_36)//.merge(train_48).merge(train_65)

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
            
  var classified = mosaicoTotal.classify(classifier).mask(mosaicoTotal.select('blue_median'));
  classified = classified.select(['classification'],['classification_'+year]).clip(myRegion).toInt8()
  Map.addLayer(classified, vis, 'RF'+year+"_"+region_name, false);
  
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
  "description": region_name + '-col_'+collection +'_'+ anio + '-'+ 'class_v' + version_class_out,
  "assetId": dir_pre_class + stage + '_' + region_name + '-col_'+collection +'_'+ anio + '-'+ 'class_v' + version_class_out,
  "scale": 30,
  "pyramidingPolicy": {
      '.default': 'mode'
  },
  "maxPixels": 1e13,
  "region": myRegion
});    


