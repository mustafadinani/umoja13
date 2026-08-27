import { Fragment } from "react";
import { linkifyText } from "@umoja/shared";
import { theme } from "../lib/theme";

/** Renders free text with any http(s) URL turned into a real, clickable link — see linkifyText. */
export function LinkifiedText({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <span style={style}>
      {linkifyText(text).map((seg, i) => (
        <Fragment key={i}>
          {seg.url ? (
            <a href={seg.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.color.blue, fontWeight: 600, wordBreak: "break-word" }}>
              {seg.text}
            </a>
          ) : (
            seg.text
          )}
        </Fragment>
      ))}
    </span>
  );
}
