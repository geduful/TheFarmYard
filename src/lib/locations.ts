/**
 * Ghana administrative locations — Regions, Districts/Municipals, and Towns.
 * Used for structured location selection during signup, profile editing, and listing creation.
 *
 * Format stored in database: "Region > District > Town"
 * Data source: openadmindata.org (260 districts, official Ghana MMDAs)
 */

export type GhanaRegion = string;
export type GhanaDistrict = string;
export type GhanaTown = string;

export const GHANA_LOCATIONS: Record<GhanaRegion, Record<GhanaDistrict, GhanaTown[]>> = {
  'Ahafo': {
    'Asunafo North Municipal': ['Akrodie', 'Ampenkro', 'Asumura', 'Ayomso', 'Fawohoyeden'],
    'Asunafo South': ['Abuom', 'Asarekrom', 'Kokooso', 'Kukuom', 'Kwapong'],
    'Asutifi North': ['Gambia  No.1', 'Nkensere'],
    'Asutifi South': ['Dadiesoaba', 'Kenyasi', 'Nkasiem', 'Siekyemu', 'Twabidi No.1'],
    'Tano North Municipal': ['Adrobaa', 'Bomaa', 'Duayaw Nkwanta', 'Gyedu', 'Tanoso'],
    'Tano South Municipal': ['Bechem', 'Brosankro', 'Derma', 'Sabronum', 'Techimantia']
  },
  'Ashanti': {
    'Adansi Akrofuom': ['Adansi Akrofuom'],
    'Adansi Asokwa': ['Adansi Asokwa'],
    'Adansi North': ['Aboabo No 2', 'Akrokerri', 'Asokwa', 'Bodwesango', 'Dompoase'],
    'Adansi South': ['Akrofrom', 'Akutreso', 'Ampunyasi', 'Ataasi Nkwanta', 'Atwereboana'],
    'Afigya Kwabre North': ['Boamang', 'Kyekyewere', 'Tetrem'],
    'Afigya Kwabre South': ['Aboabogya', 'Aboaso', 'Afrancho', 'Ahenkro', 'Ankaase'],
    'Ahafo Ano North': ['Acherensua', 'Akwasiase', 'Anyinasuso', 'Betiako', 'Hwidiem'],
    'Ahafo Ano South East': ['Adinyana', 'Adwinyama', 'Essienkyem', 'Mankranso', 'Pokukrom'],
    'Ahafo Ano South West': ['Abuakwa', 'Achiase', 'Adankwame', 'Akropong', 'Asuofia'],
    'Amansie Central': ['Akrofrom', 'Hia', 'Jacobu', 'Mile 14', 'Numereso'],
    'Amansie South': ['Amansie South'],
    'Amansie West': ['Abuoso', 'Adimposo', 'Agroyesum', 'Assuowin', 'Datano'],
    'Asante Akim Central Municipal': ['Nobewam', 'Peminase'],
    'Asante Akim North': ['Abosomtweagya', 'Agogo', 'Ahenebronuum', 'Akratiebesa', 'Ananekrom'],
    'Asante Akim South': ['Banka', 'Banso', 'Bompata', 'Dwendwenase', 'Juaso'],
    'Asokore Mampong Municipal': ['Kokobra', 'Okyerekrom'],
    'Asokwa Municipal': ['Asokwa Municipal'],
    'Atwima Kwanwoma': ['Aburaso', 'Ahenema kokoben', 'Bebu', 'Brofoyeduru', 'Foase'],
    'Atwima Mponua': ['Barniekrom', 'Bayerebon', 'Bibiani', 'Enyinamoso', 'Gyeresu'],
    'Atwima Nwabiagya North': ['Dwenwoho', 'Essibey Nkwata'],
    'Atwima Nwabiagya South': ['Atwima Nwabiagya South'],
    'Bekwai Municipal': ['Amoaful', 'Anwiankwanta', 'Apau', 'Bekwai', 'Dominase'],
    'Bosome Freho': ['Achiase', 'Asiwa', 'Brofoyedru', 'Detieso', 'Duasi'],
    'Bosomtwe': ['Amakom', 'Apinkra', 'Brodekwanu', 'Esereso', 'Feyiase'],
    'Ejisu Municipal': ['Boamadumase', 'Bomfa'],
    'Ejura-Sekyedumase': ['Ahyiayem', 'Babaso', 'Ejura', 'Ejura Nkwanta', 'Homako'],
    'Juaben Municipal': ['Adadientam', 'Akyawkrom', 'Besease', 'Hwireso', 'Juaben'],
    'Kumasi Metropolitan': ['Abed-Pankrono', 'Aboabo', 'Abrepo', 'Abrepo Junction', 'Adoato'],
    'Kwabre East': ['Abira', 'Abirem', 'Adwumakase Kese', 'Antoa', 'Asonamaso'],
    'Kwadaso Municipal': ['Kwadaso Municipal'],
    'Mampong Municipal': ['Adidwan', 'Anyinasu', 'Apaa', 'Asaam', 'Benim'],
    'Obuasi East': ['Obuasi East'],
    'Obuasi Municipal': ['Aboagye Krom', 'Abompe New Site', 'Akaporiso', 'Bedieso-Obuasi', 'Boete'],
    'Offinso Municipal': ['Abofour', 'Amoawi', 'Anyinasuso', 'Bonsua', 'Brofoyedru'],
    'Offinso North': ['Aboffour', 'Afrancho', 'Akomadan', 'Akomadan zongo', 'Anyinasusu'],
    'Oforikrom Municipal': ['Apromase', 'Donyina', 'Ejisu', 'Essienimpong', 'Krapa-Ejisu'],
    'Old Tafo Municipal': ['Ahwiaa', 'Atimatim'],
    'Sekyere Afram Plains North': ['Anyinofi'],
    'Sekyere Central': ['Aframso No.3', 'Asubuasu', 'Atonsu', 'Beposo', 'Isaaka Akura'],
    'Sekyere East': ['Akokuaso', 'Banko', 'Dadiase', 'Effiduase', 'Okaikrom'],
    'Sekyere Kumawu': ['Drobonso', 'Kumawu', 'Kumawu Bodomasi', 'Woraso'],
    'Sekyere South': ['Afamaso', 'Agona', 'Asamang', 'Bepoase', 'Boanim'],
    'Suame Municipal': ['Bronkong']
  },
  'Bono': {
    'Banda': ['Banda'],
    'Berekum East Municipal': ['Akrofro', 'Berekum', 'Berekum Zongo', 'Mpatasei'],
    'Berekum West': ['Amomaso', 'Botokrom', 'Jinijini'],
    'Dormaa East': ['Akontanim', 'Dormaa Akwamu', 'Kyeremasu', 'Wamanafo', 'Wamfi'],
    'Dormaa Municipal': ['Aboabo', 'Ammasua', 'Asikasu', 'Danyame', 'Dormaa'],
    'Dormaa West': ['Dormaa West'],
    'Jaman North': ['Sampa', 'Asiri', 'Asuoko', 'Buni', 'Goka'],
    'Jaman South Municipal': ['Abirikasu', 'Adamsu', 'Adiokor', 'Asare', 'Atuna'],
    'Sunyani Municipal': ['Abesim', 'Antwkrom', 'Atuahenekrom', 'Berekum', 'Bofourkrom'],
    'Sunyani West': ['Sunyani West'],
    'Tain': ['Badu', 'Banda Ahenkro', 'Brohani', 'Bui', 'Debibi'],
    'Wenchi Municipal': ['Droboso', 'Nchiraa', 'Subinso', 'Wenchi', 'Wenchi Bandaline']
  },
  'Bono East': {
    'Atebubu Amantin': ['Akokoa', 'Amanteng', 'Atebubu', 'Jato Zongo'],
    'Kintampo North Municipal': ['Busuama', 'Dawadawa', 'Kintampo', 'Kunsu', 'New Longoro'],
    'Kintampo South': ['Amoma', 'Anyima', 'Apesika', 'Jema'],
    'Nkoranza North': ['Busunyaa', 'Dromankese', 'Yefri'],
    'Nkoranza South': ['Akuma', 'Ayerede', 'Bonsu', 'Donkro-Nkwanta', 'Nkoranza'],
    'Pru East': ['Parambo', 'Prang', 'Yeji'],
    'Pru West': ['Abease'],
    'Sene East': ['Kajaji', 'Kojokrom', 'Nyakontre'],
    'Sene West': ['Bantama', 'Bassa', 'Kwame Danso', 'Kwami Danso'],
    'Techiman Municipal': ['Asantanso', 'Aworowa', 'Buotem', 'Fiaso', 'Forikrom'],
    'Techiman North': ['Kranka']
  },
  'Central': {
    'Abura-Asebu-Kwamankese': ['Abakrampa', 'Abura Dunkwa', 'Abura Gyabankrom', 'Asomdwee', 'Ayeldu'],
    'Agona East': ['Agona Asafo', 'Agona Nsaba', 'Duakwa', 'Kwanyako', 'Mankrong'],
    'Agona West Municipal': ['Agona Abodom', 'Agona Nyakrom', 'Desuanim', 'Nkum', 'Otsenkorang'],
    'Ajumako-Enyan-Essiam': ['Ajumako', 'Ajumako Ba', 'Ajumako Bisease', 'Ajumako Entumbil', 'Ekukrom'],
    'Asikuma-Odoben-Brakwa': ['Anhwiam', 'Asikuma', 'Bedum', 'Breman Amanfopong', 'Breman Asikuma'],
    'Assin Fosu': ['Assin Fosu'],
    'Assin North': ['Assin Akropong', 'Assin Bereku', 'Assin Praso', 'Bediadua', 'Foso'],
    'Assin South': ['Anyinabrim', 'Assin Ongwa', 'Jakai', 'Kyekyewere', 'Manso'],
    'Awutu Senya': ['Ahentia', 'Akrabon', 'Awutu Bereku', 'Awutu-Bereku', 'Bawjiase'],
    'Awutu Senya East': ['Gyangyanadze'],
    'Cape Coast Metropolitan': ['Aboom', 'Abura', 'Adiebikrom', 'Adisadel', 'Bakano'],
    'Effutu Municipal': ['Winneba'],
    'Ekumfi': ['Ekumfi'],
    'Gomoa Central': ['Gomoa Central'],
    'Gomoa East': ['Buduatta', 'Buduburam Camp', 'Budumburam Camp', 'Fetteh', 'Mankoadze'],
    'Gomoa West': ['Ankamu', 'Apam', 'Mankoadze', 'Ngyiresi', 'Noguchi'],
    'Komenda-Edina-Eguafo-Abirem Municipal': ['Abrem Agona', 'Aburansa', 'Ankaful', 'Antseamboa', 'Atonkwa'],
    'Mfantseman Municipal': ['Abeadze Dominase', 'Anomabo', 'Biriwa', 'Essuehyia', 'Mankessim'],
    'Twifo Atti-Morkwa': ['Atieku', 'Bempongagye', 'Twifo', 'Twifo Wamase', 'Twifu Praso'],
    'Twifo Hemang Lower Denkyira': ['Akutuase', 'Frami'],
    'Upper Denkyira East Municipal': ['Atechem', 'Buaben', 'Dunkwa', 'Dunkwa-On-Offin', 'Kyekyewere'],
    'Upper Denkyira West': ['Ayanfuri', 'Diaso', 'Dominase', 'Dominasi', 'Nkotomso']
  },
  'Eastern': {
    'Abuakwa North': ['Bomponso', 'Bonsu', 'Bosuso', 'Crig (Tafo)', 'Hemang'],
    'Abuakwa South': ['Amanfrom', 'Apedwa', 'Asafo', 'Asiakwa', 'Kwasi Komfo'],
    'Achiase': ['Achiase'],
    'Akwapem North': ['Adawso', 'Adwaso', 'Kwamoso', 'Mampong', 'Mangoase'],
    'Akwapem South': ['Aburi', 'Adoagire Zongo', 'Brekuso', 'Kitase', 'Obosonmase'],
    'Akyem Mansa': ['Akyem Mansa'],
    'Asene Akroso Manso': ['Asene Akroso Manso'],
    'Asuogyaman': ['Adjena', 'Akosombo', 'Akwamufie', 'Apeguso', 'Atimpoku'],
    'Atiwa East': ['Akrofufu', 'Asunafo', 'Dwenease', 'Enyiresi', 'Kwabeng'],
    'Atiwa West': ['Abomosu', 'Anyinam', 'Apapam', 'Awenare', 'Kibi'],
    'Ayensuano': ['Akyeansa', 'Amanase', 'Asuboi', 'Coaltar', 'Dokruchiwa'],
    'Birim Central Municipal': ['Birim Central Municipal'],
    'Birim North': ['Adausena', 'Adjobue', 'Adubease', 'Adwafo', 'Afosu'],
    'Birim South': ['Achiase', 'Akenkenso', 'Akim Swedru', 'Akotekrom', 'Akroso'],
    'Denkyembour': ['Denkyembour'],
    'Fanteakwa North': ['Aboso', 'Ahodwahomasu', 'Dedeso'],
    'Fanteakwa South': ['Begoro', 'Ehiamenkyene', 'Nkankama'],
    'Kwaebibirem': ['Abamm', 'Akwatia', 'Asuom', 'Boadua', 'Bomso'],
    'Kwahu Afram Plains North': ['Amankwah', 'Donkorkrom', 'Forifori', 'Samanhyia'],
    'Kwahu Afram Plains South': ['Ekye Amanfram', 'Kwasi Fante', 'Maame Krobo', 'Tease'],
    'Kwahu East': ['Kwahu East'],
    'Kwahu South': ['Abetifi', 'Abetifi Nkwanta', 'Achiase', 'Aduamoah', 'Ankoma'],
    'Kwahu West': ['Adoagyiri', 'Apradan', 'Asubone', 'Asuboni', 'Danteng'],
    'Lower Manya': ['Agomanya', 'Agormanya', 'Akuse', 'Apaaso New Senchi', 'Atua'],
    'New Juaben North Municipal': ['Akwadom', 'Jumapo', 'Oyoko'],
    'New Juaben South Municipal': ['Adweso', 'Agavenya', 'Asokore', 'Betom', 'Bronya Junction'],
    'Nsawam Adoagyiri': ['Adoagire', 'Ahodjo Ketewa', 'Djankrom', 'Marfo', 'Nsawam'],
    'Okere': ['Abiriw', 'Adukrom', 'Agomeda', 'Akropong', 'Amanfro'],
    'Suhum Municipal': ['Akorabo', 'Nankese', 'Ntunkum', 'Obomofedensua', 'Oforikrom'],
    'Upper Manya': ['Akateng', 'Anyaboni', 'Asesewa', 'Djamam', 'Odometta'],
    'Upper West Akim': ['Upper West Akim'],
    'West Akim': ['Abamkrom', 'Adeiso', 'Adieso', 'Akim Bremang', 'Anumapapam'],
    'Yilo Krobo': ['Boti', 'Bukunor', 'Huhunya', 'Klo-Agogo', 'Labolabo']
  },
  'Greater Accra': {
    'Ablekuma Central Municipal': ['Abossey Okai', 'Awudome', 'Kaneshie'],
    'Ablekuma North Municipal': ['Abeka Lapas', 'Akweteman', 'Awoshie'],
    'Ablekuma West Municipal': ['Agege', 'Chorkor', 'Dansoman'],
    'Accra Metropolis': ['Accra', 'Adabraka', 'Adjabeng', 'Agbogbloshie'],
    'Ada East': ['Ada', 'Kasseh', 'Pediator Kope'],
    'Ada West': ['Anyamam', 'Bornikope', 'Sege'],
    'Adenta Municipal': ['Adenta'],
    'Ashaiman Municipal': ['Ashaiman'],
    'Ayawaso Central Municipal': ['Asylum Down', 'Circle', 'Kokomlemle', 'Mallam Atta'],
    'Ayawaso East Municipal': ['Cantoments', 'Maamobi', 'Nima'],
    'Ayawaso North Municipal': ['Abelemkpe', 'Alajo', 'Dzorwulu'],
    'Ayawaso West': ['Airport Residential', 'East Legon', 'Legon'],
    'Ga Central Municipal': ['Sowutuom'],
    'Ga East': ['Abokobi', 'Adenta', 'Amasaman', 'Atomic'],
    'Ga North Municipal': ['Amomole'],
    'Ga South Municipal': ['Ngleshie Amanfro'],
    'Ga West Municipal': ['Amasaman', 'Pokuase', 'Ofankor'],
    'Korle Klottey Municipal': ['Adabraka', 'La', 'Osu', 'Ridge'],
    'Kpone Katamanso': ['Afienya', 'Dodowa', 'Kpone', 'New Dawhenya'],
    'Krowor Municipal': ['Nungua'],
    'La Dade-Kotopon': ['Airport', 'Burma Camp', 'La'],
    'La-Nkwantanang-Madina': ['Madina'],
    'Ledzokuku Municipal': ['Teshie'],
    'Ningo/Prampram': ['Dawhenya', 'Prampram', 'Old Ningo'],
    'Okaikwei North Municipal': ['Achimota', 'Dzorwulu', 'Tesano'],
    'Shai Osudoku': ['Asutsuare', 'Dodowa', 'Kordiabe'],
    'Tema Metropolitan': ['Tema', 'Adenta', 'Amrahia'],
    'Tema West Municipal': ['Tema Community 18'],
    'Weija Gbawe Municipal': ['Gbawe', 'Weija']
  },
  'Northern': {
    'Gushegu': ['Galwei', 'Gushegu', 'Katani', 'Kpatinga', 'Zinindo'],
    'Karaga': ['Karaga', 'Nyong', 'Pishegu'],
    'Kpandai': ['Kpandai'],
    'Kumbungu': ['Dalun', 'Kpendua', 'Singa'],
    'Mion': ['Mion'],
    'Nanton': ['Janjori', 'Nanton', 'Pong Tamale', 'Savelugu', 'Zoggu'],
    'Nanumba North': ['Bimbilla', 'Binchera', 'Chamba', 'Juo', 'Lanja'],
    'Nanumba South': ['Kukuo', 'Lungni', 'Nakpayili', 'Pudua', 'Welensi'],
    'Saboba': ['Garinkuka', 'Gbangbanpong', 'Kpalba', 'Saboba', 'Sambuli'],
    'Sagnarigu': ['Bontanga', 'Cheshegu', 'Gbulun', 'Kpiliyin', 'Kunbungu'],
    'Savelugu': ['Diare', 'Pigu', 'Savelugu', 'Tampion'],
    'Tamale Metropolitan': ['Agric', 'Bagabaga', 'Bulpela', 'Changli', 'Choggu'],
    'Tatale Sanguli': ['Kandin', 'Kpalbutabu', 'Tatale', 'Zabzugu'],
    'Tolon': ['Lingbinga', 'Tolon', 'Tonlon', 'Wantugu'],
    'Yendi Municipal': ['Adibo', 'Balogu East', 'Bunbon', 'Dabogni', 'Jimle'],
    'Zabzugu': ['Kukpalgu', 'Nakpale', 'Sabare', 'Woriborgu']
  },
  'Northern East': {
    'Bunkpurugu Nakpanduri': ['Binde', 'Bunkpurugu', 'Yunyoo'],
    'Chereponi': ['Bunburika', 'Chereponi', 'Wanjuga', 'Wenchiki'],
    'East Mamprusi': ['Gambaga', 'Gbingbani', 'Gbintiri', 'Langbinsi', 'Nalerigu'],
    'Mamprugu Moagduri': ['Gbedembilisi', 'Yagaba'],
    'West Mamprusi Municipal': ['Gbeo', 'Janga', 'Kparigu', 'Kpesenkpe', 'Walewale'],
    'Yunyoo-Nasuan': ['Bunkpurugu', 'Gimbale', 'Nasuan']
  },
  'Oti': {
    'Biakoye': ['Biakoye', 'Nkonya'],
    'Jasikan': ['Abotoase', 'Akaa', 'Amanya', 'Baglo', 'Jasikan'],
    'Kadjebi': ['Ahamansu', 'Dodi Papase', 'Dodi-Mempeasem', 'Dodo Amanfrom', 'Kadjebi'],
    'Krachi East Municipal': ['Adumadum', 'Asukawkaw', 'Dambai', 'Dormabin', 'Katanga'],
    'Krachi Nchumuru': ['Chinderi', 'Krachi Nchumuru'],
    'Krachi West': ['Anyiname', 'Banda', 'Borae', 'Chinderi', 'Kete Krachi'],
    'Nkwanta North': ['Damanko', 'Kpassa', 'Sibi', 'Tinjase'],
    'Nkwanta South Municipal': ['Bonakye', 'Bontibor', 'Brewaniase', 'Kechebi', 'Nkwanta']
  },
  'Savannah': {
    'Bole': ['Bamboi', 'Banda-Nkwanta', 'Bole', 'Jama', 'Mandari'],
    'Central Gonja': ['Buipe', 'Kusawgu', 'Mpaha', 'Sankpala', 'Tuluwe'],
    'East Gonja Municipal': ['Abromase', 'Blajai', 'Buma', 'Salaga', 'Ekumde'],
    'North East Gonja': ['Daboya', 'North East Gonja'],
    'North Gonja': ['Mpaha', 'North Gonja'],
    'Sawla-Tuna-Kalba': ['Gindabuo', 'Kalba', 'Kulmasa', 'Sawla', 'Soma'],
    'West Gonja': ['Bawena', 'Busunu', 'Daboya', 'Damongo', 'Lingbinsi']
  },
  'Upper East': {
    'Bawku Municipal': ['Bansi', 'Bawku', 'Bawku-Kariamah', 'Bazua', 'Binduri'],
    'Bawku West': ['Apodabogo', 'Asogummore', 'Azuwera', 'Binaba', 'Bulinga'],
    'Binduri': ['Binduri'],
    'Bolga East': ['Gorgo', 'Kpatia', 'Namolgo', 'Tongo', 'Zanlerigu'],
    'Bolgatanga Municipal': ['Aguusi', 'Atulbabisi', 'Bolga', 'Bolga Soe', 'Bolgatanga'],
    'Bongo': ['Adaboya', 'Akolpolsiga', 'Anafobisi', 'Apatanga', 'Atampiisi'],
    'Builsa North': ['Bachongsa', 'Builsa', 'Kalijiisa', 'Kori', 'Sandema'],
    'Builsa South': ['Chansa', 'Dooninga', 'Fumbisi', 'Gbedema', 'Kaadema'],
    'Garu': ['Denegu', 'Denugu', 'Garu', 'Kpatia', 'Kpattia'],
    'Kasena Nankana East': ['Azugyera', 'Bawiu', 'Biu', 'Doba', 'Navrongo'],
    'Kasena Nankana West': ['Adognia', 'Chiana', 'Kalvio', 'Kanania', 'Paga'],
    'Nabdam': ['Duusi', 'Kongo', 'Nangodi', 'Pelungu', 'Sakote'],
    'Pusiga': ['Pusiga'],
    'Talensi': ['Datuko', 'Tonga', 'Tongo'],
    'Tempane': ['Basyonde', 'Benwoko', 'Bimpeka', 'Bugri', 'Kpikpira']
  },
  'Upper West': {
    'Daffiama Bussie Issa': ['Duong', 'Issa', 'Kojokpere', 'Ping', 'Samanbo'],
    'Jirapa': ['Bussie', 'Dahile', 'Duori', 'Hain', 'Jirapa'],
    'Lambussie-Karni': ['Billaw', 'Dapuori', 'Lambussie', 'Piina', 'Samoa'],
    'Lawra': ['Babile', 'Badi', 'Biro', 'Dikpe', 'Lawra'],
    'Nadowli-Kaleo': ['Chekali', 'Cheri-sombo', 'Fian', 'Gabilee', 'Nadowli'],
    'Nandom': ['Hamile', 'Lambussie', 'Nandom'],
    'Sissala East': ['Bawiesibella', 'Kulfuo', 'Kunchogu', 'Nabugubelle', 'Tumu'],
    'Sissala West': ['Fiemuo', 'Gwollu', 'Jeffisi', 'Zini'],
    'Wa East': ['Bulenga', 'Challa', 'Charingu', 'Ducie', 'Funsi'],
    'Wa Municipal': ['Airstrip', 'Boli', 'Busa', 'Charia', 'Wa'],
    'Wa West': ['Chogsia', 'Dabo', 'Dorimon', 'Dornye', 'Wechiau']
  },
  'Volta': {
    'Adaklu': ['Adaklu Hlekpe', 'Adaklu Waya'],
    'Afadzato South': ['Afadzato South', 'Ve-Golokwati'],
    'Agotime Ziope': ['Adaklu Sopa', 'Dzalele', 'Keyime', 'Kpetoe', 'Agbozume'],
    'Akatsi North': ['Ave Dakpa', 'Ave-Afiadenyigba', 'Avevi'],
    'Akatsi South': ['Agormor', 'Akatsi', 'Asafotsi', 'Atidzive', 'Avenorpedo'],
    'Anloga': ['Anloga', 'Keta'],
    'Central Tongu': ['Adidome', 'Adaklu Ahunda'],
    'Ho Municipal': ['Abutia Agove', 'Abutia Kloe', 'Ho', 'Akoefe', 'Akrofu'],
    'Ho West': ['Ho West', 'Dzolokpuita'],
    'Hohoe Municipal': ['Akpafu Adorkor', 'Akpafu Mempeasem', 'Alavanyo', 'Fodome Ahor', 'Hohoe'],
    'Keta Municipal': ['Abor', 'Afife', 'Agbledome', 'Alakple', 'Angloga'],
    'Ketu North': ['Devego', 'Dzodze', 'Ehie', 'Penyi', 'Tadzewu'],
    'Ketu South': ['Adina', 'Aflao', 'Agavedzi', 'Agbozume', 'Denu'],
    'Kpando Municipal': ['Agbenorhoe', 'Anfoega', 'Aveme Beme', 'Aveme Danyigba', 'Kpando'],
    'North Dayi': ['Kpeve', 'North Dayi'],
    'North Tongu': ['Adidome', 'Avedo', 'Battor', 'Dofor Adidome', 'Fodzoku'],
    'South Dayi': ['Adzokoe', 'Anum', 'Asikuma', 'Boso', 'Dzakeh'],
    'South Tongu': ['Adutor', 'Agbakope', 'Agorta', 'Asidowui', 'Sogakope']
  },
  'Western': {
    'Ahanta West Municipal': ['Abura', 'Agona Nkwanta', 'Apowa', 'Asemasa', 'Dixcove'],
    'Effia Kwesimintsim Municipal': ['Airport Ridge', 'Apremdo', 'Kwesimintsim'],
    'Ellembelle': ['Ellembelle', 'Eikwe', 'Nkroful'],
    'Jomoro': ['Bonyere', 'Ekabeku', 'Ellubo', 'Half Assini'],
    'Mpohor': ['Adansi', 'Adum Bamso', 'Mpohor'],
    'Nzema East': ['Aiyinase', 'Asasetre', 'Awiebo', 'Axim', 'Bamiankor'],
    'Prestea/Huni Valley': ['Aboso', 'Asompa', 'Awudua', 'Bogoso', 'Prestea'],
    'Sekondi Takoradi Metropolis': ['Adiembra', 'Anaji', 'Sekondi', 'Takoradi'],
    'Shama': ['Aboadze', 'Daboase', 'Dompim', 'Inchaban', 'Shama'],
    'Tarkwa Nsuaem': ['Abontiakoon', 'Aboso Road', 'Akyempim', 'Bankyim', 'Tarkwa'],
    'Wassa Amenfi Central': ['Manso Amenfi', 'Wassa Amenfi Central'],
    'Wassa Amenfi East': ['Asankragwa', 'Bawdie', 'Dawurampong', 'Wassa Akropong'],
    'Wassa Amenfi West': ['Adjakaa Manso', 'Agona Amenfi', 'Asankragua'],
    'Wassa East': ['Atobiase', 'Enyinabrim', 'Hemang', 'Sekyere Krobo']
  },
  'Western North': {
    'Aowin': ['Achimfo', 'Acquai Allah', 'Adjoum', 'Amonie', 'Enchi'],
    'Bia East': ['Adabokrom', 'Adiema', 'Adumkrom', 'Ahimakrom', 'Alhajikrom'],
    'Bia West': ['Akaatiso', 'Amoakrom', 'Asuonta', 'Brebre', 'Debiso'],
    'Bibiani-Anhwiaso-Bekwai Municipal': ['Anhwiaso', 'Bibiani', 'Asempaneye', 'Awaso'],
    'Bodi': ['Ahinbenso', 'Amoaya', 'Bodi', 'Juabeso', 'Mamudukrom'],
    'Juaboso': ['Anhwiafutu', 'Boinzan', 'Bonsu Nkwanta', 'Juaboso'],
    'Sefwi Akontombra': ['Akontombra', 'Asantekrom', 'Nsawora', 'Nsawura', 'Wiawso'],
    'Sefwi-Wiawso': ['Ackaakrom', 'Anyinabrim', 'Asafo', 'Asawinso', 'Sefwi Wiawso'],
    'Suaman': ['Akontombra Nkwanta', 'Dadieso', 'Gyatokrom', 'Helehele', 'Kwesikrom']
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
