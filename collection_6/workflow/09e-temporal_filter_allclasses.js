// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 09e — Temporal Filter: All Classes (Round 2)
// ============================================================
//
// DESCRIPTION:
//   Same temporal-noise filter as step 06d (Round 1), applied here to
//   the Round-2 classes.
//
// METHODOLOGY: identical to step 06d — see that script for the full
// algorithm description. Priority order and classes differ: first/last
// masks run for [12, 11, 36, 14] / [36, 14]; the 5/4/3-year window
// filters run for [36, 14, 12, 11].
//
// INPUT:
//   - Grassland/wetland dominance-corrected classification (step 09d
//     output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     only as the export region.
//
// OUTPUT:
//   - Temporally filtered classification. Exported as
//     `step_13_filter_temporal_allclasses_col6_v1_clas2`.
//
// PREVIOUS STEP: 09d-dominance_filter_grassland_wetland.js (produces the
//                classification this script filters)
// NEXT STEP:     09f-spatial_filter_connected_final.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var version_out = 'v1';

var ordem_exec_first = [12, 11, 36, 14];
var ordem_exec_last = [36, 14];
var ordem_exec_middle = [36, 14, 12, 11];


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

// 🔁 REPLACE: Grassland/wetland dominance-corrected classification
// (step 09d output).
var image_FE = ee.Image(dir_pre_class + "/step_12_filter_temporal_grasshum_col6_v1clas2");


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
    filtered = mask3first(ordem_exec_first[i_class], filtered);
}

for (var i_class2 = 0; i_class2 < ordem_exec_last.length; i_class2++) {
    filtered = mask3last(ordem_exec_last[i_class2], filtered);
}

for (var i_class3 = 0; i_class3 < ordem_exec_middle.length; i_class3++) {
    var id_class = ordem_exec_middle[i_class3];
    filtered = window5years(filtered, id_class);
    filtered = window4years(filtered, id_class);
    filtered = window3years(filtered, id_class);
}


// ============================================================
// SECTION 6 — EXPORT
// ============================================================
Export.image.toAsset({
    "image": filtered.toInt8(),
    "description": 'filter_temporal_' + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + '/step_13_filter_temporal_allclasses_col6_' + version_out + "_clas2",
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": reg_union
});
