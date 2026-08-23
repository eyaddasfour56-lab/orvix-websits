"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/components/LanguageProvider";

type PolicySlug = "shipping" | "returns" | "warranty" | "privacy" | "terms";
type Section = { title: string; paragraphs: string[]; bullets?: string[] };

const content: Record<PolicySlug, { en: { title: string; intro: string; sections: Section[] }; ar: { title: string; intro: string; sections: Section[] } }> = {
  shipping: {
    en: {
      title: "Shipping policy",
      intro: "How ORVIX pre-orders, import updates and local delivery work.",
      sections: [
        { title: "Delivery coverage and price", paragraphs: ["ORVIX currently delivers within Egypt. Your city, district and delivery fee are shown before you place the order; there are no hidden delivery charges in the confirmed total."] },
        { title: "Pre-order journey", paragraphs: ["An imported pre-order can pass through international transit, arrival in Egypt, customs clearance, ORVIX receiving and courier preparation. The estimated window shown at checkout or on the order page is an estimate, not a guaranteed date."] },
        { title: "Courier hand-off", paragraphs: ["After ORVIX hands the package to Bosta, courier events and the Bosta tracking number appear in the secure order journey. Delays caused by customs, address issues, holidays or courier operations can change the estimate."] },
        { title: "Customer responsibility", paragraphs: ["Enter a reachable Egyptian phone number, a working email and a complete delivery address. Contact ORVIX quickly if any detail is wrong."] },
      ],
    },
    ar: {
      title: "سياسة الشحن",
      intro: "طريقة عمل الطلب المسبق، رحلة الاستيراد، والتوصيل داخل مصر.",
      sections: [
        { title: "نطاق وسعر التوصيل", paragraphs: ["تقوم ORVIX حاليًا بالتوصيل داخل مصر. تظهر المدينة والمنطقة ورسوم التوصيل قبل تأكيد الطلب، ولا توجد رسوم توصيل مخفية بعد تأكيد الإجمالي."] },
        { title: "رحلة الـPre-Order", paragraphs: ["قد يمر الطلب المستورد بالشحن الدولي والوصول لمصر والجمارك والاستلام في ORVIX ثم التجهيز لشركة الشحن. نافذة الوصول المعروضة تقديرية وليست موعدًا مضمونًا."] },
        { title: "التسليم لشركة الشحن", paragraphs: ["بعد تسليم الشحنة إلى بوسطة، تظهر تحديثات شركة الشحن ورقم التتبع داخل رحلة الطلب الآمنة. قد تتغير المدة بسبب الجمارك أو العنوان أو الإجازات أو تشغيل شركة الشحن."] },
        { title: "مسؤولية العميل", paragraphs: ["اكتب رقم موبايل مصري متاحًا وإيميلًا يعمل وعنوانًا كاملًا، وتواصل مع ORVIX سريعًا إذا كانت أي بيانات غير صحيحة."] },
      ],
    },
  },
  returns: {
    en: {
      title: "Returns & exchanges",
      intro: "Clear customer rights, with the exceptions allowed by Egyptian law.",
      sections: [
        { title: "14-day return window", paragraphs: ["Under the Egyptian Consumer Protection Agency guidance, a customer can generally request an exchange or return within 14 days of receiving the product without giving a reason, subject to the legal exceptions and the product remaining in the condition required by law."] },
        { title: "Defective or non-conforming products", paragraphs: ["A defective product, or one that does not match the agreed specifications, can generally be returned or exchanged within 30 days of receipt under the same official guidance."] },
        { title: "Start a request", paragraphs: ["Contact the official ORVIX support channel and include the order number, delivery date, the requested solution and clear information about the product condition. Do not ship anything back before ORVIX confirms the return route."], bullets: ["Keep the product, included accessories and packaging safe.", "Do not remove or alter identifying information.", "Refund handling follows the applicable law and the original payment method where required."] },
      ],
    },
    ar: {
      title: "الاستبدال والاسترجاع",
      intro: "حقوق واضحة للعميل مع الاستثناءات التي يسمح بها القانون المصري.",
      sections: [
        { title: "الاسترجاع خلال 14 يومًا", paragraphs: ["وفقًا لإرشادات جهاز حماية المستهلك المصري، يحق للعميل بوجه عام طلب الاستبدال أو الاسترجاع خلال 14 يومًا من استلام السلعة دون إبداء سبب، مع مراعاة الاستثناءات القانونية وبقاء المنتج بالحالة المطلوبة قانونًا."] },
        { title: "المنتج المعيب أو غير المطابق", paragraphs: ["إذا كان المنتج معيبًا أو غير مطابق للمواصفات المتفق عليها، يمكن بوجه عام طلب استبداله أو استرجاعه خلال 30 يومًا من الاستلام وفق الإرشادات الرسمية."] },
        { title: "بدء الطلب", paragraphs: ["تواصل عبر قناة دعم ORVIX الرسمية واذكر رقم الطلب وتاريخ الاستلام والحل المطلوب وحالة المنتج بوضوح. لا ترسل المنتج قبل أن تؤكد ORVIX طريقة الإرجاع."], bullets: ["حافظ على المنتج والملحقات والعبوة.", "لا تزل أو تغيّر بيانات التعريف.", "تتم معالجة المبلغ وفق القانون وطريقة الدفع الأصلية عندما يلزم ذلك."] },
      ],
    },
  },
  warranty: {
    en: {
      title: "Warranty & product support",
      intro: "What to do if the device has a manufacturing or conformity issue.",
      sections: [
        { title: "Coverage", paragraphs: ["ORVIX honours the consumer protections and product-conformity obligations that apply to the sale. Any manufacturer coverage depends on the device, region and the manufacturer’s published conditions; ORVIX does not describe an unsupported international warranty as official local coverage."] },
        { title: "What is not a manufacturing defect", paragraphs: ["Normal wear, accidental damage, misuse, unauthorised repair, loss, and damage caused by ignoring the published care or safety guidance may fall outside manufacturing-defect coverage."] },
        { title: "Get help", paragraphs: ["Send the order number, a clear description of the problem and supporting photos or video through official ORVIX support. ORVIX will explain the inspection or next step before you send the device anywhere."] },
      ],
    },
    ar: {
      title: "الضمان ودعم المنتج",
      intro: "ماذا تفعل إذا ظهر عيب تصنيع أو مشكلة في مطابقة المنتج.",
      sections: [
        { title: "التغطية", paragraphs: ["تلتزم ORVIX بحقوق المستهلك والتزامات مطابقة المنتج الواجبة على عملية البيع. تعتمد أي تغطية من الشركة المصنعة على الجهاز والمنطقة وشروط الشركة المنشورة، ولا تصف ORVIX ضمانًا دوليًا غير مؤكد على أنه ضمان محلي رسمي."] },
        { title: "ما لا يعد عيب تصنيع", paragraphs: ["قد لا تشمل عيوب التصنيع الاستهلاك الطبيعي أو التلف العرضي أو سوء الاستخدام أو الإصلاح غير المعتمد أو الفقد أو مخالفة تعليمات العناية والسلامة المنشورة."] },
        { title: "طلب المساعدة", paragraphs: ["أرسل رقم الطلب ووصفًا واضحًا للمشكلة وصورًا أو فيديو داعمًا عبر دعم ORVIX الرسمي. ستوضح ORVIX خطوة الفحص أو الإجراء التالي قبل إرسال الجهاز لأي مكان."] },
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy policy",
      intro: "The information ORVIX uses to fulfil orders, protect tracking and support customers.",
      sections: [
        { title: "Information we process", paragraphs: ["ORVIX processes checkout and account details such as name, phone, email, delivery address, order contents, support messages and basic security or analytics information needed to run the store."] },
        { title: "How it is used", paragraphs: ["The data is used to accept and deliver orders, send transactional emails, provide customer support, prevent abuse, improve store performance and meet legal obligations."], bullets: ["Bosta receives the delivery details needed to transport a shipment.", "Resend processes transactional email delivery.", "Supabase stores account and commerce records."] },
        { title: "Secure tracking", paragraphs: ["ORVIX does not show an order from a phone number alone. A one-time code is sent to the email saved on the order; codes expire after 10 minutes and verified tracking sessions after 30 minutes. Only hashes of codes and session tokens are stored."] },
        { title: "Choices and contact", paragraphs: ["ORVIX does not sell customer personal data. Contact official ORVIX support to ask about your stored information, subject to identity checks and records that must be kept for legal or operational reasons."] },
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      intro: "البيانات التي تستخدمها ORVIX لتنفيذ الطلب وحماية التتبع ودعم العملاء.",
      sections: [
        { title: "البيانات التي نعالجها", paragraphs: ["تعالج ORVIX بيانات الطلب والحساب مثل الاسم والموبايل والإيميل وعنوان التوصيل ومحتويات الطلب ورسائل الدعم وبعض بيانات الأمان والتحليلات اللازمة لتشغيل المتجر."] },
        { title: "طريقة الاستخدام", paragraphs: ["تستخدم البيانات لقبول الطلبات وتوصيلها وإرسال الإيميلات التشغيلية ودعم العملاء ومنع إساءة الاستخدام وتحسين أداء المتجر والوفاء بالالتزامات القانونية."], bullets: ["تستلم بوسطة بيانات التوصيل اللازمة لنقل الشحنة.", "تعالج Resend إرسال الإيميلات التشغيلية.", "تخزن Supabase سجلات الحسابات والتجارة."] },
        { title: "التتبع الآمن", paragraphs: ["لا تعرض ORVIX الطلب باستخدام رقم الموبايل وحده. يرسل كود مؤقت إلى الإيميل المحفوظ على الطلب؛ تنتهي الأكواد بعد 10 دقائق وجلسة التتبع المؤكدة بعد 30 دقيقة. يتم تخزين بصمات الأكواد ورموز الجلسات بدلًا من القيم الأصلية."] },
        { title: "الاختيارات والتواصل", paragraphs: ["لا تبيع ORVIX البيانات الشخصية للعملاء. تواصل مع الدعم الرسمي للسؤال عن بياناتك، مع مراعاة التحقق من الهوية والسجلات التي يلزم الاحتفاظ بها قانونيًا أو تشغيليًا."] },
      ],
    },
  },
  terms: {
    en: {
      title: "Store terms",
      intro: "The basic rules for using the ORVIX website and placing an order.",
      sections: [
        { title: "Orders", paragraphs: ["An order is accepted only after the website validates the product, price, stock, delivery information and any discount. ORVIX can contact the customer to confirm details or safely cancel an order affected by an obvious error, suspected abuse or unavailable stock."] },
        { title: "Prices and payment", paragraphs: ["Prices are shown in Egyptian pounds. The checkout summary displays product discounts and delivery charges before confirmation. The payment method selected at checkout controls how the confirmed order is collected."] },
        { title: "Accounts and security", paragraphs: ["Keep account credentials and email codes private. Do not misuse the website, attempt unauthorised access, automate abusive requests or submit false customer information. If you are below the legal age to enter a purchase contract, use the store with a parent or guardian."] },
        { title: "Product information", paragraphs: ["ORVIX works to keep descriptions and specifications accurate. Manufacturer features, applications, compatibility and services can change, and health features are for general wellness rather than medical diagnosis."] },
      ],
    },
    ar: {
      title: "شروط المتجر",
      intro: "القواعد الأساسية لاستخدام موقع ORVIX وإنشاء الطلب.",
      sections: [
        { title: "الطلبات", paragraphs: ["لا يقبل الطلب إلا بعد تحقق الموقع من المنتج والسعر والمخزون وبيانات التوصيل وكود الخصم. قد تتواصل ORVIX لتأكيد البيانات أو تلغي الطلب بأمان عند وجود خطأ واضح أو إساءة استخدام مشتبه بها أو نفاد المخزون."] },
        { title: "الأسعار والدفع", paragraphs: ["تظهر الأسعار بالجنيه المصري، ويعرض ملخص الدفع الخصومات ورسوم التوصيل قبل التأكيد. تحدد طريقة الدفع المختارة كيفية تحصيل قيمة الطلب المؤكد."] },
        { title: "الحساب والأمان", paragraphs: ["حافظ على بيانات الحساب وأكواد الإيميل بسرية. لا تسئ استخدام الموقع أو تحاول دخولًا غير مصرح به أو ترسل طلبات آلية ضارة أو بيانات عميل غير صحيحة. إذا كنت دون السن القانوني لإبرام عقد شراء، استخدم المتجر مع ولي الأمر."] },
        { title: "معلومات المنتج", paragraphs: ["تعمل ORVIX على دقة الوصف والمواصفات. قد تتغير خصائص الشركة المصنعة والتطبيقات والتوافق والخدمات، وخصائص الصحة مخصصة للعافية العامة وليست للتشخيص الطبي."] },
      ],
    },
  },
};

export default function StorePolicyPage({ policy }: { policy: PolicySlug }) {
  const { language } = useLanguage();
  const page = content[policy][language];
  const rtl = language === "ar";

  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#090a0c] text-white">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6">
        <Link href="/" className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">{rtl ? "الرجوع للمتجر ←" : "← Back to store"}</Link>
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/45">ORVIX CUSTOMER POLICY</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{page.title}</h1>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/42">{page.intro}</p>

        <div className="mt-8 space-y-4">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-[26px] border border-white/[0.09] bg-white/[0.03] p-5 sm:p-7">
              <h2 className="text-xl font-black">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm font-medium leading-7 text-white/48">{paragraph}</p>)}
              {section.bullets ? <ul className="mt-4 space-y-2 text-sm leading-6 text-white/45">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-3"><span className="text-blue-200">•</span><span>{bullet}</span></li>)}</ul> : null}
            </article>
          ))}
        </div>

        {policy === "returns" ? (
          <a href="https://cpa.gov.eg/ar-EG/%D8%A7%D8%B3%D8%A6%D9%84%D8%A9-%D9%85%D8%AA%D9%83%D8%B1%D8%B1%D8%A9" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-3 text-xs font-black text-white/55 hover:text-white">
            {rtl ? "إرشادات جهاز حماية المستهلك ↗" : "Egyptian Consumer Protection Agency guidance ↗"}
          </a>
        ) : null}
        <p className="mt-8 text-[10px] text-white/22">Last updated: 23 August 2026</p>
      </section>
    </main>
  );
}
