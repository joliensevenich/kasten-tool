'use strict';
// MPR-export voor woodWOP (HOMAG). Eén programma per paneel en per zijde, in het klassieke tekstformaat
// (MPR 4.0), dat woodWOP 7/8 inleest. Schrijfwijze volgens de woodWOP-bestandsbeschrijving; gereedschap
// voor frezen uit het voorbeeldprogramma van de P110 (GERY.mprx: frees 101 voor kamers, 130 voor contouren).
//
// Ligging op de machine: X langs de nerf (lengte), Y dwars, Z omhoog; nulpunt linksvoor, zijde A naar boven.
// Zijde A is de zijde met de meeste bewerkingen (binnenkant van een zijwand of deur, bovenkant van een bodem).

const MPR_DEFAULTS = {
  freesKlein: '156',        // Ø8: led-groeven en kleine kamers
  freesContour: '130',      // wisselmesfrees Ø18 rechtsdraaiend: uitsparingen en contouren
  freesContourLinks: '150', // wisselmesfrees Ø18 linksdraaiend
  freesRichting: 'gelijkloop', // contour: het afgewerkte stuk in gelijkloop (minder uitbrokkelen), of 'tegenloop'
  groefMethode: 'zaag',     // 'zaag' (Nuten) of 'frees' (Tasche)
  schuinMethode: 'frees',   // schuine kanten: 'frees' (130) of 'zaag' (300, Kontursaegen niet getest); de rug wordt altijd gefreesd
  zaagSchuin: '300',        // zaag voor schuine kanten (schuine kasten)
  groefTool: '1300',        // sponningzaag
  boorModusBlind: 'LS',     // langzaam-snel tot diepte
  boorModusDoor: 'LSL',     // langzaam-snel-langzaam doorgaand
  boorTerugGrens: 20,       // dieper dan dit: boren met terugtrekken
  boorTerugVul: 20,         // vuldiepte per stap
  boorTerugMaat: 5,         // terugtrekmaat
  boorTerugModus: 'STD',    // BM2-code in woodWOP
  doorExtra: 3,             // extra diepte bij doorgaand boren (P110: 21 mm bij 18 mm plaat)
  clamex: true,             // Clamex als component-macro (lamello_p_system) in het programma
};

// Gereedschap van de HOMAG P110 (gereedschapsbeheer, foto's van 13-10-2026).
// soort: frees, boorV (verticaal boorblok), boorH (horizontaal, met richting), boorL (lange doorgaande boor), zaag.
// dia = werkelijke diameter (2 × radius G1), lengte = bruikbare lengte (G3.1).
const P110_TOOLS = [
  { nr: '130', naam: 'Wisselmesfrees Ø18 rechts', soort: 'frees', dia: 17.94, lengte: 50 },
  { nr: '131', naam: 'Frees Ø20 rechts', soort: 'frees', dia: 19, lengte: 75 },
  { nr: '132', naam: 'Frees Ø13 rechts', soort: 'frees', dia: 13, lengte: 44 },
  { nr: '133', naam: 'Frees Ø13 rechts, negatief snijvlak', soort: 'frees', dia: 11.55, lengte: 44 },
  { nr: '139', naam: 'Frees Ø6 rechts', soort: 'frees', dia: 4.34, lengte: 21 },
  { nr: '150', naam: 'Wisselmesfrees Ø18 links', soort: 'frees', dia: 17.94, lengte: 50 },
  { nr: '152', naam: 'Diamantfrees Ø25 rechts', soort: 'frees', dia: 25, lengte: 50 },
  { nr: '154', naam: 'Krukfrees', soort: 'frees', dia: 15.2, lengte: 65 },
  { nr: '155', naam: 'Frees Ø3 rechts', soort: 'frees', dia: 4.03, lengte: 12 },
  { nr: '156', naam: 'Frees Ø8 rechts', soort: 'frees', dia: 7.71, lengte: 31 },
  { nr: '157', naam: 'Slotkastfrees Ø16', soort: 'frees', dia: 17.65, lengte: 95 },
  { nr: '158', naam: 'Doorgaande boor Ø8', soort: 'boorL', dia: 8, lengte: 65 },
  { nr: '159', naam: 'Doorgaande boor Ø12', soort: 'boorL', dia: 12, lengte: 120 },
  { nr: '160', naam: 'Doorgaande boor Ø10', soort: 'boorL', dia: 10, lengte: 85 },
  { nr: '180', naam: 'Hoekfrees 60°', soort: 'frees', dia: 0.2, lengte: 30 },
  { nr: '181', naam: 'Hoekfrees 45°', soort: 'frees', dia: 0.2, lengte: 30 },
  { nr: '200', naam: 'Trespafrees Ø18 rechts', soort: 'frees', dia: 19.7, lengte: 22 },
  { nr: '201', naam: 'Clamex-zaag Ø100,4', soort: 'zaag', dia: 100.4, lengte: 30 },
  { nr: '202', naam: 'Clamex-frees', soort: 'frees', dia: 9, lengte: 20 },
  { nr: '203', naam: 'Lamello-zaag Ø100', soort: 'zaag', dia: 100, lengte: 3.9 },
  { nr: '230', naam: 'Afrondfrees', soort: 'frees', dia: 40.3, lengte: 30 },
  { nr: '300', naam: 'Zaagblad Ø300', soort: 'zaag', dia: 300, lengte: 3.4 },
  { nr: '305', naam: 'Vlakfrees', soort: 'frees', dia: 120, lengte: 20 },
  { nr: '1300', naam: 'Sponningzaag 5 mm', soort: 'zaag', dia: 120, lengte: 25 },
  { nr: '1001', naam: 'Verticale boor Ø8', soort: 'boorV', dia: 8, lengte: 30 },
  { nr: '1002', naam: 'Verticale boor Ø4', soort: 'boorV', dia: 4, lengte: 30 },
  { nr: '1003', naam: 'Verticale boor Ø10', soort: 'boorV', dia: 10, lengte: 30 },
  { nr: '1004', naam: 'Verticale boor Ø8', soort: 'boorV', dia: 8, lengte: 30 },
  { nr: '1005', naam: 'Verticale boor Ø8', soort: 'boorV', dia: 8, lengte: 30 },
  { nr: '1006', naam: 'Verticale boor Ø35', soort: 'boorV', dia: 35, lengte: 15 },
  ...['1007', '1008', '1009', '1010', '1011', '1012'].map(nr => ({ nr, naam: 'Verticale boor Ø5', soort: 'boorV', dia: 5, lengte: 30 })),
  { nr: '160', naam: 'Boor Ø10 (push-open drevel), alle richtingen', soort: 'boorH', dia: 10, lengte: 90 },
  { nr: '1111', naam: 'Horizontale boor Ø8 X+', soort: 'boorH', dia: 8, lengte: 40, richting: 'XP' },
  { nr: '1113', naam: 'Horizontale boor Ø8 X+', soort: 'boorH', dia: 8, lengte: 40, richting: 'XP' },
  { nr: '1112', naam: 'Horizontale boor Ø8 X−', soort: 'boorH', dia: 8, lengte: 40, richting: 'XM' },
  { nr: '1114', naam: 'Horizontale boor Ø8 X−', soort: 'boorH', dia: 8, lengte: 40, richting: 'XM' },
  { nr: '1161', naam: 'Horizontale boor Ø8 Y−', soort: 'boorH', dia: 8, lengte: 40, richting: 'YM' },
  { nr: '1162', naam: 'Horizontale boor Ø8 Y+', soort: 'boorH', dia: 8, lengte: 40, richting: 'YP' },
];

