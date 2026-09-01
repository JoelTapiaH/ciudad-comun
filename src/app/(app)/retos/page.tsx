import { redirect } from "next/navigation";
import ChallengeList from "@/components/ChallengeList";
import { getBuildings, getChallenges, getWorkspace } from "@/lib/data";

export default async function RetosPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/empezar");

  const { group, members } = workspace;
  const [challenges, buildings] = await Promise.all([getChallenges(group.id), getBuildings()]);

  return (
    <ChallengeList
      groupId={group.id}
      challenges={challenges}
      rewards={buildings.filter((b) => b.reward_only)}
      names={Object.fromEntries(members.map((m) => [m.id, m.display_name]))}
    />
  );
}
