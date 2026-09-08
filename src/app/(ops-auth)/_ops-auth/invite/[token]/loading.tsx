import { PanelCard } from "@/components/patterns/panel-card";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function StaffInvitationLoading() {
  return (
    <PanelCard>
      <PanelSkeleton label="Loading your staff invitation" />
    </PanelCard>
  );
}
