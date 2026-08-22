// =========================================================
// BACKEND API URL
// =========================================================

const API_BASE_URL =
  "https://smart-resume-screener-pzfr.vercel.app";

// =========================================================
// UPLOAD RESUMES
// =========================================================

export const uploadResumes = async (files) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("resumes", file);
  });

  const response = await fetch(
    `${API_BASE_URL}/api/resume/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to upload resumes"
    );
  }

  return data;
};

// =========================================================
// ANALYZE RESUMES
// =========================================================

export const analyzeResumes = async (
  resumeIds,
  jobDescription
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/resume/analyze-batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeIds,
        jobDescription,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to analyze resumes"
    );
  }

  return data;
};

// =========================================================
// COMPLETE SCREENING
// =========================================================

export const screenResumes = async (
  files,
  jobDescription
) => {
  if (!files || files.length === 0) {
    throw new Error(
      "Please select at least one resume."
    );
  }

  if (!jobDescription || !jobDescription.trim()) {
    throw new Error(
      "Please enter a job description."
    );
  }

  // STEP 1: UPLOAD
  const uploadResult = await uploadResumes(files);

  if (
    !uploadResult.resumes ||
    uploadResult.resumes.length === 0
  ) {
    throw new Error(
      "No resumes were uploaded successfully."
    );
  }

  // STEP 2: GET RESUME IDs
  const resumeIds = uploadResult.resumes.map(
    (resume) => resume.resumeId
  );

  // STEP 3: ANALYZE
  const analysisResult = await analyzeResumes(
    resumeIds,
    jobDescription
  );

  return analysisResult;
};

// =========================================================
// GET RANKED RESULTS
// =========================================================

export const getResults = async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/resume/results`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch results"
    );
  }

  return data;
};

// =========================================================
// HEALTH CHECK
// =========================================================

export const checkBackendHealth = async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/health`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Backend health check failed"
    );
  }

  return data;
};