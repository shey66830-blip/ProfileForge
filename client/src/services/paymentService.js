const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function createOrder(plan) {
  const res = await fetch(`${API}/payment/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ plan: plan || "premium" }),
  });
  return res.json();
}

async function verifyPayment(paymentData) {
  const res = await fetch(`${API}/payment/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(paymentData),
  });
  return res.json();
}

export async function checkPremiumStatus() {
  try {
    const res = await fetch(`${API}/payment/premium-status`, { credentials: "include" });
    return res.json();
  } catch { return { ok: false, premium: false, plan: "free" }; }
}

export async function getUsage() {
  try {
    const res = await fetch(`${API}/payment/usage`, { credentials: "include" });
    return res.json();
  } catch { return { ok: false }; }
}

export async function cancelSubscription() {
  try {
    const res = await fetch(`${API}/payment/cancel`, { method: "POST", credentials: "include" });
    return res.json();
  } catch { return { ok: false, message: "Backend not reachable." }; }
}

export async function getPaymentHistory() {
  try {
    const res = await fetch(`${API}/payment/history`, { credentials: "include" });
    return res.json();
  } catch { return { ok: false, payments: [] }; }
}

// Mock test payment — activates premium instantly without Razorpay
export async function mockTestPayment(plan) {
  try {
    const res = await fetch(`${API}/payment/mock-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan: plan || "premium" }),
    });
    return res.json();
  } catch { return { ok: false, message: "Backend not reachable." }; }
}

export async function startPremiumCheckout(user, plan = "premium") {
  try {
    // Create order on server
    const orderResult = await createOrder(plan);
    if (!orderResult.ok) return { ok: false, message: orderResult.message };

    // If mock mode (no Razorpay keys configured), use mock test endpoint
    if (orderResult.mock) {
      const mockResult = await mockTestPayment(plan);
      return mockResult;
    }

    // Real Razorpay flow
    await loadRazorpayScript();
    const { order } = orderResult;
    const planLabel = plan === "pro" ? "Pro" : "Premium";
    const planPrice = plan === "pro" ? "499" : "199";

    return new Promise((resolve) => {
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "ProfileForge AI",
        description: `${planLabel} Plan — ₹${planPrice}/month`,
        order_id: order.id,
        prefill: { name: user.name || "", email: user.email || "" },
        theme: { color: plan === "pro" ? "#f59e0b" : "#6c5ce7" },
        handler: async function (response) {
          const verifyResult = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (verifyResult.ok) resolve({ ok: true, premiumExpiry: verifyResult.premiumExpiry, plan: verifyResult.plan });
          else resolve({ ok: false, message: verifyResult.message });
        },
        modal: { ondismiss: () => resolve({ ok: false, message: "Payment cancelled." }) },
      };
      new window.Razorpay(options).open();
    });
  } catch (err) {
    return { ok: false, message: err.message || "Payment failed" };
  }
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}
