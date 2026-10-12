import { test } from "node:test";
import assert from "node:assert/strict";
import { directLink } from "./media.ts";

test("video links: Drive and Dropbox share links become direct file links", () => {
  assert.equal(directLink("https://drive.google.com/file/d/1AbC_x-9/view?usp=sharing"), "https://drive.usercontent.google.com/download?id=1AbC_x-9&export=download&confirm=t");
  assert.equal(directLink("https://drive.google.com/open?id=XYZ"), "https://drive.usercontent.google.com/download?id=XYZ&export=download&confirm=t");
  assert.equal(directLink("https://www.dropbox.com/scl/fi/abc/v.mp4?rlkey=k&dl=0"), "https://www.dropbox.com/scl/fi/abc/v.mp4?rlkey=k&dl=1");
  assert.equal(directLink(" https://cdn.example.com/v.mp4 "), "https://cdn.example.com/v.mp4");
});