/** Controleert of een boring met het gereedschap van de machine kan; geeft een omschrijving van het probleem, of null. */
function checkDrill(tools, { dia, diepte, horizontaal, richting, door }) {
  const near = t => Math.abs(t.dia - dia) < 0.3;
  if (horizontaal) {
    const fit = tools.filter(t => t.soort === 'boorH' && near(t));
    if (!fit.length) return `horizontale boring Ø${dia}: geen horizontale boor met die diameter`;
    if (richting && !fit.some(t => !t.richting || t.richting === richting)) return `horizontale boring Ø${dia} in richting ${richting}: geen boor in die richting`;
    if (Math.max(...fit.map(t => t.lengte)) < diepte) return `horizontale boring Ø${dia} × ${diepte}: boor te kort (${Math.max(...fit.map(t => t.lengte))} mm)`;
    return null;
  }
  const fit = tools.filter(t => (t.soort === 'boorV' || t.soort === 'boorL') && near(t));
  if (!fit.length) {
    // Grotere gaten kunnen met een frees (rondfrezen).
    if (tools.some(t => t.soort === 'frees' && t.dia < dia - 0.5)) return null;
    return `boring Ø${dia}: geen boor met die diameter`;
  }
  if (Math.max(...fit.map(t => t.lengte)) < diepte - 0.01) return `boring Ø${dia} × ${diepte}: boor te kort (${Math.max(...fit.map(t => t.lengte))} mm)`;
  return null;
}


