'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ReviewModal, ReviewItem } from '@/components/review-modal'
import { OrderingProvider, useOrdering } from '@/components/ordering/provider'
import { FeaturedSection, FullMenu, CartBar } from '@/components/ordering/menu-section'
import { ItemSheet } from '@/components/ordering/item-sheet'
import { CartSheet } from '@/components/ordering/cart-sheet'
import { ServiceFab } from '@/components/ordering/service-fab'
import { BASE_PATH } from '@/lib/utils'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Edit2,
  Flame,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  Phone,
  Plus,
  ShoppingBag,
  Sliders,
  Star,
  X,
  Zap,
  ArrowUp,
  Share2,
  RotateCcw,
  Beef,
} from 'lucide-react'

const LocationMap = dynamic(
  () => import('@/components/location-map').then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '100%',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#18181b',
          color: '#a1a1aa',
        }}
      >
        <span>Loading interactive map...</span>
      </div>
    ),
  }
)

const defaultWa =
  'https://wa.me/9647500000000?text=Hi%20Smashed%20Burger%2C%20I%27d%20like%20to%20order.'
const heroBackgrounds = [
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/smashed%20burger%20infront-Lq3QmBR7UEDrDRqgNW2WneUum382sA.jpg',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/smashed%20burger1-uwhgxZoQxNwLcddFXz9vn4cUx8qBH7.jpg',
]

