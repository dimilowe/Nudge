import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  CirclePlay,
  Compass,
  MousePointer2,
  Route,
  Sparkles,
  Split,
  WandSparkles,
  Zap,
} from "lucide-react";

type VisitorPath = "video" | "newsletter";

const visitorExamples: Record<VisitorPath, {
  label: string;
  source: string;
  headline: string;
  subhead: string;
  offer: string;
  offerNote: string;
  button: string;
  accent: string;
}> = {
  video: {
    label: "From a short video",
    source: "tiktok.com",
    headline: "Make your first ceramic mug",
    subhead: "A simple, no-wheel guide to making something you’ll actually use.",
    offer: "The beginner’s clay guide",
    offerNote: "A good place to start",
    button: "Explore the guide",
    accent: "violet",
  },
  newsletter: {
    label: "From your newsletter",
    source: "your weekly note",
    headline: "Ready for the next step?",
    subhead: "You’ve got the basics. Here’s a little more room to make.",
    offer: "Small-batch studio class",
    offerNote: "Made for curious makers",
    button: "See the class",
    accent: "blue",
  },
};

export default function LandingPage() {
  const [visitorPath, setVisitorPath] = useState<VisitorPath>("video");
  const visitor = visitorExamples[visitorPath];

  return (
    <main className="nudg-page">
      <style>{`
        .nudg-page {
          --n-ink: #24203b;
          --n-muted: #68647a;
          --n-purple: #7553e8;
          --n-blue: #4b7bed;
          --n-paper: #f8f7fc;
          --n-line: #e9e6f1;
          color: var(--n-ink);
          background: #fbfaff;
          overflow: hidden;
        }
        .nudg-page * { box-sizing: border-box; }
        .n-display { font-family: Georgia, "Times New Roman", serif; letter-spacing: -0.045em; }
        .n-wrap { width: min(1160px, calc(100% - 48px)); margin: 0 auto; }
        .n-kicker { text-transform: uppercase; letter-spacing: .16em; font-size: 11px; font-weight: 800; color: #7255d9; }
        .n-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          min-height: 52px; padding: 0 23px; border-radius: 12px; color: white;
          background: linear-gradient(112deg, #7755e8 0%, #556ee8 100%);
          box-shadow: 0 10px 22px rgba(90, 71, 193, .2);
          font-size: 14px; font-weight: 750; text-decoration: none;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .n-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(90, 71, 193, .27); }
        .n-cta-light { color: #5740bc; background: white; box-shadow: none; }
        .n-cta-light:hover { box-shadow: 0 10px 22px rgba(37, 27, 81, .13); }
        .n-text-link { display: inline-flex; gap: 8px; align-items: center; color: #443987; font-size: 14px; font-weight: 700; text-decoration: none; }
        .n-text-link:hover { color: #7153df; }
        .n-hero {
          position: relative; padding: 76px 0 82px;
          background:
            radial-gradient(ellipse at 81% 33%, rgba(184, 169, 255, .3), transparent 28%),
            radial-gradient(ellipse at 8% 8%, rgba(216, 208, 255, .4), transparent 34%),
            #fbfaff;
        }
        .n-hero-grid { display: grid; grid-template-columns: .88fr 1.12fr; align-items: center; gap: 44px; }
        .n-hero-copy { position: relative; z-index: 2; }
        .n-hero h1 { max-width: 560px; margin: 18px 0 20px; font-size: clamp(49px, 6.1vw, 76px); line-height: .99; font-weight: 700; }
        .n-hero h1 em { font-style: normal; color: #7354df; }
        .n-hero-copy > p { max-width: 480px; font-size: 18px; line-height: 1.7; color: var(--n-muted); margin: 0 0 27px; }
        .n-hero-actions { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .n-trial-note { color: #716d80; font-size: 12px; margin: 16px 0 0; }
        .n-hero-art { min-width: 0; position: relative; padding: 16px 10px 16px 24px; }
        .n-orbit { position: absolute; width: 460px; height: 460px; border: 1px solid rgba(115, 84, 223, .13); border-radius: 50%; right: -40px; top: -44px; }
        .n-orbit:before, .n-orbit:after { content: ""; position: absolute; border: 1px solid rgba(115, 84, 223, .11); border-radius: 50%; inset: 30px; }
        .n-orbit:after { inset: 62px; }
        .n-demo-frame { position: relative; z-index: 1; margin: 0 auto; width: min(100%, 510px); padding: 14px; border: 1px solid #e7e2f1; border-radius: 25px; background: rgba(255,255,255,.77); box-shadow: 0 28px 70px rgba(53, 42, 97, .14); backdrop-filter: blur(14px); transform: rotate(-1.4deg); }
        .n-browser { display: flex; align-items: center; gap: 5px; padding: 3px 4px 13px; }
        .n-browser i { width: 7px; height: 7px; border-radius: 50%; background: #ded9e8; }
        .n-url { margin: 0 auto; width: 49%; padding: 5px 10px; background: #f5f3f9; border-radius: 20px; color: #8d879d; text-align: center; font-size: 9px; }
        .n-store { position: relative; min-height: 440px; border-radius: 17px; padding: 25px 24px; overflow: hidden; background: linear-gradient(155deg, #f1edff 0%, #fbfaff 49%, #edf3ff 100%); }
        .n-store-top { display: flex; align-items: center; justify-content: space-between; color: #817b91; font-size: 10px; }
        .n-creator { display: flex; align-items: center; gap: 9px; color: var(--n-ink); font-size: 11px; font-weight: 750; }
        .n-avatar { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: #fff; background: linear-gradient(145deg, #ae83ee, #637fe7); font-size: 11px; }
        .n-visitor-pill { display: flex; align-items: center; gap: 6px; width: fit-content; margin: 24px auto 10px; border: 1px solid rgba(114, 85, 217, .17); border-radius: 30px; padding: 6px 10px; color: #625493; background: rgba(255,255,255,.72); font-size: 9px; }
        .n-store h3 { max-width: 320px; margin: 0 auto 8px; text-align: center; font-family: Georgia, serif; font-size: 26px; line-height: 1.12; letter-spacing: -.04em; }
        .n-store-intro { max-width: 300px; margin: 0 auto 18px; color: #716c7d; text-align: center; font-size: 10px; line-height: 1.55; }
        .n-offer-card { position: relative; display: grid; grid-template-columns: 78px 1fr; gap: 12px; align-items: center; padding: 11px; border: 1px solid rgba(122, 105, 183, .12); border-radius: 13px; background: rgba(255,255,255,.86); box-shadow: 0 8px 18px rgba(69, 52, 121, .08); }
        .n-offer-art { display: grid; place-items: center; height: 75px; border-radius: 9px; color: white; background: linear-gradient(140deg, #c2a7ff, #7965d8); }
        .n-offer-art.blue { background: linear-gradient(140deg, #8dc4f4, #5977d8); }
        .n-offer-art svg { width: 27px; height: 27px; }
        .n-offer-note { margin: 0 0 4px; color: #867e97; font-size: 8px; }
        .n-offer-title { margin: 0 0 8px; font-size: 11px; font-weight: 750; }
        .n-offer-action { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; border-radius: 7px; color: white; background: #7057d4; font-size: 8px; font-weight: 700; }
        .n-other-links { display: flex; gap: 7px; margin-top: 10px; }
        .n-other-links span { flex: 1; border: 1px solid #e9e5f0; border-radius: 8px; padding: 9px 6px; color: #716d80; background: rgba(255,255,255,.66); text-align: center; font-size: 8px; }
        .n-intent-switch { position: relative; display: flex; gap: 4px; width: fit-content; margin: 12px auto 0; padding: 4px; border: 1px solid #ebe7f3; border-radius: 12px; background: white; }
        .n-intent-switch button { border: 0; padding: 8px 10px; border-radius: 8px; background: transparent; color: #736d83; font: inherit; font-size: 9px; cursor: pointer; transition: background .2s ease, color .2s ease; }
        .n-intent-switch button[aria-pressed="true"] { color: #4f3caa; background: #f0edfc; font-weight: 750; }
        .n-floating-note { position: absolute; z-index: 2; right: -14px; bottom: 38px; display: flex; gap: 10px; align-items: center; padding: 12px 15px; border: 1px solid #eeeaf5; border-radius: 13px; background: white; box-shadow: 0 12px 30px rgba(48, 36, 91, .13); font-size: 10px; }
        .n-floating-icon { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 8px; color: #6c51d6; background: #f0edfc; }
        .n-floating-note strong { display: block; margin-bottom: 2px; font-size: 10px; }
        .n-floating-note span { color: #817b91; }
        .n-down { display: flex; justify-content: center; margin: 2px auto 0; color: #a29bad; }
        .n-section { padding: 102px 0; }
        .n-section-soft { background: #f4f1fb; }
        .n-section-head { max-width: 660px; margin: 0 auto 54px; text-align: center; }
        .n-section-head h2 { margin: 14px 0 14px; font-size: clamp(36px, 4.5vw, 54px); line-height: 1.05; }
        .n-section-head p { margin: 0 auto; max-width: 570px; color: var(--n-muted); font-size: 16px; line-height: 1.75; }
        .n-story { display: grid; grid-template-columns: .83fr 1.17fr; gap: 72px; align-items: center; }
        .n-story-copy h2 { margin: 14px 0 18px; font-size: clamp(38px, 4.5vw, 56px); line-height: 1.02; }
        .n-story-copy > p { color: var(--n-muted); font-size: 16px; line-height: 1.75; }
        .n-story-steps { display: grid; gap: 22px; margin-top: 30px; }
        .n-step { display: grid; grid-template-columns: 34px 1fr; gap: 13px; }
        .n-step-num { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid #ddd5f5; border-radius: 10px; color: #644bd0; background: #f4f0ff; font-size: 11px; font-weight: 800; }
        .n-step h3 { margin: 1px 0 4px; font-size: 14px; }
        .n-step p { margin: 0; color: var(--n-muted); font-size: 13px; line-height: 1.6; }
        .n-canvas { padding: 17px; border: 1px solid #e7e3ee; border-radius: 20px; background: #fff; box-shadow: 0 24px 56px rgba(54, 42, 99, .10); }
        .n-canvas-top { display: flex; align-items: center; justify-content: space-between; padding: 2px 2px 15px; border-bottom: 1px solid #f0edf5; }
        .n-canvas-label { font-size: 11px; font-weight: 800; }
        .n-canvas-status { color: #6d55ce; font-size: 9px; }
        .n-canvas-body { display: grid; grid-template-columns: 1fr 35px 1fr; gap: 10px; align-items: center; padding: 20px 0 8px; }
        .n-route-card { padding: 14px 12px; border: 1px solid #ebe7f1; border-radius: 12px; background: #fbfaff; }
        .n-route-label { display: flex; align-items: center; gap: 6px; color: #7b748a; font-size: 9px; }
        .n-route-label svg { width: 13px; height: 13px; }
        .n-route-card strong { display: block; margin: 11px 0 4px; font-size: 11px; }
        .n-route-card small { color: #817b91; font-size: 9px; line-height: 1.5; }
        .n-route-arrow { display: grid; place-items: center; color: #7557dc; }
        .n-route-arrow svg { width: 20px; }
        .n-route-result { padding: 14px 12px; border: 1px solid #dcd4f4; border-radius: 12px; background: #f5f1ff; }
        .n-route-result.blue { border-color: #d5e3fa; background: #f1f6ff; }
        .n-result-tag { font-size: 8px; font-weight: 800; color: #7456d8; }
        .n-route-result.blue .n-result-tag { color: #4d76d6; }
        .n-route-result strong { display: block; margin: 9px 0 4px; font-size: 11px; }
        .n-route-result small { color: #817b91; font-size: 9px; }
        .n-path-footer { padding: 12px 10px 2px; color: #8b8598; font-size: 9px; text-align: center; }
        .n-experiment { display: grid; grid-template-columns: 1.05fr .95fr; align-items: center; gap: 74px; }
        .n-experiment-visual { position: relative; padding: 26px; border-radius: 23px; background: #282343; color: #fff; overflow: hidden; }
        .n-experiment-visual:before { position: absolute; content: ""; width: 300px; height: 300px; border-radius: 50%; right: -90px; top: -100px; background: radial-gradient(circle, rgba(124, 95, 225, .58), transparent 68%); }
        .n-experiment-visual > * { position: relative; }
        .n-experiment-top { display: flex; justify-content: space-between; color: #c9c3e0; font-size: 10px; }
        .n-exp-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 25px 0 15px; }
        .n-exp-card { min-height: 165px; padding: 14px; border: 1px solid rgba(255,255,255,.16); border-radius: 14px; background: rgba(255,255,255,.08); }
        .n-exp-card:nth-child(2) { background: rgba(133, 111, 230, .25); border-color: rgba(191, 174, 255, .32); }
        .n-exp-mini { height: 62px; display: grid; place-items: center; border-radius: 9px; color: #ded7ff; background: linear-gradient(135deg, rgba(163,136,255,.44), rgba(91,126,229,.38)); }
        .n-exp-card:nth-child(2) .n-exp-mini { background: linear-gradient(135deg, rgba(106,160,239,.5), rgba(153,120,240,.48)); }
        .n-exp-card strong { display: block; margin: 12px 0 4px; font-size: 11px; }
        .n-exp-card small { color: #c2bdd5; font-size: 9px; }
        .n-split-line { display: flex; align-items: center; gap: 10px; color: #d4cdef; font-size: 9px; }
        .n-split-line:before, .n-split-line:after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,.2); }
        .n-exp-caption { margin: 14px 0 0; color: #c8c2dc; font-size: 10px; line-height: 1.6; }
        .n-experiment-copy h2 { margin: 14px 0 18px; font-size: clamp(38px, 4vw, 52px); line-height: 1.03; }
        .n-experiment-copy > p { color: var(--n-muted); font-size: 16px; line-height: 1.75; }
        .n-check-list { display: grid; gap: 13px; margin: 24px 0 28px; padding: 0; list-style: none; }
        .n-check-list li { display: flex; gap: 10px; align-items: flex-start; color: #4d495c; font-size: 13px; line-height: 1.55; }
        .n-check-list svg { width: 17px; height: 17px; flex: none; margin-top: 1px; color: #7153d9; }
        .n-tools { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e7e3ef; border: 1px solid #e7e3ef; border-radius: 17px; overflow: hidden; }
        .n-tool { min-height: 220px; padding: 25px 23px; background: #fff; }
        .n-tool-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: #684ed3; background: #f0edfb; }
        .n-tool:nth-child(2) .n-tool-icon { color: #4872d3; background: #edf3ff; }
        .n-tool:nth-child(3) .n-tool-icon { color: #7852c8; background: #f5efff; }
        .n-tool h3 { margin: 19px 0 8px; font-size: 15px; }
        .n-tool p { margin: 0; color: var(--n-muted); font-size: 13px; line-height: 1.65; }
        .n-analytics { display: grid; grid-template-columns: .9fr 1.1fr; align-items: center; gap: 70px; }
        .n-analytics-copy h2 { margin: 14px 0 18px; font-size: clamp(38px, 4vw, 52px); line-height: 1.04; }
        .n-analytics-copy p { color: var(--n-muted); font-size: 16px; line-height: 1.75; }
        .n-analytics-panel { padding: 22px; border: 1px solid #e8e4ef; border-radius: 19px; background: white; box-shadow: 0 20px 52px rgba(54, 42, 99, .09); }
        .n-analytics-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 17px; border-bottom: 1px solid #f0edf5; }
        .n-analytics-head strong { font-size: 12px; }
        .n-analytics-head span { color: #827c91; font-size: 9px; }
        .n-analytics-item { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 15px 0; border-bottom: 1px solid #f1eef6; }
        .n-analytics-item:last-child { border: 0; padding-bottom: 0; }
        .n-analytics-item strong { display: block; font-size: 10px; margin-bottom: 7px; }
        .n-analytics-item span { color: #817b91; font-size: 9px; }
        .n-bar { height: 5px; border-radius: 9px; background: #f0edf6; overflow: hidden; }
        .n-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #8a6ce8, #658be6); }
        .n-analytics-item:nth-child(3) .n-bar i { background: linear-gradient(90deg, #6e92e8, #9b7ce5); }
        .n-analytics-item:nth-child(4) .n-bar i { background: linear-gradient(90deg, #a78ae9, #cab9ed); }
        .n-insight-tag { align-self: center; border-radius: 20px; padding: 5px 8px; color: #6b53c8 !important; background: #f3efff; font-size: 8px !important; }
        .n-bottom { padding: 72px 0; background: linear-gradient(125deg, #5f4bc1 0%, #536dc9 100%); color: white; }
        .n-bottom-inner { display: flex; justify-content: space-between; align-items: center; gap: 30px; }
        .n-bottom h2 { max-width: 660px; margin: 0 0 12px; font-size: clamp(34px, 4vw, 49px); line-height: 1.05; }
        .n-bottom p { margin: 0; color: rgba(255,255,255,.78); font-size: 14px; }
        .n-footer { padding: 27px 0; background: #24203b; color: #d4d0e2; }
        .n-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; font-size: 12px; }
        .n-brand { display: flex; align-items: center; gap: 9px; color: white; font-size: 17px; font-weight: 800; letter-spacing: -.04em; }
        .n-brand-mark { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #a387f4, #6389ee); }
        .n-footer p { margin: 0; color: #a9a4bc; }
        .n-fade { animation: n-rise .7s both; }
        .n-delay { animation-delay: .12s; }
        @keyframes n-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 850px) {
          .n-hero { padding: 55px 0 65px; }
          .n-hero-grid { grid-template-columns: 1fr; gap: 36px; }
          .n-hero-copy { max-width: 650px; margin: 0 auto; text-align: center; }
          .n-hero h1, .n-hero-copy > p { margin-left: auto; margin-right: auto; }
          .n-hero-actions { justify-content: center; }
          .n-hero-art { width: min(100%, 560px); margin: 0 auto; padding: 0 12px; }
          .n-orbit { right: 5%; }
          .n-story, .n-experiment, .n-analytics { grid-template-columns: 1fr; gap: 42px; }
          .n-story { max-width: 690px; margin: 0 auto; }
          .n-story-copy { max-width: 580px; }
          .n-experiment-visual { order: 2; }
          .n-experiment-copy { order: 1; }
          .n-analytics { max-width: 720px; margin: 0 auto; }
          .n-bottom-inner { align-items: flex-start; flex-direction: column; }
        }
        @media (max-width: 600px) {
          .n-wrap { width: min(100% - 36px, 520px); }
          .n-hero { padding: 43px 0 53px; }
          .n-hero h1 { font-size: clamp(43px, 13vw, 61px); }
          .n-hero-copy > p { font-size: 16px; }
          .n-hero-actions { flex-direction: column; align-items: stretch; }
          .n-hero-actions .n-cta { width: 100%; }
          .n-text-link { justify-content: center; padding: 5px; }
          .n-hero-art { padding: 0; }
          .n-demo-frame { padding: 9px; border-radius: 19px; transform: none; }
          .n-store { min-height: 390px; padding: 19px 15px; }
          .n-store h3 { font-size: 23px; }
          .n-floating-note { right: -3px; bottom: 28px; padding: 9px 10px; }
          .n-floating-note span { font-size: 9px; }
          .n-section { padding: 76px 0; }
          .n-section-head { margin-bottom: 38px; }
          .n-section-head h2 { font-size: 39px; }
          .n-story-copy h2, .n-experiment-copy h2, .n-analytics-copy h2 { font-size: 40px; }
          .n-canvas { padding: 11px; }
          .n-canvas-body { grid-template-columns: 1fr 20px 1fr; gap: 5px; }
          .n-route-card, .n-route-result { padding: 11px 8px; }
          .n-route-card strong, .n-route-result strong { font-size: 10px; }
          .n-route-card small, .n-route-result small { font-size: 8px; }
          .n-tools { grid-template-columns: 1fr; }
          .n-tool { min-height: auto; padding: 22px; }
          .n-experiment-visual { padding: 18px; }
          .n-exp-cards { gap: 8px; }
          .n-exp-card { padding: 10px; min-height: 150px; }
          .n-analytics-panel { padding: 17px; }
          .n-bottom { padding: 55px 0; }
          .n-footer-inner { align-items: flex-start; flex-direction: column; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nudg-page *, .nudg-page *:before, .nudg-page *:after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
        }
      `}</style>

      <section className="n-hero">
        <div className="n-wrap n-hero-grid">
          <div className="n-hero-copy n-fade">
            <div className="n-kicker">One link. A little more intention.</div>
            <h1 className="n-display">Your bio link can do <em>more</em> than link.</h1>
            <p>
              Nudg turns your one link into a storefront that can meet each visitor
              where they are—with the right offer, at the right moment.
            </p>
            <div className="n-hero-actions">
              <Link href="/pricing" className="n-cta" data-testid="cta-try-free">
                Try Nudg free for 7 days <ArrowRight size={17} />
              </Link>
              <a href="#how-it-works" className="n-text-link">
                See how it works <ArrowDown size={15} />
              </a>
            </div>
            <p className="n-trial-note">No card up front. Then $22/month after your 7-day trial.</p>
          </div>

          <div className="n-hero-art n-fade n-delay">
            <div className="n-orbit" aria-hidden="true" />
            <div className="n-demo-frame">
              <div className="n-browser" aria-hidden="true">
                <i /><i /><i /><div className="n-url">nudg.me / studio-clay</div>
              </div>
              <div className="n-store">
                <div className="n-store-top">
                  <div className="n-creator"><span className="n-avatar">M</span> Maya makes things</div>
                  <span>⋯</span>
                </div>
                <div className="n-visitor-pill"><Sparkles size={11} /> A page shaped by the visit</div>
                <h3>{visitor.headline}</h3>
                <p className="n-store-intro">{visitor.subhead}</p>
                <div className="n-offer-card">
                  <div className={`n-offer-art ${visitor.accent}`}><WandSparkles /></div>
                  <div>
                    <p className="n-offer-note">{visitor.offerNote}</p>
                    <p className="n-offer-title">{visitor.offer}</p>
                    <span className="n-offer-action">{visitor.button} <ArrowRight size={10} /></span>
                  </div>
                </div>
                <div className="n-other-links"><span>My work</span><span>About Maya</span></div>
                <div className="n-intent-switch" aria-label="Preview different visitor journeys">
                  <button type="button" aria-pressed={visitorPath === "video"} onClick={() => setVisitorPath("video")}>From a short video</button>
                  <button type="button" aria-pressed={visitorPath === "newsletter"} onClick={() => setVisitorPath("newsletter")}>From a newsletter</button>
                </div>
              </div>
            </div>
            <div className="n-floating-note">
              <div className="n-floating-icon"><MousePointer2 size={14} /></div>
              <div><strong>Different visit, different offer</strong><span>Tap the preview to see the shift</span></div>
            </div>
          </div>
        </div>
        <div className="n-down" aria-hidden="true"><ArrowDown size={17} /></div>
      </section>

      <section className="n-section n-section-soft" id="how-it-works">
        <div className="n-wrap n-story">
          <div className="n-story-copy">
            <div className="n-kicker">A storefront with a point of view</div>
            <h2 className="n-display">One destination. More relevant next steps.</h2>
            <p>
              A link list makes every visitor do the sorting. Nudg gives your
              offers a home—and lets you shape what visitors see based on how
              they arrived or what they do.
            </p>
            <div className="n-story-steps">
              <div className="n-step"><span className="n-step-num">01</span><div><h3>Bring your offers together</h3><p>Give your products, content, and next steps a home at one memorable link.</p></div></div>
              <div className="n-step"><span className="n-step-num">02</span><div><h3>Choose what fits the visit</h3><p>Route by source or visitor behavior, instead of sending everyone to the same place.</p></div></div>
              <div className="n-step"><span className="n-step-num">03</span><div><h3>Learn what gets attention</h3><p>Use offer activity and experiments to make your storefront work harder over time.</p></div></div>
            </div>
          </div>
          <div className="n-canvas" aria-label="Illustration of a creator storefront routing visitors to relevant offers">
            <div className="n-canvas-top"><span className="n-canvas-label">Your storefront · visitor paths</span><span className="n-canvas-status">● Ready to route</span></div>
            <div className="n-canvas-body">
              <div className="n-route-card">
                <div className="n-route-label"><Route /> Visitor arrives</div>
                <strong>Where did they find you?</strong>
                <small>Short video or newsletter</small>
              </div>
              <div className="n-route-arrow"><ArrowRight /></div>
              <div className={`n-route-result ${visitorPath === "newsletter" ? "blue" : ""}`}>
                <span className="n-result-tag">A MORE RELEVANT NEXT STEP</span>
                <strong>{visitorPath === "video" ? "Beginner’s clay guide" : "Small-batch studio class"}</strong>
                <small>{visitorPath === "video" ? "For a first-time maker" : "For a curious regular"}</small>
              </div>
            </div>
            <div className="n-path-footer">A simple rule can change the first offer without changing your link.</div>
          </div>
        </div>
      </section>

      <section className="n-section">
        <div className="n-wrap n-experiment">
          <div className="n-experiment-visual">
            <div className="n-experiment-top"><span>Offer experiment</span><span>Two versions · shared traffic</span></div>
            <div className="n-exp-cards">
              <div className="n-exp-card"><div className="n-exp-mini"><CirclePlay size={24} /></div><strong>The quick-start guide</strong><small>Offer A · a useful first step</small></div>
              <div className="n-exp-card"><div className="n-exp-mini"><Sparkles size={24} /></div><strong>The studio class</strong><small>Offer B · learn by making</small></div>
            </div>
            <div className="n-split-line"><Split size={13} /> Compare what visitors respond to</div>
            <p className="n-exp-caption">Try different offers or page versions. Split traffic, see which gets more attention, and use what you learn.</p>
          </div>
          <div className="n-experiment-copy">
            <div className="n-kicker">Less guessing, more learning</div>
            <h2 className="n-display">Find the offer that feels right to your audience.</h2>
            <p>
              Your experiment doesn’t have to be complicated. Put two offers or
              page ideas in front of visitors, then use the response to decide
              what to lead with.
            </p>
            <ul className="n-check-list">
              <li><Check /> Compare different offers, messages, or page approaches.</li>
              <li><Check /> Let Nudg split visitor traffic between your versions.</li>
              <li><Check /> Review activity and carry what you learn into your storefront.</li>
            </ul>
            <Link href="/pricing" className="n-text-link" data-testid="cta-experiment">
              See what you can build <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="n-section n-section-soft">
        <div className="n-wrap">
          <div className="n-section-head">
            <div className="n-kicker">More than a list of links</div>
            <h2 className="n-display">The small tools behind a smarter storefront.</h2>
            <p>Bring your offers, timing, and experiments into one creator-friendly place.</p>
          </div>
          <div className="n-tools">
            <article className="n-tool">
              <div className="n-tool-icon"><Compass size={19} /></div>
              <h3>Route with intention</h3>
              <p>Show different offers based on how someone arrived, what device they use, or signals from their visit.</p>
            </article>
            <article className="n-tool">
              <div className="n-tool-icon"><Zap size={19} /></div>
              <h3>Nudge at the right moment</h3>
              <p>Use behavior triggers like time on page, scroll depth, or exit intent to make a timely offer.</p>
            </article>
            <article className="n-tool">
              <div className="n-tool-icon"><BarChart3 size={19} /></div>
              <h3>See what gets a look</h3>
              <p>Review offer activity and experiment results to understand what is catching visitors’ attention.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="n-section">
        <div className="n-wrap n-analytics">
          <div className="n-analytics-copy">
            <div className="n-kicker">Signals, not guesswork</div>
            <h2 className="n-display">Know which next step gets noticed.</h2>
            <p>
              See offer engagement in context. Use what visitors click and
              explore to decide what belongs at the top of your storefront.
              No complicated funnel diagram required.
            </p>
            <Link href="/pricing" className="n-text-link" data-testid="cta-analytics">
              Start learning from your page <ArrowRight size={16} />
            </Link>
          </div>
          <div className="n-analytics-panel" aria-label="Illustrative view of offer engagement analytics">
            <div className="n-analytics-head"><strong>Offer activity</strong><span>Illustrative preview</span></div>
            <div className="n-analytics-item"><div><strong>Beginner’s clay guide</strong><div className="n-bar"><i style={{ width: "72%" }} /></div></div><span className="n-insight-tag">Most explored</span></div>
            <div className="n-analytics-item"><div><strong>Small-batch studio class</strong><div className="n-bar"><i style={{ width: "54%" }} /></div></div><span>Offer clicks</span></div>
            <div className="n-analytics-item"><div><strong>Behind the scenes</strong><div className="n-bar"><i style={{ width: "36%" }} /></div></div><span>Offer clicks</span></div>
          </div>
        </div>
      </section>

      <section className="n-bottom">
        <div className="n-wrap n-bottom-inner">
          <div>
            <h2 className="n-display">Give every visit a better next step.</h2>
            <p>Try the full Nudg workspace for 7 days. No card up front. $22/month after your trial.</p>
          </div>
          <Link href="/pricing" className="n-cta n-cta-light" data-testid="cta-start-building">
            Start your 7-day trial <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="n-footer">
        <div className="n-wrap n-footer-inner">
          <div className="n-brand"><span className="n-brand-mark"><Sparkles size={15} /></span>Nudg</div>
          <p>One link, made more useful.</p>
          <Link href="/pricing" className="n-text-link" style={{ color: "#d9d3f5" }} data-testid="footer-pricing">Pricing <ArrowRight size={14} /></Link>
        </div>
      </footer>
    </main>
  );
}