// Clamex P-14 zoals in de programma's van de P110 (component-macro's uit lamello_p_system):
// in het vlak met frees 202 (Lamello_router), in de kant met zaag 201 (Lamello_4s_45).
// Letterlijk overgenomen uit K01RO0008.MPR en K02MS2005.MPR; enkel X, Y, Z/A en XY_Angle worden ingevuld.
const CLAMEX_ROUTER = [
"<139 \\Komponente\\",
"IN=\"lamello_p_system\\Lamello_router.mpr\"",
"XA=\"0.0\"",
"YA=\"0.0\"",
"ZA=\"0.0\"",
"WI=\"0.0\"",
"EM=\"0\"",
"VA=\"X {X}\"",
"VA=\"Y {Y}\"",
"VA=\"Z {Z}\"",
"VA=\"XY_Angle {XY}\"",
"VA=\"Vertical 1\"",
"VA=\"CA 0\"",
"VA=\"LINE1 0000000000000000\"",
"VA=\"P15 {P15}\"",
"VA=\"P14 {P14}\"",
"VA=\"P10 {P10}\"",
"VA=\"LINE2 0000000000000000\"",
"VA=\"Trim 1\"",
"VA=\"Drill 1\"",
"VA=\"L_App 3\"",
"VA=\"FeedRate 2\"",
"VA=\"Comment 1\"",
"VA=\"ComTurn 0\"",
"VA=\"LINE3 0000000000000000\"",
"VA=\"L_Diam 100.4\"",
"VA=\"D_Diam 6\"",
"VA=\"D_DVer 38\"",
"VA=\"LTool_U 202\"",
"VA=\"LINE4 0000000000000000\"",
"VA=\"D _BSZ\"",
"VA=\"Calc_De1 IF P15=1 THEN 15 ELSE 0\"",
"VA=\"Calc_De2 IF P10=1 THEN 10 ELSE 0\"",
"VA=\"Calc_De3 IF P14=1 THEN 14 ELSE 0\"",
"VA=\"L_Depth IF Calc_De1+Calc_De2+Calc_De3>=16 THEN 15 ELSE Calc_De1+Calc_De2+Calc_De3\"",
"VA=\"Incline IF Vertical=1 THEN 0 ELSE 90\"",
"VA=\"Cond_U IF LTool_U<>0 AND Incline >= 0 AND Incline <= 90 THEN 1 ELSE 0\"",
"VA=\"Process Cond_U\"",
"VA=\"Alpha ARCCOS((L_Diam/2-L_Depth-L_App)/(L_Diam/2))\"",
"VA=\"D_Sp_Inc L_Depth-15+7.2\"",
"VA=\"Cond_Ang IF Incline>0 AND Incline <=90 THEN 1 ELSE 0\"",
"VA=\"D_dZ_Inc IF Cond_Ang=1 THEN D_Sp_Inc*COS(Incline) ELSE 0\"",
"VA=\"D_dZ_Dri IF Cond_Ang=1 THEN D-(Z-D_dZ_Inc) ELSE 0\"",
"VA=\"InclineM IF Incline=0 THEN 0.0001 ELSE Incline\"",
"VA=\"D_dY_Dri IF Cond_Ang=1 THEN D_dZ_Dri*TAN(90-InclineM) ELSE 0\"",
"VA=\"D_Depth IF Cond_Ang=1 THEN SQRT(D_dY_Dri^2+D_dZ_Dri^2) ELSE 10\"",
"VA=\"Calc_CA IF CA=0 THEN 0.01 ELSE CA\"",
"KAT=\"Komponentenmakro\"",
"MNM=\"Lamello_router\"",
"KO=\"00\""
];
const CLAMEX_SAW = [
"<139 \\Komponente\\",
"IN=\"lamello_p_system\\Lamello_4s_45.mpr\"",
"XA=\"0.0\"",
"YA=\"0.0\"",
"ZA=\"0.0\"",
"WI=\"0.0\"",
"EM=\"0\"",
"VA=\"X {X}\"",
"VA=\"Y {Y}\"",
"VA=\"A {A}\"",
"VA=\"Angle {ANG}\"",
"VA=\"XY_Angle {XY}\"",
"VA=\"LINE0 0000000000000000\"",
"VA=\"WiAg 1\"",
"VA=\"HorAg 1\"",
"VA=\"HSK 0\"",
"VA=\"LINE1 0000000000000000\"",
"VA=\"P15 {P15}\"",
"VA=\"P14 {P14}\"",
"VA=\"P10 {P10}\"",
"VA=\"LINE2 0000000000000000\"",
"VA=\"Trim 1\"",
"VA=\"measure 0\"",
"VA=\"Drill {DRILL}\"",
"VA=\"DrillUni 0\"",
"VA=\"Saw {SAW}\"",
"VA=\"Comment 1\"",
"VA=\"ComTurn 0\"",
"VA=\"LINE3 0000000000000000\"",
"VA=\"LTool_U 201\"",
"VA=\"LTool_0 0\"",
"VA=\"LTool_90 0\"",
"VA=\"LSaw 500\"",
"VA=\"L_Diam 100.4\"",
"VA=\"D_Diam 6\"",
"VA=\"L_App 10\"",
"VA=\"L_Stroke 1.5\"",
"VA=\"DClamex 7\"",
"VA=\"D_DUni 23.5\"",
"VA=\"D_DVer 30\"",
"VA=\"LINE4 0000000000000000\"",
"VA=\"VAR1 _BSX\"",
"VA=\"VAR2 _BSY\"",
"VA=\"VAR3 _BSZ\"",
"VA=\"Calc_De1 IF P15=1 THEN 15 ELSE 0\"",
"VA=\"Calc_De2 IF P10=1 THEN 10 ELSE 0\"",
"VA=\"Calc_De3 IF P14=1 THEN 14 ELSE 0\"",
"VA=\"L_Depth IF Calc_De1+Calc_De2+Calc_De3>=16 THEN 15 ELSE Calc_De1+Calc_De2+Calc_De3\"",
"VA=\"InclineM IF Angle=0 THEN 0.0001 ELSE Angle\"",
"VA=\"XX0 X\"",
"VA=\"YY0 IF Angle=0 THEN Y ELSE COS(InclineM)*((VAR3/SIN(InclineM))-A)\"",
"VA=\"XX90 IF Angle=0 THEN X ELSE VAR1-COS(InclineM)*((VAR3/SIN(InclineM))-A)\"",
"VA=\"YY90 Y\"",
"VA=\"XX180 X\"",
"VA=\"YY180 IF Angle=0 THEN Y ELSE VAR2-COS(InclineM)*((VAR3/SIN(InclineM))-A)\"",
"VA=\"XX270 IF Angle=0 THEN X ELSE COS(InclineM)*((VAR3/SIN(InclineM))-A)\"",
"VA=\"YY270 Y\"",
"VA=\"XXB1 IF XY_Angle=270 THEN XX270 ELSE XX90\"",
"VA=\"XXB2 IF XY_Angle=0 THEN XX0 ELSE XX180\"",
"VA=\"YYB1 IF XY_Angle=270 THEN YY270 ELSE YY90\"",
"VA=\"YYB2 IF XY_Angle=0 THEN YY0 ELSE YY180\"",
"VA=\"XP IF XY_Angle=270 OR XY_Angle=90 THEN XXB1 ELSE XXB2\"",
"VA=\"YP IF XY_Angle=270 OR XY_Angle=90 THEN YYB1 ELSE YYB2\"",
"VA=\"ZP SIN(InclineM)*((VAR3/SIN(InclineM))-A)\"",
"VA=\"Cond_U IF LTool_U<>0 AND Angle >= 0 AND Angle <= 90 THEN 1 ELSE 0\"",
"VA=\"Cond_0 IF LTool_0<>0 AND Angle = 0 THEN 1 ELSE 0\"",
"VA=\"Cond_90 IF LTool_90<>0 AND Angle = 90 THEN 1 ELSE 0\"",
"VA=\"Process Cond_U+Cond_0+Cond_90\"",
"VA=\"D_Sp_Inc IF (P15 OR P14=1) THEN 7 ELSE 5.5\"",
"VA=\"Cond_Ang IF Angle>0 AND Angle <=90 THEN 1 ELSE 0\"",
"VA=\"D_dY_Inc IF Cond_Ang=1 THEN D_Sp_Inc*SIN(Angle) ELSE 0\"",
"VA=\"D_dZ_Inc IF Cond_Ang=1 THEN D_Sp_Inc*COS(Angle) ELSE 0\"",
"VA=\"D_dZ_Dri IF Cond_Ang=1 THEN VAR3-(ZP-D_dZ_Inc) ELSE 0\"",
"VA=\"D_dY_Dri IF Cond_Ang=1 THEN D_dZ_Dri*TAN(90-InclineM) ELSE 0\"",
"VA=\"D_Depth IF Cond_Ang=1 THEN SQRT(D_dY_Dri^2+D_dZ_Dri^2) ELSE 10\"",
"VA=\"SAFE1 IF XY_Angle=0 OR XY_Angle=90 OR XY_Angle=180 OR XY_Angle=270 THEN 1 ELSE 0\"",
"VA=\"SAFE2 IF (Angle>=22.5 AND Angle<=90) OR Angle=0 THEN 1 ELSE 0\"",
"VA=\"SAFE3 IF HorAg=0 AND Trim=1 AND Angle=0 AND XY_Angle=0 AND Y>50 THEN 0 ELSE 1\"",
"VA=\"SAFE4 IF HorAg=0 AND Trim=1 AND Angle=0 AND XY_Angle=90 AND X<VAR1-50 THEN 0 ELSE 1\"",
"VA=\"SAFE5 IF HorAg=0 AND Trim=1 AND Angle=0 AND XY_Angle=180 AND Y<VAR2-50 THEN 0 ELSE 1\"",
"VA=\"SAFE6 IF HorAg=0 AND Trim=1 AND Angle=0 AND XY_Angle=270 AND X>50 THEN 0 ELSE 1\"",
"VA=\"SAFE SAFE1 AND SAFE2 AND SAFE3 AND SAFE4 AND SAFE5 AND SAFE6\"",
"KAT=\"Komponentenmakro\"",
"MNM=\"Lamello_4s_45\"",
"KO=\"00\""
];
/** Een eigen sleufdiepte (bv. in een stijl hoogstens de halve dikte): vervangt de berekende L_Depth in de macro. */
const clamexDepth = op => (Number(op.diepte) > 0 ? { LD: f3(op.diepte) } : {});

