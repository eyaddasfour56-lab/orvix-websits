export type BostaShippingStatus =
  | "pickup_requested"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "cancelled"
  | "exception"
  | "shipping_issue";

export type BostaOrderStatus =
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export function getShippingStatusForBostaState(
  stateCode: number
): BostaShippingStatus | null {
  if ([10, 11, 20].includes(stateCode)) {
    return "pickup_requested";
  }

  if (
    [21, 22, 23, 24, 25, 30, 40].includes(
      stateCode
    )
  ) {
    return "shipped";
  }

  if (stateCode === 41) {
    return "out_for_delivery";
  }

  if (stateCode === 45) {
    return "delivered";
  }

  if ([46, 60].includes(stateCode)) {
    return "returned";
  }

  if ([48, 49].includes(stateCode)) {
    return "cancelled";
  }

  if (stateCode === 47) {
    return "exception";
  }

  if (
    [100, 101, 102, 103, 105].includes(
      stateCode
    )
  ) {
    return "shipping_issue";
  }

  return null;
}

export function getOrderStatusForBostaState(
  stateCode: number
): BostaOrderStatus | null {
  if (
    [21, 22, 23, 24, 25, 30, 40].includes(
      stateCode
    )
  ) {
    return "shipped";
  }

  if (stateCode === 41) {
    return "out_for_delivery";
  }

  if (stateCode === 45) {
    return "delivered";
  }

  if ([48, 49].includes(stateCode)) {
    return "cancelled";
  }

  return null;
}

export function getBostaStateName(
  stateCode: number
) {
  const names: Record<number, string> = {
    10: "Pickup requested",
    11: "Waiting for route",
    20: "Route assigned",
    21: "Picked up from business",
    22: "Picking up from consignee",
    23: "Picked up from consignee",
    24: "Received at warehouse",
    25: "Fulfilled",
    30: "In transit between hubs",
    40: "Picking up",
    41: "Out for delivery",
    45: "Delivered",
    46: "Returned to business",
    47: "Exception",
    48: "Terminated",
    49: "Canceled",
    60: "Returned to stock",
    100: "Lost",
    101: "Damaged",
    102: "Investigation",
    103: "Awaiting your action",
    104: "Archived",
    105: "On hold",
  };

  return (
    names[stateCode] ||
    `Bosta state ${stateCode}`
  );
}
