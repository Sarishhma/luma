import { describe, expect, it } from "vitest";
import { canManageRole, hasAtLeast } from "../../../common/permission.js";

describe("permissions", () => {
  it("OWNER can manage every role", () => {
    for (const r of ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const) {
      expect(canManageRole("OWNER", r)).toBe(true);
    }
  });

  it("ADMIN can manage MEMBER/VIEWER but not ADMIN/OWNER", () => {
    expect(canManageRole("ADMIN", "MEMBER")).toBe(true);
    expect(canManageRole("ADMIN", "VIEWER")).toBe(true);
    expect(canManageRole("ADMIN", "ADMIN")).toBe(false);
    expect(canManageRole("ADMIN", "OWNER")).toBe(false);
  });

  it("MEMBER and VIEWER can manage nobody", () => {
    expect(canManageRole("MEMBER", "VIEWER")).toBe(false);
    expect(canManageRole("VIEWER", "VIEWER")).toBe(false);
  });

  it("hasAtLeast compares ranks", () => {
    expect(hasAtLeast("ADMIN", "MEMBER")).toBe(true);
    expect(hasAtLeast("VIEWER", "MEMBER")).toBe(false);
  });
});
