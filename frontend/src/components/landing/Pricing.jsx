import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    cta: "Get started free",
    features: ["1 brand", "50 posts/mo", "3 platforms", "Basic analytics"],
    highlight: false,
  },
  {
    name: "Starter",
    monthly: 19,
    annual: 15,
    cta: "Start Starter",
    features: ["3 brands", "200 posts/mo", "All platforms", "Advanced analytics"],
    highlight: true,
  },
  {
    name: "Pro",
    monthly: 49,
    annual: 39,
    cta: "Start Pro",
    features: ["10 brands", "500 posts/mo", "Unlimited members", "Multi-Channel Sync"],
    highlight: false,
  },
  {
    name: "Agency",
    monthly: null,
    annual: null,
    cta: "Contact sales",
    features: ["Unlimited brands", "Unlimited posts", "Priority support", "Custom integrations"],
    highlight: false,
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="bg-card py-24" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[900px] mx-auto px-6 text-center">
        <p style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          PRICING
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 500, color: "#0A0A0A", marginTop: 8, marginBottom: 8 }}>
          Plans for every stage of growth
        </h2>
        <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 24 }}>Start free, upgrade when you're ready.</p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 mb-10 px-4 py-2 rounded-lg" style={{ border: "0.5px solid #E5E7EB" }}>
          <button
            onClick={() => setAnnual(false)}
            style={{ fontSize: 13, color: !annual ? "#0A0A0A" : "#9CA3AF", fontWeight: !annual ? 500 : 400 }}
          >
            Monthly
          </button>
          <div
            className="w-10 h-5 rounded-full cursor-pointer relative transition-colors"
            style={{ backgroundColor: annual ? "#0A0A0A" : "#E5E7EB" }}
            onClick={() => setAnnual(!annual)}
          >
            <div
              className="absolute top-0.5 w-4 h-4 bg-card rounded-full transition-transform"
              style={{ transform: annual ? "translateX(22px)" : "translateX(2px)" }}
            />
          </div>
          <button
            onClick={() => setAnnual(true)}
            className="flex items-center gap-1.5"
            style={{ fontSize: 13, color: annual ? "#0A0A0A" : "#9CA3AF", fontWeight: annual ? 500 : 400 }}
          >
            Annual
            <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontSize: 10 }}>
              Save 20%
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl p-5 text-left"
              style={{
                border: plan.highlight ? "1.5px solid #0A0A0A" : "0.5px solid #E5E7EB",
                position: "relative",
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0A0A0A] text-white rounded-full"
                  style={{ fontSize: 9, fontWeight: 500, whiteSpace: "nowrap" }}
                >
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", marginBottom: 12 }}>{plan.name}</div>
              <div className="mb-4">
                {plan.monthly !== null ? (
                  <>
                    <span style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A" }}>
                      ${annual ? plan.annual : plan.monthly}
                    </span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>/mo</span>
                  </>
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 500, color: "#0A0A0A" }}>Custom</span>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2" style={{ fontSize: 12, color: "#6B7280" }}>
                    <Check size={12} className="mt-0.5 shrink-0 text-foreground" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="w-full py-2 rounded-lg transition-colors duration-150 cursor-pointer"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  backgroundColor: plan.highlight ? "#0A0A0A" : "transparent",
                  color: plan.highlight ? "#fff" : "#0A0A0A",
                  border: plan.highlight ? "none" : "0.5px solid #E5E7EB",
                }}
                onClick={() => navigate("/login")}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <button
          className="hover:text-foreground transition-colors duration-150 cursor-pointer"
          style={{ fontSize: 13, color: "#6B7280", border: "0.5px solid #E5E7EB", padding: "8px 20px", borderRadius: 8 }}
          onClick={() => navigate("/pricing")}
        >
          See full pricing →
        </button>
      </div>
    </section>
  );
}
