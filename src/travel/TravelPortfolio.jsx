import { useEffect } from "react";
import emailjs from "@emailjs/browser";

import { experiences, projects } from "../constants";
import { createTravelWorld } from "./engine";
import "./travel.css";

const CONTACT_EMAIL = "johngjh123@gmail.com";
const GITHUB_URL = "https://github.com/johngao122";

const sendPostcard = ({ name, email, message, reason }) =>
    emailjs.send(
        import.meta.env.VITE_EMAILJS_RECEIVERID,
        import.meta.env.VITE_EMAILJS_TEMPLATEID,
        {
            from_name: name,
            to_name: "John Gao",
            from_email: email,
            to_email: CONTACT_EMAIL,
            message: reason ? `[${reason}] ${message}` : message,
        },
        import.meta.env.VITE_EMAILJS_USERID
    );

const Plane = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="currentColor"
            d="M22 12c0-.8-.7-1.3-1.5-1.3H15L10 3H8l2.5 7.7H5.5L3.8 8.5H2.5l1 3.5-1 3.5h1.3l1.7-2.2h5L8 21h2l5-7.7h5.5c.8 0 1.5-.5 1.5-1.3z"
        />
    </svg>
);

const Chevron = ({ dir }) => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
);

const NAV = [
    ["takeoff", "TAKEOFF"],
    ["destinations", "DESTINATIONS"],
    ["lounge", "LAYOVERS"],
    ["baggage", "BAGGAGE CLAIM"],
    ["arrivals", "ARRIVALS"],
];

