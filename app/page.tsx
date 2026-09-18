'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  BurgerCustomizerModal,
  BurgerItem,
  CustomizedBurgerOrder,
} from '@/components/burger-customizer-modal'
import { CartDrawer } from '@/components/cart-drawer'
import { ReviewModal, ReviewItem } from '@/components/review-modal'
import { MenuManagerModal } from '@/components/menu-manager-modal'
import { StockIndicator } from '@/components/stock-indicator'
import {
  INITIAL_SIMULATED_INVENTORY,
  getInventoryStock,
  deductStock,
  restoreStock,
  SimulatedInventory,
} from '@/lib/inventory'
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

const featured: BurgerItem[] = [
  {
    name: 'OG Smash',
    desc: 'Single smashed beef patty with American cheese, house sauce, pickles, and caramelized onions.',
    price: '8,500',
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80',
    badge: 'Bestseller',
    category: 'Meat Burgers',
  },
  {
    name: 'All American',
    desc: 'Single smashed beef patty, American cheese, ketchup, mustard, raw onions, pickles, and house sauce.',
    price: '8,500',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
    badge: 'Classic',
    category: 'Meat Burgers',
  },
  {
    name: 'Golden Crunch',
    desc: 'Crispy chicken, American cheese, lettuce, tomato, and house sauce.',
    price: '7,500',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=800&auto=format&fit=crop&q=80',
    badge: 'Crispy Favorite',
    category: 'Chicken Burgers',
  },
  {
    name: 'Dynamite Shrimps (7 pcs)',
    desc: 'Seven crispy shrimps tossed in a creamy spicy dynamite sauce.',
    price: '9,500',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80',
    badge: 'Hot 🌶️',
    spicy: true,
    category: 'Sides',
  },
]

export type MenuCategory = 'Meat Burgers' | 'Chicken Burgers' | 'Sides' | 'Fries' | 'Drinks'

const fullMenuData: Record<
  MenuCategory,
  Array<BurgerItem>
