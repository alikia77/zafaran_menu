/* ============================================================
   Menu data — sample items and prices until the real list arrives
   price: Toman
   ============================================================ */
const EXTRAS = {
  kebab: { remove: ['سماق', 'پیاز', 'گوجه کبابی', 'کره'], add: [['سیخ اضافه', 260000], ['گوجه کبابی اضافه', 40000], ['ته‌دیگ', 90000], ['کره و زعفران بیشتر', 35000]] },
  stew: { remove: ['لیمو عمانی', 'سیب‌زمینی سرخ‌کرده'], add: [['گوشت بیشتر', 180000], ['ته‌دیگ سیب‌زمینی', 90000], ['برنج اضافه', 110000]] },
  polo: { remove: ['زرشک', 'پسته', 'خلال بادام'], add: [['ته‌دیگ', 90000], ['مرغ اضافه', 220000]] },
  starter: { remove: ['نعناع داغ', 'گردو', 'پیاز داغ'], add: [['نان سنگک', 30000], ['کشک بیشتر', 25000]] },
  pizza: { remove: ['زیتون', 'فلفل دلمه', 'پیاز', 'قارچ'], add: [['پنیر اضافه', 90000], ['قارچ اضافه', 60000], ['هالوپینو', 45000], ['خمیر نازک', 0]] },
  burger: { remove: ['خیارشور', 'پیاز', 'گوجه', 'کاهو', 'سس'], add: [['پنیر چدار', 60000], ['قارچ گریل', 55000], ['سیب‌زمینی بزرگ', 70000]] },
  pasta: { remove: ['پارمزان', 'جعفری', 'فلفل سیاه'], add: [['مرغ گریل', 140000], ['پارمزان بیشتر', 50000], ['نان سیر', 60000]] },
  sandwich: { remove: ['خیارشور', 'سس', 'پیاز'], add: [['سس مخصوص', 30000], ['پنیر', 50000]] },
  salad: { remove: ['سس', 'کروتان', 'پیاز'], add: [['مرغ گریل', 140000], ['سس کنار', 0]] },
  cold: { remove: ['یخ'], add: [['لیوان بزرگ', 40000]] },
  hot: { remove: ['نبات', 'شکر'], add: [['شیر گیاهی', 45000], ['شات اضافه', 60000]] },
  dessert: { remove: ['دارچین', 'گلبرگ گل محمدی'], add: [['اسکوپ بستنی', 80000]] },
};

