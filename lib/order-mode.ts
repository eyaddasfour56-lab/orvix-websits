/*
  Capture-only mode keeps customer details as an availability request
  without confirming an order or preparing it for shipping.

  Set NEXT_PUBLIC_ORDER_CAPTURE_ONLY=false to restore normal checkout.
*/
export const ORDER_CAPTURE_ONLY =
  process.env.NEXT_PUBLIC_ORDER_CAPTURE_ONLY !==
  "false";
