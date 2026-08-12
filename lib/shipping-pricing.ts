export type DeliveryArea = {
  code: string;
  name: string;
  fee: number;
};

export type BostaCityForPricing = {
  name: string;
  sector?: number | null;
};

export const deliveryAreas: DeliveryArea[] = [
  {
    code: "CAIRO",
    name: "Cairo",
    fee: 70,
  },
  {
    code: "ALEXANDRIA",
    name: "Alexandria",
    fee: 75,
  },
  {
    code: "DELTA_CANAL",
    name: "Delta and Canal Cities",
    fee: 85,
  },
  {
    code: "UPPER_EGYPT_RED_SEA",
    name: "Upper Egypt and Red Sea",
    fee: 100,
  },
  {
    code: "REMOTE_AREAS",
    name:
      "New Valley, South Sinai, Sharm El Sheikh and Marsa Matrouh",
    fee: 140,
  },
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

/*
  Bosta groups Egyptian cities into sectors.
  A name check keeps the old ORVIX remote-area
  pricing accurate for the cities that share a
  Bosta sector with other governorates.
*/
export function getDeliveryAreaForBostaCity(
  city: BostaCityForPricing
) {
  const cityName = String(
    city.name || ""
  ).toLowerCase();

  const isRemote = [
    "new valley",
    "south sinai",
    "sharm",
    "matrouh",
    "marsa matruh",
    "marsa matrouh",
  ].some((name) =>
    cityName.includes(name)
  );

  if (isRemote) {
    return area("REMOTE_AREAS");
  }

  switch (Number(city.sector)) {
    case 1:
      return area("CAIRO");

    case 2:
      return area("ALEXANDRIA");

    case 3:
      return area("DELTA_CANAL");

    case 4:
    case 5:
    case 8:
      return area(
        "UPPER_EGYPT_RED_SEA"
      );

    case 6:
    case 7:
      return area("REMOTE_AREAS");

    default:
      /*
        Unknown/new sectors use the highest
        delivery fee so checkout never
        undercharges shipping.
      */
      return area("REMOTE_AREAS");
  }
}
