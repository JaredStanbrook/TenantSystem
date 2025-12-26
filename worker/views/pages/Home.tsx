import type { SafeUser } from "@server/schema/auth.schema";

interface HomeProps {
  user: SafeUser | null;
}

export const Home = ({ user }: HomeProps) => {
  if (!user) {
    return (
      <div class="max-w-7xl px-4 mx-auto pt-14">
        <div class="flex flex-col items-center justify-center pt-20 ">
          <h3 class="text-2xl font-bold">Welcome Guest!</h3>
          <p class="text-muted-foreground">Please log in to continue.</p>
          <a href="/login" class="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="max-w-7xl px-4 mx-auto pt-14">
      <div class="container grow flex flex-col items-center justify-center py-12">
        <div class="space-y-4">
          <h3 class="text-2xl font-bold">Welcome {user.email}</h3>
          <div class="space-y-2">
            <p>
              <span class="font-semibold">ID:</span> {user.id}
            </p>
            {user.username && (
              <p>
                <span class="font-semibold">Username:</span> {user.username}
              </p>
            )}
            {user.email && (
              <p>
                <span class="font-semibold">Email:</span> {user.email}
              </p>
            )}
            {user.displayName && (
              <p>
                <span class="font-semibold">Display Name:</span> {user.displayName}
              </p>
            )}
            <p>
              <span class="font-semibold">TOTP Enabled:</span> {user.totpEnabled ? "Yes" : "No"}
            </p>
            <p>
              <span class="font-semibold">Active:</span> {user.isActive ? "Yes" : "No"}
            </p>
            <p>
              <span class="font-semibold">Email Verified:</span> {user.emailVerified ? "Yes" : "No"}
            </p>
            {user.phoneNumber && (
              <p>
                <span class="font-semibold">Phone:</span> {user.phoneNumber}
              </p>
            )}
            <p>
              <span class="font-semibold">Phone Verified:</span> {user.phoneVerified ? "Yes" : "No"}
            </p>
            <p>
              <span class="font-semibold">Failed Login Attempts:</span>{" "}
              {user.failedLoginAttempts ?? 0}
            </p>
            {user.lockedUntil && (
              <p>
                <span class="font-semibold">Locked Until:</span> {user.lockedUntil}
              </p>
            )}
            {user.lastLoginAt && (
              <p>
                <span class="font-semibold">Last Login:</span> {user.lastLoginAt}
              </p>
            )}
            <p>
              <span class="font-semibold">Created:</span> {user.createdAt}
            </p>
            <p>
              <span class="font-semibold">Updated:</span> {user.updatedAt}
            </p>
            <p>
              <span class="font-semibold">Roles:</span> {user.roles.join(", ")}
            </p>
            <p>
              <span class="font-semibold">Permissions:</span> {user.permissions.join(", ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
