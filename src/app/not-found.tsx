import { PrimaryLink } from "@/components/buttons";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight">페이지를 찾을 수 없어요</h1>
      <p className="mt-3 text-ink-soft">링크가 잘못됐거나 더 이상 쓰지 않는 주소예요. 처음 화면에서 다시 시작해주세요.</p>
      <div className="mt-8">
        <PrimaryLink href="/">처음 화면으로</PrimaryLink>
      </div>
    </Shell>
  );
}
