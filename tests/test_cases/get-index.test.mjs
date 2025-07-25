import { describe, it, expect } from "vitest";
import { load } from "cheerio";
import * as when from "../steps/when.mjs";

describe(`When we invoke the GET / endpoint`, () => {
  it(`Should return the index page with 8 restaurants`, async () => {
    const res = await when.we_invoke_get_index();

    expect(res.statusCode).toEqual(200);
    expect(res.headers["content-type"]).toEqual("text/html; charset=UTF-8");
    expect(res.body).toBeDefined();

    const $ = load(res.body);
    const restaurants = $(".restaurant", "#restaurantsUl");
    expect(restaurants.length).toEqual(8);
  });
});
