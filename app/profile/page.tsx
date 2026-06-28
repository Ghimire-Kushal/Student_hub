import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { BackLink } from "@/components/BackLink";
import { getProfile } from "@/app/actions/profile";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen">
      <TopBar userEmail={session.user.email} />
      <main className="max-w-xl mx-auto px-4 py-8">
        <BackLink href="/" label="Dashboard" />

        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center text-accent text-2xl font-semibold select-none">
              {(profile.name ?? profile.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink">{profile.name ?? "No name set"}</h1>
              <p className="text-sm text-ink-muted">{profile.email}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        <ProfileForm name={profile.name} email={profile.email} />
      </main>
    </div>
  );
}
