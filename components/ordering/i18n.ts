export type Lang = 'EN' | 'KU' | 'AR'
export type LName = { en: string; ku: string; ar: string }

/** Pick the right translation of an admin-managed name, falling back to English. */
export function pick(n: LName | undefined, lang: Lang) {
  if (!n) return ''
  return (lang === 'KU' ? n.ku : lang === 'AR' ? n.ar : n.en) || n.en
}

type Dict = Record<string, [en: string, ar: string, ku: string]>

// Kurdish (Sorani) strings were written without a native review; the restaurant should proof them.
const D: Dict = {
  orderFromTable: ['Order straight from your table', 'اطلب مباشرة من طاولتك', 'لە مێزەکەتەوە ڕاستەوخۆ داوا بکە'],
  table: ['Table', 'طاولة', 'مێز'],
  chooseTable: ['Choose your table', 'اختر طاولتك', 'مێزەکەت هەڵبژێرە'],
  scanQr: ['Scan the QR code on your table, or ask your waiter to set up your table.', 'امسح رمز QR الموجود على طاولتك أو اطلب من النادل مساعدتك.', 'کۆدی QR ی سەر مێزەکەت سکان بکە یان داوا لە گارسۆنەکە بکە.'],
  changeTable: ['Change', 'تغيير', 'گۆڕین'],
  search: ['Search the menu', 'ابحث في القائمة', 'لە مینیۆدا بگەڕێ'],
  all: ['All', 'الكل', 'هەموو'],
  popular: ['Popular', 'الأكثر طلباً', 'بەناوبانگ'],
  offers: ['Special offers', 'عروض خاصة', 'پێشکەشی تایبەت'],
  featured: ['Featured', 'مميز', 'تایبەت'],
  noResults: ['Nothing matches your search.', 'لا توجد نتائج مطابقة.', 'هیچ ئەنجامێک نەدۆزرایەوە.'],
  add: ['Add', 'أضف', 'زیاد بکە'],
  addToOrder: ['Add to order', 'أضف إلى الطلب', 'زیادکردن بۆ داواکاری'],
  update: ['Update item', 'تحديث الصنف', 'نوێکردنەوە'],
  unavailable: ['Unavailable', 'غير متوفر', 'بەردەست نییە'],
  min: ['min', 'دقيقة', 'خولەک'],
  ingredients: ['Ingredients', 'المكونات', 'پێکهاتەکان'],
  allergens: ['Allergens', 'مسببات الحساسية', 'ماددە ئەلەرژیدەرەکان'],
  required: ['Required', 'مطلوب', 'پێویستە'],
  optional: ['Optional', 'اختياري', 'هەڵبژاردەیی'],
  chooseUpTo: ['Choose up to', 'اختر حتى', 'هەتا هەڵبژێرە'],
  instructions: ['Special instructions', 'تعليمات خاصة', 'ڕێنمایی تایبەت'],
  instrPlaceholder: ['e.g. no onions, sauce on the side', 'مثال: بدون بصل، الصوص جانباً', 'نموونە: بێ پیاز، سۆس لە تەنیشت'],
  quantity: ['Quantity', 'الكمية', 'ژمارە'],
  yourOrder: ['Your order', 'طلبك', 'داواکارییەکەت'],
  tray: ['Tray', 'الصينية', 'سەبەتە'],
  cartEmpty: ['Your tray is empty. Pick something delicious.', 'صينيتك فارغة. اختر شيئاً لذيذاً.', 'سەبەتەکەت بەتاڵە. شتێکی خۆش هەڵبژێرە.'],
  subtotal: ['Subtotal', 'المجموع الفرعي', 'کۆی بچووک'],
  tax: ['Tax', 'الضريبة', 'باج'],
  service: ['Service charge', 'رسوم الخدمة', 'کرێی خزمەتگوزاری'],
  total: ['Total', 'الإجمالي', 'کۆی گشتی'],
  placeOrder: ['Place order', 'إرسال الطلب', 'ناردنی داواکاری'],
  placing: ['Sending…', 'جارٍ الإرسال…', 'دەنێردرێت…'],
  noteLabel: ['Note for the waiter or kitchen', 'ملاحظة للنادل أو المطبخ', 'تێبینی بۆ گارسۆن یان چێشتخانە'],
  edit: ['Edit', 'تعديل', 'دەستکاری'],
  remove: ['Remove', 'حذف', 'لابردن'],
  clear: ['Clear tray', 'إفراغ الصينية', 'بەتاڵکردنەوە'],
  openNow: ['Open now', 'مفتوح الآن', 'ئێستا کراوەیە'],
  closedNow: ['Closed now', 'مغلق الآن', 'ئێستا داخراوە'],
  hours: ['Opening hours', 'ساعات العمل', 'کاتی کارکردن'],
  callWaiter: ['Call waiter', 'نداء النادل', 'بانگکردنی گارسۆن'],
  help: ['Need something?', 'تحتاج شيئاً؟', 'پێویستت بە شتێکە؟'],
  req_waiter: ['Waiter assistance', 'مساعدة النادل', 'یارمەتی گارسۆن'],
  req_water: ['Water', 'ماء', 'ئاو'],
  req_utensils: ['Extra utensils', 'أدوات مائدة إضافية', 'کەرەستەی خواردنی زیادە'],
  req_napkins: ['Napkins', 'مناديل', 'دەسرەی ڕووت'],
  req_bill: ['Request the bill', 'طلب الفاتورة', 'داواکردنی حساب'],
  reqSent: ['Request sent. A waiter is on the way.', 'تم إرسال الطلب. سيصلك النادل قريباً.', 'داواکاری نێردرا. گارسۆن دێت.'],
  st_waiting: ['Waiting', 'بالانتظار', 'چاوەڕوان'],
  st_received: ['Received', 'تم الاستلام', 'وەرگیرا'],
  st_on_the_way: ['On the way', 'في الطريق', 'لە ڕێگایە'],
  notifyMe: ['Notify me when ready', 'نبّهني عند الجاهزية', 'کاتێک ئامادە بوو ئاگادارم بکەرەوە'],
  trackOrder: ['Track your order', 'تتبع طلبك', 'شوێنکەوتنی داواکاری'],
  orderNumber: ['Order number', 'رقم الطلب', 'ژمارەی داواکاری'],
  verifyCode: ['Verification code', 'رمز التحقق', 'کۆدی پشتڕاستکردنەوە'],
  showWaiter: ['Show this code or QR to your waiter so they can verify your order.', 'اعرض هذا الرمز أو QR على النادل ليتحقق من طلبك.', 'ئەم کۆد یان QR ـە نیشانی گارسۆنەکە بدە بۆ پشتڕاستکردنەوەی داواکارییەکەت.'],
  expiresIn: ['Expires in', 'ينتهي خلال', 'کۆتایی دێت لە'],
  codeExpired: ['This code has expired.', 'انتهت صلاحية الرمز.', 'کۆدەکە بەسەرچووە.'],
  newCode: ['Get a new code', 'احصل على رمز جديد', 'کۆدی نوێ وەربگرە'],
  cancelOrder: ['Cancel this order', 'إلغاء الطلب', 'هەڵوەشاندنەوەی داواکاری'],
  estimated: ['Estimated preparation', 'وقت التحضير المتوقع', 'کاتی ئامادەکردنی خەمڵێنراو'],
  backToMenu: ['Back to menu', 'العودة إلى القائمة', 'گەڕانەوە بۆ مینیۆ'],
  moreOrder: ['Order more', 'اطلب المزيد', 'زیاتر داوا بکە'],
  orderingOff: ['Ordering is temporarily unavailable. Please ask your waiter.', 'الطلب غير متاح مؤقتاً. يرجى سؤال النادل.', 'داواکردن لە ئێستادا بەردەست نییە. تکایە لە گارسۆنەکە بپرسە.'],
  needTable: ['Choose your table to order', 'اختر طاولتك للطلب', 'بۆ داواکردن مێزەکەت هەڵبژێرە'],
  s_awaiting_verification: ['Waiting for your waiter to verify', 'بانتظار تحقق النادل', 'چاوەڕێی پشتڕاستکردنەوەی گارسۆن'],
  s_verified: ['Verified by waiter', 'تم التحقق من النادل', 'گارسۆن پشتڕاستی کردەوە'],
  s_confirmed: ['Sent to the kitchen', 'أُرسل إلى المطبخ', 'نێردرا بۆ چێشتخانە'],
  s_preparing: ['Being prepared', 'قيد التحضير', 'ئامادە دەکرێت'],
  s_ready: ['Ready to serve', 'جاهز للتقديم', 'ئامادەیە'],
  s_served: ['Served — enjoy!', 'تم التقديم — بالهناء!', 'خزمەت کرا — بەنۆشی گیان!'],
  s_completed: ['Completed', 'مكتمل', 'تەواو بوو'],
  s_rejected: ['Rejected', 'مرفوض', 'ڕەتکرایەوە'],
  s_cancelled: ['Cancelled', 'ملغى', 'هەڵوەشێنرایەوە'],
  step_submitted: ['Order submitted', 'تم إرسال الطلب', 'داواکاری نێردرا'],
  step_verification: ['Waiter verification', 'تحقق النادل', 'پشتڕاستکردنەوەی گارسۆن'],
  step_kitchen: ['Kitchen preparation', 'تحضير المطبخ', 'ئامادەکردن لە چێشتخانە'],
  step_ready: ['Ready to serve', 'جاهز للتقديم', 'ئامادەیە بۆ خزمەت'],
  step_done: ['Served', 'تم التقديم', 'خزمەت کرا'],
  reason: ['Reason', 'السبب', 'هۆکار'],
  error: ['Something went wrong. Please try again.', 'حدث خطأ. حاول مرة أخرى.', 'کێشەیەک ڕوویدا. دووبارە هەوڵبدەوە.'],
  loading: ['Loading…', 'جارٍ التحميل…', 'بارکردن…'],
  retry: ['Try again', 'حاول مجدداً', 'دووبارە هەوڵبدەوە'],
  close: ['Close', 'إغلاق', 'داخستن'],
  invalidTable: ['That table QR code is not valid. Ask your waiter for help.', 'رمز الطاولة غير صالح. اطلب المساعدة من النادل.', 'کۆدی QR ی مێزەکە دروست نییە. داوای یارمەتی لە گارسۆن بکە.'],
  itemGone: ['An item in your tray is no longer available.', 'صنف في صينيتك لم يعد متوفراً.', 'یەکێک لە خواردنەکانت ئیتر بەردەست نییە.'],
  currency: ['IQD', 'د.ع', 'دینار'],
}

export function tr(lang: Lang, key: keyof typeof D | string): string {
  const e = D[key]
  if (!e) return key
  return lang === 'AR' ? e[1] : lang === 'KU' ? e[2] : e[0]
}

export function fmtNum(n: number, lang: Lang) {
  try {
    return new Intl.NumberFormat(lang === 'EN' ? 'en-US' : lang === 'AR' ? 'ar-IQ' : 'ckb-IQ').format(n)
  } catch {
    return n.toLocaleString('en-US')
  }
}

export function money(n: number, lang: Lang) {
  return `${fmtNum(n, lang)} ${tr(lang, 'currency')}`
}
