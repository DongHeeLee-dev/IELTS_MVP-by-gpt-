
import React, { useEffect, useMemo, useRef, useState } from "react";

// ✅ IELTS Study MVP — single-file React app
// - LocalStorage persistence
// - Daily checklist & streaks
// - Reading drill (timer + sample passage + auto-grading)
// - Listening helper (audio URL + notes)
// - Writing Task 1/2 editor (word count + export)
// - Speaking prompts + voice recorder (downloadable)
// - Import/Export settings & progress

const TABS = ["Dashboard", "Reading", "Listening", "Writing", "Speaking", "Settings"] as const;
type Tab = typeof TABS[number];

// ---- Utilities ----
const todayStr = () => new Date().toISOString().slice(0, 10);
const formatSeconds = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
};

function useLocalStorage<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

// ---- Sample content ----
const readingPassage = `Many cities are experimenting with car-free zones to reduce congestion and improve air quality. 
Initial results show that local businesses do not necessarily suffer; in some districts, foot traffic increased as streets became more pleasant for pedestrians. 
However, critics argue that such policies merely shift traffic to neighboring areas rather than reducing it overall. 
The long-term success of car-free zones likely depends on parallel investment in public transport and cycling infrastructure.`;

const readingQuestions: { q: string; type: "TFNG"; a: "T" | "F" | "NG"; expl: string }[] = [
  {
    q: "Car-free zones always reduce sales for nearby shops.",
    type: "TFNG",
    a: "F",
    expl: "The passage says businesses do not necessarily suffer and sometimes see more foot traffic.",
  },
  {
    q: "Some areas observed more pedestrians after introducing car-free zones.",
    type: "TFNG",
    a: "T",
    expl: "It explicitly states foot traffic increased in some districts.",
  },
  {
    q: "Opponents think traffic might just move elsewhere.",
    type: "TFNG",
    a: "T",
    expl: "Critics argue the policy shifts traffic to neighboring areas.",
  },
  {
    q: "The passage guarantees long-term success without additional investments.",
    type: "TFNG",
    a: "F",
    expl: "It says success likely depends on parallel investment in transport and cycling.",
  },
  {
    q: "Cycling infrastructure is irrelevant to car-free zones.",
    type: "TFNG",
    a: "F",
    expl: "The passage links success with investing in cycling infrastructure.",
  },
];

const writingTask1Prompts = [
  "The chart shows the percentage of household waste recycled in three countries between 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  "The table illustrates average weekly time spent on five leisure activities by adults in four age groups. Summarise the information and make comparisons where relevant.",
];

const writingTask2Prompts = [
  "Some people think that the best way to reduce traffic is to increase fuel prices. To what extent do you agree or disagree?",
  "Many believe universities should focus more on practical skills for employment than on academic subjects. Discuss both views and give your opinion.",
  "In some countries, citizens are living longer. What problems does this cause for individuals and society, and what solutions can be taken?",
];

const speakingP1 = [
  "What do you do to relax after work?",
  "Do you prefer mornings or evenings? Why?",
  "How often do you read books, and what kinds?",
];
const speakingP2 = [
  "Describe a place in your city that you enjoy visiting. You should say where it is, what you do there, who you go with, and explain why you like it.",
  "Describe a skill you would like to learn in the future. You should say what the skill is, how you would learn it, and why it is important to you.",
];
const speakingP3 = [
  "What are the advantages and disadvantages of living in a big city?",
  "How can governments encourage people to use public transport?",
  "Do you think technology has changed the way we communicate? In what ways?",
];

