var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-60.23680810003558, -19.33531374656231],
          [-60.23680810003558, -31.11250553661841],
          [-53.02977685003558, -31.11250553661841],
          [-53.02977685003558, -19.33531374656231]]], null, false);

////Adaptado por Pablo Baldassini - Julio 2025

var regions = ee.FeatureCollection("projects/mapbiomas_af_trinacional/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3");
var regions_union = regions.union()
Map.addLayer(regions, {}, 'regions', false);

//User parameters
var version_region_in = 1
var vesion_out = 'v1'
var col = "col5_"
var VeightConnected = true
var prefixo_out = 'step_06_gap-fill_'
var dircol5 = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA'
var dirout = 'projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/FILTERS/BA/'

var visParMedian2 = {'bands':['swir1_median','nir_median','red_median'], 'gain':[0.08, 0.06,0.2],'gamma':0.5 };

var dirasset = 'projects/nexgenmap/MapBiomas2/LANDSAT/ARGENTINA/mosaics-1'
  
var mosaicoTotal = ee.ImageCollection(dirasset)
                      //.filterMetadata('biome', 'equals', "MATAATLANTICA")
                      .filterMetadata('year', 'equals', 2000)
                      .mosaic()
Map.addLayer(mosaicoTotal, visParMedian2, 'Img_Year_2000', false);


////*************************************************************
// Do not Change from these lines
////*************************************************************

var vis = {"opacity":1,//"bands":["classification_2022"],
"min":1,"max":65,"palette":["#129912","#1f4423","#006400","#00ff00","#687537","#76a5af","#29eee4","#77a605","#935132",
"#bbfcac","#45c2a5","#b8af4f","#f1c232","#ffffb2","#ffd966","#f6b26b","#f99f40","#e974ed","#d5a6bd","#c27ba0","#fff3bf",
"#ea9999","#dd7e6b","#aa0000","#ff99ff","#0000ff","#d5d5e5","#dd497f","#b2ae7c","#af2a2a","#8a2be2","#968c46","#0000ff",
"#4fd3ff","#645617","#fae1f9","#000000","#000000","#f5b3c8","#c71585","#f54ca9","#000000","#000000","#000000","#000000",
"#d68fe2","#9932cc","#e6ccff","#02d659","#ad5100","#000000","#000000","#000000","#000000","#000000","#000000","#000000",
"#000000","#000000","#000000","#000000","#ff69b4","#000000","#000000","#842b4c"]};

///Clasificaciones x region
var classif_reg1 = ee.Image('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA/step_04-complement_reg_1-col_5_1985_class_v1')
                  .addBands(ee.Image('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA/step_04-complement_reg_1-col_5_2000_class_v1'))
                   
var classif_reg2 = ee.Image('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA/step_04-complement_reg_2-col_5_1985_class_v1')
                  .addBands(ee.Image('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA/step_04-complement_reg_2-col_5_2000_class_v1'))

var classif_reg3 = ee.Image('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA/step_04-complement_reg_3-col_5_1985_class_v1')
                  .addBands(ee.Image('projects/mapbiomas-argentina/assets/LAND-COVER/COLLECTION-2/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA/step_04-complement_reg_3-col_5_2000_class_v1'))


var image = ee.ImageCollection.fromImages(
  [ee.Image(classif_reg1), 
   ee.Image(classif_reg2),
   ee.Image(classif_reg3),
   ]).min().clip(regions_union)

Map.addLayer(image.select("classification_2020"),vis,"clasif_ATF") 



var years = [1985, 1986, 1987, 
    1988, 1989, 1990, 1991, 
    1992, 1993, 1994, 1995, 
    1996, 1997, 1998, 1999,
    2000, 2001, 2002, 2003, 
    2004, 2005, 2006, 2007, 
    2008, 2009, 2010, 2011, 
    2012, 2013, 2014, 2015, 
    2016, 2017, 2018, 2019,
    2020, 2021,2022,2023,2024];

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
    years.map(
        function (year) {
            return 'classification_' + String(year);
        }
    )
);

// generate a histogram dictionary of [bandNames, image.bandNames()]
var bandsOccurrence = ee.Dictionary(
    bandNames.cat(image.bandNames()).reduce(ee.Reducer.frequencyHistogram())
);

print(bandsOccurrence);

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
var imagePixelYear = ee.Image.constant(years)
    .updateMask(imageAllBands)
    .rename(bandNames);

// apply the gap fill
var imageFilledtnt0 = applyGapFill(imageAllBands);
var imageFilledYear = applyGapFill(imagePixelYear);



Map.addLayer(image.select('classification_2020'), vis, 'clasif_Nofiltered_2020');
print(image,"bandas clasificaciones")

Map.addLayer(imageFilledtnt0.select('classification_2020'), vis, 'clasif_filtered_2020');

imageFilledtnt0 = imageFilledtnt0.set('version', '1');

print(imageFilledtnt0,"imageFilledtnt0");

// // add connected pixels bands
// var imageFilledConnected = imageFilledtnt0.addBands(
//     imageFilledtnt0
//         .connectedPixelCount(100, true)
//         .rename(bandNames.map(
//             function (band) {
//                 return ee.String(band).cat('_conn')
//             }
//         ))
// );


//print(dirout+prefixo_out+vesion_out)


Export.image.toAsset({
    'image': imageFilledtnt0,
    'description': prefixo_out+col+vesion_out,
    'assetId': dirout+prefixo_out+col+vesion_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': geometry,
    'scale': 30,
    'maxPixels': 1e13
});


var limite = regions_union//.filterMetadata('reg_id', "equals", regiao);
var blank = ee.Image(0).mask(0);
var outline = blank.paint(limite, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, 'regioes', false);


