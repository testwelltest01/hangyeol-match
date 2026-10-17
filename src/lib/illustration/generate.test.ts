import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { generateIllustration, imageModel } = await import("./generate");

const images = [
  { data: Buffer.from([0xff, 0xd8, 0xff, 0x00]), mime: "image/jpeg", name: "face.jpeg" },
  { data: Buffer.from([0x89, 0x50, 0x4e, 0x47]), mime: "image/png", name: "body.png" },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("generateIllustration", () => {
  it("사진 2장과 설정을 images/edits로 보내고 base64 결과를 받는다", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    let sent: FormData | null = null;
    let url = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string, init: RequestInit) => {
        url = u;
        sent = init.body as FormData;
        return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("webp!").toString("base64") }] }), { status: 200 });
      }),
    );
    const res = await generateIllustration({ images, prompt: "draw", userId: "11111111-1111-4111-8111-111111111111" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.image.toString()).toBe("webp!");
    expect(url).toBe("https://api.openai.com/v1/images/edits");
    const form = sent as unknown as FormData;
    expect(form.get("model")).toBe(imageModel());
    expect(form.getAll("image[]")).toHaveLength(2);
    expect(form.get("size")).toBe("1024x1536");
    expect(form.get("output_format")).toBe("webp");
    expect(form.get("quality")).toBe("medium");
    // 회원 id는 그대로 보내지 않는다
    const sid = String(form.get("safety_identifier"));
    expect(sid).toMatch(/^[0-9a-f]{64}$/);
    expect(sid).not.toContain("11111111");
    // 최신 모델에는 input_fidelity를 보내지 않는다
    expect(form.get("input_fidelity")).toBeNull();
  });

  it("gpt-image-1.5에는 얼굴 보존(input_fidelity=high)을 켠다", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-1.5");
    let sent: FormData | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        sent = init.body as FormData;
        return new Response(JSON.stringify({ data: [{ b64_json: "AA==" }] }), { status: 200 });
      }),
    );
    await generateIllustration({ images, prompt: "draw", userId: "u" });
    expect((sent as unknown as FormData).get("input_fidelity")).toBe("high");
  });

  it("안전 기준에 걸리면 사진을 바꾸라고 안내한다", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { code: "moderation_blocked", message: "blocked" } }), { status: 400 })),
    );
    const res = await generateIllustration({ images, prompt: "draw", userId: "u" });
    expect(res).toMatchObject({ ok: false, moderation: true });
  });

  it("키가 없으면 보내지 않는다", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = await generateIllustration({ images, prompt: "draw", userId: "u" });
    expect(res.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
