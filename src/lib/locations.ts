/**
 * Ghana administrative locations — Regions, Districts/Municipals, and Towns.
 * Used for structured location selection during signup, profile editing, and listing creation.
 *
 * Format stored in database: "Region > District > Town"
 */

export type GhanaRegion = string;
export type GhanaDistrict = string;
export type GhanaTown = string;

export const GHANA_LOCATIONS: Record<GhanaRegion, Record<GhanaDistrict, GhanaTown[]>> = {
  'Greater Accra': {
    'Accra Metropolitan': ['Accra', 'Jamestown', 'Osu', 'Labadi', 'Teshie', 'Chorkor', 'Cantonments', 'Airport Residential'],
    'Tema Metropolitan': ['Tema', 'Ashaiman', 'Sakumono', 'Tema New Town', 'Kpone'],
    'Ashaiman Municipal': ['Ashaiman', 'Tema New Town', 'Baatsona'],
    'Ga East Municipal': ['Adenta', 'Madina', 'Pantang', 'Abokobi', 'Haatso'],
    'Ga West Municipal': ['Amasaman', 'Pokuase', 'Tabora', 'Ofankor'],
    'Ga South Municipal': ['Weija', 'Gbawe', 'Kasoa', 'Obom'],
    'Ledzokuku Municipal': ['Teshie', 'Nungua', 'Borjoman'],
    'La Dade-Kotopon Municipal': ['La', 'Roman Ridge', 'Quiet Hills', 'East Legon'],
    'Okaikwei North Municipal': ['Tesano', 'Achimota', 'Pig Farm', 'Darkuman'],
    'Krowor Municipal': ['Nungua', 'Teshie', 'Borlay'],
    'Ayawaso Central Municipal': ['Kwabenya', 'Pig Farm', 'Achimota'],
  },
  'Ashanti': {
    'Kumasi Metropolitan': ['Kumasi', 'Adum', 'Bantama', 'Ahodwo', 'Nhyiaeso', 'Ahinsan', 'Ayigya', 'Ejisu'],
    'Obuasi Municipal': ['Obuasi', 'Dunkwa', 'Konongo', 'Dominase'],
    'Ejisu Municipal': ['Ejisu', 'Juaben', 'Krobo', 'Besease'],
    'Ejura Sekyedumase Municipal': ['Ejura', 'Sekyedumase', 'Mampong'],
    'Bekwai Municipal': ['Bekwai', 'Amantin', 'Kuntanase'],
    'Mampong Municipal': ['Mampong', 'Ejisu', 'Nkawie'],
    'Konongo Municipal': ['Konongo', 'Yawkrom', 'Odumase'],
    'Offinso Municipal': ['Offinso', 'Akomadan', 'Tanoso'],
    'Atwima Nwabiagya Municipal': ['Nkawie', 'Toase', 'Bibiani'],
    'Kwabre East Municipal': ['Mamponteng', 'Kwabre', 'Akwamu'],
    'Afigya Kwabre South Municipal': ['Aduamoa', 'Kwaman', 'Ahenkuro'],
    'Asante Akim Central Municipal': ['Konongo', 'Bodwesango'],
    'Asante Akim North Municipal': ['Agogo', 'Nsuta', 'Kenten'],
    'Asante Akim South Municipal': ['Juaso', 'Akropong', 'Swedru'],
    'Adansi Asokwa Municipal': ['Kontuna', 'Adansi'],
    'Amansie Central Municipal': ['Jacobsu', 'Manso'],
    'Amansie West Municipal': ['Manso Nkwanta', 'Aguaso'],
    'Amansie East Municipal': ['Bekwai', 'Akwaboa'],
    'Atwima Mponua District': ['Nyinahin', 'Mpasatia'],
    'Atwima Kwanwoma District': ['Foase', 'Twedie'],
    'Bosome Asuhire District': ['AsARE', 'Mampong'],
    'Kumawu District': ['Kumawu', 'Bodomase'],
    'Sekyere Kumawu District': ['Kumawu', 'Drobonso'],
    'Sekyere Central District': ['Nsuta', 'Beposo'],
    'Sekyere South District': ['Agona', 'Dromankuma'],
  },
  'Western': {
    'Sekondi Takoradi Metropolitan': ['Sekondi', 'Takoradi', 'Effiakuma', 'Kojokrom', 'Anajandze'],
    'Tarkwa Nsuaem Municipal': ['Tarkwa', 'Nsuaem', 'Aboso'],
    'Prestea Huni Valley Municipal': ['Prestea', 'Huni Valley', 'Bogoso'],
    'Ahanta West Municipal': ['Agona Nkwanta', 'Akwidaa', 'Busua'],
    'Ellembelle District': ['Nkroful', 'Axim', 'Eikwe'],
    'Jomoro Municipal': ['Half Assini', 'Tiekorordin', 'Nzema'],
    'Mpohor District': ['Mpohor', 'Agona'],
    'Wassa Amenfi Central Municipal': ['Wassa Akropong', 'Abuakwa'],
    'Wassa Amenfi East Municipal': ['Wassa Akropong', 'Bibiani'],
    'Wassa Amenfi West Municipal': ['Wassa Dunkwa', 'Agoro'],
    'Toko District': ['Toko', 'Aboadze'],
  },
  'Eastern': {
    'New Juaben Municipal': ['Koforidua', 'Asokore', 'Adawso', 'Ejisu'],
    'Nsawam Adoagyire Municipal': ['Nsawam', 'Adoagyire', 'Srodae'],
    'Akropong Municipal': ['Akropong', 'Aburi', 'Mamfe'],
    'Akyem Oda Municipal': ['Oda', 'Bunso', 'Akyem'],
    'Birim North Municipal': ['Abirem', 'Ofoase', 'Akwatia'],
    'Birim South District': ['Akim Swedru', 'Achiase'],
    'Denkyembour District': ['Akim Oda', 'Akwatia'],
    'Fanteakwa North District': ['Begoro', 'Oframase'],
    'Fanteakwa South District': ['Brewa', 'Nkawkaw'],
    'Kwahu South Municipal': ['Mpraeso', 'Nkawkaw', 'Atibie'],
    'Kwahu West Municipal': ['Nkawkaw', 'Asonom', 'Abrona'],
    'Kwahu Afram Plains North District': ['Donkorkrom', 'Afram'],
    'Kwahu Afram Plains South District': ['Tease', 'Agbozume'],
    'Lower Manya Krobo Municipal': ['Saltpond', 'Manya', 'Akyem'],
    'Upper Manya Krobo District': ['Asesewa', 'Akuse'],
    'Yilo Krobo Municipal': ['Somanya', 'Kpong', 'Botiano'],
    'Suhum Municipal': ['Suhum', 'Akofo', 'Pakro'],
    'Kibi Municipal': ['Kibi', 'Abirem'],
    'Okere District': ['Akropong', 'Aburi'],
    'Ayensuano District': ['Insuam', 'Pantang'],
    'Nsavor District': ['Nsavor', 'Akwatia'],
  },
  'Central': {
    'Cape Coast Metropolitan': ['Cape Coast', 'Elmina', 'Abura', 'Kotokuraba'],
    'Kumasi Metropolitan': ['Kumasi', 'Adum'],
    'Effutu Municipal': ['Winneba', 'Agona Swedru'],
    'Agona West Municipal': ['Agona Swedru', 'Nkum'],
    'Agona East District': ['Nsaba', 'Abeadze'],
    'Awutu Senya East Municipal': ['Kasoa', 'Awutu', 'Brisi'],
    'Awutu Senya West District': ['Senya Beraku', 'Awutu'],
    'Gomoa East District': ['Pankrono', 'Aber的趋势'],
    'Gomoa West District': ['Apam', 'Mankessim'],
    'Gomoa Central District': ['Kwanyako', 'Potsin'],
    'Ekumfi District': ['Ekumfi', 'Mendskrom'],
    'Mfantsiman Municipal': ['Saltpond', 'Mankessim'],
    'Assin Fosu Municipal': ['Assin Fosu', 'Assin Praso'],
    'Assin North Municipal': ['Gonno', 'Assin'],
    'Assin Central District': ['Assin Praso', 'Brofoyedru'],
    'Twifo Praso Lower Denkyira District': ['Praso', 'Twifo'],
    'Upper Denkyira East Municipal': ['Dunkwa', 'Bibiani'],
    'Upper Denkyira West District': ['Dunkwa', 'Ayanfuri'],
  },
  'Northern': {
    'Tamale Metropolitan': ['Tamale', 'Lamakuna', 'Sagnarigu'],
    'Sagnarigu Municipal': ['Sagnarigu', 'Tamale', 'Langa'],
    'Tolon Municipal': ['Tolon', 'Kumbungu'],
    'Kumbungu District': ['Kumbungu', 'Tolon'],
    'Savelugu Municipal': ['Savelugu', 'Nanton'],
    'Nanton District': ['Nanton', 'Savelugu'],
    'West Gonja Municipal': ['Damongo', 'Daboya'],
    'East Gonja Municipal': ['Salaga', 'Kpandai'],
    'Central Gonja District': ['Buipe', 'Damongo'],
    'North Gonja District': ['Daboya', 'Mpaha'],
    'Mamprugu Moagduri District': ['Yendi', 'Bimbilla'],
    'Yendi Municipal': ['Yendi', 'Tamale'],
    'Nanumba North Municipal': ['Bimbilla', 'Nkwanta'],
    'Nanumba South District': ['Wulensi', 'Kpatinka'],
    'Mion District': ['Sang', 'Lunsa'],
    'Zabzugu District': ['Zabzugu', 'Tatale'],
    'Tatale Sanguli District': ['Tatale', 'Zabzugu'],
  },
  'Volta': {
    'Ho Municipal': ['Ho', 'Adaklu', 'Kpedze'],
    'Hohoe Municipal': ['Hohoe', 'Peki', 'Kpeve'],
    'Keta Municipal': ['Keta', 'Anloga', 'Dzita'],
    'Ketu South Municipal': ['Denu', 'Aflao', 'Agbozume'],
    'Ketu North Municipal': ['Dzodze', 'Takla'],
    'Akatsi South District': ['Akatsi', 'Ave'],
    'Akatsi North District': ['Akatsi', 'Ziavi'],
    'Central Tongu District': ['Adidome', 'Dzolokpuita'],
    'North Dayi District': ['Kpando', 'Anfoega'],
    'South Dayi District': ['Dzemeni', 'Kpeve'],
    'Ho West District': ['Dzolo', 'Vane'],
    'Adaklu District': ['Adaklu', 'Abuadi'],
    'Agortime-Ziope District': ['Agortime', 'Kpetoe'],
    'Nkwanta South Municipal': ['Nkwanta', 'Kpassa'],
    'Nkwanta North District': ['Kpassa', 'Nkwanta'],
  },
  'Upper East': {
    'Bolgatanga Municipal': ['Bolgatanga', 'Tongo', 'Piga'],
    'Bolgatanga East District': ['Bolgatanga', 'Zuongo'],
    'Bawku Municipal': ['Bawku', 'Pusiga', 'Zebilla'],
    'Bawku West District': ['Zebilla', 'Bawku'],
    'Bongo District': ['Bongo', 'Vea'],
    'Talensi District': ['Tongo', 'Deng-Na'],
    'Nabdam District': ['Nangodi', 'Bolgatanga'],
    'Kassena Nankana Municipal': ['Navrongo', 'Bolgatanga'],
    'Kassena Nankana West District': ['Navrongo', 'Kulungungu'],
    'Builsa North Municipal': ['Sandema', 'Wiaga'],
    'Builsa South District': ['Sandema', 'Fumbisi'],
    'Chiana-Paga District': ['Chiana', 'Paga'],
  },
  'Upper West': {
    'Wa Municipal': ['Wa', 'Biihe', 'Kpongo'],
    'Nadowli Kaleo District': ['Nadowli', 'Kaleo'],
    'Lawra Municipal': ['Lawra', 'Nandom'],
    'Nandom Municipal': ['Nandom', 'Lawra'],
    'Jirapa Municipal': ['Jirapa', 'Tizza'],
    'Lambussie Karni District': ['Lambussie', 'Karni'],
    'Sissala East Municipal': ['Tumu', 'Gwollu'],
    'Sissala West District': ['Gwollu', 'Tumu'],
    'Daffiama Bussie Issa District': ['Daffiama', 'Issa'],
    'Wa East District': ['Funsi', 'Wechiau'],
    'Wa West District': ['Loggu', 'Wechiau'],
  },
  'Bono': {
    'Sunyani Municipal': ['Sunyani', 'Fiapre', 'Abesim'],
    'Sunyani West Municipal': ['Odumase', 'Fiapre'],
    'Berekum Municipal': ['Berekum', 'Jinijini'],
    'Berekum East Municipal': ['Berekum', 'Abrefi'],
    'Dormaa Municipal': ['Dormaa Ahenkuro', 'Agoro'],
    'Dormaa East District': ['Nkrankwanta', 'Amenfi'],
    'Dormaa West District': ['Nkrankwanta', 'Amenfi'],
    'Jaman North District': ['Drobo', 'Sampa'],
    'Jaman South Municipal': ['Drobo', 'Berekum'],
    'Wenchi Municipal': ['Wenchi', 'Kato'],
    'Tain District': ['Nkwanta', 'Wenchi'],
    'Techiman Municipal': ['Techiman', 'Bantama'],
    'Techiman North District': ['Techiman', 'Tuobodom'],
    'Nkoranza Municipal': ['Nkoranza', 'Atebubu'],
    'Kintampo Municipal': ['Kintampo', 'Techiman'],
    'Pru District': ['Drobo', 'Jinijini'],
    'Sene District': ['Kwame Danso', 'Atebubu'],
    'Yeji Municipal': ['Yeji', 'Prukun'],
  },
  'Bono East': {
    'Techiman Municipal': ['Techiman', 'Bantama', 'Tuobodom'],
    'Techiman North District': ['Tuobodom', 'Techiman'],
    'Nkoranza Municipal': ['Nkoranza', 'Atebubu'],
    'Kintampo Municipal': ['Kintampo', 'Techiman'],
    'Atebubu Amantin Municipal': ['Atebubu', 'Amantin'],
    'Sene District': ['Kwame Danso', 'Atebubu'],
    'Pru District': ['Drobo', 'Jinijini'],
    'Yeji Municipal': ['Yeji', 'Prukun'],
    'Kwame Danso District': ['Kwame Danso', 'Koase'],
  },
  'Ahafo': {
    'Goaso Municipal': ['Goaso', 'Asunafo'],
    'Asunafo North Municipal': ['Goaso', 'Acherensua'],
    'Asunafo South District': ['Kwadjofre', 'Brewa'],
    'Asutifi North District': ['Kenyasi', 'Hwidiem'],
    'Asutifi South District': ['Kenyasi', 'Nkaseim'],
    'Tano North Municipal': ['Duayaw Nkwanta', 'Bechem'],
    'Tano South Municipal': ['Bechem', 'Duayaw Nkwanta'],
  },
  'Western North': {
    'Sefwi Wiawso Municipal': ['Sefwi Wiawso', 'Akontombra'],
    'Sefwi Bibiani Anhwiaso Bekwai Municipal': ['Bibiani', 'Anhwiaso', 'Bekwai'],
    'Juaboso Municipal': ['Juaboso', 'Bodia'],
    'Aowin Municipal': ['Enchi', 'Aowin'],
    'Suaman District': ['Dadieso', 'Suaman'],
    'Bodi District': ['Bodi', 'Juaboso'],
    'Nzema East Municipal': ['Axim', 'Nzema'],
  },
  'Oti': {
    'Krachi East Municipal': ['Dambai', 'Krachi'],
    'Krachi West Municipal': ['Kete Krachi', 'Dambai'],
    'Krachi Nchumuru District': ['Chinderi', 'Krachi'],
    'Nkwanta South Municipal': ['Nkwanta', 'Kpassa'],
    'Nkwanta North District': ['Kpassa', 'Nkwanta'],
    'Biakoye District': ['Nkonya', 'Tafi'],
    'Gbi Traditional Area': ['Hohoe', 'Peki'],
  },
  'Savannah': {
    'Damongo Municipal': ['Damongo', 'Daboya'],
    'West Gonja Municipal': ['Damongo', 'Larabanga'],
    'Central Gonja District': ['Buipe', 'Damongo'],
    'East Gonja Municipal': ['Salaga', 'Kpandai'],
    'North Gonja District': ['Daboya', 'Mpaha'],
    'Daboya Mankarigu District': ['Daboya', 'Mankarigu'],
  },
  'North East': {
    'Yendi Municipal': ['Yendi', 'Bimbilla'],
    'Mamprugu Moagduri District': ['Yendi', 'Bimbilla'],
    'Nanumba North Municipal': ['Bimbilla', 'Nkwanta'],
    'Nanumba South District': ['Wulensi', 'Kpatinka'],
    'Mion District': ['Sang', 'Lunsa'],
    'Zabzugu District': ['Zabzugu', 'Tatale'],
    'Tatale Sanguli District': ['Tatale', 'Zabzugu'],
  },
};

