import { useEffect, useState, type CSSProperties } from "react";
import { addDoc, collection } from "firebase/firestore";
import {
  COLLECTIONS,
  FEEDBACK_ROLES,
  FEEDBACK_ROLE_LABELS,
  FEEDBACK_RATING_CATEGORIES,
  FEEDBACK_RATING_CATEGORY_LABELS,
  FEEDBACK_RATING_VALUES,
  FEEDBACK_RATING_VALUE_LABELS,
  FEEDBACK_HELP_OPTIONS,
  FEEDBACK_HELP_OPTION_LABELS,
  VENUE,
  type FeedbackRole,
  type FeedbackRatingCategory,
  type FeedbackRatingValue,
  type FeedbackHelpOption,
} from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme, heroGradient } from "../lib/theme";
import { useIsMobile } from "../hooks/useMediaQuery";
import { Card, PrimaryButton } from "../components/ui";
import { DonateNowModal } from "../components/DonateNowModal";

type Step = 1 | 2 | 3 | 4 | 5;

// The full labels' two-line wrap (see the ratings table below) only has
// room to breathe on a wide-enough screen — at real phone widths, "Needs
// Improvement" and "Didn't Like It" both wrapping to 2 lines in a ~58px
// column overlap into their neighbor. One short word each sidesteps needing
// a wrap at all, rather than trying to shrink text further to force-fit.
const MOBILE_RATING_VALUE_LABELS: Record<FeedbackRatingValue, string> = {
  excellent: "Excellent",
  good: "Good",
  neutral: "Neutral",
  needs_improvement: "Needs",
  didnt_like_it: "Disliked",
};

function Req() {
  return <span style={{ color: theme.color.pink, marginLeft: 3 }}>*</span>;
}

/**
 * A direct child of the zero-padding Card wrapping every step (see below) —
 * it needs no negative-margin bleed trick, since there's no padding on its
 * own parent to cancel out. It previously assumed one anyway (copied from a
 * mockup where the equivalent title sat inside a padded container), which
 * pushed it 24px past the Card's own edges on both sides and got clipped by
 * the Card's `overflow: hidden` — cutting off the "F" in "Feedback" and,
 * because the browser was then treating the Card as wider than its visible
 * box, throwing off every scroll-region calculation below it too (the
 * ratings table's horizontal scroll included).
 */
function SectionBar({ children, isMobile }: { children: string; isMobile: boolean }) {
  return (
    <div style={{ fontFamily: theme.font.display, fontWeight: 700, fontSize: 20, background: theme.color.navy, color: "#fff", padding: isMobile ? "14px 22px" : "14px 32px", marginBottom: 22 }}>
      {children}
    </div>
  );
}

/**
 * Public "Umoja 13 Feedback" survey — anonymous by default (see
 * FeedbackResponse's doc comment), five steps mirroring the org's old Google
 * Form. The one real departure from that form: "Make a donation today" opens
 * DonateNowModal for a real payment in the moment, instead of just collecting
 * contact info for a follow-up call — see that component for why it's a
 * separate flow from Sponsor/Volunteer/Academy below.
 */
