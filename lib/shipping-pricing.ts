export type DeliveryArea = {
  code: string;
  name: string;
  bostaFeeBeforeVat: number;
  fee: number;
};

export type BostaCityForPricing = {
  name: string;
  sector?: number | null;
};

const BOSTA_EGYPT_VAT_RATE = 0.14;

function bostaFeeWithVat(
  feeBeforeVat: number
) {
  return Math.ceil(
    feeBeforeVat *
      (1 + BOSTA_EGYPT_VAT_RATE)
  );
}

/*
  Bosta Egypt's official default plan for a
  normal SEND shipment has seven destination
  sectors. The published rates exclude 14% VAT,
  so ORVIX charges the VAT-inclusive amount,
  rounded up to the next whole EGP.

  Source: https://tracking.bosta.co/pricings/default-plan
  Plan last updated by Bosta: 2026-04-02.
*/
function deliveryArea(
  code: string,
  name: string,
  bostaFeeBeforeVat: number
): DeliveryArea {
  return {
    code,
    name,
    bostaFeeBeforeVat,
    fee: bostaFeeWithVat(
      bostaFeeBeforeVat
    ),
  };
}

export const deliveryAreas: DeliveryArea[] = [
  deliveryArea(
    "CAIRO_GIZA",
    "Cairo and Giza",
    97
  ),
  deliveryArea(
    "ALEXANDRIA_BEHEIRA",
    "Alexandria and Beheira",
    102
  ),
  deliveryArea(
    "DELTA_CANAL",
    "Delta and Canal",
    110
  ),
  deliveryArea(
    "NEAR_UPPER_EGYPT",
    "Near Upper Egypt",
    124
  ),
  deliveryArea(
    "FAR_UPPER_RED_SEA_MATROUH",
    "Far Upper Egypt, Red Sea and Matrouh",
    140
  ),
  deliveryArea(
    "NORTH_COAST",
    "North Coast",
    144
  ),
  deliveryArea(
    "SINAI_NEW_VALLEY",
    "Sinai and New Valley",
    160
  ),
];

const areaByCode = new Map(
  deliveryAreas.map((area) => [
    area.code,
    area,
  ])
);

function area(code: string) {
  return (
    areaByCode.get(code) ??
    deliveryAreas[
      deliveryAreas.length - 1
    ]
  );
}

export function getDeliveryAreaForBostaCity(
  city: BostaCityForPricing
) {
  switch (Number(city.sector)) {
    case 1:
      return area("CAIRO_GIZA");

    case 2:
      return area(
        "ALEXANDRIA_BEHEIRA"
      );

    case 3:
      return area("DELTA_CANAL");

    case 4:
      return area("NEAR_UPPER_EGYPT");

    case 5:
      return area(
        "FAR_UPPER_RED_SEA_MATROUH"
      );

    // Older Bosta city data used sector 8
    // for Red Sea destinations.
    case 8:
      return area(
        "FAR_UPPER_RED_SEA_MATROUH"
      );

    case 6:
      return area("NORTH_COAST");

    case 7:
      return area("SINAI_NEW_VALLEY");

    default:
      /*
        Unknown/new sectors use the highest
        delivery fee so checkout never
        undercharges shipping.
      */
      return area("SINAI_NEW_VALLEY");
  }
}