export const GHANA_REGIONS = Object.keys(GHANA_LOCATIONS) as GhanaRegion[];

/**
 * Parse a "Region > District > Town" location string into its components.
 * Returns null if the string doesn't match the expected format.
 */
export function parseLocation(location: string): { region: string; district: string; town: string } | null {
  if (!location) return null;
  const parts = location.split('>').map((p) => p.trim());
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return { region: parts[0], district: parts[1], town: parts[2] };
  }
  return null;
}

/**
 * Format location components into a "Region > District > Town" string.
 */
export function formatLocation(region: string, district: string, town: string): string {
  return `${region} > ${district} > ${town}`;
}

/**
 * Get the region from a location string (handles both hierarchical and legacy formats).
 */
export function getRegionFromLocation(location: string): string {
  const parsed = parseLocation(location);
  if (parsed) return parsed.region;
  // Legacy format: try to match against known regions
  const locLower = location.toLowerCase();
  for (const region of GHANA_REGIONS) {
    if (locLower.includes(region.toLowerCase())) return region;
  }
  return location;
}

/**
 * Get districts for a given region.
 */
export function getDistricts(region: string): GhanaDistrict[] {
  return Object.keys(GHANA_LOCATIONS[region] || {});
}

/**
 * Get towns for a given region and district.
 */
export function getTowns(region: string, district: string): GhanaTown[] {
  return GHANA_LOCATIONS[region]?.[district] || [];
}
