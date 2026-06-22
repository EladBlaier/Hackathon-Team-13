const form = document.getElementById("tutor-form");
const statusEl = document.getElementById("status");
const result = document.getElementById("result");
const verdict = document.getElementById("verdict");
const reply = document.getElementById("reply");
const next = document.getElementById("next");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("photo").files[0];
  if (!file) return;

  result.hidden = true;
  statusEl.hidden = false;

  const data = new FormData();
  data.append("photo", file);

  try {
    const res = await fetch("/api/tutor", { method: "POST", body: data });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const out = await res.json();

    verdict.textContent = out.is_correct
      ? "✅ Looks correct — nice work!"
      : `🤔 Let's look at this (${out.error_type} slip in ${out.concept})`;
    verdict.className = "verdict " + (out.is_correct ? "ok" : "warn");
    reply.textContent = out.reply;
    next.textContent = `Next problem suggestion: ${out.next_difficulty}.`;
    result.hidden = false;
  } catch (err) {
    reply.textContent = "Something went wrong: " + err.message;
    verdict.textContent = "";
    next.textContent = "";
    result.hidden = false;
  } finally {
    statusEl.hidden = true;
  }
});
