import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { IconBank, IconChevronLeft } from "#/components/money/icons";
import { formatMoney } from "#/lib/finance-demo";
import { buildPageMeta } from "#/lib/seo";
import { getFinanceAccounts } from "#/server/finance";
import { exportFinanceCsv } from "#/server/account-data";
import {
  completeEnableBankingConnection,
  disconnectEnableBanking,
  getEnableBankingInstitutions,
  getEnableBankingStatus,
  startEnableBankingConnection,
  syncEnableBanking,
} from "#/server/enable-banking-sync";
import {
  disconnectSynciConnection,
  getSynciStatus,
  startSynciConnection,
  syncSynciConnection,
} from "#/server/synci-sync";

type AccountsSearch = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  bank?: string;
};
type Institution = { name: string; country: string; beta: boolean };

const supportedCountries = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
] as const;

export const Route = createFileRoute("/app/accounts")({
  validateSearch: (search: Record<string, unknown>): AccountsSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string"
        ? search.error_description
        : undefined,
    bank: typeof search.bank === "string" ? search.bank : undefined,
  }),
  loader: async () => {
    const [finance, synci, enableBanking] = await Promise.all([
      getFinanceAccounts(),
      getSynciStatus(),
      getEnableBankingStatus(),
    ]);
    return { ...finance, synci, enableBanking };
  },
  head: () => ({
    meta: buildPageMeta({
      path: "/app/accounts",
      title: "Bank sync",
      description: "Connected accounts and provider status.",
      noindex: true,
    }).meta,
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { accounts, synci, enableBanking, household } = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const callbackStarted = useRef(false);
  const synciCallbackStarted = useRef(false);
  const useSynci = synci.openForConnections || synci.registered;
  const [country, setCountry] = useState("BE");
  const [bankName, setBankName] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportingAccountId, setExportingAccountId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    search.error_description || search.error || "",
  );

  useEffect(() => {
    if (useSynci || !enableBanking.configured) return;
    setLoadingBanks(true);
    setBankName("");
    void getEnableBankingInstitutions({ data: { country } })
      .then((banks) => setInstitutions(banks))
      .catch((reason) =>
        setError(errorMessage(reason, "Could not load available banks.")),
      )
      .finally(() => setLoadingBanks(false));
  }, [country, enableBanking.configured, useSynci]);

  useEffect(() => {
    if (!search.code || !search.state || callbackStarted.current) return;
    callbackStarted.current = true;
    setLoading(true);
    setError("");
    void completeEnableBankingConnection({
      data: { code: search.code, state: search.state },
    })
      .then(async ({ accounts: connectedAccounts }) => {
        setMessage(
          `Connected ${connectedAccounts} account${connectedAccounts === 1 ? "" : "s"}.`,
        );
        await router.navigate({
          to: "/app/accounts",
          search: {},
          replace: true,
        });
        await router.invalidate();
      })
      .catch((reason) =>
        setError(errorMessage(reason, "Could not finish the bank connection.")),
      )
      .finally(() => setLoading(false));
  }, [router, search.code, search.state]);

  useEffect(() => {
    if (search.bank !== "connected" || synciCallbackStarted.current) return;
    synciCallbackStarted.current = true;
    setLoading(true);
    setError("");
    void syncSynciConnection()
      .then(async ({ accounts: connectedAccounts }) => {
        setMessage(
          connectedAccounts
            ? `Connected ${connectedAccounts} account${connectedAccounts === 1 ? "" : "s"}.`
            : "Your bank is connected. Transactions will appear after its first sync.",
        );
        await router.navigate({
          to: "/app/accounts",
          search: {},
          replace: true,
        });
        await router.invalidate();
      })
      .catch((reason) =>
        setError(errorMessage(reason, "Could not finish the bank connection.")),
      )
      .finally(() => setLoading(false));
  }, [router, search.bank]);

  function connectBank() {
    if (useSynci) {
      setMessage("");
      setError("");
      setLoading(true);
      void startSynciConnection()
        .then(({ url }) => window.location.assign(url))
        .catch((reason) => {
          setError(
            errorMessage(reason, "Could not start the bank connection."),
          );
          setLoading(false);
        });
      return;
    }
    if (!bankName) return;
    setMessage("");
    setError("");
    setLoading(true);
    void startEnableBankingConnection({ data: { country, bankName } })
      .then(({ url }) => window.location.assign(url))
      .catch((reason) => {
        setError(errorMessage(reason, "Could not start the bank connection."));
        setLoading(false);
      });
  }

  function syncConnectedBank() {
    if (!useSynci) {
      syncBank();
      return;
    }
    setMessage("");
    setError("");
    setLoading(true);
    void syncSynciConnection()
      .then(async ({ accounts: syncedAccounts }) => {
        setMessage(
          `Synced ${syncedAccounts} account${syncedAccounts === 1 ? "" : "s"}.`,
        );
        await router.invalidate();
      })
      .catch((reason) =>
        setError(errorMessage(reason, "Could not sync the bank.")),
      )
      .finally(() => setLoading(false));
  }

  function disconnectConnectedBank() {
    if (!useSynci) {
      disconnectBank();
      return;
    }
    setMessage("");
    setError("");
    setLoading(true);
    void disconnectSynciConnection()
      .then(async () => {
        setMessage("Bank access revoked and local bank data removed.");
        await router.invalidate();
      })
      .catch((reason) =>
        setError(errorMessage(reason, "Could not disconnect the bank.")),
      )
      .finally(() => setLoading(false));
  }

  function syncBank() {
    setMessage("");
    setError("");
    setLoading(true);
    void syncEnableBanking()
      .then(async ({ accounts: syncedAccounts }) => {
        setMessage(
          `Synced ${syncedAccounts} account${syncedAccounts === 1 ? "" : "s"}.`,
        );
        await router.invalidate();
      })
      .catch((reason) =>
        setError(errorMessage(reason, "Could not sync the bank.")),
      )
      .finally(() => setLoading(false));
  }

  function disconnectBank() {
    setMessage("");
    setError("");
    setLoading(true);
    void disconnectEnableBanking()
      .then(async () => {
        setMessage("Bank access revoked and local bank data removed.");
        await router.invalidate();
      })
      .catch((reason) =>
        setError(errorMessage(reason, "Could not disconnect the bank.")),
      )
      .finally(() => setLoading(false));
  }

  async function exportAccount(accountId: string, accountName: string) {
    setExportingAccountId(accountId);
    setError("");
    setMessage("");
    try {
      const data = await exportFinanceCsv({
        data: { scope: "account", accountId },
      });
      downloadBlob({
        content: data.content,
        filename: data.filename.replace(accountId, slugify(accountName)),
        type: data.mimeType,
      });
      setMessage(`${accountName} export downloaded.`);
    } catch (reason) {
      setError(errorMessage(reason, "Could not export this account."));
    } finally {
      setExportingAccountId(null);
    }
  }

  const bankConnected = useSynci ? synci.connected : enableBanking.connected;
  const needsReconnect = useSynci ? synci.needsReconnect : enableBanking.needsReconnect;
  const lastSynced = useSynci ? synci.lastSynced : enableBanking.lastSynced;
  const canConnect = useSynci
    ? synci.openForConnections
    : enableBanking.openForConnections;
  const currency = accounts[0]?.currency;
  const total = accounts
    .filter((account) => account.currency === currency)
    .reduce((sum, account) => sum + account.balance, 0);

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
      <h1 className="m-page-title">Bank accounts</h1>

      {!useSynci && enableBanking.environment?.toLowerCase() === "sandbox" && (
        <p className="m-hint" role="status">
          Test mode: these balances are sample data, not a real bank.
        </p>
      )}

      {accounts.length > 0 && (
        <section className="m-hero m-hero--compact" aria-label="Total balance">
          <p className="m-hero__label">Total balance</p>
          <p className="m-hero__number">{formatMoney(total, currency)}</p>
          <p className="m-hero__meta">
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            {bankConnected && lastSynced ? ` · updated ${lastSynced}` : ""}
          </p>
        </section>
      )}

      {needsReconnect && (
        <div className="m-alert" role="alert">
          <p>Your bank asks you to sign in again to keep syncing.</p>
          <button
            type="button"
            className="m-alert__action"
            disabled={loading}
            onClick={connectBank}
          >
            Reconnect
          </button>
        </div>
      )}

      {accounts.length > 0 && (
        <section className="m-section">
          <div className="m-section__head">
            <h2>Accounts</h2>
          </div>
          <ul className="m-list m-list--roomy">
            {accounts.map((account) => (
              <li key={account.id} className="m-row">
                <IconBank className="m-row__icon" aria-hidden="true" />
                <span className="m-row__main">
                  <span className="m-row__title">{account.name}</span>
                  <span className="m-row__meta">
                    {account.institution} ·{" "}
                    {connectionLabel(account.connectionStatus)}
                  </span>
                  {household.members.length > 1 && (
                    <span className="m-row__meta">
                      {ownershipLabel(account.ownership, household.members)}
                    </span>
                  )}
                </span>
                <span className="m-row__amount">
                  {formatMoney(account.balance, account.currency)}
                  <button
                    type="button"
                    className="m-text-button"
                    disabled={exportingAccountId === account.id}
                    onClick={() => void exportAccount(account.id, account.name)}
                  >
                    {exportingAccountId === account.id ? "Exporting…" : "Export"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!bankConnected && canConnect && !useSynci && enableBanking.configured && (
        <section className="m-section">
          <div className="m-section__head">
            <h2>Connect a bank</h2>
          </div>
          <div className="m-form">
            <label className="m-field">
              <span>Country</span>
              <select
                value={country}
                onChange={(event) => setCountry(event.currentTarget.value)}
                disabled={loading || loadingBanks}
              >
                {supportedCountries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="m-field">
              <span>Bank</span>
              <select
                value={bankName}
                onChange={(event) => setBankName(event.currentTarget.value)}
                disabled={loading || loadingBanks}
              >
                <option value="">
                  {loadingBanks ? "Loading banks…" : "Choose your bank"}
                </option>
                {institutions.map((bank) => (
                  <option key={`${bank.country}:${bank.name}`} value={bank.name}>
                    {bank.name}
                    {bank.beta ? " (beta)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {accounts.length === 0 && (
        <section className="m-empty">
          <h2>{canConnect ? "Connect your bank" : "Bank connections open soon"}</h2>
          <p>
            {canConnect
              ? "Wollie reads your balances and transactions. It can never move money, and never sees your bank password."
              : "We're finishing the secure bank setup. You can explore Wollie with sample data meanwhile."}
          </p>
          {!canConnect && (
            <Link to="/demo" className="m-button m-button--wide">
              Explore with sample data
            </Link>
          )}
        </section>
      )}

      {error && (
        <p className="m-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="m-hint" role="status">
          {message}
        </p>
      )}

      <div className="m-stack">
        {canConnect && (!bankConnected || useSynci) && (
          <button
            type="button"
            className="m-button m-button--primary m-button--wide"
            disabled={loading || (!useSynci && !bankName)}
            onClick={connectBank}
          >
            {loading
              ? "Working…"
              : useSynci && synci.registered
                ? "Add or manage banks"
                : "Connect a bank"}
          </button>
        )}
        {bankConnected && (
          <button
            type="button"
            className={`m-button m-button--wide${canConnect && useSynci ? "" : " m-button--primary"}`}
            disabled={loading}
            onClick={syncConnectedBank}
          >
            {loading ? "Syncing…" : "Sync now"}
          </button>
        )}
        {(bankConnected || (useSynci && synci.registered)) && (
          <button
            type="button"
            className="m-link m-link--center m-link--danger"
            disabled={loading}
            onClick={disconnectConnectedBank}
          >
            Disconnect {useSynci ? "all banks" : "bank"}
          </button>
        )}
      </div>
    </main>
  );
}

function errorMessage(value: unknown, fallback: string) {
  return value instanceof Error ? value.message : fallback;
}

function connectionLabel(status?: string) {
  if (status === "CONNECTED") return "Connected";
  if (status === "NEEDS_RECONNECT") return "Connection needs attention";
  if (status === "FAILED") return "Connection failed";
  if (status === "SYNCING") return "Updating";
  return "Not connected";
}

function ownershipLabel(
  ownership: Array<{ memberId: string; shareBasisPoints: number }> | undefined,
  members: Array<{ id: string; name: string }>,
) {
  if (!ownership?.length) return "Ownership not assigned";
  return ownership
    .filter((share) => share.shareBasisPoints > 0)
    .map((share) => {
      const member = members.find((item) => item.id === share.memberId);
      return `${member?.name || "Member"} ${share.shareBasisPoints / 100}%`;
    })
    .join(" · ");
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

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "account"
  );
}
