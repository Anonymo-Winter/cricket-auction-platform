import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrice, parseDate, buildPlayer } from "../../utils/playerImport.js";

test("prices: plain numbers, lakh and crore spellings", () => {
    assert.equal(parsePrice("20000000"), 20000000);
    assert.equal(parsePrice("2cr"), 20000000);
    assert.equal(parsePrice("2 Crore"), 20000000);
    assert.equal(parsePrice("1.5cr"), 15000000);
    assert.equal(parsePrice("50L"), 5000000);
    assert.equal(parsePrice("50 lakh"), 5000000);
    assert.equal(parsePrice("1,50,000"), 150000);
});

test("prices: junk is rejected", () => {
    for (const bad of ["", "free", "cr", "2x", "-5", null, undefined]) assert.equal(parsePrice(bad), null, String(bad));
});

test("dates: ISO and day-first, real calendar days only", () => {
    assert.equal(parseDate("1995-06-15").toISOString().slice(0, 10), "1995-06-15");
    assert.equal(parseDate("15/06/1995").toISOString().slice(0, 10), "1995-06-15");
    assert.equal(parseDate("15-06-1995").toISOString().slice(0, 10), "1995-06-15");
    assert.equal(parseDate("31/02/1995"), null);
    assert.equal(parseDate("not a date"), null);
    assert.equal(parseDate(""), null);
});

const good = {
    name: "Test Player",
    dateOfBirth: "1995-06-15",
    nationality: "Indian",
    role: "Batter",
    battingStyle: "right",
    bowlingStyle: "",
    iplDebut: "2019",
    matches: "40",
    basePrice: "2cr",
    isUncapped: "no",
};

test("a good row becomes a player, with friendly spellings normalised", () => {
    const { doc, errors } = buildPlayer(good);
    assert.equal(errors, undefined);
    assert.equal(doc.role, "batsman");
    assert.equal(doc.battingStyle, "right-handed");
    assert.equal(doc.bowlingStyle, "none");
    assert.equal(doc.basePrice, 20000000);
    assert.equal(doc.isUncapped, false);
    assert.equal(doc.matches, 40);
});

test("leg spin and 'all rounder' are accepted", () => {
    const { doc, errors } = buildPlayer({ ...good, role: "all rounder", bowlingStyle: "right arm leg spin" });
    assert.equal(errors, undefined);
    assert.equal(doc.role, "all-rounder");
    assert.equal(doc.bowlingStyle, "right-arm-leg-spin");
});

test("a bad row reports every problem, not just the first", () => {
    const { errors, doc } = buildPlayer({ name: "", dateOfBirth: "nope", nationality: "", role: "chef", battingStyle: "right", iplDebut: "1999", basePrice: "free" });
    assert.equal(doc, undefined);
    assert.ok(errors.length >= 5, errors.join(" | "));
});

test("a date of birth in the future is rejected", () => {
    const next = new Date().getFullYear() + 1;
    assert.ok(buildPlayer({ ...good, dateOfBirth: `${next}-01-01` }).errors);
});

test("IPL debut must be a real IPL year", () => {
    assert.ok(buildPlayer({ ...good, iplDebut: "2007" }).errors);
    assert.ok(buildPlayer({ ...good, iplDebut: "abc" }).errors);
});
