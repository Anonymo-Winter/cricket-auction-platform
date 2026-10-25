import { test } from "node:test";
import assert from "node:assert/strict";
import { canControlAuction } from "../../utils/socketAuth.js";

const auction = { auctioneer: "a1" };

test("an admin can control any auction, with or without an auctioneer", () => {
    assert.ok(canControlAuction({ id: "x", role: "admin" }, auction));
    assert.ok(canControlAuction({ id: "x", role: "admin" }, { auctioneer: null }));
});

test("an auctioneer controls only the auction they are assigned to", () => {
    assert.ok(canControlAuction({ id: "a1", role: "auctioneer" }, auction));
    assert.ok(!canControlAuction({ id: "a2", role: "auctioneer" }, auction));
});

test("a populated auctioneer document counts too", () => {
    assert.ok(canControlAuction({ id: "a1", role: "auctioneer" }, { auctioneer: { _id: "a1" } }));
});

test("an auction with no auctioneer is controlled by nobody except admins", () => {
    assert.ok(!canControlAuction({ id: "a1", role: "auctioneer" }, { auctioneer: null }));
});

test("team owners and visitors never control an auction", () => {
    assert.ok(!canControlAuction({ id: "a1", role: "user" }, auction));
    assert.ok(!canControlAuction(null, auction));
    assert.ok(!canControlAuction(undefined, auction));
});
