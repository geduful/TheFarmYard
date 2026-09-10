/**
 * Ghana administrative locations — Regions, Districts/Municipals, and Towns.
 * Used for structured location selection during signup, profile editing, and listing creation.
 *
 * Format stored in database: "Region > District > Town"
 * Data source: Government of Ghana (IMCCOD) — 261 MMDAs, 16 Regions
 */

export type GhanaRegion = string;
export type GhanaDistrict = string;
export type GhanaTown = string;

export const GHANA_LOCATIONS: Record<GhanaRegion, Record<GhanaDistrict, GhanaTown[]>> = {
  'Ahafo': {
    'Asunafo South': ['Kukuom', 'Kwapong', 'Abuom', 'Asarekrom', 'Kokooso'],
    'Asunafo North Municipal': ['Goaso', 'Akrodie', 'Ampenkro', 'Asumura', 'Ayomso'],
    'Asutifi South': ['Hwidiem', 'Dadiesoaba', 'Nkasiem', 'Siekyemu', 'Twabidi No.1'],
    'Asutifi North': ['Kenyasi', 'Gambia No.1', 'Nkensere', 'Bodom', 'Biadan'],
    'Tano South Municipal': ['Bechem', 'Brosankro', 'Derma', 'Sabronum', 'Techimantia'],
    'Tano North Municipal': ['Duayaw Nkwanta', 'Adrobaa', 'Bomaa', 'Gyedu', 'Tanoso']
  },
  'Ashanti': {
    'Adansi South': ['New Edubiase', 'Akrofrom', 'Akutreso', 'Ampunyasi', 'Ataasi Nkwanta'],
    'Adansi North': ['Fomena', 'Aboabo No 2', 'Akrokerri', 'Bodwesango', 'Dompoase'],
    'Adansi Asokwa': ['Adansi Asokwa', 'Nkonya', 'Akrofuom', 'Bekwai Nkwanta'],
    'Bekwai Municipal': ['Bekwai', 'Amoaful', 'Anwiankwanta', 'Dominase', 'Apau'],
    'Akrofuom': ['Akrofuom', 'Akrofuom Zongo', 'Amoanekrom', 'Dapoto'],
    'Obuasi Municipal': ['Obuasi', 'Aboagye Krom', 'Akaporiso', 'Boete', 'Pompo'],
    'Obuasi East': ['Tutuka', 'Katanga', 'Nnanso', 'Ahoboam', 'Asonamaso'],
    'Amansie Central': ['Jacobu', 'Akrofrom', 'Hia', 'Mile 14', 'Numereso'],
    'Amansie West': ['Manso', 'Abuoso', 'Adimposo', 'Agroyesum', 'Datano'],
    'Amansie South': ['Edubia', 'Amansie', 'Datano', 'Anyinasoe', 'Krebo'],
    'Ahafo Ano Southwest': ['Mankraso', 'Abuakwa', 'Achiase', 'Adankwame', 'Asuofia'],
    'Ahafo Ano Southeast': ['Adugyama', 'Adinyana', 'Adwinyama', 'Essienkyem', 'Pokukrom'],
    'Ahafo Ano North Municipal': ['Tepa', 'Acherensua', 'Akwasiase', 'Anyinasuso', 'Hwidiem'],
    'Atwima Mponua': ['Nyinahin', 'Barniekrom', 'Bayerebon', 'Bibiani', 'Gyeresu'],
    'Atwima Nwabiagya South Municipal': ['Nkawie', 'Ahwiaa', 'Kumenuwa', 'Mpasatia', 'Mankuapo'],
    'Atwima Kwanwoma': ['Twedie', 'Aburaso', 'Ahenema Kokoben', 'Bebu', 'Foase'],
    'Atwima Nwabiagya North': ['Barekese', 'Dwenwoho', 'Essibey', 'Akyease', 'Akroful'],
    'Kumasi Metropolitan': ['Kumasi', 'Adum', 'Asokwa', 'Bantama', 'Suame'],
    'Kwadaso Municipal': ['Kwadaso', 'Atonsu', 'Buokrom', 'Kentinkron', 'Ayigya'],
    'Tafo Municipal': ['Old Tafo', 'Ahwiaa', 'Atimatim', 'Suame', 'Achuponsu'],
    'Suame Municipal': ['Suame', 'Bronkong', 'Magadza', 'Peperekrom', 'Abuakwa'],
    'Bosomtwe': ['Kuntanase', 'Amakom', 'Apinkra', 'Brodekwanu', 'Esereso'],
    'Asokwa Municipal': ['Asokwa', 'Bantama', 'Atonsu', 'Ahodwo', 'Nhyiaeso'],
    'Oforikrom Municipal': ['Oforikrom', 'Apromase', 'Donyina', 'Essienimpong', 'Krapa'],
    'Asokore Mampong Municipal': ['Asokore', 'Kokobra', 'Okyerekrom', 'Santasi', 'Ahodwo'],
    'Kwabre East Municipal': ['Mamponteng', 'Abira', 'Adwumakase Kese', 'Antoa', 'Asonamaso'],
    'Juaben Municipal': ['Juaben', 'Adadientam', 'Akyawkrom', 'Besease', 'Hwireso'],
    'Ejisu Municipal': ['Ejisu', 'Boamadumase', 'Bomfa', 'Achona', 'Akyem Kwaaman'],
    'Sekyere East': ['Effiduase', 'Akokuaso', 'Banko', 'Dadiase', 'Okaikrom'],
    'Sekyere Kumawu': ['Kumawu', 'Drobonso', 'Kumawu Bodomasi', 'Woraso', 'Asakraka'],
    'Sekyere Afram Plains': ['Drobonso', 'Anyinofi', 'Kyeegal', 'Aberwa', 'Bodaa'],
    'Sekyere Central': ['Nsuta', 'Aframso No.3', 'Beposo', 'Isaaka Akura', 'Menshie'],
    'Sekyere South': ['Agona', 'Afamaso', 'Asamang', 'Bepoase', 'Boanim'],
    'Asante Akim South Municipal': ['Juaso', 'Banka', 'Banso', 'Bompata', 'Dwendwenase'],
    'Asante Akim Central Municipal': ['Konongo', 'Nobewam', 'Peminase', 'Asawamso', 'Draapo'],
    'Asante Akim North Municipal': ['Agogo', 'Abosomtweagya', 'Ahenebronuum', 'Ananekrom', 'Akratiebesa'],
    'Bosome Freho': ['Asiwa', 'Achiase', 'Brofoyedru', 'Detieso', 'Duasi'],
    'Mampong Municipal': ['Mampong', 'Adidwan', 'Anyinasu', 'Asaam', 'Benim'],
    'Ejura Sekyedumase Municipal': ['Ejura', 'Ahyiayem', 'Babaso', 'Ejura Nkwanta', 'Homako'],
    'Afigya Kwabre South': ['Kodie', 'Aboabogya', 'Aboaso', 'Afrancho', 'Ahenkro'],
    'Afigya Kwabre North': ['Boamang', 'Kyekyewere', 'Tetrem', 'Asuokoraa'],
    'Offinso Municipal': ['Offinso', 'Abofour', 'Amoawi', 'Bonsua', 'Brofoyedru'],
    'Offinso North': ['Akomadan', 'Aboffour', 'Afrancho', 'Anyinasusu', 'Kofiase']
  },
  'Bono': {
    'Sunyani Municipal': ['Sunyani', 'Abesim', 'Fiapre', 'Nsoatre', 'Wiladzie'],
    'Sunyani West Municipal': ['Odumase', 'Nsawkaw', 'Koraso', 'Chiraa', 'Dwenem'],
    'Berekum East Municipal': ['Berekum', 'Akrofro', 'Bofourkrom', 'Mpatasei', 'Kukuom'],
    'Berekum West': ['Jinijini', 'Amomaso', 'Botokrom', 'Dormaa Ahenkro', 'Aduaso'],
    'Dormaa West': ['Nkrankwanta', 'Dormaa Nkwanta', 'Asikasu', 'Brekuso', 'Kwaku Krom'],
    'Dormaa Central Municipal': ['Dormaa Ahenkro', 'Aboabo', 'Ammasua', 'Danyame', 'Nsoatre'],
    'Dormaa East': ['Wamfie', 'Akontanim', 'Dormaa Akwamu', 'Kyeremasu', 'Wamanafo'],
    'Jaman South Municipal': ['Drobo', 'Abirikasu', 'Adamsu', 'Atuna', 'Badiso'],
    'Jaman North': ['Sampa', 'Asiri', 'Asuoko', 'Buni', 'Goka'],
    'Banda': ['Banda Ahenkro', 'Banda', 'Brobo', 'Tain Sofo', 'Agyendam'],
    'Tain': ['Nsawkaw', 'Badu', 'Brohani', 'Bui', 'Debibi'],
    'Wenchi Municipal': ['Wenchi', 'Droboso', 'Nchiraa', 'Subinso', 'Wenchi Bandaline']
  },
  'Bono East': {
    'Techiman Municipal': ['Techiman', 'Asantanso', 'Aworowa', 'Buotem', 'Forikrom'],
    'Techiman North': ['Tuobodom', 'Kranka', 'Adom', 'Mpasaaso', 'Okyerekrom'],
    'Kintampo North Municipal': ['Kintampo', 'Busuama', 'Dawadawa', 'Kunsu', 'New Longoro'],
    'Kintampo South': ['Jema', 'Amoma', 'Anyima', 'Apesika', 'Kwaso'],
    'Nkoranza North': ['Busunya', 'Busunyaa', 'Dromankese', 'Yefri', 'Anhwiaso'],
    'Nkoranza South Municipal': ['Nkoranza', 'Akuma', 'Ayerede', 'Bonsu', 'Donkro-Nkwanta'],
    'Atebubu Amantin Municipal': ['Atebubu', 'Akokoa', 'Amanteng', 'Jato Zongo', 'Tokuroano'],
    'Pru West': ['Prang', 'Abease', 'Amantin', 'Bunchambu'],
    'Pru East': ['Yeji', 'Parambo', 'Azarazari', 'Tapon', 'Kojope'],
    'Sene West': ['Kwame Danso', 'Bantama', 'Bassa', 'Akonyede', 'Adjei'],
    'Sene East': ['Kajaji', 'Kojokrom', 'Nyakontre', 'Drownye', 'Fomanah']
  },
  'Central': {
    'Komenda Edina Eguafo Abirem Municipal': ['Elmina', 'Abrem Agona', 'Ankaful', 'Atonkwa', 'Keebay'],
    'Cape Coast Metropolitan': ['Cape Coast', 'Aboom', 'Abura', 'Adisadel', 'Bakano'],
    'Mfantseman Municipal': ['Saltpond', 'Abeadze Dominase', 'Anomabo', 'Biriwa', 'Mankessim'],
    'Ekumfi': ['Essarkyir', 'Ekumfi', 'Abrakrampa', 'Mirema', 'Ogyam'],
    'Ajumako Enyan Essiam': ['Ajumako', 'Ajumako Ba', 'Ajumako Bisease', 'Entumbil', 'Ekukrom'],
    'Gomoa West': ['Apam', 'Ankamu', 'Mankoadze', 'Ngyiresi', 'Nsakramado'],
    'Gomoa Central': ['Afransi', 'Kojo Otaben', 'Penteku', 'Akotsi', 'Dakumom'],
    'Gomoa East': ['Potsin', 'Buduatta', 'Buduburam', 'Fetteh', 'Mankoadze'],
    'Effutu Municipal': ['Winneba', 'Effutu', 'Apaaso', 'Akyem Tema', 'Abor'],
    'Awutu Senya West': ['Awutu Breku', 'Ahentia', 'Akrabon', 'Bawjiase', 'Papase'],
    'Awutu Senya East Municipal': ['Kasoa', 'Gyangyanadze', 'Ofaakor', 'Ofaakor Zongo', 'Millennium City'],
    'Agona West Municipal': ['Swedru', 'Agona Abodom', 'Agona Nyakrom', 'Nkum', 'Otsenkorang'],
    'Agona East': ['Nsaba', 'Agona Asafo', 'Duakwa', 'Kwanyako', 'Mankrong'],
    'Asikuma Odoben Brakwa': ['Breman Asikuma', 'Anhwiam', 'Bedum', 'Pensaku', 'Vineyard'],
    'Abura Asebu Kwamankese': ['Abura Dunkwa', 'Abakrampa', 'Gyabankrom', 'Ayeldu', 'Asomdwee'],
    'Assin Central Municipal': ['Assin Fosu', 'Assin Assin', 'Assin Neung', 'Amansie', 'Akotokyir'],
    'Assin North': ['Assin Bereku', 'Assin Akropong', 'Foso', 'Bediadua', 'Abekum'],
    'Assin South': ['Kyekyewere', 'Anyinabrim', 'Assin Ongwa', 'Jakai', 'Manso'],
    'Twifo Atti Morkwa': ['Twifo Praso', 'Atieku', 'Bempongagye', 'Twifo Wamase', 'Asankragua'],
    'Twifo Hemang Lower Denkyira': ['Hemang', 'Akutuase', 'Frami', 'Asuoso', 'Mankranso'],
    'Upper Denkyira East Municipal': ['Dunkwa-on-Offin', 'Atechem', 'Kyekyewere', 'Botadie', 'Brekuma'],
    'Upper Denkyira West': ['Diaso', 'Ayanfuri', 'Dominase', 'Nkotomso', 'Beposo']
  },
  'Eastern': {
    'Asuogyaman': ['Atimpoku', 'Adjena', 'Akosombo', 'Akwamufie', 'Apeguso'],
    'Lower Manya Krobo Municipal': ['Odumase', 'Agomanya', 'Akuse', 'Atua', 'Kpongunor'],
    'Upper Manya Krobo': ['Asesewa', 'Akateng', 'Anyaboni', 'Djamam', 'Odometta'],
    'Yilo Krobo Municipal': ['Somanya', 'Boti', 'Bukunor', 'Huhunya', 'Klo-Agogo'],
    'New Juaben South Municipal': ['Koforidua', 'Adweso', 'Asokore', 'Betom', 'Apapam'],
    'New Juaben North Municipal': ['Effiduase', 'Akwadom', 'Jumapo', 'Oyoko', 'Apapam'],
    'Akwapim North Municipal': ['Akropong', 'Adawso', 'Kwamoso', 'Mampong', 'Mangoase'],
    'Okere': ['Adukrom', 'Abiriw', 'Agomeda', 'Akropong', 'Amanfro'],
    'Akwapim South': ['Aburi', 'Brekuso', 'Kitase', 'Obosonmase', 'Adoagire Zongo'],
    'Nsawam Adoagyiri Municipal': ['Nsawam', 'Adoagire', 'Ahodjo Ketewa', 'Djankrom', 'Marfo'],
    'Suhum Municipal': ['Suhum', 'Akorabo', 'Nankese', 'Ntunkum', 'Oforikrom'],
    'Ayensuano': ['Coaltar', 'Akyeansa', 'Amanase', 'Asuboi', 'Dokruchiwa'],
    'West Akim Municipal': ['Asamankese', 'Abamkrom', 'Adeiso', 'Akim Bremang', 'Anumapapam'],
    'Upper West Akim': ['Adeiso', 'Akwampong', 'Asukam', 'Mampong', 'Npakadan'],
    'Birim Central Municipal': ['Akim Oda', 'Akim Oda Zongo', 'Apapam', 'Asenemaso', 'Asikam'],
    'Asene Manso Akroso': ['Manso', 'Asene', 'Akroso', 'Amansie', 'Osekkrom'],
    'Birim South': ['Akim Swedru', 'Achiase', 'Akenkenso', 'Akotekrom', 'Akroso'],
    'Achiase': ['Achiase', 'Abuakwa', 'Asuboa', 'Kwanwator', 'Asamankese'],
    'Akyemansa': ['Ofoase', 'Akyem Mansa', 'Asafo', 'Batabi', 'Osino'],
    'Kwaebibirem Municipal': ['Kade', 'Akwatia', 'Asuom', 'Boadua', 'Bomso'],
    'Denkyembour': ['Akwatia', 'Denkyembour', 'Akropong', 'Apapam', 'Asikam'],
    'Birim North': ['New Abirem', 'Adausena', 'Afosu', 'Adubease', 'Birem'],
    'Abuakwa South Municipal': ['Kibi', 'Amanfrom', 'Apedwa', 'Asafo', 'Asiakwa'],
    'Abuakwa North Municipal': ['Kukurantumi', 'Bomponso', 'Bonsu', 'Bosuso', 'Crig Tafo'],
    'Atiwa West': ['Kwabeng', 'Abomosu', 'Anyinam', 'Apapam', 'Awenare'],
    'Atiwa East': ['Anyinam', 'Akrofufu', 'Asunafo', 'Enyiresi', 'Manso'],
    'Fanteakwa North': ['Begoro', 'Aboso', 'Ahodwahomasu', 'Dedeso', 'Bawjiase'],
    'Fanteakwa South': ['Osino', 'Begoro', 'Ehiamenkyene', 'Nkankama', 'Aboso'],
    'Kwahu West Municipal': ['Nkawkaw', 'Adoagyiri', 'Apradan', 'Asubone', 'Danteng'],
    'Kwahu South Municipal': ['Mpraeso', 'Abetifi', 'Abetifi Nkwanta', 'Achiase', 'Ankoma'],
    'Kwahu East': ['Abetifi', 'Asase', 'Aferi Kye', 'Kwahu-Nkwanta', 'Obomaneng'],
    'Kwahu Afram Plains North': ['Donkorkrom', 'Amankwah', 'Forifori', 'Samanhyia', 'Ekye'],
    'Kwahu Afram Plains South': ['Tease', 'Ekye Amanfram', 'Kwasi Fante', 'Maame Krobo', 'Pampawie']
  },
  'Greater Accra': {
    'Ga South Municipal': ['Ngleshie Amanfro', 'Weija', 'Kasoa New Town', 'Aglafina', 'Gbawe'],
    'Weija Gbawe Municipal': ['Weija', 'Gbawe', 'Kaneshie First', 'Aplaku', 'Mallam'],
    'Ga Central Municipal': ['Sowutuom', 'Awoshie', 'Anyaa', 'Kotobabi Down', 'Aqua'],
    'Ga North Municipal': ['Amomole', 'Pokuase', 'Ofankor', 'Achiaman', 'Ofankor Barrier'],
    'Ga West Municipal': ['Amasaman', 'Pokuase', 'Ofankor', 'Achiaman', 'Darkuman'],
    'Ga East Municipal': ['Abokobi', 'Adenta', 'Atomic', 'Ogbojo', 'Ayikuma'],
    'La Nkwantanang Madina Municipal': ['Madina', 'Red Cross', 'Zongo Junction', 'Aburi Road', 'Electro-Volta'],
    'Ayawaso East Municipal': ['Nima', 'Maamobi', 'Cantonments', 'Kanda', 'Kokomlemle'],
    'Ayawaso North Municipal': ['Accra New Town', 'Abelemkpe', 'Alajo', 'Shiashie', 'Dzorwulu'],
    'Ayawaso Central Municipal': ['Kokomlemle', 'Asylum Down', 'Circle', 'Mallam Atta', 'New Town'],
    'Ayawaso West Municipal': ['Dzorwulu', 'Airport Residential', 'East Legon', 'Legon', 'Roman Ridge'],
    'Accra Metropolitan': ['Accra', 'Adabraka', 'Jamestown', 'Osu', 'Labadi'],
    'Okaikwei North Municipal': ['Tesano', 'Achimota', 'Ahodwo', 'North Legon', 'Meridian'],
    'Ablekuma North Municipal': ['Darkuman', 'Awudome', 'Kaneshie', 'Bubuashie', 'Dansoman'],
    'Ablekuma Central Municipal': ['Lartebiokorshie', 'Cantonments', 'Asylum Down', 'Kaneshie', 'Osu'],
    'Ablekuma West Municipal': ['Dansoman', 'Agege', 'Chorkor', 'Amamomo', 'Sakaman'],
    'Korle Klottey Municipal': ['Osu', 'Adabraka', 'Ridge', 'Ajangadi', 'Korle'],
    'La Dade-Kotopon Municipal': ['La', 'Teshie', 'Nungua', 'Mamprobi', 'Chorkor'],
    'Ledzokuku Municipal': ['Teshie', 'Nungua', 'La', 'Borjoman', 'Kpeshie'],
    'Krowor Municipal': ['Nungua', 'Teshie', 'Kpeshie', 'Borjoman', 'Lechi Kwa'],
    'Tema Metropolitan': ['Tema', 'Ashaiman', 'Kpone', 'Manhean', 'Sakumono'],
    'Tema West Municipal': ['Tema Community 18', 'Tema Community 25', 'Tema New Town', 'Menzzies', 'Gbemla'],
    'Kpone Katamanso Municipal': ['Kpone', 'Afienya', 'Dodowa', 'New Dawhenya', 'Oyibi'],
    'Ashaiman Municipal': ['Ashaiman', 'Tema', 'Zion', 'Abarakuor', 'GLE'],
    'Adenta Municipal': ['Adenta', 'Housing Down', 'East Legon', 'Afanffa', 'Ogbojo'],
    'Shai Osudoku': ['Dodowa', 'Asutsuare', 'Kordiabe', 'Ningo', 'Kpone'],
    'Ningo Prampram': ['Prampram', 'Dawhenya', 'Old Ningo', 'Ahwia', 'Oюн'],
    'Ada West': ['Sege', 'Anyamam', 'Bornikope', 'Ada', 'Kasseh'],
    'Ada East': ['Ada Foah', 'Kasseh', 'Ada', 'Pediator Kope', 'Toflokpo']
  },
  'Northern': {
    'Tamale Metropolitan': ['Tamale', 'Agric', 'Bagabaga', 'Choggu', 'Vitting'],
    'Gushegu Municipal': ['Gushegu', 'Galwei', 'Katani', 'Kpatinga', 'Zinindo'],
    'Karaga': ['Karaga', 'Nyong', 'Pishegu', 'Tali', 'Nasunsi'],
    'Kpandai': ['Kpandai', 'Sabonbari', 'Chamba', 'Salamba', 'Kpandai D/A'],
    'Kumbungu': ['Kumbungu', 'Dalun', 'Kpendua', 'Singa', 'Kukuo'],
    'Mion': ['Sang', 'Mion', 'Kpasinkpe', 'Dieli', 'Lunseli'],
    'Nanton': ['Nanton', 'Janjori', 'Pong Tamale', 'Zoggu', 'Taloli'],
    'Nanumba North Municipal': ['Bimbilla', 'Binchera', 'Chamba', 'Juo', 'Lanja'],
    'Nanumba South': ['Wulensi', 'Kukuo', 'Lungni', 'Nakpayili', 'Welensi'],
    'Saboba': ['Saboba', 'Garinkuka', 'Gbangbanpong', 'Sambuli', 'Chaan'],
    'Sagnarigu Municipal': ['Sagnarigu', 'Bontanga', 'Gbulun', 'Kpiliyin', 'Kunbungu'],
    'Savelugu Municipal': ['Savelugu', 'Diare', 'Pigu', 'Tampion', 'Kpatinga'],
    'Tatale Sanguli': ['Tatale', 'Kandin', 'Kpalbutabu', 'Zabzugu', 'Lepursi'],
    'Tolon': ['Tolon', 'Lingbinga', 'Tonlon', 'Wantugu', 'Kpanwunsi'],
    'Yendi Municipal': ['Yendi', 'Adibo', 'Balogu', 'Bunbon', 'Dabogni'],
    'Zabzugu': ['Zabzugu', 'Kukpalgu', 'Nakpale', 'Sabare', 'Woriborgu']
  },
  'North East': {
    'West Mamprusi Municipal': ['Walewale', 'Gbeo', 'Janga', 'Kparigu', 'Kpesenkpe'],
    'Mamprugu Moagduri': ['Yagaba', 'Gbedembilisi', 'Moaduri', 'Kubori', 'Pawurugu'],
    'East Mamprusi Municipal': ['Gambaga', 'Gbingbani', 'Gbintiri', 'Langbinsi', 'Nalerigu'],
    'Bunkpurugu Nakpanduri': ['Bunkpurugu', 'Nakpanduri', 'Binde', 'Gundaa', 'Kila'],
    'Yunyoo Nasuan': ['Yunyoo', 'Nasuan', 'Bunkpurugu', 'Gimbale', 'Nanchala'],
    'Chereponi': ['Chereponi', 'Bunburika', 'Wanjuga', 'Wenchiki', 'Shiare']
  },
  'Oti': {
    'Jasikan Municipal': ['Jasikan', 'Abotoase', 'Akaa', 'Amanya', 'Baglo'],
    'Kadjebi': ['Kadjebi', 'Ahamansu', 'Dodi Papase', 'Dodo Amanfrom', 'Nkwanta'],
    'Nkwanta South Municipal': ['Nkwanta', 'Bonakye', 'Bontibor', 'Brewaniase', 'Kechebi'],
    'Nkwanta North': ['Kpassa', 'Damanko', 'Sibi', 'Tinjase', 'Kpendi'],
    'Biakoye': ['Nkonya Ahenkro', 'Biakoye', 'Nkonya', 'Tinkong', 'Kpeyoku'],
    'Krachi East Municipal': ['Dambai', 'Adumadum', 'Asukawkaw', 'Katanga', 'Dormabin'],
    'Krachi West Municipal': ['Kete Krachi', 'Anyiname', 'Banda', 'Borae', 'Chinderi'],
    'Krachi Nchumuru': ['Chinderi', 'Krachi', 'Prang', 'Todzie', 'Ambrim'],
    'Guan': ['Likpe Mate', 'Guan', 'Buem', 'Bumbua', 'Kpando']
  },
  'Savannah': {
    'Bole': ['Bole', 'Bamboi', 'Banda-Nkwanta', 'Jama', 'Mandari'],
    'Sawla Tuna Kalba': ['Sawla', 'Gindabuo', 'Kalba', 'Kulmasa', 'Soma'],
    'West Gonja Municipal': ['Damongo', 'Bawena', 'Busunu', 'Lingbinsi', 'Sawla'],
    'North Gonja': ['Daboya', 'Mpaha', 'Laribanga', 'Musapa', 'Dabori'],
    'Central Gonja': ['Buipe', 'Kusawgu', 'Mpaha', 'Sankpala', 'Tuluwe'],
    'East Gonja Municipal': ['Salaga', 'Abromase', 'Blajai', 'Buma', 'Ekumde'],
    'North East Gonja': ['Kpalbe', 'Daboya', 'Laribanga', 'Busunu', 'Tolon']
  },
  'Upper East': {
    'Builsa South': ['Fumbisi', 'Chansa', 'Dooninga', 'Gbedema', 'Kaadema'],
    'Builsa North Municipal': ['Sandema', 'Bachongsa', 'Kalijiisa', 'Kori', 'Fieni'],
    'Kasena Nankana Municipal': ['Navrongo', 'Azugyera', 'Bawiu', 'Biu', 'Doba'],
    'Kasena Nankana West': ['Paga', 'Adognia', 'Chiana', 'Kalvio', 'Kanania'],
    'Bolgatanga Municipal': ['Bolgatanga', 'Aguusi', 'Atulbabisi', 'Bolga Soe', 'Zoko'],
    'Bolgatanga East': ['Zuarungu', 'Gorgo', 'Kpatia', 'Namolgo', 'Tongo'],
    'Bongo': ['Bongo', 'Adaboya', 'Anafobisi', 'Apatanga', 'Atampiisi'],
    'Talensi': ['Tongo', 'Datuko', 'Tonga', 'Winkogo', 'Nayire'],
    'Nabdam': ['Nangodi', 'Duusi', 'Kongo', 'Pelungu', 'Sakote'],
    'Bawku West': ['Zebila', 'Apodabogo', 'Binaba', 'Bulinga', 'Atta'],
    'Bawku Municipal': ['Bawku', 'Bansi', 'Bazua', 'Binduri', 'Loga'],
    'Pusiga': ['Pusiga', 'Bimpa', 'Daboriyelgo', 'Nayiri', 'Tumu'],
    'Garu': ['Garu', 'Denegu', 'Denugu', 'Kpatia', 'Kpattia'],
    'Tempane': ['Tempane', 'Basyonde', 'Benwoko', 'Bimpeka', 'Kpikpira']
  },
  'Upper West': {
    'Wa Municipal': ['Wa', 'Airstrip', 'Boli', 'Charia', 'Konda'],
    'Wa West': ['Wechiau', 'Chogsia', 'Dabo', 'Dorimon', 'Dornye'],
    'Nadowli Kaleo': ['Nadowli', 'Chekali', 'Cheri-sombo', 'Fian', 'Gabilee'],
    'Daffiama Bussie Issa': ['Issa', 'Duong', 'Kojokpere', 'Ping', 'Samanbo'],
    'Jirapa Municipal': ['Jirapa', 'Bussie', 'Dahile', 'Duori', 'Hain'],
    'Lambussie': ['Lambussie', 'Billaw', 'Dapuori', 'Piina', 'Samoa'],
    'Lawra Municipal': ['Lawra', 'Babile', 'Badi', 'Biro', 'Dikpe'],
    'Nandom': ['Nandom', 'Hamile', 'Lambussie', 'Nandom Tendaga', 'Ko Pelkuri'],
    'Wa East': ['Funsi', 'Bulenga', 'Challa', 'Charingu', 'Ducie'],
    'Sissala West': ['Gwollu', 'Fiemuo', 'Jeffisi', 'Zini', 'Tumu'],
    'Sissala East Municipal': ['Tumu', 'Bawiesibella', 'Kulfuo', 'Nabugubelle', 'Kunchogu']
  },
  'Volta': {
    'Keta Municipal': ['Keta', 'Abor', 'Afife', 'Agbledome', 'Alakple'],
    'Anloga': ['Anloga', 'Keta', 'Keta-Agbozume', 'Tegbi', 'Abor'],
    'Ketu South Municipal': ['Denu', 'Adina', 'Aflao', 'Agavedzi', 'Agbozume'],
    'Ketu North Municipal': ['Dzodze', 'Devego', 'Ehie', 'Penyi', 'Tadzewu'],
    'Akatsi South': ['Akatsi', 'Agormor', 'Asafotsi', 'Atidzive', 'Avenorpedo'],
    'Akatsi North': ['Ave Dakpa', 'Ave-Afiadenyigba', 'Avevi', 'Have', 'Ave-Sui'],
    'South Tongu': ['Sogakope', 'Adutor', 'Agbakope', 'Asidowui', 'Vume'],
    'Central Tongu': ['Adidome', 'Adaklu Ahunda', 'Dzolokpuita', 'Akuse', 'Mawuko'],
    'North Tongu': ['Battor', 'Avedo', 'Fodzoku', 'Dofor Adidome', 'Mepe'],
    'Adaklu': ['Adaklu Waya', 'Adaklu Hlekpe', 'Agbakofe', 'Kordiave', 'Trekorpe'],
    'Agotime Ziope': ['Kpetoe', 'Adaklu Sopa', 'Dzalele', 'Keyime', 'Agbozume'],
    'Ho Municipal': ['Ho', 'Abutia Agove', 'Akoefe', 'Akrofu', 'Hohoe'],
    'Ho West': ['Dzolokpuita', 'Abutia Kloe', 'Tafi Atome', 'Agbeforle', 'Kpenoe'],
    'South Dayi': ['Kpeve', 'Adzokoe', 'Anum', 'Asikuma', 'Dzakeh'],
    'Kpando Municipal': ['Kpando', 'Agbenorhoe', 'Anfoega', 'Aveme Beme', 'Dzungu'],
    'North Dayi': ['Anfoega', 'Kpeve', 'Abadaa', 'Anum Kpodzi', 'Wute'],
    'Hohoe Municipal': ['Hohoe', 'Akpafu Adorkor', 'Alavanyo', 'Fodome Ahor', 'Gbledi'],
    'Afadzato South': ['Ve-Golokwati', 'Afadzato', 'Have', 'Tafi', 'Dzemeni']
  },
  'Western': {
    'Jomoro Municipal': ['Half Assini', 'Bonyere', 'Ekabeku', 'Ellubo', 'Amenfi'],
    'Ellembelle': ['Nkroful', 'Ellembelle', 'Eikwe', 'Sanwei', 'Teleku Bokaa'],
    'Nzema East Municipal': ['Axim', 'Aiyinase', 'Asasetre', 'Awiebo', 'Bamiankor'],
    'Ahanta West Municipal': ['Agona Nkwanta', 'Abura', 'Apowa', 'Asemasa', 'Dixcove'],
    'Sekondi Takoradi Metropolitan': ['Sekondi', 'Takoradi', 'Effiakuma', 'Anaji', 'Adiembra'],
    'Effia Kwesimintsim Municipal': ['Kwesimintsim', 'Airport Ridge', 'Apremdo', 'Fijai', 'Anaji'],
    'Shama': ['Shama', 'Aboadze', 'Daboase', 'Inchaban', 'Dompim'],
    'Wassa East': ['Daboase', 'Atobiase', 'Enyinabrim', 'Sekyere Krobo', 'Achimota'],
    'Mpohor': ['Mpohor', 'Adansi', 'Adum Bamso', 'Agya', 'Ahenkuro'],
    'Tarkwa Nsuaem Municipal': ['Tarkwa', 'Aboso', 'Bankyim', 'Nsuta', 'Abontiakoon'],
    'Prestea Huni Valley Municipal': ['Bogoso', 'Aboso', 'Prestea', 'Awudua', 'Huni Valley'],
    'Amenfi East Municipal': ['Wassa Akropong', 'Asankragwa', 'Bawdie', 'Dawurampong', 'Aiyinase'],
    'Amenfi Central': ['Manso Amenfi', 'Wassa Amenfi', 'Bodaa', 'Drobo', 'Benkye'],
    'Amenfi West Municipal': ['Asankragua', 'Adjakaa Manso', 'Agona Amenfi', 'Akotoku', 'Asoho']
  },
  'Western North': {
    'Aowin Municipal': ['Enchi', 'Achimfo', 'Acquai Allah', 'Adjoum', 'Mamudu'],
    'Suaman': ['Dadieso', 'Akontombra Nkwanta', 'Gyatokrom', 'Helehele', 'Kwesikrom'],
    'Bibiani Anhwiaso Bekwai Municipal': ['Bibiani', 'Anhwiaso', 'Asempaneye', 'Awaso', 'Bekwai'],
    'Sefwi Wiawso Municipal': ['Sefwi Wiawso', 'Ackaakrom', 'Anyinabrim', 'Asafo', 'Asawinso'],
    'Sefwi Akontombra': ['Sefwi Akontombra', 'Asantekrom', 'Nsawora', 'Nsawura', 'Drobo'],
    'Juaboso': ['Juaboso', 'Anhwiafutu', 'Boinzan', 'Bonsu Nkwanta', 'Adekye'],
    'Bodi': ['Bodie', 'Ahinbenso', 'Amoaya', 'Mamudukrom', 'Sefwi Debiso'],
    'Bia West': ['Essam Dabiso', 'Akaatiso', 'Amoakrom', 'Asuonta', 'Brebre'],
    'Bia East': ['Adabokrom', 'Adiema', 'Adumkrom', 'Ahimakrom', 'Alhajikrom']
  }
};

