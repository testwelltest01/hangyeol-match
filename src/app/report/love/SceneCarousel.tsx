"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { IconBack, IconChevron } from "@/components/icons";

/** 손을 뗀 뒤 스크롤이 이만큼 조용하면 멈춘 것으로 본다 (iOS 관성 스크롤 끝 판단) */
const SETTLE_MS = 160;

/**
 * 장면 10가지를 옆으로 밀어 한 장씩 보는 슬라이드. 카드는 늘 화면 가운데에 멈추고, 양옆에 이전·다음 카드가 같은 폭(16px)으로 살짝 보인다.
 * CSS scroll-snap(snap-center)에 더해, 멈춘 뒤 가운데가 아니면 JS가 가장 가까운 카드를 가운데로 옮긴다
 * (iOS Safari는 스크롤 상자 크기가 바뀌거나 관성 스크롤이 끊기면 카드 사이에 그냥 멈추는 일이 있었다).
 * 그래서 스크롤 상자를 건드리는 일(줄 높이 맞추기, 새 카드 맨 위로 올리기)은 미는 동안이 아니라 멈춘 뒤에만 한다.
 * 끝 여백은 padding이 아니라 빈 칸으로 둔다(가로 스크롤 상자의 오른쪽 padding을 스크롤 범위에 넣지 않는 브라우저가 있어 마지막 카드가 가운데에 못 온다).
 * 아래쪽 '이전·다음'과 '3 / 10'. 카드 내용은 서버에서 그려 children으로 받는다
 */
export function SceneCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(0);
  /** 지금 가운데에 가장 가까운 카드 (번호·버튼, 미는 동안에도 바뀐다) */
  const [index, setIndex] = useState(0);
  /** 멈춘 카드 (줄 높이·맨 위로 올리기는 이것만 본다) */
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = () => ([...track.children] as HTMLElement[]).slice(0, count);
    // 카드를 가운데에 두는 scrollLeft (offsetLeft는 트랙 기준, 트랙이 relative). 스크롤 범위 밖이면 끝으로
    const centerLeft = (el: HTMLElement) =>
      Math.min(track.scrollWidth - track.clientWidth, Math.max(0, el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2));
    const nearest = () => {
      const list = cards();
      let best = 0;
      list.forEach((el, i) => {
        if (Math.abs(centerLeft(el) - track.scrollLeft) < Math.abs(centerLeft(list[best]) - track.scrollLeft)) best = i;
      });
      return best;
    };

    let frame = 0;
    let timer = 0;
    let touching = false;
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (touching) return;
        const i = nearest();
        const target = centerLeft(cards()[i]);
        // 카드 사이에 멈췄으면 가운데로 (옮기는 동안 다시 scroll이 와서 끝나면 한 번 더 확인한다)
        if (Math.abs(track.scrollLeft - target) > 2) return void track.scrollTo({ left: target, behavior: "smooth" });
        setIndex(i);
        setSettled(i);
      }, SETTLE_MS);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(nearest()));
      settle();
    };
    const onTouchStart = () => {
      touching = true;
      window.clearTimeout(timer);
    };
    const onTouchEnd = () => {
      touching = false;
      settle();
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchend", onTouchEnd, { passive: true });
    track.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [count]);

  // 줄 높이를 멈춘 카드 높이에 맞춘다 (사진이 있는 장면과 없는 장면의 높이가 달라 짧은 카드 아래가 비지 않게)
  useEffect(() => {
    const track = trackRef.current;
    const card = (track?.children[settled] as HTMLElement | undefined)?.firstElementChild as HTMLElement | null | undefined;
    if (!track || !card) return;
    const fit = () => {
      track.style.height = `${card.offsetHeight + 4}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(card);
    return () => ro.disconnect();
  }, [settled]);

  // 다른 장면에 멈췄는데 카드 위쪽이 위 바·탭 줄 밑에 가려져 있으면 새 카드의 맨 위부터 보이게
  useEffect(() => {
    if (shownRef.current === settled) return;
    shownRef.current = settled;
    const el = sectionRef.current;
    if (el && el.getBoundingClientRect().top < 110) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [settled]);

  function go(i: number) {
    const track = trackRef.current;
    const el = track?.children[Math.max(0, Math.min(count - 1, i))] as HTMLElement | undefined;
    if (!track || !el) return;
    track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }

  return (
    <section ref={sectionRef} aria-roledescription="carousel" aria-label="장면 10가지" className="scroll-mt-[60px]">
      <div
        ref={trackRef}
        className="relative -mx-5 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overflow-y-hidden pl-7 transition-[height] duration-300 [scrollbar-width:none]"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${count}개 중 ${i + 1}번째 장면`}
            // 폭 = 트랙 폭 − 양쪽 28px (트랙 왼쪽 padding 28 + 끝 빈 칸 16 + 간격 12)
            className="flex w-[calc(100%-28px)] shrink-0 snap-center self-start [&>*]:w-full"
          >
            {slide}
          </div>
        ))}
        {/* 끝 여백: 마지막 카드 뒤 간격 12 + 16 = 28px */}
        <div aria-hidden className="w-4 shrink-0 self-stretch" />
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
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === count - 1}
          className="flex h-10 items-center gap-0.5 rounded-full pl-3 pr-1 text-[14px] text-ink disabled:opacity-30"
        >
          다음
          <IconChevron size={20} />
        </button>
      </div>
    </section>
  );
}
