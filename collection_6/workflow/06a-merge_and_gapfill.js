// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 06a — Merge Regions & Gap Fill (Round 1)
// ============================================================
//
// DESCRIPTION:
//   Combines the 3 regions' complement classifications (step 04 output)
//   into a single national mosaic, using per-pixel minimum-value
//   priority to resolve overlaps, then fills temporal gaps (years
//   missing for a given pixel) by carrying the nearest valid year's
//   class forward and backward.
//
// METHODOLOGY:
//   1. Load each region's two complement-classification exports (1985
//      and 2000 periods) and stack them into one multi-year image per
//      region.
//   2. Mosaic the 3 regions with `.min()` priority (matches the pattern
//      used elsewhere in this pipeline family for region overlaps).
//   3. Build a full-years band stack (1985–2025), inserting an empty
//      (fully masked) band for any year missing from the input.
//   4. Gap-fill forward in time (t0 → tn), then backward (tn → t0).
//   5. Export the filled multi-year classification.
//
// INPUT:
//   - Per-region complement classifications (04-stable_map.js output,
//     both periods, all 3 regions).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions).
//
// OUTPUT:
//   - Gap-filled, merged multi-year classification. Exported as
//     `step_06_gap-fill_col6_v1`.
//
// PREVIOUS STEP: 04-stable_map.js (produces each region's complement
//                classification)
// NEXT STEP:     06b-spatial_filter_mode.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team (adapted by Pablo
//          Baldassini, May 2026)
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var version_out = 'v1';
var col = "col6_";
var prefixo_out = 'step_06_gap-fill_';

var years = [1985, 1986, 1987,
    1988, 1989, 1990, 1991,
    1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999,
    2000, 2001, 2002, 2003,
    2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011,
    2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019,
    2020, 2021, 2022, 2023, 2024, 2025];


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var regions_union = regions.union();

// 🔁 REPLACE: Export bounding box (Argentina Atlantic Forest extent) —
// used only as the export region below.
var exportRegion = ee.Geometry.Polygon(
    [[[-60.23680810003558, -19.33531374656231],
      [-60.23680810003558, -31.11250553661841],
      [-53.02977685003558, -31.11250553661841],
      [-53.02977685003558, -19.33531374656231]]], null, false);

// 🔁 REPLACE: Per-region complement classifications (04-stable_map.js
// output, both periods).
var dircol5 = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/COMPLEMENT_CLASSIFICATION/BA';
// 🔁 REPLACE: Update to your own GEE asset folder for the filtered
// classification output.
var dirout = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA/';

var classif_reg1 = ee.Image(dircol5 + '/BAstep_04_reg_1-col_6_1985_class_v1_clas1')
    .addBands(ee.Image(dircol5 + '/BAstep_04_reg_1-col_6_2000_class_v1_clas1'));

var classif_reg2 = ee.Image(dircol5 + '/BAstep_04_reg_2-col_6_1985_class_v1_clas1')
    .addBands(ee.Image(dircol5 + '/BAstep_04_reg_2-col_6_2000_class_v1_clas1'));

var classif_reg3 = ee.Image(dircol5 + '/BAstep_04_reg_3-col_6_1985_class_v1_clas1')
    .addBands(ee.Image(dircol5 + '/BAstep_04_reg_3-col_6_2000_class_v1_clas1'));


// ============================================================
// SECTION 4 — MERGE REGIONS
// ============================================================
var image = ee.ImageCollection.fromImages(
    [ee.Image(classif_reg1),
        ee.Image(classif_reg2),
        ee.Image(classif_reg3)
    ]).min().clip(regions_union);


// ============================================================
// SECTION 5 — GAP FILL
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

imageFilledtnt0 = imageFilledtnt0.set('version', '1');


// ============================================================
// SECTION 6 — EXPORT
// ============================================================
Export.image.toAsset({
    'image': imageFilledtnt0,
    'description': prefixo_out + col + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see `dirout`
    // above).
    'assetId': dirout + prefixo_out + col + version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': exportRegion,
    'scale': 30,
    'maxPixels': 1e13
});