export const GHANA_REGIONS = Object.keys(GHANA_LOCATIONS) as GhanaRegion[];

/**
 * Parse a location string into its components.
 * Supports "Region > District > Town", "Region > District", or just "Region".
 * Returns null if the string is empty or invalid.
 */
export function parseLocation(location: string): { region: string; district: string; town: string } | null {
  if (!location || !location.trim()) return null;
  const parts = location.split('>').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    return { region: parts[0], district: parts[1], town: parts[2] };
  }
  if (parts.length === 2) {
    return { region: parts[0], district: parts[1], town: '' };
  }
  if (parts.length === 1) {
    return { region: parts[0], district: '', town: '' };
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

/**
 * Get total count of all MMDAs across all regions.
 */
export function getTotalMMDACount(): number {
  return Object.values(GHANA_LOCATIONS).reduce(
    (total, districts) => total + Object.keys(districts).length,
    0
  );
}

/**
 * Search for districts matching a query string across all regions.
 */
export function searchDistricts(query: string): { region: string; district: string }[] {
  const results: { region: string; district: string }[] = [];
  const lowerQuery = query.toLowerCase();
  for (const [region, districts] of Object.entries(GHANA_LOCATIONS)) {
    for (const district of Object.keys(districts)) {
      if (district.toLowerCase().includes(lowerQuery)) {
        results.push({ region, district });
      }
    }
  }
  return results;
}

/**
 * Search for towns matching a query string across all regions and districts.
 */
export function searchTowns(query: string): { region: string; district: string; town: string }[] {
  const results: { region: string; district: string; town: string }[] = [];
  const lowerQuery = query.toLowerCase();
  for (const [region, districts] of Object.entries(GHANA_LOCATIONS)) {
    for (const [district, towns] of Object.entries(districts)) {
      for (const town of towns) {
        if (town.toLowerCase().includes(lowerQuery)) {
          results.push({ region, district, town });
        }
      }
    }
  }
  return results;
}
