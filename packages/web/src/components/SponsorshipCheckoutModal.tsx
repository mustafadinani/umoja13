import { useState } from "react";
import { SPONSORSHIP_TIERS, type SponsorTier, type SponsorshipDonorType } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { createSponsorshipIntent, confirmSponsorshipPayment } from "../lib/callables";
import { uploadPickedPhoto } from "../lib/uploadPhoto";
import { Modal, PrimaryButton, Pill } from "./ui";
import { StripePaymentForm } from "./StripePaymentForm";
import { SponsorInquiryModal } from "./SponsorInquiryModal";

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

function callableMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

export function SponsorshipCheckoutModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [showInquiry, setShowInquiry] = useState(false);
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [tierId, setTierId] = useState<SponsorTier | null>(null);
  const [donorType, setDonorType] = useState<SponsorshipDonorType>("individual");
  const [donorName, setDonorName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidAmountCents, setPaidAmountCents] = useState<number | null>(null);

  if (showInquiry) return <SponsorInquiryModal onClose={onClose} />;

  const tier = SPONSORSHIP_TIERS.find((t) => t.id === tierId) ?? null;
  const customAmountCents = Math.round(parseFloat(customAmount || "0") * 100);
  const validCustomAmount = tier?.priceCents == null ? customAmountCents >= 100 : true;
  const canSubmit = !!tier && !!donorName.trim() && !!email.trim() && validCustomAmount;

  // Same embedded Stripe Payment Element pattern as Report to Commissioner
  // (createReportFeeIntent + StripePaymentForm) — no more redirecting the
  // donor to an external Stripe Checkout tab.
  async function continueToPayment() {
    if (!tier || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      let companyLogoUrl: string | undefined;
      if (donorType === "business" && logoFile) {
        companyLogoUrl = await uploadPickedPhoto(logoFile, `sponsorshipLogos/${user?.uid ?? "guest"}/${Date.now()}-${logoFile.name}`);
      }

      const intent = await createSponsorshipIntent({
        tierId: tier.id,
        donorType,
        donorName: donorName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(companyLogoUrl ? { companyLogoUrl } : {}),
        ...(tier.priceCents == null
          ? { customAmountCents, ...(customNote.trim() ? { customNote: customNote.trim() } : {}) }
          : {}),
        ...(websiteUrl.trim() ? { websiteUrl: websiteUrl.trim() } : {}),
        ...(instagramUrl.trim() ? { instagramUrl: instagramUrl.trim() } : {}),
        ...(socialUrl.trim() ? { socialUrl: socialUrl.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setClientSecret(intent.data.clientSecret);
      setPublishableKey(intent.data.publishableKey);
      setPaymentIntentId(intent.data.paymentIntentId);
      setOrderId(intent.data.orderId);
      setPaidAmountCents(intent.data.amountCents);
      setStep("pay");
    } catch (e) {
      setError(callableMessage(e, "Couldn't start payment."));
    } finally {
      setBusy(false);
    }
  }

  async function onCardPaid() {
    if (!orderId || !paymentIntentId) return;
    setBusy(true);
    setError(null);
    try {
      await confirmSponsorshipPayment({ orderId, paymentIntentId });
      setStep("done");
    } catch (e) {
      setError(callableMessage(e, "Payment succeeded but confirming it failed. Contact us with your payment receipt."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <Modal onClose={onClose} width={420}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginTop: 8 }}>Thank you for your support!</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 8, lineHeight: 1.45 }}>
            Your {tier?.label.toLowerCase()} sponsorship{paidAmountCents ? ` (${formatDollars(paidAmountCents)})` : ""} is confirmed. Our team
            will follow up by email.
          </div>
          <PrimaryButton style={{ marginTop: 20, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={560}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Become a Sponsor</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 18 }}>
        Pick a tier, tell us about yourself, then pay securely through Stripe.
      </div>

      {step === "pay" && clientSecret && publishableKey && (
        <>
          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaid={() => void onCardPaid()}
            onError={setError}
            statusText={`Enter card details for your ${tier ? formatDollars(paidAmountCents ?? tier.priceCents ?? customAmountCents) : ""} sponsorship.`}
            payLabel={`PAY ${paidAmountCents != null ? formatDollars(paidAmountCents) : ""}`}
          />
          {busy && <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 12 }}>Confirming your sponsorship…</div>}
        </>
      )}

      {step === "form" && (
      <>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Choose a tier</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {SPONSORSHIP_TIERS.map((t) => {
          const active = tierId === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setTierId(t.id)}
              style={{
                cursor: "pointer",
                borderRadius: theme.radius.sm,
                border: `2px solid ${active ? theme.color.purple : theme.color.border}`,
                background: active ? "#F7F0FF" : "#fff",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{t.label}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: theme.color.purple }}>
                  {t.priceCents != null ? formatDollars(t.priceCents) : "Name your amount"}
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, fontStyle: "italic", marginTop: 2 }}>{t.tagline}</div>
              {active && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12.5, color: theme.color.text }}>
                  {t.perks.map((perk) => (
                    <li key={perk} style={{ marginBottom: 3 }}>{perk}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {tier && (
        <>
          {tier.priceCents == null && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Your amount ($)</div>
              <input
                type="number"
                min={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="e.g. 2500"
                style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
              />
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>What would you like to include? (optional)</div>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={3}
                placeholder="Tell us what matters to you — signage, jerseys, media, anything else…"
                style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 12 }}
              />
            </>
          )}

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>You're sponsoring as</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Pill active={donorType === "individual"} onClick={() => setDonorType("individual")}>Individual</Pill>
            <Pill active={donorType === "business"} onClick={() => setDonorType("business")}>Business</Pill>
          </div>

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{donorType === "business" ? "Company name" : "Full name"}</div>
          <input
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
          />

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
          />

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Phone (optional)</div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
          />

          {donorType === "business" && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Company logo (optional)</div>
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} style={{ marginBottom: 16 }} />
            </>
          )}

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, marginTop: 4 }}>Show off your support (all optional)</div>
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Website (https://…)"
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13.5 }}
          />
          <input
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="Instagram handle or link"
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13.5 }}
          />
          <input
            value={socialUrl}
            onChange={(e) => setSocialUrl(e.target.value)}
            placeholder="Another social media page (optional)"
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13.5 }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="A short description of your business or why you're supporting Umoja (optional)"
            style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 16 }}
          />

          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <PrimaryButton disabled={!canSubmit || busy} onClick={() => void continueToPayment()} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : `CONTINUE TO PAYMENT`}
          </PrimaryButton>
        </>
      )}
      </>
      )}

      {step === "form" && (
        <div onClick={() => setShowInquiry(true)} style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: theme.color.textMuted, cursor: "pointer" }}>
          Prefer to just talk to our team first? Send an inquiry instead →
        </div>
      )}
    </Modal>
  );
}
