import { Modal } from "./ui";

export function GameCardPhotoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} width={420}>
      <img src={url} alt="Game card" style={{ width: "100%", borderRadius: 8 }} />
    </Modal>
  );
}
