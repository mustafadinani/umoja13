/**
 * Hand-crafted HTML for every email this app sends. Content lives here
 * (not in the EmailJS dashboard) so the design can change with a normal
 * code review instead of someone editing a template in a third-party UI.
 * EmailJS's generic template just drops {{{html_content}}} in unescaped —
 * see services/emailjs.service.ts.
 */

const BRAND = {
  navy: "#211A33",
  textMuted: "#6F6981",
  border: "#EAE7F0",
  bg: "#F7F6F3",
  purple: "#8B2FD1",
  teal: "#0FAE9E",
  success: "#1E7A6F",
  successBg: "#E2F2EF",
  danger: "#C0392B",
  dangerBg: "#FBE3DF",
};

const HEADER_GRADIENT = "linear-gradient(115deg,#8B2FD1 0%,#2563EB 55%,#0FAE9E 100%)";

/** Escape any string interpolated into HTML so a player/volunteer-supplied name can't inject markup. */
export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailShellOptions {
  /** Small all-caps label above the heading, e.g. "VOLUNTEER APPLICATION". */
  eyebrow?: string;
  heading: string;
  /** Paragraphs of body copy, rendered in order. */
  paragraphs: string[];
  /** Optional label/value rows (e.g. category, status) rendered as a simple table. */
  rows?: { label: string; value: string }[];
  /** Optional colored status pill under the heading, e.g. { text: "APPROVED", tone: "success" }. */
  pill?: { text: string; tone: "success" | "danger" };
}

/** Single-column, brand-colored email shell with inlined styles so it survives most mail clients. */
export function renderEmailShell(opts: EmailShellOptions): string {
  const pillHtml = opts.pill
    ? `<p style="margin:0 0 16px;">
        <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.04em;
          background:${opts.pill.tone === "success" ? BRAND.successBg : BRAND.dangerBg};
          color:${opts.pill.tone === "success" ? BRAND.success : BRAND.danger};">
          ${escapeHtml(opts.pill.text)}
        </span>
      </p>`
    : "";

  const paragraphsHtml = opts.paragraphs
    .map((p) => `<p style="margin:0 0 16px;color:${BRAND.navy};line-height:1.6;font-size:15px;">${p}</p>`)
    .join("");

  const rowsHtml = opts.rows?.length
    ? `<table role="presentation" style="width:100%;margin:8px 0 20px;border-collapse:collapse;">
        ${opts.rows
          .map(
            (r) => `<tr>
              <td style="padding:6px 0;color:${BRAND.textMuted};font-size:13px;width:140px;vertical-align:top;">${escapeHtml(r.label)}</td>
              <td style="padding:6px 0;color:${BRAND.navy};font-size:14px;font-weight:600;">${escapeHtml(r.value)}</td>
            </tr>`
          )
          .join("")}
      </table>`
    : "";

  const eyebrowHtml = opts.eyebrow
    ? `<p style="margin:0 0 6px;color:${BRAND.purple};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(opts.eyebrow)}</p>`
    : "";

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">
          <tr>
            <td style="padding:22px 32px;background:${HEADER_GRADIENT};">
              <span style="color:#ffffff;font-size:15px;font-weight:800;letter-spacing:0.03em;">UMOJA GAMES 2026</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${eyebrowHtml}
              <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND.navy};">${escapeHtml(opts.heading)}</h1>
              ${pillHtml}
              ${paragraphsHtml}
              ${rowsHtml}
              <p style="margin:24px 0 0;color:${BRAND.textMuted};font-size:12px;line-height:1.5;">
                Umoja Games 2026 · Maryland SoccerPlex, Boyds MD · August 14–16, 2026
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/** Sent the moment a "Become a Volunteer" application lands, before anyone reviews it. */
export function volunteerApplicationReceivedEmail(name: string): RenderedEmail {
  const firstName = name.trim().split(" ")[0] || name;
  return {
    subject: "We got your volunteer application 🙋",
    html: renderEmailShell({
      eyebrow: "Volunteer application",
      heading: `Thanks for stepping up, ${escapeHtml(firstName)}!`,
      paragraphs: [
        "Your application to volunteer at Umoja Games 2026 has been submitted and is waiting on a quick review from our team.",
        "We'll email you as soon as it's approved — no need to do anything else for now.",
      ],
    }),
  };
}

/** Sent when admin/commissioner approves or rejects a volunteer application. */
export function volunteerApplicationDecisionEmail(name: string, approved: boolean): RenderedEmail {
  const firstName = name.trim().split(" ")[0] || name;
  if (approved) {
    return {
      subject: "You're in — volunteer application approved ✅",
      html: renderEmailShell({
        eyebrow: "Volunteer application",
        heading: `Welcome to the crew, ${escapeHtml(firstName)}!`,
        pill: { text: "APPROVED", tone: "success" },
        paragraphs: [
          "Your volunteer application has been approved. Sign in and check My Shifts on your dashboard — that's where we'll assign your tasks and time slots.",
          "See you on the field at Maryland SoccerPlex!",
        ],
      }),
    };
  }
  return {
    subject: "Update on your volunteer application",
    html: renderEmailShell({
      eyebrow: "Volunteer application",
      heading: `Hi ${escapeHtml(firstName)}, about your application`,
      pill: { text: "NOT APPROVED", tone: "danger" },
      paragraphs: [
        "We're not able to bring you onto the volunteer team for this tournament right now.",
        "If you think this is a mistake or want more detail, reach out to us and we'll follow up.",
      ],
    }),
  };
}

/** Sent when admin/commissioner approves, rejects, nullifies, or restores a player's tournament check-in. */
export function checkInDecisionEmail(params: {
  name: string;
  categoryLabel: string;
  teamName?: string;
  approved: boolean;
  rejectionReason?: string;
}): RenderedEmail {
  const firstName = params.name.trim().split(" ")[0] || params.name;
  const rows = [
    { label: "Category", value: params.categoryLabel },
    ...(params.teamName ? [{ label: "Team", value: params.teamName }] : []),
  ];

  if (params.approved) {
    return {
      subject: `Check-in approved — ${params.categoryLabel} ✅`,
      html: renderEmailShell({
        eyebrow: "Tournament check-in",
        heading: `You're cleared to play, ${escapeHtml(firstName)}!`,
        pill: { text: "APPROVED", tone: "success" },
        paragraphs: [
          "Your tournament check-in has been approved. Your QR pass is live in the app — open your Tournament Pass to show it at the gate.",
          "Note: admins may randomly re-check passes on-site; a pass can be nullified after the fact if something doesn't match up.",
        ],
        rows,
      }),
    };
  }
  return {
    subject: `Check-in needs another look — ${params.categoryLabel}`,
    html: renderEmailShell({
      eyebrow: "Tournament check-in",
      heading: `Hi ${escapeHtml(firstName)}, your check-in wasn't approved`,
      pill: { text: "NOT APPROVED", tone: "danger" },
      paragraphs: [
        params.rejectionReason
          ? `Reason: ${escapeHtml(params.rejectionReason)}`
          : "Something didn't match up during review.",
        "Open the app and resubmit your check-in (selfie + ID) — or find an admin at the venue for help.",
      ],
      rows,
    }),
  };
}

/** Email mirror of an admin broadcast / game-time reminder (sendNotification), for recipients without a registered push token. */
export function announcementEmail(title: string, body: string): RenderedEmail {
  return {
    subject: title,
    html: renderEmailShell({
      eyebrow: "Announcement",
      heading: title,
      paragraphs: [escapeHtml(body).replace(/\n/g, "<br/>")],
    }),
  };
}
