import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  LogOut,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Category } from "#/generated/prisma/client";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { getMyProfile, updateProfile } from "#/server/profiles";
import { getBillingOverview } from "#/server/billing";
import { getTransactionalEmailReadiness } from "#/server/email-readiness";
import { authClient } from "#/lib/auth-client";
import { loginSearch } from "#/lib/auth-nav";
import { buildPageMeta } from "#/lib/seo";
import {
  exportAccountOwnershipCsv,
  exportFinanceBackup,
  exportFinanceCsv,
  previewFinanceBackupRestore,
  restoreFinancePlanningFromBackup,
} from "#/server/account-data";

const settingsMeta = buildPageMeta({
  path: "/settings",
  title: "Settings",
  description: "Manage your Wollie account.",
  noindex: true,
});

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: settingsMeta.meta,
    links: settingsMeta.links,
  }),
  loader: async () => {
    const [profile, billing, emailReadiness] = await Promise.all([
      getMyProfile(),
      getBillingOverview(),
      getTransactionalEmailReadiness(),
    ]);
    return { profile, billing, emailReadiness };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { profile, billing, emailReadiness } = Route.useLoaderData();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [field] = useState<Category>(profile?.field ?? "FINANCE");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState<
    "export" | "delete" | null
  >(null);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [restoreText, setRestoreText] = useState("");
  const [restorePreview, setRestorePreview] = useState<Awaited<
    ReturnType<typeof previewFinanceBackupRestore>
  > | null>(null);
  const [restoreMessage, setRestoreMessage] = useState("");
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
    if (!isPending && !session?.user) {
      void router.navigate({
        to: "/login",
        search: loginSearch({ redirect: "/settings" }),
      });
    }
  }, [isPending, session?.user, router]);

  if (isPending || !session?.user || !profile) {
    return <main className="app-loading">Loading…</main>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);

    try {
      const updated = await updateProfile({
        data: { username, headline, bio, field },
      });
      setUsername(updated.username);
      setSaved(true);
      void router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const downloadAccountData = async () => {
    setPrivacyLoading("export");
    setPrivacyError("");
    setPrivacyMessage("");
    try {
      const data = await exportFinanceBackup();
      downloadBlob({
        content: JSON.stringify(data, null, 2),
        filename: `wollie-finance-backup-${new Date().toISOString().slice(0, 10)}.json`,
        type: "application/json",
      });
      setPrivacyMessage("Your data export was downloaded.");
    } catch (reason) {
      setPrivacyError(
        reason instanceof Error
          ? reason.message
          : "Could not export your data.",
      );
    } finally {
      setPrivacyLoading(null);
    }
  };

  const downloadExport = async (
    kind: "backup" | "household-csv" | "personal-csv" | "ownership-csv",
  ) => {
    setExportLoading(kind);
    setRestoreError("");
    setRestoreMessage("");
    try {
      if (kind === "backup") {
        const data = await exportFinanceBackup();
        downloadBlob({
          content: JSON.stringify(data, null, 2),
          filename: `wollie-finance-backup-${new Date().toISOString().slice(0, 10)}.json`,
          type: "application/json",
        });
      } else if (kind === "ownership-csv") {
        const data = await exportAccountOwnershipCsv();
        downloadBlob({
          content: data.content,
          filename: data.filename,
          type: data.mimeType,
        });
      } else {
        const data = await exportFinanceCsv({
          data: { scope: kind === "personal-csv" ? "personal" : "household" },
        });
        downloadBlob({
          content: data.content,
          filename: data.filename,
          type: data.mimeType,
        });
      }
      setRestoreMessage("Export downloaded.");
    } catch (reason) {
      setRestoreError(
        reason instanceof Error ? reason.message : "Could not prepare export.",
      );
    } finally {
      setExportLoading(null);
    }
  };

  const chooseBackupFile = async (file: File | undefined) => {
    if (!file) return;
    setRestoreError("");
    setRestoreMessage("");
    setRestorePreview(null);
    try {
      const backupText = await file.text();
      const preview = await previewFinanceBackupRestore({
        data: { backupText },
      });
      setRestoreText(backupText);
      setRestorePreview(preview);
      setRestoreMessage("Backup file looks valid.");
    } catch (reason) {
      setRestoreText("");
      setRestoreError(
        reason instanceof Error ? reason.message : "Could not read backup.",
      );
    }
  };

  const restoreBackup = async () => {
    if (!restoreText || !restorePreview) return;
    if (
      !window.confirm(
        "Restore planning data from this backup? This replaces current budget allocations and recurring payments. Bank data is not overwritten.",
      )
    )
      return;
    setExportLoading("restore");
    setRestoreError("");
    setRestoreMessage("");
    try {
      const result = await restoreFinancePlanningFromBackup({
        data: { backupText: restoreText },
      });
      setRestoreMessage(
        `Restored ${result.budgetAllocations} budget allocations, ${result.recurringPayments} recurring payments, and ${result.ownershipShares} ownership shares.`,
      );
      setRestorePreview(null);
      setRestoreText("");
      await router.invalidate();
    } catch (reason) {
      setRestoreError(
        reason instanceof Error ? reason.message : "Could not restore backup.",
      );
    } finally {
      setExportLoading(null);
    }
  };

  const requestAccountDeletion = async () => {
    if (
      !window.confirm(
        "Email a secure account-deletion link? Deletion permanently removes your Wollie data.",
      )
    )
      return;
    setPrivacyLoading("delete");
    setPrivacyError("");
    setPrivacyMessage("");
    try {
      const result = await authClient.deleteUser({
        callbackURL: window.location.origin,
      });
      if (result.error)
        throw new Error(
          result.error.message || "Could not request account deletion.",
        );
      setPrivacyMessage(
        "Check your email to confirm permanent account deletion.",
      );
    } catch (reason) {
      setPrivacyError(
        reason instanceof Error
          ? reason.message
          : "Could not request account deletion.",
      );
    } finally {
      setPrivacyLoading(null);
    }
  };

  return (
    <main
      id="main"
      className="wollie-workspace-page mx-auto grid w-full max-w-7xl gap-5 bg-white px-4 py-5 text-zinc-950 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge
            variant="outline"
            className="mb-1.5 rounded-md border-zinc-200 bg-white font-normal text-zinc-700"
          >
            Account
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">Profile and preferences</p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100"
        >
          <Link to="/app">
            <ArrowLeft aria-hidden="true" />
            Overview
          </Link>
        </Button>
      </header>

      <nav className="wollie-profile-links" aria-label="Your workspace">
        <Link to="/app/accounts">
          <Landmark aria-hidden="true" />
          <span>Bank accounts</span>
          <ChevronRight aria-hidden="true" />
        </Link>
        <Link to="/app/household">
          <Users aria-hidden="true" />
          <span>Household</span>
          <ChevronRight aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() =>
            void authClient
              .signOut()
              .then(() => router.navigate({ to: "/login" }))
          }
        >
          <LogOut aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </nav>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader className="border-b border-zinc-200 pb-4">
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              Used only inside your Wollie account
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="username">Handle</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  pattern="[a-z0-9-]+"
                  required
                  className="border-zinc-200 bg-white text-zinc-950 focus-visible:border-zinc-950 focus-visible:ring-zinc-950/15"
                />
                <p className="text-xs text-zinc-500">
                  Lowercase letters, numbers, and hyphens.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="headline">Budget name</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Personal budget"
                  className="border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:border-zinc-950 focus-visible:ring-zinc-950/15"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Note</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Optional"
                  className="min-h-28 resize-none border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:border-zinc-950 focus-visible:ring-zinc-950/15"
                />
              </div>

              {error && (
                <p className="text-sm font-medium text-zinc-950" role="alert">
                  {error}
                </p>
              )}
              {saved && (
                <p className="text-sm text-zinc-700" role="status">
                  Saved.
                </p>
              )}

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  {loading ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardHeader className="border-b border-zinc-200 pb-4">
              <CardTitle>Plan &amp; billing</CardTitle>
              <CardDescription>
                View your current access and compare every plan option.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Button
                asChild
                variant="outline"
                className="w-full justify-between border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100"
              >
                <Link to="/app/billing">
                  Manage plan &amp; billing
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardHeader className="border-b border-zinc-200 pb-4">
              <CardTitle>Bank connections</CardTitle>
              <CardDescription>SimpleFIN accounts</CardDescription>
              <CardAction>
                <Badge
                  variant="outline"
                  className="rounded-md border-zinc-200 bg-white text-zinc-700"
                >
                  Sync
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-5">
              <Button
                asChild
                variant="outline"
                className="w-full justify-between border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100"
              >
                <Link to="/app/accounts">
                  Manage accounts
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardHeader className="border-b border-zinc-200 pb-4">
              <CardTitle>Privacy</CardTitle>
              <CardDescription>
                Private to you and household members you invite
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <ul className="grid gap-3 text-sm text-zinc-600">
                <li className="border-b border-zinc-200 pb-3">
                  Shared only with an invited household member
                </li>
                <li className="border-b border-zinc-200 pb-3">
                  No public financial profile
                </li>
                <li>Credentials stay server-side</li>
              </ul>
              <div className="mt-5 grid gap-2 border-t border-zinc-200 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={privacyLoading !== null}
                  onClick={() => void downloadAccountData()}
                  className="w-full border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100"
                >
                  {privacyLoading === "export"
                    ? "Preparing export…"
                    : "Download my data"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={
                    privacyLoading !== null ||
                    !emailReadiness.configured ||
                    (billing?.state === "subscribed" &&
                      !billing.cancelAtPeriodEnd)
                  }
                  onClick={() => void requestAccountDeletion()}
                  className="w-full text-[var(--color-semantic-negative)] hover:bg-[var(--color-semantic-negative-soft)] hover:text-[var(--color-semantic-negative)]"
                >
                  {privacyLoading === "delete"
                    ? "Sending confirmation…"
                    : "Delete account"}
                </Button>
                {billing?.state === "subscribed" &&
                  !billing.cancelAtPeriodEnd && (
                    <p className="text-xs leading-5 text-zinc-500">
                      Cancel subscription renewal in Billing before deleting
                      your account.
                    </p>
                  )}
                {!emailReadiness.configured && (
                  <p className="text-xs leading-5 text-zinc-500">
                    Account deletion will be available after secure confirmation
                    email is configured.
                  </p>
                )}
                {privacyMessage && (
                  <p
                    className="text-xs leading-5 text-[var(--color-semantic-positive-strong)]"
                    role="status"
                  >
                    {privacyMessage}
                  </p>
                )}
                {privacyError && (
                  <p
                    className="text-xs leading-5 text-[var(--color-semantic-negative)]"
                    role="alert"
                  >
                    {privacyError}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardHeader className="border-b border-zinc-200 pb-4">
          <CardTitle>Back up, export &amp; restore</CardTitle>
          <CardDescription>
            Save a backup for recovery, or download transactions for a
            spreadsheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--color-semantic-positive-soft)] text-[var(--color-semantic-positive-strong)]">
                  <Download className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Save a full backup
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-zinc-600">
                    Best for safekeeping or moving your plan later. Includes
                    your household’s finance data in one JSON file.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                disabled={exportLoading === "backup"}
                onClick={() => void downloadExport("backup")}
                className="w-full sm:w-fit wollie-primary-action"
              >
                <Download aria-hidden="true" />
                {exportLoading === "backup"
                  ? "Preparing backup…"
                  : "Download full backup"}
              </Button>
            </section>

            <section className="grid gap-4 rounded-lg border border-zinc-200 p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
                  <FileSpreadsheet className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Export transactions
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-zinc-600">
                    Use a CSV file in Excel, Numbers, or Google Sheets.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={exportLoading === "household-csv"}
                  onClick={() => void downloadExport("household-csv")}
                >
                  {exportLoading === "household-csv"
                    ? "Preparing…"
                    : "All household transactions"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={exportLoading === "personal-csv"}
                  onClick={() => void downloadExport("personal-csv")}
                >
                  {exportLoading === "personal-csv"
                    ? "Preparing…"
                    : "My share only"}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={exportLoading === "ownership-csv"}
                onClick={() => void downloadExport("ownership-csv")}
                className="w-fit px-0 text-zinc-600 hover:bg-transparent hover:text-zinc-950"
              >
                <FileText aria-hidden="true" />
                {exportLoading === "ownership-csv"
                  ? "Preparing…"
                  : "Download account ownership & shares (CSV)"}
              </Button>
            </section>
          </div>

          <div className="grid gap-4 border-t border-zinc-200 pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <label className="grid gap-2 text-sm font-medium">
                Restore a saved plan
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) =>
                    void chooseBackupFile(event.currentTarget.files?.[0])
                  }
                  className="min-h-11 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                This replaces your budget allocations, recurring payments, and
                ownership shares. It never restores bank login tokens, live
                balances, transactions, or billing.
              </p>
              {restorePreview && (
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p className="font-medium text-zinc-950">
                    {restorePreview.workspace}
                  </p>
                  <p className="mt-1">
                    Ready to restore {restorePreview.budgetAllocations} budget
                    allocations, {restorePreview.recurringPayments} recurring
                    payments, and ownership shares.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {restorePreview.warning}
                  </p>
                </div>
              )}
            </div>
            <Button
              type="button"
              disabled={!restorePreview || exportLoading === "restore"}
              onClick={() => void restoreBackup()}
              className="min-h-11 bg-zinc-950 text-white hover:bg-zinc-800 lg:mt-7"
            >
              <Upload aria-hidden="true" />
              {exportLoading === "restore"
                ? "Restoring…"
                : "Restore this backup"}
            </Button>
          </div>

          {restoreMessage && (
            <p
              className="text-sm text-[var(--color-semantic-positive-strong)]"
              role="status"
            >
              {restoreMessage}
            </p>
          )}
          {restoreError && (
            <p
              className="text-sm text-[var(--color-semantic-negative)]"
              role="alert"
            >
              {restoreError}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function downloadBlob({
  content,
  filename,
  type,
}: {
  content: string;
  filename: string;
  type: string;
}) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
