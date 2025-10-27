var erase = /* color: #d63000 */ee.FeatureCollection([]);

//Cambiar region 
var region_name = "reg_2"
var reg2 = 2
var yearini = 1985

var freq = 12 //18 //numbers of occorrences to be stable = 20 maximum

var percent_48 = 4
var percent_65 = 4

var version_class_in = '1'   // Version  saved
var version_class_in2 = 1

var stage_in = 'step_03-class' //'step_04-complement'
var stage_in2 = 3 //'step_04-complement'

var version_stable_out = '1'  // Version that will be saved
var stage_out = 'step_04'

var year_list =   [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 
                   1995, 1996, 1997, 1998, 1999]

//var year_list = [2000, 2001, 2002, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021]

var nSamplesMax = 3500;
var nSamplesMin = 3000;


//************************************
//Do not change bellow this point

var regions = ee.FeatureCollection("projects/mapbiomas_af_trinacional/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3");
//print(regions, "regions")
var myRegion = regions.filterMetadata('Reg_id', 'equals', region_name)

var dirasset = 'projects/nexgenmap/MapBiomas2/LANDSAT/ARGENTINA/mosaics-1'
var outputAsset = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/SAMPLES/RANDOM_STABLE/BA'
var outputStable = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/STABLEMAP/BA'

var palettes = require('users/mapbiomas/modules:Palettes.js');

var class_map = ee.Image('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/PRECLASSIFICATION/BA/step_0'+stage_in2+'-class_reg_'+reg2+"-col_5_"+yearini+'-class_v'+version_class_in2+"_yerbate").unmask(0)
                .clip(myRegion)                    
print(class_map, "class_map")
var colecao = ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/ARGENTINA/mosaics-1')
              .filterMetadata('year','equals',1985)
              .mosaic().clip(myRegion)
  
Map.addLayer(colecao, {'bands':['swir1_median','nir_median','red_median' ], 'gain':[0.09, 0.07,0.2],'gamma':0.5 }, 'Land 1985', true);


var image = class_map

/**
 * User defined functions
 */
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

//print(bandsOccurrence);

// insert a masked band 
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

// generate image pixel years
var imagePixelYear = ee.Image.constant(year_list)
    .updateMask(imageAllBands)
    .rename(bandNames);

// apply the gap fill
var imageFilledtnt0 = applyGapFill(imageAllBands);
var imageFilledYear = applyGapFill(imagePixelYear);

var filtered2 = ee.Image(imageFilledtnt0)
//print(filtered2)


var vis = {
    'bands': ['classification_' + String(year)],
    'min': 0,
    'max': 36,
    'palette': palettes.get('classification3')
};


var vis2 = {
//    'bands': ['classification_' + String(year)],
    'min': 0,
    'max': 36,
    'palette': palettes.get('classification3')
};

var colList = ee.List([])
var class_map85 = filtered2.select('classification_1985').rename('remapped')
colList = colList.add(class_map85)


for (var i_year=0;i_year<year_list.length; i_year++){
  var year = year_list[i_year];
  var col3year = filtered2.select('classification_'+year).rename('remapped')
  Map.addLayer(filtered2.select('classification_'+year), vis2, 'class '+year, false);

  colList = colList.add(col3year)
};

var collection = ee.ImageCollection(colList)

