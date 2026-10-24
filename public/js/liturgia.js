// =============================================================
    // LITURGICZNY KALENDARZ I KOLORY SZAT
    // =============================================================
    var KOLORY_LITURGICZNE = {
      zielony: {
        nazwa: 'ZIELONY',
        hex: '#10b981',
        bg: 'linear-gradient(135deg, #10b981, #047857)',
        border: '#10b981',
        glow: 'rgba(16, 185, 129, 0.25)',
        tekstKolor: '#10b981'
      },
      bialy: {
        nazwa: 'BIAŁY / ZŁOTY',
        hex: '#eab308',
        bg: 'linear-gradient(135deg, #fef08a, #ca8a04)',
        border: '#eab308',
        glow: 'rgba(234, 179, 8, 0.25)',
        tekstKolor: '#facc15'
      },
      czerwony: {
        nazwa: 'CZERWONY',
        hex: '#ef4444',
        bg: 'linear-gradient(135deg, #ef4444, #b91c1c)',
        border: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.25)',
        tekstKolor: '#f87171'
      },
      fioletowy: {
        nazwa: 'FIOLETOWY',
        hex: '#a855f7',
        bg: 'linear-gradient(135deg, #a855f7, #7e22ce)',
        border: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.25)',
        tekstKolor: '#c084fc'
      },
      rozowy: {
        nazwa: 'RÓŻOWY',
        hex: '#ec4899',
        bg: 'linear-gradient(135deg, #f472b6, #db2777)',
        border: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.25)',
        tekstKolor: '#f472b6'
      },
      czarny: {
        nazwa: 'CZARNY',
        hex: '#71717a',
        bg: 'linear-gradient(135deg, #3f3f46, #18181b)',
        border: '#71717a',
        glow: 'rgba(113, 113, 122, 0.25)',
        tekstKolor: '#a1a1aa'
      }
    };

    var liturgiaOverrideFirestore = null;

    var STALE_SWIETA_LITURGIA = {
      // STYCZEŃ
      '01-01': { nazwa: 'Uroczystość Świętej Bożej Rodzicielki Maryi', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość nakazana. Szaty białe lub złote. Przygotuj kadzidło i dzwonki.' },
      '01-02': { nazwa: 'Wspomnienie św. Bazylego Wielkiego i Grzegorza z Nazjanzu', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Doktorzy Kościoła. Szaty białe.' },
      '01-06': { nazwa: 'Uroczystość Objawienia Pańskiego (Trzech Króli)', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość nakazana. Szaty białe lub złote. Przygotuj kadzidło, kredę i dzwonki.' },
      '01-17': { nazwa: 'Wspomnienie św. Antoniego, opata', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '01-19': { nazwa: 'Wspomnienie św. Józefa Sebastiana Pelczara, bpa', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '01-21': { nazwa: 'Wspomnienie św. Agnieszki, dziewicy i męczennicy', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennica. Szaty CZERWONE.' },
      '01-24': { nazwa: 'Wspomnienie św. Franciszka Salezego, bpa i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '01-25': { nazwa: 'Święto Nawrócenia św. Pawła, Apostoła', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Święto Apostoła (wyjątkowo szaty białe z racji Nawrócenia).' },
      '01-26': { nazwa: 'Wspomnienie św. Tymoteusza i Tytusa, biskupów', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '01-28': { nazwa: 'Wspomnienie św. Tomasza z Akwinu, dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Doktor Anielski. Szaty białe.' },
      '01-31': { nazwa: 'Wspomnienie św. Jana Bosko, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Patron młodzieży i ministrantów. Szaty białe.' },

      // LUTY
      '02-02': { nazwa: 'Święto Ofiarowania Pańskiego (Matki Bożej Gromnicznej)', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Szaty białe. Poświęcenie świec (gromnic), uroczysta procesja na wejście.' },
      '02-05': { nazwa: 'Wspomnienie św. Agaty, dziewicy i męczennicy', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennica. Szaty CZERWONE. Tradycyjne poświęcenie chleba i wody.' },
      '02-06': { nazwa: 'Wspomnienie św. Pawła Miki i Towarzyszy, męczenników', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennicy z Japonii. Szaty CZERWONE.' },
      '02-10': { nazwa: 'Wspomnienie św. Scholastyki, dziewicy', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '02-11': { nazwa: 'Wspomnienie NMP z Lourdes (Światowy Dzień Chorego)', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe. Modlitwa i namaszczenie chorych.' },
      '02-14': { nazwa: 'Święto św. Cyryla i Metodego, patronów Europy', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Apostołowie Słowian, Patroni Europy. Szaty białe.' },
      '02-22': { nazwa: 'Święto Katedry św. Piotra, Apostoła', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Szaty białe.' },
      '02-23': { nazwa: 'Wspomnienie św. Polikarpa, bpa i męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik. Szaty CZERWONE.' },

      // MARZEC
      '03-04': { nazwa: 'Święto św. Kazimierza, królewicza', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Patron młodzieży i Polski/Litwy. Szaty białe.' },
      '03-07': { nazwa: 'Wspomnienie św. Perpetuy i Felicyty, męczennic', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennice. Szaty CZERWONE.' },
      '03-08': { nazwa: 'Wspomnienie św. Jana Bożego, zakonnika', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '03-19': { nazwa: 'Uroczystość św. Józefa, Oblubieńca NMP', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość. Szaty białe lub złote. Główny Patron naszej parafii!' },
      '03-25': { nazwa: 'Uroczystość Zwiastowania Pańskiego', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość Pańska. Szaty białe. Dzień Świętości Życia.' },

      // KWIECIEŃ
      '04-23': { nazwa: 'Uroczystość św. Wojciecha, bpa i męcz., Głównego Patrona Polski', kolor: 'czerwony', ranga: 'Uroczystość', wskazowka: 'Główny Patron Polski. Szaty CZERWONE (męczeństwo). Pelerynki czerwone.' },
      '04-25': { nazwa: 'Święto św. Marka, Ewangelisty', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Święto Apostoła/Ewangelisty. Szaty CZERWONE.' },
      '04-29': { nazwa: 'Święto św. Katarzyny ze Sieny, patronki Europy', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Doktor Kościoła, Patronka Europy. Szaty białe.' },

      // MAJ
      '05-02': { nazwa: 'Wspomnienie św. Atanazego, bpa i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '05-03': { nazwa: 'Uroczystość NMP Królowej Polski, Głównej Patronki Polski', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość narodowa i kościelna. Szaty białe/złote. Pełna asysta liturgiczna.' },
      '05-04': { nazwa: 'Wspomnienie św. Floriana, męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Patron strażaków i Krakowa. Szaty CZERWONE.' },
      '05-06': { nazwa: 'Święto św. Apostołów Filipa i Jakuba', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostołowie. Szaty CZERWONE.' },
      '05-08': { nazwa: 'Uroczystość św. Stanisława, bpa i męcz., Głównego Patrona Polski', kolor: 'czerwony', ranga: 'Uroczystość', wskazowka: 'Główny Patron Polski. Szaty CZERWONE. Uroczysta asysta.' },
      '05-14': { nazwa: 'Święto św. Macieja, Apostoła', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostoł. Szaty CZERWONE.' },
      '05-16': { nazwa: 'Święto św. Andrzeja Boboli, prezbitera i męcz., Patrona Polski', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Patron Polski i jedności. Szaty CZERWONE.' },
      '05-24': { nazwa: 'Wspomnienie NMP Wspomożycielki Wiernych', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '05-26': { nazwa: 'Wspomnienie św. Filipa Neri, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '05-29': { nazwa: 'Wspomnienie św. Urszuli Ledóchowskiej, dziewicy', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '05-31': { nazwa: 'Święto Nawiedzenia NMP', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Święto Maryjne. Szaty białe.' },

      // CZERWIEC
      '06-01': { nazwa: 'Wspomnienie św. Justyna, męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik. Szaty CZERWONE.' },
      '06-03': { nazwa: 'Wspomnienie św. Karola Lwangi i Towarzyszy, męczenników', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennicy z Ugandy. Szaty CZERWONE.' },
      '06-05': { nazwa: 'Wspomnienie św. Bonifacego, bpa i męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Apostoł Niemiec, męczennik. Szaty CZERWONE.' },
      '06-11': { nazwa: 'Wspomnienie św. Barnaby, Apostoła', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Apostoł. Szaty CZERWONE.' },
      '06-13': { nazwa: 'Wspomnienie św. Antoniego z Padwy, prezb. i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe. Poświęcenie lilii.' },
      '06-17': { nazwa: 'Wspomnienie św. Alberta Chmielowskiego, zakonnika', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Brat Albert. Szaty białe.' },
      '06-21': { nazwa: 'Wspomnienie św. Alojzego Gonzagi, zakonnika', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Patron młodzieży i ministrantów. Szaty białe.' },
      '06-24': { nazwa: 'Uroczystość Narodzenia św. Jana Chrzciciela', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość. Szaty białe lub złote.' },
      '06-28': { nazwa: 'Wspomnienie św. Ireneusza, bpa i męcz., dK', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik i Doktor Kościoła. Szaty CZERWONE.' },
      '06-29': { nazwa: 'Uroczystość Świętych Apostołów Piotra i Pawła', kolor: 'czerwony', ranga: 'Uroczystość', wskazowka: 'Apostołowie i Męczennicy. Szaty CZERWONE. Taca na Stolicę Apostolską (świętopietrze).' },

      // LIPIEC
      '07-03': { nazwa: 'Święto św. Tomasza, Apostoła', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostoł. Szaty CZERWONE.' },
      '07-06': { nazwa: 'Wspomnienie bł. Marii Teresy Ledóchowskiej', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Matka Afryki. Szaty białe.' },
      '07-08': { nazwa: 'Wspomnienie św. Jana z Dukli, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '07-11': { nazwa: 'Święto św. Benedykta, opata, patrona Europy', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Ojciec mnichów zachodnich, Patron Europy. Szaty białe.' },
      '07-12': { nazwa: 'Wspomnienie św. Brunona Bonifacego z Kwerfurtu, bpa i męcz.', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik. Szaty CZERWONE.' },
      '07-15': { nazwa: 'Wspomnienie św. Bonawentury, bpa i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '07-16': { nazwa: 'Wspomnienie NMP z Góry Karmel (Szkaplerznej)', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe. Nakładanie szkaplerza świętego.' },
      '07-22': { nazwa: 'Święto św. Marii Magdaleny', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Apostołka Apostołów. Szaty białe.' },
      '07-23': { nazwa: 'Święto św. Brygidy, patronki Europy', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Patronka Europy. Szaty białe.' },
      '07-25': { nazwa: 'Święto św. Jakuba, Apostoła', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostoł. Szaty CZERWONE. Wspomnienie św. Krzysztofa i błogosławieństwo kierowców.' },
      '07-26': { nazwa: 'Wspomnienie św. Joachima i Anny, rodziców NMP', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Dzień Dziadków. Szaty białe.' },
      '07-29': { nazwa: 'Wspomnienie św. Marty, Marii i Łazarza', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Przyjaciele Pana Jezusa. Szaty białe.' },
      '07-31': { nazwa: 'Wspomnienie św. Ignacego z Loyoli, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Założyciel jezuitów. Szaty białe.' },

      // SIERPIEŃ
      '08-01': { nazwa: 'Wspomnienie św. Alfonsa Marii de Liguori, bpa i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '08-06': { nazwa: 'Święto Przemienienia Pańskiego', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Święto Pańskie na Górze Tabor. Szaty białe lub złote.' },
      '08-08': { nazwa: 'Wspomnienie św. Dominika, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Założyciel dominikanów. Szaty białe.' },
      '08-09': { nazwa: 'Święto św. Teresy Benedykty od Krzyża (Edyty Stein), męcz.', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Męczennica i patronka Europy. Szaty CZERWONE.' },
      '08-10': { nazwa: 'Święto św. Wawrzyńca, diakona i męczennika', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Diakon i męczennik. Szaty CZERWONE. Pelerynki czerwone.' },
      '08-11': { nazwa: 'Wspomnienie św. Klary, dziewicy', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '08-14': { nazwa: 'Wspomnienie św. Maksymiliana Marii Kolbego, męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik miłości w Auschwitz. Szaty CZERWONE. Pelerynki czerwone.' },
      '08-15': { nazwa: 'Uroczystość Wniebowzięcia NMP (Matki Bożej Zielnej)', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość nakazana. Szaty białe lub złote. Poświęcenie ziół i kwiatów.' },
      '08-17': { nazwa: 'Wspomnienie św. Jacka, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Główny Patron Metropolii Krakowskiej. Szaty białe.' },
      '08-20': { nazwa: 'Wspomnienie św. Bernarda, opata i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '08-21': { nazwa: 'Wspomnienie św. Piusa X, papieża', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Papież wczesnej Komunii św. Szaty białe.' },
      '08-22': { nazwa: 'Wspomnienie NMP Królowej', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '08-24': { nazwa: 'Święto św. Bartłomieja, Apostoła', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostoł. Szaty CZERWONE.' },
      '08-26': { nazwa: 'Uroczystość NMP Częstochowskiej', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość w Polsce. Szaty białe lub złote. Jasnogórska Pani.' },
      '08-27': { nazwa: 'Wspomnienie św. Moniki', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Matka św. Augustyna. Szaty białe.' },
      '08-28': { nazwa: 'Wspomnienie św. Augustyna, bpa i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '08-29': { nazwa: 'Wspomnienie Męczeństwa św. Jana Chrzciciela', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Ścięcie Jana Chrzciciela. Szaty CZERWONE.' },

      // WRZESIEŃ
      '09-03': { nazwa: 'Wspomnienie św. Grzegorza Wielkiego, papieża i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '09-08': { nazwa: 'Święto Narodzenia NMP (Matki Bożej Siewnej)', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Święto Maryjne. Szaty białe. Poświęcenie ziarna siewnego.' },
      '09-12': { nazwa: 'Wspomnienie Najświętszego Imienia Maryi', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Wiktoria Wiedeńska Jana III Sobieskiego. Szaty białe.' },
      '09-13': { nazwa: 'Wspomnienie św. Jana Chryzostoma, bpa i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Jan Złotousty. Szaty białe.' },
      '09-14': { nazwa: 'Święto Podwyższenia Krzyża Świętego', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Święto Pańskie Krzyża. Szaty CZERWONE. Pelerynki czerwone.' },
      '09-15': { nazwa: 'Wspomnienie NMP Bolesnej', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '09-16': { nazwa: 'Wspomnienie św. Korneliusza i Cypriana, męczenników', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennicy. Szaty CZERWONE.' },
      '09-18': { nazwa: 'Święto św. Stanisława Kostki, patrona Polski i młodzieży', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Główny Patron ministrantów i młodzieży! Szaty białe.' },
      '09-20': { nazwa: 'Wspomnienie św. Andrzeja Kim Taegon i Towarzyszy, męczenników', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennicy koreańscy. Szaty CZERWONE.' },
      '09-21': { nazwa: 'Święto św. Mateusza, Apostoła i Ewangelisty', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostoł i Ewangelista. Szaty CZERWONE.' },
      '09-23': { nazwa: 'Wspomnienie św. Pio z Pietrelciny (Ojca Pio), prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Ojciec Pio, stygmatyk. Szaty białe.' },
      '09-27': { nazwa: 'Wspomnienie św. Wincentego a Paulo, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '09-28': { nazwa: 'Wspomnienie św. Wacława, męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik, Patron Czech. Szaty CZERWONE.' },
      '09-29': { nazwa: 'Święto Świętych Archaniołów Michała, Gabriela i Rafała', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Święci Archaniołowie. Szaty białe.' },
      '09-30': { nazwa: 'Wspomnienie św. Hieronima, prezbitera i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Tłumacz Wulgaty. Szaty białe.' },

      // PAŹDZIERNIK
      '10-01': { nazwa: 'Wspomnienie św. Teresy od Dzieciątka Jezus, dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Mała Teresa, Patronka Misji. Szaty białe.' },
      '10-02': { nazwa: 'Wspomnienie Świętych Aniołów Stróżów', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Aniołowie Stróżowie. Szaty białe.' },
      '10-04': { nazwa: 'Wspomnienie św. Franciszka z Asyżu', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Biedaczyna z Asyżu. Szaty białe.' },
      '10-05': { nazwa: 'Wspomnienie św. Faustyny Kowalskiej, dziewicy', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Apostołka Bożego Miłosierdzia. Szaty białe.' },
      '10-07': { nazwa: 'Wspomnienie NMP Różańcowej', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Miesiąc różańcowy. Szaty białe. Nabożeństwo różańcowe.' },
      '10-13': { nazwa: 'Wspomnienie bł. Honorata Koźmińskiego / Nabożeństwo fatimskie', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Wspomnienie liturgiczne. Szaty CZERWONE (lub białe). Kościelny przygotowuje ornat czerwony i pelerynki.' },
      '10-15': { nazwa: 'Wspomnienie św. Teresy od Jezusa (z Avila), dz. i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Wielka Teresa, Reformatorka Karmelu. Szaty białe.' },
      '10-16': { nazwa: 'Święto św. Jadwigi Śląskiej', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Patronka Polski i Śląska. Szaty białe.' },
      '10-17': { nazwa: 'Wspomnienie św. Ignacego Antiocheńskiego, bpa i męcz.', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik pierwszych wieków. Szaty CZERWONE.' },
      '10-18': { nazwa: 'Święto św. Łukasza, Ewangelisty', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Ewangelista. Szaty CZERWONE. Dzień Służby Zdrowia.' },
      '10-19': { nazwa: 'Wspomnienie bł. Jerzego Popiełuszki, prezbitera i męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik prawdy i wolności w Polsce. Szaty CZERWONE.' },
      '10-20': { nazwa: 'Wspomnienie św. Jana Kantego, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Patron profesorów i studentów. Szaty białe.' },
      '10-22': { nazwa: 'Wspomnienie św. Jana Pawła II, papieża', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Święty Papież Polak! Szaty białe.' },
      '10-28': { nazwa: 'Święto Świętych Apostołów Szymona i Judy Tadeusza', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostołowie. Szaty CZERWONE.' },

      // LISTOPAD
      '11-01': { nazwa: 'Uroczystość Wszystkich Świętych', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość nakazana. Szaty białe lub złote. Procesja na cmentarz.' },
      '11-02': { nazwa: 'Wspomnienie Wszystkich Wiernych Zmarłych (Dzień Zaduszny)', kolor: 'fioletowy', ranga: 'Wspomnienie', wskazowka: 'Szaty fioletowe lub czarne. Procesja za zmarłych, wypominki.' },
      '11-04': { nazwa: 'Wspomnienie św. Karola Boromeusza, bpa', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Patron Karola Wojtyły. Szaty białe.' },
      '11-09': { nazwa: 'Święto Rocznicy Poświęcenia Bazyliki Laterańskiej', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Matka i Głowa kościołów świata. Szaty białe.' },
      '11-10': { nazwa: 'Wspomnienie św. Leona Wielkiego, papieża i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '11-11': { nazwa: 'Wspomnienie św. Marcina z Tours / Narodowe Święto Niepodległości', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe. Uroczysta modlitwa w intencji Ojczyzny.' },
      '11-12': { nazwa: 'Wspomnienie św. Jozafata, bpa i męczennika', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennik jedności Kościoła. Szaty CZERWONE.' },
      '11-17': { nazwa: 'Wspomnienie św. Elżbiety Węgierskiej, zakonnicy', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Patronka dzieł miłosierdzia. Szaty białe.' },
      '11-18': { nazwa: 'Wspomnienie bł. Karoliny Kózkówny, dziewicy i męczennicy', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Patronka KSM i polskiej młodzieży. Szaty CZERWONE.' },
      '11-20': { nazwa: 'Wspomnienie św. Rafała Kalinowskiego, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Karmelita bosy, powstaniec styczniowy. Szaty białe.' },
      '11-21': { nazwa: 'Wspomnienie Ofiarowania NMP', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '11-22': { nazwa: 'Wspomnienie św. Cecylii, dziewicy i męczennicy', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Patronka muzyki kościelnej, organistów i chórów. Szaty CZERWONE.' },
      '11-24': { nazwa: 'Wspomnienie św. Andrzeja Dung-Lac i Towarzyszy, męczenników', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennicy wietnamscy. Szaty CZERWONE.' },
      '11-30': { nazwa: 'Święto św. Andrzeja, Apostoła', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Apostoł. Szaty CZERWONE.' },

      // GRUDZIEŃ
      '12-03': { nazwa: 'Wspomnienie św. Franciszka Ksawerego, prezbitera', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Patron misji katolickich. Szaty białe.' },
      '12-04': { nazwa: 'Wspomnienie św. Barbary, dziewicy i męczennicy', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Patronka górników i dobrej śmierci. Szaty CZERWONE.' },
      '12-06': { nazwa: 'Wspomnienie św. Mikołaja, biskupa', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Biskup z Miry. Szaty białe.' },
      '12-07': { nazwa: 'Wspomnienie św. Ambrożego, bpa i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Doktor Kościoła. Szaty białe.' },
      '12-08': { nazwa: 'Uroczystość Niepokalanego Poczęcia NMP', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość Maryjna. Szaty białe lub biało-niebieskie/złote.' },
      '12-13': { nazwa: 'Wspomnienie św. Łucji, dziewicy i męczennicy', kolor: 'czerwony', ranga: 'Wspomnienie', wskazowka: 'Męczennica. Szaty CZERWONE.' },
      '12-14': { nazwa: 'Wspomnienie św. Jana od Krzyża, prezb. i dK', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' },
      '12-25': { nazwa: 'Uroczystość Narodzenia Pańskiego (Boże Narodzenie)', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość nakazana. Szaty białe lub złote. Pełna asysta, kadzidło i dzwonki.' },
      '12-26': { nazwa: 'Święto św. Szczepana, pierwszego męczennika', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Drugi dzień świąt: Pierwszy Męczennik! Szaty CZERWONE. Pelerynki czerwone.' },
      '12-27': { nazwa: 'Święto św. Jana, Apostoła i Ewangelisty', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Szaty białe. Tradycyjne błogosławieństwo wina po Mszy św.' },
      '12-28': { nazwa: 'Święto Świętych Młodzianków, męczenników', kolor: 'czerwony', ranga: 'Święto', wskazowka: 'Niewinni Męczennicy z Betlejem. Szaty CZERWONE.' }
    };

    var LIT_DNI_TYGODNIA = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    var LIT_DNI_SKROTY = ['Nd', 'Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    var LIT_MIESIACE_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    var LIT_RZYMSKIE = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV'];

    function litAddDays(d, n) {
      var res = new Date(d.getTime());
      res.setDate(res.getDate() + n);
      return res;
    }

    function litDiffDays(d1, d2) {
      var t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
      var t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
      return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
    }

    function litSameDay(d1, d2) {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    }

    function wyznaczWielkanoc(rok) {
      var a = rok % 19;
      var b = Math.floor(rok / 100);
      var c = rok % 100;
      var d = Math.floor(b / 4);
      var e = b % 4;
      var f = Math.floor((b + 8) / 25);
      var g = Math.floor((b - f + 1) / 3);
      var h = (19 * a + b - d - g + 15) % 30;
      var i = Math.floor(c / 4);
      var k = c % 4;
      var l = (32 + 2 * e + 2 * i - h - k) % 7;
      var m = Math.floor((a + 11 * h + 22 * l) / 451);
      var miesiac = Math.floor((h + l - 7 * m + 114) / 31);
      var dzien = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(rok, miesiac - 1, dzien, 12, 0, 0);
    }

    function wyznaczAdwentStart(rok) {
      var bNar = new Date(rok, 11, 25, 12, 0, 0);
      var dayOfWeek = bNar.getDay();
      var daysTo4thSun = (dayOfWeek === 0) ? 7 : dayOfWeek;
      var niedz4 = litAddDays(bNar, -daysTo4thSun);
      return litAddDays(niedz4, -21);
    }

    function wyznaczChrzestPanski(rok) {
      var trzechKroli = new Date(rok, 0, 6, 12, 0, 0);
      var day = trzechKroli.getDay();
      var daysToSun = (7 - day) % 7;
      if (daysToSun === 0) daysToSun = 7;
      return litAddDays(trzechKroli, daysToSun);
    }

    function wyznaczDaneLiturgiczne(date) {
      var d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      var rok = d.getFullYear();
      var dayOfWeek = d.getDay();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      var kluczStale = mm + '-' + dd;

      var easter = wyznaczWielkanoc(rok);
      var offsetEaster = litDiffDays(d, easter);
      var adventStart = wyznaczAdwentStart(rok);
      var chrzest = wyznaczChrzestPanski(rok);
      var bozeNarodzenie = new Date(rok, 11, 25, 12, 0, 0);

      // 1. Ruchome uroczystości i święta cyklu paschalnego
      if (offsetEaster === -46) {
        return { nazwa: 'Środa Popielcowa', okres: 'Wielki Post', kolor: 'fioletowy', ranga: 'Wielki Post', wskazowka: 'Początek Wielkiego Postu. Szaty fioletowe. Obrzęd posypania głów popiołem.' };
      }
      if (offsetEaster === -21 && dayOfWeek === 0) {
        return { nazwa: 'IV Niedziela Wielkiego Postu (Laetare)', okres: 'Wielki Post', kolor: 'rozowy', ranga: 'Niedziela', wskazowka: 'Niedziela radości w Wielkim Poście. Szaty RÓŻOWE (lub fioletowe).' };
      }
      if (offsetEaster === -7) {
        return { nazwa: 'Niedziela Palmowa (Męki Pańskiej)', okres: 'Wielki Post', kolor: 'czerwony', ranga: 'Wielki Tydzień', wskazowka: 'Szaty CZERWONE. Procesja z palmami, uroczyste czytanie Męki Pańskiej.' };
      }
      if (offsetEaster === -3) {
        return { nazwa: 'Wielki Czwartek (Msza Wieczerzy Pańskiej)', okres: 'Triduum Paschalne', kolor: 'bialy', ranga: 'Triduum Paschalne', wskazowka: 'Święto kapłanów i ministrantów! Szaty białe/złote. Przeniesienie Najświętszego Sakramentu do Ciemnicy.' };
      }
      if (offsetEaster === -2) {
        return { nazwa: 'Wielki Piątek Męki Pańskiej', okres: 'Triduum Paschalne', kolor: 'czerwony', ranga: 'Triduum Paschalne', wskazowka: 'Liturgia Męki Pańskiej. Szaty CZERWONE. Adoracja Krzyża, kołatki zamiast dzwonków.' };
      }
      if (offsetEaster === -1) {
        return { nazwa: 'Wielka Sobota (Wigilia Paschalna)', okres: 'Triduum Paschalne', kolor: 'bialy', ranga: 'Triduum Paschalne', wskazowka: 'Matka wszystkich wigilii. Szaty białe/złote. Poświęcenie ognia, Paschał, radosne Alleluja.' };
      }
      if (offsetEaster === 0) {
        return { nazwa: 'Niedziela Zmartwychwstania Pańskiego', okres: 'Okres Wielkanocny', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Największa uroczystość chrześcijańska! Szaty białe lub złote. Procesja rezurekcyjna.' };
      }
      if (offsetEaster >= 1 && offsetEaster <= 7) {
        if (offsetEaster === 1) return { nazwa: 'Poniedziałek Wielkanocny', okres: 'Oktawa Wielkanocy', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Oktawa Wielkanocy. Szaty białe lub złote.' };
        if (offsetEaster === 7) return { nazwa: 'II Niedziela Wielkanocna (Miłosierdzia Bożego)', okres: 'Okres Wielkanocny', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Święto Miłosierdzia Bożego. Szaty białe lub złote.' };
        return { nazwa: LIT_DNI_TYGODNIA[dayOfWeek] + ' w Oktawie Wielkanocy', okres: 'Oktawa Wielkanocy', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Oktawa Wielkanocy. Szaty białe.' };
      }
      if (offsetEaster === 42 && dayOfWeek === 0) {
        return { nazwa: 'Uroczystość Wniebowstąpienia Pańskiego', okres: 'Okres Wielkanocny', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość Pańska. Szaty białe lub złote.' };
      }
      if (offsetEaster === 49) {
        return { nazwa: 'Uroczystość Zesłania Ducha Świętego (Zielone Świątki)', okres: 'Okres Wielkanocny', kolor: 'czerwony', ranga: 'Uroczystość', wskazowka: 'Szaty CZERWONE (ogień Ducha Świętego). Kończy Okres Wielkanocny. Pelerynki czerwone.' };
      }
      if (offsetEaster === 50) {
        return { nazwa: 'Święto NMP Matki Kościoła', okres: 'Okres Zwykły', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Święto w Polsce po Zesłaniu Ducha Świętego. Szaty białe.' };
      }
      if (offsetEaster === 53) {
        return { nazwa: 'Święto Jezusa Chrystusa Najwyższego i Wiecznego Kapłana', okres: 'Okres Zwykły', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Szaty białe.' };
      }
      if (offsetEaster === 56) {
        return { nazwa: 'Uroczystość Najświętszej Trójcy', okres: 'Okres Zwykły', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość Pańska. Szaty białe lub złote.' };
      }
      if (offsetEaster === 60) {
        return { nazwa: 'Uroczystość Najświętszego Ciała i Krwi Chrystusa (Boże Ciało)', okres: 'Okres Zwykły', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość nakazana. Szaty białe/złote. Wielka procesja eucharystyczna do 4 ołtarzy.' };
      }
      if (offsetEaster === 68) {
        return { nazwa: 'Uroczystość Najświętszego Serca Pana Jezusa', okres: 'Okres Zwykły', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość. Szaty białe.' };
      }
      if (offsetEaster === 69) {
        return { nazwa: 'Wspomnienie Niepokalanego Serca NMP', okres: 'Okres Zwykły', kolor: 'bialy', ranga: 'Wspomnienie', wskazowka: 'Szaty białe.' };
      }

      // 2. Niedziela Chrystusa Króla (ostatnia niedziela przed Adwentem)
      var niedzielaKrola = litAddDays(adventStart, -7);
      if (litSameDay(d, niedzielaKrola)) {
        return { nazwa: 'Uroczystość Jezusa Chrystusa Króla Wszechświata', okres: 'Okres Zwykły', kolor: 'bialy', ranga: 'Uroczystość', wskazowka: 'Uroczystość Pańska kończąca rok liturgiczny. Szaty białe lub złote.' };
      }

      // 3. Sprawdź stałe uroczystości, święta i wspomnienia
      var stale = STALE_SWIETA_LITURGIA[kluczStale];
      if (stale) {
        var czyWyzszaNiedziela = false;
        if (dayOfWeek === 0) {
          // W niedziele Adwentu, Wielkiego Postu i Wielkanocy tylko Uroczystość może ustąpić lub nie
          if ((d >= adventStart && d < bozeNarodzenie) || (offsetEaster >= -46 && offsetEaster <= 49)) {
            if (stale.ranga !== 'Uroczystość') czyWyzszaNiedziela = true;
          } else {
            // W Niedziele Zwykłe Uroczystości i Święta Pańskie wypierają niedzielę, wspomnienia ustępują niedzieli
            if (stale.ranga === 'Wspomnienie') czyWyzszaNiedziela = true;
          }
        }
        if (!czyWyzszaNiedziela) {
          return {
            nazwa: stale.nazwa,
            okres: stale.ranga === 'Uroczystość' ? 'Uroczystość' : (stale.ranga === 'Święto' ? 'Święto' : 'Wspomnienie'),
            kolor: stale.kolor,
            ranga: stale.ranga,
            wskazowka: stale.wskazowka
          };
        }
      }

      // 4. Okres Wielkiego Postu
      if (offsetEaster > -46 && offsetEaster < 0) {
        var tydzWP = Math.floor((offsetEaster + 46) / 7) + 1;
        var nrTydzStr = LIT_RZYMSKIE[tydzWP] || tydzWP;
        if (dayOfWeek === 0) {
          return { nazwa: nrTydzStr + ' Niedziela Wielkiego Postu', okres: 'Wielki Post', kolor: 'fioletowy', ranga: 'Niedziela', wskazowka: 'Szaty fioletowe. Gorzkie Żale, brak radosnego Gloria i Alleluja.' };
        }
        return { nazwa: LIT_DNI_TYGODNIA[dayOfWeek] + ', ' + nrTydzStr + ' Tydzień Wielkiego Postu', okres: 'Wielki Post', kolor: 'fioletowy', ranga: 'Dzień powszedni', wskazowka: 'Wielki Post. Szaty fioletowe. Czas pokuty i modlitwy.' };
      }

      // 5. Okres Wielkanocny
      if (offsetEaster > 0 && offsetEaster < 49) {
        var tydzWlk = Math.floor(offsetEaster / 7) + 1;
        var nrTydzWlkStr = LIT_RZYMSKIE[tydzWlk] || tydzWlk;
        if (dayOfWeek === 0) {
          return { nazwa: nrTydzWlkStr + ' Niedziela Wielkanocna', okres: 'Okres Wielkanocny', kolor: 'bialy', ranga: 'Niedziela', wskazowka: 'Okres Wielkanocny. Radosne Alleluja, szaty białe lub złote.' };
        }
        return { nazwa: LIT_DNI_TYGODNIA[dayOfWeek] + ', ' + nrTydzWlkStr + ' Tydzień Wielkanocny', okres: 'Okres Wielkanocny', kolor: 'bialy', ranga: 'Dzień powszedni', wskazowka: 'Okres Wielkanocny. Szaty białe. Paschał przy ołtarzu.' };
      }

      // 6. Okres Adwentu
      if (d >= adventStart && d < bozeNarodzenie) {
        var dniOdAdw = litDiffDays(d, adventStart);
        var tydzAdw = Math.floor(dniOdAdw / 7) + 1;
        var nrTydzAdwStr = LIT_RZYMSKIE[tydzAdw] || tydzAdw;
        if (tydzAdw === 3 && dayOfWeek === 0) {
          return { nazwa: 'III Niedziela Adwentu (Gaudete)', okres: 'Adwent', kolor: 'rozowy', ranga: 'Niedziela', wskazowka: 'Niedziela radości! Szaty RÓŻOWE (lub fioletowe). Roraty, wieniec adwentowy.' };
        }
        if (dayOfWeek === 0) {
          return { nazwa: nrTydzAdwStr + ' Niedziela Adwentu', okres: 'Adwent', kolor: 'fioletowy', ranga: 'Niedziela', wskazowka: 'Adwent. Szaty fioletowe. Wieniec adwentowy przy ołtarzu.' };
        }
        return { nazwa: LIT_DNI_TYGODNIA[dayOfWeek] + ', ' + nrTydzAdwStr + ' Tydzień Adwentu', okres: 'Adwent', kolor: 'fioletowy', ranga: 'Dzień powszedni', wskazowka: 'Msze roratnie o NMP (często szaty białe na samych Roratach), szaty dnia: fioletowe.' };
      }

      // 7. Okres Narodzenia Pańskiego
      if ((d.getMonth() === 11 && d.getDate() >= 25) || (d.getMonth() === 0 && d <= chrzest)) {
        if (d.getMonth() === 0 && litSameDay(d, chrzest)) {
          return { nazwa: 'Święto Chrztu Pańskiego', okres: 'Okres Narodzenia Pańskiego', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Kończy Okres Bożego Narodzenia. Szaty białe.' };
        }
        if (dayOfWeek === 0 && d.getMonth() === 11) {
          return { nazwa: 'Święto Świętej Rodziny: Jezusa, Maryi i Józefa', okres: 'Okres Narodzenia Pańskiego', kolor: 'bialy', ranga: 'Święto', wskazowka: 'Szaty białe lub złote.' };
        }
        return { nazwa: LIT_DNI_TYGODNIA[dayOfWeek] + ' w Okresie Narodzenia Pańskiego', okres: 'Okres Narodzenia Pańskiego', kolor: 'bialy', ranga: 'Dzień powszedni', wskazowka: 'Okres Bożego Narodzenia. Szaty białe lub złote. Kolędy.' };
      }

      // 8. Okres Zwykły
      var nrTygodniaZwyklego = 1;
      if (d < easter) {
        var poniedzialekPoChrzcie = litAddDays(chrzest, 1);
        var dniOdStartu = litDiffDays(d, poniedzialekPoChrzcie);
        nrTygodniaZwyklego = Math.floor(dniOdStartu / 7) + 1;
      } else {
        var dniPrzedKrolem = litDiffDays(niedzielaKrola, d);
        var tygPrzedKrolem = Math.floor((dniPrzedKrolem + (dayOfWeek === 0 ? 0 : (7 - dayOfWeek))) / 7);
        nrTygodniaZwyklego = 34 - tygPrzedKrolem;
        if (nrTygodniaZwyklego < 1) nrTygodniaZwyklego = 1;
        if (nrTygodniaZwyklego > 34) nrTygodniaZwyklego = 34;
      }

      var nrTydzZwyklyStr = LIT_RZYMSKIE[nrTygodniaZwyklego] || nrTygodniaZwyklego;
      if (dayOfWeek === 0) {
        return {
          nazwa: nrTydzZwyklyStr + ' Niedziela Zwykła',
          okres: 'Okres Zwykły',
          kolor: 'zielony',
          ranga: 'Niedziela',
          wskazowka: 'Szaty ZIELONE (zieleń to symbol nadziei i życia). Komże / alby z zielonymi pelerynkami.'
        };
      }

      return {
        nazwa: LIT_DNI_TYGODNIA[dayOfWeek] + ', ' + nrTydzZwyklyStr + ' Tydzień Zwykły',
        okres: 'Okres Zwykły',
        kolor: 'zielony',
        ranga: 'Dzień powszedni',
        wskazowka: 'Dzień powszedni w Okresie Zwykłym. Szaty ZIELONE. Komża / alba z zieloną pelerynką.'
      };
    }

    var aktualnyLiturgiaTryb = 'dzis';

    function nasluchujLiturgiiFirestore() {
      try {
        var db = (typeof window !== 'undefined' && window.dbFirestore) || (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
        if (!db) return;
        db.collection('konfiguracja').doc('liturgia_dzis')
          .onSnapshot(function(doc) {
            if (doc && doc.exists) {
              liturgiaOverrideFirestore = doc.data();
              try {
                renderujKarteLiturgii(new Date());
                aktualizujPigulkiZakrystiaLiturgia();
              } catch(eR) {}
            }
          }, function(err) {
            console.warn('Liturgia Firestore listener error:', err);
          });
      } catch(e) {
        console.warn('nasluchujLiturgiiFirestore catch:', e);
      }
    }

    function aktualizujPigulkiZakrystiaLiturgia() {}

    function renderujKarteLiturgii(dataObj) {
      if (!dataObj) dataObj = new Date();

      // W sobotę 99% ministrantów sprawdzających szaty idzie na mszę o 17:00 (niedzielna wigilia),
      // dlatego w sobotę prezentujemy szaty i formularz niedzielny (następny dzień)
      var dow = dataObj.getDay();
      var czySobota = (dow === 6);
      var dataLiturgiczna = new Date(dataObj.getTime());
      if (czySobota) {
        dataLiturgiczna.setDate(dataLiturgiczna.getDate() + 1);
      }

      var y = dataLiturgiczna.getFullYear();
      var m = String(dataLiturgiczna.getMonth() + 1).padStart(2, '0');
      var dStrPad = String(dataLiturgiczna.getDate()).padStart(2, '0');
      var dataYMD = y + '-' + m + '-' + dStrPad;

      var lit;
      if (liturgiaOverrideFirestore && liturgiaOverrideFirestore.kolor && liturgiaOverrideFirestore.data === dataYMD) {
        lit = {
          nazwa: liturgiaOverrideFirestore.nazwa || 'Wspomnienie liturgiczne',
          okres: liturgiaOverrideFirestore.okres || 'Okres Zwykły',
          kolor: liturgiaOverrideFirestore.kolor,
          ranga: liturgiaOverrideFirestore.ranga || 'Wspomnienie'
        };
      } else {
        lit = wyznaczDaneLiturgiczne(dataLiturgiczna);
      }

      var paleta = KOLORY_LITURGICZNE[lit.kolor] || KOLORY_LITURGICZNE.zielony;

      var karta = document.getElementById('karta-liturgia-dzis');
      var elNaglowek = document.getElementById('liturgia-naglowek-tekst');
      var elKolor = document.getElementById('liturgia-kolor-nazwa');
      var elTytul = document.getElementById('liturgia-tytul');
      var elOkres = document.getElementById('liturgia-okres');
      var elRanga = document.getElementById('liturgia-ranga-badge');
      var elOrb = document.getElementById('liturgia-orb');
      var elWsk = document.getElementById('liturgia-wskazowka-tekst');

      if (karta) {
        karta.style.borderLeft = '3px solid ' + paleta.border;
        karta.style.boxShadow = '0 0 20px -3px ' + paleta.glow;
      }

      if (elNaglowek) {
        elNaglowek.innerText = czySobota ? 'KOLOR SZAT LITURGICZNYCH (SOBOTA 17:00 / NIEDZIELA)' : 'KOLOR SZAT LITURGICZNYCH NA DZIŚ';
      }

      if (elKolor) {
        elKolor.innerText = paleta.nazwa;
        elKolor.style.color = paleta.tekstKolor;
      }

      if (elTytul) {
        elTytul.innerText = lit.nazwa;
      }

      if (elOkres) {
        elOkres.innerText = lit.okres;
      }

      if (elRanga) {
        elRanga.innerText = czySobota ? (lit.ranga === 'Niedziela' ? 'Niedziela' : (lit.ranga + ' (Wigilia)')) : lit.ranga;
      }

      if (elOrb) {
        elOrb.style.background = paleta.bg;
        elOrb.style.boxShadow = '0 0 16px ' + paleta.glow;
      }

      if (elWsk) {
        elWsk.innerText = lit.wskazowka || '';
      }
    }

    // Inicjalizacja nasłuchiwania w Firestore oraz wstępny render
    try {
      nasluchujLiturgiiFirestore();
    } catch(eLitSync) {}

    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          renderujKarteLiturgii(new Date(), 'dzis');
        });
      } else {
        renderujKarteLiturgii(new Date(), 'dzis');
      }
    } catch(eLitInit) {}