const copy = {
  EN: {
    order: 'Order now',
    menu: 'View menu',
    home: 'Home',
    about: 'About',
    reviews: 'Reviews',
    contact: 'Contact',
    eyebrowLocation: 'ERBIL · KURDISTAN',
    heroHead1: "ERBIL'S",
    heroHead2: 'BOLDEST',
    heroHead3: 'SMASH BURGER',
    heroCopy:
      'Fresh beef smashed on a screaming-hot grill. Crispy edges. Oozing cheese. In your hands in 5 minutes.',
    trustReviews: '500+ reviews',
    trustDelivery: 'delivery',
    trustBeef: 'fresh beef',
    systemTitle: 'THE SMASHED SYSTEM',
    systemHead: 'BUILT LIKE A',
    systemHeadSpan: 'GOOD PRODUCT.',
    systemCopy:
      'A small-batch burger workflow with a big-screen attitude. Every layer is intentional: crisp edges, warm bread, sharp contrast and zero wasted motion.',
    featuredEyebrow: 'THE GOOD STUFF',
    featuredHead: 'BUILT FOR',
    featuredHeadSpan: 'BIG CRAVINGS.',
    seeFullMenu: 'See full menu',
    whyTitle: 'WHY WE SMASH',
    whyHead: 'NO SHORTCUTS.',
    whyHeadSpan: 'JUST FLAVOUR.',
    whyCopy:
      'We start with 100% fresh local beef, a screaming hot cast-iron grill and a few minutes to let the magic happen. That’s it. That’s the secret.',
    fullMenuTitle: 'THE FULL LINEUP',
    fullMenuHead: 'MAKE IT A',
    fullMenuHeadSpan: 'MEAL.',
    writeReview: 'Write a Review',
    reviewsEyebrow: 'THE WORD ON THE STREET',
    reviewsHead: 'LOVE AT',
    reviewsHeadSpan: 'FIRST BITE.',
    contactEyebrow: 'FIND US IN ERBIL',
    contactHead: 'COME',
    contactHeadSpan: 'HUNGRY.',
    getDirections: 'Get directions',
    aboutTitle: 'OUR STORY',
    aboutHead: 'THE SMASH',
    aboutHeadSpan: 'MATTERS.',
    aboutP1: 'Smashed Burger started with one obsession: the perfect smash. We hand-press 100% fresh local beef, smash it hard on cast iron, and let the Maillard reaction do the magic.',
    aboutP2: "No fillers. No shortcuts. Just Erbil's crispiest, juiciest burger — served fast, served hot, served with pride.",
    aboutQuote: "“Good burgers don't need explaining.”",
    aboutAuthor: "— The Smashed Burger crew",
    aboutAlt: "Smashed burger on the grill",
    estYear: "EST. 2024",
    erbil: "ERBIL",
  },
  KU: {
    order: 'داواکاری بکە',
    menu: 'مێنیو ببینە',
    home: 'سەرەتا',
    about: 'دەربارە',
    reviews: 'هەڵسەنگاندن',
    contact: 'ناونیشان',
    eyebrowLocation: 'هەولێر · کوردستان',
    heroHead1: 'بەهێزترین',
    heroHead2: 'سمەش بەرگەری',
    heroHead3: 'هەولێر',
    heroCopy:
      'گۆشتی فرێش لەسەر گریڵی زۆر داغ دەکرێتە سمەش. لێواری کڕیسپی، پەنیری تواوە. لە ٥ خولەکدا لە دەستتایە.',
    trustReviews: '٥٠٠+ هەڵسەنگاندن',
    trustDelivery: 'گەیاندنی خێرا',
    trustBeef: 'گۆشتی خۆماڵی فرێش',
    systemTitle: 'سیستەمی سمەشد',
    systemHead: 'دروستکراو بە',
    systemHeadSpan: 'بەرزترین کوالیتی.',
    systemCopy:
      'هەموو چینێک لە بەرگەرەکەمان بە بەرنامەیە: لێواری کڕیسپی، نانی گەرم، پەنیری ئەمریکی ئەسڵی و خێرایی لە ئامادەکردن.',
    featuredEyebrow: 'باشترینەکانمان',
    featuredHead: 'بۆ ئارەزووی',
    featuredHeadSpan: 'تامی ڕاستەقینە.',
    seeFullMenu: 'بینینی هەموو مێنیو',
    whyTitle: 'بۆچی سمەش؟',
    whyHead: 'بەبێ فێڵ و تەڵەکە.',
    whyHeadSpan: 'تەنها تامی ئەسڵ.',
    whyCopy:
      'بە گۆشتی خۆماڵی ١٠٠٪ دەست پێدەکەین، لەسەر گریڵی ئاسن بە هێز دەیپەستێوین. ئەوەیە نهێنی بەرگەرە بەتامەکەمان.',
    fullMenuTitle: 'تەواوی مێنیو',
    fullMenuHead: 'ژەمەکەت بکە بە',
    fullMenuHeadSpan: 'تەواو و بێ وێنە.',
    writeReview: 'هەڵسەنگاندن بنووسە',
    reviewsEyebrow: 'ڕای کڕیارانمان',
    reviewsHead: 'خۆشەویستی لە',
    reviewsHeadSpan: 'یەکەم پارووەوە.',
    contactEyebrow: 'سەردانمان بکە لە هەولێر',
    contactHead: 'بە برسێتی',
    contactHeadSpan: 'وەرن.',
    getDirections: 'نیشاندانی ڕێگا',
    aboutTitle: 'چیرۆکی ئێمە',
    aboutHead: 'سمەشکردن',
    aboutHeadSpan: 'گرنگە.',
    aboutP1: 'سمەش بەرگەر بە یەک ئامانج دەستیپێکرد: باشترین سمەش. ئێمە ١٠٠٪ گۆشتی فرێشی خۆماڵی بەکاردەهێنین، لەسەر ئاسنی داغ دەیپەستێوین، و ڕێگە دەدەین کارلێکی مایارد جادوەکەی خۆی بکات.',
    aboutP2: 'بێ فێڵ. بێ کورتکردنەوە. تەنها کڕیسپیترین و بەتامترین بەرگەری هەولێر — بە خێرایی و گەرمی پێشکەشتان دەکرێت.',
    aboutQuote: '“بەرگەری باش پێویستی بە ڕوونکردنەوە نییە.”',
    aboutAuthor: '— ستافی سمەش بەرگەر',
    aboutAlt: 'سمەش بەرگەر لەسەر گریڵ',
    estYear: 'دامەزراوی ٢٠٢٤',
    erbil: 'هەولێر',
  },
  AR: {
    order: 'اطلب الآن',
    menu: 'شاهد القائمة',
    home: 'الرئيسية',
    about: 'قصتنا',
    reviews: 'التقييمات',
    contact: 'اتصل بنا',
    eyebrowLocation: 'أربيل · كوردستان',
    heroHead1: 'أقوى برجر',
    heroHead2: 'سماش',
    heroHead3: 'في أربيل',
    heroCopy:
      'لحم طازج يُكبس على شواية كاست آيرون حارة جداً. أطراف مقرمشة وجبنة ذائبة. جاهز بين يديك في 5 دقائق.',
    trustReviews: '500+ تقييم',
    trustDelivery: 'توصيل سريع',
    trustBeef: 'لحم بقري محلي 100%',
    systemTitle: 'نظام سماش المتقن',
    systemHead: 'صُنع بدقة',
    systemHeadSpan: 'وعناية فائقة.',
    systemCopy:
      'كل طبقة مدروسة بعناية: قرمشة الحواف، دفء الخبز، وتوازن الصوصات الأمريكية بدون أي هدر.',
    featuredEyebrow: 'الأكثر طلباً',
    featuredHead: 'مصمم خصيصاً',
    featuredHeadSpan: 'لإرضاء شهيتك.',
    seeFullMenu: 'مشاهدة كامل القائمة',
    whyTitle: 'لماذا سماش؟',
    whyHead: 'بدون مقدمات،',
    whyHeadSpan: 'طعم حقيقي فقط.',
    whyCopy:
      'نبدأ بلحم محلي طازج 100%، كبس قوي على الصاج الحار، ودقائق معدودة لتكتمل المعادلة.',
    fullMenuTitle: 'القائمة الكاملة',
    fullMenuHead: 'اجعلها وجبة',
    fullMenuHeadSpan: 'متكاملة.',
    writeReview: 'أضف تقييمك',
    reviewsEyebrow: 'آراء زبائننا',
    reviewsHead: 'حب من أول',
    reviewsHeadSpan: 'قضمة.',
    contactEyebrow: 'موقعنا في أربيل',
    contactHead: 'تعال وأنت',
    contactHeadSpan: 'جائع.',
    getDirections: 'الاتجاهات على الخريطة',
    aboutTitle: 'قصتنا',
    aboutHead: 'السماش',
    aboutHeadSpan: 'يصنع الفرق.',
    aboutP1: 'بدأت سماش برجر بشغف واحد: السماش المثالي. نستخدم لحم بقري محلي طازج 100%، نكبسه بقوة على مقلاة الحديد الزهر، وندع تفاعل مايارد يصنع السحر.',
    aboutP2: 'بدون إضافات. بدون اختصارات. فقط ألذ وأكثر برجر مقرمش وعصاري في أربيل — يُقدم سريعاً، وساخناً، وبكل فخر.',
    aboutQuote: '“البرجر الجيد لا يحتاج إلى شرح.”',
    aboutAuthor: '— فريق سماش برجر',
    aboutAlt: 'سماش برجر على الشواية',
    estYear: 'تأسس ٢٠٢٤',
    erbil: 'أربيل',
  },
}