function clamexBlock(tpl, vals) {
  return tpl.map(l => (vals.LD && l.startsWith('VA="L_Depth ') ? `VA="L_Depth ${vals.LD}"` : l)).map(l => l.replace(/\{(X|Y|Z|A|XY|ANG|SAW|DRILL|P10|P14|P15)\}/g, (_, k) => vals[k] ?? ({ ANG: '90', SAW: '1', DRILL: '0', P14: '1', P10: '0', P15: '0' }[k] ?? ''))).join('\r\n') + '\r\n';
}

const f3 = n => String(Math.round(Number(n) * 1000) / 1000);

/** Hoe een paneel op de machine ligt: welke zijde boven, en (u,v) → (X,Y). */
function mprFrame(p) {
  const faceOps = side => p.ops.filter(o => o.face === side && !o.doorgaand && o.edge == null).length;
  if (p.rol === 'zijwand') {
    const L = p.vLen, B = p.uLen;
    // Binnenkant boven, voorkant altijd op Y = 0; links en rechts in de lengte gespiegeld.
    // Links: onderkant op X = 0; rechts: bovenkant op X = 0 (zo nagekeken op de P110, 14-10-2026).
    return p.left
      ? { up: 'binnen', down: 'buiten', L, B, map: (u, v) => [v, B - u] }
      : { up: 'binnen', down: 'buiten', L, B, map: (u, v) => [L - v, B - u] };
  }
  if (p.rol === 'stijl') {
    // Middenstijl: zoals een zijwand, voorkant altijd op Y = 0; de andere zijde in de lengte gespiegeld.
    const L = p.vLen, B = p.uLen;
    return { up: 'rechts', down: 'links', L, B, map: (u, v) => [v, B - u], mapB: (u, v) => [L - v, B - u] };
  }
  if (p.grain === 'u') {
    const L = p.uLen, B = p.vLen;
    if (p.rol === 'plint') return { up: 'binnen', down: 'voor', L, B, map: (u, v) => [u, B - v] };
    return faceOps('onder') > faceOps('boven')
      ? { up: 'onder', down: 'boven', L, B, map: (u, v) => [u, v] }
      : { up: 'boven', down: 'onder', L, B, map: (u, v) => [u, B - v] };
  }
  // Fronten en rug: binnen- of achterkant naar boven. Een deur met scharnieren rechts ligt gedraaid,
  // zodat de scharnierkant altijd op Y = 0 ligt (zoals in de P110-programma's).
  const L = p.vLen, B = p.uLen;
  const hingeRight = p.ops.some(o => o.naam === 'Scharnierpot' && o.u > B / 2);
  if (hingeRight) return { up: 'binnen', down: 'voor', L, B, map: (u, v) => [L - v, B - u] };
  return { up: p.rol === 'rug' ? 'achter' : 'binnen', down: p.rol === 'rug' ? 'voor' : 'voor', L, B, map: (u, v) => [v, u] };
}

function mprHeader(L, B, D) {
  return [
    '[H', 'VERSION="4.0 Alpha"', 'HP="1"', 'IN="0"', 'GX="0"', 'BFS="1"', 'GY="1"', 'GXY="0"', 'UP="0"', 'FM="1"', 'FW="800"',
    'HS="0"', 'MAT="HOMAG"', 'DN="STANDARD"', 'INCH="0"', 'VIEW="NOMIRROR"', 'ANZ="1"', 'BES="0"', 'ENT="0"',
    `_BSX=${f3(L)}`, `_BSY=${f3(B)}`, `_BSZ=${f3(D)}`, '_FNX=0', '_FNY=0', '_RNX=0', '_RNY=0', '_RNZ=0', `_RX=${f3(L)}`, `_RY=${f3(B)}`,
    '',
    '[001', `L="${f3(L)}"`, 'KM="Laenge in X"', `B="${f3(B)}"`, 'KM="Breite in Y"', `D="${f3(D)}"`, 'KM="Dicke in Z"',
    '',
    '<100 \\WerkStck\\', 'LA="L"', 'BR="B"', 'DI="D"', 'FNX="0"', 'FNY="0"', 'AX="0"', 'AY="0"',
    '',
  ].join('\r\n');
}

