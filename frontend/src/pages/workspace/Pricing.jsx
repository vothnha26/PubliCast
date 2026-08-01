import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Minus, ChevronDown } from "lucide-react";
import billingService from "../../services/billing.service";
import PaymentModal from "../../components/billing/PaymentModal";
import { toast } from "sonner";
import { useBrand } from "../../context/BrandContext";
import { PLAN_TIERS } from "../../config/accessSchema";

const COMPARISON_ROWS = [
  { section: "Social Media", rows: [
    { label: "Brands", vals: ["1", "3", "10", "50"] },
    { label: "Social profiles", vals: ["2", "5", "20", "100"] },
    { label: "Posts per month", vals: ["10", "50", "300", "2000"] },
    { label: "Content calendar", vals: [true, true, true, true] },
    { label: "Post scheduling", vals: [true, true, true, true] },
    { label: "Media library", vals: [false, true, true, true] },
  ]},
  { section: "Team & Approval", rows: [
    { label: "Users", vals: ["1", "3", "10", "50"] },
    { label: "Custom roles", vals: [false, false, true, true] },
    { label: "Approval workflow", vals: [false, false, true, true] },
  ]},
];

const FAQ = [
  { q: "Can I change plans anytime?", a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately." },
  { q: "What happens when I cancel?", a: "You keep access until the end of your billing period. After that, you're downgraded to Free." },
  { q: "Is there a free trial?", a: "Yes! The Pro plan comes with a 14-day free trial. No credit card required." },
  { q: "Can I add more team members?", a: "Yes, additional seats can be purchased for $8/user/month on Pro." },
];

// Plan names in DB are UPPERCASE (FREE, STARTER, PRO, AGENCY)
export function PricingPage() {
  const { activeBrand } = useBrand();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [dbPlans, setDbPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [expandComparison, setExpandComparison] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [addonsList, setAddonsList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeBrand?.id) {
      billingService.getCurrentSubscription(activeBrand.id)
        .then(res => setCurrentPlan(res))
        .catch(console.error);
    }
    
    billingService.getPlans()
      .then(res => {
        const sorted = (res || []).sort((a, b) => {
          const rankA = PLAN_TIERS.indexOf(a.name.toUpperCase());
          const rankB = PLAN_TIERS.indexOf(b.name.toUpperCase());
          return rankA - rankB;
        });
        setDbPlans(sorted);
      })
      .catch(console.error);

    billingService.getAddons()
      .then(res => setAddonsList(res || []))
      .catch(console.error);
  }, [activeBrand?.id]);

  // Transform dbPlans to the structure expected by the UI
  const PLANS = dbPlans.map(dbPlan => {
    const limit = dbPlan.planLimit || {};
    
    const monthlyPrice = Number(dbPlan.priceAmount);
    const annualPrice = Math.round(monthlyPrice * 0.83); // 17% discount
    const annualTotal = annualPrice * 12;

    const name = dbPlan.name.charAt(0) + dbPlan.name.slice(1).toLowerCase();
    const highlight = dbPlan.name.toUpperCase() === "PRO";
    const cta = dbPlan.name.toUpperCase() === "FREE" ? "Current Plan" : `Upgrade to ${name}`;
    const ctaDisabled = dbPlan.name.toUpperCase() === "FREE";

    // Build features list dynamically from DB details
    const features = [];
    if (limit.maxBrands) features.push(`${limit.maxBrands} Brand${limit.maxBrands > 1 ? 's' : ''}`);
    if (limit.maxSocialProfiles) features.push(`${limit.maxSocialProfiles} Social profile${limit.maxSocialProfiles > 1 ? 's' : ''}`);
    if (limit.maxPostsPerMonth) features.push(`${limit.maxPostsPerMonth} Post${limit.maxPostsPerMonth > 1 ? 's' : ''} per month`);
    if (limit.maxTeamSeats && limit.maxTeamSeats > 1) features.push(`${limit.maxTeamSeats} Team seats`);
    
    // Add active products
    if (dbPlan.products && dbPlan.products.length > 0) {
      dbPlan.products.forEach(p => {
        features.push(p.name);
      });
    }

    return {
      id: dbPlan.id,
      name,
      dbName: dbPlan.name,
      price: { monthly: monthlyPrice, annual: annualPrice },
      annualTotal,
      subtitle: dbPlan.description,
      cta,
      ctaDisabled,
      highlight,
      features
    };
  });

  // currentPlan.planName comes from DB as uppercase (e.g. "PRO", "STARTER")
  const currentTierRank = Math.max(0, PLAN_TIERS.indexOf(currentPlan?.planName?.toUpperCase()));

  const handleUpgrade = async (plan) => {
    const planTierRank = Math.max(0, PLAN_TIERS.indexOf(plan.dbName?.toUpperCase() || plan.name.toUpperCase()));
    const isCurrentPlan =
      currentPlan?.planName?.toUpperCase() === plan.dbName?.toUpperCase()
      || (plan.dbName?.toUpperCase() === 'FREE' && (!currentPlan || currentPlan.planName?.toUpperCase() === 'FREE'));
    const isLowerPlan = planTierRank < currentTierRank;
    if (plan.ctaDisabled || isCurrentPlan || isLowerPlan) return;

    if (currentPlan && currentPlan.planName !== 'FREE') {
      const confirmUpgrade = window.confirm(`Bạn đang có gói ${currentPlan.planName} còn hạn. Bạn có chắc chắn muốn mua gói ${plan.name} không?`);
      if (!confirmUpgrade) return;
    }

    try {
      setLoadingPlan(plan.name);
      
      if (!activeBrand?.id) {
        toast.error("Vui lòng chọn Brand trước khi nâng cấp.");
        return;
      }

      const paymentInfo = await billingService.initiateSubscription({
        planId: plan.id,
        brandId: activeBrand.id,
        billingCycle: billingCycle === 'annual' ? 'ANNUAL' : 'MONTHLY'
      });

      setPaymentData(paymentInfo);
    } catch (err) {
      toast.error(err.message || "Không thể khởi tạo thanh toán.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyAddon = async (addonId, qty) => {
    try {
      if (!activeBrand?.id) {
        toast.error("Vui lòng chọn Brand");
        return;
      }
      const paymentInfo = await billingService.initiateAddon({
        addonId,
        brandId: activeBrand.id,
        quantity: parseInt(qty, 10)
      });
      setPaymentData(paymentInfo);
    } catch (err) {
      toast.error(err.message || "Không thể khởi tạo mua Addon");
    }
  };

  if (dbPlans.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8F8F7]">
        <div style={{ fontSize: 14, color: "#6B7280" }}>Đang tải cấu hình gói dịch vụ...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7]" style={{ padding: "32px 24px" }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Choose Your Plan</h2>
        <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 20 }}>Scale your social media management</p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3">
          <span style={{ fontSize: 12, color: billingCycle === "monthly" ? "#0A0A0A" : "#9CA3AF" }}>Monthly</span>
          <div
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
            style={{
              width: 44,
              height: 24,
              borderRadius: 9999,
              background: billingCycle === "annual" ? "#0A0A0A" : "#E5E7EB",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s" }}
          >
            <div style={{
              position: "absolute",
              top: 3,
              left: billingCycle === "annual" ? 23 : 3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#FFF",
              transition: "left 0.2s" }} />
          </div>
          <span style={{ fontSize: 12, color: billingCycle === "annual" ? "#0A0A0A" : "#9CA3AF" }}>
            Annual
          </span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#F0FDF4", color: "#16A34A", fontWeight: 500 }}>Save 17%</span>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, maxWidth: 1000, margin: "0 auto 32px" }}>
        {PLANS.map((plan) => {
          const planTierRank = Math.max(0, PLAN_TIERS.indexOf(plan.name.toUpperCase()));
          const isCurrentPlan =
            currentPlan?.planName?.toUpperCase() === plan.name.toUpperCase()
            || (plan.name === 'Free' && (!currentPlan || currentPlan.planName?.toUpperCase() === 'FREE'));
          const isLowerPlan = planTierRank < currentTierRank;
          const isDisabled = plan.ctaDisabled || isCurrentPlan || isLowerPlan;

          const ctaLabel = loadingPlan === plan.name
            ? 'Đang xử lý...'
            : isCurrentPlan
              ? '✓ Current Plan'
              : isLowerPlan
                ? '✓ Included in your plan'
                : plan.cta;
          return (
          <div
            key={plan.name}
            style={{
              background: isLowerPlan ? "#FAFAFA" : "#FFF",
              border: plan.highlight ? "1.5px solid #0A0A0A" : isLowerPlan ? "0.5px dashed #D1D5DB" : "0.5px solid #E5E7EB",
              borderRadius: 16,
              padding: 20,
              position: "relative",
              opacity: isLowerPlan ? 0.65 : 1,
              transition: "opacity 0.2s" }}
          >
            {plan.highlight && (
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#0A0A0A",
                  color: "#FFF",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 12px",
                  borderRadius: 9999,
                  whiteSpace: "nowrap" }}
              >
                Most Popular
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", marginBottom: 2 }}>{plan.name}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>{plan.subtitle}</div>
              <div style={{ marginBottom: 4 }}>
                {plan.price.monthly === null ? (
                  <span style={{ fontSize: 24, fontWeight: 500, color: "#0A0A0A" }}>Custom</span>
                ) : (
                  <>
                    {billingCycle === "annual" && plan.price.annual && plan.name !== "Free" && (
                      <span style={{ fontSize: 14, color: "#9CA3AF", textDecoration: "line-through", marginRight: 6 }}>
                        {plan.price.monthly.toLocaleString()}
                      </span>
                    )}
                    <span style={{ fontSize: 28, fontWeight: 500, color: "#0A0A0A" }}>
                      {billingCycle === "annual" && plan.price.annual ? plan.price.annual.toLocaleString() : plan.price.monthly.toLocaleString()} VND
                    </span>
                    <span style={{ fontSize: 13, color: "#9CA3AF" }}>/mo</span>
                  </>
                )}
              </div>
              {billingCycle === "annual" && plan.name !== "Free" ? (
                <div style={{ fontSize: 10, color: "#16A34A", fontWeight: 500 }}>Billed {plan.annualTotal?.toLocaleString()} VND/year · Save 17%</div>
              ) : plan.price.monthly > 0 ? (
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>Billed monthly</div>
              ) : null}
            </div>

            <div style={{ height: 0.5, background: "#E5E7EB", marginBottom: 14 }} />

            <div className="flex flex-col gap-1.5 mb-5">
              {plan.features.slice(0, 5).map((feat, i) => (
                <div key={i} className="flex items-start gap-2">
                  {feat === "—" ? (
                    <Minus size={12} style={{ color: "#D1D5DB", marginTop: 1, flexShrink: 0 }} />
                  ) : (
                    <Check size={12} style={{ color: "#0A0A0A", marginTop: 1, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 11, color: feat === "—" ? "#9CA3AF" : "#374151" }}>{feat}</span>
                </div>
              ))}
            </div>

            <button
              disabled={loadingPlan === plan.name || isDisabled}
              onClick={() => handleUpgrade(plan)}
              style={{
                width: "100%",
                padding: "9px 0",
                borderRadius: 8,
                background: plan.highlight ? "#0A0A0A" : isDisabled ? "#F3F4F6" : "#FFF",
                color: plan.highlight ? "#FFF" : isDisabled ? "#9CA3AF" : "#0A0A0A",
                fontSize: 12,
                fontWeight: 500,
                cursor: isDisabled ? "default" : "pointer",
                border: plan.highlight ? "none" : "0.5px solid #E5E7EB",
                opacity: loadingPlan === plan.name ? 0.7 : 1
              }}
            >
              {ctaLabel}
            </button>
          </div>
        )})}
      </div>

      {/* Comparison table */}
      <div style={{ maxWidth: 1000, margin: "0 auto 32px" }}>
        <button
          onClick={() => setExpandComparison(!expandComparison)}
          className="flex items-center gap-2 cursor-pointer mx-auto"
          style={{ fontSize: 13, color: "#6B7280", background: "none", border: "none", marginBottom: 12 }}
        >
          See full comparison <ChevronDown size={14} style={{ transform: expandComparison ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>

        {expandComparison && (
          <div style={{ background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "0.5px solid #E5E7EB" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.name} style={{ padding: "10px 16px", textAlign: "center", fontSize: 11, fontWeight: 500, color: p.highlight ? "#0A0A0A" : "#6B7280" }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((sec) => (
                  <React.Fragment key={sec.section}>
                    <tr style={{ background: "#F9FAFB" }}>
                      <td colSpan={5} style={{ padding: "6px 16px", fontSize: 10, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                        {sec.section}
                      </td>
                    </tr>
                    {sec.rows.map((row, ri) => (
                      <tr key={`${sec.section}-${ri}`} style={{ borderBottom: "0.5px solid #F0F0EF" }}>
                        <td style={{ padding: "8px 16px", fontSize: 12, color: "#374151" }}>{row.label}</td>
                        {row.vals.map((val, vi) => (
                          <td key={vi} style={{ padding: "8px 16px", textAlign: "center" }}>
                            {typeof val === "boolean" ? (
                              val ? <Check size={13} style={{ color: "#0A0A0A", margin: "0 auto" }} /> : <span style={{ color: "#D1D5DB", fontSize: 12 }}>—</span>
                            ) : (
                              <span style={{ fontSize: 11, color: val === "—" ? "#D1D5DB" : "#374151" }}>{val}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Addons Section */}
      {addonsList.length > 0 && (
        <div style={{ maxWidth: 1000, margin: "0 auto 32px" }}>
          <h3 style={{ fontSize: 20, fontWeight: 500, color: "#0A0A0A", marginBottom: 16, textAlign: "center" }}>Gói bổ sung (Add-ons)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {addonsList.map((addon) => (
              <div key={addon.id} style={{ background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A" }}>{addon.name}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#0A0A0A", marginTop: 4 }}>
                    {addon.priceAmount?.toLocaleString() || addon.price?.toLocaleString()} VND<span style={{ fontSize: 12, color: "#9CA3AF" }}>/mo</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min="1" defaultValue="1" id={`qty-${addon.id}`} style={{ width: 60, padding: "6px 8px", border: "1px solid #E5E7EB", borderRadius: 6 }} />
                  <button 
                    onClick={() => {
                      const qty = document.getElementById(`qty-${addon.id}`).value;
                      handleBuyAddon(addon.id, qty);
                    }}
                    style={{ flex: 1, background: "#0A0A0A", color: "#FFF", borderRadius: 6, fontWeight: 500, fontSize: 13, cursor: "pointer" }}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: "#0A0A0A", marginBottom: 16, textAlign: "center" }}>Frequently Asked Questions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between cursor-pointer"
                style={{ padding: "12px 14px", background: "none", border: "none", textAlign: "left" }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A" }}>{item.q}</span>
                <ChevronDown size={13} style={{ color: "#9CA3AF", flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 14px 12px", fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {paymentData && (
        <PaymentModal 
          paymentData={paymentData} 
          onClose={() => setPaymentData(null)}
          onSuccess={() => {
            setPaymentData(null);
            setLoadingPlan(null);
            // Optionally refresh user session or redirect
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
