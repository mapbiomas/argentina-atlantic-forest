// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 06e — Temporal Filter: Forest Plantations (Round 1)
// ============================================================
//
// DESCRIPTION:
//   Forest plantations (class 9) go through harvest/replanting cycles
//   that create legitimate multi-year gaps in the class 9 record —
//   the general temporal filter (step 06d) isn't tuned for this, so
//   this script applies a plantation-specific set of 3-year "sandwich"
//   rules, per year, in three passes ("type1/2/3", see METHODOLOGY).
//   This is the optimized, single-generalized-loop rewrite of an
//   earlier, much larger cascade of fixed-window (3-to-12-year) filter
//   functions — see NOTE.
//
// METHODOLOGY:
//   For each year (1986–2023/2024, depending on type) and each class in
//   `middle_plant` (class 9 only in this saved run):
//   1. type2: if the previous year is forest (3), the current year is
//      non-vegetated or "Otros" (22 or 10), and the next year is the
//      target class (9) — set the current year to the target class
//      (treats a 1-year forest→bare→plantation transition as noise,
//      i.e. the plantation was likely already there).
//   2. type3: if the previous year is the target class, and both the
//      current and next years are non-vegetated or "Otros" — set the
//      current year to the target class (fills a 2-year apparent gap
//      right after a plantation year).
//   3. type1: standard 3-year sandwich — previous and next year equal
//      the target class, current year doesn't — set current year to the
//      target class.
//   4. Apply `mask3first`/`mask3last` to force the first/last year to
//      match when the two years right after/before it agree.
//   5. Export the result.
//
// INPUT:
//   - Temporally filtered classification (step 06d output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     only as the export region.
//
// OUTPUT:
//   - Plantation-corrected classification. Exported as
//     `step_08b_filter_temporal_plantaciones_col6_v1`.
//
// NOTE (kept as in the original): this script supersedes two earlier
// implementations of the same idea, not included in this repository: a
// monolithic ~1,400-line script defining the same window rules
// separately for every window size from 3 to 12 years, and a
// modularized version split into a driver script plus a ~1,300-line
// function library (`require()`d), which ran the exact same 3-to-12-year
// cascade. Both were replaced by this version (labeled by the original
// team as the "optimized" version, "to avoid hangs") because a single
// 3-year window applied at every year is equivalent in effect to the
// cascade, at a fraction of the computation.
//
// PREVIOUS STEP: 06d-temporal_filter_allclasses.js (produces the
//                classification this script corrects for plantations)
// NEXT STEP:     06f-temporal_filter_plantations_lastyears.js
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
var version_out = 'v1';

var middle_plant = [9]; // classes to process
var ordem_exec_first = [9];
var ordem_exec_last = [9];


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

// 🔁 REPLACE: Temporally filtered classification (step 06d output).
var image_FE = ee.Image(dir_pre_class + '/step_08a_filter_temporal_allclasses_col6_v1_clas1');


// ============================================================
// SECTION 4 — PLANTATION-SPECIFIC TEMPORAL FILTER
// ============================================================
var applyMaskToBand = function (imagem, valor, ano, maskType) {
    var yearStr = ano.toString();
    var prevYear = (ano - 1).toString();
    var nextYear = (ano + 1).toString();

    var mask;
    if (maskType === 'type1') {
        // A=X, B!=X, C=X
        mask = imagem.select('classification_' + prevYear).eq(valor)
            .and(imagem.select('classification_' + yearStr).neq(valor))
            .and(imagem.select('classification_' + nextYear).eq(valor));
    } else if (maskType === 'type2') {
        // prev=forest(3), current in [non-vegetated(22), Otros(10)], next=target class
        mask = imagem.select('classification_' + prevYear).eq(3)
            .and(imagem.select('classification_' + yearStr).eq(22)
                .or(imagem.select('classification_' + yearStr).eq(10)))
            .and(imagem.select('classification_' + nextYear).eq(valor));
    } else if (maskType === 'type3') {
        // prev=target class, current and next in [non-vegetated(22), Otros(10)]
        mask = imagem.select('classification_' + prevYear).eq(valor)
            .and(imagem.select('classification_' + yearStr).eq(22)
                .or(imagem.select('classification_' + yearStr).eq(10)))
            .and(imagem.select('classification_' + nextYear).eq(22)
                .or(imagem.select('classification_' + nextYear).eq(10)));
    }

    var muda_img = imagem.select('classification_' + yearStr).mask(mask.eq(1))
        .where(mask.eq(1), valor);
    return imagem.select('classification_' + yearStr).blend(muda_img);
};

