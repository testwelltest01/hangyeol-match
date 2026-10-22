"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { IconBack, IconChevron } from "@/components/icons";

/**
 * 장면 10가지를 옆으로 밀어 한 장씩 보는 슬라이드 (CSS scroll-snap). 다음 카드가 살짝 보여서 밀 수 있다는 걸 알 수 있다.
 * 아래쪽 '이전·다음'과 '3 / 10'. 카드 내용은 서버에서 그려 children으로 받는다.
 * 카드가 길어서(대화 예시) 아래쪽에서 넘기면 새 카드의 맨 위로 올려 준다
 */
export function SceneCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(0);
  const [index, setIndex] = useState(0);

  // 밀 때마다 지금 보이는 카드 번호를 맞춘다 (가장 왼쪽에 가까운 카드)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const items = [...track.children] as HTMLElement[];
        const left = track.scrollLeft + parseFloat(getComputedStyle(track).scrollPaddingLeft || "0");
        let best = 0;
        items.forEach((el, i) => {
          if (Math.abs(el.offsetLeft - left) < Math.abs(items[best].offsetLeft - left)) best = i;
        });
        setIndex(best);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // 줄 높이를 지금 보는 카드 높이에 맞춘다 (사진이 있는 장면과 없는 장면의 높이가 달라 짧은 카드 아래가 비지 않게)
  useEffect(() => {
    const track = trackRef.current;
    const card = (track?.children[index] as HTMLElement | undefined)?.firstElementChild as HTMLElement | null | undefined;
    if (!track || !card) return;
    const fit = () => {
      track.style.height = `${card.offsetHeight + 4}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(card);
    return () => ro.disconnect();
  }, [index]);

  // 다른 장면으로 넘어갔는데 카드 위쪽이 위 바·탭 줄 밑에 가려져 있으면 새 카드의 맨 위부터 보이게
  useEffect(() => {
    if (shownRef.current === index) return;
    shownRef.current = index;
    const el = sectionRef.current;
    if (el && el.getBoundingClientRect().top < 110) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index]);

  function go(i: number) {
    const track = trackRef.current;
    const el = track?.children[Math.max(0, Math.min(slides.length - 1, i))] as HTMLElement | undefined;
    if (!track || !el) return;
    const pad = parseFloat(getComputedStyle(track).scrollPaddingLeft || "0");
    track.scrollTo({ left: el.offsetLeft - pad, behavior: "smooth" });
  }

  return (
    <section ref={sectionRef} aria-roledescription="carousel" aria-label="장면 10가지" className="scroll-mt-[60px]">
      <div
        ref={trackRef}
        className="relative -mx-5 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overflow-y-hidden scroll-px-5 px-5 transition-[height] duration-300 [scrollbar-width:none]"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${slides.length}개 중 ${i + 1}번째 장면`}
            className="flex w-[88%] shrink-0 snap-start self-start [&>*]:w-full"
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 text-[14px] text-ink disabled:opacity-30"
        >
          <IconBack size={20} />
          이전
        </button>
        <span className="text-[14px] tabular-nums text-muted" aria-live="polite">
          {index + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === slides.length - 1}
          className="flex h-10 items-center gap-0.5 rounded-full pl-3 pr-1 text-[14px] text-ink disabled:opacity-30"
        >
          다음
          <IconChevron size={20} />
        </button>
      </div>
    </section>
  );
}
