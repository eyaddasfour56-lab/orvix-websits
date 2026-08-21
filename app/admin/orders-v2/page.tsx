import { redirect } from "next/navigation";

export default function OrdersV2RedirectPage() {
  redirect("/admin/fulfillment");
}
