// Edge Function: ocr-extract
// Uses Google Gemini (direct API, user-supplied key) to extract structured data
// from photos of: class rosters, individual answer sheets, handwritten grade sheets,
// or full multi-column class record tables (E-Class Record printouts / score grids).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

type Mode = "roster" | "answer_sheet" | "grade_sheet" | "class_record_table";

interface OcrRequestBody {
  mode: Mode;
  image_url: string;
  question_count?: number;
  max_score_per_q?: number;
  hint_term?: number;
}

function promptForMode(mode: Mode, body: OcrRequestBody): string {
  if (mode === "roster") {
    return `You are reading a photo of a class roster or student name list. Extract every student's full name you can read.
Respond with ONLY strict JSON, no markdown, no commentary, matching exactly this shape:
{"students": ["Full Name 1", "Full Name 2"]}
If a name is illegible, skip it. Do not invent names.`;
  }

  if (mode === "answer_sheet") {
    const qCount = body.question_count ?? 10;
    const maxPerQ = body.max_score_per_q ?? 10;
    return `You are reading a photo of a single student's graded or answered test/quiz sheet.
There are ${qCount} questions, each worth up to ${maxPerQ} points.
Read the student's name if visible, and the marked/circled score for each question (if a question's score is not visible or illegible, use null).
Respond with ONLY strict JSON, no markdown, no commentary, matching exactly this shape:
{"student_name": "Full Name or null", "scores": [number|null, ...], "confidence": [number 0-1, ...]}
The "scores" and "confidence" arrays must both have exactly ${qCount} entries, in question order. "confidence" reflects how sure you are of each score (1 = very sure, 0 = illegible/guessed).`;
  }

  if (mode === "grade_sheet") {
    return `You are reading a photo of a handwritten or printed grade sheet listing multiple students and their scores for one assignment.
Extract every row you can read as a student name and their total numeric score.
Respond with ONLY strict JSON, no markdown, no commentary, matching exactly this shape:
{"entries": [{"name": "Full Name", "score": number}]}
If a score is illegible, skip that row entirely rather than guessing.`;
  }

  // class_record_table
  const termHint = body.hint_term ? ` This sheet covers Term ${body.hint_term}.` : "";
  return `You are reading a photo or scan of a printed class record / grade sheet table (like a DepEd E-Class Record page).
The table has rows of student names and multiple columns of scores (e.g. quizzes, performance tasks, exams).${termHint}
Read the column headers exactly as printed (e.g. "Quiz 1", "PT 1", "Unit Test"). Read every student row.
For each student, extract their name and their score in each column, aligned by column position.
If a cell is blank, illegible, or crossed out, use null for that cell rather than guessing.
Respond with ONLY strict JSON, no markdown, no commentary, matching exactly this shape:
{
  "columns": ["Column Header 1", "Column Header 2"],
  "rows": [
    {
      "name": "Full Name",
      "name_confidence": 0.95,
      "scores": [number|null, ...],
      "score_confidence": [number 0-1, ...]
    }
  ]
}
Every row's "scores" and "score_confidence" arrays must have exactly the same length as "columns", in the same column order.
"name_confidence" and each value in "score_confidence" reflect how sure you are (1 = very sure, 0 = illegible/guessed).
Do not invent students or columns that are not visibly printed on the sheet.`;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status})`);
  }
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const data = btoa(binary);
  return { data, mimeType };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonSlice = firstBrace >= 0 && lastBrace >= 0 ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
  return JSON.parse(jsonSlice);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: { message: "OCR is not configured. Missing GEMINI_API_KEY secret." } }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const body: OcrRequestBody = await req.json();
    if (!body.mode || !body.image_url) {
      return new Response(
        JSON.stringify({ error: { message: "Missing required fields: mode, image_url" } }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { data: base64Data, mimeType } = await fetchImageAsBase64(body.image_url);
    const prompt = promptForMode(body.mode, body);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error", geminiRes.status, errText);
      let message = `OCR service error (${geminiRes.status})`;
      try {
        const parsed = JSON.parse(errText);
        message = parsed?.error?.message || message;
      } catch {
        // ignore parse failure, use default message
      }
      return new Response(
        JSON.stringify({ error: { message } }),
        { status: geminiRes.status >= 500 ? 502 : geminiRes.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const geminiJson = await geminiRes.json();
    const text: string = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      return new Response(
        JSON.stringify({ error: { message: "OCR returned no readable content." } }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch (parseErr) {
      console.error("Failed to parse OCR JSON", text, parseErr);
      return new Response(
        JSON.stringify({ error: { message: "Could not parse OCR result. Please try a clearer photo." } }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ mode: body.mode, result: parsed }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ocr-extract error", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
