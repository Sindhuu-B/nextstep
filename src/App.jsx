
import { useEffect, useMemo, useState } from "react";
import {
  Search, CalendarDays, Bookmark, BookmarkCheck, ExternalLink,
  ChevronRight, Clock3, MapPin, ShieldCheck, X, GraduationCap,
  BriefcaseBusiness, Bell, ArrowUpRight
} from "lucide-react";
import { supabase } from "./supabase";
import "./App.css";

const categories = [
  "All", "Medical", "Engineering", "MBA", "Banking",
  "Civil Services", "SSC & Railways", "State Government"
];

function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function formatDate(date) {
  if (!date) return "Not announced";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function countdown(date) {
  const days = daysUntil(date);
  if (days === null) return "Awaiting announcement";
  if (days < 0) return "Date has passed — verify status";
  if (days === 0) return "Today";
  if (days < 30) return `${days} days remaining`;
  const months = Math.floor(days / 30.4375);
  if (months < 1) return `${days} days remaining`;
  return `~${months} month${months === 1 ? "" : "s"} remaining`;
}

function statusLabel(item) {
  if (item.status === "Open" && item.deadline) {
    const days = daysUntil(item.deadline);
    if (days < 0) return "Verify status";
    return "Applications open";
  }
  return item.status === "Expected" ? "Expected" : "Monitoring";
}

export default function App() {
  const [opportunities, setOpportunities] = useState([]);
  const [statePortals, setStatePortals] = useState([]);

  const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState("");

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("All states");
  const [savedOnly, setSavedOnly] = useState(false);
  const [view, setView] = useState("exams");
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nextstep-saved") || "[]");
    } catch {
      return [];
    }
  });


  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError("");

      try {
        const [examsResult, portalsResult] = await Promise.all([
          supabase.from("exams").select("*").order("name"),
          supabase.from("state_portals").select("*").order("state")
        ]);

        if (examsResult.error) {
          throw examsResult.error;
        }

        if (portalsResult.error) {
          throw portalsResult.error;
        }

        const formattedExams = (examsResult.data || []).map((row) => ({
          ...row,
          examDate: row.exam_date,
          dateConfidence: row.date_confidence,
          lastVerified: row.last_verified,
          officialUrl: row.official_url,
          sourceUrl: row.source_url,
          syllabus: row.syllabus
            ? row.syllabus.split("\n").filter(Boolean)
            : []
        }));

        setOpportunities(formattedExams);
        setStatePortals(portalsResult.data || []);
      } catch (error) {
        console.error("Failed to load NextStep data:", error);
        setLoadError(
          "Unable to load data from Supabase. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);


  function toggleSaved(id) {
    setSaved((previous) => {
      const next = previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id];
      localStorage.setItem("nextstep-saved", JSON.stringify(next));
      return next;
    });
  }

  const filtered = useMemo(() => {
    return opportunities.filter((item) => {
      const text = [
        item.name, item.category, item.state, item.description,
        item.type, item.qualification
      ].join(" ").toLowerCase();

      if (search && !text.includes(search.toLowerCase())) return false;
      if (category !== "All" && item.category !== category) return false;
      if (state !== "All states" && item.state !== state) return false;
      if (savedOnly && !saved.includes(item.id)) return false;
      return true;
    });
  }, [search, category, state, savedOnly, saved]);

  const openApplications = opportunities.filter((item) =>
    item.status === "Open" &&
    item.deadline &&
    daysUntil(item.deadline) >= 0
  ).length;

  const stateNames = [
    "All states",
    ...new Set([
      ...opportunities.map((item) => item.state),
      ...statePortals.map((item) => item.state)
    ])
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => {
          setView("exams");
          setSavedOnly(false);
          setCategory("All");
        }}>
          <span className="brand-icon">N</span>
          <span>Next<span className="brand-accent">Step</span></span>
        </a>

        <p className="side-label">YOUR WORKSPACE</p>
        <button
          className={`side-link ${view === "exams" && !savedOnly ? "active" : ""}`}
          onClick={() => { setView("exams"); setSavedOnly(false); }}
        >
          <Search size={18} /> Discover opportunities
        </button>
        <button
          className={`side-link ${savedOnly ? "active" : ""}`}
          onClick={() => { setView("exams"); setSavedOnly(true); }}
        >
          <Bookmark size={18} /> Saved list
          <span className="side-count">{saved.length}</span>
        </button>
        <button
          className={`side-link ${view === "states" ? "active" : ""}`}
          onClick={() => { setView("states"); setSavedOnly(false); }}
        >
          <MapPin size={18} /> State portals
        </button>

        <p className="side-label category-heading">CATEGORIES</p>
        {categories.slice(1).map((item) => (
          <button
            key={item}
            className={`side-link ${category === item && view === "exams" ? "active" : ""}`}
            onClick={() => {
              setCategory(item);
              setView("exams");
              setSavedOnly(false);
            }}
          >
            <span className="category-mark">•</span>{item}
          </button>
        ))}

        <div className="sidebar-tip">
          <Bell size={19} />
          <strong>Stay ahead of deadlines</strong>
          <p>Save an opportunity so you can find it again quickly.</p>
        </div>
        <p className="side-footer"><ShieldCheck size={15} /> Always verify official notices</p>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="breadcrumb">Workspace <ChevronRight size={14} />
            <strong>{view === "states" ? "State portals" : savedOnly ? "Saved list" : "Discover"}</strong>
          </span>
          <span className="topbar-note"><ShieldCheck size={16} /> Official-source first</span>
        </header>

        <div className="content">

        {loading && (
  <div className="notice">
    <p>Loading exams and government job notifications...</p>
  </div>
)}

{loadError && (
  <div className="notice">
    <div>
      <strong>Could not load data</strong>
      <p>{loadError}</p>
      <button onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  </div>
)}
          <section className="hero">
            <div>
              <p className="kicker">YOUR NEXT OPPORTUNITY STARTS HERE</p>
              <h1>{view === "states" ? "Explore state portals." : savedOnly ? "Your saved opportunities." : "Never miss your next step."}</h1>
              <p>Discover exams and government recruitment. Keep important dates in sight.</p>
            </div>
            <div className="hero-symbol"><CalendarDays size={38} /></div>
          </section>

          <section className="stats">
            <div className="stat">
              <span>Opportunities listed</span>
              <strong>{opportunities.length}</strong>
              <small>Across exam categories</small>
            </div>
            <div className="stat">
              <span>Open applications</span>
              <strong>{openApplications}</strong>
              <small>Based on entered deadlines</small>
            </div>
            <div className="stat">
              <span>State portals</span>
              <strong>{statePortals.length}</strong>
              <small>Official-source directory</small>
            </div>
            <div className="stat">
              <span>Saved by you</span>
              <strong>{saved.length}</strong>
              <small>Stored in this browser</small>
            </div>
          </section>

          <section className="notice">
            <ShieldCheck size={22} />
            <div>
              <strong>Don't trust an unverified date.</strong>
              <p>Confirm application deadlines and exam dates from the official notification before applying.</p>
            </div>
          </section>

          {view === "exams" ? (
            <section>
              <div className="section-heading">
                <div>
                  <p className="kicker">{savedOnly ? "YOUR WATCHLIST" : "FIND YOUR OPPORTUNITY"}</p>
                  <h2>{savedOnly ? "Saved opportunities" : "Explore exams & jobs"}</h2>
                </div>
                <span className="result-count">{filtered.length} results</span>
              </div>

              <div className="filters">
                <label className="search-box">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exams, jobs or qualifications..."
                  />
                  {search && <button onClick={() => setSearch("")}><X size={15}/></button>}
                </label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={state} onChange={(e) => setState(e.target.value)}>
                  {stateNames.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>

              <div className="cards">
                {filtered.map((item) => {
                  const isSaved = saved.includes(item.id);
                  return (
                    <article className="card" key={item.id}>
                      <div className="card-top">
                        <span className="card-icon">
                          {item.type === "Government job"
                            ? <BriefcaseBusiness size={22}/>
                            : <GraduationCap size={22}/>}
                        </span>
                        <button
                          className={`bookmark ${isSaved ? "bookmarked" : ""}`}
                          onClick={() => toggleSaved(item.id)}
                          aria-label={isSaved ? "Unsave opportunity" : "Save opportunity"}
                        >
                          {isSaved ? <BookmarkCheck size={19}/> : <Bookmark size={19}/>}
                        </button>
                      </div>

                      <div className="card-heading">
                        <span className="category-label">{item.category} · {item.state}</span>
                        <h3>{item.name}</h3>
                      </div>
                      <p className="description">{item.description}</p>

                      <div className="date-panel">
                        <CalendarDays size={19}/>
                        <div>
                          <small>Application deadline</small>
                          <strong>{formatDate(item.deadline)}</strong>
                        </div>
                      </div>
                      <div className="countdown">
                        <Clock3 size={15}/>
                        {item.deadline ? countdown(item.deadline) : "Application deadline not confirmed"}
                      </div>

                      <div className="status-row">
                        <span className={`status ${item.status === "Open" ? "status-open" : ""}`}>
                          {statusLabel(item)}
                        </span>
                        <span className="source-date">
                          {item.lastVerified ? `Checked ${formatDate(item.lastVerified)}` : "Verification pending"}
                        </span>
                      </div>

                      <button className="details-button" onClick={() => setSelected(item)}>
                        View details <ChevronRight size={17}/>
                      </button>
                    </article>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="empty">
                  <Search size={28}/>
                  <h3>No matching opportunities</h3>
                  <p>Try another search, category or state.</p>
                  <button onClick={() => {
                    setSearch("");
                    setCategory("All");
                    setState("All states");
                    setSavedOnly(false);
                  }}>Clear filters</button>
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="section-heading">
                <div>
                  <p className="kicker">GOVERNMENT SOURCES</p>
                  <h2>State recruitment portals</h2>
                  <p className="section-subtitle">Open the official portal to see its latest notifications and application details.</p>
                </div>
              </div>

              <div className="portal-list">
                {statePortals
                  .filter((portal) => {
                    const text = `${portal.state} ${portal.name} ${portal.category}`.toLowerCase();
                    return text.includes(search.toLowerCase()) &&
                      (state === "All states" || portal.state === state);
                  })
                  .map((portal) => (
                    <article className="portal-card" key={portal.name}>
                      <div className="portal-icon"><MapPin size={20}/></div>
                      <div className="portal-info">
                        <span>{portal.state} · {portal.category}</span>
                        <h3>{portal.name}</h3>
                        <a href={portal.url} target="_blank" rel="noreferrer">
                          Open official portal <ArrowUpRight size={15}/>
                        </a>
                      </div>
                      <a className="external-link" href={portal.url} target="_blank" rel="noreferrer" aria-label={`Open ${portal.name}`}>
                        <ExternalLink size={18}/>
                      </a>
                    </article>
                  ))}
              </div>
              <p className="directory-note">A portal link is not confirmation of an active vacancy. Check the notification, deadline and eligibility on the official site.</p>
            </section>
          )}

          <footer className="footer">
            <span>NextStep · Opportunity discovery prototype</span>
            <span>Official notifications take priority.</span>
          </footer>
        </div>
      </main>

      {selected && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <span className="category-label">{selected.category} · {selected.state}</span>
                <h2>{selected.name}</h2>
                <p>{selected.description}</p>
              </div>
              <button className="close-button" onClick={() => setSelected(null)} aria-label="Close">
                <X size={20}/>
              </button>
            </div>

            <div className="modal-warning">
              <ShieldCheck size={19}/>
              <span>{selected.note}</span>
            </div>

            <div className="detail-grid">
              <div><small>Application deadline</small><strong>{formatDate(selected.deadline)}</strong></div>
              <div><small>Exam date</small><strong>{formatDate(selected.examDate)}</strong></div>
              <div><small>Qualification</small><strong>{selected.qualification}</strong></div>
              <div><small>Data status</small><strong>{selected.dateConfidence}</strong></div>
            </div>

            <h3 className="modal-section-title">Syllabus overview</h3>
            <ul className="syllabus">
              {selected.syllabus.map((topic) => <li key={topic}>{topic}</li>)}
            </ul>

            <h3 className="modal-section-title">Exam pattern</h3>
            <p className="pattern-copy">{selected.pattern}</p>

            <div className="modal-actions">
              <button className="save-action" onClick={() => toggleSaved(selected.id)}>
                {saved.includes(selected.id) ? <BookmarkCheck size={17}/> : <Bookmark size={17}/>}
                {saved.includes(selected.id) ? "Saved" : "Save opportunity"}
              </button>
              <a href={selected.officialUrl} target="_blank" rel="noreferrer" className="official-action">
                Official website <ExternalLink size={17}/>
              </a>
            </div>
            <p className="modal-footnote">
              Source: <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Open source listing</a>.
              Always verify the latest notification before applying.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
