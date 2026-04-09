import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";

/**
 * Landing page after Cashfree DigiLocker redirect:
 * backend → https://mystayinn.co.in/kyc-status?status=success&reference_id=...
 *
 * Final Aadhaar data is synced when the user opens the app (authenticated /status call).
 * This page explains the result and offers an app deep link.
 */
export default function KycStatus() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const referenceId = searchParams.get("reference_id");
  const error = searchParams.get("error");

  const appDeepLink = useMemo(() => {
    if (referenceId) {
      return `mystay://kyc-success?reference_id=${encodeURIComponent(referenceId)}`;
    }
    return "mystay://kyc-success";
  }, [referenceId]);

  if (error === "missing_reference_id" || error === "server_error") {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-3">
            Could not complete redirect
          </h1>
          <p className="text-muted-foreground mb-6">
            {error === "server_error"
              ? "Something went wrong on our side. Please open the MyStay Inn app and try verifying again, or contact support."
              : "Missing verification reference. Please start Aadhaar verification again from the app."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Back to home
          </Link>
        </div>
      </Layout>
    );
  }

  if (status === "success") {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto px-4 py-16 text-center">
          <div className="mb-6 text-5xl" aria-hidden>
            ✓
          </div>
          <h1 className="text-2xl font-bold mb-3">Verification submitted</h1>
          <p className="text-muted-foreground mb-8">
            Cashfree has returned you successfully. Open the <strong>MyStay Inn</strong> app
            while logged in — it will refresh your KYC status from our servers. Do not rely on
            this page alone; the app performs the final check with your account.
          </p>
          <a
            href={appDeepLink}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground mb-4 w-full max-w-sm"
          >
            Open MyStay Inn app
          </a>
          <p className="text-xs text-muted-foreground">
            If the app does not open, return to the app manually from your home screen.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-amber-700 mb-3">
          Verification not completed
        </h1>
        <p className="text-muted-foreground mb-8">
          We could not confirm success with Cashfree. Open the MyStay Inn app to check status or
          start verification again.
        </p>
        <a
          href="mystay://kyc-failed"
          className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-semibold mb-4"
        >
          Open MyStay Inn app
        </a>
        <div>
          <Link to="/" className="text-sm text-primary underline">
            Back to home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