var unique = function(arr) {
    var u = {},
        a = [];
    for (var i = 0, l = arr.length; i < l; ++i) {
        if (!u.hasOwnProperty(arr[i])) {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
};

var getFrenquencyMask = function(collection, classId) {

    var classIdInt = parseInt(classId, 10);

    var maskCollection = collection.map(function(image) {
        return image.eq(classIdInt);
    });

    var frequency = maskCollection.reduce(ee.Reducer.sum());

    var frequencyMask = frequency.gte(classFrequency[classId])
        .multiply(classIdInt)
        .toByte();

    frequencyMask = frequencyMask.mask(frequencyMask.eq(classIdInt));

    return frequencyMask.rename('frequency').set('class_id', classId);
};
///////////////////////////
//FUNCTION: LOOP for each carta

var list_image = ee.List([]);
//print(list_image)


//CAMBIAR FRECUENCIAS
var classFrequency = {"48": freq,"65": freq} 
  
//print(Object.keys(classFrequency))

var frequencyMasks = Object.keys(classFrequency).map(function(classId) {
    return getFrenquencyMask(collection, classId);
});

frequencyMasks = ee.ImageCollection.fromImages(frequencyMasks);

var referenceMap = frequencyMasks.reduce(ee.Reducer.firstNonNull());

var yerbaycitrus = ee.Image("projects/mapbiomas_af_trinacional/ANCILLARY_DATA/RASTER/yerbaycitrus_col3")
var te = ee.Image("projects/mapbiomas_af_trinacional/ANCILLARY_DATA/RASTER/te_col3")
Map.addLayer(yerbaycitrus, null, "yerbaycitrus")
Map.addLayer(te, null, "te")

var base = ee.Image.constant(0).clip(myRegion)
var mascara_freq_mapref = base.where(referenceMap.eq(48).and(yerbaycitrus.eq(1)),48)
                          .where(referenceMap.eq(65).and(te.eq(1)),65)
                          .rename("reference")
                          .selfMask()

var vis = {
    'bands': ['reference'],
    'min': 0,
    'max': 36,
    'palette': palettes.get('classification3')
};
Map.addLayer(mascara_freq_mapref, vis, 'Stable Samples 85 a 99', true);

var stables_areas_filter = mascara_freq_mapref

stables_areas_filter = stables_areas_filter
.set('collection', 5)
.set('version', version_stable_out)
.set('region_name', region_name)
.set('step', stage_out)
.set('type', 'region')


Export.image.toAsset({
  "image": stables_areas_filter.toInt8(),
  "description": region_name+'-'+'stable_map_v'+ version_stable_out + "Collection_5_" + yearini + "_filter"+"_yerbate",
  "assetId": outputStable + '/' + region_name +'stable_map_v'+version_stable_out + "-col_5_" + yearini + "_filter"+"_yerbate",
  "scale": 30,
  "pyramidingPolicy": {
      '.default': 'mode'
  },
  "maxPixels": 1e13,
  "region": myRegion
});   


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
  
//Kernel used to compute entropy  
//var square = ee.Kernel.square({radius: 5}); 
//var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
//var slope = ee.Terrain.slope(terrain)

var palettes = require('users/mapbiomas/modules:Palettes.js');

var vis = {
    'bands': ['reference'],
    'min': 0,
    'max': 36,
    'palette': palettes.get('classification3')
};


//MODIFICAR CLASES
var num_train_48 = ee.Number(nSamplesMax * percent_48 / 100).round().int16().max(nSamplesMin)
var num_train_65 = ee.Number(nSamplesMax * percent_65 / 100).round().int16().max(nSamplesMin)

print(num_train_48,"yerba-citrus")
print(num_train_65,"Te")

var visParMedian2 = {'bands':['swir1_median','nir_median','red_median'], 'gain':[0.08, 0.06,0.2],'gamma':0.5 };

//MODIFICAR
var training_pt = stables_areas_filter.stratifiedSample({scale:30, classBand: 'reference', numPoints: 10, region: myRegion, geometries: true,
           classValues: [48,65], 
           classPoints: [num_train_48,num_train_65]});

//MODIFICAR
print(training_pt.filterMetadata('reference', 'equals',48),"yerba-citrus")
print(training_pt.filterMetadata('reference', 'equals',65),"Te")

Map.addLayer(training_pt.filterMetadata('reference','equals',48), {'color': "0000ff"}, 'yerba-citrus', false)
Map.addLayer(training_pt.filterMetadata('reference','equals',65), {'color': "0000ff"}, 'Te', false)

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
//// Get samples for each year and export using for-loop///
for (var year_id in year_list){
  var year = year_list[year_id];
  
  var mosaic = ee.ImageCollection(dirasset)
                    .filterMetadata('year', 'equals', year)
                    .filterBounds(myRegion.geometry())//.centroid())
                    .mosaic()
                    
    
//    if(mosaic.bandNames().length().getInfo() > 0){
//        print(year,mosaic)
        //var slopeclip = slope.clip(myRegion)
        //mosaic = mosaic.addBands(slopeclip)
        //var entropyG = mosaic.select('median_green').entropy(square);
        //mosaic = mosaic.addBands(entropyG.select([0],['textG']).multiply(100).int16())
        mosaic = mosaic.select(bandNames).addBands(stables_areas_filter)
    
    
        //var ImagenTemp = mosaic.select(0).gt(0).multiply(27).byte();
        //referenceMap = ImagenTemp.where(referenceMap.gte(0),referenceMap);
        //mosaic = mosaic.mask(referenceMap.gte(0));
        
    
    
        var training = mosaic.sampleRegions({
              'collection': training_pt,
              'properties': ['reference'],
              'geometries': true,
              //'region': params.geometry,
              'scale': 30
          });
      
          training = training.map(function(feat) {return feat.set({'year': year})});
          training = training.map(function(feat) {return feat.set({'region_name': region_name})});
          
//        print(year, training)
    
          
          
      if (year_id == 0) {
        var stable_points = training
      } else {
        stable_points = stable_points.merge(training)
//      }
    }

}
 
stable_points = stable_points
.set('collection', 5)
.set('version', version_stable_out)
.set('region_name', region_name)
.set('step', stage_out)
.set('type', 'region')

print('Final Stable points Size',stable_points.size())

Export.table.toAsset({
    "collection": ee.FeatureCollection(stable_points),
    "description": region_name + '-stable_points_v' +version_stable_out+ "Collection_5_" + yearini + "_filter"+"_yerbate",
    "assetId": outputAsset + '/' + region_name  + '-stable_points_v'+version_stable_out +  "-col_5_" + yearini + "_filter"+"_yerbate"
});


var blank = ee.Image(0).mask(0);
var outline = blank.paint(regions, 'AA0000', 1); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, 'grids for Mata Atlantica', true);
//