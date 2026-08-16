"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";

const sections = [
  { id: "overview", title: "服务概览" },
  { id: "process", title: "代发流程" },
  { id: "qa", title: "问答区域" },
  { id: "faq", title: "代发常见问题" },
  { id: "materials", title: "资料提交" },
  { id: "support", title: "售后与反馈" },
];

export default function SkinServicePage() {
  useRevealOnScroll();

  return (
    <main className="pageShell gamesShell skinServiceShell" lang="zh-CN">
      <section className="gamesHero skinServiceHero">
        <Link href="/" className="gamesHeroBack">
          返回主页
        </Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">服务文档</span>
          <h1 className="gamesHeroTitle">代发皮肤服务中心</h1>
        </div>
      </section>

      <nav className="skinServiceIndex" aria-label="文档分区">
        {sections.map((section, index) => (
          <a
            key={section.id}
            className="skinServiceIndexLink reveal revealFade"
            href={`#${section.id}`}
            data-reveal
            style={{ "--reveal-delay": `${(index % 3) * 0.06}s` } as CSSProperties}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {section.title}
          </a>
        ))}
      </nav>

      <div className="skinServiceDocument">
        {sections.map((section, index) => (
          <section
            key={section.id}
            className={`skinServiceDocumentSection ${index % 2 === 0 ? "revealLeft" : "revealRight"}`}
            id={section.id}
            data-reveal
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{section.title}</h2>
          </section>
        ))}
      </div>
    </main>
  );
}
