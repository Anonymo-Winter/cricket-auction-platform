import { test } from "node:test";
import assert from "node:assert/strict";
import { squadsToCsv } from "../../services/auctionReports.js";

const squads = {
    auction: { name: 'Mega, "2099"' },
    teams: [
        {
            team: { name: "Alpha" },
            players: [
                { name: "Star Player", role: "batsman", nationality: "Indian", price: 25000000, basePrice: 2000000 },
                { name: "=HYPERLINK(\"http://evil\")", role: "bowler", nationality: "Indian", price: 5000000, basePrice: 1000000 },
            ],
        },
    ],
    unsold: [{ name: "Nobody", role: "bowler", basePrice: 1000000 }],
};

test("csv has a header, a row per player and a row per unsold player", () => {
    const lines = squadsToCsv(squads).split("\r\n").filter(Boolean);
    assert.equal(lines.length, 1 + 2 + 1);
    assert.match(lines[0], /^Auction,Team,Player,Role,Nationality,Price/);
});

test("cells with commas or quotes are quoted properly", () => {
    const csv = squadsToCsv(squads);
    assert.ok(csv.includes('"Mega, ""2099"""'));
});

test("cells that would run as spreadsheet formulas are neutralised", () => {
    const csv = squadsToCsv(squads);
    assert.ok(csv.includes("'=HYPERLINK"));
    assert.ok(!/,=HYPERLINK/.test(csv));
});

test("unsold players are marked, not given a team", () => {
    assert.ok(squadsToCsv(squads).includes(",UNSOLD,Nobody,"));
});