export function Feedback() {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>(1);

  const [roles, setRoles] = useState<FeedbackRole[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [ratings, setRatings] = useState<Partial<Record<FeedbackRatingCategory, FeedbackRatingValue>>>({});
  const [loved, setLoved] = useState("");
  const [improve, setImprove] = useState("");

  const [helpOptions, setHelpOptions] = useState<FeedbackHelpOption[]>([]);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donation, setDonation] = useState<{ orderId: string; amountCents: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill from the account, if signed in — still fully editable, and the
  // "Skip both" link below still clears it, so being logged in never forces
  // someone to be identified.
  useEffect(() => {
    if (!user) return;
    setName((n) => n || profile?.displayName || "");
    setEmail((e) => e || user.email || profile?.email || "");
  }, [user, profile]);

  function toggleRole(r: FeedbackRole) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }
  function toggleHelp(h: FeedbackHelpOption) {
    setHelpOptions((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }
  function setRating(cat: FeedbackRatingCategory, value: FeedbackRatingValue) {
    setRatings((prev) => ({ ...prev, [cat]: value }));
  }

  const step2Valid = roles.length > 0;
  const step3Valid = FEEDBACK_RATING_CATEGORIES.every((c) => !!ratings[c]) && !!loved.trim() && !!improve.trim();
  const needsHelpContact = helpOptions.length > 0;

  async function finishAndSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addDoc(collection(db, COLLECTIONS.feedbackResponses), {
        roles,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ratings,
        ...(loved.trim() ? { loved: loved.trim() } : {}),
        ...(improve.trim() ? { improve: improve.trim() } : {}),
        helpOptions,
        ...(donation ? { donatedOrderId: donation.orderId, donatedAmountCents: donation.amountCents } : {}),
        ...(user ? { filedByUid: user.uid } : {}),
        createdAt: Date.now(),
      });
      setStep(5);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Couldn't submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: theme.color.bg, minHeight: "100%" }}>
      <div className="page-shell" style={{ maxWidth: 640, padding: isMobile ? "20px 14px 60px" : "32px 20px 80px" }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {step === 1 && (
            <>
              <div style={{ background: heroGradient, color: "#fff", padding: isMobile ? "36px 24px 30px" : "44px 32px 36px", textAlign: "center" }}>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 30 : 36 }}>UMOJA GAMES</div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: 0.9, marginTop: 8 }}>
                  {VENUE.name.toUpperCase()} · {VENUE.dates.toUpperCase()}
                </div>
              </div>
              <div style={{ padding: isMobile ? "26px 22px 30px" : "30px 32px 34px" }}>
                <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.55, margin: "0 0 14px" }}>
                  Salaams, Umoja Family!
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: "0 0 14px" }}>
                  From the very first whistle to the final trophy lift, Umoja 13 was everything we hoped it would be — and then some. Thank you to
                  every player who laced up, every parent who cheered from the sideline, every coach who showed up early and stayed late, and every
                  volunteer and referee who kept things running smoothly all weekend long.
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: "0 0 14px" }}>
                  We also want to be honest: there's always room for improvement. We know there are things that need to be fixed and adjusted, and
                  we don't take that lightly. We're listening, we hear you, and we're already working on what needs to change for future events so
                  things run more seamlessly.
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, color: theme.color.textMuted, fontStyle: "italic" }}>
                  Please take a moment to share any thoughts, concerns, or ideas with us.
                </p>
                <PrimaryButton style={{ width: "100%", marginTop: 24 }} onClick={() => setStep(2)}>Start →</PrimaryButton>
              </div>
            </>
          )}

          {step === 2 && (
            <div style={{ padding: isMobile ? "0 0 26px" : "0 0 30px" }}>
              <SectionBar isMobile={isMobile}>Your Role</SectionBar>
              <div style={{ padding: isMobile ? "0 22px" : "0 32px" }}>
                <div style={{ fontSize: 12.5, fontStyle: "italic", color: theme.color.textMuted, marginBottom: 22 }}>
                  Anonymous &amp; confidential — identifying yourself below is optional
                </div>

                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Which of the following best describes your role at Umoja 13?<Req /></div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 12 }}>Select all that apply.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
                  {FEEDBACK_ROLES.map((r) => {
                    const active = roles.includes(r);
                    return (
                      <label
                        key={r}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: theme.radius.sm,
                          border: `1px solid ${active ? theme.color.purple : theme.color.border}`,
                          background: active ? "#F7F0FF" : "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
                        }}
                      >
                        <input type="checkbox" checked={active} onChange={() => toggleRole(r)} style={{ width: 17, height: 17 }} />
                        {FEEDBACK_ROLE_LABELS[r]}
                      </label>
                    );
                  })}
                </div>

                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  Your name &amp; email <span style={{ fontWeight: 600, color: theme.color.textMuted }}>(optional)</span>
                </div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 12 }}>
                  We keep this anonymous by default — only add these if you'd like us to be able to follow up on what you share.
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name, or leave blank to stay anonymous"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5 }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email, or leave blank to stay anonymous"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                />
                {(name || email) && (
                  <button
                    onClick={() => { setName(""); setEmail(""); }}
                    style={{ background: "none", border: "none", color: theme.color.purple, fontWeight: 700, fontSize: 12.5, marginTop: 8, cursor: "pointer", padding: 0 }}
                  >
                    Skip both — I'd rather stay anonymous
                  </button>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 30 }}>
                  <button onClick={() => setStep(1)} style={outlineBtnStyle}>← Back</button>
                  <span style={{ fontSize: 12, color: theme.color.textMuted, fontWeight: 600 }}>Page 2 of 5</span>
                  <PrimaryButton disabled={!step2Valid} onClick={() => setStep(3)}>Next →</PrimaryButton>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ padding: isMobile ? "0 0 26px" : "0 0 30px" }}>
              <SectionBar isMobile={isMobile}>Feedback</SectionBar>
              <div style={{ padding: isMobile ? "0 22px" : "0 32px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Please rate the following items<Req /></div>
                {/*
                  Same radio-grid the Google Form had — the earlier cutoff
                  wasn't a "needs more width than a phone has" problem, it was
                  the label column forced onto one line (whiteSpace: nowrap)
                  padding the table out past any container's real width.
                  table-layout: fixed + letting labels wrap onto their own
                  lines keeps every column's width proportional and
                  predictable instead, so the whole grid fits without
                  needing horizontal scroll at any width.
                */}
                <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%", fontSize: isMobile ? 10.5 : 12.5 }}>
                  <colgroup>
                    <col style={{ width: isMobile ? "26%" : "34%" }} />
                    {FEEDBACK_RATING_VALUES.map((v) => <col key={v} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th></th>
                      {FEEDBACK_RATING_VALUES.map((v) => {
                        if (isMobile) {
                          return (
                            <th key={v} style={{ fontWeight: 700, fontSize: 9.5, color: theme.color.textMuted, padding: "0 2px 12px", textAlign: "center" }}>
                              {MOBILE_RATING_VALUE_LABELS[v]}
                            </th>
                          );
                        }
                        const label = FEEDBACK_RATING_VALUE_LABELS[v];
                        const spaceIdx = label.indexOf(" ");
                        return (
                          <th key={v} style={{ fontWeight: 700, fontSize: 11, color: theme.color.textMuted, padding: "0 2px 12px", textAlign: "center" }}>
                            {spaceIdx === -1 ? label : <>{label.slice(0, spaceIdx)}<br />{label.slice(spaceIdx + 1)}</>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {FEEDBACK_RATING_CATEGORIES.map((cat, i) => (
                      <tr key={cat} style={{ background: i % 2 === 1 ? theme.color.bg : "transparent" }}>
                        <td style={{ fontWeight: 600, padding: "10px 6px 10px 0", borderTop: `1px solid ${theme.color.border}` }}>
                          {FEEDBACK_RATING_CATEGORY_LABELS[cat]}
                        </td>
                        {FEEDBACK_RATING_VALUES.map((v) => (
                          <td key={v} style={{ textAlign: "center", padding: "10px 2px", borderTop: `1px solid ${theme.color.border}` }}>
                            <input
                              type="radio"
                              name={`rating-${cat}`}
                              checked={ratings[cat] === v}
                              onChange={() => setRating(cat, v)}
                              style={{ width: isMobile ? 14 : 16, height: isMobile ? 14 : 16, accentColor: theme.color.purple }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginBottom: 22 }} />

                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>What did you love?<Req /></div>
                  <input
                    value={loved}
                    onChange={(e) => setLoved(e.target.value)}
                    placeholder="Your answer"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>What can we improve on?<Req /></div>
                  <input
                    value={improve}
                    onChange={(e) => setImprove(e.target.value)}
                    placeholder="Your answer"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                  />
                </div>
                {!step3Valid && (
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 6 }}>Rate every item and fill in both answers to continue.</div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
                  <button onClick={() => setStep(2)} style={outlineBtnStyle}>← Back</button>
                  <span style={{ fontSize: 12, color: theme.color.textMuted, fontWeight: 600 }}>Page 3 of 5</span>
                  <PrimaryButton disabled={!step3Valid} onClick={() => setStep(4)}>Next →</PrimaryButton>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ padding: isMobile ? "0 0 26px" : "0 0 30px" }}>
              <SectionBar isMobile={isMobile}>Help Us Take Umoja to the Next Level</SectionBar>
              <div style={{ padding: isMobile ? "0 22px" : "0 32px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>How can you help us?</div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 12 }}>
                  Donating takes you straight to a quick, secure checkout. The others just ask what we don't already have.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
                  <button
                    onClick={() => setDonateOpen(true)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left",
                      padding: "12px 14px", borderRadius: theme.radius.sm, border: `1.5px solid ${theme.color.gold}`,
                      background: donation ? theme.color.successBg : "#FFF8E8", cursor: "pointer", fontSize: 14, fontWeight: 700,
                    }}
                  >
                    <span>{donation ? `✓ Donated $${(donation.amountCents / 100).toLocaleString()} — thank you!` : "💛 Make a donation today"}</span>
                    {!donation && <span style={{ color: theme.color.navy, fontWeight: 800 }}>→</span>}
                  </button>
                  {FEEDBACK_HELP_OPTIONS.map((h) => {
                    const active = helpOptions.includes(h);
                    return (
                      <label
                        key={h}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: theme.radius.sm,
                          border: `1px solid ${active ? theme.color.purple : theme.color.border}`,
                          background: active ? "#F7F0FF" : "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
                        }}
                      >
                        <input type="checkbox" checked={active} onChange={() => toggleHelp(h)} style={{ width: 17, height: 17 }} />
                        {FEEDBACK_HELP_OPTION_LABELS[h]}
                      </label>
                    );
                  })}
                </div>

                {needsHelpContact && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Leave your info so our team can follow up<Req /></div>
                    <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 10 }}>Only asking for what page 2 didn't already give us.</div>
                    {name.trim() ? (
                      <div style={alreadyHaveStyle}><span>✓ Name</span><span style={{ marginLeft: "auto", fontWeight: 700, color: theme.color.text }}>{name}</span></div>
                    ) : (
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5 }}
                      />
                    )}
                    {email.trim() ? (
                      <div style={alreadyHaveStyle}><span>✓ Email</span><span style={{ marginLeft: "auto", fontWeight: 700, color: theme.color.text }}>{email}</span></div>
                    ) : (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                      />
                    )}
                  </div>
                )}

                {!needsHelpContact && !donation && (
                  <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 12 }}>Not able to help right now? No problem — skip ahead.</div>
                )}

                {submitError && <div style={{ color: theme.color.danger, fontSize: 13, marginTop: 14 }}>{submitError}</div>}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
                  <button onClick={() => setStep(3)} style={outlineBtnStyle}>← Back</button>
                  <span style={{ fontSize: 12, color: theme.color.textMuted, fontWeight: 600 }}>Page 4 of 5</span>
                  <PrimaryButton disabled={submitting} onClick={() => void finishAndSubmit()}>{submitting ? "Submitting…" : "Next →"}</PrimaryButton>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ padding: isMobile ? "40px 22px" : "48px 32px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: theme.color.successBg, color: theme.color.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 18px" }}>✓</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Thank you!</div>
                <p style={{ color: theme.color.textMuted, fontSize: 14, maxWidth: 380, margin: "0 auto" }}>
                  Your feedback means a lot — it's exactly how we make the next Umoja Games even better.
                  {donation ? ` And thank you again for your $${(donation.amountCents / 100).toLocaleString()} gift — it goes straight to Umoja 14.` : ""} See you in 2027!
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {donateOpen && (
        <DonateNowModal
          onClose={() => setDonateOpen(false)}
          onDonated={(info) => { setDonation(info); setDonateOpen(false); }}
        />
      )}
    </div>
  );
}

const outlineBtnStyle: CSSProperties = {
  background: "none",
  border: `1.5px solid ${theme.color.border}`,
  color: theme.color.text,
  borderRadius: theme.radius.sm,
  padding: "10px 18px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const alreadyHaveStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  color: theme.color.success,
  background: theme.color.successBg,
  borderRadius: theme.radius.sm,
  padding: "10px 14px",
  marginBottom: 10,
};
