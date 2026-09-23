// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 06d — Temporal Filter: All Classes (Round 1)
// ============================================================
//
// DESCRIPTION:
//   Removes temporal noise (single-year and multi-year "sandwich"
//   patterns) from the spatially filtered classification, per class, in
//   a fixed priority order, plus first/last-year edge corrections.
//
// METHODOLOGY:
//   1. `mask3first`/`mask3last`: force the first (1985) or last (2025)
//      year to match the class when the two years right after/before it
//      agree with each other but disagree with the edge year.
//   2. `window3years`/`window4years`/`window5years`: for interior years,
//      detect a class dropping out for exactly 1, 2 or 3 years between
//      two years of that class, and fill the gap with that class.
//   3. Apply, in order: `mask3first` and `mask3last` for classes [3, 9,
//      10, 22, 33] (`ordem_exec_first`/`ordem_exec_last` — note
//      `ordem_exec_last` here only includes class 10 in this saved run),
//      then the 5/4/3-year window filters for classes [33, 3, 10, 22, 9]
//      (`ordem_exec_middle`).
//   4. Export the filtered result.
//
// INPUT:
//   - Spatially filtered classification (step 06c output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     only as the export region.
//
// OUTPUT:
//   - Temporally filtered classification. Exported as
//     `step_08a_filter_temporal_allclasses_col6_v1_clas1`.
//
// NOTE (kept as in the original): the source file is named
// "step08f_temporal_filter_allclasses" but exports asset
// "step_08a_filter_temporal_allclasses" — kept the export name as
// found, since later scripts in the pipeline read it by that name.
//
// PREVIOUS STEP: 06c-spatial_filter_connected.js (produces the
//                classification this script filters)
// NEXT STEP:     06e-temporal_filter_plantations.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var vesion_in = 'v1'; // spatial filter version being read
var version_out = 'v1';

// the first number will have priority
var ordem_exec_first = [3, 9, 10, 22, 33];
var ordem_exec_last = [10];
var ordem_exec_middle = [33, 3, 10, 22, 9];


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Update to your own GEE asset folder for the filtered
// classification output.
var dir_pre_class = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA';

// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
var target_values = ee.Filter.inList('Pais', ["Argentina"]);
var reg_union = regions.filter(target_values).union();

// 🔁 REPLACE: Spatially filtered classification (step 06c output).
var image_FE = ee.Image(dir_pre_class + "/step_07b_spatial_filter_col6_" + vesion_in + "_clas1");


// ============================================================
// SECTION 4 — TEMPORAL FILTER FUNCTIONS
// ============================================================
var mask3 = function (valor, ano, imagem) {
    var mask = imagem.select('classification_' + (parseInt(ano) - 1)).eq(valor)
        .and(imagem.select('classification_' + (ano)).neq(valor))
        .and(imagem.select('classification_' + (parseInt(ano) + 1)).eq(valor));
    var muda_img = imagem.select('classification_' + (ano)).mask(mask.eq(1)).where(mask.eq(1), valor);
    return imagem.select('classification_' + ano).blend(muda_img);
};

var mask4 = function (valor, ano, imagem) {
    var mask = imagem.select('classification_' + (parseInt(ano) - 1)).eq(valor)
        .and(imagem.select('classification_' + (ano)).neq(valor))
        .and(imagem.select('classification_' + (parseInt(ano) + 1)).neq(valor))
        .and(imagem.select('classification_' + (parseInt(ano) + 2)).eq(valor));
    var muda_img = imagem.select('classification_' + (ano)).mask(mask.eq(1)).where(mask.eq(1), valor);
    var muda_img1 = imagem.select('classification_' + (parseInt(ano) + 1)).mask(mask.eq(1)).where(mask.eq(1), valor);
    return imagem.select('classification_' + ano).blend(muda_img).blend(muda_img1);
};

