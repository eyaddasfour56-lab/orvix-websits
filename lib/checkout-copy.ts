export const checkoutCopy = {
  en: {
    colours: {
      Black: "Obsidian (Black)",
      Lavender: "Lavender",
      Berry: "Berry",
    },
    currency: "EGP",
    cityLoadError:
      "Could not load delivery cities.",
    districtLoadError:
      "Could not load delivery districts.",
    selectDeliveryFirst:
      "Please select your delivery area first.",
    enterDiscount: "Please enter a discount code.",
    invalidDiscount: "Invalid discount code.",
    unsupportedDiscount:
      "This discount code has an unsupported discount type.",
    invalidDiscountAmount:
      "This discount code does not have a valid discount amount.",
    invalidPercentage:
      "This discount code does not have a valid percentage.",
    freeDeliveryApplied:
      "Free delivery applied successfully.",
    percentageApplied: (value: number) =>
      `${value}% discount applied successfully.`,
    amountApplied: (
      value: number,
      formatted: string
    ) => `${formatted} EGP discount applied successfully.`,
    discountCheckError:
      "Could not check the discount code.",
    discountRemoved: "Discount code removed.",
    selectCityError:
      "Please select your delivery city.",
    selectDistrictError:
      "Please select your delivery district.",
    fullNameError: "Please enter your full name.",
    phoneError: "Please enter your phone number.",
    emailError:
      "Please enter a valid email address for order confirmation and secure tracking.",
    addressError: "Please enter your full address.",
    applyDiscountError:
      "Please press Apply to verify your discount code before placing the order.",
    orderError: "Could not place your order.",
    orderNumberError:
      "Your order was saved, but the order number was not returned.",
    eyebrow: "Secure checkout",
    title: "Complete your order",
    intro:
      "Review your product, enter your delivery information, then pay the products total to ORVIX through InstaPay when your order arrives. The courier collects only the delivery fee.",
    yourProduct: "Your product",
    fitnessTracker: "Fitness tracker",
    each: "each",
    quantityInline: "Quantity",
    chooseColour: "Choose your colour",
    quantity: "Quantity",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    contactInformation: "Contact information",
    fullName: "Full name",
    fullNamePlaceholder: "Enter your full name",
    phoneNumber: "Phone number",
    emailOptional: "Email address — required",
    emailNote:
      "We use this for your order confirmation and the secure tracking code.",
    deliveryInformation: "Delivery information",
    city: "Governorate / city",
    cityPlaceholder:
      "Select your governorate or city",
    citySearch: "Search governorate or city...",
    cityEmpty:
      "No matching governorate or city found.",
    citiesLoading: "Loading Bosta cities...",
    deliveryFee: "Delivery fee",
    district: "District / area",
    districtPlaceholder:
      "Select your district or area",
    selectCityFirst:
      "Select a governorate first",
    districtSearch: "Search district or area...",
    districtEmpty:
      "No matching district or area found.",
    districtsLoading: "Loading districts...",
    bilingualSearch:
      "Search using the English or Arabic place name.",
    refreshLocations: "Refresh the page to try again.",
    fullAddress: "Full address",
    addressPlaceholder:
      "Area, street, building, floor and apartment",
    notes: "Order notes — optional",
    notesPlaceholder:
      "Add any useful delivery notes",
    orderSummary: "Order summary",
    product: "Product",
    colour: "Colour",
    productsTotal: "Products total",
    productDiscount: "Product discount",
    delivery: "Delivery",
    selectCity: "Select city",
    free: "FREE",
    deliveryDiscount: "Delivery discount",
    discountCode: "Discount code",
    discountPlaceholder: "Enter code",
    checking: "Checking...",
    remove: "Remove",
    apply: "Apply",
    selectCityBeforeDiscount:
      "Select your delivery city before applying a code.",
    totalSaved: "Total saved",
    finalTotal: "Final total",
    paymentHow: "How payment works",
    twoPayments: "Two separate payments on delivery",
    instapayToOrvix: "1. InstaPay to ORVIX",
    productsOnly:
      "Products total only — when your order arrives.",
    cashToCourier: "2. Cash to Bosta courier",
    deliveryOnly:
      "Delivery fee only. The courier does not collect the product price.",
    paymentSafety:
      "No advance payment is required. ORVIX's verified InstaPay details will be provided when your order is confirmed. Never send the products total to the courier.",
    placing: "Placing order...",
    checkingDiscount: "Checking discount...",
    placeOrder: (total: string) =>
      `Place order — ${total} EGP`,
    confirmation:
      "By placing your order, you confirm that the provided information is correct.",
    keepPageOpen:
      "Please do not close or refresh this page.",
    rights: "All rights reserved.",
  },
  ar: {
    colours: {
      Black: "Obsidian (أسود)",
      Lavender: "لافندر",
      Berry: "توتي",
    },
    currency: "ج.م",
    cityLoadError: "تعذر تحميل مدن التوصيل.",
    districtLoadError:
      "تعذر تحميل مناطق التوصيل.",
    selectDeliveryFirst:
      "من فضلك اختر منطقة التوصيل أولًا.",
    enterDiscount: "من فضلك أدخل كود الخصم.",
    invalidDiscount: "كود الخصم غير صالح.",
    unsupportedDiscount:
      "نوع الخصم في هذا الكود غير مدعوم.",
    invalidDiscountAmount:
      "قيمة الخصم في هذا الكود غير صالحة.",
    invalidPercentage:
      "نسبة الخصم في هذا الكود غير صالحة.",
    freeDeliveryApplied:
      "تم تفعيل التوصيل المجاني بنجاح.",
    percentageApplied: (value: number) =>
      `تم تطبيق خصم ${value.toLocaleString("ar-EG")}٪ بنجاح.`,
    amountApplied: (
      _value: number,
      formatted: string
    ) => `تم تطبيق خصم ${formatted} ج.م بنجاح.`,
    discountCheckError:
      "تعذر التحقق من كود الخصم.",
    discountRemoved: "تمت إزالة كود الخصم.",
    selectCityError:
      "من فضلك اختر مدينة التوصيل.",
    selectDistrictError:
      "من فضلك اختر منطقة التوصيل.",
    fullNameError: "من فضلك أدخل اسمك بالكامل.",
    phoneError: "من فضلك أدخل رقم هاتفك.",
    emailError:
      "من فضلك أدخل بريدًا إلكترونيًا صحيحًا لتأكيد الطلب والتتبّع الآمن.",
    addressError: "من فضلك أدخل عنوانك بالكامل.",
    applyDiscountError:
      "اضغط تطبيق للتحقق من كود الخصم قبل تأكيد الطلب.",
    orderError: "تعذر إنشاء طلبك.",
    orderNumberError:
      "تم حفظ طلبك، لكن لم يصلنا رقم الطلب.",
    eyebrow: "إتمام آمن للطلب",
    title: "أكمل طلبك",
    intro:
      "راجع المنتج وأدخل بيانات التوصيل، ثم ادفع إجمالي المنتجات إلى ORVIX عبر InstaPay عند وصول الطلب. يحصل مندوب الشحن على رسوم التوصيل فقط.",
    yourProduct: "منتجك",
    fitnessTracker: "جهاز تتبّع اللياقة",
    each: "للقطعة",
    quantityInline: "الكمية",
    chooseColour: "اختر اللون",
    quantity: "الكمية",
    decreaseQuantity: "تقليل الكمية",
    increaseQuantity: "زيادة الكمية",
    contactInformation: "بيانات التواصل",
    fullName: "الاسم بالكامل",
    fullNamePlaceholder: "أدخل اسمك بالكامل",
    phoneNumber: "رقم الهاتف",
    emailOptional: "البريد الإلكتروني — مطلوب",
    emailNote:
      "نستخدمه لإرسال تأكيد الطلب وكود التتبّع الآمن.",
    deliveryInformation: "بيانات التوصيل",
    city: "المحافظة / المدينة",
    cityPlaceholder: "اختر المحافظة أو المدينة",
    citySearch: "ابحث عن المحافظة أو المدينة...",
    cityEmpty:
      "لم نجد محافظة أو مدينة مطابقة.",
    citiesLoading: "جارٍ تحميل مدن بوسطة...",
    deliveryFee: "رسوم التوصيل",
    district: "المنطقة / الحي",
    districtPlaceholder: "اختر المنطقة أو الحي",
    selectCityFirst: "اختر المحافظة أولًا",
    districtSearch: "ابحث عن المنطقة أو الحي...",
    districtEmpty: "لم نجد منطقة أو حيًا مطابقًا.",
    districtsLoading: "جارٍ تحميل المناطق...",
    bilingualSearch:
      "يمكنك البحث باسم المكان بالعربية أو الإنجليزية.",
    refreshLocations:
      "حدّث الصفحة للمحاولة مرة أخرى.",
    fullAddress: "العنوان بالكامل",
    addressPlaceholder:
      "المنطقة والشارع والمبنى والطابق والشقة",
    notes: "ملاحظات الطلب — اختياري",
    notesPlaceholder:
      "أضف أي ملاحظات مفيدة للتوصيل",
    orderSummary: "ملخص الطلب",
    product: "المنتج",
    colour: "اللون",
    productsTotal: "إجمالي المنتجات",
    productDiscount: "خصم المنتجات",
    delivery: "التوصيل",
    selectCity: "اختر المدينة",
    free: "مجاني",
    deliveryDiscount: "خصم التوصيل",
    discountCode: "كود الخصم",
    discountPlaceholder: "أدخل الكود",
    checking: "جارٍ التحقق...",
    remove: "إزالة",
    apply: "تطبيق",
    selectCityBeforeDiscount:
      "اختر مدينة التوصيل قبل تطبيق الكود.",
    totalSaved: "إجمالي التوفير",
    finalTotal: "الإجمالي النهائي",
    paymentHow: "طريقة الدفع",
    twoPayments: "دفعتان منفصلتان عند الاستلام",
    instapayToOrvix: "1. InstaPay إلى ORVIX",
    productsOnly:
      "إجمالي المنتجات فقط — عند وصول طلبك.",
    cashToCourier: "2. كاش لمندوب بوسطة",
    deliveryOnly:
      "رسوم التوصيل فقط. لا يحصل المندوب على سعر المنتجات.",
    paymentSafety:
      "لا يلزم دفع أي مبلغ مقدمًا. ستحصل على بيانات InstaPay الموثقة من ORVIX بعد تأكيد الطلب. لا ترسل قيمة المنتجات إلى مندوب الشحن.",
    placing: "جارٍ إنشاء الطلب...",
    checkingDiscount: "جارٍ التحقق من الخصم...",
    placeOrder: (total: string) =>
      `تأكيد الطلب — ${total} ج.م`,
    confirmation:
      "بتأكيد الطلب، تقر بأن البيانات التي أدخلتها صحيحة.",
    keepPageOpen:
      "من فضلك لا تغلق هذه الصفحة أو تحدّثها.",
    rights: "جميع الحقوق محفوظة.",
  },
} as const;
