import { theme } from "../lib/theme";

const LAST_UPDATED = "August 6, 2026";
const CONTACT_EMAIL = "info@umojaoutreach.org";

/**
 * Umoja13's privacy policy — required for app store / Play Console
 * submission and linked from the app itself. Written against what the app
 * actually collects (see check-in, registration, moments, chat, and
 * payment flows), not a generic template.
 */
export function Privacy() {
  return (
    <div className="page-shell-sm" style={{ maxWidth: 720 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>PRIVACY POLICY</div>
      <p style={{ color: theme.color.textMuted, fontSize: 13, margin: "0 0 28px" }}>Last updated {LAST_UPDATED}</p>

      <Section title="Who we are">
        <p>
          Umoja13 is the companion app for the Umoja Games tournament, run by Umoja Outreach Foundation
          ("Umoja," "we," "us"). This policy covers the Umoja13 mobile app and web app
          (umoja-games-proto.web.app) and applies to players, parents/guardians, captains, volunteers,
          referees, and staff who use them.
        </p>
      </Section>

      <Section title="Information we collect">
        <p>We collect information you or your registration provide directly:</p>
        <ul style={ul}>
          <li><strong>Account info</strong> — name, email, and phone number when you sign up or are registered for a team.</li>
          <li>
            <strong>Player/registration info</strong> — date of birth, team and category, jersey number, and
            (optional) profession if you choose to add it to your player card.
          </li>
          <li>
            <strong>Identity verification photos</strong> — a selfie and a photo of a government-issued ID,
            submitted during check-in so staff can confirm a player's identity against their registration
            before issuing a Tournament Pass. These photos are visible only to the player themselves and to
            admin/commissioner staff reviewing the check-in — never to other players, captains, or the public.
          </li>
          <li><strong>Photos and videos</strong> you upload to Moments, which are shown publicly in the app (like a shared tournament photo wall).</li>
          <li><strong>Messages</strong> you send in team channels, volunteer/referee channels, or to Ask Umoja (our in-app assistant) and organizers.</li>
          <li><strong>Volunteer application details</strong> — availability and an emergency contact, if you sign up to volunteer.</li>
          <li><strong>Payment information</strong>, if you make a sponsorship donation or pay an incident/report fee — processed directly by our payment processor, Stripe; we never receive or store your card number.</li>
          <li><strong>Push notification token</strong>, if you enable notifications, so we can deliver them to your device.</li>
        </ul>
      </Section>

      <Section title="How we use this information">
        <ul style={ul}>
          <li>To register and check in players, and issue Tournament Passes.</li>
          <li>To run team rosters, game schedules, standings, and the Moments photo wall.</li>
          <li>To let players, captains, volunteers, referees, and staff message each other in-app.</li>
          <li>To answer questions through Ask Umoja, our AI assistant (see below), and to let organizers step in when the assistant can't help.</li>
          <li>To send you notifications you've opted into (game reminders, messages, announcements).</li>
          <li>To process optional payments (sponsorships, incident/report fees) and provide receipts.</li>
          <li>To keep the tournament safe and fair — e.g. verifying identity at check-in, reviewing reported incidents.</li>
        </ul>
      </Section>

      <Section title="Ask Umoja (our AI assistant)">
        <p>
          When you send a message to Ask Umoja, that message and the recent history of your conversation are
          sent to Anthropic's Claude API to generate a response. We don't send your identity-verification
          photos, government ID, or payment details to the assistant — only the text you type and, if an
          organizer has replied in the same conversation, their reply. Anthropic processes this text to
          generate the assistant's answer; see <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer">Anthropic's privacy policy</a> for how they handle it.
        </p>
      </Section>

      <Section title="Who can see what">
        <ul style={ul}>
          <li><strong>The public</strong> (including signed-out visitors) can see team rosters, schedules, standings, check-in status (verified/pending — not the ID or selfie itself), and Moments you post.</li>
          <li><strong>Your team/category</strong> can see who's on your roster and jersey numbers.</li>
          <li><strong>Admins and the commissioner</strong> can see everything needed to run the tournament, including identity-verification photos submitted at check-in, incident reports, and volunteer applications.</li>
          <li><strong>Nobody else</strong> — we don't sell your information, and we don't share it with advertisers. We don't run ads in the app.</li>
        </ul>
      </Section>

      <Section title="Where your data lives">
        <p>
          We use Google Firebase to host the app, store data, authenticate accounts, and send push
          notifications, and Stripe to process payments. Photos and videos are stored in Firebase Storage.
          Data is retained for as long as your account is active and as needed to run the current and
          past tournaments (e.g. rosters and results are kept as a historical record).
        </p>
      </Section>

      <Section title="Children's information">
        <p>
          Many players in the Umoja Games are minors. A minor's registration, check-in, and identity
          verification are always submitted by their parent or guardian's account — we don't collect
          information directly from children outside of that parent/guardian-managed flow, and the consent
          shown during check-in is presented to the adult completing it.
        </p>
      </Section>

      <Section title="Your choices">
        <ul style={ul}>
          <li>You can turn off push notifications at any time in your device settings.</li>
          <li>You can ask us to see, correct, or delete your information by emailing us (below).</li>
          <li>Posting a Moment is optional — the tournament runs the same whether or not you share photos.</li>
        </ul>
      </Section>

      <Section title="Contact us">
        <p>
          Questions about this policy or your data? Email us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we make material changes to how we handle your information, we'll update this page and change
          the "Last updated" date above.
        </p>
      </Section>
    </div>
  );
}

const ul: React.CSSProperties = { margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.6 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: theme.color.navy }}>{title}</div>
      <div style={{ color: theme.color.text, fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
