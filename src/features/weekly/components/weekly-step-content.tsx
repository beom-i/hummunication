import { Configuration } from "./configuration";
import { FamilyList, FamilyEditor } from "./family-editor";
import { PublishDate } from "./publish-date";
import { SenderList, SenderEditor } from "./sender-editor";
import { SermonEditor } from "./sermon-editor";
import { WeeklyResults } from "./weekly-results";
import type { WeeklyView, WeeklyNavigate } from "../utils/workflow";

type Props = {
  step: number;
  view: WeeklyView;
  editingId: string | null;
  groupIndex: number;
  senderIndex: number;
  cardIndex: number;
  familyCount: number;
  senderCount: number;
  onNavigate: WeeklyNavigate;
};

export function WeeklyStepContent({ step, view, editingId, groupIndex, senderIndex, cardIndex, familyCount, senderCount, onNavigate }: Props) {
  if (step === 1) return <PublishDate lockedDate={editingId ?? undefined} />;
  if (step === 3) return <WeeklyResults />;

  switch (view) {
    case "sermon":
    case "sermon-preview":
      return <SermonEditor preview={view === "sermon-preview"} />;
    case "families":
      return <FamilyList onEdit={index => onNavigate(2, "family-card-edit", index)} />;
    case "family-card-edit":
      if (familyCount) return <FamilyEditor index={groupIndex} initialPage={cardIndex} />;
      break;
    case "senders":
      return <SenderList onEdit={index => onNavigate(2, "sender-edit", index)} />;
    case "sender-edit":
      if (senderCount) return <SenderEditor index={senderIndex} />;
      break;
  }
  return <Configuration />;
}
