"use client";

import { AppChrome } from "@/components/AppChrome";
import { TelemetryView } from "@/components/dev/TelemetryView";

/**
 * A developer route, reachable by URL and absent from the nav on purpose: it
 * is where the interaction log is read back, and reading it is our job, not
 * the user's. Not time-scoped — the view has its own range, in days of log.
 */
export default function TelemetriaPage() {
    return (
        <AppChrome>
            <TelemetryView />
        </AppChrome>
    );
}
