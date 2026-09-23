// ============================================================
// Atlantic Forest (Bosque Atlántico) | Collection 6 | Step 16b — Standardize & Export Final Product
// ============================================================
//
// Script modelo para padronização dos assets do Mapbiomas
// (Standard template script for standardizing MapBiomas assets — shared
// across MapBiomas territories, comments kept in the original
// Portuguese/Spanish mix as found.)
//
// DESCRIPTION:
//   Takes the stacked classification (step 16a output), tags it with
//   the standard MapBiomas asset metadata (biome/theme, collection id,
//   source, version), and exports it to the public FINAL_CLASSIFICATION
//   path — this is the final product of the Collection 6 Atlantic
//   Forest pipeline.
//
// METHODOLOGY:
//   1. Load the stacked classification.
//   2. Set metadata properties: `biome` (or `theme`, if this pipeline
//      were a cross-cutting theme instead of a biome), `collection`,
//      `source`, `version`.
//   3. Export under a standardized name (`<biome-name>-FINAL_v<version>`).
//
// INPUT:
//   - Stacked classification (16a output).
//   - Zones FeatureCollection (Atlantic Forest AR-PY regions) — used
//     only as the export region.
//
// OUTPUT:
//   - Final Collection 6 Atlantic Forest classification. Exported as
//     `BosqueAtlantico-FINAL_v1`.
//
// PREVIOUS STEP: 16a-stack_rounds.js (produces the classification this
//                script standardizes and publishes)
// NEXT STEP:     none — final product of the Collection 6 pipeline
//
// AUTHORS: MapBiomas Argentina — Atlantic Forest team
// ============================================================


// ============================================================
// SECTION 1 — CONFIGURATION PARAMETERS
// ============================================================
// Defina a versão de entrada do seu dado
var inputVersion = '1';

// Defina a versão de saída
var outputVersion = '1';

// Defina o id de lançamento da coleção mapbiomas
var collectionId = 6.0;

// Se for bioma use este.
var theme = { 'type': 'biome', 'name': 'BosqueAtlantico-FINAL_v' };
// Se for tema transversal use este.
// var theme = { 'type': 'theme', 'name': 'INFRAURBANA'};

// Defina a fonte produto do dado
var source = 'fvs';


// ============================================================
// SECTION 3 — INPUT DATA
// ============================================================
// 🔁 REPLACE: Zones FeatureCollection (Atlantic Forest AR-PY regions).
var regions = ee.FeatureCollection('projects/YOUR-PROJECT/assets/ANCILLARY_DATA/VECTOR/Regiones_AR-PY_col3');
regions = regions.union();

// 🔁 REPLACE: Stacked classification (16a output).
var assetInput = ee.Image('projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FILTERS/BA/step_24_apilado_col6_v1_integrado');

// 🔁 REPLACE: Update to your own GEE asset folder for the final
// classification output.
var assetOutput = 'projects/YOUR-PROJECT/assets/LAND-COVER/COLLECTION-3/GENERAL/CLASSIFICATION/FINAL_CLASSIFICATION/BA';


// ============================================================
// SECTION 4 — STANDARDIZE METADATA
// ============================================================
var collection = assetInput
    .set(theme.type, theme.name)
    .set('collection', collectionId)
    .set('source', source)
    .set('version', outputVersion);

var name = theme.name + outputVersion;


// ============================================================
// SECTION 5 — EXPORT
// ============================================================
Export.image.toAsset({
    'image': collection,
    'description': name,
    // 🔁 REPLACE: Update to your own GEE asset folder (see
    // `assetOutput` above).
    'assetId': assetOutput + '/' + name,
    'pyramidingPolicy': { '.default': 'mode' },
    'region': regions,
    'scale': 30,
    'maxPixels': 1e13
});