// ---- App ----
export default function App() {
  const [tab, setTab] = useLocalStorage<Tab>("ielts_tab", "Dashboard");
  const [checklist, setChecklist] = useLocalStorage<Record<string, boolean>>(
    "ielts_check",
    { reading: false, listening: false, writing: false, speaking: false }
  );
  const [lastActive, setLastActive] = useLocalStorage<string>("ielts_last", todayStr());
  const [streak, setStreak] = useLocalStorage<number>("ielts_streak", 0);

  // streak logic
  useEffect(() => {
    const today = todayStr();
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.toISOString().slice(0, 10);
      setStreak((s) => (lastActive === y ? s + 1 : 1));
      setLastActive(today);
      // reset daily checklist
      setChecklist({ reading: false, listening: false, writing: false, speaking: false });
    }
  }, []); // run once

  // progress
  const progress = useMemo(() => {
    const vals = Object.values(checklist);
    return Math.round((vals.filter(Boolean).length / vals.length) * 100);
  }, [checklist]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">IELTS Study — MVP</h1>
            <p className="text-xs text-gray-500">{todayStr()} · Streak: <span className="font-semibold">{streak} days</span></p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                  tab === t ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100 border-gray-300"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "Dashboard" && (
          <Dashboard progress={progress} checklist={checklist} setChecklist={setChecklist} />
        )}
        {tab === "Reading" && <ReadingDrill onDone={() => toggleDone("reading", checklist, setChecklist)} />}
        {tab === "Listening" && <ListeningLab onDone={() => toggleDone("listening", checklist, setChecklist)} />}
        {tab === "Writing" && <WritingLab onDone={() => toggleDone("writing", checklist, setChecklist)} />}
        {tab === "Speaking" && <SpeakingLab onDone={() => toggleDone("speaking", checklist, setChecklist)} />}
        {tab === "Settings" && <SettingsPanel />}
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-10 text-xs text-gray-500">
        <p>
          Tip: This is an MVP (Minimum Viable Product) — a small but usable first version. Your feedback can shape the next iteration.
        </p>
      </footer>
    </div>
  );
}

function toggleDone(
  key: keyof { reading: boolean; listening: boolean; writing: boolean; speaking: boolean },
  checklist: Record<string, boolean>,
  setChecklist: (v: any) => void
) {
  if (checklist[key]) return; // avoid unchecking automatically
  setChecklist({ ...checklist, [key]: true });
}