var mask3first = function (valor, imagem) {
    var mask = imagem.select('classification_1985').neq(valor)
        .and(imagem.select('classification_1986').eq(valor))
        .and(imagem.select('classification_1987').eq(valor));
    var muda_img = imagem.select('classification_1985').mask(mask.eq(1)).where(mask.eq(1), valor);
    var img_out = imagem.select('classification_1985').blend(muda_img);

    for (var y = 1986; y <= 2025; y++) {
        img_out = img_out.addBands(imagem.select('classification_' + y.toString()));
    }
    return img_out;
};

var mask3last = function (valor, imagem) {
    var mask = imagem.select('classification_2023').eq(valor)
        .and(imagem.select('classification_2024').eq(valor))
        .and(imagem.select('classification_2025').neq(valor));
    var muda_img = imagem.select('classification_2025').mask(mask.eq(1))
        .where(mask.eq(1), valor);

    var img_out = imagem.select('classification_1985');
    for (var y = 1986; y <= 2024; y++) {
        img_out = img_out.addBands(imagem.select('classification_' + y.toString()));
    }
    img_out = img_out.addBands(imagem.select('classification_2025').blend(muda_img));
    return img_out;
};

var filtered = image_FE;

for (var i = 0; i < middle_plant.length; i++) {
    var id_class = middle_plant[i];

    // type 2 (years 1986-2023)
    for (var ano2 = 1986; ano2 <= 2023; ano2++) {
        var filtered_band2 = applyMaskToBand(filtered, id_class, ano2, 'type2');
        var banda_name2 = 'classification_' + ano2.toString();
        var otherBands2 = filtered.select(
            filtered.bandNames().filter(ee.Filter.neq('item', banda_name2))
        );
        filtered = filtered_band2.addBands(otherBands2);
    }

    // type 3 (years 1986-2024)
    for (var ano3 = 1986; ano3 <= 2024; ano3++) {
        var filtered_band3 = applyMaskToBand(filtered, id_class, ano3, 'type3');
        var banda_name3 = 'classification_' + ano3.toString();
        var otherBands3 = filtered.select(
            filtered.bandNames().filter(ee.Filter.neq('item', banda_name3))
        );
        filtered = filtered_band3.addBands(otherBands3);
    }

    // type 1 (years 1986-2024)
    for (var ano1 = 1986; ano1 <= 2024; ano1++) {
        var filtered_band1 = applyMaskToBand(filtered, id_class, ano1, 'type1');
        var banda_name1 = 'classification_' + ano1.toString();
        var otherBands1 = filtered.select(
            filtered.bandNames().filter(ee.Filter.neq('item', banda_name1))
        );
        filtered = filtered_band1.addBands(otherBands1);
    }
}

for (var j = 0; j < ordem_exec_first.length; j++) {
    filtered = mask3first(ordem_exec_first[j], filtered);
}

for (var k = 0; k < ordem_exec_last.length; k++) {
    filtered = mask3last(ordem_exec_last[k], filtered);
}


// ============================================================
// SECTION 5 — EXPORT
// ============================================================
Export.image.toAsset({
    "image": filtered.toInt8(),
    "description": 'filter_temporal_' + version_out,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `dir_pre_class` above).
    "assetId": dir_pre_class + '/step_08b_filter_temporal_plantaciones_col6_' + version_out,
    "scale": 30,
    "pyramidingPolicy": { '.default': 'mode' },
    "maxPixels": 1e13,
    "region": reg_union
});
