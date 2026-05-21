const { extractCityFromDirectionName } = require('./services/officialHeader');

const testCases = [
  // Bureaus
  { input: "BUREAU DE BEIJING (CHINE)", expected: "Beijing" },
  { input: "BUREAU DE BERLIN (ALLEMAGNE)", expected: "Berlin" },
  { input: "BUREAU DE DOHA (QATAR)", expected: "Doha" },
  { input: "BUREAU DE GENEVE (SUISSE)", expected: "Genève" },
  { input: "BUREAU DE LAGOS (NIGERIA)", expected: "Lagos" },
  { input: "BUREAU DE LONDRES (ROYAUME-UNI)", expected: "Londres" },
  { input: "BUREAU DE MADRID (ESPAGNE)", expected: "Madrid" },
  { input: "BUREAU DE MILAN (ITALIE)", expected: "Milan" },
  { input: "BUREAU DE OTTAWA (CANADA)", expected: "Ottawa" },
  { input: "BUREAU DE PARIS (FRANCE)", expected: "Paris" },
  { input: "BUREAU DE WASHINGTON (ETATS-UNIS)", expected: "Washington" },
  { input: "BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N", expected: "Rabat" },
  { input: "BUREAU DE RIO DE JANEIRO (BRESIL)", expected: "Rio de Janeiro" },
  
  // Directions régionales & départementales with DE/D'
  { input: "DIRECTION REGIONALE DE GRAND-BASSAM", expected: "Grand-Bassam" },
  { input: "DIRECTION REGIONALE DE KORHOGO", expected: "Korhogo" },
  { input: "DIRECTION REGIONALE DE MAN", expected: "Man" },
  { input: "DIRECTION REGIONALE DE SAN-PEDRO", expected: "San-Pedro" },
  { input: "DIRECTION REGIONALE DE SEGUELA", expected: "Séguéla" },
  { input: "DIRECTION REGIONALE DE YAMOUSSOUKRO", expected: "Yamoussoukro" },
  { input: "DIRECTION REGIONALE D'ODIENNE", expected: "Odienné" },
  { input: "DIRECTION DEPARTEMENTALE DE DAOUKRO", expected: "Daoukro" },
  { input: "DIRECTION DEPARTEMENTALE D'ABIDJAN NORD 1", expected: "Abidjan" },
  { input: "DIRECTION DEPARTEMENTALE  DE DABOU", expected: "Dabou" },
  
  // Without DE/D' or with double spaces
  { input: "DIRECTION DEPARTEMENTALE KATIOLA", expected: "Katiola" },
  { input: "DIRECTION DEPARTEMENTALE GUIGLO", expected: "Guiglo" },
  { input: "DIRECTION DEPARTEMENTALE DIVO", expected: "Divo" },
  { input: "DIRECTION DEPARTEMENTALE ABJ NORD 1", expected: "Abidjan" },
  { input: "DIRECTION REGIONALE ABIDJAN SUD", expected: "Abidjan" },
  { input: "DIRECTION DEPARTEMENTALE  ADZOPE", expected: "Adzopé" },
  { input: "DIRECTION DEPARTEMENTALE  AGBOVILLE", expected: "Agboville" },
  { input: "DIRECTION DEPARTEMENTALE  GAGNOA", expected: "Gagnoa" },
  { input: "DIRECTION DEPARTEMENTALE  BOUNA", expected: "Bouna" },
  { input: "DIRECTION DEPARTEMENTALE  SOUBRE", expected: "Soubré" },
  { input: "DIRECTION DEPARTEMENTALE  SASSANDRA", expected: "Sassandra" },
  { input: "DIRECTION DEPARTEMENTALE  BOUNDIALI", expected: "Boundiali" },
  { input: "DIRECTION DEPARTEMENTALE  FERKE", expected: "Ferkessédougou" },
  { input: "DIRECTION DEPARTEMENTALE  DIMBOKRO", expected: "Dimbokro" },
  { input: "DIRECTION DEPARTEMENTALE  BOUAFLE", expected: "Bouaflé" },
  { input: "DIRECTION DEPARTEMENTALE MANKONO", expected: "Mankono" },
  { input: "DIRECTION DEPARTEMENTALE  DANANE", expected: "Danané" },

  // Non-city / Central directions
  { input: "DIRECTION DES RESSOURCES HUMAINES", expected: "Abidjan" },
  { input: "DIRECT° RESSOURCES HUM. & MOY.GENERAUX", expected: "Abidjan" },
  { input: "Service Informatique", expected: "Abidjan" },
  { input: "FONDS DE DEVELOPPEMENT TOURISTIQUE", expected: "Abidjan" },
  { input: "DIRECTIONS REGIONALES", expected: "Abidjan" },

  // Directions without standard prefixes but containing cities
  { input: "DIRECTION DES AFFAIRES FINANCIERES DE BONDOUKOU", expected: "Bondoukou" },
  { input: "DIRECTION DES RESSOURCES HUMAINES DE BONDOUKOU", expected: "Bondoukou" },
  { input: "DIRECTION DES ETUDES ET DE LA PLANIFICATION (BONDOUKOU)", expected: "Bondoukou" },
  { input: "DIRECTION REGIONALE DES AFFAIRES FINANCIERES DE BOUAKE", expected: "Bouaké" },
  { input: "DIRECTION DES AFFAIRES JURIDIQUES ET DE LA COOPERATION INTERNATIONALE DE GRAND-BASSAM", expected: "Grand-Bassam" }
];

console.log("=== RUNNING TESTS FOR CITY EXTRACTION ===");
let passed = 0;
for (const tc of testCases) {
  const actual = extractCityFromDirectionName(tc.input);
  if (actual === tc.expected) {
    passed++;
    console.log(`✅ [PASS] "${tc.input}" -> "${actual}"`);
  } else {
    console.log(`❌ [FAIL] "${tc.input}" -> Expected: "${tc.expected}", Got: "${actual}"`);
  }
}
console.log(`\nResults: ${passed}/${testCases.length} tests passed.`);
if (passed === testCases.length) {
  console.log("🎉 All tests passed successfully!");
} else {
  process.exit(1);
}