// ---- Dashboard ----
function Dashboard({
  progress,
  checklist,
  setChecklist,
}: {
  progress: number;
  checklist: Record<string, boolean>;
  setChecklist: (v: any) => void;
}) {
  const items: { key: keyof typeof checklist; label: string; tip: string }[] = [
    { key: "reading", label: "Reading 20m", tip: "Skimming/Scanning + 5 Qs" },
    { key: "listening", label: "Listening 20m", tip: "Audio + Note-taking" },
    { key: "writing", label: "Writing 40m", tip: "Task 1 (10m) / Task 2 (30m)" },
    { key: "speaking", label: "Speaking 15m", tip: "P1/P2/P3 prompts + record" },
  ];

  return (
    <div className="grid gap-6">
      <div className="p-5 rounded-2xl bg-white shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today's Plan</h2>
          <span className="text-sm">Progress: {progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded mt-2">
          <div className="h-2 rounded bg-black" style={{ width: `${progress}%` }} />
        </div>
        <ul className="mt-4 grid sm:grid-cols-2 gap-3">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
              <input
                type="checkbox"
                className="size-4"
                checked={!!checklist[it.key]}
                onChange={(e) => setChecklist({ ...checklist, [it.key]: (e.target as HTMLInputElement).checked })}
              />
              <div>
                <div className="text-sm font-medium">{it.label}</div>
                <div className="text-xs text-gray-500">{it.tip}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <MiniCard title="Weakness Tracker" desc="Write quick notes after study.">
          <textarea
            className="w-full h-28 border rounded-xl p-3 text-sm"
            placeholder="e.g., Matching Headings 어려움, T/F/NG에서 NG 구분 연습 필요"
            defaultValue={localStorage.getItem("ielts_weak") || ""}
            onBlur={(e) => localStorage.setItem("ielts_weak", (e.target as HTMLTextAreaElement).value)}
          />
        </MiniCard>
        <MiniCard title="Vocabulary" desc="Collect 5 useful phrases per day.">
          <textarea
            className="w-full h-28 border rounded-xl p-3 text-sm"
            placeholder="e.g., on balance, it is widely believed that..., compelling evidence, mitigate, feasible"
            defaultValue={localStorage.getItem("ielts_vocab") || ""}
            onBlur={(e) => localStorage.setItem("ielts_vocab", (e.target as HTMLTextAreaElement).value)}
          />
        </MiniCard>
      </div>
    </div>
  );
}

function MiniCard({ title, desc, children }: any) {
  return (
    <div className="p-5 rounded-2xl bg-white shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-gray-500">{desc}</span>
      </div>
      {children}
    </div>
  );
}

// ---- Reading ----
function ReadingDrill({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(20 * 60);
  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useLocalStorage<string[]>("ielts_read_ans", Array(readingQuestions.length).fill(""));
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const score = useMemo(() => {
    let s = 0;
    readingQuestions.forEach((q, i) => {
      if (answers[i]?.toUpperCase() === q.a) s++;
    });
    return s;
  }, [answers]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reading Drill — T/F/NG</h2>
          <p className="text-xs text-gray-500">Goal: finish in 20 minutes · build NG intuition</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">{formatSeconds(seconds)}</span>
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-1.5 text-sm rounded-xl border bg-white hover:bg-gray-100"
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => setSeconds(20 * 60)}
            className="px-3 py-1.5 text-sm rounded-xl border bg-white hover:bg-gray-100"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border">
        <p className="whitespace-pre-line text-sm leading-6">{readingPassage}</p>
      </div>

      <div className="grid gap-3">
        {readingQuestions.map((q, i) => (
          <div key={i} className="p-4 rounded-xl bg-white border">
            <div className="text-sm font-medium mb-2">{i + 1}. {q.q}</div>
            <div className="flex gap-2 text-sm">
              {["T", "F", "NG"].map((opt) => (
                <label key={opt} className={`px-3 py-1.5 border rounded-xl cursor-pointer ${answers[i] === opt ? "bg-black text-white border-black" : "bg-white"}`}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    value={opt}
                    className="hidden"
                    checked={answers[i] === opt}
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = (e.target as HTMLInputElement).value;
                      localStorage.setItem("ielts_read_ans", JSON.stringify(next));
                      (setAnswers as any)(next);
                    }}
                  />
                  {opt}
                </label>
              ))}
            </div>
            {checked && (
              <div className="mt-2 text-xs">
                <div>
                  Correct: <span className="font-semibold">{q.a}</span>
                </div>
                <div className="text-gray-600">Why: {q.expl}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setChecked(true)}
          className="px-4 py-2 rounded-xl border bg-black text-white"
        >
          Check Answers ({score}/{readingQuestions.length})
        </button>
        <button
          onClick={() => {
            setChecked(false);
            (setAnswers as any)(Array(readingQuestions.length).fill(""));
            localStorage.removeItem("ielts_read_ans");
          }}
          className="px-4 py-2 rounded-xl border bg-white"
        >
          Clear
        </button>
        <button onClick={onDone} className="ml-auto px-4 py-2 rounded-xl border bg-white hover:bg-gray-100">
          Mark Today's Reading Done
        </button>
      </div>
    </div>
  );
}

// ---- Listening ----
function ListeningLab({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useLocalStorage<string>("ielts_listen_url", "");
  const [notes, setNotes] = useLocalStorage<string>("ielts_listen_notes", "");

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Listening Lab</h2>
      <div className="p-4 rounded-2xl bg-white border grid gap-3">
        <label className="text-sm font-medium">Audio URL (mp3/mp4)</label>
        <input
          className="border rounded-xl p-2 text-sm"
          placeholder="Paste audio link here (e.g., your own file URL)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {url ? (
          <audio src={url} controls className="w-full" />
        ) : (
          <div className="text-xs text-gray-500">No audio loaded. Paste a direct link to an audio file you want to practice with.</div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MiniCard title="Note-taking" desc="Listen once → jot keywords, numbers, spellings.">
          <textarea
            className="w-full h-40 border rounded-xl p-3 text-sm"
            placeholder="E.g., booking ref, dates, prices, locations, names"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </MiniCard>
        <MiniCard title="Self-check" desc="After listening, write the answers and compare with transcript.">
          <textarea className="w-full h-40 border rounded-xl p-3 text-sm" placeholder="Your answers here (1–10)" />
        </MiniCard>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onDone} className="ml-auto px-4 py-2 rounded-xl border bg-white hover:bg-gray-100">
          Mark Today's Listening Done
        </button>
      </div>
    </div>
  );
}

// ---- Writing ----
function WritingLab({ onDone }: { onDone: () => void }) {
  const [task, setTask] = useLocalStorage<"Task 1" | "Task 2">("ielts_write_task", "Task 2");
  const [prompt, setPrompt] = useLocalStorage<string>("ielts_write_prompt", randomPrompt("Task 2"));
  const [text, setText] = useLocalStorage<string>("ielts_write_text", "");

  const words = useMemo(() => (text.trim() ? text.trim().split(/\\s+/).length : 0), [text]);
  const target = task === "Task 1" ? 150 : 250;

  function regen() {
    const p = randomPrompt(task);
    setPrompt(p);
    setText("");
  }

  function downloadTxt() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.replace(" ", "_")}_${todayStr()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Writing Lab</h2>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-xl p-2 text-sm"
            value={task}
            onChange={(e) => {
              const t = (e.target as HTMLSelectElement).value as any;
              setTask(t);
              setPrompt(randomPrompt(t));
              setText("");
            }}
          >
            <option>Task 1</option>
            <option>Task 2</option>
          </select>
          <button onClick={regen} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100">New Prompt</button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border">
        <div className="text-sm font-medium mb-2">Prompt</div>
        <p className="text-sm text-gray-800">{prompt}</p>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm">
          <span>Word count: <span className={words < target ? "text-red-600 font-semibold" : "text-green-700 font-semibold"}>{words}</span> / {target}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => navigator.clipboard.writeText(text)} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100">Copy</button>
            <button onClick={downloadTxt} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100">Export .txt</button>
          </div>
        </div>
        <textarea
          className="w-full h-72 border rounded-2xl p-3 text-sm leading-6"
          placeholder={task === "Task 1" ? "Write at least 150 words describing the data..." : "Write at least 250 words presenting your opinion..."}
          value={text}
          onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      <div className="p-4 rounded-2xl bg-white border text-xs text-gray-600">
        <div className="font-semibold mb-2">Band descriptors (quick checklist)</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Task Response: address all parts, clear position, relevant examples</li>
          <li>Coherence & Cohesion: clear paragraphing, logical flow, cohesive devices</li>
          <li>Lexical Resource: topic-appropriate vocabulary, collocations, avoid repetition</li>
          <li>Grammar Range & Accuracy: complex sentences, few errors, correct punctuation</li>
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onDone} className="ml-auto px-4 py-2 rounded-xl border bg-white hover:bg-gray-100">
          Mark Today's Writing Done
        </button>
      </div>
    </div>
  );
}

