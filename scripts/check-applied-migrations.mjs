import { readFileSync } from "node:fs";

try {
  const report = JSON.parse(readFileSync(0, "utf8"));
  if (!report || report.dryRun !== true || report.target?.project_ref !== "urqxygmiuyfhgfzdexgs" || !Array.isArray(report.migrations)) {
    throw new Error("운영 DB 이력 확인 결과가 올바르지 않아요.");
  }
  if (report.migrations.length) throw new Error("아직 적용하지 않은 DB 마이그레이션이 있어요. 운영 반영을 먼저 확인해 주세요.");
  console.log("운영 DB에 모든 마이그레이션이 적용돼 있어요.");
} catch (error) {
  console.error(error instanceof SyntaxError ? "DB 확인 결과를 읽지 못했어요." : error.message);
  process.exitCode = 1;
}
