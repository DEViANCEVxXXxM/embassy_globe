export const IMG_BASE = 'assets/';
export const ORDER_URL = 'https://t.me/burgerembassy_uzbot';
export const METRIKA_ID = window.__METRIKA_ID__;

export const BRANCH_STORAGE_KEY = 'be_branch_v1';
export const BRANCH_SOURCE_KEY  = 'be_branch_source_v1';
export const BRANCH_OPEN_FILTER_KEY = 'be_branch_open_filter_v1';
export const FAV_KEY = 'be_favorites_v1';
export const RECENT_KEY = 'be_recent_v1';
export const SORT_KEY = 'be_sort_v1';
export const PROMO_KEY = 'be_promo_dismissed_v1';
export const PROMO_TEXT = '🔥 Сегодня −20% на все сеты · до 23:00';

export const ISO2 = { USA:'us', CAN:'ca', ESP:'es', ITA:'it', FRA:'fr', DEU:'de', TUR:'tr', GRC:'gr', MEX:'mx', KOR:'kr', BRA:'br', ETH:'et', UZB:'uz' };

export const CATEGORIES = {
  burgers: { label:'Бургеры', kcal:700, allergens:'глютен, молоко, яйцо, горчица' },
  sets:    { label:'Сеты',    kcal:1300, allergens:'глютен, молоко, яйцо, горчица' },
  salads:  { label:'Салаты',  kcal:280, allergens:'молоко (в заправке), яйцо' },
  desserts:{ label:'Десерты', kcal:350, allergens:'глютен, молоко, яйцо, соя' },
  drinks:  { label:'Напитки', kcal:120, allergens:'нет' },
  snacks:  { label:'Снеки',   kcal:350, allergens:'глютен (панировка)' },
  hotdogs: { label:'Хот-доги',kcal:480, allergens:'глютен, горчица, молоко' },
  other:   { label:'Другое',  kcal:null,allergens:'уточняйте у персонала' }
};

export const branches = [
  { id:'ukchi',       name:'Уччи, 5',                 address:'Возле ЦУМа, 2 этажа',  hours:'10:00 – 03:00', is24:false, lat:41.3111, lon:69.2797 },
  { id:'yakub',       name:'Якуба Коласа, 6/1',       address:'Мирабадский район',    hours:'10:00 – 23:00', is24:false, lat:41.2850, lon:69.2900 },
  { id:'sadik',       name:'Садыка Азимова, 51',      address:'',                     hours:'Круглосуточно', is24:true,  lat:41.3200, lon:69.3300 },
  { id:'karatash',    name:'Караташ, 5А',             address:'ТЦ Samarkand Darvozi', hours:'10:00 – 22:00', is24:false, lat:41.2700, lon:69.2200 },
  { id:'yakkachinar', name:'Яккачинар, 12',           address:'',                     hours:'Круглосуточно', is24:true,  lat:41.2950, lon:69.2100 },
  { id:'mirzo',       name:'Мирзо Улугбека, 55',      address:'',                     hours:'Круглосуточно', is24:true,  lat:41.3250, lon:69.3250 },
  { id:'osiyo',       name:'Осиё, 4',                 address:'Юнусабадский район',   hours:'10:00 – 23:00', is24:false, lat:41.3650, lon:69.2900 },
  { id:'yangishahar', name:'Янги Шахар, 67',          address:'ТЦ High Town',         hours:'10:00 – 23:00', is24:false, lat:41.3400, lon:69.3200 },
  { id:'beruni',      name:'Беруни, 371В',            address:'Алмазарский район',    hours:'18:00 – 02:00', is24:false, lat:41.3550, lon:69.2200 },
  { id:'chilanzar',   name:'Чиланзар, 55',            address:'',                     hours:'10:00 – 23:00', is24:false, lat:41.2800, lon:69.2050 },
  { id:'nukus',       name:'Нукусская, 83А',          address:'',                     hours:'10:00 – 23:00', is24:false, lat:41.3300, lon:69.2400 },
  { id:'rikhsili',    name:'Рихсили, 25',             address:'',                     hours:'10:00 – 23:00', is24:false, lat:41.3000, lon:69.2600 },
  { id:'kamarniso',   name:'Камарнисо, 22Д',          address:'15-й филиал',          hours:'10:00 – 23:00', is24:false, lat:41.3100, lon:69.2900 },
  { id:'sergeli',     name:'Янги Сергели Йули',       address:'Сергели',              hours:'10:00 – 23:00', is24:false, lat:41.2350, lon:69.2200 },
  { id:'mironShah',   name:'Мироншаха, 8-й проезд',   address:'30-20',                hours:'10:00 – 23:00', is24:false, lat:41.3000, lon:69.2500 },
];

