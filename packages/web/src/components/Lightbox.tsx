export function Lightbox({ src, mediaType, onClose }: { src: string; mediaType: "photo" | "video"; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,8,16,.92)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        cursor: "zoom-out",
      }}
    >
      {mediaType === "video" ? (
        <video src={src} controls autoPlay style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
      ) : (
        <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
      )}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(255,255,255,.15)",
          border: "none",
          color: "#fff",
          borderRadius: "50%",
          width: 40,
          height: 40,
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}