const CATEGORIES = [
  { id: 'kebab', name: 'کباب‌ها', kicker: 'فصل آتش', line: 'روی زغال، با سیخ‌های پهن و کره‌ی زعفرانی. هر سیخ همان لحظه‌ی سفارش به آتش می‌رود.', icon: 'skewer', layout: 'zigzag', bg: '#150b06', accent: '#f2a45c', fx: 'embers', dust: 'sumac', glow: '#d2601e' },
  { id: 'stew', name: 'خورش‌ها', kicker: 'فصل دم', line: 'آرام‌پز، شش ساعت روی شعله‌ی کم؛ همان‌طور که در خانه دم می‌کشد.', icon: 'pot', layout: 'bowls', bg: '#0c1009', accent: '#bfd27e', fx: 'steam', glow: '#4f6a1c' },
  { id: 'polo', name: 'پلوها', kicker: 'فصل زعفران', line: 'برنج ایرانی، زعفران قائنات و ته‌دیگی که صدای شکستنش را می‌شنوید.', icon: 'rice', layout: 'zigzag', variant: 'spin', bg: '#170e05', accent: '#f4c752', fx: 'saffron', dust: 'saffron', glow: '#e09a1a' },
  { id: 'starter', name: 'پیش‌غذا', kicker: 'فصل سفره', line: 'برای شروع، کنار نان داغ سنگک.', icon: 'bowl', layout: 'mezze', bg: '#121010', accent: '#e6cfa4', fx: 'gold', glow: '#b9925a' },
  { id: 'pizza', name: 'پیتزا', kicker: 'فصل تنور', line: 'خمیر یک‌روزه، تنور هیزمی. پیتزای خودتان را هم بسازید.', icon: 'pizza', layout: 'board', bg: '#160b07', accent: '#ff8f5e', fx: 'flour', glow: '#c8341a' },
  { id: 'burger', name: 'برگر', kicker: 'فصل گریل', line: 'گوشت تازه‌چرخ، نان بریوش. لایه‌به‌لایه، همان‌طور که دوست دارید.', icon: 'burger', layout: 'stack', bg: '#110d09', accent: '#f4b24c', fx: 'embers', glow: '#c8781e' },
  { id: 'pasta', name: 'پاستا', kicker: 'فصل ایتالیا', line: 'سس‌های ایتالیایی، پارمزان تازه‌رنده.', icon: 'pasta', layout: 'rail', variant: 'twirl', bg: '#13100a', accent: '#f0d89c', fx: 'gold', glow: '#d8b25a' },
  { id: 'sandwich', name: 'ساندویچ و کنار', kicker: 'برای کنار', line: 'برای اشتراک سر میز.', icon: 'fries', layout: 'rail', bg: '#120e0a', accent: '#f4c66c', fx: 'gold', glow: '#d89a2a' },
  { id: 'salad', name: 'سالاد', kicker: 'فصل سبز', line: 'سبزی تازه‌ی همان روز.', icon: 'leaf', layout: 'mezze', bg: '#0a110a', accent: '#a9d78a', fx: 'gold', glow: '#4a8a26' },
  { id: 'cold', name: 'نوشیدنی سرد', kicker: 'بار شب', line: 'خنک، با یخ و نعناع. لیوان را بکشید.', icon: 'glass', layout: 'bar', bg: '#061015', accent: '#7fd8d2', fx: 'bubbles', glow: '#2a8a90' },
  { id: 'hot', name: 'نوشیدنی گرم', kicker: 'چایخانه', line: 'چای دم‌کشیده در قوری و قهوه‌ی تازه‌آسیاب.', icon: 'cup', layout: 'tea', bg: '#140a05', accent: '#ea965c', fx: 'steam', glow: '#a8521a' },
  { id: 'dessert', name: 'دسر', kicker: 'برای پایان شب', line: 'شیرینِ آخر شب؛ گلاب، زعفران، پسته.', icon: 'cake', layout: 'float', bg: '#170c10', accent: '#f4b8c8', fx: 'gold', glow: '#c86a86' },
];

