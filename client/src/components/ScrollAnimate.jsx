import React from "react";
import useInView from "../hooks/useInView";

export default function ScrollAnimate({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`scroll-animate ${inView ? "in-view" : ""} ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
