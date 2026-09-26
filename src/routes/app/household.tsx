import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { IconBank, IconChevronLeft } from "#/components/money/icons";
import { formatMoney } from "#/lib/finance-demo";
import { buildPageMeta } from "#/lib/seo";
import {
  createHouseholdInvitation,
  getHouseholdOverview,
  removeHouseholdMember,
  revokeHouseholdInvitation,
  updateAccountOwnership,
  updateHouseholdShares,
} from "#/server/household";

export const Route = createFileRoute("/app/household")({
  loader: () => getHouseholdOverview(),
  head: () => ({
    meta: buildPageMeta({
      path: "/app/household",
      title: "Household finances",
      description:
        "Manage household members, contribution shares, and account ownership.",
      noindex: true,
    }).meta,
  }),
  component: HouseholdPage,
});

function HouseholdPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const owner = data.members.find((member) => member.role === "OWNER");
  const partner = data.members.find((member) => member.role === "MEMBER");
  const isOwner = data.currentRole === "OWNER";
  const hasPartner = Boolean(partner);

  async function refreshWith(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      await router.invalidate();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function invitePartner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const invitation = await createHouseholdInvitation({ data: { email } });
      setInviteUrl(invitation.url);
      setEmail("");
      setMessage(
        invitation.delivery === "sent"
          ? `Invitation sent to ${invitation.email}.`
          : "Email delivery was unavailable. Copy and send the secure link below.",
      );
      await router.invalidate();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function copyInviteLink() {
    setError("");
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invitation link copied.");
    } catch {
      setError("Copy failed. Select the link and copy it manually.");
    }
  }

  const you = data.members.find((member) => member.id === data.currentMemberId);
  const pendingInvites = isOwner && !partner ? data.invitations : [];

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row m-title-row--back">
        <Link
          to="/settings"
          className="m-icon-button m-icon-button--glass"
          aria-label="Back to Profile"
        >
          <IconChevronLeft aria-hidden="true" />
        </Link>
      </header>
      <h1 className="m-page-title">
        {hasPartner ? "Household" : "Share with a partner"}
      </h1>

      {!hasPartner && (
        <section className="m-share-hero">
          <div className="m-share-hero__faces" aria-hidden="true">
            <span className="m-avatar">{initialOf(you?.name)}</span>
            <span className="m-avatar m-avatar--add">+</span>
          </div>
          <p>
            Plan money together. You each keep your own login, and every
            account shows whose it is: yours, theirs, or joint.
          </p>
        </section>
      )}

      {hasPartner && (
        <section className="m-section">
          <div className="m-section__head">
            <h2>People</h2>
          </div>
          <ul className="m-list m-list--roomy">
            {data.members.map((member) => (
              <li key={member.id} className="m-row">
                <span className="m-avatar m-avatar--small" aria-hidden="true">
                  {initialOf(member.name)}
                </span>
                <span className="m-row__main">
                  <span className="m-row__title">
                    {member.name}
                    {member.id === data.currentMemberId ? " (you)" : ""}
                  </span>
                  <span className="m-row__meta">
                    Pays {member.householdShareBasisPoints / 100}% of shared
                    costs
                  </span>
                </span>
                {isOwner && member.role === "MEMBER" && (
                  <button
                    type="button"
                    className="m-text-button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Remove ${member.name} from this household?`,
                        )
                      )
                        return;
                      void refreshWith(
                        () =>
                          removeHouseholdMember({
                            data: { memberId: member.id },
                          }),
                        `${member.name} was removed from the household.`,
                      );
                    }}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && !partner && (
        <form onSubmit={invitePartner} className="m-form">
          <label className="m-field">
            <span>Your partner’s email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="name@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !email}
            className="m-button m-button--primary m-button--wide"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </form>
      )}

      {inviteUrl && (
        <div className="m-alert">
          <p>Or send them this link yourself.</p>
          <button
            type="button"
            className="m-alert__action"
            onClick={() => void copyInviteLink()}
          >
            Copy link
          </button>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <section className="m-section">
          <div className="m-section__head">
            <h2>Waiting to join</h2>
          </div>
          <ul className="m-list">
            {pendingInvites.map((invitation) => (
              <li key={invitation.id} className="m-row">
                <span className="m-row__main">
                  <span className="m-row__title">{invitation.email}</span>
                  <span className="m-row__meta">
                    Invite expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </span>
                <button
                  type="button"
                  className="m-text-button"
                  disabled={busy}
                  onClick={() =>
                    void refreshWith(
                      () =>
                        revokeHouseholdInvitation({
                          data: { invitationId: invitation.id },
                        }),
                      "Invite cancelled.",
                    )
                  }
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(message || error) && (
        <p className={error ? "m-error" : "m-hint"} role={error ? "alert" : "status"}>
          {error || message}
        </p>
      )}

      {owner && partner && (
        <HouseholdSplitCard
          owner={owner}
          partner={partner}
          editable={isOwner}
          busy={busy}
          onSave={(ownerPercent) =>
            refreshWith(
              () =>
                updateHouseholdShares({
                  data: {
                    shares: [
                      {
                        memberId: owner.id,
                        shareBasisPoints: ownerPercent * 100,
                      },
                      {
                        memberId: partner.id,
                        shareBasisPoints: (100 - ownerPercent) * 100,
                      },
                    ],
                  },
                }),
              "Shared cost split saved.",
            )
          }
        />
      )}

      {hasPartner && data.accounts.length > 0 && (
        <section className="m-section">
          <div className="m-section__head">
            <h2>Whose account is it?</h2>
          </div>
          <ul className="m-list m-list--roomy">
            {data.accounts.map((account) => (
              <AccountOwnershipRow
                key={`${account.id}:${account.ownership.map((share: { shareBasisPoints: number }) => share.shareBasisPoints).join("-")}`}
                account={account}
                members={data.members}
                currentMemberId={data.currentMemberId}
                busy={busy}
                onSave={(shares) =>
                  refreshWith(
                    () =>
                      updateAccountOwnership({
                        data: { accountId: account.id, shares },
                      }),
                    `${account.name} saved.`,
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      {hasPartner && (
        <Link to="/app/reports/household" target="_blank" className="m-link m-link--center">
          Download household report (PDF)
        </Link>
      )}
    </main>
  );
}

type Member = ReturnType<typeof Route.useLoaderData>["members"][number];
type Account = ReturnType<typeof Route.useLoaderData>["accounts"][number];

function initialOf(name?: string | null) {
  return name?.trim().charAt(0).toUpperCase() || "W";
}

function HouseholdSplitCard({
  owner,
  partner,
  editable,
  busy,
  onSave,
}: {
  owner: Member;
  partner: Member;
  editable: boolean;
  busy: boolean;
  onSave: (ownerPercent: number) => Promise<unknown>;
}) {
  const saved = owner.householdShareBasisPoints / 100;
  const [ownerPercent, setOwnerPercent] = useState(saved);
  return (
    <section className="m-section">
      <div className="m-section__head">
        <h2>Shared costs</h2>
      </div>
      <div className="m-split">
        <div className="m-split__names">
          <span>
            {owner.name} <strong>{ownerPercent}%</strong>
          </span>
          <span>
            <strong>{100 - ownerPercent}%</strong> {partner.name}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={ownerPercent}
          disabled={!editable || busy}
          aria-label={`${owner.name}'s share of shared costs`}
          onChange={(event) => setOwnerPercent(Number(event.currentTarget.value))}
          className="m-split__range"
          style={{ ["--split" as string]: `${ownerPercent}%` }}
        />
        <p className="m-row__meta">
          Used to split joint bills and budgets, and each person’s safe to
          spend.
        </p>
      </div>
      {editable && ownerPercent !== saved && (
        <button
          type="button"
          disabled={busy}
          className="m-button m-button--primary m-button--wide"
          onClick={() => void onSave(ownerPercent)}
        >
          Save split
        </button>
      )}
    </section>
  );
}

function AccountOwnershipRow({
  account,
  members,
  currentMemberId,
  busy,
  onSave,
}: {
  account: Account;
  members: Member[];
  currentMemberId: string;
  busy: boolean;
  onSave: (
    shares: Array<{ memberId: string; shareBasisPoints: number }>,
  ) => Promise<unknown>;
}) {
  const me = members.find((member) => member.id === currentMemberId) ?? members[0];
  const other = members.find((member) => member.id !== me.id);
  const myShare =
    (account.ownership.find(
      (share: { memberId: string; shareBasisPoints: number }) =>
        share.memberId === me.id,
    )?.shareBasisPoints ?? 10_000) / 100;
  const set = (mine: number) => {
    if (!other || mine === myShare) return;
    void onSave([
      { memberId: me.id, shareBasisPoints: mine * 100 },
      { memberId: other.id, shareBasisPoints: (100 - mine) * 100 },
    ]);
  };
  const options = [
    { label: "Mine", value: 100 },
    { label: other ? `${other.name.split(" ")[0]}’s` : "Theirs", value: 0 },
    { label: "Joint", value: 50 },
  ];
  const custom = !options.some((option) => option.value === myShare);
  return (
    <li className="m-row m-row--stack">
      <span className="m-row__line">
        <IconBank className="m-row__icon" aria-hidden="true" />
        <span className="m-row__main">
          <span className="m-row__title">{account.name}</span>
          <span className="m-row__meta">
            {account.institution} ·{" "}
            {formatMoney(account.balanceMinor / 100, account.currency)}
            {account.connectionStatus !== "CONNECTED"
              ? ` · ${connectionLabel(account.connectionStatus)}`
              : ""}
          </span>
        </span>
      </span>
      <span className="m-chips m-chips--indent" role="radiogroup" aria-label={`Who owns ${account.name}`}>
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={myShare === option.value}
            className={`m-chip${myShare === option.value ? " is-on" : ""}`}
            disabled={busy}
            onClick={() => set(option.value)}
          >
            {option.label}
          </button>
        ))}
        {custom && (
          <span className="m-chip is-on">
            {myShare}/{100 - myShare}
          </span>
        )}
      </span>
    </li>
  );
}

function connectionLabel(status: string) {
  if (status === "CONNECTED") return "Connected";
  if (status === "NEEDS_RECONNECT") return "Connection needs attention";
  if (status === "FAILED") return "Connection failed";
  if (status === "SYNCING") return "Updating";
  return "Not connected";
}

function errorMessage(value: unknown) {
  return value instanceof Error
    ? value.message
    : "Something went wrong. Please try again.";
}
