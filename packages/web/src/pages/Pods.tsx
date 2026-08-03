import { MyPodsPanel } from "../components/MyPodsPanel";

/** A dedicated page for pod chat + tasks — not stacked inside the role dashboard, since pod membership isn't tied to any one role/dashboard flow. */
export function Pods() {
  return (
    <div className="page-shell-sm">
      <MyPodsPanel />
    </div>
  );
}
