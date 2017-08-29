"use strict";

const path = require("path");
const fs = require("fs");
const lassoIstanbulInstrument = require("../");
const expect = require("chai").expect;

const readFile = (name, fileName) => fs.readFileSync(path.join(__dirname, name, fileName), {
        encoding: 'utf8'
    }).trim(); // trim is needed for removing any extraneous whitespace for comparison

describe("Istanbul Instrument Transform Suite", () => {
    fs.readdirSync(__dirname)
        .forEach((name) => {
            // exclude hidden directories and files
            if (name.charAt(0) === '.' || path.extname(name)) return;

            it(`should instrument the [${name}] test code `, () => {
                const expected = readFile(name, "expected.js");
                const transform = lassoIstanbulInstrument.createTransform({
                    allowTests: true
                });
                let actual = transform(readFile(name, "actual.js"), {
                    filename: path.join(__dirname, name, "actual.js")
                });

                // we want the tests to pass on any machine
                actual = actual.split(__dirname).join("");

                expect(actual).to.equal(expected);
            });
        });
});
