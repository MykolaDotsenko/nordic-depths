const STICKY_STAGE = "(min-width: 901px) and (min-height: 621px)";
const FLOWING_STAGE = "(max-width: 900px), (max-height: 620px)";

export function initScrollMotion(profile) {
  const { gsap, ScrollTrigger } = window;

  if (!gsap || !ScrollTrigger || profile.mode === "reduced") {
    return () => {};
  }

  gsap.registerPlugin(ScrollTrigger);
  const compact = profile.mode === "compact";
  const media = gsap.matchMedia();

  const context = gsap.context(() => {
    // Handoff: the dungeon backdrop settles and the intro title rises line by line.
    const intro = document.querySelector("[data-extension-start]");
    const backdrop = intro?.querySelector("[data-bridge-backdrop]");
    const titleLines = intro?.querySelectorAll("[data-bridge-title] .line > span");

    if (intro && backdrop) {
      gsap.fromTo(
        backdrop,
        { scale: 1.14, opacity: 0.62 },
        {
          scale: 1,
          opacity: 0.3,
          ease: "none",
          scrollTrigger: { trigger: intro, start: "top bottom", end: "top 20%", scrub: true },
        },
      );
    }

    if (intro && titleLines?.length) {
      gsap.fromTo(
        titleLines,
        { yPercent: 108 },
        {
          yPercent: 0,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: { trigger: intro, start: "top 85%", end: "top 30%", scrub: 0.6 },
        },
      );
    }

    // X-Ray: composed forest → exploded 3D stack (slow orbit) → composed again.
    // The scene's CSS variables drive rotation, plane depth and the tags.
    const xray = document.querySelector('[data-scene="xray"]');
    const xrayScene = xray?.querySelector("[data-xray-scene]");
    const xrayStage = xray?.querySelector("[data-xray-stage]");

    if (xray && xrayScene && xrayStage) {
      const tilt = compact ? 50 : 56;
      const buildXray = (scrollTrigger) => {
        gsap.set(xrayScene, { "--rx": "0deg", "--rz": "0deg", "--xray-explode": 0 });
        gsap
          .timeline({ scrollTrigger, defaults: { ease: "power2.inOut" } })
          .to(xrayScene, { "--rx": `${tilt}deg`, "--rz": "-28deg", "--xray-explode": 1, duration: 0.34 }, 0.06)
          .to(xrayScene, { "--rz": "-18deg", duration: 0.24, ease: "none" }, 0.4)
          .to(xrayScene, { "--rx": "0deg", "--rz": "0deg", "--xray-explode": 0, duration: 0.3 }, 0.66);
      };

      media.add(STICKY_STAGE, () => {
        buildXray({ trigger: xray, start: "top top", end: "bottom bottom", scrub: 0.6 });
      });
      media.add(FLOWING_STAGE, () => {
        buildXray({ trigger: xrayStage, start: "top 88%", end: "bottom 12%", scrub: 0.6 });
      });
    }

    // Rhythm: the scene opens like doors as it enters, and the cave light comes up.
    const nightScene = document.querySelector('[data-scene="night"]');
    const [leftShutter, rightShutter] = nightScene?.querySelectorAll("[data-night-shutter]") ?? [];
    const nightGlow = nightScene?.querySelector("[data-night-glow]");

    if (nightScene && leftShutter && rightShutter) {
      const doors = gsap.timeline({
        scrollTrigger: { trigger: nightScene, start: "top 90%", end: "top 12%", scrub: 0.5 },
      });
      doors
        .fromTo(leftShutter, { xPercent: 0, opacity: 1 }, { xPercent: -100, opacity: 1, ease: "power2.inOut" }, 0)
        .fromTo(rightShutter, { xPercent: 0, opacity: 1 }, { xPercent: 100, opacity: 1, ease: "power2.inOut" }, 0);
      if (nightGlow) doors.fromTo(nightGlow, { opacity: 0 }, { opacity: 1, ease: "none" }, 0.25);
    }

    const nightImage = document.querySelector("[data-night-image]");
    if (nightImage) {
      gsap.fromTo(
        nightImage,
        { yPercent: -3, scale: 1.04 },
        {
          yPercent: 5 * profile.scrollIntensity,
          scale: 1.1,
          ease: "none",
          scrollTrigger: {
            trigger: nightImage.closest(".scene"),
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }

    const systemScene = document.querySelector('[data-scene="system"]');
    if (systemScene) {
      gsap.from(systemScene.querySelectorAll("[data-system-node]"), {
        y: Math.min(profile.revealDistance, 26),
        opacity: 0,
        duration: 0.72,
        stagger: 0.09,
        ease: "power3.out",
        scrollTrigger: { trigger: systemScene, start: "top 64%", once: true },
      });

      gsap.from(systemScene.querySelectorAll("[data-system-connector]"), {
        scaleY: 0,
        opacity: 0,
        duration: 0.34,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: systemScene, start: "top 58%", once: true },
      });
    }

    const auroraScene = document.querySelector('[data-scene="aurora"]');
    if (auroraScene) {
      gsap.from(auroraScene.querySelectorAll(".aurora__ribbon"), {
        opacity: 0,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: { trigger: auroraScene, start: "top 86%", end: "40% 48%", scrub: true },
      });

      // The twinkle layer animates its own opacity in CSS, so only the static stars build in.
      const stars = auroraScene.querySelector(".aurora__stars:not(.aurora__stars--twinkle)");
      if (stars) {
        gsap.from(stars, {
          opacity: 0.06,
          ease: "none",
          scrollTrigger: { trigger: auroraScene, start: "top 82%", end: "35% 52%", scrub: true },
        });
      }
    }

    document.querySelectorAll("[data-reveal]").forEach((element) => {
      gsap.from(element, {
        y: profile.revealDistance,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true },
      });
    });
  });

  return () => {
    media.revert();
    context.revert();
  };
}