function randomPrompt(task: "Task 1" | "Task 2") {
  if (task === "Task 1") return writingTask1Prompts[Math.floor(Math.random() * writingTask1Prompts.length)];
  return writingTask2Prompts[Math.floor(Math.random() * writingTask2Prompts.length)];
}

// ---- Speaking ----
function SpeakingLab({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useLocalStorage<"Part 1" | "Part 2" | "Part 3">("ielts_sp_phase", "Part 2");
  const [prompt, setPrompt] = useLocalStorage<string>("ielts_sp_prompt", randomSpeaking("Part 2"));
  const [notes, setNotes] = useLocalStorage<string>("ielts_sp_notes", "");

  // recorder
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
      };
      rec.start();
      setRecording(true);
    } catch (e) {
      alert("Microphone access failed. Please allow mic permissions in your browser.");
    }
  }
  function stopRec() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  function downloadAudio() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `IELTS_Speaking_${todayStr()}.webm`;
    a.click();
  }

  function regen() {
    const p = randomSpeaking(phase);
    setPrompt(p);
    setNotes("");
    setAudioUrl(null);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Speaking Studio</h2>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-xl p-2 text-sm"
            value={phase}
            onChange={(e) => {
              const ph = (e.target as HTMLSelectElement).value as any;
              setPhase(ph);
              setPrompt(randomSpeaking(ph));
              setNotes("");
              setAudioUrl(null);
            }}
          >
            <option>Part 1</option>
            <option>Part 2</option>
            <option>Part 3</option>
          </select>
          <button onClick={regen} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100">New Prompt</button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border">
        <div className="text-sm font-medium mb-2">Prompt</div>
        <p className="text-sm text-gray-800">{prompt}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MiniCard title="Prep Notes (1 min)" desc="Mind-map ideas, examples, transitions.">
          <textarea
            className="w-full h-40 border rounded-xl p-3 text-sm"
            placeholder="e.g., opening → main points → example → conclusion"
            value={notes}
            onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
          />
        </MiniCard>
        <MiniCard title="Record & Review" desc="Record 1–2 mins. Listen back and self-evaluate.">
          <div className="flex items-center gap-2 mb-2">
            {!recording ? (
              <button onClick={startRec} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100">Start</button>
            ) : (
              <button onClick={stopRec} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100">Stop</button>
            )}
            <button onClick={downloadAudio} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100" disabled={!audioUrl}>
              Download
            </button>
          </div>
          {audioUrl ? <audio src={audioUrl} controls className="w-full" /> : <div className="text-xs text-gray-500">No recording yet.</div>}
        </MiniCard>
      </div>

      <div className="p-4 rounded-2xl bg-white border text-xs text-gray-600">
        <div className="font-semibold mb-2">Self-eval checklist</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fluency & Coherence: minimal pauses, clear structure</li>
          <li>Lexical Resource: topic-specific vocabulary, paraphrasing</li>
          <li>Grammar Range & Accuracy: variety of tenses, complex forms</li>
          <li>Pronunciation: word stress, intonation, clarity</li>
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onDone} className="ml-auto px-4 py-2 rounded-xl border bg-white hover:bg-gray-100">
          Mark Today's Speaking Done
        </button>
      </div>
    </div>
  );
}

