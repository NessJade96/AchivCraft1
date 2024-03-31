import { redirect, useLoaderData } from "react-router-dom";
import { Text } from "../components/Text";
import { Link } from "../components/Link";
import { Card } from "../components/Card";

export function Home() {
  const data: any = useLoaderData();
  return (
    <>
      <div className="p-6">
        <Text tag="h1">Recent Achievements</Text>
      </div>
      <div className="flex justify-center flex-col gap-4 max-w-2xl min-w-96">
        {data.map((achievement: any) => {
          return (
            <Card
              achievementName={achievement.name}
              characterName={achievement.character.name}
              characterRace={achievement.character.race}
              characterClass={achievement.character.class}
              characterFaction={achievement.character.faction}
              characterRealm={achievement.character.realm_slug}
              completedTimestamp={achievement.completed_timestamp}
            />
          );
        })}
      </div>
    </>
  );
}

export const loader = async () => {
  const characterResponse = await fetch(
    `${import.meta.env.VITE_API_URL}/character/achievement`,
    {
      credentials: "include",
    }
  );
  if (!characterResponse.ok) {
    return redirect("/login");
  }
  return characterResponse;
};
