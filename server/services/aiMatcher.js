const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function matchResumeWithJob(resumeText, jobDescription) {
  const prompt = `
You are a strict and accurate AI resume screening system used by recruiters.

Your job is to compare ONE candidate resume against ONE job description.

Do NOT give high scores just because keywords appear in the resume.
Evaluate the actual evidence in projects, internships, certifications and work experience.

========================
JOB DESCRIPTION
========================

${jobDescription}

========================
CANDIDATE RESUME
========================

${resumeText}

========================
SCORING SYSTEM
========================

Calculate the matchScore from 0 to 100 using this approximate weighting:

1. Required technical skills: 45 points
2. Relevant projects / hands-on evidence: 20 points
3. Relevant internship / work experience: 15 points
4. Overall role relevance: 10 points
5. Problem-solving / practical engineering evidence: 10 points

IMPORTANT:

- Do not award points simply because a skill appears in a generic skills section.
- A skill demonstrated in a project, internship or work experience is stronger evidence.
- If a required skill is only listed but there is no supporting evidence, give limited credit.
- Missing important technical skills must significantly reduce the score.
- Missing multiple core skills should prevent a very high score.
- Unrelated technologies should receive little or no credit.
- A degree by itself is not strong evidence of technical ability.
- Projects, internships and work experience are valid evidence.
- Certifications can provide supporting evidence, but should not outweigh actual project/work evidence.
- Do not assume that knowledge of one technology automatically proves knowledge of another.
- Do not assume JavaScript just because React is present.
- Do not assume MongoDB just because Node.js is present.
- Do not assume React just because JavaScript is present.
- Do not assume Express.js just because Node.js is present.
- Do not assume REST API experience unless the resume provides evidence.
- Be conservative when evidence is weak.

========================
SCORE GUIDELINES
========================

90-100:
Exceptional match.
Candidate demonstrates nearly all important requirements with strong practical evidence.

80-89:
Very strong match.
Candidate satisfies most important requirements and has good practical evidence.

70-79:
Strong match.
Candidate satisfies most important requirements but has some gaps.

60-69:
Moderate match.
Candidate has useful relevant skills but is missing important requirements.

40-59:
Weak match.
Candidate has some relevant knowledge but significant requirements are missing.

20-39:
Very weak match.
Only a small portion of the job requirements are demonstrated.

0-19:
Poor match.
Little or no relevant evidence.

IMPORTANT:

Do not give 90+ unless the resume contains strong evidence for most important requirements.

Do not give 100 unless the candidate is an exceptionally complete match with strong evidence across the important requirements.

A candidate missing a core technology should normally not receive 90+.

========================
SHORTLISTING
========================

Set shortlisted to true only when:

- matchScore >= 70
- AND the candidate satisfies most important job requirements
- AND there is meaningful practical evidence from projects, internships or work experience

A candidate should NOT be shortlisted simply because the resume contains several keywords.

========================
MATCHED SKILLS
========================

matchedSkills must contain only skills that are genuinely supported by the resume.

Prefer skills that are:

1. Demonstrated in projects
2. Demonstrated in internships/work
3. Clearly supported by certifications
4. Explicitly listed as skills

Do not invent skills.

========================
MISSING SKILLS
========================

missingSkills must contain important requirements from the job description that are not adequately demonstrated.

Do not list minor or irrelevant requirements.

If a core skill is missing, include it.

========================
EXPERIENCE RELEVANCE
========================

Keep this short.

Examples:

"Strongly relevant full-stack project and internship experience."

"Relevant backend projects, but limited frontend experience."

"Limited relevance; most experience is outside the required technology stack."

========================
JUSTIFICATION
========================

Keep this short but specific.

Mention the strongest reasons for the score and the most important gaps.

Do not write long explanations.

========================
FINAL RULE
========================

Return ONLY valid JSON.

Use exactly this structure:

{
  "matchScore": 0,
  "matchedSkills": [],
  "missingSkills": [],
  "experienceRelevance": "",
  "justification": "",
  "shortlisted": false
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",

      messages: [
        {
          role: "system",
          content:
            "You are a strict resume screening system. Evaluate evidence carefully and return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],

      temperature: 0.1,

      reasoning_effort: "low",

      max_completion_tokens: 1000,

      response_format: {
        type: "json_schema",

        json_schema: {
          name: "resume_screening",

          strict: true,

          schema: {
            type: "object",

            properties: {
              matchScore: {
                type: "integer"
              },

              matchedSkills: {
                type: "array",
                items: {
                  type: "string"
                }
              },

              missingSkills: {
                type: "array",
                items: {
                  type: "string"
                }
              },

              experienceRelevance: {
                type: "string"
              },

              justification: {
                type: "string"
              },

              shortlisted: {
                type: "boolean"
              }
            },

            required: [
              "matchScore",
              "matchedSkills",
              "missingSkills",
              "experienceRelevance",
              "justification",
              "shortlisted"
            ],

            additionalProperties: false
          }
        }
      }
    });

    const content =
      completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI returned an empty response.");
    }

    const result = JSON.parse(content);

    // ===============================
    // NORMALIZE SCORE
    // ===============================

    let matchScore = Number(result.matchScore);

    if (Number.isNaN(matchScore)) {
      matchScore = 0;
    }

    matchScore = Math.max(
      0,
      Math.min(100, Math.round(matchScore))
    );

    // ===============================
    // NORMALIZE SKILLS
    // ===============================

    const matchedSkills =
      Array.isArray(result.matchedSkills)
        ? result.matchedSkills
            .filter(
              (skill) =>
                typeof skill === "string" &&
                skill.trim().length > 0
            )
            .map((skill) => skill.trim())
        : [];

    const missingSkills =
      Array.isArray(result.missingSkills)
        ? result.missingSkills
            .filter(
              (skill) =>
                typeof skill === "string" &&
                skill.trim().length > 0
            )
            .map((skill) => skill.trim())
        : [];

    // ===============================
    // NORMALIZE TEXT
    // ===============================

    const experienceRelevance =
      typeof result.experienceRelevance === "string"
        ? result.experienceRelevance.trim()
        : "";

    const justification =
      typeof result.justification === "string"
        ? result.justification.trim()
        : "";

    // ===============================
    // FINAL SHORTLIST DECISION
    // ===============================
    //
    // The application, not the AI, makes
    // the final shortlist decision.
    //
    // Score >= 70
    // AND at least one matched skill
    // AND no excessive missing requirements.
    //
    // This prevents the model from returning
    // shortlisted=true incorrectly.
    // ===============================

    const shortlisted =
      matchScore >= 70 &&
      matchedSkills.length >= 1 &&
      missingSkills.length <= 3;

    // ===============================
    // FINAL RESULT
    // ===============================

    return {
      matchScore,

      matchedSkills,

      missingSkills,

      experienceRelevance,

      justification,

      shortlisted
    };

  } catch (error) {

    console.error(
      "AI matching error:",
      error.message || error
    );

    throw error;
  }
}

module.exports = {
  matchResumeWithJob
};