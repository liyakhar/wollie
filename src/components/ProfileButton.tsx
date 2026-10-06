import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { authClient } from "#/lib/auth-client";

/** Round avatar that opens the profile page. Shown only on phone screens. */
export function ProfileButton({ demo = false }: { demo?: boolean }) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const initial = demo ? "W" : user?.name?.charAt(0).toUpperCase() || "U";

  return (
    <Link
      to="/settings"
      className="wollie-profile-button"
      aria-label={demo ? "Accounts" : "Profile and settings"}
    >
      <Avatar className="size-9">
        {!demo && user?.image ? <AvatarImage src={user.image} /> : null}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
    </Link>
  );
}