function formatPrice(num: number): string {
  return num.toLocaleString('en-US')
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Sara M.',
    stars: 5,
    comment:
      'Honestly the best smash burger I’ve had in Erbil. Crispy edges, perfect sauce, and it arrived scorching hot in Gulan.',
    date: 'Yesterday',
    favoriteItem: 'Double Cheese Smash',
  },
  {
    id: 'rev-2',
    name: 'Alan K.',
    stars: 5,
    comment:
      'The Double Cheese is unreal. Fast service, generous portions, and the staff at The Boulevard is lovely.',
    date: '3 days ago',
    favoriteItem: 'Double Cheese Smash',
  },
  {
    id: 'rev-3',
    name: 'Dilan R.',
    stars: 5,
    comment:
      'Finally a burger place that understands the assignment! The spicy one with jalapenos and crispy onions is addictive.',
    date: '1 week ago',
    favoriteItem: 'Spicy Erbil Smash',
  },
]

export default function Page() {
  const [lang, setLangState] = useState<'EN' | 'KU' | 'AR'>('EN')
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sb_lang')
      if (saved === 'EN' || saved === 'KU' || saved === 'AR') setLangState(saved)
    } catch { /* ignore */ }
  }, [])
  const setLang = (l: 'EN' | 'KU' | 'AR') => {
    setLangState(l)
    try { localStorage.setItem('sb_lang', l) } catch { /* ignore */ }
  }
  return (
    <OrderingProvider lang={lang}>
      <PageInner lang={lang} setLang={setLang} />
    </OrderingProvider>
  )
}

