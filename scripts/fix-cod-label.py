from pathlib import Path

path = Path("app/admin/page.tsx")
text = path.read_text()


def replace_exact(old: str, new: str, expected: int = 1) -> None:
    global text
    found = text.count(old)
    if found != expected:
        raise SystemExit(
            f"Expected {expected} occurrences, found {found}: {old[:80]!r}"
        )
    text = text.replace(old, new)


old_collection_vars = """    const orvixCollection =
      getOrvixCollection(order);

    const courierCollection =
      getCourierCollection(order);

    const calculatedTotal =
      getCalculatedOrderTotal(order);"""

new_collection_vars = """    const isCashOnDelivery =
      order.payment_method ===
      \"cash_on_delivery\";

    const calculatedTotal =
      getCalculatedOrderTotal(order);

    const orvixCollection =
      isCashOnDelivery
        ? 0
        : getOrvixCollection(order);

    const courierCollection =
      isCashOnDelivery
        ? calculatedTotal
        : getCourierCollection(order);"""

replace_exact(old_collection_vars, new_collection_vars)

old_print_collection_vars = """  const orvixCollection =
    getOrvixCollection(order);

  const courierCollection =
    getCourierCollection(order);

  const calculatedTotal =
    getCalculatedOrderTotal(order);"""

new_print_collection_vars = """  const isCashOnDelivery =
    order.payment_method ===
    \"cash_on_delivery\";

  const calculatedTotal =
    getCalculatedOrderTotal(order);

  const orvixCollection =
    isCashOnDelivery
      ? 0
      : getOrvixCollection(order);

  const courierCollection =
    isCashOnDelivery
      ? calculatedTotal
      : getCourierCollection(order);"""

replace_exact(old_print_collection_vars, new_print_collection_vars)

old_png_orvix = """      {
        title: \"تحصيل ORVIX\",
        value: `${formatMoney(
          orvixCollection
        )} جنيه عبر InstaPay`,
      },"""

new_png_orvix = """      {
        title: \"تحصيل ORVIX\",
        value: isCashOnDelivery
          ? \"لا يوجد - الدفع كاش للمندوب\"
          : `${formatMoney(
              orvixCollection
            )} جنيه عبر InstaPay`,
      },"""

replace_exact(old_png_orvix, new_png_orvix)

old_png_courier = """      {
        title: \"تحصيل المندوب\",
        value: `${formatMoney(
          courierCollection
        )} جنيه - الشحن فقط`,
      },"""

new_png_courier = """      {
        title: \"تحصيل المندوب\",
        value: isCashOnDelivery
          ? `${formatMoney(
              courierCollection
            )} جنيه - إجمالي الأوردر كاش`
          : `${formatMoney(
              courierCollection
            )} جنيه - الشحن فقط`,
      },"""

replace_exact(old_png_courier, new_png_courier)

old_png_instapay_footer = """    context.fillText(
      `تحويل إلى ORVIX عبر InstaPay: ${formatMoney(
        orvixCollection
      )} جنيه`,
      canvas.width / 2,
      totalBoxY + 75,
      canvas.width - 150
    );"""

new_png_instapay_footer = """    context.fillText(
      isCashOnDelivery
        ? \"الدفع: كاش عند الاستلام للمندوب\"
        : `تحويل إلى ORVIX عبر InstaPay: ${formatMoney(
            orvixCollection
          )} جنيه`,
      canvas.width / 2,
      totalBoxY + 75,
      canvas.width - 150
    );"""

replace_exact(old_png_instapay_footer, new_png_instapay_footer)

old_png_courier_footer = """    context.fillText(
      `تحصيل المندوب: ${formatMoney(
        courierCollection
      )} جنيه - مصاريف الشحن فقط`,
      canvas.width / 2,
      totalBoxY + 115,
      canvas.width - 150
    );"""

new_png_courier_footer = """    context.fillText(
      isCashOnDelivery
        ? `تحصيل المندوب: ${formatMoney(
            courierCollection
          )} جنيه - إجمالي الأوردر`
        : `تحصيل المندوب: ${formatMoney(
            courierCollection
          )} جنيه - مصاريف الشحن فقط`,
      canvas.width / 2,
      totalBoxY + 115,
      canvas.width - 150
    );"""

replace_exact(old_png_courier_footer, new_png_courier_footer)

old_print_orvix = """        <LabelInformation
          title=\"قيمة منتجات ORVIX\"
          value={`${formatMoney(
            orvixCollection
          )} جنيه`}
        />"""

new_print_orvix = """        <LabelInformation
          title=\"تحصيل ORVIX\"
          value={
            isCashOnDelivery
              ? \"لا يوجد - الدفع كاش للمندوب\"
              : `${formatMoney(
                  orvixCollection
                )} جنيه عبر InstaPay`
          }
        />"""

replace_exact(old_print_orvix, new_print_orvix)

old_print_courier = """        <LabelInformation
          title=\"تحصيل المندوب\"
          value={`${formatMoney(
            courierCollection
          )} جنيه - مصاريف الشحن فقط`}
        />"""

new_print_courier = """        <LabelInformation
          title=\"تحصيل المندوب\"
          value={
            isCashOnDelivery
              ? `${formatMoney(
                  courierCollection
                )} جنيه - إجمالي الأوردر كاش`
              : `${formatMoney(
                  courierCollection
                )} جنيه - مصاريف الشحن فقط`
          }
        />"""

replace_exact(old_print_courier, new_print_courier)

old_print_instapay_footer = """          <span className=\"orvixAmount\">
            قيمة المنتجات عبر InstaPay
            إلى ORVIX:{\" \"}
            {formatMoney(
              orvixCollection
            )}{\" \"}
            جنيه
          </span>"""

new_print_instapay_footer = """          <span className=\"orvixAmount\">
            {isCashOnDelivery ? (
              <>الدفع كاش عند الاستلام للمندوب</>
            ) : (
              <>
                قيمة المنتجات عبر InstaPay
                إلى ORVIX:{\" \"}
                {formatMoney(
                  orvixCollection
                )}{\" \"}
                جنيه
              </>
            )}
          </span>"""

replace_exact(old_print_instapay_footer, new_print_instapay_footer)

old_print_note = """          <span>
            المندوب يحصل مصاريف الشحن
            فقط ولا يحصل قيمة المنتجات
          </span>"""

new_print_note = """          <span>
            {isCashOnDelivery
              ? \"المندوب يحصل إجمالي الأوردر كاش عند الاستلام\"
              : \"المندوب يحصل مصاريف الشحن فقط ولا يحصل قيمة المنتجات\"}
          </span>"""

replace_exact(old_print_note, new_print_note)

path.write_text(text)
print("COD shipping label patch applied successfully")