> = {
  'Meat Burgers': [
    {
      name: 'All American',
      desc: 'Single smashed beef patty, American cheese, ketchup, mustard, raw onions, pickles, and house sauce.',
      price: '8,500',
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
      category: 'Meat Burgers',
    },
    {
      name: 'OG Smash',
      desc: 'Single smashed beef patty with American cheese, house sauce, pickles, and caramelized onions.',
      price: '8,500',
      badge: 'SIGNATURE',
      image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80',
      category: 'Meat Burgers',
    },
    {
      name: 'Jalapeño',
      desc: 'Single smashed beef, American cheese, house sauce, caramelized onions, and fresh jalapeños.',
      price: '8,500',
      badge: 'SPICY 🌶️',
      spicy: true,
      image: 'https://images.unsplash.com/photo-1582196016295-f8c8bd4b3e99?w=800&auto=format&fit=crop&q=80',
      category: 'Meat Burgers',
    },
  ],
  'Chicken Burgers': [
    {
      name: 'Golden Crunch',
      desc: 'Crispy golden fried chicken, American cheese, crisp lettuce, fresh tomato, and house sauce.',
      price: '7,500',
      badge: 'CRUNCHY',
      image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=800&auto=format&fit=crop&q=80',
      category: 'Chicken Burgers',
    },
    {
      name: 'Hot Chicken',
      desc: 'Crispy fried chicken, American cheese, lettuce, tomato, and fiery house spicy sauce.',
      price: '7,500',
      badge: 'HOT & SPICY 🌶️',
      spicy: true,
      image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&auto=format&fit=crop&q=80',
      category: 'Chicken Burgers',
    },
    {
      name: 'Sweet Heat',
      desc: 'Crispy chicken, American cheese, lettuce, tomato, and sweet spicy chili glaze sauce.',
      price: '7,500',
      badge: 'SWEET & HOT 🌶️',
      spicy: true,
      image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80',
      category: 'Chicken Burgers',
    },
  ],
  Sides: [
    {
      name: 'Crispy Chicken Tenders (5 pcs)',
      desc: 'Five golden crispy chicken tenders, crunchy outside and juicy tender inside with house dip.',
      price: '8,000',
      badge: '5 PCS',
      image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80',
      category: 'Sides',
    },
    {
      name: 'Dynamite Shrimps (7 pcs)',
      desc: 'Seven crispy shrimps tossed in a creamy fiery spicy dynamite glaze sauce.',
      price: '9,500',
      badge: '7 PCS · 🌶️',
      spicy: true,
      image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80',
      category: 'Sides',
    },
    {
      name: 'Jalapeño Poppers (7 pcs)',
      desc: 'Seven crispy jalapeños filled with melted molten cheese, crisp & packed with flavor.',
      price: '5,500',
      badge: '7 PCS · 🌶️',
      spicy: true,
      image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&auto=format&fit=crop&q=80',
      category: 'Sides',
    },
    {
      name: 'Chicken Popcorn',
      desc: 'Bite-sized seasoned crispy chicken bites, delicious & perfect for sharing.',
      price: '5,500',
      badge: 'SNACK',
      image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&auto=format&fit=crop&q=80',
      category: 'Sides',
    },
    {
      name: 'Loaded Fries',
      desc: 'Crispy golden fries topped with melted cheddar sauce, caramelized onions, jalapeños, and house sauce.',
      price: '7,500',
      badge: 'LOADED 🌶️',
      spicy: true,
      image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=800&auto=format&fit=crop&q=80',
      category: 'Sides',
    },
  ],
  Fries: [
    {
      name: 'Classic Fries',
      desc: 'Crispy golden French fries seasoned with sea salt and fried to order.',
      price: '3,000',
      badge: 'CRISPY',
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&auto=format&fit=crop&q=80',
      category: 'Fries',
    },
    {
      name: 'Curly Fries',
      desc: 'Spiraled golden crispy seasoned curly fries with signature spices.',
      price: '3,500',
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&auto=format&fit=crop&q=80',
      category: 'Fries',
    },
    {
      name: 'Seasoned Fries',
      desc: 'Crispy golden fries tossed in our fragrant cajun and herb spice blend.',
      price: '3,500',
      badge: 'CAJUN SPICE',
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=80',
      category: 'Fries',
    },
  ],
  Drinks: [
    {
      name: 'Pepsi',
      desc: 'Ice-cold 330ml chilled Pepsi can.',
      price: '1,500',
      badge: 'CHILLED',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80',
      category: 'Drinks',
    },
    {
      name: '7UP',
      desc: 'Crisp, refreshing 330ml lemon-lime soda can.',
      price: '1,500',
      badge: 'REFRESHING',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80',
      category: 'Drinks',
    },
    {
      name: 'Mirinda',
      desc: 'Vibrant chilled 330ml citrus orange soda can.',
      price: '1,500',
      badge: 'ORANGE',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80',
      category: 'Drinks',
    },
    {
      name: 'Mineral Water',
      desc: 'Pure mountain natural spring water bottle served chilled or room temp.',
      price: '1,000',
      badge: 'PURE',
      image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop&q=80',
      category: 'Drinks',
    },
  ],
}

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
  const [lang, setLang] = useState<'EN' | 'KU' | 'AR'>('EN')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [category, setCategory] = useState<MenuCategory>('Meat Burgers')
  const [heroBackground, setHeroBackground] = useState(0)

  // Customization, Cart & Reviews State
  const [cartItems, setCartItems] = useState<CustomizedBurgerOrder[]>([])
  const [customizingBurger, setCustomizingBurger] = useState<BurgerItem | null>(null)
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(INITIAL_REVIEWS)
  const [reviewFilter, setReviewFilter] = useState<'All' | '5' | 'recent'>('All')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Dynamic editable menu items (persisted to localStorage)
  const [menuData, setMenuData] = useState<Record<MenuCategory, Array<BurgerItem>>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smashed_burger_menu_v2')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === 'object' && parsed['Meat Burgers']) {
            return parsed
          }
        }
      } catch (e) {
        console.error('Failed to load saved menu:', e)
      }
    }
    return fullMenuData
  })
  const [isMenuManagerOpen, setIsMenuManagerOpen] = useState(false)

  // Simulated real-time inventory state (persisted locally)
  const [inventory, setInventory] = useState<SimulatedInventory>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smashed_burger_inventory_v1')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === 'object') {
            return parsed
          }
        }
      } catch (e) {
        console.error('Failed to load saved inventory:', e)
      }
    }
    return INITIAL_SIMULATED_INVENTORY
  })

  const saveInventory = (newInv: SimulatedInventory) => {
    setInventory(newInv)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smashed_burger_inventory_v1', JSON.stringify(newInv))
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleSimulateLiveOrder = () => {
    const candidateItems = [
      'Hot Chicken',
      'Sweet Heat',
      'Dynamite Shrimps',
      'Jalapeño',
      'OG Smash',
      'Loaded Fries',
      'Smoked BBQ Bacon',
    ]
    const randomItem = candidateItems[Math.floor(Math.random() * candidateItems.length)]
    const currentStock = getInventoryStock(inventory, randomItem)
    if (currentStock <= 0) {
      setToastMessage(
        lang === 'KU'
          ? `داواکاری نوێ: ${randomItem} لەمێژە تەواو بووە!`
          : lang === 'AR'
          ? `طلب مباشر: ${randomItem} نفد بالكامل بالفعل!`
          : `Live order: ${randomItem} is already sold out!`
      )
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    const nextInv = deductStock(inventory, randomItem, 1)
    saveInventory(nextInv)
    const remaining = getInventoryStock(nextInv, randomItem)
    setToastMessage(
      lang === 'KU'
        ? `⚡ داواکاری نوێ لە هەولێر: ١ دانە ${randomItem} داواکرا! ماوە: ${remaining} دانە`
        : lang === 'AR'
        ? `⚡ طلب مباشر في أربيل: تم طلب 1x ${randomItem}! المتبقي: ${remaining}`
        : `⚡ Live Erbil order: 1x ${randomItem} ordered! Kitchen stock: ${remaining} left`
    )
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleRestockAll = () => {
    saveInventory(INITIAL_SIMULATED_INVENTORY)
    setToastMessage(
      lang === 'KU'
        ? 'کۆگای چێشتخانە نوێکرایەوە و پڕکرایەوە بۆ دۆخی ئاسایی!'
        : lang === 'AR'
        ? 'تمت إعادة تعبئة وتجديد مخزون المطبخ بنجاح!'
        : 'Kitchen inventory restocked to fresh daily service levels!'
    )
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleSaveMenu = (newMenu: Record<MenuCategory, Array<BurgerItem>>) => {
    setMenuData(newMenu)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smashed_burger_menu_v2', JSON.stringify(newMenu))
      } catch (e) {
        console.error('Failed to persist menu:', e)
      }
    }
    setToastMessage(
      lang === 'KU'
        ? 'مینیۆکە بە سەرکەوتوویی نوێکرایەوە!'
        : lang === 'AR'
        ? 'تم تحديث قائمة الطعام وحفظ التعديلات بنجاح!'
        : 'Menu updated and saved successfully!'
    )
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleResetMenuToDefault = () => {
    setMenuData(fullMenuData)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('smashed_burger_menu_v2')
      } catch (e) {
        console.error(e)
      }
    }
    setToastMessage(
      lang === 'KU'
        ? 'مینیۆکە گەڕێندرایەوە بۆ دۆخی بنەڕەتی'
        : lang === 'AR'
        ? 'تمت استعادة قائمة الطعام الافتراضية'
        : 'Menu reset to default Erbil SMASH\'D menu!'
    )
    setTimeout(() => setToastMessage(null), 3500)
  }

  const t = copy[lang]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroBackground((current) => (current + 1) % heroBackgrounds.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [])

  const rtl = lang !== 'EN'
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const grandTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)

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

  // Dynamic WhatsApp ordering URL
  const wa = useMemo(() => {
    if (cartItems.length === 0) return defaultWa

    const lines: string[] = [
      '🔥 *New Smashed Burger Order* 🔥',
      '--------------------------------',
    ]

    cartItems.forEach((item, index) => {
      lines.push(
        `${index + 1}. *${item.quantity}x ${item.burgerName}* - ${formatPrice(item.totalPrice)} IQD`
      )
      if (item.removedIngredients && item.removedIngredients.length > 0) {
        lines.push(`   • No: ${item.removedIngredients.join(', ')}`)
      }
      if (item.addedExtras && item.addedExtras.length > 0) {
        lines.push(`   • Extras: ${item.addedExtras.map((e) => e.name).join(', ')}`)
      }
      if (item.sauceLevel && item.sauceLevel !== 'Normal' && item.sauceLevel !== 'Standard') {
        lines.push(`   • Sauce Level: ${item.sauceLevel}`)
      }
      if (item.specialInstructions) {
        lines.push(`   • Kitchen Note: "${item.specialInstructions}"`)
      }
    })

    lines.push('--------------------------------')
    lines.push(`💰 *Total: ${formatPrice(grandTotal)} IQD*`)
    lines.push('📍 Erbil delivery / pickup')

    return `https://wa.me/9647500000000?text=${encodeURIComponent(lines.join('\n'))}`
  }, [cartItems, grandTotal])

  const handleOpenBurgerCustomizer = (burger: BurgerItem) => {
    setCustomizingBurger(burger)
    setIsCustomizerOpen(true)
  }

  const handleAddCustomizedOrder = (order: CustomizedBurgerOrder) => {
    // Deduct stock in simulated inventory
    const nextInv = deductStock(inventory, order.burgerName, order.quantity)
    saveInventory(nextInv)

    setCartItems((prev) => {
      // Find matching item with identical customization configuration
      const existingIdx = prev.findIndex(
        (it) =>
          it.burgerName === order.burgerName &&
          it.sauceLevel === order.sauceLevel &&
          it.specialInstructions === order.specialInstructions &&
          JSON.stringify((it.removedIngredients || []).slice().sort()) ===
            JSON.stringify((order.removedIngredients || []).slice().sort()) &&
          JSON.stringify((it.addedExtras || []).map((e) => e.id).sort()) ===
            JSON.stringify((order.addedExtras || []).map((e) => e.id).sort())
      )

      if (existingIdx > -1) {
        const copyList = [...prev]
        const existing = copyList[existingIdx]
        const updatedQty = existing.quantity + order.quantity
        copyList[existingIdx] = {
          ...existing,
          quantity: updatedQty,
          totalPrice: existing.totalUnitPrice * updatedQty,
        }
        return copyList
      }

      return [...prev, order]
    })

    setToastMessage(`Added ${order.quantity}x ${order.burgerName} to order!`)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleAddDirectItem = (name: string, priceStr: string, image: string, cat?: MenuCategory) => {
    // Open customizer so user gets complete control over sizes, dips, flavors, removals
    handleOpenBurgerCustomizer({
      name,
      desc: '',
      price: priceStr,
      image,
      category: cat,
    })
  }

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id)
      return
    }

    const existing = cartItems.find((it) => it.id === id)
    if (existing) {
      const diff = newQty - existing.quantity
      if (diff > 0) {
        saveInventory(deductStock(inventory, existing.burgerName, diff))
      } else if (diff < 0) {
        saveInventory(restoreStock(inventory, existing.burgerName, Math.abs(diff)))
      }
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: newQty,
              totalPrice: item.totalUnitPrice * newQty,
            }
          : item
      )
    )
  }

  const handleRemoveItem = (id: string) => {
    const existing = cartItems.find((it) => it.id === id)
    if (existing) {
      saveInventory(restoreStock(inventory, existing.burgerName, existing.quantity))
    }
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleClearCart = () => {
    let updatedInv = { ...inventory }
    cartItems.forEach((it) => {
      updatedInv = restoreStock(updatedInv, it.burgerName, it.quantity)
    })
    saveInventory(updatedInv)
    setCartItems([])
    setToastMessage('Order tray cleared & reserved stock returned to kitchen')
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleNewReviewSubmit = (review: ReviewItem) => {
    setReviewsList((prev) => [review, ...prev])
    setToastMessage('Thank you! Your review is live.')
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleOrderHeroClick = (e: React.MouseEvent) => {
    if (cartItems.length > 0) {
      e.preventDefault()
      setIsCartOpen(true)
    } else {
      // Prompt user with the signature classic smash customizer
      e.preventDefault()
      handleOpenBurgerCustomizer(featured[0])
    }
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
            onClick={() => handleOpenBurgerCustomizer(featured[0])}
            className="hero-sticker cursor-pointer hover:scale-110 active:scale-95 transition-transform"
            title="Click to customize a burger now!"
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
        <section id="menu" className="menu-backdrop">
          <div className="section container">
            <div className="section-head">
              <div>
                <p className="eyebrow dark">{t.featuredEyebrow}</p>
                <h2>
                  {t.featuredHead}
                  <br />
                  <span>{t.featuredHeadSpan}</span>
                </h2>
              </div>
              <a href="#full-menu" className="text-link">
                {t.seeFullMenu} <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="featured-grid">
              {featured.map((item) => {
                const stock = item.stock ?? getInventoryStock(inventory, item.name)
                const isSoldOut = stock <= 0

                return (
                  <article
                    className="food-card flex flex-col justify-between cursor-pointer group relative"
                    key={item.name}
                  >
                    <div
                      className="food-img cursor-pointer relative"
                      onClick={() => handleOpenBurgerCustomizer(item)}
                      title={`Click to customize ${item.name}`}
                    >
                      <img src={item.image} alt={`${item.name} smash burger`} />
                      <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
                        {item.badge && (
                          <span className="font-bold text-[9px] uppercase tracking-[0.5px] px-2 py-1 rounded-[4px] bg-[#D9AA55] text-[#171717]">
                            {item.badge}
                          </span>
                        )}
                        <StockIndicator count={stock} lang={lang} variant="compact" />
                      </div>
                    </div>
                    <div className="food-info flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3
                            onClick={() => handleOpenBurgerCustomizer(item)}
                            className="hover:text-[#D95B32] transition-colors"
                          >
                            {item.name}
                          </h3>
                        </div>
                        <p>{item.desc}</p>
                      </div>
                      <div className="price-row flex items-center justify-between gap-2 mt-4">
                        <strong>
                          {item.price} <small>IQD</small>
                        </strong>
                        {isSoldOut ? (
                          <span className="px-2.5 py-1 rounded-[4px] bg-[#171717] text-[#aaa] border border-white/20 text-[9px] font-bold uppercase tracking-[0.5px]">
                            {lang === 'KU' ? 'تەواو بووە' : lang === 'AR' ? 'نفدت الكمية' : 'Sold Out'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="add-button cursor-pointer"
                            aria-label={`Add ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenBurgerCustomizer(item)
                            }}
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* CALLOUT MARQUEE */}
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
        <section id="full-menu" className="section container menu-section">
          <div className="section-head">
            <div>
              <p className="eyebrow dark">{t.fullMenuTitle}</p>
              <h2>
                {t.fullMenuHead}
                <br />
                <span>{t.fullMenuHeadSpan}</span>
              </h2>
            </div>
            <div className="cart-note flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMenuManagerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#171717] hover:bg-[#252525] border border-white/20 text-[11px] font-bold uppercase tracking-[0.5px] text-[#D9AA55] hover:text-white transition-all hover:-translate-y-0.5 cursor-pointer"
                title="Edit menu items, prices, and descriptions"
              >
                <Edit2 size={12} className="text-[#D95B32]" />
                <span>
                  {lang === 'KU'
                    ? 'گۆڕینی مینیۆ / نرخەکان'
                    : lang === 'AR'
                    ? 'تعديل المنيو والأسعار'
                    : 'Edit Menu'}
                </span>
              </button>

              {/* Live Inventory Simulation Controls */}
              <button
                type="button"
                onClick={handleSimulateLiveOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#171717] hover:bg-[#252525] border border-white/20 text-[11px] font-bold uppercase tracking-[0.5px] text-neutral-300 hover:text-[#D95B32] transition-all hover:-translate-y-0.5 cursor-pointer"
                title="Simulate an Erbil diner placing a live order to test inventory updates"
              >
                <Zap size={12} className="text-[#D95B32]" />
                <span>
                  {lang === 'KU'
                    ? 'تاقیکردنەوەی داواکاری'
                    : lang === 'AR'
                    ? 'محاكاة طلب'
                    : 'Simulate Order'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRestockAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#171717] hover:bg-[#252525] border border-white/20 text-[11px] font-bold uppercase tracking-[0.5px] text-neutral-400 hover:text-white transition-all hover:-translate-y-0.5 cursor-pointer"
                title="Reset simulated stock to full capacity"
              >
                <RotateCcw size={11} />
                <span className="hidden sm:inline">
                  {lang === 'KU' ? 'پڕکردنەوە' : lang === 'AR' ? 'تجديد المخزون' : 'Restock'}
                </span>
              </button>

              {totalCartCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="text-right text-xs font-bold text-[#D95B32] hover:underline flex items-center gap-1"
                >
                  <ShoppingBag size={14} />
                  <span>
                    {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in tray (
                    {formatPrice(grandTotal)} IQD)
                  </span>
                </button>
              ) : (
                <span className="text-xs text-neutral-400 hidden sm:inline">Order for pickup or delivery</span>
              )}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-white uppercase hover:text-[#D95B32]"
              >
                {totalCartCount > 0 ? 'Review & WhatsApp Order' : 'View Tray'}{' '}
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>

          <div className="tabs flex flex-wrap gap-2.5 mb-6" role="tablist">
            {[
              { id: 'Meat Burgers' as const, en: 'Meat Burgers', ar: 'برجر اللحم', ku: 'بەرگەری گۆشت', icon: '🥩' },
              { id: 'Chicken Burgers' as const, en: 'Chicken Burgers', ar: 'برجر الدجاج', ku: 'بەرگەری مریشک', icon: '🍗' },
              { id: 'Sides' as const, en: 'Sides', ar: 'المقبلات', ku: 'خواردنی لاوەکی', icon: '🍤' },
              { id: 'Fries' as const, en: 'Fries', ar: 'البطاطس', ku: 'پەتاتە', icon: '🍟' },
              { id: 'Drinks' as const, en: 'Drinks', ar: 'المشروبات', ku: 'خواردنەوە', icon: '🥤' },
            ].map((cat) => {
              const count = menuData[cat.id]?.length || 0
              const isSelected = category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isSelected
                      ? 'selected bg-gradient-to-r from-[#D95B32] to-[#c24a24] text-white shadow-lg shadow-[#D95B32]/35 border border-[#D95B32]'
                      : 'bg-[#1a1a1a] text-neutral-300 border border-white/10 hover:border-[#D95B32]/40 hover:bg-[#242424] hover:text-white'
                  }`}
                  onClick={() => setCategory(cat.id)}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span>{lang === 'KU' ? cat.ku : lang === 'AR' ? cat.ar : cat.en}</span>
                  <span
                    className={`tab-count text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-black/30 text-white font-bold'
                        : 'bg-white/10 text-neutral-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Extra Patty Banner for Meat Burgers */}
          {category === 'Meat Burgers' && (
            <div className="mb-5 p-3.5 sm:p-4 rounded-[8px] bg-[#1a1a1a] border border-[#D95B32]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-[4px] bg-[#D95B32] text-[#171717] flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm">
                  🥩
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white uppercase tracking-wider font-[family-name:var(--font-anton,Anton)]">
                      {lang === 'KU'
                        ? '+ گۆشتی سمەشی زیادە: ١,٥٠٠ دینار'
                        : lang === 'AR'
                        ? '+ شريحة لحم سماش إضافية: 1,500 د.ع'
                        : '+ Extra Smashed Patty: 1,500 IQD'}
                    </p>
                    <span className="text-[10px] bg-[#D9AA55] text-[#171717] font-bold px-2 py-0.5 rounded-[4px]">
                      +1,500 IQD
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {lang === 'KU'
                      ? 'دەتوانیت شلەی گۆشتی سمەشی زیادە بۆ هەر بەرگەرێک زیاد بکەیت لە کاتی داواکاریدا'
                      : lang === 'AR'
                      ? 'يمكنك مضاعفة لحم السماش لأي برجر بكل سهولة عند تخصيص طلبك بالضغط على الزر'
                      : 'Add an extra juicy smashed beef patty to any burger when clicking Customize!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBurgerCustomizer(menuData['Meat Burgers']?.[0] || fullMenuData['Meat Burgers'][0])}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-[4px] bg-[#D95B32] hover:bg-[#e36a43] text-[#171717] text-xs font-bold uppercase tracking-[0.5px] transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders size={12} />
                <span>{lang === 'KU' ? 'ڕێکخستن' : lang === 'AR' ? 'تخصيص' : 'Customize Now'}</span>
              </button>
            </div>
          )}

          <div className="menu-list">
            {(menuData[category] || []).map((item) => {
              const stock = item.stock ?? getInventoryStock(inventory, item.name)
              const isSoldOut = stock <= 0

              const triggerAction = () => {
                handleOpenBurgerCustomizer({
                  name: item.name,
                  desc: item.desc,
                  price: item.price,
                  image: item.image,
                  badge: item.badge,
                  category,
                  spicy: item.spicy,
                  stock,
                })
              }

              return (
                <div className="menu-row" key={item.name}>
                  <div className="menu-thumb cursor-pointer relative" onClick={triggerAction}>
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="menu-description">
                    <div className="menu-title">
                      <h3
                        onClick={triggerAction}
                        className="cursor-pointer hover:text-[#D95B32] transition-colors flex items-center gap-2 flex-wrap"
                      >
                        <span>{item.name}</span>
                        {item.spicy && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-[4px] bg-[#ffe5dc] border border-[#D95B32]/30 text-[#D95B32] font-bold uppercase tracking-[0.5px]">
                            🌶️ SPICY
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.badge && !item.badge.includes('SPICY') && (
                          <span>{item.badge}</span>
                        )}
                        <StockIndicator count={stock} lang={lang} variant="compact" />
                      </div>
                    </div>
                    <p>{item.desc}</p>
                  </div>
                  <strong className="menu-price">
                    {item.price}
                    <small> IQD</small>
                  </strong>
                  {isSoldOut ? (
                    <span className="px-2.5 py-1 rounded-[4px] bg-[#171717] text-[#aaa] border border-white/20 text-[9px] font-bold uppercase tracking-[0.5px]">
                      {lang === 'KU' ? 'تەواو بووە' : lang === 'AR' ? 'نفدت الكمية' : 'Sold Out'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="add-button outline cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        triggerAction()
                      }}
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus size={17} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="about-section">
          <div className="container about-grid">
            <div className="about-photo">
              <img src="/smashed-burger-hero.png" alt="Smashed burger on the grill" />
              <div className="photo-label">
                EST. 2024
                <br />
                <b>ERBIL</b>
              </div>
            </div>
            <div className="about-copy">
              <p className="eyebrow dark">OUR STORY</p>
              <h2>
                THE SMASH
                <br />
                <span>MATTERS.</span>
              </h2>
              <p>
                Smashed Burger started with one obsession: the perfect smash. We hand-press 100%
                fresh local beef, smash it hard on cast iron, and let the Maillard reaction do the
                magic.
              </p>
              <p>
                No fillers. No shortcuts. Just Erbil&apos;s crispiest, juiciest burger — served
                fast, served hot, served with pride.
              </p>
              <blockquote>
                “Good burgers don&apos;t need explaining.”
                <cite>— The Smashed Burger crew</cite>
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
                  <span>★★★★★</span>
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
              ★ 5 Stars ({reviewsList.filter((r) => r.stars === 5).length})
            </button>
          </div>

          <div className="review-grid mt-4">
            {filteredReviews.map((review) => (
              <article key={review.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="stars text-[#D9AA55]">
                      {'★'.repeat(review.stars)}
                      {'☆'.repeat(5 - review.stars)}
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
      {totalCartCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed z-20 bottom-24 right-5 sm:bottom-6 sm:right-24 flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#171717] text-white border-2 border-[#D95B32] shadow-2xl hover:scale-105 transition-all animate-in slide-in-from-bottom-3 duration-200 cursor-pointer"
          aria-label={`View order tray (${totalCartCount} items)`}
        >
          <span className="w-5 h-5 rounded-full bg-[#D95B32] text-[#171717] font-black text-xs flex items-center justify-center">
            {totalCartCount}
          </span>
          <span className="text-xs font-bold font-[family-name:var(--font-anton,Anton)] uppercase tracking-wide">
            View Tray ({formatPrice(grandTotal)} IQD)
          </span>
        </button>
      )}

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

      {/* Burger & Food Customization Modal */}
      <BurgerCustomizerModal
        burger={customizingBurger}
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        onAddToCart={handleAddCustomizedOrder}
        lang={lang}
        stockCount={
          customizingBurger
            ? customizingBurger.stock ?? getInventoryStock(inventory, customizingBurger.name)
            : undefined
        }
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        lang={lang}
      />

      {/* Customer Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitReview={handleNewReviewSubmit}
        lang={lang}
      />

      {/* Menu & Price Editor Modal */}
      <MenuManagerModal
        isOpen={isMenuManagerOpen}
        onClose={() => setIsMenuManagerOpen(false)}
        menuData={menuData}
        onSaveMenu={handleSaveMenu}
        onResetToDefault={handleResetMenuToDefault}
        initialCategory={category}
        lang={lang}
      />
    </div>
  )
}