function PageInner({ lang, setLang }: { lang: 'EN' | 'KU' | 'AR'; setLang: (l: 'EN' | 'KU' | 'AR') => void }) {
  const ordering = useOrdering()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [heroBackground, setHeroBackground] = useState(0)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(INITIAL_REVIEWS)
  const [reviewFilter, setReviewFilter] = useState<'All' | '5' | 'recent'>('All')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const totalCartCount = ordering.cartCount
  const setIsCartOpen = ordering.setCartOpen

  const t = copy[lang]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroBackground((current) => (current + 1) % heroBackgrounds.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [])

  const rtl = lang !== 'EN'

  // Reviews calculations
  const totalReviewsCount = 500 + (reviewsList.length - INITIAL_REVIEWS.length)
  const avgRating = useMemo(() => {
    const sum = reviewsList.reduce((acc, r) => acc + r.stars, 0)
    return (sum / (reviewsList.length || 1)).toFixed(1)
  }, [reviewsList])

  const filteredReviews = useMemo(() => {
    if (reviewFilter === '5') {
      return reviewsList.filter((r) => r.stars === 5)
    }
    return reviewsList
  }, [reviewsList, reviewFilter])

  const wa = defaultWa

  const handleNewReviewSubmit = (review: ReviewItem) => {
    setReviewsList((prev) => [review, ...prev])
    setToastMessage('Thank you! Your review is live.')
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleOrderHeroClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (ordering.cartCount > 0) setIsCartOpen(true)
    else document.getElementById('full-menu')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="site-shell">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#171717] text-white px-4 py-2.5 rounded-[4px] border border-[#D95B32] shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200"
          role="status"
        >
          <span className="w-5 h-5 rounded-full bg-[#D95B32] text-[#171717] flex items-center justify-center flex-shrink-0">
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => {
              setToastMessage(null)
              setIsCartOpen(true)
            }}
            className="text-[10px] font-bold text-[#D9AA55] uppercase tracking-[0.5px] underline hover:text-white ml-1"
          >
            View Tray
          </button>
        </div>
      )}

      {/* Navigation */}
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Main navigation">
          <a href="#home" className="brand" aria-label="Smashed Burger home">
            <span className="brand-mark">
              <Flame size={19} fill="currentColor" />
            </span>
            <span>
              SMASHED
              <br />
              <b>BURGER</b>
            </span>
          </a>
          <div className="nav-links">
            <a href="#home">{t.home}</a>
            <a href="#menu">{t.menu}</a>
            <a href="#about">{t.about}</a>
            <a href="#reviews">{t.reviews}</a>
            <a href="#contact">{t.contact}</a>
          </div>
          <div className="nav-actions">
            {/* Language switcher */}
            <div className="languages">
              {(['EN', 'KU', 'AR'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setLang(item)}
                  className={lang === item ? 'active' : ''}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Cart / Tray Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`View your order tray with ${totalCartCount} items`}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-white/15"
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline">Tray</span>
              {totalCartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#D95B32] text-[#171717] flex items-center justify-center text-[10px] font-black">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Order Now CTA */}
            <button
              type="button"
              onClick={handleOrderHeroClick}
              className="button button-orange desktop-order cursor-pointer"
            >
              {t.order}
              <ArrowUpRight size={16} />
            </button>

            {/* Mobile menu toggle */}
            <button
              className="mobile-toggle"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X /> : <MenuIcon />}
            </button>
          </div>
        </nav>
        {mobileOpen && (
          <div className="mobile-menu">
            <a href="#home" onClick={() => setMobileOpen(false)}>
              {t.home}
            </a>
            <a href="#menu" onClick={() => setMobileOpen(false)}>
              {t.menu}
            </a>
            <a href="#about" onClick={() => setMobileOpen(false)}>
              {t.about}
            </a>
            <a href="#reviews" onClick={() => setMobileOpen(false)}>
              {t.reviews}
            </a>
            <a href="#contact" onClick={() => setMobileOpen(false)}>
              {t.contact}
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                setIsCartOpen(true)
              }}
              className="text-left font-bold text-lg text-[#D9AA55] uppercase py-2 flex items-center gap-2"
            >
              <ShoppingBag size={20} />
              View Order Tray ({totalCartCount} items)
            </button>
            <button
              type="button"
              className="button button-orange w-full"
              onClick={(e) => {
                setMobileOpen(false)
                handleOrderHeroClick(e)
              }}
            >
              {t.order} <ArrowUpRight size={16} />
            </button>
          </div>
        )}
      </header>

      <main>
        {/* HERO SECTION */}
        <section id="home" className="hero">
          <div
            className="hero-image"
            style={{
              backgroundImage: `linear-gradient(90deg, #101010 0%, #101010d9 35%, #10101055 70%, #10101022), url("${heroBackgrounds[heroBackground]}")`,
            }}
            aria-hidden="true"
          />
          <div className="hero-content container">
            <p className="eyebrow">
              <span /> {t.eyebrowLocation} <span />
            </p>
            <h1>
              {t.heroHead1}
              <br />
              <em>{t.heroHead2}</em>
              <br />
              {t.heroHead3}
            </h1>
            <p className="hero-copy">{t.heroCopy}</p>
            <div className="hero-buttons">
              <button
                type="button"
                className="button button-orange cursor-pointer"
                onClick={handleOrderHeroClick}
              >
                {t.order} <ArrowUpRight size={17} />
              </button>
              <a className="button button-outline" href="#menu">
                {t.menu} <ChevronDown size={17} />
              </a>
            </div>
            <div className="trust-row">
              <a
                href="#reviews"
                className="hover:opacity-80 transition-opacity flex items-center gap-1.5"
              >
                <Star size={15} fill="currentColor" /> <b>{avgRating}</b>{' '}
                <small>{t.trustReviews}</small>
              </a>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="hover:opacity-80 transition-opacity flex items-center gap-1.5 text-left"
              >
                <Zap size={15} fill="currentColor" /> <b>30 min</b>{' '}
                <small>{t.trustDelivery}</small>
              </button>
              <a
                href="#about"
                className="hover:opacity-80 transition-opacity flex items-center gap-1.5"
              >
                <span className="beef-dot" /> <b>100%</b> <small>{t.trustBeef}</small>
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOrderHeroClick}
            className="hero-sticker cursor-pointer hover:scale-110 active:scale-95 transition-transform"
            title="Order now"
          >
            SMASH
            <br />
            <span>IT</span>
            <br />
            HOT
          </button>
        </section>

        {/* TICKER */}
        <section className="ticker">
          <div>
            FRESH DAILY <span>✦</span> SMASHED TO ORDER <span>✦</span> ERBIL&apos;S FAVOURITE{' '}
            <span>✦</span> FRESH DAILY <span>✦</span> SMASHED TO ORDER <span>✦</span>
          </div>
        </section>

        {/* DEVELOPER / SYSTEM PANEL */}
        <section className="developer-panel">
          <div className="container dev-panel-grid">
            <div>
              <p className="eyebrow dark">{t.systemTitle}</p>
              <h2>
                {t.systemHead}
                <br />
                <span>{t.systemHeadSpan}</span>
              </h2>
              <p className="dev-copy">{t.systemCopy}</p>
            </div>
            <div className="dev-specs">
              <div>
                <span>01 / INPUT</span>
                <strong>100% local beef</strong>
              </div>
              <div>
                <span>02 / PROCESS</span>
                <strong>Cast-iron smash</strong>
              </div>
              <div>
                <span>03 / OUTPUT</span>
                <strong>Hot in 5 minutes</strong>
              </div>
              <div>
                <span>STATUS</span>
                <strong className="status-live">
                  <i /> GRILL ONLINE
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED BURGERS */}
        <FeaturedSection
          eyebrow={t.featuredEyebrow}
          title={<>{t.featuredHead}<br /><span>{t.featuredHeadSpan}</span></>}
          link={<a href="#full-menu" className="text-link">{t.seeFullMenu} <ArrowUpRight size={17} /></a>}
        />

        <section className="marquee-dark">
          <div className="container split-callout">
            <div>
              <p className="eyebrow">{t.whyTitle}</p>
              <h2>
                {t.whyHead}
                <br />
                <span>{t.whyHeadSpan}</span>
              </h2>
            </div>
            <p className="callout-copy">{t.whyCopy}</p>
          </div>
        </section>

        {/* FULL LINEUP MENU */}
                <FullMenu
          eyebrow={t.fullMenuTitle}
          title={<>{t.fullMenuHead}<br /><span>{t.fullMenuHeadSpan}</span></>}
        />

        {/* ABOUT SECTION */}
        <section id="about" className="about-section">
          <div className="container about-grid">
            <div className="about-photo">
              <img src={`${BASE_PATH}/smashed-burger-hero.png`} alt={t.aboutAlt} />
              <div className="photo-label">
                {t.estYear}
                <br />
                <b>{t.erbil}</b>
              </div>
            </div>
            <div className="about-copy">
              <p className="eyebrow dark">{t.aboutTitle}</p>
              <h2>
                {t.aboutHead}
                <br />
                <span>{t.aboutHeadSpan}</span>
              </h2>
              <p>
                {t.aboutP1}
              </p>
              <p>
                {t.aboutP2}
              </p>
              <blockquote>
                {t.aboutQuote}
                <cite>{t.aboutAuthor}</cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* REVIEWS SECTION */}
        <section id="reviews" className="section container reviews-section">
          <div className="review-top flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div>
              <p className="eyebrow dark">{t.reviewsEyebrow}</p>
              <h2>
                {t.reviewsHead}
                <br />
                <span>{t.reviewsHeadSpan}</span>
              </h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="rating">
                <strong>{avgRating}</strong>
                <div>
                  <span className="stars-row">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} fill="currentColor" />)}</span>
                  <small>Google rating · {totalReviewsCount}+ reviews</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="px-4 py-2.5 rounded-lg bg-[#D95B32] hover:bg-[#b84727] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-[#D95B32]/20 active:scale-95"
              >
                <Star size={14} fill="currentColor" />
                <span>{t.writeReview}</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setReviewFilter('All')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                reviewFilter === 'All'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
              }`}
            >
              All Reviews ({reviewsList.length})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter('5')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                reviewFilter === '5'
                  ? 'bg-[#D9AA55] text-black'
                  : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
              }`}
            >
              <Star size={12} fill="currentColor" className="inline -mt-0.5" /> 5 Stars ({reviewsList.filter((r) => r.stars === 5).length})
            </button>
          </div>

          <div className="review-grid mt-4">
            {filteredReviews.map((review) => (
              <article key={review.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="stars text-[#D9AA55]">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} size={13} fill={i < review.stars ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    {review.date && (
                      <span className="text-[11px] text-neutral-500">{review.date}</span>
                    )}
                  </div>
                  <p>“{review.comment}”</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <b>— {review.name}</b>
                  {review.favoriteItem && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#D9AA55] font-mono">
                      {review.favoriteItem}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* VISIT / CONTACT SECTION */}
        <section id="contact" className="visit-section">
          <div className="container visit-grid">
            <div>
              <p className="eyebrow">{t.contactEyebrow}</p>
              <h2>
                {t.contactHead}
                <br />
                <span>{t.contactHeadSpan}</span>
              </h2>
              <div className="details">
                <a
                  href="https://maps.google.com/?q=Smash%27d+Burger,+Gulan+Street,+The+Boulevard,+Erbil,+Iraq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#D9AA55] transition-colors flex items-start gap-2 text-inherit"
                >
                  <MapPin size={18} className="flex-shrink-0 mt-1" />
                  <span>
                    Smash&apos;d Burger, Gulan Street
                    <br />
                    <small>The Boulevard, Erbil 44001</small>
                  </span>
                </a>
                <p>
                  <Clock3 size={18} className="flex-shrink-0 mt-1" />
                  <span>
                    Sat–Thu: 11:00 – 00:00
                    <br />
                    <small>Friday: 14:00 – 00:00</small>
                  </span>
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="tel:+9647500000000"
                    className="hover:text-[#D9AA55] transition-colors flex items-center gap-2 text-inherit"
                  >
                    <Phone size={18} />
                    <span>+964 750 000 0000</span>
                  </a>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-400 font-bold hover:underline"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <a
                  className="button button-orange"
                  href="https://maps.google.com/?q=Smash%27d+Burger,+Gulan+Street,+The+Boulevard,+Erbil,+Iraq"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.getDirections} <ArrowUpRight size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="button button-outline cursor-pointer"
                >
                  {lang === 'KU' ? 'داواکاری گەیاندن' : lang === 'AR' ? 'طلب توصيل' : 'Order Delivery'}
                </button>
              </div>
            </div>
            <div className="map-card">
              <div className="map-grid">
                <LocationMap />
              </div>
              <div className="map-caption">
                ERBIL, IRAQ <span>OPEN NOW</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Tray Indicator when items exist */}
      
      {/* FOOTER */}
      <footer>
        <div className="container footer-grid">
          <div>
            <a href="#home" className="brand footer-brand">
              <span className="brand-mark">
                <Flame size={19} fill="currentColor" />
              </span>
              <span>
                SMASHED
                <br />
                <b>BURGER</b>
              </span>
            </a>
            <p className="mt-2 text-neutral-400">
              Bold burgers. Big flavour.
              <br />
              Made in Erbil.
            </p>
          </div>

          <div className="space-y-2 text-sm text-neutral-300">
            <h4 className="font-bold text-white uppercase text-xs tracking-wider">Quick Links</h4>
            <div className="flex flex-col gap-1.5 text-xs">
              <a href="#home" className="hover:text-[#D9AA55] transition-colors">
                Home
              </a>
              <a href="#menu" className="hover:text-[#D9AA55] transition-colors">
                Menu & Customizer
              </a>
              <a href="#about" className="hover:text-[#D9AA55] transition-colors">
                About The Smash
              </a>
              <a href="#reviews" className="hover:text-[#D9AA55] transition-colors">
                Customer Reviews
              </a>
              <a href="#contact" className="hover:text-[#D9AA55] transition-colors">
                Find Us on Gulan St
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-xs tracking-wider">Socials</h4>
            <div className="socials">
              <a
                href="https://instagram.com/smashedburger.erbil"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                instagram
              </a>
              <a
                href="https://tiktok.com/@smashedburger.erbil"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                tiktok
              </a>
              <a
                href="https://facebook.com/smashedburger.erbil"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                facebook
              </a>
            </div>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#D9AA55] hover:text-white transition-colors"
            >
              <ArrowUp size={14} /> Back to top
            </button>
          </div>

          <div className="copyright text-neutral-400">
            © 2024–2026 Smashed Burger Erbil · All rights reserved.
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Action Button */}
      <a
        className="whatsapp"
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order on WhatsApp"
      >
        <MessageCircle size={24} fill="currentColor" />
      </a>

      {/* Ordering: item customizer, tray, service requests */}
      <ItemSheet />
      <CartSheet />
      <CartBar />
      <ServiceFab />

      {/* Customer Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitReview={handleNewReviewSubmit}
        lang={lang}
      />

    </div>
  )
}