const ITEMS = [
  // kebab
  { id: 'koobideh', cat: 'kebab', name: 'چلوکباب کوبیده', desc: 'دو سیخ کوبیده‌ی گوسفندی با چلوی زعفرانی، گوجه‌ی کبابی و کره', price: 520000, tags: ['signature'], time: 20, glow: '#d2601e', hot: true },
  { id: 'barg', cat: 'kebab', name: 'چلوکباب برگ', desc: 'فیله‌ی گوساله‌ی خوابانده در پیاز و زعفران، روی آتش ملایم', price: 890000, tags: ['signature'], time: 25, glow: '#b8481a', hot: true },
  { id: 'joojeh', cat: 'kebab', name: 'جوجه‌کباب زعفرانی', desc: 'سینه‌ی مرغ با ماست، لیمو و زعفران، کنار چلو', price: 480000, tags: [], time: 20, glow: '#e8901e', hot: true },
  { id: 'soltani', cat: 'kebab', name: 'چلوکباب سلطانی', desc: 'یک سیخ برگ و یک سیخ کوبیده، برای وقتی که انتخاب سخت است', price: 1150000, tags: ['signature'], time: 25, glow: '#c4501c', hot: true },
  { id: 'bakhtiari', cat: 'kebab', name: 'کباب بختیاری', desc: 'تکه‌های مرغ و گوشت یکی در میان روی سیخ', price: 760000, tags: [], time: 25, glow: '#d06a20', hot: true },
  { id: 'shishlik', cat: 'kebab', name: 'شیشلیک', desc: 'دنده‌ی بره‌ی خوابانده در زعفران و رزماری', price: 1350000, tags: ['signature'], time: 30, glow: '#a83a26', hot: true },
  { id: 'loghmeh', cat: 'kebab', name: 'کباب لقمه', desc: 'سه سیخ نازک از گوشت گوسفند و گوساله با ادویه‌ی ملایم', price: 590000, tags: [], time: 20, glow: '#c8601e', hot: true },
  { id: 'torsh', cat: 'kebab', name: 'کباب ترش گیلانی', desc: 'گوشت خوابانده در رب انار، گردو و سبزی معطر شمال', price: 940000, tags: ['spicy'], time: 25, glow: '#8a1a2a', hot: true },
  // stew
  { id: 'ghormeh', cat: 'stew', name: 'قورمه‌سبزی', desc: 'سبزی سرخ‌شده، لوبیا قرمز، گوشت گوسفندی و لیمو عمانی، شش ساعت دم', price: 460000, tags: ['signature'], time: 10, glow: '#4f6a1c', hot: true },
  { id: 'gheymeh', cat: 'stew', name: 'قیمه', desc: 'لپه، گوشت و لیمو عمانی با سیب‌زمینی خلالی', price: 430000, tags: [], time: 10, glow: '#c4501a', hot: true },
  { id: 'fesenjan', cat: 'stew', name: 'فسنجان', desc: 'گردوی آسیاب‌شده و رب انار ترش‌وشیرین با مرغ', price: 620000, tags: [], time: 10, glow: '#5a1a1e', hot: true },
  { id: 'gheymeh-bademjan', cat: 'stew', name: 'قیمه بادمجان', desc: 'بادمجان سرخ‌شده و گوجه‌ی کبابی روی قیمه', price: 450000, tags: [], time: 10, glow: '#b4501e', hot: true },
  // polo
  { id: 'zereshk', cat: 'polo', name: 'زرشک‌پلو با مرغ', desc: 'ران مرغ زعفرانی، زرشک و خلال پسته روی برنج دم‌کشیده', price: 510000, tags: ['signature'], time: 15, glow: '#c2182b', hot: true },
  { id: 'baghali', cat: 'polo', name: 'باقالی‌پلو با ماهیچه', desc: 'ماهیچه‌ی گوسفندی آرام‌پز با شوید و باقالی', price: 980000, tags: [], time: 15, glow: '#6a8a2a', hot: true },
  { id: 'lubia', cat: 'polo', name: 'لوبیاپلو', desc: 'لوبیا سبز و گوشت با رب گوجه و دارچین', price: 390000, tags: [], time: 15, glow: '#c8602a', hot: true },
  { id: 'tahchin', cat: 'polo', name: 'ته‌چین', desc: 'برنج و ماست و زعفران با مرغ، برشته در فر', price: 470000, tags: [], time: 20, glow: '#e08a1a', hot: true },
  { id: 'sabzi-mahi', cat: 'polo', name: 'سبزی‌پلو با ماهی', desc: 'سبزی‌پلوی معطر با فیله‌ی ماهی سفید سرخ‌شده', price: 720000, tags: [], time: 20, glow: '#4a7a2a', hot: true },
  // starter
  { id: 'shirazi', cat: 'starter', name: 'سالاد شیرازی', desc: 'خیار، گوجه، پیاز، آبغوره و نعناع خشک', price: 120000, tags: ['veg'], time: 5, glow: '#5a8a2a' },
  { id: 'mast-khiar', cat: 'starter', name: 'ماست و خیار', desc: 'ماست چکیده با خیار، گردو، کشمش و گلبرگ گل محمدی', price: 110000, tags: ['veg'], time: 5, glow: '#c8c2b0' },
  { id: 'mast-musir', cat: 'starter', name: 'ماست موسیر', desc: 'ماست کیسه‌ای با موسیر کوهی', price: 95000, tags: ['veg'], time: 5, glow: '#b8b2a4' },
  { id: 'kashk-bademjan', cat: 'starter', name: 'کشک بادمجان', desc: 'بادمجان کبابی، کشک، نعناع داغ و گردو', price: 240000, tags: ['veg'], time: 10, glow: '#a8784a' },
  { id: 'mirza', cat: 'starter', name: 'میرزاقاسمی', desc: 'بادمجان دودی با سیر، گوجه و تخم‌مرغ به سبک گیلان', price: 230000, tags: ['veg'], time: 10, glow: '#c4702a' },
  { id: 'soup-jo', cat: 'starter', name: 'سوپ جو', desc: 'جو پوست‌کنده، هویج و خامه با آب‌لیمو', price: 140000, tags: [], time: 5, glow: '#d8b27a', hot: true },
  { id: 'ash-reshteh', cat: 'starter', name: 'آش رشته', desc: 'رشته، حبوبات و سبزی آش با کشک، پیاز داغ و نعناع داغ', price: 180000, tags: ['veg', 'signature'], time: 5, glow: '#6a6a2a', hot: true },
  { id: 'zeytoon', cat: 'starter', name: 'زیتون پرورده', desc: 'زیتون سبز در رب انار، گردو و گلپر', price: 150000, tags: ['veg'], time: 5, glow: '#7a8a1e' },
  // pizza
  { id: 'pizza-pepperoni', cat: 'pizza', name: 'پیتزا پپرونی', desc: 'سس گوجه‌ی تازه، موتزارلا و پپرونی تند', price: 480000, tags: ['spicy'], time: 18, glow: '#c8341a', builder: true },
  { id: 'pizza-special', cat: 'pizza', name: 'پیتزا مخصوص', desc: 'پپرونی، گوشت، قارچ، زیتون و فلفل دلمه', price: 560000, tags: ['signature'], time: 18, glow: '#b8401e', builder: true },
  { id: 'pizza-margherita', cat: 'pizza', name: 'پیتزا مارگاریتا', desc: 'موتزارلای تازه، گوجه و ریحان', price: 390000, tags: ['veg'], time: 15, glow: '#d8301a', builder: true },
  { id: 'pizza-beef', cat: 'pizza', name: 'پیتزا گوشت و قارچ', desc: 'گوشت چرخ‌کرده‌ی تفت‌داده و قارچ', price: 520000, tags: [], time: 18, glow: '#a8481e', builder: true },
  { id: 'pizza-chicken', cat: 'pizza', name: 'پیتزا مرغ و قارچ', desc: 'مرغ گریل، قارچ و ذرت', price: 490000, tags: [], time: 18, glow: '#d8902a', builder: true },
  { id: 'pizza-veggie', cat: 'pizza', name: 'پیتزا سبزیجات', desc: 'قارچ، فلفل، زیتون، ذرت و گوجه', price: 420000, tags: ['veg'], time: 15, glow: '#6a8a2a', builder: true },
  // burger
  { id: 'burger-classic', cat: 'burger', name: 'برگر کلاسیک', desc: '۱۸۰ گرم گوشت گوساله، کاهو، گوجه و سس مخصوص', price: 390000, tags: [], time: 15, glow: '#c8781e', builder: true },
  { id: 'burger-cheese', cat: 'burger', name: 'چیزبرگر', desc: 'برگر کلاسیک با دو لایه پنیر چدار', price: 440000, tags: [], time: 15, glow: '#e0901e', builder: true },
  { id: 'burger-double', cat: 'burger', name: 'دبل‌برگر', desc: 'دو گوشت ۱۵۰ گرمی، پنیر و پیاز کاراملی', price: 620000, tags: ['signature'], time: 18, glow: '#a8501a', builder: true },
  { id: 'burger-mushroom', cat: 'burger', name: 'قارچ‌برگر', desc: 'سس قارچ و خامه با پنیر سوئیسی', price: 480000, tags: [], time: 15, glow: '#b8884a', builder: true },
  { id: 'burger-chicken', cat: 'burger', name: 'چیکن‌برگر سوخاری', desc: 'سینه‌ی مرغ سوخاری ترد با سس سیر', price: 410000, tags: [], time: 15, glow: '#e0a03a', builder: true },
  // pasta
  { id: 'pasta-alfredo', cat: 'pasta', name: 'فتوچینی آلفردو', desc: 'سس خامه و پارمزان با مرغ گریل', price: 420000, tags: [], time: 15, glow: '#d8b25a', hot: true },
  { id: 'pasta-bolognese', cat: 'pasta', name: 'اسپاگتی بلونز', desc: 'راگوی گوشت شش‌ساعته با ریحان', price: 440000, tags: [], time: 15, glow: '#a8301a', hot: true },
  { id: 'pasta-penne', cat: 'pasta', name: 'پنه آرابیاتا', desc: 'سس گوجه‌ی تند با فلفل قرمز و سیر', price: 360000, tags: ['spicy', 'veg'], time: 15, glow: '#c83a1a', hot: true },
  { id: 'lasagna', cat: 'pasta', name: 'لازانیا', desc: 'لایه‌های خمیر، راگوی گوشت، بشامل و موتزارلا', price: 490000, tags: ['signature'], time: 20, glow: '#d8822a', hot: true },
  // sandwich
  { id: 'hotdog', cat: 'sandwich', name: 'هات‌داگ ویژه', desc: 'سوسیس دودی ۹۰٪ گوشت با خیارشور و پیاز', price: 290000, tags: [], time: 10, glow: '#c8481e' },
  { id: 'strips', cat: 'sandwich', name: 'فیله سوخاری', desc: 'پنج تکه فیله‌ی مرغ ترد با سس سیر', price: 380000, tags: [], time: 12, glow: '#d8902a' },
  { id: 'fries-special', cat: 'sandwich', name: 'سیب‌زمینی ویژه', desc: 'با سس پنیر چدار و قارچ', price: 220000, tags: ['veg'], time: 10, glow: '#e0a02a' },
  { id: 'fries', cat: 'sandwich', name: 'سیب‌زمینی سرخ‌کرده', desc: 'برش دستی، دوبار سرخ‌شده', price: 150000, tags: ['veg'], time: 8, glow: '#e8a83a' },
  // salad
  { id: 'caesar', cat: 'salad', name: 'سالاد سزار', desc: 'کاهو رومی، مرغ گریل، کروتان و پارمزان', price: 340000, tags: [], time: 10, glow: '#5a8a2a' },
  { id: 'salad-fasl', cat: 'salad', name: 'سالاد فصل', desc: 'سبزیجات تازه‌ی روز با سس لیمو و روغن زیتون', price: 190000, tags: ['veg'], time: 8, glow: '#4a8a26' },
  // cold
  { id: 'doogh', cat: 'cold', name: 'دوغ محلی', desc: 'ماست کیسه‌ای با نعناع و پونه', price: 70000, tags: [], time: 2, glow: '#9aa88a' },
  { id: 'lemonade', cat: 'cold', name: 'لیموناد', desc: 'لیموی تازه‌فشرده و نعناع', price: 140000, tags: [], time: 4, glow: '#d8c24a' },
  { id: 'mojito', cat: 'cold', name: 'موهیتو', desc: 'لیموترش، نعناع و سودا، بدون الکل', price: 170000, tags: [], time: 4, glow: '#7aa84a' },
  { id: 'sekanjabin', cat: 'cold', name: 'شربت سکنجبین', desc: 'سرکه‌ی انگبین با خیار رنده‌شده', price: 120000, tags: [], time: 3, glow: '#a8b84a' },
  { id: 'shake', cat: 'cold', name: 'شیک شکلات', desc: 'بستنی وانیلی و شکلات تلخ', price: 210000, tags: [], time: 5, glow: '#7a3a1a' },
  { id: 'cola', cat: 'cold', name: 'نوشابه', desc: 'قوطی، با یخ و لیمو', price: 50000, tags: [], time: 1, glow: '#6a2a12' },
  { id: 'water', cat: 'cold', name: 'آب معدنی', desc: 'بطری نیم‌لیتری', price: 25000, tags: [], time: 1, glow: '#4a6a7a' },
  // hot
  { id: 'tea', cat: 'hot', name: 'چای با نبات', desc: 'چای لاهیجان دم‌کشیده در قوری', price: 60000, tags: [], time: 3, glow: '#a8320e', hot: true },
  { id: 'tea-saffron', cat: 'hot', name: 'چای زعفرانی', desc: 'چای با زعفران قائنات و هل', price: 95000, tags: ['signature'], time: 4, glow: '#d8601a', hot: true },
  { id: 'tea-borage', cat: 'hot', name: 'دمنوش گل‌گاوزبان', desc: 'با لیمو، رنگش جلوی چشمت عوض می‌شود', price: 90000, tags: [], time: 5, glow: '#6a4aa8', hot: true },
  { id: 'espresso', cat: 'hot', name: 'اسپرسو', desc: 'دبل شات، عربیکای برشته‌ی متوسط', price: 110000, tags: [], time: 3, glow: '#8a4a1a', hot: true },
  { id: 'cappuccino', cat: 'hot', name: 'کاپوچینو', desc: 'اسپرسو با فوم شیر و پودر کاکائو', price: 140000, tags: [], time: 4, glow: '#a86a3a', hot: true },
  { id: 'latte', cat: 'hot', name: 'لاته', desc: 'اسپرسو و شیر بخارداده با لاته‌آرت', price: 150000, tags: [], time: 4, glow: '#c08a5a', hot: true },
  // dessert
  { id: 'sholeh-zard', cat: 'dessert', name: 'شله‌زرد', desc: 'برنج و زعفران و گلاب با دارچین و پسته', price: 130000, tags: ['signature'], time: 3, glow: '#e0a520' },
  { id: 'pudding', cat: 'dessert', name: 'پودینگ زعفران', desc: 'پودینگ گرم زعفرانی با کشمش کاراملی و خرده‌ی بادام', price: 190000, tags: [], time: 6, glow: '#e0a520', recipe: 'sholeh-zard' },
  { id: 'bastani', cat: 'dessert', name: 'بستنی سنتی زعفرانی', desc: 'بستنی گلاب و زعفران با تکه‌های خامه و پسته', price: 160000, tags: [], time: 3, glow: '#e0b030' },
  { id: 'tiramisu', cat: 'dessert', name: 'تیرامیسو', desc: 'ماسکارپونه، قهوه و کاکائو', price: 230000, tags: [], time: 3, glow: '#7a4a2a' },
  { id: 'cheesecake', cat: 'dessert', name: 'چیزکیک', desc: 'چیزکیک نیویورکی با سس آلبالو', price: 240000, tags: [], time: 3, glow: '#a81a3a' },
  { id: 'baklava', cat: 'dessert', name: 'باقلوا', desc: 'لایه‌های نازک خمیر با پسته‌ی کرمان و شربت گلاب', price: 180000, tags: [], time: 3, glow: '#d89a2a' },
];

