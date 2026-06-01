import { Badge } from "../Badge";
import type { Demo } from "../../types";

interface ProjectProfilePanelProps {
  profile: NonNullable<Demo["projectProfile"]>;
}

export function ProjectProfilePanel({ profile }: ProjectProfilePanelProps) {
  const notes = profile.supportStatus === "unsupported" ? profile.unsupportedReasons || [] : profile.notes || [];
  return (
    <div className="project-profile-panel">
      <div>
        <strong>{profile.label || "项目类型"}</strong>
        <span>{profile.summary || "DemoGo 已完成项目识别。"}</span>
      </div>
      <Badge tone={profile.supportStatus === "unsupported" ? "warning" : "success"}>{profile.supportLabel || (profile.supported ? "当前支持" : "暂不支持")}</Badge>
      {notes.length ? (
        <ul>
          {notes.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
