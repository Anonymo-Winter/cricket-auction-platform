import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSettings, DEFAULT_SETTINGS, hasTimezone } from "../../utils/auctionRules.js";

test("no input gives the defaults", () => {
    assert.deepEqual(resolveSettings().settings, DEFAULT_SETTINGS);
});

test("numeric strings from a form are accepted and become numbers", () => {
    const { settings, error } = resolveSettings({ bidTimeLimit: "45", maxPursePerTeam: "500000000" });
    assert.equal(error, undefined);
    assert.equal(settings.bidTimeLimit, 45);
    assert.equal(settings.maxPursePerTeam, 500000000);
    assert.equal(settings.minSquadSize, DEFAULT_SETTINGS.minSquadSize); // untouched ones keep their value
});

test("blank fields fall back to the base values", () => {
    const base = { ...DEFAULT_SETTINGS, bidTimeLimit: 20 };
    assert.equal(resolveSettings({ bidTimeLimit: "" }, base).settings.bidTimeLimit, 20);
});

test("rejects things that make no sense", () => {
    const bad = (input) => assert.ok(resolveSettings(input).error, JSON.stringify(input));
    bad({ minBidIncrement: 0 });
    bad({ minBidIncrement: "lots" });
    bad({ bidTimeLimit: 4 });
    bad({ bidTimeLimit: 301 });
    bad({ bidTimeLimit: 12.5 });
    bad({ minSquadSize: 20, maxSquadSize: 10 });
    bad({ minSquadSize: 0 });
    bad({ maxOverseasPlayers: -1 });
    bad({ minBidIncrement: 500000, maxPursePerTeam: 100000 });
});

test("the boundary values are allowed", () => {
    assert.equal(resolveSettings({ bidTimeLimit: 5 }).error, undefined);
    assert.equal(resolveSettings({ bidTimeLimit: 300 }).error, undefined);
    assert.equal(resolveSettings({ minSquadSize: 8, maxSquadSize: 8 }).error, undefined);
});

test("a time is accepted only if it names an exact instant", () => {
    for (const ok of ["2026-10-22T12:30:00Z", "2026-10-22T18:00:00+05:30", "2026-10-22T18:00:00.000-0800", new Date(), 1789999999999]) {
        assert.ok(hasTimezone(ok), String(ok));
    }
    for (const bad of ["2026-10-22T18:00", "2026-10-22 18:00", "2026-10-22", "", null, undefined]) {
        assert.ok(!hasTimezone(bad), String(bad));
    }
});