const SIGNATURE = ['koobideh', 'ghormeh', 'pizza-special', 'zereshk', 'burger-double', 'ash-reshteh'];

// home hero slides (reference 1)
const HERO = [
  { photo: 'hero-kebab', dish: 'soltani', kicker: 'ویژه‌ی امشب', l1: 'منوی', l2: 'سرآشپز', sub: 'کباب سلطانی، چلوی زعفرانی و گوجه‌ی کبابی؛ مستقیم از روی زغال.' },
  { photo: 'hero-zereshk', dish: 'zereshk', kicker: 'پلوی خانگی', l1: 'زرشک', l2: 'و زعفران', sub: 'برنج دم‌کشیده با زرشک ترش و خلال پسته، کنار ران مرغ زعفرانی.' },
  { photo: 'hero-pizza', dish: 'pizza-special', kicker: 'از تنور هیزمی', l1: 'پیتزای', l2: 'داغ', sub: 'پنیری که کش می‌آید. پیتزای خودتان را هم می‌توانید بسازید.' },
  { photo: 'hero-burger', dish: 'burger-double', kicker: 'گریل', l1: 'دبل', l2: 'برگر', sub: 'دو گوشت ۱۵۰ گرمی، پنیر چدار و پیاز کاراملی.' },
];

// the kitchen stack on the home page (the GSAP flip card)
const KITCHEN = [
  { photo: 'k-spread', alt: 'سفره‌ی ایرانی', when: '۱۳۸۲ · آغاز', title: 'یک تنور در کوچه‌ی بهار', caption: 'زعفران با شش میز و یک تنور هیزمی شروع شد؛ با دستور قورمه‌ی مادربزرگ که هنوز یک کلمه‌اش عوض نشده.' },
  { photo: 'k-chef', alt: 'سرآشپز در حال چیدن بشقاب', when: 'دست سرآشپز', title: 'هر بشقاب، دو بار', caption: 'هیچ بشقابی بدون نگاه دوم سرآشپز سر میز نمی‌رود. قانونی که از روز اول داشتیم.' },
  { photo: 'k-saffron', alt: 'زعفران', when: 'ابداع ما', title: 'کره‌ی زعفران دودی', caption: 'کره‌ای که روی کباب سلطانی آب می‌شود، با زعفران دم‌کرده و کمی دود زغال؛ دستوری که فقط در آشپزخانه‌ی ما ساخته می‌شود.' },
  { photo: 'k-spice', alt: 'حبوبات و ادویه', when: 'هر صبح', title: 'ادویه‌ی خودمان', caption: 'ادویه‌ها را خودمان می‌خریم، خودمان برشته می‌کنیم و خودمان آسیاب؛ نه بسته‌ی آماده، نه رنگ.' },
  { photo: 'k-samovar', alt: 'سماور برنجی', when: 'آخر شب', title: 'چای سماور', caption: 'چای در سماور برنجی دم می‌کشد، همان‌طور که بیست‌وچند سال پیش در همین کوچه دم می‌کشید.' },
];