export const places = [
  { id:'newyork', name:'New York', country:'США', iso:'USA', lat:40.7128, lon:-74.0060,
    items:[
      {n:'New York Burger', p:52000, w:'325 г', e:'🍔', i:'adfecde1cb66d522582c97b9f75b060f-300x300.jpeg', d:'Говяжья котлета, чеддер, томат, салат и соус на поджаренной булочке.'},
      {n:'New York сет (Fanta 0,4 л)', p:76000, old:93000, w:'1,15 кг', e:'🥤', i:'fe9a62ec6f05fb264337b60d3eb6477f-300x300.jpeg', d:'Сет: бургер New York, паста-микс, картофель и Fanta 0,4 л.'},
      {n:'American Chef burger', p:75000, w:'380 г', e:'👨‍🍳', i:'9608bfeee56082ddbacfa673e27ab72f-300x300.jpeg', d:'Двойная котлета, бекон, чеддер и авторский соус шефа.'},
      {n:'Smash Double Burger', p:63000, w:'350 г', e:'🍔', i:'706e735428d2c3708b36cb9446ac2e6d-300x300.jpeg', d:'Две тонкие смэш-котлеты с хрустящей корочкой и расплавленным сыром.', out:true},
      {n:'Junior Chicken Burger', p:25000, w:'180 г', e:'🐤', i:'309fa048414cb8bf744cd62a4b08d86d-300x300.jpeg', d:'Детский чикенбургер: куриная котлета, сыр и мягкая булочка.'},
      {n:'Little Cheese Burger', p:31000, w:'200 г', e:'🧀', i:'6cd1149d53d527533d087398ac2e9080-300x300.jpeg', d:'Детский чизбургер — маленькая версия классики.'},
      {n:'Хот Дог Классический', p:28000, w:'230 г', e:'🌭', i:'4b01a49bde07e50d7afe3d0ed88645ae-300x300.jpeg', d:'Сосиска-гриль, горчица, кетчуп и хрустящий лук в булочке.'},
      {n:'Cola 0,5 л', p:12000, w:'500 мл', e:'🥤', i:'f96a2199a80a84b515cda3044096c99d-300x300.jpeg', d:'Классическая кола, охлаждённая.'},
      {n:'Sprite 0,5 л', p:12000, w:'500 мл', e:'🥤', i:'4ec04955d4144dc1c24451a4daccfe2f-300x300.jpeg', d:'Освежающий лимон-лайм.'},
      {n:'Fanta 0,5 л', p:12000, w:'500 мл', e:'🥤', i:'0f3adeecfa8ac44784b764522ce6a109-300x300.jpeg', d:'Апельсиновый вкус, много пузырьков.'},
      {n:'Вода 0,5 л', p:5000, w:'500 мл', e:'💧', i:'cc212c3bef9545e35f9065859447c6d4-300x300.jpeg', d:'Питьевая вода без газа.'}
    ]},
  { id:'california', name:'California', country:'США', iso:'USA', lat:34.0522, lon:-118.2437,
    items:[
      {n:'California double canada', p:56000, w:'460 г', e:'🍔', i:'f9ef630e982cc7e0a7e8890058854a75-300x300.jpeg', d:'Двойная котлета, бекон и свежие овощи.'},
      {n:'Ассорти снеков', p:59000, w:'383 г', e:'🍟', i:'e6f006f256184b9e86938b2e61cdca8c-300x300.jpeg', d:'Большая тарелка для компании.'}
    ]},
  { id:'kentucky', name:'Kentucky', country:'США', iso:'USA', lat:38.0406, lon:-84.5037,
    items:[
      {n:'Kentucky Chicken Burger', p:49000, w:'365 г', e:'🍗', i:'b7c6adc3702e3a35de1ed6f8cf80c818-300x300.jpeg', d:'Куриная котлета в хрустящей панировке, сыр и сливочный соус.'},
      {n:'Наггетсы Куриные Классические (6 шт)', p:31000, w:'200 г', e:'🍗', i:'cb069acc9a6d94151cf0ce816ceaf4bc-300x300.jpeg', d:'Шесть классических куриных наггетсов.'},
      {n:'Картофель Фри', p:24000, w:'120 г', e:'🍟', i:'b72fd7ff8eb41a1963905101a4430a24-300x300.jpeg', d:'Хрустящая соломка.'}
    ]},
  { id:'texas', name:'Texas', country:'США', iso:'USA', lat:30.2672, lon:-97.7431,
    items:[
      {n:'Texas BBQ Burger', p:95000, w:'390 г', e:'🤠', i:'ab781c81b605e273f2dc8e424be7d77e-300x300.jpeg', d:'Котлета, соус BBQ, копчёный бекон.', out:true}
    ]},
  { id:'canada', name:'Ottawa', country:'Канада', iso:'CAN', lat:45.4215, lon:-75.6972,
    items:[
      {n:'Canadian Chicken Burger', p:39000, w:'335 г', e:'🍁', i:'f7cfc95c8df2091779e3cfb3d4686972-300x300.jpeg', d:'Куриная котлета, сыр и горчично-кленовый соус.'}
    ]},
  { id:'madrid', name:'Madrid', country:'Испания', iso:'ESP', lat:40.4168, lon:-3.7038,
    items:[
      {n:'Spain Jalapeno Burger', p:56000, w:'330 г', e:'🌶️', i:'be44b3cdfbcdb8ed4fd946d71811f48e-300x300.jpeg', d:'Говяжья котлета, халапеньо и острый соус.'}
    ]},
  { id:'roma', name:'Roma', country:'Италия', iso:'ITA', lat:41.9028, lon:12.4964,
    items:[
      {n:'Italian Cheese Burger', p:56000, w:'365 г', e:'🧀', i:'f1370674a8a3c57769e3b1595df0d5a6-300x300.jpeg', d:'Много сыра, томаты и итальянские травы.'}
    ]},
  { id:'paris', name:'Paris', country:'Франция', iso:'FRA', lat:48.8566, lon:2.3522,
    items:[
      {n:'New! French Truffle Cheeseburger', p:80000, w:'400 г', e:'🍄', i:'ba9d0db357453939a442da2f64f48e0a-300x300.jpeg', d:'Трюфельный соус, сыр и говяжья котлета.'}
    ]},
  { id:'frankfurt', name:'Frankfurt', country:'Германия', iso:'DEU', lat:50.1109, lon:8.6821,
    items:[
      {n:'Хот Дог Франкфурд', p:30000, w:'210 г', e:'🌭', i:'32c2d49618e43c37a6dbc97cbd8b6acf-300x300.jpeg', d:'Франкфуртская сосиска, горчица и капуста.', out:true}
    ]},
  { id:'istanbul', name:'Istanbul', country:'Турция', iso:'TUR', lat:41.0082, lon:28.9784,
    items:[
      {n:'Turkish Durum Burger', p:56000, w:'330 г', e:'🌯', i:'a3903eefe87386d1232c6f6046d4068a-300x300.jpeg', d:'Котлета в лаваше с овощами и специями.'},
      {n:'Turkish сет (Cola 0,4 л)', p:83000, old:97000, w:'1,23 кг', e:'🥤', i:'86afb9305005b9d3f6d882600a722327-300x300.jpeg', d:'Сет: турецкий бургер, паста-микс, картофель и Cola.'},
      {n:'TURKISH-Cola сет', p:40800, old:68000, w:'301 г', e:'📦', i:'697e373041eba5c23a4ab804159fc800-300x300.jpeg', d:'Компактный сет с бургером и колой.'}
    ]},
  { id:'athens', name:'Athens', country:'Греция', iso:'GRC', lat:37.9838, lon:23.7275,
    items:[
      {n:'Салат греческий new', p:27000, w:'200 г', e:'🥗', i:'1f31b7807090545c30b2ecfd4517d0c2-300x300.jpeg', d:'Фета, оливки, огурцы, томаты и орегано.'}
    ]},
  { id:'tijuana', name:'Tijuana', country:'Мексика', iso:'MEX', lat:32.5149, lon:-117.0382,
    items:[
      {n:'Салат цезарь', p:31000, w:'220 г', e:'🥗', i:'3713bc897bd439ba62d7005cfc44229e-300x300.jpeg', d:'Классика, придуманная в Тихуане.'}
    ]},
  { id:'seoul', name:'Seoul', country:'Южная Корея', iso:'KOR', lat:37.5665, lon:126.9780,
    items:[
      {n:'Korean Chicken Burger', p:49000, w:'390 г', e:'🌶️', i:'b9bfb2cbcd6af5bc6e97c46a60937f4d-300x300.jpeg', d:'Куриная котлета в остром корейском соусе.'},
      {n:'Хот Дог Сеул', p:30000, w:'200 г', e:'🌭', i:'0d41005974f902eb5ab66076dae1df75-300x300.jpeg', d:'Сосиска, соус в стиле кимчи.'}
    ]},
  { id:'rio', name:'Rio de Janeiro', country:'Бразилия', iso:'BRA', lat:-22.9068, lon:-43.1729,
    items:[
      {n:'Brazilian Burger', p:49000, w:'320 г', e:'🍍', i:'282f7a5149e08b9bb3908cab94471e37-300x300.jpeg', d:'Котлета, сыр, ананас и пикантный соус.'}
    ]},
  { id:'addis', name:'Addis Ababa', country:'Эфиопия', iso:'ETH', lat:9.0300, lon:38.7400,
    items:[
      {n:'African Burger', p:65000, w:'340 г', e:'🔥', i:'5bd371e9fbe4d7c90acc367bd0eccc38-300x300.jpeg', d:'Котлета с острым африканским соусом.'}
    ]},
  { id:'tashkent', name:'Tashkent', country:'Узбекистан', iso:'UZB', lat:41.2995, lon:69.2401,
    items:[
      {n:'Burger Embassy', p:56000, w:'300 г', e:'👑', i:'e0bceb52ec51818fedacd8263125f741-300x300.jpeg', d:'Фирменный бургер заведения.'},
      {n:'Uzbekistan burger', p:95000, w:'375 г', e:'🇺🇿', i:'103fd44c53dcf0ebbd7f9262d6f16ce3-300x300.jpeg', d:'Локальная интерпретация: котлета, овощи по-узбекски.'},
      {n:'Chicken сет (Cola 0,4 л)', p:67000, old:80000, w:'1,2 кг', e:'📦', i:'d415f55906863b8d161b89e794c8149f-300x300.jpeg', d:'Сет: чикенбургер, паста-микс, картофель и Cola.'},
      {n:'Embassy сет (Cola 0,4 л)', p:83000, old:97000, w:'1,22 кг', e:'📦', i:'1313987d755d9b2c3055ca12448f026c-300x300.jpeg', d:'Сет: бургер Embassy, паста-микс, картофель и Cola.'},
      {n:'Kids box set (girl)', p:70000, w:'370 г', e:'🎁', i:'a8268adcf8e89e360b8d5b42e01d0783-300x300.jpeg', d:'Детский набор с игрушкой.'},
      {n:'Kids box set (boy)', p:70000, w:'370 г', e:'🎁', i:'26072471a66985e98554bc02ddbb3cc8-300x300.jpeg', d:'Детский набор с игрушкой.'},
      {n:'Салат с говядиной', p:36000, w:'240 г', e:'🥗', i:'6a00c657c5041685d6cf4d5cd8304351-300x300.jpeg', d:'Свежие овощи и обжаренная говядина.'},
      {n:'Салат Коул Слоу', p:12000, w:'100 г', e:'🥬', i:'9cb82bff005800c66f5024ad8085c328-300x300.jpeg', d:'Капуста и морковь в сливочной заправке.', out:true},
      {n:'Шоколадный фондан', p:18000, w:'1 шт', e:'🍫', i:'acc8fe0492a090558ffb03483e81ea11-300x300.jpeg', d:'Тёплый шоколадный фондан.'},
      {n:'Чизкейк с яблоком в баночке', p:32000, w:'1 шт', e:'🍏', i:'73bff8990d95374ee0c31fd08e843ef3-300x300.jpeg', d:'Нежный чизкейк с яблочной прослойкой.'},
      {n:'Чизкейк Орео в баночке', p:35000, w:'1 шт', e:'🍪', i:'b8571377350773f171610e6a09b90f19-300x300.jpeg', d:'Чизкейк с печеньем Oreo.'},
      {n:'Донат Шоколадный', p:21000, w:'1 шт', e:'🍩', i:'743b30c1d8b593a4927ccb29e38eb9fd-300x300.jpeg', d:'Пончик в шоколадной глазури.'},
      {n:'Донат Карамельный', p:21000, w:'1 шт', e:'🍩', i:'0722aad5b2898c2374ce4940aee93cfd-300x300.jpeg', d:'Пончик с карамельной глазурью.'},
      {n:'Донат Ягодный', p:21000, w:'1 шт', e:'🍩', i:'155622ce9e33b5547b4b84049cf0945c-300x300.jpeg', d:'Пончик с ягодной глазурью.'},
      {n:'Чай чёрный', p:8000, w:'250 мл', e:'🍵', i:'17169037b19e68a42ff379fa5e75295e-300x300.jpeg', d:'Классический чёрный чай.'},
      {n:'Зелёный чай', p:8000, w:'500 мл', e:'🍵', i:'1f367cc3225ad5851e0521988b987ca1-300x300.jpeg', d:'Зелёный чай без добавок.'},
      {n:'Чай чёрный с лимоном', p:12000, w:'500 мл', e:'🍋', i:'3774e055245a4b54d529d58d35d8f5a5-300x300.jpeg', d:'Чёрный чай с долькой лимона.'},
      {n:'Чай зелёный с лимоном', p:12000, w:'500 мл', e:'🍋', i:'3774e055245a4b54d529d58d35d8f5a5-300x300.jpeg', d:'Зелёный чай с лимоном.'},
      {n:'Ягодный', p:23000, w:'500 мл', e:'🫐', i:'319f9dab732357cc3a9e1eae6c128df5-300x300.jpeg', d:'Ягодный чай.'},
      {n:'Сок маленький', p:5000, w:'1 л', e:'🧃', i:'03996e6dd438d885f604c834d38cba65-300x300.jpeg', d:'Небольшой пакет сока.'},
      {n:'Сок апельсиновый', p:20000, w:'1 л', e:'🍊', i:'7054070ee40e7462eb3a5558e6e7fe47-300x300.jpeg', d:'Апельсиновый сок, 1 л.'},
      {n:'Сок яблочный', p:20000, w:'1 л', e:'🍎', i:'42eb332b8b71aa9e00a401932381e6bf-300x300.jpeg', d:'Яблочный сок, 1 л.'},
      {n:'Сок вишнёвый', p:20000, w:'1 л', e:'🍒', i:'8cbb135d7a367fbd7aa3c4eed78a54c8-300x300.jpeg', d:'Вишнёвый сок, 1 л.'},
      {n:'Сок абрикосовый', p:20000, w:'1 л', e:'🍑', i:'e7d81267c52d39351b3340eda9fb40b1-300x300.jpeg', d:'Абрикосовый сок, 1 л.'},
      {n:'Сок персиковый', p:20000, w:'1 л', e:'🍑', i:'caac78ce4f0bc447da877850ef047e3c-300x300.jpeg', d:'Персиковый сок, 1 л.'},
      {n:'Сок ананасовый', p:20000, w:'1 л', e:'🍍', i:'14ac1fff57d749a36a0a82ef4a8b046b-300x300.jpeg', d:'Ананасовый сок, 1 л.'},
      {n:'Сок лимонный', p:20000, w:'1 л', e:'🍋', i:'124d275a44fee47152507dd149ad6a8e-300x300.jpeg', d:'Лимонный сок, 1 л.'},
      {n:'Сок мультифруктовый', p:20000, w:'1 л', e:'🧃', i:'9b74427157b3c2eceb1d063ea26ceaa7-300x300.jpeg', d:'Мультифруктовый сок, 1 л.', out:true},
      {n:'Фреш яблочный', p:25000, w:'200 мл', e:'🍏', i:'b8acfe2a13ffa837395b2854d41b76d7-300x300.jpeg', d:'Свежевыжатый яблочный сок.'},
      {n:'Фреш морковный', p:26000, w:'200 мл', e:'🥕', i:'198de1c01369668ebaaedb505e751fa5-300x300.jpeg', d:'Свежевыжатый морковный сок.', out:true},
      {n:'Фреш яблочно-морковный', p:24000, w:'200 мл', e:'🥕', i:'da484f2fc894b5ce11eb77b1da3b368d-300x300.jpeg', d:'Свежевыжатый микс яблока и моркови.', out:true},
      {n:'Тархун (0,5 л)', p:23000, w:'0,5 л', e:'🌿', i:'050725cec653336ba002fcba1ea14cd6-300x300.jpeg', d:'Тархун собственного приготовления.'},
      {n:'Холодный жасмин', p:23000, w:'500 мл', e:'🌸', i:'b6b903088786aa5bdf3d234c816bae0a-300x300.jpeg', d:'Лимонад с жасмином.'},
      {n:'Лимонад манго', p:23000, w:'500 мл', e:'🥭', i:'1cd3bb3c48246ce12bf7887e54289233-300x300.jpeg', d:'Лимонад со вкусом манго.'},
      {n:'Айс-ти чёрный', p:23000, w:'500 мл', e:'🧊', i:'3f12a83aab1ce99c1006a1ad701ac649-300x300.jpeg', d:'Холодный чёрный чай.'},
      {n:'Айс-ти фруктовый', p:23000, w:'500 мл', e:'🧊', i:'81f37689920c79a1dd19191cce33fc53-300x300.jpeg', d:'Холодный фруктовый чай.'},
      {n:'Ягодный (0,5 л)', p:23000, w:'500 мл', e:'🫐', i:'c2d0d979b25769d5d08786e09b454675-300x300.jpeg', d:'Ягодный лимонад.'},
      {n:'Гранатовый', p:23000, w:'500 мл', e:'🍷', i:'dc8a25a84e767bcb060763c433375765-300x300.jpeg', d:'Лимонад с гранатом.'},
      {n:'Малина-клубника', p:23000, w:'500 мл', e:'🍓', i:'503489812235cddbb60550997b3aebe5-300x300.jpeg', d:'Лимонад малина-клубника.'},
      {n:'Айс-ти зелёный', p:23000, w:'500 мл', e:'🧊', i:'3f12a83aab1ce99c1006a1ad701ac649-300x300.jpeg', d:'Холодный зелёный чай.', out:true},
      {n:'Груша-персик', p:23000, w:'500 мл', e:'🍐', i:'c99704209288041c5ae853090657c544-300x300.jpeg', d:'Лимонад груша-персик.', out:true}
    ]}
];

export const countryIndex = {};
places.forEach(p => {
  if (!countryIndex[p.iso]) {
    countryIndex[p.iso] = { iso:p.iso, country:p.country, places:[], items:[], lat:0, lon:0, count:0 };
  }
  const c = countryIndex[p.iso];
  c.places.push(p);
  p.items.forEach(it => c.items.push({ ...it, _city: p.name, _placeId: p.id, _iso: p.iso }));
});
Object.values(countryIndex).forEach(c => {
  c.lat = c.places.reduce((s,p)=>s+p.lat,0) / c.places.length;
  c.lon = c.places.reduce((s,p)=>s+p.lon,0) / c.places.length;
  c.count = c.items.length;
});
export const countries = Object.values(countryIndex).sort((a,b)=>a.country.localeCompare(b.country,'ru'));