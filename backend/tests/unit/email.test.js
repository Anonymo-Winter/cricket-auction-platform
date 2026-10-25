import { test } from "node:test";
import assert from "node:assert/strict";
import { emailLookupKeys, storableEmail } from "../../utils/email.js";

test("lookups try the raw, lower-cased and normalised spellings", () => {
    const keys = emailLookupKeys("  Foo.Bar@Gmail.com ");
    assert.ok(keys.includes("Foo.Bar@Gmail.com"));
    assert.ok(keys.includes("foo.bar@gmail.com"));
    assert.ok(keys.includes("foobar@gmail.com")); // what signup stores for Gmail
});

test("an account stored the old way is still found by its plain address", () => {
    assert.ok(emailLookupKeys("csk@team.com").includes("csk@team.com"));
});

test("keys are unique", () => {
    const keys = emailLookupKeys("a@b.com");
    assert.equal(new Set(keys).size, keys.length);
});

test("what gets stored is normalised", () => {
    assert.equal(storableEmail("Foo.Bar@Gmail.com"), "foobar@gmail.com");
    assert.equal(storableEmail("Someone@Example.COM"), "someone@example.com");
});

test("missing input doesn't throw", () => {
    assert.deepEqual(emailLookupKeys(undefined), []);
    assert.deepEqual(emailLookupKeys("   "), []);
    assert.equal(storableEmail(""), "");
});
