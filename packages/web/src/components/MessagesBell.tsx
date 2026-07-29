import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Modal } from "./ui";
import { UserChannelPanel } from "./UserChannelPanel";

export function MessagesBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, padding: 6 }}>
        💬
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} width={420}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 12 }}>MESSAGE THE ORGANIZERS</div>
          <UserChannelPanel uid={user.uid} />
        </Modal>
      )}
    </>
  );
}