const block = (head, fields) => [head, ...Object.entries(fields).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}="${v}"`), ''].join('\r\n');

/**
 * MPR-programma's voor één paneel: zijde A, en zijde B als er bewerkingen op de andere zijde staan.
 * Geeft { files: [{ name, text }], skipped: [omschrijving] }.
 */
function mprForPart(p, M = MPR_DEFAULTS, baseName = p.id) {
  const fr = mprFrame(p);
  const D = p.dikte;
  const skipped = [];
  const sides = { A: [], B: [] };
  const contours = [], contoursB = [];
  const mitreSawn = new Set();

  // Zijde B: gespiegeld in Y (paneel om de X-as gekeerd).
  const mapB = fr.mapB ?? ((u, v) => { const [x, y] = fr.map(u, v); return [x, fr.B - y]; });

  // Diepe boringen (> boorTerugGrens): boren met terugtrekken, vuldiepte ZT en terugtrekmaat RM.
  const peck = (diepte) => diepte > Number(M.boorTerugGrens ?? 20)
    ? { BM2: M.boorTerugModus || 'STD', ZT: f3(Number(M.boorTerugVul ?? 20)), RM: f3(Number(M.boorTerugMaat ?? 5)) } : {};

  for (const op of p.ops) {
    if (op.kind === 'clamex') {
      if (!M.clamex) { skipped.push(`Clamex (${op.edge ? 'in de kant' : 'in het vlak'})`); continue; }
    if (op.edge) {
        // In de kant: zaag 201 (Lamello_4s_45). XY_Angle = welke kant: 270 = X 0, 90 = X max, 0 = Y 0, 180 = Y max.
        const pt0 = op.edge === 'u0' ? [0, op.pos] : op.edge === 'u1' ? [p.uLen, op.pos] : op.edge === 'v0' ? [op.pos, 0] : [op.pos, p.vLen];
        const [bx, by] = fr.map(pt0[0], pt0[1]);
        const xy = Math.abs(bx) < 0.01 ? 270 : Math.abs(bx - fr.L) < 0.01 ? 90 : Math.abs(by) < 0.01 ? 0 : 180;
        // Een kant binnen de plaat (inset, bv. de voeg van een werkblad achter het weg te frezen stuk).
        const ins = Number(op.inset) || 0;
        const pt = op.edge === 'u0' ? [ins, op.pos] : op.edge === 'u1' ? [p.uLen - ins, op.pos] : op.edge === 'v0' ? [op.pos, ins] : [op.pos, p.vLen - ins];
        const [x, y] = fr.map(pt[0], pt[1]);
        // Verstek: alleen bij de eerste Clamex van elke verbinding (kant) zaagt de macro ook het verstek.
        let saw = '1';
        if (op.hoek != null) { saw = mitreSawn.has(op.edge) ? '0' : '1'; mitreSawn.add(op.edge); }
        sides.A.push(clamexBlock(CLAMEX_SAW, { X: f3(x), Y: f3(y), A: f3(D / 2), XY: xy, ANG: f3(op.hoek ?? 90), SAW: saw, DRILL: op.boorGat ? '1' : '0', ...clamexDepth(op) }));
      } else {
        // In het vlak: frees 202 (Lamello_router), zoals in de bestanden met XY_Angle 270.
        const onB = op.face === fr.down;
        const mp = onB ? mapB : fr.map;
        const [x, y] = mp(op.u, op.v);
        // Richting van de verbinding (standaard: langs de diepte, achter → voor = XY_Angle 270); bij een schuine
        // verbinding draait de Clamex mee.
        const [du, dv] = op.dir ?? [1, 0];
        const [x2, y2] = mp(op.u + du * 10, op.v + dv * 10);
        const xy = op.dir ? Math.round(((Math.atan2(y2 - y, x2 - x) * 180 / Math.PI) + 360) % 360 * 1000) / 1000 : 270;
        (onB ? sides.B : sides.A).push(clamexBlock(CLAMEX_ROUTER, { X: f3(x), Y: f3(y), Z: f3(D), XY: xy, ...clamexDepth(op) }));
      }
      continue;
    }
    if (op.kind === 'contour') {
      // Contour door de volle dikte (schuine kant, werkbladvoeg): frezen met de contourfrees, of zagen (zaag 300).
      // De baan ligt een halve freesdiameter (of zaagdikte) aan de kant van het afval, zodat de maat klopt, en loopt
      // 20 mm voorbij beide uiteinden. Als laatste bewerking, zodat het stuk tijdens het boren heel blijft.
      // Een polylijn (bv. werkbladvoeg: verstek vooraan, dan recht) wordt altijd gefreesd.
      // Niet doorgaand (op.diepte, bv. een sponning): in het gekozen vlak, zonder uitloop voorbij de uiteinden (op.lead).
      const blindC = Number(op.diepte) > 0 && op.diepte < D;
      const onBc = blindC && op.face === fr.down;
      const mpC = onBc ? mapB : fr.map;
      const lead = op.lead ?? 20;
      const P = op.pts.map(q => mpC(...q));
      const dirs = P.slice(1).map((q, i) => { const l = Math.hypot(q[0] - P[i][0], q[1] - P[i][1]) || 1; return [(q[0] - P[i][0]) / l, (q[1] - P[i][1]) / l]; });
      const [wx, wy] = mpC(...op.waste);
      const left = -dirs[0][1] * (wx - P[0][0]) + dirs[0][0] * (wy - P[0][1]) > 0;   // afval links van de baan?
      const frees = P.length > 2 || p.rol === 'rug' || p.rol === 'werkblad' || M.schuinMethode === 'frees';
      const tools = M.tools ?? P110_TOOLS;
      // Draairichting tegen uitbrokkelen: het afgewerkte stuk aan de kant van gelijkloop. Een rechtsdraaiende frees
      // (130) loopt in gelijkloop aan zijn linkerkant, een linksdraaiende (150) aan zijn rechterkant.
      const stukLinks = !left;
      const gelijk = (M.freesRichting ?? 'gelijkloop') === 'gelijkloop';
      const tno = frees ? (stukLinks === gelijk ? (M.freesContour ?? '130') : (M.freesContourLinks ?? '150')) : (M.zaagSchuin ?? '300');
      const tool = tools.find(x => String(x.nr) === String(tno));
      const half = frees ? (Number(tool?.dia) || 18) / 2 : (Number(tool?.lengte) || 3.4) / 2;
      const nrm = ([dx, dy]) => (left ? [-dy * half, dx * half] : [dy * half, -dx * half]);
      // Hoekpunten van de verschoven baan: snijpunt van de verschoven segmenten.
      const pathPts = [];
      const n0 = nrm(dirs[0]);
      pathPts.push([P[0][0] + n0[0] - dirs[0][0] * lead, P[0][1] + n0[1] - dirs[0][1] * lead]);
      for (let i = 1; i < P.length - 1; i++) {
        const d1 = dirs[i - 1], d2 = dirs[i], a1 = nrm(d1), a2 = nrm(d2);
        const q1 = [P[i][0] + a1[0], P[i][1] + a1[1]], q2 = [P[i][0] + a2[0], P[i][1] + a2[1]];
        const den = d1[0] * d2[1] - d1[1] * d2[0];
        if (Math.abs(den) < 1e-9) { pathPts.push(q1); continue; }
        const tt = ((q2[0] - q1[0]) * d2[1] - (q2[1] - q1[1]) * d2[0]) / den;
        pathPts.push([q1[0] + d1[0] * tt, q1[1] + d1[1] * tt]);
      }
      const dl = dirs[dirs.length - 1], nl = nrm(dl), Pl = P[P.length - 1];
      pathPts.push([Pl[0] + nl[0] + dl[0] * lead, Pl[1] + nl[1] + dl[1] * lead]);
      const list = onBc ? contoursB : contours;
      const nr = list.length + 1, z = blindC ? D - op.diepte : -Number(M.contourDoor ?? 1);
      const el = (i, kind, [x, y], extra) => [`$E${i}`, kind, `X=${f3(x)}`, `Y=${f3(y)}`, `Z=${f3(z)}`, ...extra(x, y), ''].join('\r\n');
      const elems = [el(0, 'KP', pathPts[0], (x, y) => ['KO=00', `.X=${f3(x)}`, `.Y=${f3(y)}`, `.Z=${f3(z)}`, '.KO=00'])];
      for (let i = 1; i < pathPts.length; i++) {
        const [px, py] = pathPts[i - 1], [qx, qy] = pathPts[i];
        const wi = (Math.atan2(qy - py, qx - px) + 2 * Math.PI) % (2 * Math.PI);
        elems.push(el(i, 'KL', pathPts[i], (x, y) => [`.X=${f3(x)}`, `.Y=${f3(y)}`, `.Z=${f3(z)}`, `.WI=${f3(wi)}`, '.WZ=0']));
      }
      list.push([`]${nr}`, ...elems].join('\r\n') + '\r\n' + (frees ? block('<105 \\Konturfraesen\\', {
        EA: `${nr}:0`, MDA: 'SEN', RK: 'NOWRK', EE: `${nr}:${pathPts.length - 1}`, MDE: 'SEN_AB', EM: '0', RI: '1',
        TNO: tno, SM: '0', S_: 'STANDARD', F_: '5', HP: '0', AB: '0', ZA: '@0',
      }) : block('<193 \\Kontursaegen\\', {
        EA: `${nr}:0`, MDA: 'SEN', RK: 'NoWRK', TPZ: '0', BL: '0', EE: `${nr}:1`, MDE: 'SEN_AB', RI: '0',
        TNO: tno, SM: '0', S_: 'STANDARD', F_: '5', UZU: '1', F_Z: '0', AB: '0', Z_: '0', ZA: '@0', HP: '0', SP: '0',
      })));
      continue;
    }
    if (op.kind === 'verstek') {
      // Verstek zagen met de gekantelde zaag (Nut_R, "Zagen met A-hoek"), zoals in VERSTEK_met_midden_einde:
      // een snede langs de kant, WI = verstekhoek, op D / tan(hoek) + 10 mm van de kant, 100 mm voorbij beide uiteinden.
      const e = op.edge;
      const [pa, pb] = e === 'u0' ? [[0, 0], [0, p.vLen]] : e === 'u1' ? [[p.uLen, 0], [p.uLen, p.vLen]] : e === 'v0' ? [[0, 0], [p.uLen, 0]] : [[0, p.vLen], [p.uLen, p.vLen]];
      const a = fr.map(...pa), b = fr.map(...pb);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len;
      // Normaal naar het midden van het paneel.
      const mid = fr.map(p.uLen / 2, p.vLen / 2);
      let nx = -dy, ny = dx;
      if (nx * (mid[0] - a[0]) + ny * (mid[1] - a[1]) < 0) { nx = -nx; ny = -ny; }
      const off = D / Math.tan(op.hoek * Math.PI / 180) + 10;
      const s0 = [a[0] + nx * off - dx * 100, a[1] + ny * off - dy * 100], s1 = [b[0] + nx * off + dx * 100, b[1] + ny * off + dy * 100];
      // Zaag aan de kant van de rand (afval): links van de looprichting?
      const left = -dy * (a[0] - s0[0]) + dx * (a[1] - s0[1]) > 0;
      sides.A.push(block('<124 \\Nut_R\\', {
        XA: f3(s0[0]), WI: f3(op.hoek), WI2: f3(op.hoek), YA: f3(s0[1]), XE: f3(s1[0]), YE: f3(s1[1]), BL: '0', SK: '1', RK: left ? 'WRKL' : 'WRKR',
        EM: 'MOD1', MV: 'GL', Z_: '-10', VZ: '3', VT: '0', AB: '0', XY: '0', MN: 'GGL', F_: '5', UZU: '1', ZU: '0', SM: '0', S_: 'STANDARD',
        ZA: f3(D), ZS: '0', ZSA: '0', HP: '0', SP: '0', KO: '00',
      }));
      continue;
    }
    if (op.kind === 'rondgat') {
      // Ronde uitsparing: kamer met de kleine frees; door de plaat vanaf zijde A, of blind (op.diepte) in het gekozen vlak.
      const blind = Number(op.diepte) > 0 && op.diepte < D;
      const onB = blind && op.face === fr.down;
      const [x, y] = (onB ? mapB : fr.map)(op.u, op.v);
      (onB ? sides.B : sides.A).push(block('<112 \\Tasche\\', {
        XA: f3(x), YA: f3(y), LA: f3(op.dia), BR: f3(op.dia), RD: f3(op.dia / 2), WI: '0', TI: f3(blind ? op.diepte : D + 2), ZT: '0', XY: '80',
        T_: M.freesKlein, F_: 'STANDARD', DS: '0', KO: '00',
      }));
      continue;
    }
    // Doorgaande boringen (ook als ze zo diep zijn als de plaat) kunnen altijd van zijde A.
    const through = op.doorgaand || (op.kind === 'boring' && op.diepte >= D);
    const onB = op.edge == null && op.face === fr.down && !through;
    const map = onB ? mapB : fr.map;
    const out = onB ? sides.B : sides.A;

    if (op.edge) {
      // Horizontale boring in een kant.
      const pt = op.edge === 'u0' ? [0, op.pos] : op.edge === 'u1' ? [p.uLen, op.pos] : op.edge === 'v0' ? [op.pos, 0] : [op.pos, p.vLen];
      const [x, y] = fr.map(pt[0], pt[1]);
      const dir = Math.abs(x) < 0.01 ? 'XP' : Math.abs(x - fr.L) < 0.01 ? 'XM' : Math.abs(y) < 0.01 ? 'YP' : 'YM';
      const prob = checkDrill(M.tools ?? P110_TOOLS, { dia: op.dia, diepte: op.diepte, horizontaal: true, richting: dir });
      if (prob) skipped.push(`Let op: ${prob}`);
      // Het horizontale boorblok heeft enkel Ø8. Een andere diameter (push-open Ø10) gaat met een boor in de
      // freesspil (zonder vaste richting, nr. 160): die wordt met WW vastgelegd, zoals WW="1006" voor de Ø35.
      const spil = (M.tools ?? P110_TOOLS).filter(t => t.soort === 'boorH' && !t.richting && Math.abs(t.dia - op.dia) < 0.3);
      const blok = (M.tools ?? P110_TOOLS).some(t => t.soort === 'boorH' && t.richting && Math.abs(t.dia - op.dia) < 0.3);
      const ww = !blok && spil.length ? { WW: spil.map(t => t.nr).join(',') } : {};
      out.push(block('<103 \\BohrHoriz\\', { XA: f3(x), YA: f3(y), ZA: f3(D / 2), BM: dir, TI: f3(op.diepte), DU: f3(op.dia), AN: '1', MI: '0', AB: '32', ...peck(op.diepte), ...ww, KO: '00' }));
      continue;
    }
    if (op.kind === 'boring') {
      const [x, y] = map(op.u, op.v);
      const prob = checkDrill(M.tools ?? P110_TOOLS, { dia: op.dia, diepte: through ? D + Number(M.doorExtra || 0) : op.diepte, door: through });
      if (prob) skipped.push(`Let op: ${prob}`);
      out.push(block('<102 \\BohrVert\\', {
        XA: f3(x), YA: f3(y), BM: through ? M.boorModusDoor : M.boorModusBlind,
        TI: f3(through ? D + Number(M.doorExtra || 0) : op.diepte), DU: f3(op.dia), AN: '1', MI: '0', AB: '32', WI: '0', S_: '2',
        ...peck(through ? D : op.diepte), KO: '00',
      }));
    } else if (op.kind === 'groef') {
      const [xa, ya] = map(op.u1, op.v1);
      const [xe, ye] = map(op.u2, op.v2);
      // Led-groeven (en andere gestopte groeven) altijd frezen.
      if (M.groefMethode === 'frees' || op.frees) {
        const horiz = Math.abs(ye - ya) < Math.abs(xe - xa);
        out.push(block('<112 \\Tasche\\', {
          XA: f3((xa + xe) / 2), YA: f3((ya + ye) / 2), LA: f3(horiz ? Math.abs(xe - xa) : op.breedte), BR: f3(horiz ? op.breedte : Math.abs(ye - ya)),
          RD: '0', WI: '0', TI: f3(op.diepte), ZT: '0', XY: '80', T_: M.freesKlein, F_: 'STANDARD', DS: '0', KO: '00',
        }));
      } else {
        // Zagen. Een einde aan de rand loopt 50 mm uit de plaat (zoals in de P110-programma's).
        // Een einde in de plaat: de zaag stopt zo vroeg dat de zaagboog aan het oppervlak op het einde uitkomt,
        // en het laatste stuk wordt op volle diepte nagefreesd, zodat de groef recht eindigt en de rug erin past.
        const len = Math.hypot(xe - xa, ye - ya);
        const dx = (xe - xa) / len, dy = (ye - ya) / len;
        const atEdge = (x, y) => x < 0.01 || y < 0.01 || x > fr.L - 0.01 || y > fr.B - 0.01;
        const tool = (M.tools ?? P110_TOOLS).find(x => String(x.nr) === String(M.groefTool));
        const R = (Number(tool?.dia) || 120) / 2;
        const uitloop = Math.sqrt(Math.max(0, 2 * R * op.diepte - op.diepte ** 2));
        const open0 = atEdge(xa, ya), open1 = atEdge(xe, ye);
        const s0 = open0 ? -50 : uitloop, s1 = open1 ? len + 50 : len - uitloop;
        if (s1 > s0 + 1) {
          out.push(block('<109 \\Nuten\\', {
            // Zoals in de P110-programma's: geen frescorrectie (NOWRK), de groef ligt gecentreerd op de lijn,
            // net als de nafrezing aan een gestopt einde.
            XA: f3(xa + dx * s0), YA: f3(ya + dy * s0), XE: f3(xa + dx * s1), YE: f3(ya + dy * s1), AN: '0', RK: 'NOWRK', EM: 'MOD0', TI: f3(op.diepte), NB: f3(op.breedte), MN: 'GL',
            OP: '1', T_: M.groefTool, F_: 'STANDARD', KO: '00',
          }));
        }
        const horiz = Math.abs(dx) > Math.abs(dy);
        const nafrees = (a, b) => {
          const p0 = [xa + dx * a, ya + dy * a], p1 = [xa + dx * b, ya + dy * b];
          out.push(block('<112 \\Tasche\\', {
            XA: f3((p0[0] + p1[0]) / 2), YA: f3((p0[1] + p1[1]) / 2), LA: f3(horiz ? Math.abs(b - a) : op.breedte), BR: f3(horiz ? op.breedte : Math.abs(b - a)),
            RD: '0', WI: '0', TI: f3(op.diepte), ZT: '0', XY: '80', T_: M.freesKlein, F_: 'STANDARD', DS: '0', KO: '00',
          }));
        };
        if (s1 <= s0 + 1) nafrees(0, len);            // te kort om te zagen: helemaal frezen
        else {
          if (!open0) nafrees(0, uitloop + 5);
          if (!open1) nafrees(len - uitloop - 5, len);
        }
      }
    } else if (op.kind === 'uitsparing') {
      // Doorgaande uitsparing aan de rand: kamer die 10 mm buiten het paneel uitloopt, zodat de hoek schoon vrijkomt.
      const corners = [map(op.u, op.v), map(op.u + op.w, op.v + op.h)];
      let x0 = Math.min(corners[0][0], corners[1][0]), x1 = Math.max(corners[0][0], corners[1][0]);
      let y0 = Math.min(corners[0][1], corners[1][1]), y1 = Math.max(corners[0][1], corners[1][1]);
      const ext = 10;
      if (x0 < 0.01) x0 -= ext; if (x1 > fr.L - 0.01) x1 += ext;
      if (y0 < 0.01) y0 -= ext; if (y1 > fr.B - 0.01) y1 += ext;
      out.push(block('<112 \\Tasche\\', {
        XA: f3((x0 + x1) / 2), YA: f3((y0 + y1) / 2), LA: f3(x1 - x0), BR: f3(y1 - y0), RD: '0', WI: '0', TI: f3(D + 1),
        ZT: '0', XY: '80', T_: M.freesContour, F_: 'STANDARD', DS: '0', KO: '00',
      }));
    }
  }

  sides.A.push(...contours);
  sides.B.push(...contoursB);
  const files = [];
  const make = (ops, suffix) => files.push({ name: `${baseName}${suffix}.mpr`, text: mprHeader(fr.L, fr.B, D) + '\r\n' + ops.join('\r\n') + '!\r\n' });
  make(sides.A, sides.B.length ? '_A' : '');
  if (sides.B.length) make(sides.B, '_B');
  return { files, skipped, frame: fr };
}

/** Alle MPR-bestanden van een project als zip, met een overzicht van wat nog manueel moet. */
/** Kastnummer met twee cijfers (K1 → K01). */
const mprCode = code => String(code || 'K').replace(/^([A-Za-z]+)(\d)$/, '$10$2');

/** Bestandsnaam van een paneel: kastnummer + onderdeel, bv. K01_stijl_links (zijwand = stijl). */
function mprPartName(code, p) {
  const naam = String(p.naam).toLowerCase().replace(/^zijwand/, 'stijl').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `${mprCode(code)}_${naam}`;
}

/** Namen van de MPR-programma's van een kast (uniek binnen de kast): Map(onderdeel-id → naam). */
function mprNames(code, parts) {
  const out = new Map(), used = new Map();
  for (const p of parts) {
    if (!p.ops.length && p.rol !== 'zijwand') continue;
    let n = mprPartName(code, p);
    const c = (used.get(n) ?? 0) + 1;
    used.set(n, c);
    if (c > 1) n = `${n}_${c}`;
    out.set(p.id, n);
  }
  return out;
}

function projectMprZip(project, S, M) {
  const zip = new ZipWriter();
  const notes = [];
  let count = 0;
  // Alles in één map met de naam van het project; elk bestand begint met het kastnummer.
  const dir = safeName(project.naam || 'Project');
  // Met de doorlopende stukken (plint, greeplijst, paslat boven) zoals in de zaaglijst.
  for (const { k, res, parts } of projectParts(project, S)) {
    if (res.error) { notes.push(`${k.code}: ${res.error}`); continue; }
    const names = mprNames(k.code, parts);
    for (const p of parts) {
      if (!names.has(p.id)) continue;   // panelen zonder bewerking hoeven niet op de CNC
      const { files, skipped } = mprForPart(p, M, names.get(p.id));
      for (const f of files) { zip.add(`${dir}/${f.name}`, f.text); count++; }
      if (skipped.length) {
        const n = {};
        for (const s of skipped) n[s] = (n[s] ?? 0) + 1;
        const missing = Object.entries(n).filter(([s]) => !s.startsWith('Let op'));
        const checks = Object.entries(n).filter(([s]) => s.startsWith('Let op'));
        if (missing.length) notes.push(`${k.code} ${p.naam}: ${missing.map(([s, c]) => `${c}× ${s}`).join(', ')} niet in het MPR-bestand (manueel toevoegen).`);
        if (checks.length) notes.push(`${k.code} ${p.naam}: ${checks.map(([s, c]) => `${c}× ${s.replace('Let op: ', '')}`).join(', ')}.`);
      }
    }
  }
  // Werkbladen van plaat (met hoekverbinding, tabletverbinders, Clamex).
  if (typeof werkbladGeometry === 'function') {
    werkbladGeometry(project, S).forEach((g, i) => {
      const p = g.parts.find(q => q.rol === 'werkblad');
      if (!p || p.materiaal !== 'plaat' || !p.ops.length) return;
      const { files, skipped } = mprForPart(p, M, `WB${String(i + 1).padStart(2, '0')}_${safeName(p.naam)}`);
      for (const f of files) { zip.add(`${dir}/${f.name}`, f.text); count++; }
      for (const s2 of new Set(skipped)) notes.push(`${p.naam}: ${s2.replace('Let op: ', '')}`);
      if (p.uLen > 3000) notes.push(`${p.naam}: ${Math.round(p.uLen)} mm lang, controleer of het op de P110 past.`);
    });
  }
  const readme = [
    `MPR-bestanden voor ${project.naam}`,
    `Gemaakt met de Kasten tool op ${new Date().toLocaleString('nl-BE')}.`,
    '',
    'Eén bestand per paneel, met het kastnummer vooraan (bv. K01_stijl_links). Zijn er bewerkingen aan twee zijden, dan zijn er twee bestanden: _A (eerst) en _B (paneel gekeerd om de lange kant).',
    'Ligging: X langs de lengte (nerf), Y dwars, nulpunt linksvoor, zijde A naar boven.',
    '',
    'Controleer elk programma eerst in de simulatie van woodWOP.',
    '',
    ...(notes.length ? ['Nog manueel:', ...notes] : ['Alle bewerkingen staan in de bestanden.']),
  ].join('\r\n');
  zip.add('LEESMIJ.txt', readme);
  return { blob: zip.finalize('application/zip'), count, notes };
}