var mask5 = function (valor, ano, imagem) {
    var mask = imagem.select('classification_' + (parseInt(ano) - 1)).eq(valor)
        .and(imagem.select('classification_' + (ano)).neq(valor))
        .and(imagem.select('classification_' + (parseInt(ano) + 1)).neq(valor))
        .and(imagem.select('classification_' + (parseInt(ano) + 2)).neq(valor))
        .and(imagem.select('classification_' + (parseInt(ano) + 3)).eq(valor));
    var muda_img = imagem.select('classification_' + (ano)).mask(mask.eq(1)).where(mask.eq(1), valor);
    var muda_img1 = imagem.select('classification_' + (parseInt(ano) + 1)).mask(mask.eq(1)).where(mask.eq(1), valor);
    var muda_img2 = imagem.select('classification_' + (parseInt(ano) + 2)).mask(mask.eq(1)).where(mask.eq(1), valor);
    return imagem.select('classification_' + ano).blend(muda_img).blend(muda_img1).blend(muda_img2);
};

var anos3 = [1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
    2020, 2021, 2022, 2023, 2024];

var anos4 = [1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];

var anos5 = [1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];

var window5years = function (imagem, valor) {
    var img_out = imagem.select('classification_1985');
    for (var i = 0; i < anos5.length; i++) {
        var ano = anos5[i];
        img_out = img_out.addBands(mask5(valor, ano, imagem));
    }
    img_out = img_out.addBands(imagem.select('classification_2023'));
    img_out = img_out.addBands(imagem.select('classification_2024'));
    img_out = img_out.addBands(imagem.select('classification_2025'));
    return img_out;
};

var window4years = function (imagem, valor) {
    var img_out = imagem.select('classification_1985');
    for (var i = 0; i < anos4.length; i++) {
        var ano = anos4[i];
        img_out = img_out.addBands(mask4(valor, ano, imagem));
    }
    img_out = img_out.addBands(imagem.select('classification_2024'));
    img_out = img_out.addBands(imagem.select('classification_2025'));
    return img_out;
};

var window3years = function (imagem, valor) {
    var img_out = imagem.select('classification_1985');
    for (var i = 0; i < anos3.length; i++) {
        var ano = anos3[i];
        img_out = img_out.addBands(mask3(valor, ano, imagem));
    }
    img_out = img_out.addBands(imagem.select('classification_2025'));
    return img_out;
};

var allYears = [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994,
    1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006,
    2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018,
    2019, 2020, 2021, 2022, 2023, 2024, 2025];

var mask3first = function (valor, imagem) {
    var mask = imagem.select('classification_1985').neq(valor)
        .and(imagem.select('classification_1986').eq(valor))
        .and(imagem.select('classification_1987').eq(valor));
    var muda_img = imagem.select('classification_1985').mask(mask.eq(1)).where(mask.eq(1), valor);
    var img_out = imagem.select('classification_1985').blend(muda_img);
    img_out = img_out.addBands(
        allYears.slice(1).map(function (year) { return imagem.select('classification_' + year); })
    );
    return img_out;
};

var mask3last = function (valor, imagem) {
    var mask = imagem.select('classification_2023').eq(valor)
        .and(imagem.select('classification_2024').eq(valor))
        .and(imagem.select('classification_2025').neq(valor));
    var muda_img = imagem.select('classification_2025').mask(mask.eq(1)).where(mask.eq(1), valor);
    var img_out = imagem.select('classification_1985');
    img_out = img_out.addBands(
        allYears.slice(1, allYears.length - 1).map(function (year) { return imagem.select('classification_' + year); })
    );
    img_out = img_out.addBands(imagem.select('classification_2025').blend(muda_img));
    return img_out;
};


// ============================================================
// SECTION 5 — APPLY FILTERS
// ============================================================
var filtered = image_FE;

for (var i_class = 0; i_class < ordem_exec_first.length; i_class++) {
    var id_class_first = ordem_exec_first[i_class];
    filtered = mask3first(id_class_first, filtered);
}

for (var i_class2 = 0; i_class2 < ordem_exec_last.length; i_class2++) {
    var id_class_last = ordem_exec_last[i_class2];
    filtered = mask3last(id_class_last, filtered);
}

for (var i_class3 = 0; i_class3 < ordem_exec_middle.length; i_class3++) {
    var id_class_middle = ordem_exec_middle[i_class3];
    filtered = window5years(filtered, id_class_middle);
    filtered = window4years(filtered, id_class_middle);
    filtered = window3years(filtered, id_class_middle);
}


// ============================================================
// SECTION 6 — EXPORT
// ============================================================
Export.image.toAsset({
    "image": filtered.toInt8(),
    "description": 'filter_temporal_' + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + '/step_08a_filter_temporal_allclasses_col6_' + version_out + "_clas1",
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": reg_union
});
