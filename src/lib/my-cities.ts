/**
 * Malaysian cities and towns by state (owner, 3 Nov 2026: the delivery City is a real city, and picking it fills in the State).
 * Mostly Pos Malaysia post towns, plus a few well-known Kuala Lumpur areas. States are named as in MY_STATES.
 */
export const MY_CITIES: Record<string, readonly string[]> = {
  Johor: [
    "Ayer Baloi", "Ayer Hitam", "Bandar Penawar", "Bandar Tenggara", "Batu Anam", "Batu Pahat", "Bekok", "Benut", "Bukit Gambir", "Bukit Pasir", "Chaah",
    "Endau", "Gelang Patah", "Gerisek", "Iskandar Puteri", "Jementah", "Johor Bahru", "Kahang", "Kluang", "Kota Tinggi", "Kukup", "Kulai", "Labis",
    "Layang-Layang", "Masai", "Mersing", "Muar", "Nusajaya", "Pagoh", "Paloh", "Panchor", "Parit Jawa", "Parit Raja", "Parit Sulong", "Pasir Gudang",
    "Pekan Nanas", "Pengerang", "Pontian", "Rengam", "Rengit", "Segamat", "Semerah", "Senai", "Senggarang", "Seri Gading", "Seri Medan",
    "Simpang Rengam", "Skudai", "Sungai Mati", "Tangkak", "Ulu Tiram", "Yong Peng",
  ],
  Kedah: [
    "Alor Setar", "Ayer Hitam", "Bandar Baharu", "Bedong", "Bukit Kayu Hitam", "Changloon", "Gurun", "Jeniang", "Jitra", "Karangan", "Kepala Batas",
    "Kodiang", "Kota Kuala Muda", "Kota Sarang Semut", "Kuala Kedah", "Kuala Ketil", "Kuala Nerang", "Kuala Pegang", "Kulim", "Kupang", "Langgar",
    "Langkawi", "Lunas", "Merbok", "Padang Serai", "Pendang", "Pokok Sena", "Serdang", "Sik", "Sungai Petani", "Yan",
  ],
  Kelantan: [
    "Ayer Lanas", "Bachok", "Cherang Ruku", "Dabong", "Gua Musang", "Jeli", "Ketereh", "Kok Lanas", "Kota Bharu", "Kuala Balah", "Kuala Krai", "Machang",
    "Melor", "Pasir Mas", "Pasir Puteh", "Pulai Chondong", "Rantau Panjang", "Selising", "Tanah Merah", "Temangan", "Tumpat", "Wakaf Bharu",
  ],
  Melaka: [
    "Alor Gajah", "Asahan", "Ayer Keroh", "Bemban", "Durian Tunggal", "Jasin", "Kuala Sungai Baru", "Lubok China", "Masjid Tanah", "Melaka", "Merlimau",
    "Selandar", "Sungai Rambai", "Sungai Udang", "Tanjong Kling",
  ],
  "Negeri Sembilan": [
    "Bahau", "Bandar Baru Serting", "Batang Melaka", "Batu Kikir", "Gemas", "Gemencheh", "Johol", "Kota", "Kuala Klawang", "Kuala Pilah", "Labu",
    "Lenggeng", "Linggi", "Mantin", "Nilai", "Pasir Panjang", "Pedas", "Port Dickson", "Rantau", "Rembau", "Rompin", "Senawang", "Seremban", "Si Rusa",
    "Simpang Durian", "Simpang Pertang", "Tampin", "Tanjong Ipoh",
  ],
  Pahang: [
    "Balok", "Bandar Bera", "Bandar Pusat Jengka", "Bandar Tun Abdul Razak", "Benta", "Bentong", "Brinchang", "Bukit Fraser", "Bukit Goh", "Cameron Highlands",
    "Chenor", "Chini", "Damak", "Dong", "Gambang", "Genting Highlands", "Jerantut", "Karak", "Kemayan", "Kuala Krau", "Kuala Lipis", "Kuala Rompin",
    "Kuantan", "Lanchang", "Lurah Bilut", "Maran", "Mentakab", "Muadzam Shah", "Padang Tengku", "Pekan", "Raub", "Ringlet", "Sega", "Sungai Koyan",
    "Sungai Lembing", "Sungai Ruan", "Tanah Rata", "Temerloh", "Tioman", "Triang",
  ],
  Perak: [
    "Air Kuning", "Alor Pongsu", "Ayer Tawar", "Bagan Datuk", "Bagan Serai", "Bandar Seri Iskandar", "Batu Gajah", "Batu Kurau", "Behrang", "Beruas",
    "Bidor", "Bota", "Changkat Jering", "Changkat Keruing", "Chemor", "Chenderiang", "Chenderong Balai", "Chikus", "Enggor", "Gerik", "Gopeng",
    "Hutan Melintang", "Intan", "Ipoh", "Jeram", "Kampar", "Kampung Gajah", "Kampung Kepayang", "Kamunting", "Kuala Kangsar", "Kuala Kurau",
    "Kuala Sepetang", "Lahat", "Lambor Kanan", "Langkap", "Lenggong", "Lumut", "Malim Nawar", "Manong", "Matang", "Padang Rengas", "Pangkor",
    "Pantai Remis", "Parit", "Parit Buntar", "Pengkalan Hulu", "Pusing", "Rantau Panjang", "Sauk", "Selama", "Selekoh", "Seri Manjung", "Simpang",
    "Simpang Ampat Semanggol", "Sitiawan", "Slim River", "Sungai Siput", "Sungai Sumun", "Sungkai", "Taiping", "Tanjong Malim", "Tanjong Piandang",
    "Tanjong Rambutan", "Tanjong Tualang", "Tapah", "Tapah Road", "Teluk Intan", "Temoh", "Trolak", "Trong", "Tronoh", "Ulu Bernam", "Ulu Kinta",
  ],
  Perlis: ["Arau", "Beseri", "Chuping", "Kaki Bukit", "Kangar", "Kuala Perlis", "Padang Besar", "Simpang Ampat"],
  "Pulau Pinang": [
    "Ayer Itam", "Balik Pulau", "Batu Ferringhi", "Batu Maung", "Bayan Lepas", "Bukit Mertajam", "Butterworth", "Gelugor", "George Town", "Jelutong",
    "Kepala Batas", "Kubang Semang", "Nibong Tebal", "Penaga", "Perai", "Permatang Pauh", "Seberang Jaya", "Simpang Ampat", "Sungai Bakap", "Sungai Jawi",
    "Tanjong Bungah", "Tasek Gelugor", "Teluk Bahang",
  ],
  Sabah: [
    "Beaufort", "Beluran", "Bongawan", "Keningau", "Kota Belud", "Kota Kinabalu", "Kota Kinabatangan", "Kota Marudu", "Kuala Penyu", "Kudat", "Kunak",
    "Lahad Datu", "Likas", "Membakut", "Menumbok", "Nabawan", "Pamol", "Papar", "Penampang", "Putatan", "Ranau", "Sandakan", "Semporna", "Sipitang",
    "Tambunan", "Tamparuli", "Tanjung Aru", "Tawau", "Tenghilan", "Tenom", "Tuaran",
  ],
  Sarawak: [
    "Asajaya", "Balingian", "Baram", "Bau", "Bekenu", "Belaga", "Belawai", "Betong", "Bintangor", "Bintulu", "Dalat", "Daro", "Debak", "Engkilili", "Julau",
    "Kabong", "Kanowit", "Kapit", "Kota Samarahan", "Kuching", "Lawas", "Limbang", "Lingga", "Long Lama", "Lubok Antu", "Lundu", "Lutong", "Matu", "Miri",
    "Mukah", "Niah", "Pusa", "Roban", "Saratok", "Sarikei", "Sebauh", "Sebuyau", "Serian", "Sibu", "Siburan", "Simunjan", "Song", "Spaoh", "Sri Aman",
    "Sundar", "Tatau", "Tebedu",
  ],
  Selangor: [
    "Ampang", "Bandar Baru Bangi", "Bangi", "Banting", "Batang Berjuntai", "Batang Kali", "Batu Arang", "Batu Caves", "Beranang", "Bestari Jaya", "Bukit Rotan",
    "Cheras", "Cyberjaya", "Dengkil", "Hulu Langat", "Jenjarom", "Jeram", "Kajang", "Kapar", "Kerling", "Klang", "KLIA", "Kuala Kubu Bharu",
    "Kuala Selangor", "Kuang", "Pelabuhan Klang", "Petaling Jaya", "Puchong", "Pulau Carey", "Pulau Indah", "Pulau Ketam", "Puncak Alam", "Rasa", "Rawang",
    "Sabak Bernam", "Salak Tinggi", "Sekinchan", "Selayang", "Semenyih", "Sepang", "Serdang", "Serendah", "Seri Kembangan", "Shah Alam", "Subang Jaya",
    "Sungai Ayer Tawar", "Sungai Besar", "Sungai Buloh", "Sungai Pelek", "Tanjong Karang", "Tanjong Sepat", "Telok Panglima Garang",
  ],
  Terengganu: [
    "Ajil", "Ayer Puteh", "Bukit Besi", "Bukit Payong", "Ceneh", "Chalok", "Cukai", "Dungun", "Jerteh", "Kampung Raja", "Kemaman", "Kemasek", "Kerteh",
    "Ketengah Jaya", "Kijal", "Kuala Berang", "Kuala Besut", "Kuala Terengganu", "Marang", "Paka", "Permaisuri", "Sungai Tong",
  ],
  "W.P. Kuala Lumpur": [
    "Kuala Lumpur", "Bangsar", "Brickfields", "Bukit Jalil", "Cheras", "Kepong", "Mont Kiara", "Segambut", "Sentul", "Setapak", "Sri Petaling", "Wangsa Maju",
  ],
  "W.P. Labuan": ["Labuan"],
  "W.P. Putrajaya": ["Putrajaya"],
};

/** The states a city is in (nearly always one), ignoring letter case. */
export const statesOf = (city: string): string[] => {
  const c = city.trim().toLowerCase();
  return c ? Object.keys(MY_CITIES).filter((s) => MY_CITIES[s].some((x) => x.toLowerCase() === c)) : [];
};

/** Every city once, A–Z, as [city, "city · its state"] for the City dropdown. */
export const CITY_OPTIONS: [string, string][] = [...new Set(Object.values(MY_CITIES).flat())]
  .sort((a, b) => a.localeCompare(b))
  .map((c) => [c, `${c} · ${statesOf(c).join(" / ")}`]);
