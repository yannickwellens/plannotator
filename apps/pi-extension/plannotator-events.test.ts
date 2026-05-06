import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = () => readFileSync(join(import.meta.dir, "plannotator-events.ts"), "utf-8");

describe("plannotator event listener session safety", () => {
	test("defines session metadata and session matching helpers", () => {
		const text = source();
		expect(text).toContain("export interface PlannotatorRequestSessionRef");
		expect(text).toContain("sessionFile?: string");
		expect(text).toContain("leafId?: string");
		expect(text).toContain("cwd?: string");
		expect(text).toContain("export function getSessionRef");
		expect(text).toContain("export function matchesRequestSession");
		expect(text).toContain("requestSession.sessionFile === activeSession.sessionFile");
	});

	test("claims duplicate request ids before opening browser sessions", () => {
		const text = source();
		expect(text).toContain("Symbol.for(\"plannotator.pi.event-listener-state\")");
		expect(text).toContain("handledRequestIds");
		expect(text).toContain("export function claimPlannotatorRequest");
		expect(text).toContain("if (!claimPlannotatorRequest(request.requestId)) return");
		expect(text.indexOf("if (!claimPlannotatorRequest(request.requestId)) return")).toBeLessThan(
			text.lastIndexOf("startPlanReviewBrowserSession"),
		);
	});

	test("unsubscribes and stops active browser sessions on shutdown", () => {
		const text = source();
		expect(text).toContain("const unsubscribeRequest = pi.events.on");
		expect(text).toContain("pi.on(\"session_shutdown\"");
		expect(text).toContain("unsubscribeRequest()");
		expect(text).toContain("activePlanReviewSessions");
		expect(text).toContain("session.stop()");
		expect(text).toContain("activeSessionContext.clear()");
	});

	test("plan review preserves upstream decision fields and emits session on review result", () => {
		const text = source();
		expect(text).toContain("clearContextNudge?: boolean");
		expect(text).toContain("session?: PlannotatorRequestSessionRef");
		expect(text).toContain("const capturedSession = activeSession");
		expect(text).toContain("clearContextNudge: result.clearContextNudge");
		expect(text).toContain("session: capturedSession");
		expect(text).toContain("activePlanReviewSessions.add(session)");
		expect(text).toContain("activePlanReviewSessions.delete(session)");
	});

	test("releases duplicate request claims on validation and startup errors", () => {
		const text = source();
		expect(text).toContain("export function releasePlannotatorRequestClaim");
		expect(text).toContain("let claimAcquired = false");
		expect(text).toContain("claimAcquired = true");
		expect(text).toContain("releasePlannotatorRequestClaim(request.requestId)");
		expect(text).toContain("if (claimAcquired) releasePlannotatorRequestClaim(request.requestId)");
	});
});