// ingredients that can be taken off or added, with the icon each one uses
const ING = {
  'سماق': 'sumac', 'پیاز': 'onion', 'گوجه کبابی': 'tomato', 'کره': 'butter', 'لیمو عمانی': 'lime', 'سیب‌زمینی سرخ‌کرده': 'fries', 'زرشک': 'barberry', 'پسته': 'pistachio', 'خلال بادام': 'almond',
  'نعناع داغ': 'mint', 'گردو': 'walnut', 'پیاز داغ': 'onion-fried', 'زیتون': 'olive', 'فلفل دلمه': 'pepper', 'قارچ': 'mushroom', 'خیارشور': 'pickle', 'گوجه': 'tomato', 'کاهو': 'lettuce', 'سس': 'sauce',
  'پارمزان': 'parmesan', 'جعفری': 'herb', 'فلفل سیاه': 'pepper-black', 'کروتان': 'crouton', 'یخ': 'ice', 'نبات': 'nabat', 'شکر': 'sugar', 'دارچین': 'cinnamon', 'گلبرگ گل محمدی': 'rose',
  'سیخ اضافه': 'skewer', 'گوجه کبابی اضافه': 'tomato', 'ته‌دیگ': 'tahdig', 'کره و زعفران بیشتر': 'saffron', 'گوشت بیشتر': 'meat', 'ته‌دیگ سیب‌زمینی': 'tahdig', 'برنج اضافه': 'rice', 'مرغ اضافه': 'chicken',
  'نان سنگک': 'bread', 'کشک بیشتر': 'kashk', 'پنیر اضافه': 'cheese', 'قارچ اضافه': 'mushroom', 'هالوپینو': 'jalapeno', 'خمیر نازک': 'dough', 'گوشت دوبل': 'patty', 'پنیر چدار': 'cheese', 'قارچ گریل': 'mushroom',
  'سیب‌زمینی بزرگ': 'fries', 'مرغ گریل': 'chicken', 'پارمزان بیشتر': 'parmesan', 'نان سیر': 'bread', 'سس مخصوص': 'sauce', 'پنیر': 'cheese', 'سس کنار': 'sauce', 'لیوان بزرگ': 'glass', 'شیر گیاهی': 'milk', 'شات اضافه': 'coffee', 'اسکوپ بستنی': 'icecream',
};

const TAG_LABEL = { signature: 'پیشنهاد سرآشپز', spicy: 'تند', veg: 'گیاهی' };
