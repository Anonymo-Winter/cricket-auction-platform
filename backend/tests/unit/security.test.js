import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration, jwtKeyProblem } from "../../utils/security.js";

test("durations: the usual JWT spellings", () => {
    assert.equal(parseDuration("1d"), 86400000);
    assert.equal(parseDuration("12h"), 12 * 3600000);
    assert.equal(parseDuration("90m"), 90 * 60000);
    assert.equal(parseDuration("30s"), 30000);
    assert.equal(parseDuration("2w"), 14 * 86400000);
    assert.equal(parseDuration(" 1D "), 86400000);
});

test("durations: a bare number is seconds, junk falls back to a day", () => {
    assert.equal(parseDuration("3600"), 3600000);
    for (const bad of ["", "soon", "1 day", "-5m", undefined, null]) assert.equal(parseDuration(bad), 86400000, String(bad));
    assert.equal(parseDuration("nonsense", 5000), 5000);
});

test("a strong random key passes", () => {
    assert.equal(jwtKeyProblem("kQ8v2Zc0r5Yx1Lm7Pn3Ws9Td4Gb6Hf8Jq2Ae5Rt0Uy1Io3Pl"), null);
});

test("weak or placeholder keys are flagged", () => {
    assert.ok(jwtKeyProblem(undefined));
    assert.ok(jwtKeyProblem(""));
    assert.match(jwtKeyProblem("mysecret"), /9 characters|only/);
    assert.ok(jwtKeyProblem("short-but-random-x9"));
    assert.match(jwtKeyProblem("change-me-to-a-long-random-string-please"), /placeholder/);
    assert.match(jwtKeyProblem("mysecretmysecretmysecretmysecretmysecret"), /placeholder/);
});
