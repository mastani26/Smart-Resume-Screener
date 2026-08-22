import { useRef, useState } from "react";
import { screenResumes } from "../services/api";
import * as XLSX from "xlsx";

function Home() {
  const folderInputRef = useRef(null);
  const singleInputRef = useRef(null);

  const [folderName, setFolderName] = useState("");
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState(null);

  // ==========================================
  // SELECT FOLDER
  // ==========================================

  const handleFolderChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    const pdfFiles = selectedFiles.filter((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

    setResults(null);

    if (pdfFiles.length === 0) {
      setFiles([]);
      setFolderName("");
      setMessage("No PDF resumes found in the selected folder.");
      return;
    }

    setFiles(pdfFiles);

    setFolderName(
      `${pdfFiles.length} resume${
        pdfFiles.length > 1 ? "s" : ""
      } selected`
    );

    setMessage("");
  };

  // ==========================================
  // SELECT SINGLE RESUME
  // ==========================================

  const handleSingleResumeChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const fileName = selectedFile.name.toLowerCase();

    if (!fileName.endsWith(".pdf")) {
      setFiles([]);
      setFolderName("");
      setResults(null);
      setMessage("Please select a PDF resume.");
      return;
    }

    setFiles([selectedFile]);
    setFolderName(
      `1 resume selected: ${selectedFile.name}`
    );
    setResults(null);
    setMessage("");
  };

  // ==========================================
  // ANALYZE RESUMES
  // ==========================================

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setMessage(
        "Please select a resume folder or upload a single resume."
      );
      return;
    }

    if (!jobDescription.trim()) {
      setMessage("Please enter a job description.");
      return;
    }

    try {
      setLoading(true);
      setResults(null);
      setMessage(
        "AI is analyzing the resumes. Please wait..."
      );

      const data = await screenResumes(
        files,
        jobDescription
      );

      setResults(data);

      setMessage(
        `Screening completed successfully. ${
          data.analyzed || 0
        } candidates analyzed.`
      );
    } catch (error) {
      console.error(
        "Screening error:",
        error
      );

      setMessage(
        error.message ||
          "Something went wrong while screening resumes."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CATEGORY
  // ==========================================

  const getCategory = (score) => {
    const value = Number(score) || 0;

    if (value >= 70) {
      return "Strong";
    }

    if (value >= 40) {
      return "Medium";
    }

    return "Weak";
  };

  // ==========================================
  // SORT RESULTS
  // ==========================================

  const sortedResults = results?.results
    ? [...results.results].sort(
        (a, b) =>
          (Number(b.matchScore) || 0) -
          (Number(a.matchScore) || 0)
      )
    : [];

  // ==========================================
  // SHORTLISTED COUNT
  // ==========================================

  const shortlistedCount =
    sortedResults.filter(
      (candidate) =>
        candidate.shortlisted === true
    ).length;

  // ==========================================
  // DOWNLOAD EXCEL
  // ==========================================

  const downloadExcel = () => {
    if (sortedResults.length === 0) {
      setMessage(
        "No screening results available to download."
      );
      return;
    }

    const excelData = sortedResults.map(
      (candidate, index) => ({
        Rank: index + 1,

        "Candidate Name":
          candidate.name ||
          "Unknown Candidate",

        Email:
          candidate.email ||
          "Email not available",

        Phone:
          candidate.phone ||
          "Not available",

        "Match Score":
          Number(candidate.matchScore) || 0,

        Category:
          getCategory(candidate.matchScore),

        Shortlisted:
          candidate.shortlisted
            ? "Yes"
            : "No",

        "Matched Skills":
          candidate.matchedSkills &&
          candidate.matchedSkills.length > 0
            ? candidate.matchedSkills.join(", ")
            : "None",

        "Missing Skills":
          candidate.missingSkills &&
          candidate.missingSkills.length > 0
            ? candidate.missingSkills.join(", ")
            : "None",

        "Experience Relevance":
          candidate.experienceRelevance ||
          "Not available",

        "AI Justification":
          candidate.justification ||
          "No justification available"
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 32 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 45 },
      { wch: 45 },
      { wch: 45 },
      { wch: 80 }
    ];

    // ==========================================
    // COLOR CATEGORY ROWS
    // ==========================================

    excelData.forEach(
      (candidate, index) => {
        const row = index + 2;

        let fillColor = "FEE2E2";
        let fontColor = "991B1B";

        if (
          candidate.Category === "Strong"
        ) {
          fillColor = "DCFCE7";
          fontColor = "166534";
        } else if (
          candidate.Category === "Medium"
        ) {
          fillColor = "FEF3C7";
          fontColor = "92400E";
        }

        for (
          let column = 1;
          column <= 11;
          column++
        ) {
          const cellAddress =
            XLSX.utils.encode_cell({
              r: row - 1,
              c: column - 1
            });

          const cell =
            worksheet[cellAddress];

          if (cell) {
            cell.s = {
              fill: {
                patternType: "solid",
                fgColor: {
                  rgb: fillColor
                }
              }
            };
          }
        }

        const categoryCell =
          worksheet[`F${row}`];

        if (categoryCell) {
          categoryCell.s = {
            fill: {
              patternType: "solid",
              fgColor: {
                rgb: fillColor
              }
            },
            font: {
              bold: true,
              color: {
                rgb: fontColor
              }
            },
            alignment: {
              horizontal: "center"
            }
          };
        }
      }
    );

    // ==========================================
    // CREATE WORKBOOK
    // ==========================================

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Candidate Results"
    );

    // ==========================================
    // DOWNLOAD
    // ==========================================

    XLSX.writeFile(
      workbook,
      "SmartScreen_Candidate_Results.xlsx"
    );
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="app">

      {/* =====================================
          NAVBAR
      ===================================== */}

      <nav className="navbar">

        <div className="logo">

          <div className="logo-box">
            S
          </div>

          <div>
            <h2>SmartScreen</h2>
            <span>
              AI Resume Screener
            </span>
          </div>

        </div>

        <div className="nav-right">
          <span className="status-dot"></span>
          AI Screening Ready
        </div>

      </nav>


      {/* =====================================
          HERO
      ===================================== */}

      <section className="hero-section">

        <div className="hero-content">

          <div className="hero-badge">
            ✦ AI-POWERED RECRUITING
          </div>

          <h1>
            Find the right
            <br />
            <span>talent faster.</span>
          </h1>

          <p>
            Screen multiple resumes, compare
            candidates with job requirements
            and discover the strongest matches
            using AI.
          </p>

          <div className="hero-mini-stats">

            <div>
              <strong>AI</strong>
              <span>Resume Matching</span>
            </div>

            <div>
              <strong>PDF</strong>
              <span>Resume Parsing</span>
            </div>

            <div>
              <strong>∞</strong>
              <span>Batch Screening</span>
            </div>

          </div>

        </div>


        <div className="hero-process">

          <div className="process-heading">

            <div className="process-icon">
              ✦
            </div>

            <div>
              <h3>
                Smart Screening
              </h3>

              <p>
                AI-powered candidate evaluation
              </p>
            </div>

          </div>


          <div className="process-step">

            <div className="step-number">
              01
            </div>

            <div className="step-icon">
              📄
            </div>

            <div className="step-content">
              <strong>
                Upload Resumes
              </strong>

              <span>
                Multiple PDF files
              </span>
            </div>

          </div>


          <div className="process-line"></div>


          <div className="process-step">

            <div className="step-number">
              02
            </div>

            <div className="step-icon">
              ✦
            </div>

            <div className="step-content">
              <strong>
                AI Analysis
              </strong>

              <span>
                Compare skills & experience
              </span>
            </div>

          </div>


          <div className="process-line"></div>


          <div className="process-step">

            <div className="step-number">
              03
            </div>

            <div className="step-icon">
              📊
            </div>

            <div className="step-content">
              <strong>
                Rank Candidates
              </strong>

              <span>
                Score candidates automatically
              </span>
            </div>

          </div>


          <div className="process-line"></div>


          <div className="process-step">

            <div className="step-number">
              04
            </div>

            <div className="step-icon">
              ✓
            </div>

            <div className="step-content">
              <strong>
                Shortlist
              </strong>

              <span>
                Identify strongest candidates
              </span>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================
          FEATURES
      ===================================== */}

      <section className="features">

        <div className="feature-card purple">

          <div className="feature-icon">
            📄
          </div>

          <div>
            <h3>
              Smart Resume Parsing
            </h3>

            <p>
              Automatically extract candidate
              information, skills and experience.
            </p>
          </div>

        </div>


        <div className="feature-card blue">

          <div className="feature-icon">
            ⚡
          </div>

          <div>
            <h3>
              Batch Processing
            </h3>

            <p>
              Process multiple applicant resumes
              in one screening.
            </p>
          </div>

        </div>


        <div className="feature-card green">

          <div className="feature-icon">
            🎯
          </div>

          <div>
            <h3>
              AI Matching
            </h3>

            <p>
              Compare candidates against job
              requirements.
            </p>
          </div>

        </div>

      </section>


      {/* =====================================
          WORKSPACE
      ===================================== */}

      <section className="workspace-section">

        <div className="section-heading">

          <div>

            <span>
              SCREENING WORKSPACE
            </span>

            <h2>
              Start a new screening
            </h2>

          </div>

          <p>
            Upload applicants and provide the
            job requirements.
          </p>

        </div>


        <div className="workspace">

          {/* =================================
              RESUME UPLOAD CARD
          ================================= */}

          <div className="workspace-card">

            <div className="card-title">

              <div className="title-icon purple-icon">
                📁
              </div>

              <div>

                <h3>
                  Applicant Resumes
                </h3>

                <p>
                  Upload a folder or a single
                  candidate resume.
                </p>

              </div>

            </div>


            {/* =================================
                HIDDEN FOLDER INPUT
            ================================= */}

            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              multiple
              accept=".pdf"
              onChange={handleFolderChange}
              style={{
                display: "none"
              }}
            />


            {/* =================================
                HIDDEN SINGLE FILE INPUT
            ================================= */}

            <input
              ref={singleInputRef}
              type="file"
              accept=".pdf"
              onChange={
                handleSingleResumeChange
              }
              style={{
                display: "none"
              }}
            />


            {/* =================================
                SIDE-BY-SIDE BUTTONS
            ================================= */}

            <div
              className="resume-upload-options"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "18px",
                marginTop: "28px"
              }}
            >

              {/* FOLDER BUTTON */}

              <button
                type="button"
                className="upload-option folder-option"
                onClick={() =>
                  folderInputRef.current?.click()
                }
                style={{
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  textAlign: "center",
                  width: "100%"
                }}
              >

                <div className="option-icon">
                  📂
                </div>

                <h3>
                  Upload Folder
                </h3>

                <p>
                  Select multiple PDF resumes
                </p>

                <div className="choose-button">
                  Select Folder
                </div>

              </button>


              {/* SINGLE RESUME BUTTON */}

              <button
                type="button"
                className="upload-option single-option"
                onClick={() =>
                  singleInputRef.current?.click()
                }
                style={{
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  textAlign: "center",
                  width: "100%"
                }}
              >

                <div className="option-icon">
                  📄
                </div>

                <h3>
                  Single Resume
                </h3>

                <p>
                  Upload one PDF candidate
                </p>

                <div className="choose-button">
                  Select Resume
                </div>

              </button>

            </div>


            {/* =================================
                SELECTED FILE MESSAGE
            ================================= */}

            {folderName && (
              <div className="selected-files">
                ✓ {folderName}
              </div>
            )}


            <div className="upload-info">

              <span>✓ PDF</span>
              <span>✓ Single upload</span>
              <span>✓ Batch upload</span>

            </div>

          </div>


          {/* =================================
              JOB DESCRIPTION
          ================================= */}

          <div className="workspace-card">

            <div className="card-title">

              <div className="title-icon blue-icon">
                💼
              </div>

              <div>

                <h3>
                  Job Description
                </h3>

                <p>
                  Describe the candidate you are
                  looking for.
                </p>

              </div>

            </div>


            <textarea
              value={jobDescription}
              onChange={(event) =>
                setJobDescription(
                  event.target.value
                )
              }
              placeholder={`Paste the job description here...

Example:

We are looking for a Software Engineer Intern with strong skills in JavaScript, React, Node.js, Express.js, MongoDB and REST APIs.

The candidate should have good problem-solving skills and hands-on project experience.`}
            />


            <div className="textarea-footer">

              <span>
                AI will use this as the
                matching criteria
              </span>

              <span>
                {jobDescription.length} characters
              </span>

            </div>

          </div>

        </div>


        {/* =====================================
            ANALYZE BUTTON
        ===================================== */}

        <div className="analyze-container">

          <button
            type="button"
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={loading}
          >

            <span className="button-sparkle">
              ✦
            </span>

            {loading
              ? "AI is Screening Candidates..."
              : "Analyze Candidates with AI"}

            <span className="button-arrow">
              →
            </span>

          </button>

          <p>
            AI will parse, compare, rank and
            shortlist candidates.
          </p>


          {message && (
            <div className="screening-message">
              {loading ? "⏳ " : "✓ "}
              {message}
            </div>
          )}

        </div>


        {/* =====================================
            RESULTS
        ===================================== */}

        {results && (

          <section className="results-preview">

            <div className="results-header">

              <div>

                <span>
                  SCREENING COMPLETE
                </span>

                <h2>
                  Candidate Analysis
                </h2>

              </div>


              <div className="results-count">

                <strong>
                  {results.analyzed || 0}
                </strong>

                <span>
                  Candidates Analyzed
                </span>

              </div>

            </div>


            {/* SUMMARY */}

            <div className="results-summary">

              <div className="summary-card">

                <span>
                  Total Candidates
                </span>

                <strong>
                  {results.total || 0}
                </strong>

              </div>


              <div className="summary-card">

                <span>
                  Analyzed
                </span>

                <strong>
                  {results.analyzed || 0}
                </strong>

              </div>


              <div className="summary-card">

                <span>
                  Failed
                </span>

                <strong>
                  {results.failed || 0}
                </strong>

              </div>


              <div className="summary-card highlight">

                <span>
                  Shortlisted
                </span>

                <strong>
                  {shortlistedCount}
                </strong>

              </div>

            </div>


            {/* CATEGORY LEGEND */}

            <div className="category-legend">

              <div>
                <span className="legend-dot strong"></span>
                Strong
              </div>

              <div>
                <span className="legend-dot medium"></span>
                Medium
              </div>

              <div>
                <span className="legend-dot weak"></span>
                Weak
              </div>

            </div>


            {/* EXCEL DOWNLOAD */}

            <div className="excel-download-container">

              <button
                type="button"
                className="excel-button"
                onClick={downloadExcel}
              >
                📊 Download Candidate Report
              </button>

              <p>
                Export ranked candidates,
                match scores, skills and AI
                explanations to Excel.
              </p>

            </div>


            {/* CANDIDATE LIST */}

            {sortedResults.length > 0 && (

              <div className="candidate-list">

                {sortedResults.map(
                  (candidate, index) => {

                    const category =
                      getCategory(
                        candidate.matchScore
                      );

                    return (

                      <div
                        className={`candidate-card ${category.toLowerCase()}`}
                        key={
                          candidate.resumeId ||
                          `${
                            candidate.email ||
                            "candidate"
                          }-${index}`
                        }
                      >

                        <div className="candidate-rank">
                          #{index + 1}
                        </div>


                        <div className="candidate-main">

                          <div className="candidate-avatar">

                            {candidate.name
                              ? candidate.name
                                  .charAt(0)
                                  .toUpperCase()
                              : "?"}

                          </div>

                          <div>

                            <h3>
                              {candidate.name ||
                                "Unknown Candidate"}
                            </h3>

                            <p>
                              {candidate.email ||
                                "Email not available"}
                            </p>

                          </div>

                        </div>


                        <div className="candidate-score">

                          <strong>
                            {Number(
                              candidate.matchScore
                            ) || 0}
                          </strong>

                          <span>
                            /100
                          </span>

                        </div>


                        <div className="candidate-category">
                          {category}
                        </div>


                        <div
                          className={
                            candidate.shortlisted
                              ? "shortlisted"
                              : "not-shortlisted"
                          }
                        >

                          {candidate.shortlisted
                            ? "✓ Shortlisted"
                            : "Not Shortlisted"}

                        </div>


                        <div className="candidate-details">

                          <p>

                            <strong>
                              Matched Skills:
                            </strong>{" "}

                            {candidate.matchedSkills &&
                            candidate.matchedSkills.length > 0
                              ? candidate.matchedSkills.join(
                                  ", "
                                )
                              : "None"}

                          </p>


                          <p>

                            <strong>
                              Missing Skills:
                            </strong>{" "}

                            {candidate.missingSkills &&
                            candidate.missingSkills.length > 0
                              ? candidate.missingSkills.join(
                                  ", "
                                )
                              : "None"}

                          </p>


                          <p>

                            <strong>
                              Experience Relevance:
                            </strong>{" "}

                            {candidate.experienceRelevance ||
                              "Not available"}

                          </p>


                          <p>

                            <strong>
                              AI Justification:
                            </strong>{" "}

                            {candidate.justification ||
                              "No justification available."}

                          </p>

                        </div>

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </section>

        )}

      </section>

    </div>
  );
}

export default Home;