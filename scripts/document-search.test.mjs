import assert from "node:assert/strict";
import test from "node:test";
import * as documentSearch from "../app/lib/documentSearch.ts";
const { matchesDocumentQuery: matches } = documentSearch;

test("clause number detection accepts only complete normalized number queries", () => {
  assert.equal(typeof documentSearch.documentClauseNumber, "function");
  for (const [query, expected] of [["1.1", "1.1"], [" ２．１４　", "2.14"], ["99.1", "99.1"], ["", null], ["　 ", null], ["2", null], ["2.", null], ["2.20.8", null], ["2.1 授权", null], ["2.1 2.2", null], ["2 . 1", null], ["<script>2.1", null]]) {
    assert.equal(documentSearch.documentClauseNumber(query), expected, query);
  }
});

test("document search normalizes full-width text on either side without changing originals", () => {
  assert.equal(matches("ＴＡＣ＿两小伙 Skinseed ２．１４", "2.14 Ｓｋｉｎｓｅｅｄ", "zh-CN"), true);
  assert.equal(matches("ＰＮＧ Alpha", "alpha png", "en"), true);
  assert.equal(matches("アップロード", "ｱｯﾌﾟﾛｰﾄﾞ", "ja"), true);
});

test("document search requires every whitespace-separated keyword without imposing order", () => {
  assert.equal(matches("上传与双端同步审核", "审核\t上传\n双端", "zh-CN"), true);
  assert.equal(matches("上传与双端同步审核", "审核 投稿", "zh-CN"), false);
  assert.equal(matches("any text", "　 ", "en"), true);
});

test("document search treats markup and regular expression syntax as literal text", () => {
  for (const query of [".*", "[", "<script>", "a+b", "(a+)+$"]) {
    assert.equal(matches("safe original text", query, "en"), false);
    assert.equal(matches(`literal ${query} text`, query, "en"), true);
  }
});