const TravelPortfolio = () => {
    useEffect(
        () =>
            createTravelWorld({
                experiences,
                projects,
                sendPostcard,
                contactEmail: CONTACT_EMAIL,
                signName: "JOHN",
            }),
        []
    );

    return (
        <div className="travel">
            <div id="fade" aria-hidden="true" />

            <header className="nav" id="nav">
                <a className="brand" href="#takeoff">
                    <span className="brand-mark">
                        <Plane />
                    </span>
                    JOHN GAO
                </a>
                <nav className="nav-links" aria-label="Sections">
                    {NAV.map(([id, label], i) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            data-sec={id}
                            aria-current={i === 0 ? "true" : "false"}
                        >
                            {label}
                        </a>
                    ))}
                </nav>
            </header>

            <div className="hud" id="hud" aria-hidden="true">
                <div>
                    <span>ALT FT</span>
                    <span id="hud-alt">0</span>
                </div>
                <div>
                    <span>SPD KT</span>
                    <span id="hud-spd">0</span>
                </div>
                <div>
                    <span>PHASE</span>
                    <span className="phase" id="hud-phase">
                        GATE
                    </span>
                </div>
            </div>

            <main>
                <section className="track" id="takeoff" aria-label="Takeoff">
                    <div className="sticky">
                        <div className="hero" id="hero">
                            <span className="ticket">
                                FLIGHT JG-001 · GATE A1 · NOW BOARDING
                            </span>
                            <h1>John Gao</h1>
                            <p>
                                AI and platform engineer based in Singapore. I
                                build AI platforms and scalable backends, and
                                collect passport stamps and local drinks along
                                the way.
                            </p>
                            <a className="skip" href="#destinations">
                                Skip to destinations →
                            </a>
                        </div>
                        <div className="cue" id="cue">
                            <svg
                                width="22"
                                height="34"
                                viewBox="0 0 22 34"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                aria-hidden="true"
                            >
                                <rect x="1.5" y="1.5" width="19" height="31" rx="9.5" />
                                <path d="M11 8v7" strokeLinecap="round" />
                            </svg>
                            <span>SCROLL TO TAKE OFF</span>
                        </div>
                        <div className="arrive" id="arrive" style={{ opacity: 0 }}>
                            <span>CRUISING ALTITUDE REACHED</span>
                            <strong>Where to first?</strong>
                        </div>
                    </div>
                </section>

                <section className="track" id="destinations" aria-label="Destinations">
                    <div className="sticky">
                        <div className="head on-dark">
                            <span className="eyebrow">DESTINATIONS</span>
                            <h2>Everywhere I've been, by what's worth drinking there.</h2>
                            <span className="stat" id="stat" />
                        </div>
                        <div className="dest-tools">
                            <div className="hint">
                                <button className="round" id="rot-l" type="button" aria-label="Rotate globe west">
                                    <Chevron dir="left" />
                                </button>
                                <button className="round" id="rot-r" type="button" aria-label="Rotate globe east">
                                    <Chevron dir="right" />
                                </button>
                                <span>DRAG TO SPIN · TAP A BOTTLE TO ZOOM IN</span>
                            </div>
                            <div className="chips" id="chips" role="group" aria-label="Countries" />
                        </div>
                        <article className="panel card" aria-live="polite">
                            <div className="card-top">
                                <strong id="c-country" />
                                <span className="small-label" id="c-count" />
                            </div>
                            <div className="tabs" id="c-tabs" role="group" aria-label="Stops" />
                            <div className="shelf">
                                <canvas id="c-label" width="10" height="10" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 className="big" id="c-drink" />
                                <span className="meta" id="c-meta" />
                            </div>
                            <p className="note" id="c-note" />
                            <div className="fields" id="c-fields" hidden>
                                <div>
                                    <span>WHEN I WAS THERE</span>
                                    <span id="c-when" />
                                </div>
                                <div>
                                    <span>MY VERDICT</span>
                                    <span id="c-verdict" />
                                </div>
                            </div>
                            <div className="card-nav">
                                <button className="round" id="c-prev" type="button" aria-label="Previous country">
                                    <Chevron dir="left" />
                                </button>
                                <button className="round" id="c-next" type="button" aria-label="Next country">
                                    <Chevron dir="right" />
                                </button>
                                <button className="round" id="c-globe" type="button" aria-label="Show the whole globe" title="Whole globe">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M3 12h18M12 3c3.2 3.4 3.2 14.6 0 18M12 3c-3.2 3.4-3.2 14.6 0 18" />
                                    </svg>
                                </button>
                                <a className="pill solid push" href="#lounge">
                                    Next: layovers
                                </a>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="track" id="lounge" aria-label="Layover lounge">
                    <div className="sticky">
                        <div className="head on-dark">
                            <span className="eyebrow">LAYOVER LOUNGE</span>
                            <h2>Every job, served one round at a time.</h2>
                            <p>Pick a departure. The bartender pours, I tell the story.</p>
                        </div>
                        <div className="board" role="group" aria-label="Jobs">
                            <div className="board-head">
                                <span>DEPARTURES · CAREER</span>
                                <span>STATUS</span>
                            </div>
                            <div id="rows" />
                        </div>
                        <div className="bubble" id="bub-tender" aria-hidden="true" />
                        <div className="bubble" id="bub-dots" aria-hidden="true">
                            ...
                        </div>
                        <div className="bubble" id="bub-talk" role="status" aria-live="polite">
                            <span className="small-label" id="talk-meta" />
                            <span className="lead" id="talk-lead" />
                            <div id="talk-points" />
                            <div className="acts">
                                <button className="pill" id="pour-again" type="button">
                                    Pour again
                                </button>
                                <button className="pill solid" id="next-round" type="button">
                                    Next round
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="track" id="baggage" aria-label="Baggage claim">
                    <div className="sticky">
                        <div className="head">
                            <span className="eyebrow" style={{ color: "#9A3A2C" }}>
                                BAGGAGE CLAIM
                            </span>
                            <h2>Projects I carried home.</h2>
                            <p style={{ color: "#3E4C5A" }}>Grab a bag off the belt to unpack it.</p>
                        </div>
                        <div className="bag-tools">
                            <div className="hint">
                                <span>TAP A SUITCASE ON THE BELT</span>
                            </div>
                            <div className="chips ink" id="bag-chips" role="group" aria-label="Projects" />
                        </div>
                        <article className="panel bag-card" aria-live="polite">
                            <div id="bag-open" hidden>
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span className="small-label" id="bag-num" />
                                        <span className="tagchip" id="bag-tag" />
                                    </div>
                                    <img className="shot" id="bag-img" alt="" />
                                    <h3 className="big" id="bag-name" />
                                    <p className="note" id="bag-desc" />
                                    <div className="stacks" id="bag-tags" />
                                    <div className="card-nav">
                                        <a className="pill dark" id="bag-link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                            Open project
                                        </a>
                                        <button className="pill" id="bag-close" type="button">
                                            Back on the belt
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div id="bag-idle">
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <span className="small-label">ARRIVALS · BELT 04</span>
                                    <h3 className="big">
                                        <span id="bag-count" /> bags on the belt.
                                    </h3>
                                    <p className="note">
                                        Each suitcase is a project. Tap one as it comes round, or pick one below.
                                    </p>
                                    <div className="bag-list" id="bag-list" />
                                    <div className="card-nav">
                                        <a className="pill solid" href="#arrivals">
                                            Next: arrivals
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="track" id="arrivals" aria-label="Arrivals">
                    <div className="sticky">
                        <div className="head on-dark">
                            <span className="eyebrow">ARRIVALS</span>
                            <h2>You made it. Send me a postcard.</h2>
                            <p>A role, a project, or a bar I need to try. I read every one.</p>
                        </div>
                        <form className="panel postcard" id="postcard" noValidate>
                            <div className="pc-top">
                                <span>POSTCARD · ARRIVALS HALL</span>
                                <span>PAR AVION</span>
                            </div>
                            <div className="pc-body">
                                <div className="pc-msg">
                                    <label className="small-label" htmlFor="pc-msg">
                                        YOUR MESSAGE
                                    </label>
                                    <textarea id="pc-msg" name="message" rows={5} required />
                                </div>
                                <div className="pc-addr">
                                    <div className="stamp">
                                        <Plane size={26} />
                                        <span>JG-001</span>
                                    </div>
                                    <label className="small-label" htmlFor="pc-name">
                                        FROM
                                    </label>
                                    <input id="pc-name" name="name" type="text" autoComplete="name" required placeholder="Your name" />
                                    <label className="small-label" htmlFor="pc-email">
                                        REPLY TO
                                    </label>
                                    <input id="pc-email" name="email" type="email" autoComplete="email" required placeholder="you@email.com" />
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <span className="small-label" id="pc-about">
                                    WHAT'S IT ABOUT?
                                </span>
                                <div className="reasons" role="group" aria-labelledby="pc-about" id="reasons" />
                            </div>
                            <span className="small-label" id="pc-error" style={{ color: "#B23A48" }} role="alert" />
                            <button className="send" type="submit">
                                Drop it in the mailbox
                            </button>
                        </form>
                        <div className="panel delivered" id="delivered" role="status" aria-live="polite" style={{ opacity: 0, pointerEvents: "none" }}>
                            <span className="stampmark">DELIVERED</span>
                            <strong style={{ fontSize: 30, letterSpacing: "-.02em", lineHeight: 1.05 }}>
                                Postcard received. Cheers!
                            </strong>
                            <span className="note">I'll write back within a few days.</span>
                            <button className="pill" id="write-again" type="button">
                                Write another
                            </button>
                        </div>
                        <div className="links">
                            <span>OR FIND ME AT</span>
                            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL.toUpperCase()}</a>
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                GITHUB
                            </a>
                            <span className="fine">© {new Date().getFullYear()} JOHN GAO · PLEASE TRAVEL &amp; DRINK RESPONSIBLY</span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default TravelPortfolio;