function randomSpeaking(phase: "Part 1" | "Part 2" | "Part 3") {
  if (phase === "Part 1") return speakingP1[Math.floor(Math.random() * speakingP1.length)];
  if (phase === "Part 2") return speakingP2[Math.floor(Math.random() * speakingP2.length)];
  return speakingP3[Math.floor(Math.random() * speakingP3.length)];
}

// ---- Settings ----
function SettingsPanel() {
  function exportAll() {
    const keys = [
      "ielts_check",
      "ielts_last",
      "ielts_streak",
      "ielts_weak",
      "ielts_vocab",
      "ielts_read_ans",
      "ielts_listen_url",
      "ielts_listen_notes",
      "ielts_write_task",
      "ielts_write_prompt",
      "ielts_write_text",
      "ielts_sp_phase",
      "ielts_sp_prompt",
      "ielts_sp_notes",
      "ielts_tab",
    ];
    const data: Record<string, any> = {};
    keys.forEach((k) => (data[k] = localStorage.getItem(k)));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts_mvp_backup_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importAll(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        Object.keys(obj).forEach((k) => {
          if (typeof obj[k] === "string") localStorage.setItem(k, obj[k]);
        });
        alert("Import complete. Reload the page to apply all settings.");
      } catch (e) {
        alert("Import failed: invalid file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Settings & Data</h2>
      <div className="p-4 rounded-2xl bg-white border grid gap-3">
        <div className="text-sm">Backup your progress or move it to another device.</div>
        <div className="flex items-center gap-2">
          <button onClick={exportAll} className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100">Export JSON</button>
          <label className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-100 cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={importAll} />
          </label>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border text-xs text-gray-600">
        <div className="font-semibold mb-1">How to use</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Go tab by tab. Mark each as done to fill today's progress.</li>
          <li>Use Writing word-count targets (150/250). Export your drafts.</li>
          <li>Use Speaking recorder to practice 1–2 minutes answers.</li>
          <li>Add your own listening audio URLs (e.g., personal uploads).</li>
        </ul>
      </div>
    </div>
  );
}
