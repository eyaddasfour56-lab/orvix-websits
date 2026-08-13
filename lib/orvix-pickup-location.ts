export const ORVIX_PICKUP_ADDRESS_AR =
  "مدينة نصر، صلاح سالم، عمارات العبور، عمارة ٢٥ج، الدور الثالث، شقة ٥";

export const ORVIX_PICKUP_ADDRESS_EN =
  "Nasr City, Salah Salem, Obour Buildings, Building 25G, Floor 3, Apartment 5";

type PickupLocationSummary = {
  name: string;
  addressLabel: string;
};

const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

function normaliseLocationText(value: string) {
  return value
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) =>
      String(arabicDigits.indexOf(digit))
    )
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOrvixPickupAddress(
  location: PickupLocationSummary
) {
  const locationText = normaliseLocationText(
    `${location.name} ${location.addressLabel}`
  );

  const requiredTermGroups = [
    ["صلاح سالم", "salah salem"],
    [
      "عمارات العبور",
      "obour buildings",
      "obour building",
    ],
    ["25ج", "25g", "25 g"],
    [
      "الدور 3",
      "الدور ال3",
      "floor 3",
      "third floor",
    ],
    ["شقه 5", "apartment 5", "flat 5"],
  ];

  return requiredTermGroups.every((terms) =>
    terms.some((term) =>
      locationText.includes(
        normaliseLocationText(term)
      )
    )
  );
}
