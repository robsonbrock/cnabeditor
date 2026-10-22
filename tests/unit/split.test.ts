import { describe, expect, it } from "vitest";
import { splitRecords } from "../../src/core/split";

describe("splitRecords", () => {
  it("reconhece CRLF, LF e CR isolado por registro", () => {
    expect(splitRecords("a\r\nb\nc\rd")).toEqual([
      { content: "a", terminator: "CRLF" },
      { content: "b", terminator: "LF" },
      { content: "c", terminator: "CR" },
      { content: "d", terminator: "" },
    ]);
  });

  it("preserva quebras mistas e a quebra final", () => {
    expect(splitRecords("a\r\nb\n")).toEqual([
      { content: "a", terminator: "CRLF" },
      { content: "b", terminator: "LF" },
    ]);
  });

  it("último registro sem quebra final tem terminador vazio", () => {
    expect(splitRecords("a\nb").at(-1)).toEqual({ content: "b", terminator: "" });
  });

  it("conteúdo vazio ⇒ 0 registros", () => {
    expect(splitRecords("")).toEqual([]);
  });

  it("um único \\n ⇒ 1 registro vazio com LF", () => {
    expect(splitRecords("\n")).toEqual([{ content: "", terminator: "LF" }]);
  });

  it("linhas só de espaços e espaços finais preservados", () => {
    expect(splitRecords("   \n  x  \r\n\n")).toEqual([
      { content: "   ", terminator: "LF" },
      { content: "  x  ", terminator: "CRLF" },
      { content: "", terminator: "LF" },
    ]);
  });
});
