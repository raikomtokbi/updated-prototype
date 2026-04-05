import { Truck, X } from "lucide-react";

export default function DeliveryCancellation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-800 rounded-lg border border-purple-500/20 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Truck className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Delivery & Cancellation Policy</h1>
          </div>

          <div className="space-y-6 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Delivery</h2>
              <div className="space-y-3">
                <p>
                  <strong className="text-slate-100">Instant Delivery:</strong> Most game top-ups and vouchers are delivered instantly upon successful payment confirmation. You will receive your product code or credits within seconds.
                </p>
                <p>
                  <strong className="text-slate-100">Processing Time:</strong> In rare cases, delivery may take up to 5 minutes due to payment gateway processing delays or system load.
                </p>
                <p>
                  <strong className="text-slate-100">Delivery Verification:</strong> Once your order is confirmed, you will receive an email with your delivery details and product information.
                </p>
                <p>
                  <strong className="text-slate-100">Multiple Purchases:</strong> If you purchase multiple items, each item will be delivered according to its processing requirements. You will receive individual confirmation emails for each delivery.
                </p>
              </div>
            </section>

            <hr className="border-slate-700" />

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Cancellation & Refunds</h2>
              <div className="space-y-3">
                <p>
                  <strong className="text-slate-100">Cancellation Before Delivery:</strong> If you wish to cancel your order before delivery, you must contact our support team within 1 hour of purchase.
                </p>
                <p>
                  <strong className="text-slate-100">Cancellation After Delivery:</strong> Once the product has been delivered to your account, cancellation is not possible. However, you may request a refund if the product was not properly delivered or if it was a duplicate order.
                </p>
                <p>
                  <strong className="text-slate-100">Refund Eligibility:</strong> Refunds are only available in the following cases:
                </p>
                <ul className="ml-6 space-y-2 list-disc">
                  <li>Product was not delivered within the promised timeframe (24 hours)</li>
                  <li>Product was delivered multiple times (duplicate order)</li>
                  <li>Technical error resulted in incorrect product delivery</li>
                  <li>Payment was charged twice for the same order</li>
                </ul>
                <p>
                  <strong className="text-slate-100">Refund Processing Time:</strong> Approved refunds will be processed within 5-7 business days back to your original payment method.
                </p>
              </div>
            </section>

            <hr className="border-slate-700" />

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Non-Refundable Items</h2>
              <div className="space-y-3">
                <p>
                  <strong className="text-slate-100">The following items cannot be refunded:</strong>
                </p>
                <ul className="ml-6 space-y-2 list-disc">
                  <li>Expired vouchers or expired promotional codes</li>
                  <li>Redeemed or partially redeemed credits</li>
                  <li>Orders that were intentionally misused or fraudulently obtained</li>
                  <li>Purchases that violate the terms of service</li>
                  <li>Third-party purchases made by authorized account users</li>
                </ul>
              </div>
            </section>

            <hr className="border-slate-700" />

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">How to Request a Refund</h2>
              <div className="space-y-3">
                <p>To request a refund, please:</p>
                <ol className="ml-6 space-y-2 list-decimal">
                  <li>Log in to your account and go to your Order History</li>
                  <li>Locate the order you wish to dispute</li>
                  <li>Click the "Request Refund" button</li>
                  <li>Provide details about your issue</li>
                  <li>Submit your request for review</li>
                </ol>
                <p>Alternatively, you can contact our <a href="/support" className="text-purple-400 hover:text-purple-300">support team</a> directly with your order number and reason for refund.</p>
              </div>
            </section>

            <hr className="border-slate-700" />

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Contact Us</h2>
              <p>
                If you have questions about our delivery and cancellation policy, please reach out to our support team at <a href="mailto:support@nexcoin.gg" className="text-purple-400 hover:text-purple-300">support@nexcoin.gg</a> or visit our <a href="/contact" className="text-purple-400 hover:text-purple-300">Contact Us</a> page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
