const API_BASE_URL =
  "http://localhost:5000";


// =========================================================
// UPLOAD RESUMES
//
// Works for:
// - Single resume
// - Multiple resumes
// - Folder upload
//
// Backend field name: resumes
// =========================================================

export const uploadResumes = async (
  files
) => {
  const formData =
    new FormData();

  files.forEach((file) => {
    formData.append(
      "resumes",
      file
    );
  });

  const response =
    await fetch(
      `${API_BASE_URL}/api/resume/upload`,
      {
        method: "POST",
        body: formData
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to upload resumes"
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
  const response =
    await fetch(
      `${API_BASE_URL}/api/resume/analyze-batch`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          resumeIds,
          jobDescription
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to analyze resumes"
    );
  }

  return data;
};


// =========================================================
// COMPLETE SCREENING
//
// 1. Upload resumes
// 2. Get resume IDs
// 3. Analyze resumes
// =========================================================

export const screenResumes = async (
  files,
  jobDescription
) => {
  if (
    !files ||
    files.length === 0
  ) {
    throw new Error(
      "Please select at least one resume."
    );
  }

  if (
    !jobDescription ||
    !jobDescription.trim()
  ) {
    throw new Error(
      "Please enter a job description."
    );
  }


  // STEP 1
  // Upload

  const uploadResult =
    await uploadResumes(files);


  if (
    !uploadResult.resumes ||
    uploadResult.resumes.length === 0
  ) {
    throw new Error(
      "No resumes were uploaded successfully."
    );
  }


  // STEP 2
  // Extract IDs

  const resumeIds =
    uploadResult.resumes.map(
      (resume) =>
        resume.resumeId
    );


  // STEP 3
  // Analyze

  const analysisResult =
    await analyzeResumes(
      resumeIds,
      jobDescription
    );


  return analysisResult;
};


// =========================================================
// GET RESULTS
// =========================================================

export const getResults =
  async () => {
    const response =
      await fetch(
        `${API_BASE_URL}/api/resume/results`
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to fetch results"
      );
    }

    return data;
  };